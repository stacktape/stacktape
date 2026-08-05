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
