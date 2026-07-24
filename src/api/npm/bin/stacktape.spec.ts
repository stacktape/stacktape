import { afterEach, describe, expect, test } from 'bun:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { calculateFileSha256, parseChecksumManifest, verifyFileChecksum } = require('./stacktape.js') as {
  calculateFileSha256: (filePath: string) => Promise<string>;
  parseChecksumManifest: (content: string) => Map<string, string>;
  verifyFileChecksum: (params: { filePath: string; fileName: string; manifestPath: string }) => Promise<void>;
};

const tempDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
  tempDirectories.length = 0;
});

describe('npm binary launcher checksum verification', () => {
  test('accepts only an archive whose integrity matches the packaged manifest', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-launcher-checksum-'));
    tempDirectories.push(directory);
    const archivePath = join(directory, 'linux.tar.gz');
    const manifestPath = join(directory, 'SHA256SUMS');
    await writeFile(archivePath, 'expected archive bytes');
    const checksum = await calculateFileSha256(archivePath);
    await writeFile(manifestPath, `${checksum}  linux.tar.gz\n`);

    await expect(
      verifyFileChecksum({ filePath: archivePath, fileName: 'linux.tar.gz', manifestPath })
    ).resolves.toBeUndefined();

    await writeFile(archivePath, 'modified after publication');
    await expect(verifyFileChecksum({ filePath: archivePath, fileName: 'linux.tar.gz', manifestPath })).rejects.toThrow(
      'Checksum verification failed'
    );
  });

  test('rejects missing, malformed, and duplicate entries', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-launcher-checksum-'));
    tempDirectories.push(directory);
    const archivePath = join(directory, 'linux.tar.gz');
    const manifestPath = join(directory, 'SHA256SUMS');
    await writeFile(archivePath, 'archive');

    await expect(verifyFileChecksum({ filePath: archivePath, fileName: 'linux.tar.gz', manifestPath })).rejects.toThrow(
      'missing SHA256SUMS'
    );

    expect(() => parseChecksumManifest(`${'a'.repeat(64)} linux.tar.gz\n`)).toThrow('Invalid release checksum line');
    expect(() => parseChecksumManifest(`${'a'.repeat(64)}  linux.tar.gz\n${'b'.repeat(64)}  linux.tar.gz\n`)).toThrow(
      'Duplicate release checksum entry'
    );
  });
});
