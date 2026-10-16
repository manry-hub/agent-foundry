#!/usr/bin/env node

import { lstat, mkdir, readdir, readFile, rm, writeFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templateRoot = path.join(packageRoot, 'package-template');

export function printHelp() {
  process.stdout.write(`Usage: agent-config init [target-dir] [--force]

Install AGENTS.md and .agent/ into a project directory.

Options:
  -f, --force  Replace every conflicting file without prompting
  -h, --help   Show this help
`);
}

export function parseArguments(args) {
  let command;
  let targetDirectory;
  let force = false;

  for (const argument of args) {
    if (argument === '--help' || argument === '-h') {
      return { help: true };
    }

    if (argument === '--force' || argument === '-f') {
      force = true;
      continue;
    }

    if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    }

    if (!command) {
      command = argument;
    } else if (!targetDirectory) {
      targetDirectory = argument;
    } else {
      throw new Error(`Unexpected argument: ${argument}`);
    }
  }

  if (!command) {
    return { help: true };
  }

  if (command !== 'init') {
    throw new Error(`Unknown command: ${command}`);
  }

  return { command, targetDirectory, force };
}

async function collectTemplateFiles(directory = templateRoot, relativeDirectory = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const sourcePath = path.join(directory, entry.name);

    if (entry.isSymbolicLink()) {
      throw new Error(`The packaged template contains a symbolic link: ${relativePath}`);
    }

    if (entry.isDirectory()) {
      files.push(...await collectTemplateFiles(sourcePath, relativePath));
    } else if (entry.isFile()) {
      files.push({ relativePath, sourcePath });
    }
  }

  return files;
}

async function existingEntry(targetPath) {
  try {
    return await lstat(targetPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

function addConflict(conflicts, relativePath, targetPath) {
  if (!conflicts.has(relativePath)) {
    conflicts.set(relativePath, { relativePath, targetPath });
  }
}

async function findConflicts(targetRoot, files) {
  const conflicts = new Map();
  const unsupported = [];

  for (const file of files) {
    const segments = file.relativePath.split(path.sep);
    let relativeParent = '';
    let blocked = false;

    for (const segment of segments.slice(0, -1)) {
      relativeParent = path.join(relativeParent, segment);
      const parentPath = path.join(targetRoot, relativeParent);
      const parentStats = await existingEntry(parentPath);

      if (!parentStats) break;
      if (parentStats.isDirectory() && !parentStats.isSymbolicLink()) continue;

      addConflict(conflicts, relativeParent, parentPath);
      blocked = true;
      break;
    }

    if (blocked) continue;

    const targetPath = path.join(targetRoot, file.relativePath);
    const targetStats = await existingEntry(targetPath);
    if (!targetStats) continue;

    if (targetStats.isDirectory() && !targetStats.isSymbolicLink()) {
      unsupported.push(file.relativePath);
      continue;
    }

    addConflict(conflicts, file.relativePath, targetPath);
  }

  if (unsupported.length > 0) {
    throw new Error(`A directory already occupies a bundled file path and cannot be replaced safely: ${unsupported.join(', ')}`);
  }

  return [...conflicts.values()].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

async function promptForConflicts(conflicts) {
  const choices = new Map();
  const prompt = createInterface({ input: process.stdin, output: process.stdout });

  try {
    for (const conflict of conflicts) {
      const answer = await prompt.question(`Replace ${conflict.relativePath}? [y/N] `);
      choices.set(conflict.relativePath, /^y(es)?$/i.test(answer.trim()));
    }
  } finally {
    prompt.close();
  }

  return choices;
}

function isApproved(filePath, conflicts, choices) {
  const parts = filePath.split(path.sep);

  for (let index = 1; index <= parts.length; index += 1) {
    const relativePath = parts.slice(0, index).join(path.sep);
    const conflict = conflicts.get(relativePath);
    if (conflict && !choices.get(relativePath)) return false;
  }

  return true;
}

async function removeApprovedConflicts(conflicts, choices) {
  for (const conflict of conflicts) {
    if (!choices.get(conflict.relativePath)) continue;
    await rm(conflict.targetPath, { force: true, recursive: false });
  }
}

async function install(targetRoot, files, conflicts, choices) {
  const installed = [];
  const skipped = [];

  await removeApprovedConflicts(conflicts, choices);

  for (const file of files) {
    if (!isApproved(file.relativePath, conflicts, choices)) {
      skipped.push(file.relativePath);
      continue;
    }

    const destinationPath = path.join(targetRoot, file.relativePath);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    const contents = await readFile(file.sourcePath);
    await writeFile(destinationPath, contents);
    const sourceStats = await lstat(file.sourcePath);
    await chmod(destinationPath, sourceStats.mode & 0o777);
    installed.push(file.relativePath);
  }

  return { installed, skipped };
}

export async function init({ targetDirectory, force, write = (message) => process.stdout.write(message) }) {
  let files;

  try {
    files = await collectTemplateFiles();
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('The package template is missing. Reinstall the package or run it from a packed installation.');
    }
    throw error;
  }

  const targetRoot = path.resolve(process.cwd(), targetDirectory ?? '.');
  const rootStats = await existingEntry(targetRoot);
  if (rootStats && !rootStats.isDirectory()) {
    throw new Error(`Target is not a directory: ${targetRoot}`);
  }

  const conflicts = await findConflicts(targetRoot, files);
  const conflictMap = new Map(conflicts.map((conflict) => [conflict.relativePath, conflict]));
  let choices = new Map();

  if (conflicts.length > 0) {
    if (force) {
      choices = new Map(conflicts.map((conflict) => [conflict.relativePath, true]));
    } else if (!process.stdin.isTTY || !process.stdout.isTTY) {
      const paths = conflicts.map((conflict) => `  ${conflict.relativePath}`).join('\n');
      throw new Error(`Conflicting paths found. No files were written. Rerun interactively to choose per file, or pass --force to replace all conflicts:\n${paths}`);
    } else {
      choices = await promptForConflicts(conflicts);
    }
  }

  const selectedFiles = files.filter((file) => isApproved(file.relativePath, conflictMap, choices));
  if (selectedFiles.length === 0) {
    write('No files installed. Existing files were kept.\n');
    return;
  }

  await mkdir(targetRoot, { recursive: true });
  const { installed, skipped } = await install(targetRoot, files, conflictMap, choices);
  write(`Installed ${installed.length} files into ${targetRoot}.\n`);
  if (skipped.length > 0) {
    write(`Kept ${skipped.length} conflicting file(s).\n`);
  }
}

async function main() {
  try {
    const parsed = parseArguments(process.argv.slice(2));
    if (parsed.help) {
      printHelp();
      return;
    }

    await init(parsed);
  } catch (error) {
    process.stderr.write(`agent-config: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
