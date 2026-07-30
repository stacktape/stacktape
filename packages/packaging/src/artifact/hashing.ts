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
 * Directories never included when checksumming a project: build output, caches, and VCS metadata.
 * Including them would make every artifact digest depend on unrelated local state.
 */
export const EXCLUDE_FROM_CHECKSUM_GLOBS = [
  'node_modules',
  'test_coverage',
  '.git',
  '.idea',
  '.vscode',
  '.stacktape',
  '.serverless',
  '.next',
  '.open-next',
  '.venv',
  '__pycache__',
  '.pytest_cache',
  '.ruff_cache',
  '.mypy_cache',
  '.gradle',
  '.mvn',
  'dist',
  'build',
  'target'
];
