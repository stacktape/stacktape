import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
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

    const execution = spawnSync(process.env.npm_node_execpath || 'node', [outputPath], {
      encoding: 'utf8',
      timeout: 10_000
    });
    expect(execution.status, execution.stderr).toBe(0);
    expect(execution.stdout.trim()).toBe('virtual entry works');
  } finally {
    await rm(outputDirectory, { force: true, recursive: true });
  }
});
