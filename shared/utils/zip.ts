// @note from https://github.com/nfriedly/node-bestzip
import { createReadStream, createWriteStream } from 'node:fs';
import { platform } from 'node:os';
import { basename, dirname, join, sep } from 'node:path';
import archiver from 'archiver';
import execa from 'execa';
import { createFile, rename } from 'fs-extra';
import * as tar from 'tar';
import { getFileNameWithoutExtension, getFolder, isDirAccessible } from './fs-utils';

/**
 * Native zip tool detection result.
 * Tools are tried in order of speed (fastest first).
 */
type NativeZipTool = {
  name: 'zip' | '7z' | 'powershell' | null;
  path?: string;
};

let detectedZipTool: NativeZipTool | null = null;

/**
 * Detect available native zip tools on the system.
 * Tries tools in order of speed:
 * 1. zip (Linux/macOS/WSL) - fastest, uses deflate
 * 2. 7z (Windows/Linux) - fast, good compression
 * 3. PowerShell with .NET (Windows) - uses System.IO.Compression, always available
 * 4. null - fall back to archiver
 */
const detectNativeZipTool = async (): Promise<NativeZipTool> => {
  if (detectedZipTool !== null) {
    return detectedZipTool;
  }

  const os = platform();

  // Try 'zip' command (Linux, macOS, WSL, Git Bash on Windows)
  try {
    await execa('zip', ['--version']);
    detectedZipTool = { name: 'zip' };
    return detectedZipTool;
  } catch {
    // Not available
  }

  // Try '7z' command (7-Zip, available on Windows and can be installed on Linux)
  try {
    await execa('7z', ['--help']);
    detectedZipTool = { name: '7z' };
    return detectedZipTool;
  } catch {
    // Not available
  }

  // On Windows, try PowerShell with .NET compression (always available on Windows)
  if (os === 'win32') {
    try {
      // Check if PowerShell can load System.IO.Compression
      await execa('powershell', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Add-Type -AssemblyName System.IO.Compression.FileSystem; echo ok'
      ]);
      detectedZipTool = { name: 'powershell' };
      return detectedZipTool;
    } catch {
      // Not available
    }
  }

  // No native tool found
  detectedZipTool = { name: null };
  return detectedZipTool;
};

/**
 * Create zip using native 'zip' command (Linux/macOS).
 * Fastest option when available.
 */
const createZipWithZip = async ({
  sourceDir,
  outputPath,
  compressionLevel
}: {
  sourceDir: string;
  outputPath: string;
  compressionLevel: number;
}): Promise<void> => {
  const lastSepIndex = sourceDir.lastIndexOf(sep);
  const cwd = sourceDir.slice(0, lastSepIndex);
  const name = sourceDir.slice(lastSepIndex + 1);

  // zip compression: 0 = store, 1-9 = deflate levels
  const level = `-${compressionLevel}`;
  await execa('zip', [level, '--quiet', '--recurse-paths', outputPath, name], { cwd });
};

/**
 * Create zip using 7-Zip (Windows/Linux).
 * Fast and produces good compression.
 */
const createZipWith7z = async ({
  sourceDir,
  outputPath,
  compressionLevel
}: {
  sourceDir: string;
  outputPath: string;
  compressionLevel: number;
}): Promise<void> => {
  // 7z compression: 0 = store, 1-9 = deflate levels (mx=0 to mx=9)
  // Use -tzip for zip format, -mx for compression level
  await execa('7z', ['a', `-mx=${compressionLevel}`, '-tzip', outputPath, `${sourceDir}${sep}*`], {
    cwd: dirname(sourceDir)
  });
};

/**
 * Create zip using PowerShell with .NET compression (Windows).
 * Uses System.IO.Compression which is always available on Windows.
 */
