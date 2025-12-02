// @note from https://github.com/nfriedly/node-bestzip
import { createReadStream, createWriteStream } from 'node:fs';
import { basename, join } from 'node:path';
import archiver from 'archiver';
import { createFile, rename } from 'fs-extra';
import * as tar from 'tar';
import { getFileNameWithoutExtension, getFolder, isDirAccessible } from './fs-utils';

// @todo introduce this back
// const nativeZip = ({ absoluteSourcePath, outputPath }: { absoluteSourcePath: string; outputPath: string }) => {
//   const lastSlashIndex = absoluteSourcePath.lastIndexOf(sep);
//   const cwd = absoluteSourcePath.slice(0, lastSlashIndex);
//   const name = absoluteSourcePath.slice(lastSlashIndex + 1);
//   return exec('zip', ['--quiet', '--recurse-paths', outputPath, name], { cwd, disableStdout: true });
// };

const archiveDirectoryNodeImpl = async ({
  absoluteSourcePath,
  isDir,
  absoluteOutputPath,
  format,
  executablePatterns
}: {
  format: 'zip' | 'tgz';
  absoluteSourcePath: string;
  isDir: boolean;
  absoluteOutputPath: string;
  executablePatterns?: string[];
}) => {
  const archive =
    format === 'zip'
      ? archiver('zip', { zlib: { level: 9 } })
      : archiver('tar', { gzip: true, gzipOptions: { level: 9 } });

  const outputStream = createWriteStream(absoluteOutputPath);

  // Helper to check if a file should be executable based on patterns
  const isExecutable = (fileName: string): boolean => {
    if (!executablePatterns || executablePatterns.length === 0) {
      return false;
    }
    return executablePatterns.some((pattern) => {
      // Support exact match and wildcard patterns
      if (pattern.includes('*')) {
        const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
        return regex.test(fileName);
      }
      return fileName === pattern || fileName.endsWith(`/${pattern}`);
    });
  };

  if (isDir) {
    await new Promise((resolve, reject) => {
      archive
        .directory(absoluteSourcePath, false, (entry) => {
          // Set mode to 755 (executable) for matched files, 644 (readable) for others
          entry.mode = isExecutable(entry.name) ? 0o755 : 0o644;
          return entry;
        })
        .on('error', (err) => reject(err))
        .pipe(outputStream);
      outputStream.on('close', () => resolve(true));
      archive.finalize();
    });
  } else {
    await new Promise((resolve, reject) => {
      // For single file archives, check if it should be executable
      const mode = isExecutable(basename(absoluteSourcePath)) ? 0o755 : 0o644;
      archive
        .append(createReadStream(absoluteSourcePath), {
          name: basename(absoluteSourcePath),
          mode
        })
        .on('error', (err) => reject(err))
        .pipe(outputStream);
      outputStream.on('close', () => resolve(true));
      archive.finalize();
    });
  }
};

// let hasNativeZip = null;

export const archiveItem = async ({
  absoluteSourcePath,
  absoluteDestDirPath,
  format,
  fileNameBase,
  executablePatterns
}: {
  format: 'zip' | 'tgz';
  absoluteSourcePath: string;
  absoluteDestDirPath?: string;
  fileNameBase?: string;
  executablePatterns?: string[];
}): Promise<any> => {
  const isDir = isDirAccessible(absoluteSourcePath);
  const ext = {
    zip: 'zip',
    tgz: 'tar.gz'
  }[format];
  const outputName = fileNameBase
    ? `${fileNameBase}.${ext}`
    : isDir
      ? `${basename(absoluteSourcePath)}.${ext}`
      : `${getFileNameWithoutExtension(absoluteSourcePath)}.${ext}`;
  const absoluteOutputPath = join(absoluteDestDirPath || getFolder(absoluteSourcePath), outputName);

  // if (hasNativeZip === null) {
  //   hasNativeZip = checkExecutableInPath('zip');
  // }
  // if (hasNativeZip) {
  //   await nativeZip({ absoluteSourcePath, outputPath });
  // }

  await createFile(absoluteOutputPath);
  await archiveDirectoryNodeImpl({ absoluteSourcePath, isDir, absoluteOutputPath, format, executablePatterns });
  return absoluteOutputPath;
};

export const extractTgzArchive = async ({ sourcePath, distDirPath }: { sourcePath: string; distDirPath: string }) => {
  await tar.x({ file: sourcePath, cwd: distDirPath });
  const distPath = join(distDirPath, basename(sourcePath).replace('.tgz', ''));
  await rename(join(distDirPath, 'package'), distPath);
  return distPath;
};
