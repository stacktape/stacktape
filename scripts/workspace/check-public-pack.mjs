import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const packageManagerCli = process.env.npm_execpath;
if (!packageManagerCli) {
  throw new Error('Run this check through pnpm so the pinned package-manager executable is available.');
}

const runPnpm = (args, cwd = publicRoot) => {
  const result = spawnSync(process.execPath, [packageManagerCli, ...args], {
    cwd,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(' ')} failed.\n${result.stderr}`);
  }
  return result.stdout.trim();
};

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'stacktape-pack-check-'));
const resolvedTemporaryRoot = path.resolve(temporaryRoot);
if (!resolvedTemporaryRoot.startsWith(path.resolve(os.tmpdir()))) {
  throw new Error(`Unexpected temporary path: ${resolvedTemporaryRoot}`);
}
try {
  runPnpm(['--dir', 'apps/cli', 'build']);
  const packed = JSON.parse(runPnpm(['--dir', 'apps/cli', 'pack', '--json', '--pack-destination', temporaryRoot]));
  const paths = new Set(packed.files.map((file) => file.path));
  const required = ['dist/main.js', 'package.json'];
  const forbiddenPrefixes = ['src/', 'node_modules/', 'apps/console/'];
  const forbiddenNames = new Set(['tsconfig.json', 'tsconfig.build.json']);

  for (const requiredPath of required) {
    if (!paths.has(requiredPath)) {
      throw new Error(`Packed CLI is missing required file: ${requiredPath}`);
    }
  }
  for (const packedPath of paths) {
    if (forbiddenPrefixes.some((prefix) => packedPath.startsWith(prefix)) || forbiddenNames.has(packedPath)) {
      throw new Error(`Packed CLI contains a development/private file: ${packedPath}`);
    }
  }

  const archivePath = path.isAbsolute(packed.filename) ? packed.filename : path.join(temporaryRoot, packed.filename);
  const consumer = path.join(temporaryRoot, 'consumer');
  await mkdir(consumer);
  await writeFile(
    path.join(consumer, 'package.json'),
    `${JSON.stringify({ name: 'external-consumer', private: true, version: '0.0.0' }, null, 2)}\n`
  );

  runPnpm(['--dir', consumer, 'add', '--offline', '--ignore-scripts', archivePath]);
  const installedPackage = path.join(consumer, 'node_modules', '@stacktape', 'cli');
  const installedManifest = JSON.parse(await readFile(path.join(installedPackage, 'package.json'), 'utf8'));
  if (installedManifest.dependencies && Object.keys(installedManifest.dependencies).length > 0) {
    throw new Error('Packed CLI unexpectedly retains runtime dependencies instead of its bundled runtime.');
  }

  const binName = process.platform === 'win32' ? 'stacktape.CMD' : 'stacktape';
  if (!existsSync(path.join(consumer, 'node_modules', '.bin', binName))) {
    throw new Error('Package installation did not create the stacktape binary entry.');
  }

  const executionOutput = runPnpm(['--dir', consumer, 'exec', 'stacktape']);
  const event = JSON.parse(executionOutput);
  if (event.type !== 'workspace.ready' || event.version !== 1) {
    throw new Error(`Installed CLI emitted an unexpected event: ${executionOutput}`);
  }
} finally {
  await rm(resolvedTemporaryRoot, { force: true, recursive: true });
}
