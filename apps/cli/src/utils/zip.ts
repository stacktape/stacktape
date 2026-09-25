import type { ArchiveEntry } from '@stacktape/packaging/artifact/archive-entries';
import type { ArchiveItem } from '@stacktape/packaging/runtime-contracts';
import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, realpath, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { listArchiveEntries, matchesExecutablePattern } from '@stacktape/packaging/artifact/archive-entries';
import { TarArchive, ZipArchive } from 'archiver';
import { execa } from 'execa';
import * as tar from 'tar';
import { applyArchivePolicy } from './zip-central-directory';

/**
 * Native ZIP tools Stacktape can drive to store links as links and whose output it then normalizes, fastest first.
 * PowerShell's ZipFile writes no Unix modes or links and is not used until it is qualified.
 */
type NativeZipTool = 'zip' | '7z';

export type ArchiveBackend = NativeZipTool | 'archiver';

export type ArchiveResult = {
  path: string;
  /** The tool that wrote the published archive. */
  backend: ArchiveBackend;
  /** A native tool tried first that failed or produced the wrong entries; its output was discarded before fallback. */
  nativeFailure?: { tool: NativeZipTool; message: string } | undefined;
};

let detectedNativeZipTool: Promise<NativeZipTool | null> | null = null;

const detectNativeZipTool = () => {
  detectedNativeZipTool ??= (async () => {
    for (const [tool, args] of [
      ['zip', ['--version']],
      ['7z', ['--help']]
    ] as const) {
      try {
        // The first working tool wins; later probes are unnecessary.
        await execa(tool, args);
        return tool;
      } catch {
        // Not installed or not runnable.
      }
    }
    return null;
  })();
  return detectedNativeZipTool;
};

/** The native ZIP tool archives would try first, or `archiver`. This is detection only: see `ArchiveResult.backend`. */
export const getAvailableZipTool = async (): Promise<string> => (await detectNativeZipTool()) ?? 'archiver';

const runNativeZipTool = ({
  tool,
  sourceDirectory,
  outputPath,
  compressionLevel
}: {
  tool: NativeZipTool;
  sourceDirectory: string;
  outputPath: string;
  compressionLevel: number;
}) =>
  // Paths are separate arguments, never shell or script text. Both tools archive `.` from inside the source so entry
  // names carry no directory prefix, and both store links as links; every link was already checked to stay inside.
  execa(
    tool,
    tool === 'zip'
      ? [`-${compressionLevel}`, '--quiet', '--recurse-paths', '--symlinks', outputPath, '.']
      : // -sse stops instead of skipping an unreadable file; -mcu=on writes UTF-8 names.
        ['a', '-tzip', `-mx=${compressionLevel}`, '-snl', '-sse', '-mcu=on', '-bd', '-bso0', '-bsp0', outputPath, '.'],
    { cwd: sourceDirectory }
  );

/**
 * Settles once the archive stream is completely written, or with the first error. A warning means an entry listed a
 * moment ago could not be read, which would leave the archive incomplete, so it fails the archive too.
 */
const writeArchiveStream = ({
  archive,
  outputPath,
  addEntries
}: {
  archive: ZipArchive | TarArchive;
  outputPath: string;
  addEntries: () => void;
}) =>
  new Promise<void>((resolve, reject) => {
    // `wx`: the temporary name is unique to this call, so an existing file would mean something else owns it.
    const output = createWriteStream(outputPath, { flags: 'wx' });
    let failed = false;
    const fail = (error: unknown) => {
      if (failed) return;
      failed = true;
      archive.abort();
      output.destroy();
      reject(error);
    };
    output.on('error', fail);
    archive.on('error', fail);
    archive.on('warning', fail);
    output.on('close', () => {
      if (failed) return;
      stat(outputPath).then(({ size }) => {
        if (size === archive.pointer()) {
          resolve();
        } else {
          fail(new Error(`The archive at ${outputPath} has ${size} of its ${archive.pointer()} bytes.`));
        }
      }, fail);
    });
    archive.pipe(output);
    addEntries();
    archive.finalize().catch(fail);
  });

