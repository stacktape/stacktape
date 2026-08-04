import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getBundleDigestFromGlobs } from './digest';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

describe('source-set bundle digest', () => {
  test('is independent of source enumeration order', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'stacktape-source-digest-'));
    temporaryDirectories.push(rootPath);
    await Promise.all([writeFile(join(rootPath, 'alpha.ts'), 'alpha'), writeFile(join(rootPath, 'beta.ts'), 'beta')]);

    const getDigest = (extraFiles: string[]) =>
      getBundleDigestFromGlobs({
        rootPath,
        fileGlobs: [],
        extraFiles,
        rawEntryfilePath: 'alpha.ts'
      });

    expect(await getDigest(['alpha.ts', 'beta.ts'])).toBe(await getDigest(['beta.ts', 'alpha.ts']));
  });
});
