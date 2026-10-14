import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getStaticAssetCachePathPatterns } from './ssr-web-shared';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

// A directory of assets needs a wildcard behaviour; a single file needs an exact one. Order is not asserted here:
// the listing is sorted in code, but a real directory cannot be made to list out of order on demand.
test('directories become wildcard cache behaviours and files stay exact', async () => {
  const assetsDirectory = await mkdtemp(join(tmpdir(), 'stacktape-ssr-assets-'));
  temporaryDirectories.push(assetsDirectory);
  await mkdir(join(assetsDirectory, '_next'));
  await writeFile(join(assetsDirectory, '_next', 'chunk.js'), 'chunk');
  await writeFile(join(assetsDirectory, 'favicon.ico'), 'icon');

  expect((await getStaticAssetCachePathPatterns(assetsDirectory)).sort()).toEqual(['_next/*', 'favicon.ico']);
});
