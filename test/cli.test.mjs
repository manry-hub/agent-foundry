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
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-knowledge-test-'));
});

after(async () => {
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
});

test('help and command arguments are recognized', () => {
  let help = '';
  printHelp((message) => { help = message; });

  assert.match(help, /Usage: agent-knowledge init/);
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
    '.agent-knowledge',
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
    || /^\.agent-knowledge\/static\/(commands|rules)\//.test(relativePath)
  );
  const references = new Set();

  for (const file of guidanceFiles) {
    const contents = await readFile(file.sourcePath, 'utf8');
    for (const [, reference] of contents.matchAll(/`(\.agent-knowledge\/[^`]+)`/g)) {
      references.add(reference.replace(/\/+$/, ''));
    }
  }

  for (const reference of references) {
    const pathToCheck = /YYYY-MM-DD|<[^>]+>|\{[^}]+\}/.test(reference)
      ? path.dirname(reference)
      : reference;
    await assert.doesNotReject(
      stat(path.join(repositoryRoot, pathToCheck)),
      `expected ${pathToCheck} to exist`
    );
  }

  for (const file of guidanceFiles) {
    const contents = await readFile(file.sourcePath, 'utf8');
    for (const [, target] of contents.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^(?:https?:|#|mailto:)/.test(target)) continue;
      await assert.doesNotReject(
        stat(path.resolve(path.dirname(file.sourcePath), target)),
        `expected Markdown link ${target} in ${file.relativePath} to resolve`
      );
    }
  }

  const guidanceText = await Promise.all(guidanceFiles.map((file) => readFile(file.sourcePath, 'utf8')));
  assert.doesNotMatch(guidanceText.join('\n'), /ai-rules\/README\.md|\bdev-docs\/|\bprod-docs\//);

  assert.ok(templateFiles.some(({ relativePath }) =>
    relativePath === '.agent-knowledge/static/rules/SAFE-OPERATIONS.md'
  ));
  assert.ok(templateFiles.some(({ relativePath }) =>
    relativePath === '.agent-knowledge/static/rules/SECURITY-BASELINE.md'
  ));
  assert.ok(templateFiles.some(({ relativePath }) =>
    relativePath === '.agent-knowledge/static/rules/CODING-STANDARDS.md'
  ));
  assert.equal(templateFiles.some(({ relativePath }) =>
    relativePath.startsWith('.agent-knowledge/static/rules/security/')
  ), false);

  const developmentDocsSetup = await readFile(
    path.join(
      repositoryRoot,
      '.agent-knowledge',
      'static',
      'commands',
      'setups',
      'DEVDOCS-SETUP.md'
    ),
    'utf8'
  );
  assert.match(developmentDocsSetup, /Proyek Berjalan/);
  assert.match(developmentDocsSetup, /Proyek Baru/);
  assert.match(developmentDocsSetup, /Jangan mulai menulis PRD maupun dokumen SDD sebelum pengguna memilih mode/);
  assert.match(developmentDocsSetup, /rencana atau usulan/);
  assert.match(developmentDocsSetup, /PRD-TEMPLATE\.md/);
  assert.match(developmentDocsSetup, /Template adalah struktur kanonis dan tidak boleh diubah/);
  assert.match(developmentDocsSetup, /SDD-TEMPLATE\.md/);
  assert.match(developmentDocsSetup, /ARCHITECTURE\.md/);
  assert.match(developmentDocsSetup, /TECHNOLOGYSTACK\.md/);
  assert.match(developmentDocsSetup, /DATABASE\.md/);

  const prdTemplate = await readFile(
    path.join(
      repositoryRoot,
      '.agent-knowledge',
      'static',
      'templates',
      'PRD-TEMPLATE.md'
    ),
    'utf8'
  );
  assert.match(prdTemplate, /IMMUTABLE/);
  assert.match(prdTemplate, /\{PLANNING \/ CURRENT\}/);
  assert.match(prdTemplate, /dynamic\/docs\/dev\/PRD\.md/);
  assert.match(prdTemplate, /## 1\. Product Vision/);
  assert.match(prdTemplate, /## 6\. Out of Scope/);

  const sddTemplate = await readFile(
    path.join(
      repositoryRoot,
      '.agent-knowledge',
      'static',
      'templates',
      'SDD-TEMPLATE.md'
    ),
    'utf8'
  );
  assert.match(sddTemplate, /IMMUTABLE/);
  assert.match(sddTemplate, /\{PLANNING \/ CURRENT\}/);
  assert.match(sddTemplate, /ARCHITECTURE\.md/);
  assert.match(sddTemplate, /TECHNOLOGYSTACK\.md/);
  assert.match(sddTemplate, /DATABASE\.md/);
  assert.match(sddTemplate, /## 1\. System Design/);
  assert.match(sddTemplate, /## 1\. Database Topology/);

  for (const documentName of ['ARCHITECTURE.md', 'TECHNOLOGYSTACK.md', 'DATABASE.md']) {
    await assert.doesNotReject(
      stat(path.join(repositoryRoot, '.agent-knowledge', 'dynamic', 'docs', 'dev', 'sdd', documentName))
    );
  }
  await assert.rejects(
    stat(path.join(repositoryRoot, '.agent-knowledge', 'dynamic', 'docs', 'dev', 'SDD.md'))
  );

  const designSetup = await readFile(
    path.join(
      repositoryRoot,
      '.agent-knowledge',
      'static',
      'commands',
      'setups',
      'DESIGN-SETUP.md'
    ),
    'utf8'
  );
  assert.match(designSetup, /Proyek Berjalan/);
  assert.match(designSetup, /Proyek Baru/);
  assert.match(designSetup, /Jangan mulai menulis `DESIGN\.md` sebelum pengguna memilih mode/);
  assert.match(designSetup, /Kumpulkan arah visual berikut sebelum menulis/);

  const productionDocsSetup = await readFile(
    path.join(
      repositoryRoot,
      '.agent-knowledge',
      'static',
      'commands',
      'setups',
      'PRODDOCS-SETUP.md'
    ),
    'utf8'
  );
  assert.match(productionDocsSetup, /Infrastruktur Berjalan/);
  assert.match(productionDocsSetup, /Infrastruktur Rencana/);
  assert.match(productionDocsSetup, /Jangan mulai menulis dokumentasi produksi sebelum pengguna memilih mode/);
  assert.match(productionDocsSetup, /NETWORK-TOPOLOGY-TEMPLATE\.md/);
  assert.match(productionDocsSetup, /DEPLOYMENT-TEMPLATE\.md/);

  const networkTopologyTemplate = await readFile(
    path.join(repositoryRoot, '.agent-knowledge', 'static', 'templates', 'NETWORK-TOPOLOGY-TEMPLATE.md'),
    'utf8'
  );
  assert.match(networkTopologyTemplate, /IMMUTABLE/);
  assert.match(networkTopologyTemplate, /dynamic\/docs\/prod\/NETWORK-TOPOLOGY\.md/);
  assert.match(networkTopologyTemplate, /## Network Overview/);

  const deploymentTemplate = await readFile(
    path.join(repositoryRoot, '.agent-knowledge', 'static', 'templates', 'DEPLOYMENT-TEMPLATE.md'),
    'utf8'
  );
  assert.match(deploymentTemplate, /IMMUTABLE/);
  assert.match(deploymentTemplate, /dynamic\/docs\/prod\/DEPLOYMENT\.md/);
  assert.match(deploymentTemplate, /## Deployment Strategy/);

  for (const documentName of ['NETWORK-TOPOLOGY.md', 'DEPLOYMENT.md']) {
    await assert.doesNotReject(
      stat(path.join(repositoryRoot, '.agent-knowledge', 'dynamic', 'docs', 'prod', documentName))
    );
  }

  const documentationIndex = await readFile(
    path.join(repositoryRoot, '.agent-knowledge', 'dynamic', 'docs', 'README.md'),
    'utf8'
  );
  assert.match(documentationIndex, /Living Documentation Index/);
  assert.match(documentationIndex, /dev\/PRD\.md/);
  assert.match(documentationIndex, /prod\/DEPLOYMENT\.md/);
  const agentsGuide = await readFile(path.join(repositoryRoot, 'AGENTS.md'), 'utf8');
  assert.match(agentsGuide, /dynamic\/docs\/README\.md/);
  assert.match(agentsGuide, /DESIGN\.md.*approved decisions evolve/);
  assert.match(agentsGuide, /SAFE-OPERATIONS\.md/);
  assert.doesNotMatch(agentsGuide, /Never open, read, or print secret files/);
  assert.doesNotMatch(agentsGuide, /MCP Tool Routing|CODING-STANDARDS\.md/);
  const repositoryReadme = await readFile(path.join(repositoryRoot, 'README.md'), 'utf8');
  assert.match(repositoryReadme, /## Recommended Skills/);
  assert.match(repositoryReadme, /## Recommended MCP Servers/);
  assert.match(repositoryReadme, /Context7 MCP/);
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
  assert.equal(await readFile(path.join(paths.appRoot, '.agent-knowledge', 'dynamic', 'reports', 'LESSON.md'), 'utf8'), '');
  await assert.doesNotReject(stat(path.join(paths.appRoot, '.agent-knowledge', 'dynamic', 'reports', 'tasks')));
  await assert.rejects(stat(path.join(paths.appRoot, '.agent-knowledge', 'dynamic', 'tasks', 'todo.md')));
  await assert.rejects(stat(path.join(paths.appRoot, '.agent-knowledge', 'dynamic', 'reports', 'tasks', '001-devdocs-project-modes.md')));
  assert.equal(await hasSymlink(path.join(paths.appRoot, '.agent-knowledge')), false);
  const safeOperationsFile = path.join(
    paths.appRoot,
    '.agent-knowledge',
    'static',
    'rules',
    'SAFE-OPERATIONS.md'
  );
  assert.match(await readFile(safeOperationsFile, 'utf8'), /^# Safe Operations & Data Protection/m);
  assert.ok((await readFile(path.join(paths.binDir, 'agent-knowledge'), 'utf8')).includes('cli.mjs'));
  assert.ok((await stat(path.join(paths.binDir, 'agent-knowledge'))).mode & 0o111);

  const profilePath = path.join(home, '.bashrc');
  const profile = await readFile(profilePath, 'utf8');
  assert.equal(countOccurrences(profile, '# >>> agent-knowledge managed PATH >>>'), 1);
  assert.equal(countOccurrences(profile, '# <<< agent-knowledge managed PATH <<<'), 1);

  const targetProject = path.join(temporaryRoot, 'separate-project');
  await mkdir(targetProject, { recursive: true });
  const commandOutput = execFileSync(path.join(paths.binDir, 'agent-knowledge'), ['init'], {
    cwd: targetProject,
    encoding: 'utf8'
  });
  assert.match(commandOutput, /Installed \d+ files/);
  assert.equal(await readFile(path.join(targetProject, 'AGENTS.md'), 'utf8'),
    await readFile(path.join(repositoryRoot, 'AGENTS.md'), 'utf8'));
  assert.equal(await hasSymlink(path.join(targetProject, '.agent-knowledge')), false);

  await installLocalCli(options);
  const updatedProfile = await readFile(profilePath, 'utf8');
  assert.equal(countOccurrences(updatedProfile, '# >>> agent-knowledge managed PATH >>>'), 1);
  assert.equal(countOccurrences(updatedProfile, '# <<< agent-knowledge managed PATH <<<'), 1);
  assert.ok(output.some((message) => message.includes('agent-knowledge init')));
});

test('new installer leaves an existing AgentFoundry installation untouched', async () => {
  const home = path.join(temporaryRoot, 'legacy-install-home');
  const options = {
    sourceRoot: repositoryRoot,
    platform: 'linux',
    home,
    env: { SHELL: '/bin/bash' },
    write: () => {}
  };
  const oldAppRoot = path.join(home, '.local', 'share', 'agent-foundry');
  const oldLauncherPath = path.join(home, '.local', 'bin', 'agent-foundry');
  const oldAppFile = path.join(oldAppRoot, 'keep.txt');
  await mkdir(oldAppRoot, { recursive: true });
  await mkdir(path.dirname(oldLauncherPath), { recursive: true });
  await writeFile(oldAppFile, 'old install data');
  await writeFile(oldLauncherPath, '#!/bin/sh\necho old launcher\n');

  const paths = await installLocalCli(options);

  assert.equal(await readFile(oldAppFile, 'utf8'), 'old install data');
  assert.equal(await readFile(oldLauncherPath, 'utf8'), '#!/bin/sh\necho old launcher\n');
  assert.ok(await stat(path.join(paths.appRoot, 'AGENTS.md')));
  assert.ok(await stat(path.join(paths.binDir, 'agent-knowledge')));
});

test('Windows paths and launcher use per-user locations and a command shim', () => {
  const slash = String.fromCharCode(92);
  const home = ['C:', 'Users', 'Example'].join(slash);
  const localAppData = [home, 'AppData', 'Local'].join(slash);
  const expectedRoot = [localAppData, 'AgentKnowledge'].join(slash);

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
  const windowsPath = ['C:', 'Users', 'O' + apostrophe + 'Hare', 'AgentKnowledge', 'bin'].join(slash);
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
  const launcherPath = path.join(paths.binDir, 'agent-knowledge');
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
  await assert.rejects(readFile(path.join(target, '.agent-knowledge', 'dynamic', 'docs', 'dev', 'PRD.md')));
});

test('--force installs the complete bundle and replaces file conflicts', async () => {
  const target = path.join(temporaryRoot, 'force-target');
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'AGENTS.md'), 'old guidance');
  const legacyDirectory = path.join(target, '.agent-foundry');
  const legacyFile = path.join(legacyDirectory, 'keep.txt');
  await mkdir(legacyDirectory, { recursive: true });
  await writeFile(legacyFile, 'legacy project configuration');

  await init({ targetDirectory: target, sourceRoot: repositoryRoot, force: true, write: () => {} });
  assert.match(await readFile(path.join(target, 'AGENTS.md'), 'utf8'), /^# Agent Guidance/);
  assert.equal(await readFile(legacyFile, 'utf8'), 'legacy project configuration');
  assert.equal(await readFile(path.join(target, '.agent-knowledge', 'dynamic', 'reports', 'LESSON.md'), 'utf8'), '');
  await assert.doesNotReject(stat(path.join(target, '.agent-knowledge', 'dynamic', 'reports', 'tasks')));
  await assert.rejects(stat(path.join(target, '.agent-knowledge', 'dynamic', 'tasks', 'todo.md')));
  await assert.rejects(stat(path.join(target, '.agent-knowledge', 'dynamic', 'reports', 'tasks', '001-devdocs-project-modes.md')));
  assert.equal(await hasSymlink(target), false);

  const safeOperationsGuide = await readFile(
    path.join(target, '.agent-knowledge', 'static', 'rules', 'SAFE-OPERATIONS.md'),
    'utf8'
  );
  assert.match(safeOperationsGuide, /^# Safe Operations & Data Protection/m);
});
