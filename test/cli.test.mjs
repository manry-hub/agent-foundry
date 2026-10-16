import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import {
  buildWindowsLauncher,
  buildWindowsPathUpdateCommand,
  getInstallPaths,
  installLocalCli
} from '../install.mjs';
import {
  collectTemplateFiles,
  init,
  materializeTemplate,
  parseArguments,
  printHelp
} from '../bin/cli.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let temporaryRoot;

async function hasSymlink(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) return true;
    if (entry.isDirectory() && await hasSymlink(entryPath)) return true;
  }
  return false;
}

function countOccurrences(text, value) {
  return text.split(value).length - 1;
}

before(async () => {
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-config-test-'));
});

after(async () => {
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
});

test('help and command arguments are recognized', () => {
  let help = '';
  printHelp((message) => { help = message; });

  assert.match(help, /Usage: agent-config init/);
  assert.deepEqual(parseArguments(['--help']), { help: true });
  assert.deepEqual(parseArguments(['init', './project', '--force']), {
    command: 'init',
    targetDirectory: './project',
    force: true
  });
});

test('Windows Git symlink placeholders resolve to local target content', async () => {
  const fixtureRoot = path.join(temporaryRoot, 'windows-checkout');
  const referencePath = [
    '.agent',
    'skills',
    'owasp-secure-agent-playbook',
    'upstream',
    'plugins',
    'code-security-skills',
    'skills',
    'security-guidance',
    'references'
  ].join(path.sep);
  const placeholderPath = path.join(fixtureRoot, referencePath);
  const expectedTarget = '../../../../data';
  const targetData = path.resolve(path.dirname(placeholderPath), expectedTarget);
  const targetFile = path.join(targetData, 'aisvs', 'C1.1.md');

  await mkdir(path.dirname(placeholderPath), { recursive: true });
  await mkdir(path.dirname(targetFile), { recursive: true });
  await writeFile(path.join(fixtureRoot, 'AGENTS.md'), '# Guidance\n');
  await writeFile(placeholderPath, expectedTarget);
  await writeFile(targetFile, 'local reference content\n');

  const files = await collectTemplateFiles(fixtureRoot);
  const materializedEntry = files.find((file) =>
    file.relativePath === path.join(referencePath, 'aisvs', 'C1.1.md')
  );
  assert.ok(materializedEntry);
  assert.equal(await readFile(materializedEntry.sourcePath, 'utf8'), 'local reference content\n');

  const outputRoot = path.join(temporaryRoot, 'windows-materialized');
  await materializeTemplate(fixtureRoot, outputRoot);
  assert.equal(
    await readFile(path.join(outputRoot, referencePath, 'aisvs', 'C1.1.md'), 'utf8'),
    'local reference content\n'
  );
  assert.equal(await hasSymlink(outputRoot), false);
});

test('local setup installs a complete app and updates the user PATH idempotently', async () => {
  const home = path.join(temporaryRoot, 'linux-home');
  await mkdir(home, { recursive: true });
  const output = [];
  const options = {
    sourceRoot: repositoryRoot,
    platform: 'linux',
    home,
    env: { SHELL: '/bin/bash' },
    write: (message) => output.push(message)
  };

  const paths = getInstallPaths(options);
  await installLocalCli(options);

  assert.equal(
    await readFile(path.join(paths.appRoot, 'AGENTS.md'), 'utf8'),
    await readFile(path.join(repositoryRoot, 'AGENTS.md'), 'utf8')
  );
  assert.equal(await hasSymlink(path.join(paths.appRoot, '.agent')), false);
  const referenceFile = path.join(
    paths.appRoot,
    '.agent',
    'skills',
    'owasp-secure-agent-playbook',
    'upstream',
    'plugins',
    'code-security-skills',
    'skills',
    'security-guidance',
    'references',
    'aisvs',
    'C1.1.md'
  );
  assert.ok((await readFile(referenceFile, 'utf8')).length > 0);
  assert.ok((await readFile(path.join(paths.binDir, 'agent-config'), 'utf8')).includes('cli.mjs'));
  assert.ok((await stat(path.join(paths.binDir, 'agent-config'))).mode & 0o111);

  const profilePath = path.join(home, '.bashrc');
  const profile = await readFile(profilePath, 'utf8');
  assert.equal(countOccurrences(profile, '# >>> agent-config managed PATH >>>'), 1);
  assert.equal(countOccurrences(profile, '# <<< agent-config managed PATH <<<'), 1);

  const targetProject = path.join(temporaryRoot, 'separate-project');
  await mkdir(targetProject, { recursive: true });
  const commandOutput = execFileSync(path.join(paths.binDir, 'agent-config'), ['init'], {
    cwd: targetProject,
    encoding: 'utf8'
  });
  assert.match(commandOutput, /Installed \d+ files/);
  assert.equal(await readFile(path.join(targetProject, 'AGENTS.md'), 'utf8'),
    await readFile(path.join(repositoryRoot, 'AGENTS.md'), 'utf8'));
  assert.equal(await hasSymlink(path.join(targetProject, '.agent')), false);

  await installLocalCli(options);
  const updatedProfile = await readFile(profilePath, 'utf8');
  assert.equal(countOccurrences(updatedProfile, '# >>> agent-config managed PATH >>>'), 1);
  assert.equal(countOccurrences(updatedProfile, '# <<< agent-config managed PATH <<<'), 1);
  assert.ok(output.some((message) => message.includes('agent-config init')));
});

