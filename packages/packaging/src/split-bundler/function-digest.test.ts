import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outputFile } from 'fs-extra';
import { getDirectoryChecksum, mergeHashes } from '../artifact/hashing';
import { getSplitFunctionDigest } from './function-digest';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

const createFunctionPackage = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-split-function-digest-'));
  roots.push(root);
  const distFolderPath = join(root, 'function');
  await Promise.all([
    outputFile(
      join(distFolderPath, 'index.js'),
      'import "/opt/nodejs/chunks/chunk-a.js";\nexport const handler = 1;\n'
    ),
    outputFile(join(distFolderPath, 'chunks', 'chunk-local.js'), 'export const local = 1;\n')
  ]);
  return distFolderPath;
};

describe('split function digest', () => {
  test('changes with the chunk layers and the native layer', async () => {
    const distFolderPath = await createFunctionPackage();
    const digest = (input: Partial<Parameters<typeof getSplitFunctionDigest>[0]> = {}) =>
      getSplitFunctionDigest({
        distFolderPath,
        chunkLayers: [{ layerNumber: 1, contentHash: 'aaaaaaaaaaaa' }],
        nativeLayer: null,
        ...input
      });

    const base = await digest();
    expect(await digest({ chunkLayers: [{ layerNumber: 1, contentHash: 'bbbbbbbbbbbb' }] })).not.toBe(base);
    expect(await digest({ nativeLayer: { layerNumber: 0, contentHash: 'cccccccccccc' } })).not.toBe(base);
  });

  // Windows has no execute bit to change: there the archive reads executable intent from contents, which the digest
  // covers.
  test.skipIf(process.platform === 'win32')('changes when only a package file becomes executable', async () => {
    const distFolderPath = await createFunctionPackage();
    const digest = () =>
      getSplitFunctionDigest({
        distFolderPath,
        chunkLayers: [{ layerNumber: 1, contentHash: 'aaaaaaaaaaaa' }],
        nativeLayer: null
      });

    const base = await digest();
    await chmod(join(distFolderPath, 'chunks', 'chunk-local.js'), 0o755);
    expect(await digest()).not.toBe(base);
  });

  test('does not depend on the order chunk layers are listed in', async () => {
    const distFolderPath = await createFunctionPackage();
    const layers = [
      { layerNumber: 2, contentHash: 'bbbbbbbbbbbb' },
      { layerNumber: 1, contentHash: 'aaaaaaaaaaaa' }
    ];

    expect(await getSplitFunctionDigest({ distFolderPath, chunkLayers: layers, nativeLayer: null })).toBe(
      await getSplitFunctionDigest({ distFolderPath, chunkLayers: layers.toReversed(), nativeLayer: null })
    );
  });

  test('differs from the digest a split function had before Lambda archives had a format', async () => {
    const distFolderPath = await createFunctionPackage();
    // The digest before this format: the directory checksum and the layer parts, nothing about the archive.
    const previousFormula = mergeHashes(
      await getDirectoryChecksum({ absoluteDirectoryPath: distFolderPath }),
      '1:aaaaaaaaaaaa',
      'native:none'
    );

    expect(
      await getSplitFunctionDigest({
        distFolderPath,
        chunkLayers: [{ layerNumber: 1, contentHash: 'aaaaaaaaaaaa' }],
        nativeLayer: null
      })
    ).not.toBe(previousFormula);
  });
});
