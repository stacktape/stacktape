import type { Hash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { ExpectedError } from '@utils/errors';

const CARRIAGE_RETURN = 0x0d;
const LINE_FEED = 0x0a;

/** Git can check text files out with CRLF on Windows. The same file must hash the same on a laptop and in CI. */
const withUnixLineEndings = (content: Buffer) =>
  content.includes('\r\n')
    ? content.filter((byte, index) => !(byte === CARRIAGE_RETURN && content[index + 1] === LINE_FEED))
    : content;

const projectPath = (root: string, file: string) => relative(root, file).split(sep).join('/');

const hashFile = async (name: string, file: string, hash: Hash) => {
  // Separators, so moving a byte from one file's name or content to the next changes the result.
  hash.update(`${name}\0`);
  hash.update(withUnixLineEndings(await readFile(file)));
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
    await hashFile(projectPath(root, absolute), absolute, hash);
    return;
  }
  const entries = await readdir(absolute, { recursive: true, withFileTypes: true });
  // Sorted by the project-relative name: the platform's separator would order the same files differently on Windows.
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const file = join(entry.parentPath, entry.name);
      return { name: projectPath(root, file), file };
    })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const { name, file } of files) await hashFile(name, file, hash);
};
