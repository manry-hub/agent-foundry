import { cp, lstat, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageTemplate = path.join(repositoryRoot, 'package-template');
const outputAgentDirectory = path.join(packageTemplate, '.agent');

async function assertNoSymlinks(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    const entryStats = await lstat(entryPath);

    if (entryStats.isSymbolicLink()) {
      throw new Error(`Template still contains a symbolic link: ${path.relative(packageTemplate, entryPath)}`);
    }

    if (entryStats.isDirectory()) {
      await assertNoSymlinks(entryPath);
    }
  }
}

export async function buildTemplate({ quiet = false } = {}) {
  await rm(packageTemplate, { recursive: true, force: true });
  await mkdir(packageTemplate, { recursive: true });
  await cp(path.join(repositoryRoot, 'AGENTS.md'), path.join(packageTemplate, 'AGENTS.md'));
  await cp(path.join(repositoryRoot, '.agent'), outputAgentDirectory, {
    recursive: true,
    dereference: true
  });
  await assertNoSymlinks(packageTemplate);
  if (!quiet) process.stdout.write(`Prepared package template at ${path.relative(repositoryRoot, packageTemplate)}\n`);
}

export async function cleanTemplate() {
  await rm(packageTemplate, { recursive: true, force: true });
}

async function main() {
  const action = process.argv[2];

  try {
    if (action === 'build') {
      await buildTemplate();
    } else if (action === 'clean') {
      await cleanTemplate();
    } else {
      throw new Error('Usage: node scripts/prepare-template.js <build|clean>');
    }
  } catch (error) {
    process.stderr.write(`Unable to ${action ?? 'prepare'} package template: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
