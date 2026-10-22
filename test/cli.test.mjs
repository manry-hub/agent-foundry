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
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-foundry-test-'));
});

after(async () => {
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
});

test('help and command arguments are recognized', () => {
  let help = '';
  printHelp((message) => { help = message; });

  assert.match(help, /Usage: agent-foundry init/);
  assert.deepEqual(parseArguments(['--help']), { help: true });
  assert.deepEqual(parseArguments(['init', './project', '--force']), {
    command: 'init',
    targetDirectory: './project',
    force: true
  });
});

test('Windows Git plugin-reference placeholders resolve to local target content', async () => {
  const fixtureRoot = path.join(temporaryRoot, 'windows-checkout');
  const referencePath = [
    '.agent-foundry',
    'skills',
    'example-suite',
    'upstream',
    'plugins',
    'example-plugin',
    'skills',
    'example-skill',
    'references'
  ].join(path.sep);
  const placeholderPath = path.join(fixtureRoot, referencePath);
  const expectedTarget = '../../../../data';
  const targetData = path.resolve(path.dirname(placeholderPath), expectedTarget);
  const targetFile = path.join(targetData, 'reference.md');

  await mkdir(path.dirname(placeholderPath), { recursive: true });
  await mkdir(path.dirname(targetFile), { recursive: true });
  await writeFile(path.join(fixtureRoot, 'AGENTS.md'), '# Guidance\n');
  await writeFile(placeholderPath, expectedTarget);
  await writeFile(targetFile, 'local reference content\n');

  const files = await collectTemplateFiles(fixtureRoot);
  const materializedEntry = files.find((file) =>
    file.relativePath === path.join(referencePath, 'reference.md')
  );
  assert.ok(materializedEntry);
  assert.equal(await readFile(materializedEntry.sourcePath, 'utf8'), 'local reference content\n');

  const outputRoot = path.join(temporaryRoot, 'windows-materialized');
  await materializeTemplate(fixtureRoot, outputRoot);
  assert.equal(
    await readFile(path.join(outputRoot, referencePath, 'reference.md'), 'utf8'),
    'local reference content\n'
  );
  assert.equal(await hasSymlink(outputRoot), false);
});

