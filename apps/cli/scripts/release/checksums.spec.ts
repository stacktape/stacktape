import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyReleaseChecksums } from '../build-npm';
import { parseReleaseChecksums } from './checksums';

const tempDirectories: string[] = [];

const createTempDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-release-checksums-'));
  tempDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(tempDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
  tempDirectories.length = 0;
});

describe('release checksums', () => {
  test('rejects malformed and duplicate manifest entries', () => {
    const checksum = 'a'.repeat(64);
    expect(() => parseReleaseChecksums(`${checksum} linux.tar.gz\n`)).toThrow('Invalid release checksum line');
    expect(() => parseReleaseChecksums(`${checksum}  linux.tar.gz\n${checksum}  linux.tar.gz\n`)).toThrow(
      'Duplicate release checksum entry'
    );
  });

  test('requires and copies the manifest for a release npm build', async () => {
    const directory = await createTempDirectory();
    const sourcePath = join(directory, 'missing', 'SHA256SUMS');
    const destinationPath = join(directory, 'package', 'SHA256SUMS');

    await expect(copyReleaseChecksums({ required: true, sourcePath, destinationPath })).rejects.toThrow(
      'Release build requires'
    );

    await mkdir(join(directory, 'missing'), { recursive: true });
    await writeFile(sourcePath, `${'a'.repeat(64)}  linux.tar.gz\n`);
    await copyReleaseChecksums({ required: true, sourcePath, destinationPath });
    expect(await readFile(destinationPath, 'utf8')).toBe(`${'a'.repeat(64)}  linux.tar.gz\n`);
  });
});
