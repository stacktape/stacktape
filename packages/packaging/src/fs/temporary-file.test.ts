import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTemporaryBuildFile } from './temporary-file';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

describe('temporary build files', () => {
  test('creates unique exclusively owned files without replacing a conventional customer filename', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-build-files-'));
    temporaryDirectories.push(root);
    const sourceDirectory = join(root, 'service');
    await mkdir(sourceDirectory);
    const customerFilePath = join(sourceDirectory, 'stp-config.json');
    await writeFile(customerFilePath, 'customer-owned');

    const created = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        createTemporaryBuildFile({
          contents: `generated-${index}`,
          directoryPath: sourceDirectory,
          prefix: 'stp-config-',
          suffix: '.json'
        })
      )
    );

    expect(new Set(created.map(({ fileName }) => fileName)).size).toBe(5);
    expect(await readFile(customerFilePath, 'utf8')).toBe('customer-owned');
    await Promise.all(
      created.map(async ({ filePath }, index) => expect(await readFile(filePath, 'utf8')).toBe(`generated-${index}`))
    );
  });
});
