#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  readFile,
  rename,
  realpath,
  rm,
  writeFile
} from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { materializeTemplate } from './bin/cli.mjs';

const sourceRoot = path.dirname(fileURLToPath(import.meta.url));
const managedMarker = '.managed-by-agent-config';
const managedMarkerContent = 'Managed by AgentConfig local installer.\n';
const pathStartMarker = '# >>> agent-config managed PATH >>>';
const pathEndMarker = '# <<< agent-config managed PATH <<<';

export function getInstallPaths({
  platform = process.platform,
  home,
  env = process.env
} = {}) {
  const userHome = home || env.HOME || env.USERPROFILE || os.homedir();

  if (platform === 'win32') {
    const pathApi = path.win32;
    const localAppData = env.LOCALAPPDATA || pathApi.join(userHome, 'AppData', 'Local');
    const root = pathApi.join(localAppData, 'AgentConfig');
    return {
      appRoot: pathApi.join(root, 'app'),
      binDir: pathApi.join(root, 'bin')
    };
  }

  if (platform !== 'linux' && platform !== 'darwin') {
    throw new Error('Unsupported operating system: ' + platform);
  }

  const dataHome = env.XDG_DATA_HOME && path.isAbsolute(env.XDG_DATA_HOME)
    ? env.XDG_DATA_HOME
    : path.join(userHome, '.local', 'share');

  return {
    appRoot: path.join(dataHome, 'agent-config'),
    binDir: path.join(userHome, '.local', 'bin')
  };
}

function shellQuote(value) {
  return "'" + value.replaceAll("'", "'\\''") + "'";
}

export function buildUnixLauncher(appRoot) {
  const cliPath = path.join(appRoot, 'bin', 'cli.mjs');
  return '#!/bin/sh\nexec node ' + shellQuote(cliPath) + ' "$@"\n';
}

export function buildWindowsLauncher() {
  return '@echo off\r\nnode "%~dp0..\\app\\bin\\cli.mjs" %*\r\n';
}

function pathProfileForShell(shell, home) {
  const shellName = path.basename(shell || '').toLowerCase();

  if (shellName === 'fish') {
    return {
      path: path.join(home, '.config', 'fish', 'config.fish'),
      command: 'fish_add_path --prepend "$HOME/.local/bin"'
    };
  }

  if (shellName === 'zsh') {
    return {
      path: path.join(home, '.zshrc'),
      command: 'export PATH="$HOME/.local/bin:$PATH"'
    };
  }

  if (shellName === 'bash') {
    return {
      path: path.join(home, '.bashrc'),
      command: 'export PATH="$HOME/.local/bin:$PATH"'
    };
  }

  return {
    path: path.join(home, '.profile'),
    command: 'export PATH="$HOME/.local/bin:$PATH"'
  };
}

function replaceManagedPathBlock(contents, command) {
  const block = [pathStartMarker, command, pathEndMarker].join('\n');
  const start = contents.indexOf(pathStartMarker);
  const end = contents.indexOf(pathEndMarker);

  if (start === -1 && end === -1) {
    const separator = contents.length > 0 && !contents.endsWith('\n') ? '\n' : '';
    return contents + separator + block + '\n';
  }

  if (start === -1 || end === -1 || end < start
    || contents.indexOf(pathStartMarker, start + pathStartMarker.length) !== -1
    || contents.indexOf(pathEndMarker, end + pathEndMarker.length) !== -1) {
    throw new Error('The agent-config PATH markers in the shell profile are incomplete or duplicated.');
  }

  return contents.slice(0, start) + block + contents.slice(end + pathEndMarker.length);
}

async function readFileIfPresent(filePath) {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}

export async function ensureUnixUserPath({ home, shell }) {
  const profile = pathProfileForShell(shell, home);
  await mkdir(path.dirname(profile.path), { recursive: true });
  const contents = await readFileIfPresent(profile.path);
  const updated = replaceManagedPathBlock(contents, profile.command);
  await writeFile(profile.path, updated);
  return profile.path;
}

function powerShellQuote(value) {
  return "'" + value.replaceAll("'", "''") + "'";
}

export function buildWindowsPathUpdateCommand(binDir) {
  const quotedBinDir = powerShellQuote(binDir);
  return [
    '$bin = ' + quotedBinDir,
    "$current = [Environment]::GetEnvironmentVariable('Path', 'User')",
    "$parts = @($current -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ })",
    'if (-not ($parts | Where-Object { $_ -ieq $bin })) {',
    "  if ([string]::IsNullOrWhiteSpace($current)) { $next = $bin }",
    "  else { $next = $current.TrimEnd(';') + ';' + $bin }",
    "  [Environment]::SetEnvironmentVariable('Path', $next, 'User')",
    '}'
  ].join('; ');
}

export async function ensureWindowsUserPath(
  binDir,
  runPowerShell = (command) => execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', command],
    { stdio: 'ignore' }
  )
) {
  runPowerShell(buildWindowsPathUpdateCommand(binDir));
}