test('configuration references resolve and safe-operations guidance is scaffolded', async () => {
  const templateFiles = await collectTemplateFiles(repositoryRoot);
  const guidanceFiles = templateFiles.filter(({ relativePath }) =>
    relativePath === 'AGENTS.md'
    || /^\.agent-foundry\/(commands|rules)\//.test(relativePath)
  );
  const references = new Set();

  for (const file of guidanceFiles) {
    const contents = await readFile(file.sourcePath, 'utf8');
    for (const [, reference] of contents.matchAll(/`(\.agent-foundry\/[^`]+)`/g)) {
      references.add(reference.replace(/\/+$/, ''));
    }
  }

  for (const reference of references) {
    const pathToCheck = /YYYY-MM-DD|<[^>]+>/.test(reference)
      ? path.dirname(reference)
      : reference;
    await assert.doesNotReject(
      stat(path.join(repositoryRoot, pathToCheck)),
      `expected ${pathToCheck} to exist`
    );
  }

  assert.ok(templateFiles.some(({ relativePath }) =>
    relativePath === '.agent-foundry/rules/SAFE-OPERATIONS.md'
  ));
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
  assert.equal(await readFile(path.join(paths.appRoot, '.agent-foundry', 'tasks', 'todo.md'), 'utf8'), '');
  assert.equal(await readFile(path.join(paths.appRoot, '.agent-foundry', 'tasks', 'lessons.md'), 'utf8'), '');
  assert.equal(await hasSymlink(path.join(paths.appRoot, '.agent-foundry')), false);
  const safeOperationsFile = path.join(
    paths.appRoot,
    '.agent-foundry',
    'rules',
    'SAFE-OPERATIONS.md'
  );
  assert.match(await readFile(safeOperationsFile, 'utf8'), /^# Safe Operations & Data Protection/m);
  assert.ok((await readFile(path.join(paths.binDir, 'agent-foundry'), 'utf8')).includes('cli.mjs'));
  assert.ok((await stat(path.join(paths.binDir, 'agent-foundry'))).mode & 0o111);

  const profilePath = path.join(home, '.bashrc');
  const profile = await readFile(profilePath, 'utf8');
  assert.equal(countOccurrences(profile, '# >>> agent-foundry managed PATH >>>'), 1);
  assert.equal(countOccurrences(profile, '# <<< agent-foundry managed PATH <<<'), 1);

  const targetProject = path.join(temporaryRoot, 'separate-project');
  await mkdir(targetProject, { recursive: true });
  const commandOutput = execFileSync(path.join(paths.binDir, 'agent-foundry'), ['init'], {
    cwd: targetProject,
    encoding: 'utf8'
  });
  assert.match(commandOutput, /Installed \d+ files/);
  assert.equal(await readFile(path.join(targetProject, 'AGENTS.md'), 'utf8'),
    await readFile(path.join(repositoryRoot, 'AGENTS.md'), 'utf8'));
  assert.equal(await hasSymlink(path.join(targetProject, '.agent-foundry')), false);

  await installLocalCli(options);
  const updatedProfile = await readFile(profilePath, 'utf8');
  assert.equal(countOccurrences(updatedProfile, '# >>> agent-foundry managed PATH >>>'), 1);
  assert.equal(countOccurrences(updatedProfile, '# <<< agent-foundry managed PATH <<<'), 1);
  assert.ok(output.some((message) => message.includes('agent-foundry init')));
});

test('new installer leaves a pre-AgentFoundry installation untouched', async () => {
  const home = path.join(temporaryRoot, 'legacy-install-home');
  const options = {
    sourceRoot: repositoryRoot,
    platform: 'linux',
    home,
    env: { SHELL: '/bin/bash' },
    write: () => {}
  };
  const oldAppRoot = path.join(home, '.local', 'share', 'agent-config');
  const oldLauncherPath = path.join(home, '.local', 'bin', 'agent-config');
  const oldAppFile = path.join(oldAppRoot, 'keep.txt');
  await mkdir(oldAppRoot, { recursive: true });
  await mkdir(path.dirname(oldLauncherPath), { recursive: true });
  await writeFile(oldAppFile, 'old install data');
  await writeFile(oldLauncherPath, '#!/bin/sh\necho old launcher\n');

  const paths = await installLocalCli(options);

  assert.equal(await readFile(oldAppFile, 'utf8'), 'old install data');
  assert.equal(await readFile(oldLauncherPath, 'utf8'), '#!/bin/sh\necho old launcher\n');
  assert.ok(await stat(path.join(paths.appRoot, 'AGENTS.md')));
  assert.ok(await stat(path.join(paths.binDir, 'agent-foundry')));
});

test('Windows paths and launcher use per-user locations and a command shim', () => {
  const slash = String.fromCharCode(92);
  const home = ['C:', 'Users', 'Example'].join(slash);
  const localAppData = [home, 'AppData', 'Local'].join(slash);
  const expectedRoot = [localAppData, 'AgentFoundry'].join(slash);

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
  const windowsPath = ['C:', 'Users', 'O' + apostrophe + 'Hare', 'AgentFoundry', 'bin'].join(slash);
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
  const launcherPath = path.join(paths.binDir, 'agent-foundry');
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
  await assert.rejects(readFile(path.join(target, '.agent-foundry', 'docs', 'BRD.md')));
});

test('--force installs the complete bundle and replaces file conflicts', async () => {
  const target = path.join(temporaryRoot, 'force-target');
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'AGENTS.md'), 'old guidance');

  await init({ targetDirectory: target, sourceRoot: repositoryRoot, force: true, write: () => {} });
  assert.match(await readFile(path.join(target, 'AGENTS.md'), 'utf8'), /^# Agent Guidance/);
  assert.equal(await readFile(path.join(target, '.agent-foundry', 'tasks', 'todo.md'), 'utf8'), '');
  assert.equal(await readFile(path.join(target, '.agent-foundry', 'tasks', 'lessons.md'), 'utf8'), '');
  assert.equal(await hasSymlink(target), false);

  const safeOperationsGuide = await readFile(
    path.join(target, '.agent-foundry', 'rules', 'SAFE-OPERATIONS.md'),
    'utf8'
  );
  assert.match(safeOperationsGuide, /^# Safe Operations & Data Protection/m);
});
