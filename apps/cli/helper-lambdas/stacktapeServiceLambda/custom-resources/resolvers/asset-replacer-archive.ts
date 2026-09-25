import type { ArchiveEntry } from '@stacktape/packaging/artifact/archive-entries';
import type { Readable } from 'node:stream';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, symlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import {
  ARCHIVE_DIRECTORY_MODE,
  ARCHIVE_EXECUTABLE_FILE_MODE,
  ARCHIVE_FILE_MODE,
  listArchiveEntries
} from '@stacktape/packaging/artifact/archive-entries';
import yauzl from 'yauzl';

/** The parts of a yauzl entry this module reads. */
type ZipEntry = {
  fileName: string;
  versionMadeBy: number;
  externalFileAttributes: number;
  generalPurposeBitFlag: number;
  uncompressedSize: number;
};

type ZipFile = {
  readEntry: () => void;
  openReadStream: (entry: ZipEntry, callback: (error: Error | null, stream?: Readable) => void) => void;
  close: () => void;
  on: ((event: 'entry', listener: (entry: ZipEntry) => void) => void) &
    ((event: 'end', listener: () => void) => void) &
    ((event: 'error', listener: (error: Error) => void) => void);
};

type PlannedEntry =
  | { kind: 'directory'; path: string }
  | { kind: 'file'; path: string; entry: ZipEntry; executable: boolean }
  | { kind: 'symlink'; path: string; target: string };

const MADE_ON_UNIX = 3;
const FILE_TYPE_MASK = 0o170000;
const DIRECTORY_TYPE = 0o040000;
const REGULAR_FILE_TYPE = 0o100000;
const SYMLINK_TYPE = 0o120000;
const MAX_LINK_TARGET_BYTES = 4096;

const openZip = (zipPath: string) =>
  new Promise<ZipFile>((resolve, reject) => {
    // Strict names: yauzl itself rejects absolute paths, `..` components and backslashes.
    yauzl.open(
      zipPath,
      { lazyEntries: true, autoClose: false, strictFileNames: true, validateEntrySizes: true },
      (error: Error | null, zipFile?: ZipFile) =>
        error || !zipFile ? reject(error ?? new Error('Cannot open the ZIP.')) : resolve(zipFile)
    );
  });

const readEntries = (zipFile: ZipFile) =>
  new Promise<ZipEntry[]>((resolve, reject) => {
    const entries: ZipEntry[] = [];
    zipFile.on('entry', (entry) => {
      entries.push(entry);
      zipFile.readEntry();
    });
    zipFile.on('end', () => resolve(entries));
    zipFile.on('error', reject);
    zipFile.readEntry();
  });

const openEntry = (zipFile: ZipFile, entry: ZipEntry) =>
  new Promise<Readable>((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) =>
      error || !stream ? reject(error ?? new Error(`Cannot read ${entry.fileName}.`)) : resolve(stream)
    );
  });

const readSmallEntry = async (zipFile: ZipFile, entry: ZipEntry) => {
  const chunks: Buffer[] = [];
  for await (const chunk of await openEntry(zipFile, entry)) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
};

const REFUSAL = 'Cannot extract the function package:';
const refuse = (message: string) => new Error(`${REFUSAL} ${message}`);

/** The entry's path without a directory's trailing slash, refused unless it is a plain relative path. */
const pathOf = (fileName: string) => {
  const path = fileName.endsWith('/') ? fileName.slice(0, -1) : fileName;
  const components = path.split('/');
  if (
    !path ||
    path.includes('\\') ||
    path.includes('\0') ||
    components.some((part) => ['', '.', '..'].includes(part))
  ) {
    throw refuse(`the entry name ${JSON.stringify(fileName)} is not a plain relative path.`);
  }
  return path;
};

