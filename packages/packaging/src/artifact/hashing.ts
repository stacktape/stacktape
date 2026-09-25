import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { hashElement } from 'folder-hash';
import { type ArchiveEntry, withFileDescriptor } from './archive-entries';

/**
 * The digests that decide whether an artifact is rebuilt or re-uploaded.
 *
 * These live with packaging because they define cache identity: changing how a directory checksum
 * or a merged digest is computed invalidates every cached artifact. The CLI keeps its own
 * stack-identity hash (`getGloballyUniqueStackHash`), which is naming, not packaging.
 */

/**
 * Names the inventory `getArchiveInventoryChecksum` hashes. Every consumer feeds that checksum into a further digest,
 * so a new name makes every artifact built from it a new cache entry. Change it whenever the inventory can describe the
 * same tree differently.
 */
export const ARCHIVE_INVENTORY_FORMAT = 'stacktape-archive-inventory-1';

/** SHA-256 of a file's bytes, streamed, holding one of the descriptors `listArchiveEntries` bounds. */
const hashFileContents = (path: string) =>
  withFileDescriptor(
    () =>
      new Promise<string>((resolve, reject) => {
        const hash = createHash('sha256');
        createReadStream(path)
          .on('error', reject)
          .on('data', (chunk) => hash.update(chunk))
          .on('end', () => resolve(hash.digest('hex')));
      })
  );

/**
 * The checksum of what an archive of these entries holds: every entry's kind, archive-relative path and normalized mode,
 * each file's bytes and each link's stored target, in the entries' code-unit order under a versioned header, one JSON
 * record per entry. It never depends on the directory's name or location, the locale, or mtimes, and it describes
 * exactly what `listArchiveEntries` gives the archiver.
 */
export const getArchiveInventoryChecksum = async (entries: ArchiveEntry[]): Promise<string> => {
  const contents = await Promise.all(
    entries.map((entry) => (entry.type === 'file' ? hashFileContents(entry.sourcePath) : null))
  );
  const hash = createHash('sha256');
  hash.update(`${ARCHIVE_INVENTORY_FORMAT}\n`);
  entries.forEach((entry, index) => {
    const record =
      entry.type === 'file'
        ? [entry.type, entry.path, entry.mode, contents[index]]
        : entry.type === 'symlink'
          ? [entry.type, entry.path, entry.mode, entry.target]
          : [entry.type, entry.path, entry.mode];
    // JSON escapes line breaks, so no path or target can fake a record boundary.
    hash.update(`${JSON.stringify(record)}\n`);
  });
  return hash.digest('hex');
};

/**
 * The earlier directory checksum (`folder-hash`): it hashes the root's name, orders by locale and follows links. Lambda
 * archives use `getArchiveInventoryChecksum` instead. It stays for container image build contexts, whose Docker
 * semantics (host modes, any link) the archive inventory does not describe, and for the CLI acceptance's reproduction of
 * keys an older CLI left behind.
 */
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
