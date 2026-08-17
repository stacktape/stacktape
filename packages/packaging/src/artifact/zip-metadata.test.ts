import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getZipUncompressedSizeBytes } from './zip-metadata';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { force: true, recursive: true })));
  roots.length = 0;
});

const createStoredZip = ({
  name,
  contents,
  declaredSize = contents.byteLength
}: {
  name: string;
  contents: Buffer;
  declaredSize?: number;
}) => {
  const nameBytes = Buffer.from(name);
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(declaredSize === contents.byteLength ? 0 : 8, 8);
  localHeader.writeUInt32LE(contents.byteLength, 18);
  localHeader.writeUInt32LE(declaredSize, 22);
  localHeader.writeUInt16LE(nameBytes.byteLength, 26);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(declaredSize === contents.byteLength ? 0 : 8, 10);
  centralHeader.writeUInt32LE(contents.byteLength, 20);
  centralHeader.writeUInt32LE(declaredSize, 24);
  centralHeader.writeUInt16LE(nameBytes.byteLength, 28);

  const centralDirectoryOffset = localHeader.byteLength + nameBytes.byteLength + contents.byteLength;
  const centralDirectorySize = centralHeader.byteLength + nameBytes.byteLength;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralDirectorySize, 12);
  end.writeUInt32LE(centralDirectoryOffset, 16);
  return Buffer.concat([localHeader, nameBytes, contents, centralHeader, nameBytes, end]);
};

describe('ZIP metadata', () => {
  test('sums uncompressed entry sizes without extracting files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-zip-metadata-'));
    roots.push(root);
    const zipPath = join(root, 'artifact.zip');
    await writeFile(zipPath, createStoredZip({ name: 'handler.js', contents: Buffer.from('code') }));

    expect(await getZipUncompressedSizeBytes(zipPath)).toBe(4);
  });

  test('reports the declared uncompressed size used by Lambda limits', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-zip-metadata-'));
    roots.push(root);
    const zipPath = join(root, 'artifact.zip');
    await writeFile(
      zipPath,
      createStoredZip({ name: 'large.bin', contents: Buffer.alloc(0), declaredSize: 251 * 1024 * 1024 })
    );

    expect(await getZipUncompressedSizeBytes(zipPath)).toBe(251 * 1024 * 1024);
  });
});