test('Windows paths and launcher use per-user locations and a command shim', () => {
  const slash = String.fromCharCode(92);
  const home = ['C:', 'Users', 'Example'].join(slash);
  const localAppData = [home, 'AppData', 'Local'].join(slash);
  const expectedRoot = [localAppData, 'AgentConfig'].join(slash);

  assert.deepEqual(
    getInstallPaths({
      platform: 'win32',
      home,
      env: { LOCALAPPDATA: localAppData }
    }),
    {
      appRoot: [expectedRoot, 'app'].join(slash),
      binDir: [expectedRoot, 'bin'].join(slash)
    }
  );
  assert.ok(buildWindowsLauncher().includes('%~dp0'));

  const apostrophe = String.fromCharCode(39);
  const windowsPath = ['C:', 'Users', 'O' + apostrophe + 'Hare', 'AgentConfig', 'bin'].join(slash);
  const pathCommand = buildWindowsPathUpdateCommand(windowsPath);
  assert.ok(pathCommand.includes('O' + apostrophe + apostrophe + 'Hare'));
  assert.ok(pathCommand.includes("SetEnvironmentVariable('Path', $next, 'User')"));
});

test('local setup refuses to replace an unmanaged application directory', async () => {
  const home = path.join(temporaryRoot, 'unmanaged-home');
  const options = {
    sourceRoot: repositoryRoot,
    platform: 'linux',
    home,
    env: { SHELL: '/bin/bash' },
    write: () => {}
  };
  const paths = getInstallPaths(options);
  await mkdir(paths.appRoot, { recursive: true });
  const userFile = path.join(paths.appRoot, 'keep.txt');
  await writeFile(userFile, 'user data');

  await assert.rejects(installLocalCli(options), /unmanaged directory/);
  assert.equal(await readFile(userFile, 'utf8'), 'user data');
});

test('local setup preserves an unmanaged command already in the user bin directory', async () => {
  const home = path.join(temporaryRoot, 'launcher-conflict-home');
  const options = {
    sourceRoot: repositoryRoot,
    platform: 'linux',
    home,
    env: { SHELL: '/bin/bash' },
    write: () => {}
  };
  const paths = getInstallPaths(options);
  const launcherPath = path.join(paths.binDir, 'agent-config');
  await mkdir(paths.binDir, { recursive: true });
  await writeFile(launcherPath, '#!/bin/sh\necho user command\n');

  await assert.rejects(installLocalCli(options), /unmanaged launcher/);
  assert.equal(await readFile(launcherPath, 'utf8'), '#!/bin/sh\necho user command\n');
  await assert.rejects(stat(paths.appRoot));
});

test('non-interactive conflicts abort before installing any other files', async () => {
  const target = path.join(temporaryRoot, 'conflict-target');
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'AGENTS.md'), 'keep this file');

  await assert.rejects(
    init({ targetDirectory: target, sourceRoot: repositoryRoot, force: false }),
    /No files were written/
  );
  assert.equal(await readFile(path.join(target, 'AGENTS.md'), 'utf8'), 'keep this file');
  await assert.rejects(readFile(path.join(target, '.agent', 'rules', 'BRD.md')));
});

test('--force installs the complete bundle and replaces file conflicts', async () => {
  const target = path.join(temporaryRoot, 'force-target');
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'AGENTS.md'), 'old guidance');

  await init({ targetDirectory: target, sourceRoot: repositoryRoot, force: true, write: () => {} });
  assert.match(await readFile(path.join(target, 'AGENTS.md'), 'utf8'), /^# Agent Guidance/);
  assert.equal(await readFile(path.join(target, '.agent', 'tasks', 'todo.md'), 'utf8'), '');
  assert.equal(await readFile(path.join(target, '.agent', 'tasks', 'lessons.md'), 'utf8'), '');
  assert.equal(await hasSymlink(target), false);

  const impeccableSkill = await readFile(
    path.join(target, '.agent', 'skills', 'impeccable', 'SKILL.md'),
    'utf8'
  );
  const materializedReference = await readFile(
    path.join(
      target,
      '.agent',
      'skills',
      'owasp-secure-agent-playbook',
      'upstream',
      'plugins',
      'code-security-skills',
      'skills',
      'security-guidance',
      'references',
      'aisvs',
      'C1.1.md'
    ),
    'utf8'
  );
  assert.ok(impeccableSkill.startsWith('---'));
  assert.ok(materializedReference.length > 0);
});
