import type { Hash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { ExpectedError } from '@utils/errors';

const hashFile = async (root: string, file: string, hash: Hash) => {
  // Separators, so moving a byte from one file's name or content to the next changes the result.
  hash.update(`${relative(root, file).split('\\').join('/')}\0`);
  hash.update(await readFile(file));
  hash.update('\0');
};

/** Adds the names and contents of a file or a directory's files to `hash`, so a deleted or renamed file changes it. */
export const hashReleasePath = async ({ root, path, hash }: { root: string; path: string; hash: Hash }) => {
  const absolute = resolve(root, path);
  const info = await stat(absolute).catch(() => undefined);
  if (!info) {
    throw new ExpectedError('CONFIG_VALIDATION', `The \`runWhenChanged\` path \`${path}\` does not exist.`, [
      'Paths are relative to the project root. Fix the path, or remove `runWhenChanged` to run the command on each image change.'
    ]);
  }
  if (info.isFile()) {
    await hashFile(root, absolute, hash);
    return;
  }
  const entries = await readdir(absolute, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
  for (const file of files) await hashFile(root, file, hash);
};
