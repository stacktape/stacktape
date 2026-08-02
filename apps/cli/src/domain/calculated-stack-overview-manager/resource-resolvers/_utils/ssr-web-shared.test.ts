import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getStaticAssetCachePathPatterns } from './ssr-web-shared';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

describe('SSR static asset cache paths', () => {
  test('uses one stable lexical order for files and directories', async () => {
    const assetsDirectory = await mkdtemp(join(tmpdir(), 'stacktape-ssr-assets-'));
    temporaryDirectories.push(assetsDirectory);
    await writeFile(join(assetsDirectory, 'z-runtime.js'), 'runtime');
    await mkdir(join(assetsDirectory, 'a-assets'));
    await writeFile(join(assetsDirectory, 'm-styles.css'), 'styles');

    expect(await getStaticAssetCachePathPatterns(assetsDirectory)).toEqual([
      'a-assets/*',
      'm-styles.css',
      'z-runtime.js'
    ]);
  });
});
