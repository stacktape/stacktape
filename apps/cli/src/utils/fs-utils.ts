import type { SupportedFileExt } from '@utils/file-types';
import { createRequire } from 'node:module';
import { basename, dirname, extname, isAbsolute, join, sep as pathSeparator, relative } from 'node:path';
import fsExtra, { outputFile, remove } from 'fs-extra';
import { encode, parse as parseIni } from 'ini';

const { readFile, readdirSync, lstatSync } = fsExtra;

export const getFileExtension = (filePath: string): SupportedFileExt => {
  const ext = extname(filePath).slice(1, filePath.length);
  return ext.split(':')[0] as SupportedFileExt;
};

export const getBaseName = (filePath: string) => {
  return basename(filePath);
};

export const getContainingFolderName = (filePath: string) => {
  const unixPathDirname = dirname(transformToUnixPath(filePath));
  const folderName = unixPathDirname.slice(unixPathDirname.lastIndexOf('/') + 1, unixPathDirname.length);
  return folderName === 'java' ? '' : folderName;
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
  const requireFromFile = createRequire(interpolableFilePath);
  if (!cache) {
    delete requireFromFile.cache[requireFromFile.resolve(interpolableFilePath)];
  }
  return requireFromFile(interpolableFilePath);
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

export const deleteDirectoryContent = async (dirPath: string) => {
  return readdirSync(dirPath).map((entry) => remove(join(dirPath, entry)));
};
