#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pathSeparator = path.sep;

// Git for Windows may check these tracked symlinks out as ordinary files.
const checkoutSymlinkPlaceholders = new Map([
  [
    '.agent-foundry/skills/owasp-secure-agent-playbook/upstream/plugins/code-security-skills/skills/securability-engineering-review/references',
    '../../../../data'
  ],
  [
    '.agent-foundry/skills/owasp-secure-agent-playbook/upstream/plugins/code-security-skills/skills/securability-engineering/references',
    '../../../../data'
  ],
  [
    '.agent-foundry/skills/owasp-secure-agent-playbook/upstream/plugins/code-security-skills/skills/security-guidance/references',
    '../../../../data'
  ]
]);

export function printHelp(write = (message) => process.stdout.write(message)) {
  write([
    'Usage: agent-foundry init [target-dir] [--force]',
    '',
    'Install AGENTS.md and .agent-foundry/ into a project directory.',
    '',
    'Options:',
    '  -f, --force  Replace every conflicting file without prompting',
    '  -h, --help   Show this help',
    ''
  ].join('\n'));
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
      throw new Error('Unknown option: ' + argument);
    }

    if (!command) {
      command = argument;
    } else if (!targetDirectory) {
      targetDirectory = argument;
    } else {
      throw new Error('Unexpected argument: ' + argument);
    }
  }

  if (!command) {
    return { help: true };
  }

  if (command !== 'init') {
    throw new Error('Unknown command: ' + command);
  }

  return { command, targetDirectory, force };
}

function isWithinDirectory(directory, candidate) {
  const relativePath = path.relative(directory, candidate);
  return relativePath === ''
    || (relativePath !== '..'
      && !relativePath.startsWith('..' + pathSeparator)
      && !path.isAbsolute(relativePath));
}

async function resolveSourceEntry(sourcePath, relativePath, sourceBoundary) {
  const entryStats = await lstat(sourcePath);
  let resolvedPath = sourcePath;
  const portableRelativePath = relativePath.split(pathSeparator).join('/');

  if (entryStats.isSymbolicLink()) {
    resolvedPath = await realpath(sourcePath);
  } else if (entryStats.isFile() && checkoutSymlinkPlaceholders.has(portableRelativePath)) {
    const expectedTarget = checkoutSymlinkPlaceholders.get(portableRelativePath);
    const contents = (await readFile(sourcePath, 'utf8')).trim();

    if (contents === expectedTarget) {
      resolvedPath = await realpath(path.resolve(path.dirname(sourcePath), expectedTarget));
    }
  }

  if (!isWithinDirectory(sourceBoundary, resolvedPath)) {
    throw new Error('Template entry resolves outside the AgentFoundry directory: ' + relativePath);
  }

  const resolvedStats = await stat(resolvedPath);
  return { resolvedPath, resolvedStats };
}

async function collectEntry(sourcePath, relativePath, sourceBoundary, entries, ancestorDirectories) {
  const { resolvedPath, resolvedStats } = await resolveSourceEntry(
    sourcePath,
    relativePath,
    sourceBoundary
  );

  if (resolvedStats.isDirectory()) {
    const directoryPath = await realpath(resolvedPath);
    if (ancestorDirectories.includes(directoryPath)) {
      throw new Error('The template contains a directory link cycle: ' + relativePath);
    }

    const children = await readdir(directoryPath);
    for (const child of children) {
      await collectEntry(
        path.join(directoryPath, child),
        path.join(relativePath, child),
        sourceBoundary,
        entries,
        [...ancestorDirectories, directoryPath]
      );
    }
    return;
  }

  if (!resolvedStats.isFile()) {
    throw new Error('The template contains an unsupported filesystem entry: ' + relativePath);
  }

  entries.push({ relativePath, sourcePath: resolvedPath });
}

