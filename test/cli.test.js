import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile, lstat, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { init, isMainEntrypoint, parseArguments } from '../bin/cli.js';
import { buildTemplate, cleanTemplate } from '../scripts/prepare-template.js';

let temporaryRoot;

async function hasSymlink(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    const stats = await lstat(entryPath);
    if (stats.isSymbolicLink()) return true;
    if (stats.isDirectory() && await hasSymlink(entryPath)) return true;
  }
  return false;
}

before(async () => {
  await buildTemplate({ quiet: true });
  temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-config-test-'));
});

after(async () => {
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
  await cleanTemplate();
});

test('help flag is recognized', () => {
  assert.deepEqual(parseArguments(['--help']), { help: true });
  assert.deepEqual(parseArguments(['init', './project', '--force']), {
    command: 'init',
    targetDirectory: './project',
    force: true
  });
});

test('CLI entrypoint detection follows npm bin symlinks', async () => {
  const cliPath = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
  const symlinkPath = path.join(temporaryRoot, 'agent-config-bin');
  await symlink(cliPath, symlinkPath);

  assert.equal(isMainEntrypoint(symlinkPath, cliPath), true);
});

test('non-interactive conflicts abort before installing any other files', async () => {
  const target = path.join(temporaryRoot, 'conflict-target');
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'AGENTS.md'), 'keep this file');

  await assert.rejects(init({ targetDirectory: target, force: false }), /No files were written/);
  assert.equal(await readFile(path.join(target, 'AGENTS.md'), 'utf8'), 'keep this file');
  await assert.rejects(readFile(path.join(target, '.agent', 'rules', 'BRD.md')));
});

test('--force installs the complete bundle and replaces file conflicts', async () => {
  const target = path.join(temporaryRoot, 'force-target');
  await mkdir(target, { recursive: true });
  await writeFile(path.join(target, 'AGENTS.md'), 'old guidance');

  await init({ targetDirectory: target, force: true, write: () => {} });
  assert.match(await readFile(path.join(target, 'AGENTS.md'), 'utf8'), /^# Agent Guidance/);
  assert.equal(await readFile(path.join(target, '.agent', 'tasks', 'todo.md'), 'utf8'), '');
  assert.equal(await readFile(path.join(target, '.agent', 'tasks', 'lessons.md'), 'utf8'), '');
  const impeccableSkill = await readFile(path.join(target, '.agent', 'skills', 'impeccable', 'SKILL.md'), 'utf8');
  const materializedReference = await readFile(path.join(target, '.agent', 'skills', 'owasp-secure-agent-playbook', 'upstream', 'plugins', 'code-security-skills', 'skills', 'security-guidance', 'references', 'aisvs', 'C1.1.md'), 'utf8');
  assert.ok(impeccableSkill.startsWith('---'));
  assert.ok(materializedReference.length > 0);
  assert.equal(await hasSymlink(target), false);
});