const writeZipWithArchiver = ({
  entries,
  outputPath,
  compressionLevel
}: {
  entries: ArchiveEntry[];
  outputPath: string;
  compressionLevel: number;
}) => {
  const archive = new ZipArchive({ store: compressionLevel === 0, zlib: { level: compressionLevel } });
  return writeArchiveStream({
    archive,
    outputPath,
    addEntries: () => {
      for (const entry of entries) {
        if (entry.type === 'directory') {
          archive.append(Buffer.alloc(0), { name: `${entry.path}/`, type: 'directory', mode: entry.mode });
        } else if (entry.type === 'symlink') {
          archive.symlink(entry.path, entry.target, entry.mode);
        } else {
          archive.file(entry.sourcePath, { name: entry.path, mode: entry.mode });
        }
      }
    }
  });
};

/**
 * Tar archives are only the CLI's release archives. Their build marks every file executable on disk, so their explicit
 * patterns alone decide which entries are executable, as before.
 */
const writeTarWithArchiver = ({
  sourcePath,
  isDirectory,
  outputPath,
  executablePatterns,
  compressionLevel,
  store
}: {
  sourcePath: string;
  isDirectory: boolean;
  outputPath: string;
  executablePatterns: string[];
  compressionLevel: number;
  store: boolean;
}) => {
  const archive = new TarArchive({ gzip: !store, gzipOptions: { level: compressionLevel } });
  return writeArchiveStream({
    archive,
    outputPath,
    addEntries: () => {
      if (isDirectory) {
        archive.directory(sourcePath, false, (entry) => {
          entry.mode = entry.stats?.isDirectory()
            ? 0o755
            : matchesExecutablePattern(entry.name, executablePatterns)
              ? 0o755
              : 0o644;
          return entry;
        });
      } else {
        const name = basename(sourcePath);
        archive.append(createReadStream(sourcePath), {
          name,
          mode: matchesExecutablePattern(name, executablePatterns) ? 0o755 : 0o644
        });
      }
    }
  });
};

/**
 * Default levels, measured on real Lambda trees: a native tool writes a directory at 1, as it always has, because 6 was
 * 2–3× slower for 12–22 % less; archiver writing such a directory instead uses 6, which was 22–37 % smaller than
 * its level 1 for little extra time. Every other archive keeps 9.
 */
const NATIVE_DIRECTORY_LEVEL = 1;
const ARCHIVER_DIRECTORY_LEVEL = 6;
const DEFAULT_LEVEL = 9;

const writeZip = async ({
  sourcePath,
  outputPath,
  executablePatterns,
  compressionLevel,
  useNativeZip
}: {
  sourcePath: string;
  outputPath: string;
  executablePatterns: string[];
  /** An explicit level, used by whichever backend writes the archive; otherwise the backend's default. */
  compressionLevel: number | undefined;
  useNativeZip: boolean;
}): Promise<Omit<ArchiveResult, 'path'>> => {
  const { root, isDirectory, entries } = await listArchiveEntries({ sourcePath, executablePatterns });
  let nativeFailure: ArchiveResult['nativeFailure'];
  const nativeTool = useNativeZip && isDirectory ? await detectNativeZipTool() : null;
  if (nativeTool) {
    try {
      await runNativeZipTool({
        tool: nativeTool,
        sourceDirectory: root,
        outputPath,
        compressionLevel: compressionLevel ?? NATIVE_DIRECTORY_LEVEL
      });
      await applyArchivePolicy({ zipPath: outputPath, entries });
      return { backend: nativeTool };
    } catch (error) {
      nativeFailure = { tool: nativeTool, message: error instanceof Error ? error.message : String(error) };
      await rm(outputPath, { force: true });
    }
  }
  await writeZipWithArchiver({
    entries,
    outputPath,
    compressionLevel: compressionLevel ?? (useNativeZip && isDirectory ? ARCHIVER_DIRECTORY_LEVEL : DEFAULT_LEVEL)
  });
  return { backend: 'archiver', ...(nativeFailure && { nativeFailure }) };
};

