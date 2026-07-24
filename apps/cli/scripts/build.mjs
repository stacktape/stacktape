import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

await rm(new URL('../dist', import.meta.url), { force: true, recursive: true });
await build({
  bundle: true,
  entryPoints: [fileURLToPath(new URL('../src/main.ts', import.meta.url))],
  format: 'esm',
  outfile: fileURLToPath(new URL('../dist/main.js', import.meta.url)),
  platform: 'node',
  sourcemap: true
});
