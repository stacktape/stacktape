import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildEsCode } from './index';

test('bundles an in-memory entrypoint when relative imports use the Windows resolver', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'stacktape-raw-code-build-'));
  const outputPath = join(outputDirectory, 'index.js');

  try {
    await buildEsCode({
      rawCode: 'console.log("virtual entry works");',
      distPath: outputPath,
      externals: [],
      sourceMaps: 'disabled',
      sourceMapBannerType: 'disabled',
      cwd: process.cwd(),
      createPackagingError: ({ message }) => new Error(message)
    });

    await expect(readFile(outputPath, 'utf-8')).resolves.toContain('virtual entry works');
  } finally {
    await rm(outputDirectory, { force: true, recursive: true });
  }
});

test('keeps NODE_ENV runtime-configurable instead of baking in the packaging process', async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'stacktape-node-env-build-'));
  const outputPath = join(outputDirectory, 'index.js');

  try {
    await buildEsCode({
      rawCode: 'export const handler = () => process.env.NODE_ENV;',
      distPath: outputPath,
      externals: [],
      minify: true,
      sourceMaps: 'disabled',
      sourceMapBannerType: 'disabled',
      cwd: process.cwd(),
      createPackagingError: ({ message }) => new Error(message)
    });

    const output = await readFile(outputPath, 'utf8');
    expect(output).toContain('process.env.NODE_ENV');
    expect(output).not.toContain('"development"');

    const child = Bun.spawn(['node', '-e', `console.log(require(${JSON.stringify(outputPath)}).handler())`], {
      env: { ...Bun.env, NODE_ENV: 'production' },
      stderr: 'pipe',
      stdout: 'pipe'
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited
    ]);
    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('production');
  } finally {
    await rm(outputDirectory, { force: true, recursive: true });
  }
});
