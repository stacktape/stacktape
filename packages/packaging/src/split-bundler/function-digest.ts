import { getArchiveLayoutDigest, listArchiveEntries } from '../artifact/archive-entries';
import { getArchiveInventoryChecksum, mergeHashes } from '../artifact/hashing';

/**
 * The cache identity of one split-bundled function's ZIP: every file of its final package directory, the chunk layers
 * its imports point into, the native dependency layer it loads, and the archive layout it is zipped with.
 *
 * The CLI reuses a deployed function artifact exactly when this digest matches, and the offline packaging harness
 * measures with the same function, so the two cannot drift apart.
 */
export const getSplitFunctionDigest = async ({
  distFolderPath,
  chunkLayers,
  nativeLayer
}: {
  distFolderPath: string;
  /** Chunk layers the function imports from. Their content hashes decide its import paths. */
  chunkLayers: { layerNumber: number; contentHash: string | undefined }[];
  nativeLayer: { layerNumber: number; contentHash: string } | null;
}): Promise<string> => {
  const { entries } = await listArchiveEntries({ sourcePath: distFolderPath });
  const bundleDirectoryHash = await getArchiveInventoryChecksum(entries);
  const chunkLayerPart = chunkLayers.length
    ? chunkLayers
        .toSorted((left, right) => left.layerNumber - right.layerNumber)
        .map(({ layerNumber, contentHash }) => `${layerNumber}:${contentHash || 'unknown'}`)
        .join(',')
    : 'none';
  const nativeLayerPart = nativeLayer ? `native:${nativeLayer.layerNumber}:${nativeLayer.contentHash}` : 'native:none';
  return mergeHashes(bundleDirectoryHash, chunkLayerPart, nativeLayerPart, getArchiveLayoutDigest(entries));
};
