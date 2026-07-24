import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const packageManagerCli = process.env.npm_execpath;
if (!packageManagerCli) {
  throw new Error('Run this check through pnpm so the pinned package-manager executable is available.');
}

const result = spawnSync(process.execPath, [packageManagerCli, '--dir', 'apps/cli', 'pack', '--dry-run', '--json'], {
  cwd: publicRoot,
  encoding: 'utf8'
});

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const manifest = JSON.parse(result.stdout);
const paths = new Set(manifest.files.map((file) => file.path));
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
