import type { CopyOptions } from 'fs-extra';
import type { BinaryToTextEncoding } from 'node:crypto';
import { createHash } from 'node:crypto';
import { promises as nodeFs } from 'node:fs';
import os from 'node:os';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  sep as pathSeparator,
  relative,
  resolve as resolvePath,
  sep
} from 'node:path';
import { getAllFilePaths } from 'cup-readdir';
import fastGlob from 'fast-glob';
import fsExtra, { createReadStream, existsSync, outputFile, remove } from 'fs-extra';
import getFolderSizeCb from 'get-folder-size';
import { encode, parse as parseIni } from 'ini';
import walk from 'walk-filtered';
import { getByteSize, wait } from './misc';
import { shortHash } from './short-hash';

const temporaryDirectoryLocation = () => nodeFs.realpath(os.tmpdir());

const { readFile, copy, stat, readdirSync, lstatSync } = fsExtra;

export const getFileExtension = (filePath: string): SupportedFileExt => {
  const ext = extname(filePath).slice(1, filePath.length);
  return ext.split(':')[0] as SupportedFileExt;
};

const getFilePathWithoutExtension = (filePath: string) => {
  return filePath.slice(0, filePath.lastIndexOf('.'));
};

export const getBaseName = (filePath: string) => {
  return basename(filePath);
};

export const getContainingFolderName = (filePath: string) => {
  const unixPathDirname = dirname(transformToUnixPath(filePath));
  const folderName = unixPathDirname.slice(unixPathDirname.lastIndexOf('/') + 1, unixPathDirname.length);
  return folderName === 'java' ? '' : folderName;
};

export const getJavaPackageName = (filePath: string) => {
  const unixPathDirname = getFilePathWithoutExtension(transformToUnixPath(filePath));
  return unixPathDirname
    .slice(unixPathDirname.lastIndexOf('/src/main/java') + 15, unixPathDirname.length)
    .replaceAll('/', '.');
};

export const getFileNameWithoutExtension = (filePath: string) => {
  const baseName = getBaseName(filePath);
  return baseName.slice(0, baseName.lastIndexOf('.'));
};

export const getFolder = (filePath: string) => {
  return dirname(filePath);
};

export const getFileContent = async (filePath: string, encoding = 'utf8') => {
  if (!isAbsolute(filePath)) {
    throw new Error(`Filepath ${filePath} must be absolute.`);
  }
  return readFile(filePath, { encoding: encoding as BufferEncoding }).catch((err) => {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw new Error(`Failed to read file at ${filePath}`);
  });
};

export const getIniFileContent = async (filePath: string) => {
  const content = await getFileContent(filePath);
  return content ? parseIni(content) : null;
};

export const adjustIniFileContent = async (
  filePath: string,
  adjustFn: (parsedContent: Record<string, any>) => Record<string, any>
) => {
  const originalContent = await getIniFileContent(filePath);
  return outputFile(filePath, encode(adjustFn(originalContent || {})));
};

export const dynamicRequire = ({ cache = true, filePath }: { filePath: string; cache?: boolean }) => {
  const interpolableFilePath = transformToUnixPath(filePath);
  if (!cache) {
    delete require.cache[require.resolve(interpolableFilePath)];
  }
  // eslint-disable-next-line ts/no-require-imports
  return require(interpolableFilePath);
};

export const dynamicRequireLibraryFromUserNodeModules = ({
  libraryName,
  searchFrom
}: {
  libraryName: string;
  searchFrom: string;
}) => {
  const libPath = require.resolve(libraryName, { paths: [searchFrom] });
  return dynamicRequire({ filePath: libPath });
};

export const dirExists = (directory: string) => {
  try {
    return lstatSync(directory).isDirectory();
  } catch {
    return false;
  }
};

export const isFileAccessible = (absoluteFilePath: string) => {
  try {
    return lstatSync(absoluteFilePath).isFile();
  } catch {
    return false;
  }
};

export const isDirAccessible = (absoluteFilePath: string) => {
  try {
    return lstatSync(absoluteFilePath).isDirectory();
  } catch {
    return false;
  }
};

export const transformToUnixPath = (filePath: string) => {
  return filePath.replace(/\\/g, '/');
};