export async function collectTemplateFiles(sourceRoot = packageRoot) {
  const sourceBoundary = await realpath(sourceRoot);
  const entries = [];

  for (const relativePath of ['AGENTS.md', '.agent-foundry']) {
    await collectEntry(
      path.join(sourceBoundary, relativePath),
      relativePath,
      sourceBoundary,
      entries,
      []
    );
  }

  return entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export async function materializeTemplate(sourceRoot, destinationRoot) {
  const files = await collectTemplateFiles(sourceRoot);

  for (const file of files) {
    const destinationPath = path.join(destinationRoot, file.relativePath);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await writeFile(destinationPath, await readFile(file.sourcePath));
    const sourceStats = await stat(file.sourcePath);
    await chmod(destinationPath, sourceStats.mode & 0o777);
  }

  return files.length;
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
    const segments = file.relativePath.split(pathSeparator);
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
    throw new Error(
      'A directory already occupies a bundled file path and cannot be replaced safely: '
      + unsupported.join(', ')
    );
  }

  return [...conflicts.values()].sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath)
  );
}

async function promptForConflicts(conflicts) {
  const choices = new Map();
  const prompt = createInterface({ input: process.stdin, output: process.stdout });

  try {
    for (const conflict of conflicts) {
      const answer = await prompt.question('Replace ' + conflict.relativePath + '? [y/N] ');
      choices.set(conflict.relativePath, /^y(es)?$/i.test(answer.trim()));
    }
  } finally {
    prompt.close();
  }

  return choices;
}

function isApproved(filePath, conflicts, choices) {
  const parts = filePath.split(pathSeparator);

  for (let index = 1; index <= parts.length; index += 1) {
    const relativePath = parts.slice(0, index).join(pathSeparator);
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

async function writeSelectedFiles(targetRoot, files, conflicts, choices) {
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
    await writeFile(destinationPath, await readFile(file.sourcePath));
    const sourceStats = await stat(file.sourcePath);
    await chmod(destinationPath, sourceStats.mode & 0o777);
    installed.push(file.relativePath);
  }

  return { installed, skipped };
}

export async function init({
  targetDirectory,
  force,
  sourceRoot = packageRoot,
  write = (message) => process.stdout.write(message)
}) {
  const files = await collectTemplateFiles(sourceRoot);
  const targetRoot = path.resolve(process.cwd(), targetDirectory ?? '.');
  const rootStats = await existingEntry(targetRoot);

  if (rootStats && !rootStats.isDirectory()) {
    throw new Error('Target is not a directory: ' + targetRoot);
  }

  const conflicts = await findConflicts(targetRoot, files);
  const conflictMap = new Map(conflicts.map((conflict) => [conflict.relativePath, conflict]));
  let choices = new Map();

  if (conflicts.length > 0) {
    if (force) {
      choices = new Map(conflicts.map((conflict) => [conflict.relativePath, true]));
    } else if (!process.stdin.isTTY || !process.stdout.isTTY) {
      const paths = conflicts.map((conflict) => '  ' + conflict.relativePath).join('\n');
      throw new Error(
        'Conflicting paths found. No files were written. Rerun interactively to choose per file, '
        + 'or pass --force to replace all conflicts:\n' + paths
      );
    } else {
      choices = await promptForConflicts(conflicts);
    }
  }

  const selectedFiles = files.filter((file) =>
    isApproved(file.relativePath, conflictMap, choices)
  );
  if (selectedFiles.length === 0) {
    write('No files installed. Existing files were kept.\n');
    return;
  }

  await mkdir(targetRoot, { recursive: true });
  const result = await writeSelectedFiles(targetRoot, files, conflictMap, choices);
  write('Installed ' + result.installed.length + ' files into ' + targetRoot + '.\n');
  if (result.skipped.length > 0) {
    write('Kept ' + result.skipped.length + ' conflicting file(s).\n');
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
    process.stderr.write('agent-foundry: ' + error.message + '\n');
    process.exitCode = 1;
  }
}

export function isMainEntrypoint(candidatePath, modulePath) {
  if (!candidatePath) return false;

  try {
    return realpathSync(candidatePath) === realpathSync(modulePath);
  } catch {
    return false;
  }
}

if (isMainEntrypoint(process.argv[1], fileURLToPath(import.meta.url))) {
  await main();
}
