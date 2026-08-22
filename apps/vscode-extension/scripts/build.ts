import { copyFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as esbuild from 'esbuild';

const appDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceDirectory = resolve(appDirectory, '../..');
const development = process.argv.includes('--dev');
const watch = process.argv.includes('--watch');
const outputDirectory = join(appDirectory, 'dist');
const require = createRequire(import.meta.url);

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await copyFile(
  join(workspaceDirectory, 'packages', 'config', 'generated', 'config-schema.json'),
  join(outputDirectory, 'config-schema.json')
);

const options: esbuild.BuildOptions = {
  bundle: true,
  entryNames: '[dir]/[name]',
  entryPoints: [
    join(appDirectory, 'src', 'extension', 'index.ts'),
    join(appDirectory, 'src', 'language-server', 'server.ts')
  ],
  external: ['vscode'],
  format: 'cjs',
  keepNames: true,
  legalComments: 'eof',
  logLevel: 'info',
  minify: !development,
  outExtension: { '.js': '.cjs' },
  outbase: join(appDirectory, 'src'),
  outdir: outputDirectory,
  platform: 'node',
  plugins: [
    {
      name: 'bundle-jsonc-parser-esm',
      setup(build) {
        // jsonc-parser's CommonJS build loads ./impl modules dynamically, which
        // esbuild cannot discover. The equivalent ESM entry uses static imports.
        build.onResolve({ filter: /^jsonc-parser$/ }, (args) => ({
          path: require.resolve('jsonc-parser/lib/esm/main.js', { paths: [args.resolveDir] })
        }));
      }
    }
  ],
  sourcemap: development,
  target: 'node18'
};

if (watch) {
  const context = await esbuild.context(options);
  await context.watch();
  console.info('Watching the VS Code extension for changes.');
} else {
  await esbuild.build(options);
}
