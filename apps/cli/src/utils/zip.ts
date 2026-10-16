import type { ArchiveEntry } from '@stacktape/packaging/artifact/archive-entries';
import type { ArchiveItem } from '@stacktape/packaging/runtime-contracts';
import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream, type ReadStream } from 'node:fs';
import { mkdir, readFile, realpath, rename, rm, stat } from 'node:fs/promises';
import { Transform } from 'node:stream';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { listArchiveEntries, matchesExecutablePattern } from '@stacktape/packaging/artifact/archive-entries';
import { TarArchive, ZipArchive } from 'archiver';
import * as tar from 'tar';
import { writeZip as writeParallelZip, ZipLimitError } from './zip-writer';

export type ArchiveResult = {
  path: string;
  /**
   * What wrote the archive: Stacktape's own parallel ZIP writer (`zip-writer.ts`), or archiver, which writes tarballs,
   * ZIPs without `parallelZip` and the few ZIPs that need ZIP64.
   */
  backend: 'parallel' | 'archiver';
};

/**
 * Joins the archive's chunks into writes of 1 MiB. Archiver emits several small chunks per entry, and a Bun file stream
 * makes one system call for each: an archive of 125,000 files took 180 s written chunk by chunk and 29 s joined.
 */
const joinChunks = () => {
  let chunks: Buffer[] = [];
  let size = 0;
  const take = () => {
    const joined = Buffer.concat(chunks, size);
    chunks = [];
    size = 0;
    return joined;
  };
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk);
      size += chunk.length;
      callback(null, size >= 1024 * 1024 ? take() : undefined);
    },
    flush(callback) {
      callback(null, size ? take() : undefined);
    }
  });
};

/**
 * Settles once the archive stream is completely written, or with the first error. A warning means an entry listed a
 * moment ago could not be read, which would leave the archive incomplete, so it fails the archive too. A failure is
 * reported only once `addEntries` has settled, so nothing it starts outlives the call.
 */
const writeArchiveStream = ({
  archive,
  outputPath,
  addEntries
}: {
  archive: ZipArchive | TarArchive;
  outputPath: string;
  /** Adds the entries; the archive is finalized once this settles. */
  addEntries: (tools: {
    /** Fails the archive with an error archiver does not see, such as a source stream's. */
    fail: (error: unknown) => void;
    /** Settles once archiver has written `count` entries, or with the error that failed the archive. */
    entriesWritten: (count: number) => Promise<void>;
    /** Throws the error that failed the archive, if any; call it after every `await` to stop adding entries. */
    throwIfFailed: () => void;
  }) => void | Promise<void>;
}) =>
  new Promise<void>((resolve, reject) => {
    // `wx`: the temporary name is unique to this call, so an existing file would mean something else owns it.
    const output = createWriteStream(outputPath, { flags: 'wx' });
    let failure: { error: unknown } | undefined;
    let written = 0;
    let waiting: { count: number; resolve: () => void; reject: (error: unknown) => void } | undefined;
    let adding = true;
    const fail = (error: unknown) => {
      if (failure) return;
      failure = { error };
      archive.abort();
      output.destroy();
      waiting?.reject(error);
      if (!adding) reject(error);
    };
    const throwIfFailed = () => {
      if (failure) throw failure.error;
    };
    const entriesWritten = (count: number) =>
      failure
        ? Promise.reject(failure.error)
        : written >= count
          ? Promise.resolve()
          : new Promise<void>((resolve, reject) => {
              waiting = { count, resolve, reject };
            });
    archive.on('entry', () => {
      written += 1;
      if (waiting && written >= waiting.count) {
        const { resolve } = waiting;
        waiting = undefined;
        resolve();
      }
    });
    output.on('error', fail);
    archive.on('error', fail);
    archive.on('warning', fail);
    output.on('close', () => {
      if (failure) return;
      stat(outputPath).then(({ size }) => {
        if (size === archive.pointer()) {
          resolve();
        } else {
          fail(new Error(`The archive at ${outputPath} has ${size} of its ${archive.pointer()} bytes.`));
        }
      }, fail);
    });
    archive.pipe(joinChunks()).pipe(output);
    Promise.resolve()
      .then(() => addEntries({ fail, entriesWritten, throwIfFailed }))
      .catch(fail)
      .then(() => {
        adding = false;
        if (failure) return reject(failure.error);
        return archive.finalize();
      })
      .catch(fail);
  });

/**
 * How many entries are appended ahead of the one archiver writes. Archiver starts reading an appended stream at once,
 * so this bounds the open files and the memory read ahead, while the next files are read as the current one is
 * compressed.
 */
const ARCHIVER_READ_AHEAD = 64;
/** Files up to this size are read whole, in one call, rather than streamed. */
const ARCHIVER_WHOLE_FILE_BYTES = 64 * 1024;

/**
 * Writes `entries` with archiver, in their given order: archiver writes appended entries one at a time, in the order
 * they were appended. `archive.file` would stat files four at a time and write them in the order the stats finish.
 *
 * With `fixedTime`, every entry carries 1980-01-01 00:00, the time the parallel writer gives its entries: archiver
 * writes UTC and clamps any earlier date to that one, so the bytes depend on the entries and contents alone. Otherwise
 * files keep their modification times and directories and links get the current time.
 */
