import { createHash } from 'node:crypto';
import { hashElement } from 'folder-hash';

/**
 * The digests that decide whether an artifact is rebuilt or re-uploaded.
 *
 * These live with packaging because they define cache identity: changing how a directory checksum
 * or a merged digest is computed invalidates every cached artifact. The CLI keeps its own
 * stack-identity hash (`getGloballyUniqueStackHash`), which is naming, not packaging.
 */

/** Directory content checksum, excluding the given folder globs. */
export const getDirectoryChecksum = async ({
  absoluteDirectoryPath,
  excludeGlobs
}: {
  absoluteDirectoryPath: string;
  excludeGlobs?: string[] | undefined;
}): Promise<string> => {
  const res = await hashElement(absoluteDirectoryPath, {
    encoding: 'hex',
    folders: { exclude: excludeGlobs || [] }
  });
  if (!res) {
    throw new Error(`Failed to calculate a checksum for directory "${absoluteDirectoryPath}".`);
  }
  return res.hash;
};

/** Combine several digests into one, order-sensitively. */
export const mergeHashes = (...hashes: string[]): string => {
  const result = createHash('sha1');
  hashes.forEach((hash) => {
    result.update(hash);
  });
  return result.digest('hex');
};

/**
 * Editor/VCS/Stacktape state that cannot intentionally be an image input. Build outputs, dependencies, and language
 * caches remain included because a custom Dockerfile or buildpack can copy or otherwise consume them.
 */
export const EXCLUDE_FROM_CHECKSUM_GLOBS = ['.git', '.idea', '.vscode', '.stacktape'];
