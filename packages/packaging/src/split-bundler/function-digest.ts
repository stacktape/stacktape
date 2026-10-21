import { getArchiveLayoutDigest, listArchiveEntries } from '../artifact/archive-entries';
import { getArchiveInventoryChecksum, mergeHashes } from '../artifact/hashing';

/**
 * The cache identity of one split-bundled function's ZIP: every file of its final package directory, the source maps
 * kept outside it and the archive layout it is zipped with. Layer identities belong to the runtime/release digest,
 * not the function ZIP: changing shared code must not upload byte-identical function packages again.
 *
 * The CLI reuses a deployed function artifact exactly when this digest matches, and the offline packaging harness
 * measures with the same function, so the two cannot drift apart.
 */
export const getSplitFunctionDigest = async ({
  distFolderPath,
  sourceMapsSha256
}: {
  distFolderPath: string;
  /** The hash of the function's source-map bundle when its maps are kept outside the package. */
  sourceMapsSha256?: string | undefined;
}): Promise<string> => {
  const { entries } = await listArchiveEntries({ sourcePath: distFolderPath });
  const bundleDirectoryHash = await getArchiveInventoryChecksum(entries);
  return mergeHashes(
    bundleDirectoryHash,
    getArchiveLayoutDigest(entries),
    ...(sourceMapsSha256 ? [`source-maps:${sourceMapsSha256}`] : [])
  );
};