export const writeZipWithArchiver = async ({
  entries,
  outputPath,
  compressionLevel,
  fixedTime = false
}: {
  entries: ArchiveEntry[];
  outputPath: string;
  compressionLevel: number;
  fixedTime?: boolean;
}) => {
  const archive = new ZipArchive({ store: compressionLevel === 0, zlib: { level: compressionLevel } });
  const date = fixedTime ? { date: new Date(0) } : {};
  // `archive.file` reads the modification time from the file; an appended source has none.
  const fileData = async ({ path, sourcePath, mode }: Extract<ArchiveEntry, { type: 'file' }>) => ({
    name: path,
    mode,
    date: fixedTime ? new Date(0) : (await stat(sourcePath)).mtime
  });
  // Archiver neither reads nor closes the sources it has not reached when the archive fails.
  const reading = new Set<ReadStream>();
  try {
    await writeArchiveStream({
      archive,
      outputPath,
      addEntries: async ({ fail, entriesWritten, throwIfFailed }) => {
        for (const [index, entry] of entries.entries()) {
          if (index >= ARCHIVER_READ_AHEAD) await entriesWritten(index - ARCHIVER_READ_AHEAD + 1);
          throwIfFailed();
          if (entry.type === 'directory') {
            archive.append(Buffer.alloc(0), { name: `${entry.path}/`, type: 'directory', mode: entry.mode, ...date });
          } else if (entry.type === 'symlink') {
            // `append` rather than `symlink`, which takes no date. Archiver reads `linkname`; its types leave it out.
            const link: Parameters<ZipArchive['append']>[1] & { linkname: string } = {
              name: entry.path,
              type: 'symlink',
              linkname: entry.target,
              mode: entry.mode,
              ...date
            };
            archive.append(Buffer.alloc(0), link);
          } else if (entry.size <= ARCHIVER_WHOLE_FILE_BYTES) {
            const contents = await readFile(entry.sourcePath);
            const data = await fileData(entry);
            throwIfFailed();
            archive.append(contents, data);
          } else {
            const data = await fileData(entry);
            throwIfFailed();
            const stream = createReadStream(entry.sourcePath)
              .on('error', fail)
              .on('close', () => reading.delete(stream));
            reading.add(stream);
            archive.append(stream, data);
          }
        }
      }
    });
  } finally {
    // The archive settles only after the loop stops, so no stream opens after these close.
    await Promise.all([...reading].map((stream) => new Promise((closed) => stream.once('close', closed).destroy())));
  }
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
 * The level a `parallelZip` directory uses unless the caller names one. Measured with `scripts/perf/zip-levels.ts` on an
 * 18 MB function with its node_modules, a 16 MB dependency layer and 292 MB of node_modules in 15,000 files: the
 * parallel writer at level 6 wrote archives 9-13 % smaller than Info-ZIP `zip` at level 3, the level used before, in
 * about 57 % of its time on 24 cores and about 90 % on 2. Level 9 took 1.3-1.7 times as long again for 1-2 % fewer
 * bytes. Release tarballs keep level 1 and every other archive keeps 9.
 */
const PARALLEL_ZIP_LEVEL = 6;
const TARBALL_DIRECTORY_LEVEL = 1;
const DEFAULT_LEVEL = 9;

const writeZip = async ({
  sourcePath,
  outputPath,
  executablePatterns,
  compressionLevel,
  parallelZip
}: {
  sourcePath: string;
  outputPath: string;
  executablePatterns: string[];
  /** An explicit level, used by whichever backend writes the archive; otherwise the backend's default. */
  compressionLevel: number | undefined;
  parallelZip: boolean;
}): Promise<Omit<ArchiveResult, 'path'>> => {
  const { isDirectory, entries } = await listArchiveEntries({ sourcePath, executablePatterns });
  const level = compressionLevel ?? (parallelZip && isDirectory ? PARALLEL_ZIP_LEVEL : DEFAULT_LEVEL);
  if (parallelZip && isDirectory) {
    try {
      await writeParallelZip({ entries, outputPath, level });
      return { backend: 'parallel' };
    } catch (error) {
      // An archive that needs ZIP64 goes to archiver, which writes it; anything else is a real failure.
      if (!(error instanceof ZipLimitError)) throw error;
      await rm(outputPath, { force: true });
    }
  }
  // A parallel archive that fell back stays as reproducible as the parallel writer's.
  await writeZipWithArchiver({ entries, outputPath, compressionLevel: level, fixedTime: parallelZip && isDirectory });
  return { backend: 'archiver' };
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
 * intent kept, links stored as links only when they stay inside. With `parallelZip`, a directory is written by
 * Stacktape's parallel ZIP writer, at level 6 unless the caller names one; an archive that needs ZIP64 falls back to
 * archiver.
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
  parallelZip = false
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
            parallelZip
          })
        : (await writeTarWithArchiver({
            sourcePath: absoluteSourcePath,
            isDirectory,
            outputPath: temporaryPath,
            executablePatterns,
            // Release tarballs, the only tar archives, keep the level they always had.
            compressionLevel: explicitLevel ?? (parallelZip && isDirectory ? TARBALL_DIRECTORY_LEVEL : DEFAULT_LEVEL),
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