/** An archive written inside the directory it archives would end up in the next archive of that directory. */
const assertOutsideSource = async ({ sourceDirectory, destinationDirectory }: Record<string, string>) => {
  const [source, destination] = await Promise.all([realpath(sourceDirectory), realpath(destinationDirectory)]);
  const destinationFromSource = relative(source, destination);
  if (
    destinationFromSource === '' ||
    (destinationFromSource !== '..' &&
      !destinationFromSource.startsWith(`..${sep}`) &&
      !isAbsolute(destinationFromSource))
  ) {
    throw new Error(`Cannot write the archive of ${sourceDirectory} into ${destinationDirectory}, which is inside it.`);
  }
};

/** Whether `path` names the same file as the existing `existingPath`, through links or not. */
const isSameFile = async (path: string, existingPath: string) =>
  (await realpath(path).catch(() => resolve(path))) === (await realpath(existingPath));

const withoutExtension = (name: string) => {
  const extension = extname(name);
  return extension ? name.slice(0, -extension.length) : name;
};

/**
 * Archives a directory's contents, or a single file, and returns where the archive was published, with the backend
 * that actually wrote it.
 *
 * ZIPs follow Stacktape's archive policy (`listArchiveEntries`): hidden files included, normalized modes, executable
 * intent kept, links stored as links only when they stay inside. With `useNativeZip`, a directory is first given to
 * zip or 7-Zip, whose result is rewritten to the policy's modes and checked entry by entry; any failure discards it and
 * falls back to archiver.
 *
 * The archive is built under a temporary name beside the destination, which must be outside the source, and renamed
 * over the destination only when complete. A failed attempt removes its own output and leaves any previous archive at
 * the destination untouched, and a repeated archive never keeps entries that were since removed from the source.
 */
export const createArchive = async ({
  absoluteSourcePath,
  absoluteDestDirPath,
  format,
  fileNameBase,
  executablePatterns = [],
  compressionLevel,
  store = false,
  useNativeZip = false
}: Parameters<ArchiveItem>[0]): Promise<ArchiveResult> => {
  const isDirectory = (await stat(absoluteSourcePath)).isDirectory();
  const extension = format === 'zip' ? 'zip' : 'tar.gz';
  const outputName = `${fileNameBase ?? (isDirectory ? basename(absoluteSourcePath) : withoutExtension(basename(absoluteSourcePath)))}.${extension}`;
  const destinationDirectory = absoluteDestDirPath || dirname(absoluteSourcePath);
  await mkdir(destinationDirectory, { recursive: true });
  if (isDirectory) {
    await assertOutsideSource({ sourceDirectory: absoluteSourcePath, destinationDirectory });
  }
  const outputPath = join(destinationDirectory, outputName);
  if (!isDirectory && (await isSameFile(outputPath, absoluteSourcePath))) {
    throw new Error(
      `Cannot archive ${absoluteSourcePath} as ${outputPath}: the archive would replace the file it archives. Choose another destination or name.`
    );
  }
  const temporaryPath = join(destinationDirectory, `.${outputName}.${randomUUID()}.partial.${extension}`);
  const explicitLevel = store ? 0 : compressionLevel;
  try {
    const result =
      format === 'zip'
        ? await writeZip({
            sourcePath: absoluteSourcePath,
            outputPath: temporaryPath,
            executablePatterns,
            compressionLevel: explicitLevel,
            useNativeZip
          })
        : (await writeTarWithArchiver({
            sourcePath: absoluteSourcePath,
            isDirectory,
            outputPath: temporaryPath,
            executablePatterns,
            // Release tarballs, the only tar archives, keep the level they always had.
            compressionLevel: explicitLevel ?? (useNativeZip && isDirectory ? NATIVE_DIRECTORY_LEVEL : DEFAULT_LEVEL),
            store
          }),
          { backend: 'archiver' as const });
    await rename(temporaryPath, outputPath);
    return { path: outputPath, ...result };
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
};

export const archiveItem: ArchiveItem = async (input) => (await createArchive(input)).path;

export const extractTgzArchive = async ({ sourcePath, distDirPath }: { sourcePath: string; distDirPath: string }) => {
  await tar.x({ file: sourcePath, cwd: distDirPath });
  const distPath = join(distDirPath, basename(sourcePath).replace('.tgz', ''));
  await rename(join(distDirPath, 'package'), distPath);
  return distPath;
};