async function existingEntry(targetPath) {
  try {
    return await lstat(targetPath);
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function assertLauncherIsManaged(launcherPath, expectedContents) {
  const launcherStats = await existingEntry(launcherPath);
  if (!launcherStats) return;

  if (!launcherStats.isFile() || launcherStats.isSymbolicLink()) {
    throw new Error('Refusing to replace a non-file launcher at ' + launcherPath);
  }

  if ((await readFile(launcherPath, 'utf8')) !== expectedContents) {
    throw new Error(
      'Refusing to replace an unmanaged launcher at ' + launcherPath
      + '. Move it aside before installing AgentConfig.'
    );
  }
}

async function isManagedInstall(appRoot) {
  const rootStats = await existingEntry(appRoot);
  if (!rootStats) return false;
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    throw new Error('The local install path exists and is not a managed directory: ' + appRoot);
  }

  const markerPath = path.join(appRoot, managedMarker);
  const markerStats = await existingEntry(markerPath);
  if (!markerStats || !markerStats.isFile() || markerStats.isSymbolicLink()) {
    throw new Error(
      'Refusing to replace an unmanaged directory at ' + appRoot
      + '. Move it aside before installing AgentConfig.'
    );
  }
  if ((await readFile(markerPath, 'utf8')) !== managedMarkerContent) {
    throw new Error(
      'Refusing to replace an unrecognized directory at ' + appRoot
      + '. Move it aside before installing AgentConfig.'
    );
  }

  return true;
}

async function replaceLocalApp(sourceRootPath, appRoot) {
  const parentDirectory = path.dirname(appRoot);
  const stagingRoot = path.join(parentDirectory, '.agent-config-stage-' + randomUUID());
  const backupRoot = path.join(parentDirectory, '.agent-config-backup-' + randomUUID());
  const existing = await existingEntry(appRoot);
  const managed = existing ? await isManagedInstall(appRoot) : false;

  await mkdir(parentDirectory, { recursive: true });
  await mkdir(stagingRoot);

  try {
    const configurationFiles = await materializeTemplate(sourceRootPath, stagingRoot);
    const cliSource = path.join(sourceRootPath, 'bin', 'cli.mjs');
    const cliDirectory = path.join(stagingRoot, 'bin');
    const cliDestination = path.join(cliDirectory, 'cli.mjs');

    await mkdir(cliDirectory, { recursive: true });
    await copyFile(cliSource, cliDestination);
    await chmod(cliDestination, 0o755);
    await writeFile(path.join(stagingRoot, managedMarker), managedMarkerContent);

    if (managed) {
      await rename(appRoot, backupRoot);
      try {
        await rename(stagingRoot, appRoot);
      } catch (error) {
        await rename(backupRoot, appRoot);
        throw error;
      }
      await rm(backupRoot, { recursive: true, force: true });
    } else {
      await rename(stagingRoot, appRoot);
    }

    return configurationFiles + 1;
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

export async function installLocalCli({
  sourceRoot: requestedSourceRoot = sourceRoot,
  platform = process.platform,
  home,
  env = process.env,
  write = (message) => process.stdout.write(message),
  runPowerShell
} = {}) {
  const userHome = home || env.HOME || env.USERPROFILE || os.homedir();
  const sourceRootPath = await realpath(requestedSourceRoot);
  const installPaths = getInstallPaths({ platform, home: userHome, env });
  await mkdir(installPaths.binDir, { recursive: true });
  const launcherPath = platform === 'win32'
    ? path.win32.join(installPaths.binDir, 'agent-config.cmd')
    : path.join(installPaths.binDir, 'agent-config');
  const launcherContents = platform === 'win32'
    ? buildWindowsLauncher()
    : buildUnixLauncher(installPaths.appRoot);

  await assertLauncherIsManaged(launcherPath, launcherContents);
  const installedFileCount = await replaceLocalApp(sourceRootPath, installPaths.appRoot);

  if (platform === 'win32') {
    await writeFile(launcherPath, launcherContents);
    await ensureWindowsUserPath(
      installPaths.binDir,
      runPowerShell ?? ((command) => execFileSync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', command],
        { stdio: 'ignore' }
      ))
    );
  } else {
    await writeFile(launcherPath, launcherContents);
    await chmod(launcherPath, 0o755);
    const profilePath = await ensureUnixUserPath({
      home: userHome,
      shell: env.SHELL
    });
    write('Updated PATH in ' + profilePath + '.\n');
  }

  write('Installed ' + installedFileCount + ' files into ' + installPaths.appRoot + '.\n');
  write('Open a new terminal, then run: agent-config init\n');
  return installPaths;
}

function printHelp() {
  process.stdout.write([
    'Usage: node install.mjs',
    '',
    'Install the local agent-config command for the current user.',
    'Run this from the AgentConfig checkout; no npm registry is used.',
    ''
  ].join('\n'));
}

async function main() {
  if (process.argv.slice(2).some((argument) => argument === '--help' || argument === '-h')) {
    printHelp();
    return;
  }

  if (process.argv.length > 2) {
    throw new Error('Unknown argument. Run node install.mjs --help.');
  }

  await installLocalCli();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write('AgentConfig installer: ' + error.message + '\n');
    process.exitCode = 1;
  });
}