export const getMatchingFilesByGlob = async ({ globPattern, cwd }: { globPattern: string | string[]; cwd: string }) => {
  return fastGlob(globPattern, { dot: true, cwd });
};

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
        hash.update(chunk as any);
      })
      .on('error', (err: any) => {
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

export const getAllFilesInDir = async (dirPath: string, relativeOutput = true) => {
  const res: string[] = await getAllFilePaths(dirPath);
  const dirPathWithoutTrailingSlash = dirPath.endsWith('/') || dirPath.endsWith('\\') ? dirPath.slice(0, -1) : dirPath;
  if (relativeOutput) {
    return res.map((filePath) => filePath.slice(dirPathWithoutTrailingSlash.length + 1));
  }
  return res;
};

export const getHashFromMultipleFiles = async (files: string[]) => {
  // const matchingFiles = await fastGlob(globPattern, { dot: true });
  const fileContents = await Promise.all(files.map((filePath) => getFileContent(filePath)));
  const hash = createHash('sha1');
  fileContents.forEach((c) => {
    if (c) {
      hash.update(c);
    }
  });
  return hash;
};

export const getFolderSize = (folderPath: string, unit: 'MB' | 'KB', decimals = 2): Promise<number> => {
  return new Promise((resolve, reject) => {
    getFolderSizeCb(folderPath, (err: Error, size) => {
      if (err) {
        reject(err);
      }
      let res: number;
      if (unit === 'MB') {
        res = size / 1024 / 1024;
      } else {
        res = size / 1024;
      }
      resolve(Number(res.toFixed(decimals)));
    });
  });
};

export const getFileSize = async (filePath: string, unit: 'MB' | 'KB', decimals = 2): Promise<number> => {
  const { size } = await stat(filePath);
  return getByteSize(size, unit, decimals);
};

const getDirectoryContent = ({
  absoluteDirectory,
  relativeDirectory
}: {
  relativeDirectory?: string;
  absoluteDirectory?: string;
}): { entryNameWithoutExt: string; path: string; entryName: string }[] => {
  const directory = absoluteDirectory || join(__dirname, relativeDirectory);
  return readdirSync(directory).map((entry) => {
    const baseEntryName = basename(entry);
    return {
      entryNameWithoutExt: baseEntryName.includes('.')
        ? baseEntryName.slice(0, baseEntryName.lastIndexOf('.'))
        : baseEntryName,
      path: join(directory, entry),
      entryName: entry
    };
  });
};

const retryableCopy = (from: string, to: string, opts: CopyOptions = {}, attempts = 0) => {
  return copy(from, to, opts).catch(async (err) => {
    if (err.code === 'EBUSY') {
      if (attempts >= 5) {
        throw new Error(`Can't copy from ${from} to ${to}. Tried 5 times`);
      }
      await wait((attempts + 1) ** 1.3 * 50);

      return retryableCopy(from, to, opts, attempts++);
    }
  });
};

const copyUsingTempDir = async (from: string, to: string, opts: CopyOptions = {}, deleteTempFolder = true) => {
  const tempDirPath = join(await temporaryDirectoryLocation(), shortHash(to));
  await remove(tempDirPath);
  await copy(from, tempDirPath, opts);
  await copy(tempDirPath, to, opts);
  if (deleteTempFolder) {
    await remove(tempDirPath);
  }
};

const getAllFilesWithExtension = async (folder: string, extension: string) => {
  const res = [];
  await walk(folder, (file) => {
    if (file.fullPath.endsWith(extension)) {
      res.push(file.fullPath);
    }
  });
  return res;
};

export const getPathRelativeTo = (filePath: string, relativeTo: string): string => {
  const cwdArray: string[] = relativeTo.split(pathSeparator);
  return Object.entries(filePath.split(pathSeparator))
    .reduce(
      (cleanFileName: string, fileNamePart) =>
        fileNamePart[1] !== cwdArray[fileNamePart[0]]
          ? (cleanFileName += pathSeparator + fileNamePart[1])
          : cleanFileName,
      ''
    )
    .substring(1);
};

export const getRelativePath = (itemPath: string) => {
  return relative(process.cwd(), itemPath);
};

const isPathInside = (childPath, parentPath) => {
  const relation = relative(parentPath, childPath);

  return Boolean(
    relation && relation !== '..' && !relation.startsWith(`..${sep}`) && relation !== resolvePath(childPath)
  );
};

export const getFirstExistingPath = (paths: string[]) => {
  for (const path of paths) {
    if (existsSync(path)) {
      return path;
    }
  }
};

const arrayToCsv = (items: Record<string, any>): string => {
  const array = typeof items !== 'object' ? JSON.parse(items) : items;
  const str =
    `${Object.keys(array[0])
      .map((value) => `"${value}"`)

      .join(',')}` + '\r\n';

  return array.reduce((str, next) => {
    str +=
      `${Object.values(next)
        .map((value) => `"${value}"`)

        .join(',')}` + '\r\n';
    return str;
  }, str);
};

export const deleteDirectoryContent = async (dirPath: string) => {
  return readdirSync(dirPath).map((entry) => remove(join(dirPath, entry)));
};
