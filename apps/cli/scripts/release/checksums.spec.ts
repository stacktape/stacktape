import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyReleaseChecksums } from '../build-npm';
import { generateReleaseChecksums, parseReleaseChecksums, verifyReleaseChecksum } from './checksums';

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
  test('generates a deterministic manifest for every release archive', async () => {
    const directory = await createTempDirectory();
    await writeFile(join(directory, 'windows.zip'), 'windows release');
    await writeFile(join(directory, 'linux.tar.gz'), 'linux release');
    await writeFile(join(directory, 'ignored.txt'), 'not a release archive');

    const manifestPath = await generateReleaseChecksums({ directory });
    const content = await readFile(manifestPath, 'utf8');
    const checksums = parseReleaseChecksums(content);

    expect([...checksums.keys()]).toEqual(['linux.tar.gz', 'windows.zip']);
    expect([...checksums.values()].every((checksum) => /^[a-f0-9]{64}$/.test(checksum))).toBe(true);
    await expect(
      verifyReleaseChecksum({ filePath: join(directory, 'linux.tar.gz'), manifestPath })
    ).resolves.toBeUndefined();
  });

  test('rejects a modified archive', async () => {
    const directory = await createTempDirectory();
    const archivePath = join(directory, 'linux.tar.gz');
    await writeFile(archivePath, 'original release');
    const manifestPath = await generateReleaseChecksums({ directory });

    await writeFile(archivePath, 'tampered release');

    await expect(verifyReleaseChecksum({ filePath: archivePath, manifestPath })).rejects.toThrow(
      'Release checksum mismatch'
    );
  });

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