/** What an entry is, from its Unix mode when the ZIP was made on Unix, otherwise from its name. */
const planEntry = async (zipFile: ZipFile, entry: ZipEntry): Promise<PlannedEntry> => {
  const path = pathOf(entry.fileName);
  if (entry.generalPurposeBitFlag & 0x1) {
    throw refuse(`${path} is encrypted.`);
  }
  const unixMode = entry.versionMadeBy >> 8 === MADE_ON_UNIX ? (entry.externalFileAttributes >>> 16) & 0xffff : 0;
  const type = unixMode & FILE_TYPE_MASK;
  const namedAsDirectory = entry.fileName.endsWith('/');
  if (type === SYMLINK_TYPE && !namedAsDirectory) {
    if (entry.uncompressedSize > MAX_LINK_TARGET_BYTES) {
      throw refuse(`the link ${path} has a target longer than ${MAX_LINK_TARGET_BYTES} bytes.`);
    }
    const bytes = await readSmallEntry(zipFile, entry);
    const target = bytes.toString('utf8');
    if (!Buffer.from(target, 'utf8').equals(bytes) || !target || target.includes('\0') || target.includes('\\')) {
      throw refuse(`the link ${path} has an unusable target.`);
    }
    if (target.startsWith('/')) {
      throw refuse(`the link ${path} points to an absolute path.`);
    }
    return { kind: 'symlink', path, target };
  }
  if ((type === DIRECTORY_TYPE || type === 0) && namedAsDirectory) {
    return { kind: 'directory', path };
  }
  if ((type === REGULAR_FILE_TYPE || type === 0) && !namedAsDirectory) {
    return { kind: 'file', path, entry, executable: (unixMode & 0o111) !== 0 };
  }
  throw refuse(`${path} is not a directory, a regular file or a symbolic link.`);
};

/** Refuses repeated paths and entries below a file or a link, which would make extraction write through them. */
const checkLayout = (planned: PlannedEntry[]) => {
  const kinds = new Map<string, PlannedEntry['kind']>();
  for (const { path, kind } of planned) {
    if (kinds.has(path)) throw refuse(`${path} appears more than once.`);
    kinds.set(path, kind);
  }
  for (const { path } of planned) {
    const parts = path.split('/');
    for (let length = 1; length < parts.length; length++) {
      const ancestor = parts.slice(0, length).join('/');
      const kind = kinds.get(ancestor);
      if (kind && kind !== 'directory') throw refuse(`${path} lies below ${ancestor}, which is not a directory.`);
    }
  }
};

/**
 * Extracts a Lambda function ZIP into `targetPath`, which must not exist yet, without letting the ZIP decide where
 * anything is written, and returns the tree's entries as the Lambda archive policy lists them.
 *
 * Every entry is read and checked before anything is written: each must be a directory, regular file or symbolic link
 * with a plain relative name, no path may repeat, and nothing may lie below a file or a link. A link's target must be
 * relative. Directories and files are written first, a file as 0755 when the ZIP marks any execute bit and as 0644
 * otherwise, and links last, so no write can go through one. The policy's listing then refuses links that leave the
 * tree, dangle or loop, before anything else reads or writes through them.
 */
export const extractFunctionArchive = async ({
  zipPath,
  targetPath
}: {
  zipPath: string;
  targetPath: string;
}): Promise<ArchiveEntry[]> => {
  const zipFile = await openZip(zipPath).catch((error: Error) => {
    throw refuse(`it is not a readable ZIP (${error.message}).`);
  });
  try {
    const planned: PlannedEntry[] = [];
    for (const entry of await readEntries(zipFile)) {
      planned.push(await planEntry(zipFile, entry));
    }
    checkLayout(planned);

    await mkdir(targetPath);
    for (const item of planned) {
      const path = join(targetPath, item.path);
      if (item.kind === 'directory') {
        await mkdir(path, { recursive: true });
        await chmod(path, ARCHIVE_DIRECTORY_MODE);
      } else if (item.kind === 'file') {
        const mode = item.executable ? ARCHIVE_EXECUTABLE_FILE_MODE : ARCHIVE_FILE_MODE;
        await mkdir(dirname(path), { recursive: true });
        // `wx` never replaces or follows an existing path.
        await pipeline(await openEntry(zipFile, item.entry), createWriteStream(path, { flags: 'wx', mode }));
        await chmod(path, mode);
      }
    }
    for (const item of planned) {
      if (item.kind === 'symlink') {
        const path = join(targetPath, item.path);
        await mkdir(dirname(path), { recursive: true });
        await symlink(item.target, path);
      }
    }
  } catch (error) {
    // The ZIP reader's own errors, such as an invalid entry name or size, are refusals too.
    throw error instanceof Error && !error.message.startsWith(REFUSAL) ? refuse(error.message) : error;
  } finally {
    zipFile.close();
  }
  return (await listArchiveEntries({ sourcePath: targetPath })).entries;
};