const createZipWithPowerShell = async ({
  sourceDir,
  outputPath,
  compressionLevel
}: {
  sourceDir: string;
  outputPath: string;
  compressionLevel: number;
}): Promise<void> => {
  // Map compression level to .NET CompressionLevel enum
  // 0 = NoCompression, 1-3 = Fastest, 4-9 = Optimal
  const dotNetCompressionLevel =
    compressionLevel === 0 ? 'NoCompression' : compressionLevel <= 3 ? 'Fastest' : 'Optimal';

  // Use single quotes in PowerShell to avoid escape sequence issues with backslashes
  const script = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$compressionLevel = [System.IO.Compression.CompressionLevel]::${dotNetCompressionLevel}
if (Test-Path '${outputPath}') { Remove-Item '${outputPath}' -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory('${sourceDir}', '${outputPath}', $compressionLevel, $false)
`.trim();

  await execa('powershell', ['-NoProfile', '-NonInteractive', '-Command', script]);
};

/**
 * Create a zip archive using the fastest available native tool.
 * Falls back to archiver if no native tool is available.
 *
 * @param sourceDir - Directory to zip (contents will be at root of zip)
 * @param outputPath - Full path to output zip file
 * @param compressionLevel - 0 (store/no compression) to 9 (max compression). Default: 1 for speed.
 * @returns true if native tool was used, false if fell back to archiver
 */
export const createZipFast = async ({
  sourceDir,
  outputPath,
  compressionLevel = 1
}: {
  sourceDir: string;
  outputPath: string;
  compressionLevel?: number;
}): Promise<{ usedNative: boolean; tool: string }> => {
  const tool = await detectNativeZipTool();

  console.log('tool', tool);
  try {
    switch (tool.name) {
      case 'zip':
        await createZipWithZip({ sourceDir, outputPath, compressionLevel });
        return { usedNative: true, tool: 'zip' };

      case '7z':
        await createZipWith7z({ sourceDir, outputPath, compressionLevel });
        return { usedNative: true, tool: '7z' };

      case 'powershell':
        await createZipWithPowerShell({ sourceDir, outputPath, compressionLevel });
        return { usedNative: true, tool: 'powershell' };

      default:
        // Fall through to archiver
        break;
    }
  } catch {
    // Native tool failed, fall back to archiver
  }

  // Fallback to archiver
  await createFile(outputPath);
  await archiveDirectoryNodeImpl({
    absoluteSourcePath: sourceDir,
    isDir: true,
    absoluteOutputPath: outputPath,
    format: 'zip',
    compressionLevel,
    store: compressionLevel === 0
  });

  return { usedNative: false, tool: 'archiver' };
};

/**
 * Get the name of the native zip tool that will be used, or 'archiver' if none.
 * Useful for logging/debugging.
 */
export const getAvailableZipTool = async (): Promise<string> => {
  const tool = await detectNativeZipTool();
  return tool.name ?? 'archiver';
};

const archiveDirectoryNodeImpl = async ({
  absoluteSourcePath,
  isDir,
  absoluteOutputPath,
  format,
  executablePatterns,
  compressionLevel = 9,
  store = false
}: {
  format: 'zip' | 'tgz';
  absoluteSourcePath: string;
  isDir: boolean;
  absoluteOutputPath: string;
  executablePatterns?: string[];
  /** Compression level 0-9. 9 = max compression (slow), 1 = min compression (fast). Default: 9 */
  compressionLevel?: number;
  /** Store files without compression (much faster). Default: false */
  store?: boolean;
}) => {
  const archive =
    format === 'zip'
      ? archiver('zip', { store, zlib: { level: store ? 0 : compressionLevel } })
      : archiver('tar', { gzip: !store, gzipOptions: { level: compressionLevel } });

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
    await new Promise<void>((resolve, reject) => {
      outputStream.on('error', reject);
      outputStream.on('close', () => resolve());

      archive
        .directory(absoluteSourcePath, false, (entry) => {
          // Directories need execute permission to be traversable
          // Executable files get 755, other files get 644
          if (entry.stats?.isDirectory()) {
            entry.mode = 0o755;
          } else {
            entry.mode = isExecutable(entry.name) ? 0o755 : 0o644;
          }
          return entry;
        })
        .on('error', reject)
        .on('warning', (err) => {
          if (err.code !== 'ENOENT') reject(err);
        })
        .pipe(outputStream);

      archive.finalize().catch(reject);
    });
  } else {
    await new Promise<void>((resolve, reject) => {
      outputStream.on('error', reject);
      outputStream.on('close', () => resolve());

      // For single file archives, check if it should be executable
      const mode = isExecutable(basename(absoluteSourcePath)) ? 0o755 : 0o644;
      archive
        .append(createReadStream(absoluteSourcePath), {
          name: basename(absoluteSourcePath),
          mode
        })
        .on('error', reject)
        .on('warning', (err) => {
          if (err.code !== 'ENOENT') reject(err);
        })
        .pipe(outputStream);

      archive.finalize().catch(reject);
    });
  }
};

export const archiveItem = async ({
  absoluteSourcePath,
  absoluteDestDirPath,
  format,
  fileNameBase,
  executablePatterns,
  compressionLevel,
  store,
  useNativeZip = false
}: {
  format: 'zip' | 'tgz';
  absoluteSourcePath: string;
  absoluteDestDirPath?: string;
  fileNameBase?: string;
  executablePatterns?: string[];
  /** Compression level 0-9. 9 = max compression (slow), 1 = min compression (fast). Default: 9 */
  compressionLevel?: number;
  /** Store files without compression (much faster). Default: false */
  store?: boolean;
  /** Try to use native zip tool for faster zipping. Only works for zip format on directories. Default: false */
  useNativeZip?: boolean;
}): Promise<string> => {
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

  // Use native zip if requested, format is zip, and source is a directory
  if (useNativeZip && format === 'zip' && isDir) {
    const level = store ? 0 : (compressionLevel ?? 1);
    await createZipFast({
      sourceDir: absoluteSourcePath,
      outputPath: absoluteOutputPath,
      compressionLevel: level
    });
    return absoluteOutputPath;
  }

  await createFile(absoluteOutputPath);
  await archiveDirectoryNodeImpl({
    absoluteSourcePath,
    isDir,
    absoluteOutputPath,
    format,
    executablePatterns,
    compressionLevel,
    store
  });
  return absoluteOutputPath;
};

export const extractTgzArchive = async ({ sourcePath, distDirPath }: { sourcePath: string; distDirPath: string }) => {
  await tar.x({ file: sourcePath, cwd: distDirPath });
  const distPath = join(distDirPath, basename(sourcePath).replace('.tgz', ''));
  await rename(join(distDirPath, 'package'), distPath);
  return distPath;
};
