import { randomUUID } from 'node:crypto';
import { cp, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Copies a container build's bundle folder for one run and returns the copy, which the run mounts. Every build of the
 * workload writes the same bundle folder, before its run starts: a run that mounted the folder itself would load the
 * new build's files, and a previous build started again after a failed rebuild would run the failing bundle. Copies of
 * earlier runs are deleted, except `keep` (the run that still serves).
 */
export const snapshotRunBundle = async ({
  distFolderPath,
  keep
}: {
  distFolderPath: string;
  keep?: string;
}): Promise<string> => {
  const root = `${distFolderPath}-runs`;
  for (const entry of await readdir(root).catch(() => [])) {
    if (join(root, entry) !== keep) await rm(join(root, entry), { recursive: true, force: true });
  }
  const snapshot = join(root, randomUUID().slice(0, 8));
  // Links stay as they are: an absolute host path would not exist in the container.
  await cp(distFolderPath, snapshot, { recursive: true, verbatimSymlinks: true });
  return snapshot;
};
