import type { BinaryToTextEncoding } from 'node:crypto';
import { createHash } from 'node:crypto';
import { basename, dirname, extname, relative } from 'node:path';
import { getAllFilePaths } from 'cup-readdir';
import fastGlob from 'fast-glob';
import fsExtra, { createReadStream } from 'fs-extra';
import getFolderSizeCb from 'get-folder-size';

const { readFile, stat } = fsExtra;

/**
 * File selection, sizing, and content hashing for deployment artifacts.
 *
 * These are packaging semantics, not generic filesystem helpers: which files a glob selects, how a
 * file's bytes turn into a digest, and how a folder's size is reported all feed artifact contents,
 * cache keys, and size limits. The CLI keeps its own generic path/IO helpers in
 * `apps/cli/src/utils/fs-utils.ts`; the few application call sites that need *these* semantics import this
 * module so there is one definition of each.
 */

/** Files matching `globPattern` under `cwd`, dotfiles included. Order comes from fast-glob. */
export const getMatchingFilesByGlob = async ({
  globPattern,
  cwd
}: {
  globPattern: string | string[];
  cwd: string;
}): Promise<string[]> => fastGlob(globPattern, { dot: true, cwd });

/** Streamed content hash of a single file. A missing file hashes to the empty string. */
export const getFileHash = async (
  filePath: string,
  algorithm = 'sha1',
  encoding = 'hex' as BinaryToTextEncoding
): Promise<string> => {
  const hash = createHash(algorithm);
  const stream = createReadStream(filePath);
  return new Promise((resolve, reject) => {
    stream
      .on('data', (chunk) => {
        hash.update(chunk as Buffer);
      })
      .on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
          return resolve('');
        }
        reject(new Error(`Failed to stream file at ${filePath}`));
      })
      .on('end', () => {
        return resolve(hash.digest(encoding));
      });
  });
};

/** Every file below `dirPath`, relative to it unless `relativeOutput` is false. */
export const getAllFilesInDir = async (dirPath: string, relativeOutput = true): Promise<string[]> => {
  const res: string[] = await getAllFilePaths(dirPath);
  const dirPathWithoutTrailingSlash = dirPath.endsWith('/') || dirPath.endsWith('\\') ? dirPath.slice(0, -1) : dirPath;
  if (relativeOutput) {
    return res.map((filePath) => filePath.slice(dirPathWithoutTrailingSlash.length + 1));
  }
  return res;
};

/**
 * Running sha1 over the contents of every readable file, in the order given. Returned undigested so
 * callers can mix in further inputs (dependency sets, language config, entry file paths).
 */
export const getHashFromMultipleFiles = async (files: string[]) => {
  const fileContents = await Promise.all(files.map((filePath) => readFileOrNull(filePath)));
  const hash = createHash('sha1');
  fileContents.forEach((c) => {
    if (c) {
      hash.update(c);
    }
  });
  return hash;
};

const readFileOrNull = async (filePath: string) =>
  readFile(filePath, { encoding: 'utf8' }).catch((err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw new Error(`Failed to read file at ${filePath}`);
  });

export const getFolderSize = (folderPath: string, unit: 'MB' | 'KB', decimals = 2): Promise<number> =>
  new Promise((resolve, reject) => {
    getFolderSizeCb(folderPath, (err: Error | null, size: number) => {
      if (err) {
        reject(err);
        return;
      }
      const res = unit === 'MB' ? size / 1024 / 1024 : size / 1024;
      resolve(Number(res.toFixed(decimals)));
    });
  });

export const getFileSize = async (filePath: string, unit: 'MB' | 'KB', decimals = 2): Promise<number> => {
  const { size } = await stat(filePath);
  const res = unit === 'MB' ? size / 1024 / 1024 : size / 1024;
  return Number(res.toFixed(decimals));
};

/** The first path in `paths` that exists, or `undefined`. Used to locate optional project files. */
export const getFirstExistingPath = (paths: string[]): string | undefined => {
  for (const path of paths) {
    if (fsExtra.existsSync(path)) {
      return path;
    }
  }
  return undefined;
};

/** Dotted Java package name derived from a source file's `src/main/java` position. */
export const getJavaPackageName = (filePath: string): string => {
  const unixPath = filePath.replace(/\\/g, '/');
  const withoutExtension = unixPath.slice(0, unixPath.lastIndexOf('.'));
  return withoutExtension.slice(withoutExtension.lastIndexOf('/src/main/java') + 15).replaceAll('/', '.');
};

export const getBaseName = basename;
export const getFileExtension = (filePath: string): string => extname(filePath).slice(1);
export const getFolder = dirname;
export const getPathRelativeTo = (filePath: string, relativeTo: string): string => relative(relativeTo, filePath);
export const getRelativePath = (filePath: string): string => relative(process.cwd(), filePath);
export const transformToUnixPath = (filePath: string): string => filePath.replaceAll('\\', '/');

export const isFileAccessible = (filePath: string): boolean => {
  try {
    return fsExtra.lstatSync(filePath).isFile();
  } catch {
    return false;
  }
};

export const isDirAccessible = (filePath: string): boolean => {
  try {
    return fsExtra.lstatSync(filePath).isDirectory();
  } catch {
    return false;
  }
};

export const dirExists = (filePath: string): boolean => {
  try {
    return fsExtra.lstatSync(filePath).isDirectory();
  } catch {
    return false;
  }
};
