/**
 * Records what a measured `package` left in its project's `.stacktape`, after the process exited and before the
 * harness removes the directory, so a report can show what the CLI produced and whether repeats produced the same.
 *
 * Every entry under the root is listed with its path relative to the root, its kind and its permission bits, and a
 * regular file with its size and SHA-256. Each `.zip` file is read in full with `yauzl`, and the manifest records:
 * - the archive's exact SHA-256, size, entry count and uncompressed size;
 * - a canonical payload digest (`canonicalPayloadDigest`) over the entries sorted by path, each with its kind,
 *   permission bits, size and content SHA-256.
 *
 * The digest leaves out timestamps, compression method and level, entry order, extra fields, comments and the
 * creating tool's version. So two archives of the same files with the same modes share a digest, and any difference
 * in a path, a byte or a mode changes it. An explicit directory entry counts, because it carries a mode.
 *
 * Three more digests of each archive (`readArchiveLayout`) help tell apart the kinds of metadata that can differ
 * between archives of the same payload:
 * - timestamp-normalized: the whole file with every stored timestamp zeroed. When two archives' exact hashes differ
 *   but these agree, the zeroed timestamp fields are the only bytes that differ;
 * - the entry order;
 * - entrywise-normalized: the modeled entry records and each entry's compressed bytes, sorted by name, apart from
 *   timestamps and offsets. When this agrees, those records and bytes are equal after timestamp and order
 *   normalization. Bytes outside the model (data descriptors, bytes before or between records, archive-level fields
 *   other than the comment) are not compared, so it does not prove that nothing else differs.
 *
 * The invocation directory the CLI names after the time it started is shown as `<invocation>`, so repeats can be
 * compared path by path; its real names are listed separately.
 *
 * Only paths, sizes, modes, timestamps and hashes reach the manifest, never file contents, so a credential inside an
 * output cannot. Anything the inspection cannot account for is a problem, never a silent success:
 * - a symbolic link or special file in the tree;
 * - an unreadable, truncated or encrypted archive, or an entry whose content fails its CRC;
 * - an entry with an unsafe or duplicate path, or one that is a link or special file;
 * - a file that is also another entry's directory, whichever comes first, since no tree extracts from that;
 * - a directory entry that holds data: its declared size and CRC-32 must be those of no data, and its stream must
 *   end empty;
 * - more entries or bytes than the limits allow.
 */
import type { Dirent } from 'node:fs';
import type { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { crc32 } from 'node:zlib';
import yauzl from 'yauzl';

export const MANIFEST_SCHEMA = 1;
export const CANONICAL_PAYLOAD_VERSION = 'stacktape-canonical-payload-v1';
export const INVOCATION_PLACEHOLDER = '<invocation>';

/** `globalStateManager.invocationId` without `STP_INVOCATION_ID`: its start time and a 22-character short UUID. */
export const INVOCATION_DIRECTORY_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}_[1-9A-HJ-NP-Za-km-z]{22}$/;

export type InspectionLimits = {
  /** Entries in the tree, directories included. */
  maxTreeEntries: number;
  maxFileBytes: number;
  maxArchiveEntries: number;
  maxArchiveUncompressedBytes: number;
  /** Entries listed one by one per archive; the digest always covers every entry. */
  maxListedArchiveEntries: number;
};

/** Far beyond what the measurement fixture produces, and within what AWS Lambda accepts. */
export const DEFAULT_LIMITS: InspectionLimits = {
  maxTreeEntries: 20_000,
  maxFileBytes: 512 * 1024 * 1024,
  maxArchiveEntries: 20_000,
  maxArchiveUncompressedBytes: 512 * 1024 * 1024,
  maxListedArchiveEntries: 1000
};

export type PayloadEntry = {
  /** Relative, `/`-separated, without a trailing slash. */
  path: string;
  kind: 'file' | 'directory';
  /** Permission bits (`mode & 0o7777`), or null where an archive recorded no Unix mode. */
  mode: number | null;
  /** Null for a directory. */
  bytes: number | null;
  /** Null for a directory. */
  sha256: string | null;
};

export type ArchiveManifest = {
  /** Relative to the inspected root, with the invocation directory shown as `<invocation>`. */
  path: string;
  bytes: number;
  sha256: string;
  /** The SHA-256 with every stored timestamp zeroed; null for ZIP64 or a structure it does not follow. */
  timestampNormalizedSha256: string | null;
  /** The entry names in archive order (`readArchiveLayout`); null where the layout could not be read. */
  entryOrderSha256: string | null;
  /**
   * The modeled entry records and compressed bytes, apart from timestamps, order and offsets (`readArchiveLayout`);
   * null likewise. Not a digest of every byte of the file.
   */
  entrywiseNormalizedSha256: string | null;
  entries: number;
  files: number;
  uncompressedBytes: number;
  canonicalSha256: string;
  /** Octal permission bits, or `none`, and how many entries have them. */
  modes: Record<string, number>;
  /** Distinct DOS modification times in the archive, as written (local time, two-second resolution). */
  modificationTimes: { distinct: number; earliest: string | null; latest: string | null };
  entryList: PayloadEntry[];
  entryListTruncated: boolean;
};

export type ArtifactManifest = {
  schema: typeof MANIFEST_SCHEMA;
  /** `absent`: no output directory; `empty`: it exists and holds nothing; `present`: it holds something. */
  state: 'absent' | 'empty' | 'present';
  /** The real names of the invocation directories, which every path shows as `<invocation>`. */
  invocationDirectories: string[];
  /** Every entry under the root, sorted by path. */
  entries: PayloadEntry[];
  archives: ArchiveManifest[];
  totals: { files: number; directories: number; bytes: number; archives: number };
  /** Anything that makes this manifest incomplete or the output unexpected; empty when the inspection succeeded. */
  problems: string[];
  /** How long the inspection took, on the harness's monotonic clock; never part of a sample's wall time. */
  inspectMs: number;
};

export class ArtifactInspectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArtifactInspectionError';
  }
}

const TYPE_MASK = 0o170000;
const TYPE_FILE = 0o100000;
const TYPE_DIRECTORY = 0o040000;
const TYPE_SYMLINK = 0o120000;
const HOST_UNIX = 3;
const MS_DOS_DIRECTORY = 0x10;

/** Byte order of the UTF-8 encoding, so the order never depends on a locale. */
const compareUtf8 = (left: string, right: string) => Buffer.compare(Buffer.from(left), Buffer.from(right));

/**
 * The digest of a payload: its entries sorted by path, each as a JSON line of kind, path, mode, size and SHA-256.
 * Used for archives and for directory trees alike, so equal content with equal modes gives equal digests.
 */
export const canonicalPayloadDigest = (entries: PayloadEntry[]) => {
  const hash = createHash('sha256');
  hash.update(`${CANONICAL_PAYLOAD_VERSION}\n`);
  for (const { kind, path, mode, bytes, sha256 } of entries.toSorted((left, right) =>
    compareUtf8(left.path, right.path)
  )) {
    hash.update(`${JSON.stringify([kind, path, mode, bytes, sha256])}\n`);
  }
  return hash.digest('hex');
};

/** The canonical digest of the part of a manifest's tree under `prefix`, with paths relative to it. */
export const digestSubtree = (entries: PayloadEntry[], prefix: string) =>
  canonicalPayloadDigest(
    entries
      .filter(({ path }) => path.startsWith(`${prefix}/`))
      .map((entry) => ({ ...entry, path: entry.path.slice(prefix.length + 1) }))
  );

const formatMode = (mode: number | null) => (mode === null ? 'none' : mode.toString(8).padStart(3, '0'));

const hashFile = (path: string) =>
  new Promise<string>((resolveHash, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolveHash(hash.digest('hex')));
  });

/** Why an archive entry's name is unsafe, beyond what `yauzl` itself refuses; null when it is safe. */
const findUnsafeName = (name: string) => {
  if (name.length === 0) return 'an empty name';
  if ([...name].some((character) => character.charCodeAt(0) < 0x20 || character.charCodeAt(0) === 0x7f)) {
    return 'a control character';
  }
  if (name.includes('\\')) return 'a backslash';
  if (name.startsWith('/') || /^[A-Za-z]:/.test(name)) return 'an absolute path';
  const segments = (name.endsWith('/') ? name.slice(0, -1) : name).split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return 'an empty, `.` or `..` path segment';
  }
  return null;
};

type ZipEntry = {
  fileName: string;
  versionMadeBy: number;
  externalFileAttributes: number;
  crc32: number;
  uncompressedSize: number;
  lastModFileTime: number;
  lastModFileDate: number;
  isEncrypted: () => boolean;
};

type ZipFile = {
  isOpen: boolean;
  on(event: 'entry', listener: (entry: ZipEntry) => void): void;
  on(event: 'end', listener: () => void): void;
  on(event: 'error', listener: (error: Error) => void): void;
  readEntry(): void;
  openReadStream(entry: ZipEntry, callback: (error: Error | null, stream?: Readable) => void): void;
  close(): void;
};

type OpenOptions = {
  lazyEntries: boolean;
  autoClose: boolean;
  decodeStrings: boolean;
  validateEntrySizes: boolean;
  strictFileNames: boolean;
};

/** The part of `yauzl` this module uses, typed here because the package ships no types this project can see. */
const zipReader: {
  open(path: string, options: OpenOptions, callback: (error: Error | null, zipFile?: ZipFile) => void): void;
} = yauzl;

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_RECORD = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const EXTENDED_TIMESTAMP = 0x5455;

export type ArchiveLayout = {
  /** The archive's bytes with every stored timestamp zeroed. */
  timestampNormalizedSha256: string;
  /** The entry names in the order the central directory lists them. */
  entryOrderSha256: string;
  /**
   * The modeled entry records sorted by name: every central and local header field except the timestamps and the local
   * header's offset, the name, the extra fields with extended timestamps zeroed and the comment, with the SHA-256 of
   * the entry's compressed bytes; then the archive comment. Equal values mean equal modeled records and compressed
   * bytes after timestamp and order normalization. Data descriptors, bytes before or between records and the other
   * end-of-central-directory fields are outside the model and not compared.
   */
  entrywiseNormalizedSha256: string;
};

/**
 * Reads an archive's structure to tell apart the kinds of metadata two archives of the same payload can differ in.
 *
 * Timestamps are the DOS time and date of each central directory record and local header, and the data of each
 * extended-timestamp extra field (0x5455). Nothing else is normalized. Returns null for a ZIP64 archive or a structure
 * this does not follow; the archive has been read and checked by `readArchivePayload` either way.
 */
export const readArchiveLayout = (archive: Buffer): ArchiveLayout | null => {
  const bytes = Buffer.from(archive);
  let end = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 22 - 0xffff); index--) {
    if (
      bytes.readUInt32LE(index) === END_OF_CENTRAL_DIRECTORY &&
      index + 22 + bytes.readUInt16LE(index + 20) === bytes.length
    ) {
      end = index;
      break;
    }
  }
  if (end < 0) return null;
  const records = bytes.readUInt16LE(end + 10);
  const offset = bytes.readUInt32LE(end + 16);
  if (records === 0xffff || offset === 0xffffffff || bytes.readUInt32LE(end + 12) === 0xffffffff) return null;
  const zeroExtendedTimestamps = (start: number, length: number) => {
    for (let cursor = start; cursor + 4 <= start + length;) {
      const id = bytes.readUInt16LE(cursor);
      const size = bytes.readUInt16LE(cursor + 2);
      if (cursor + 4 + size > start + length) return false;
      if (id === EXTENDED_TIMESTAMP) bytes.fill(0, cursor + 4, cursor + 4 + size);
      cursor += 4 + size;
    }
    return true;
  };
  const entries: { name: Buffer; record: string }[] = [];
  let cursor = offset;
  for (let index = 0; index < records; index++) {
    if (cursor + 46 > bytes.length || bytes.readUInt32LE(cursor) !== CENTRAL_DIRECTORY_RECORD) return null;
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const local = bytes.readUInt32LE(cursor + 42);
    if (local + 30 > bytes.length || bytes.readUInt32LE(local) !== LOCAL_FILE_HEADER) return null;
    const localName = bytes.readUInt16LE(local + 26);
    const localExtra = bytes.readUInt16LE(local + 28);
    const dataStart = local + 30 + localName + localExtra;
    const recordEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (dataStart + compressedSize > bytes.length || recordEnd > bytes.length) return null;
    bytes.fill(0, cursor + 12, cursor + 16);
    bytes.fill(0, local + 10, local + 14);
    if (!zeroExtendedTimestamps(cursor + 46 + nameLength, extraLength)) return null;
    if (!zeroExtendedTimestamps(local + 30 + localName, localExtra)) return null;
    entries.push({
      name: Buffer.from(bytes.subarray(cursor + 46, cursor + 46 + nameLength)),
      // Everything but the signatures, the timestamps (already zero) and the local header's offset.
      record: [
        bytes.subarray(cursor + 4, cursor + 42).toString('hex'),
        bytes.subarray(cursor + 46, recordEnd).toString('hex'),
        bytes.subarray(local + 4, dataStart).toString('hex'),
        createHash('sha256')
          .update(bytes.subarray(dataStart, dataStart + compressedSize))
          .digest('hex')
      ].join(':')
    });
    cursor = recordEnd;
  }
  const entrywise = createHash('sha256');
  for (const { record } of entries.toSorted((left, right) => Buffer.compare(left.name, right.name))) {
    entrywise.update(`${record}\n`);
  }
  entrywise.update(`comment:${bytes.subarray(end + 22).toString('hex')}\n`);
  return {
    timestampNormalizedSha256: createHash('sha256').update(bytes).digest('hex'),
    entryOrderSha256: createHash('sha256')
      .update(entries.map(({ name }) => name.toString('hex')).join('\n'))
      .digest('hex'),
    entrywiseNormalizedSha256: entrywise.digest('hex')
  };
};

/** The SHA-256 of an archive with every stored timestamp zeroed; null where `readArchiveLayout` is. */
export const timestampNormalizedSha256 = (archive: Buffer) =>
  readArchiveLayout(archive)?.timestampNormalizedSha256 ?? null;

/** A DOS date and time as written, without applying any time zone. */
const formatDosTime = (date: number, time: number) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  const year = 1980 + (date >> 9);
  return `${year}-${pad((date >> 5) & 0xf)}-${pad(date & 0x1f)}T${pad(time >> 11)}:${pad((time >> 5) & 0x3f)}:${pad((time & 0x1f) * 2)}`;
};

/** Every entry of an archive, each file read in full and checked against its CRC-32. */
export const readArchivePayload = (
  path: string,
  limits: InspectionLimits = DEFAULT_LIMITS
): Promise<{ entries: PayloadEntry[]; modificationTimes: string[] }> =>
  new Promise((resolvePayload, reject) => {
    zipReader.open(
      path,
      { lazyEntries: true, autoClose: true, decodeStrings: true, validateEntrySizes: true, strictFileNames: true },
      (openError, zipFile) => {
        if (openError || !zipFile) {
          reject(new ArtifactInspectionError(`unreadable archive: ${openError?.message ?? 'no archive'}`));
          return;
        }
        const entries: PayloadEntry[] = [];
        const modificationTimes: string[] = [];
        const kinds = new Map<string, PayloadEntry['kind']>();
        // Every path that is a file, and every path that is a directory, stated or implied by an entry below it.
        const fileNames = new Set<string>();
        const directoryNames = new Set<string>();
        let uncompressedBytes = 0;
        let settled = false;
        const fail = (message: string) => {
          if (settled) return;
          settled = true;
          if (zipFile.isOpen) zipFile.close();
          reject(new ArtifactInspectionError(message));
        };
        zipFile.on('error', (error) => fail(`unreadable archive: ${error.message}`));
        zipFile.on('end', () => {
          if (settled) return;
          settled = true;
          resolvePayload({ entries, modificationTimes });
        });
        zipFile.on('entry', (entry) => {
          if (entries.length >= limits.maxArchiveEntries) {
            fail(`more than ${limits.maxArchiveEntries} archive entries`);
            return;
          }
          const unsafe = findUnsafeName(entry.fileName);
          if (unsafe) {
            fail(`an archive entry has ${unsafe}: ${JSON.stringify(entry.fileName)}`);
            return;
          }
          if (entry.isEncrypted()) {
            fail(`an archive entry is encrypted: ${entry.fileName}`);
            return;
          }
          const fromUnix = entry.versionMadeBy >> 8 === HOST_UNIX;
          const unixMode = fromUnix ? entry.externalFileAttributes >>> 16 : null;
          const unixType = unixMode === null ? 0 : unixMode & TYPE_MASK;
          const namedAsDirectory = entry.fileName.endsWith('/');
          if (unixType !== 0 && unixType !== TYPE_FILE && unixType !== TYPE_DIRECTORY) {
            const what = unixType === TYPE_SYMLINK ? 'a symbolic link' : 'a special file';
            fail(`an archive entry is ${what}: ${entry.fileName}`);
            return;
          }
          const isDirectory =
            unixType === TYPE_DIRECTORY ||
            (unixType === 0 && (namedAsDirectory || (entry.externalFileAttributes & MS_DOS_DIRECTORY) !== 0));
          if (isDirectory !== namedAsDirectory) {
            fail(`an archive entry's type and name disagree: ${entry.fileName}`);
            return;
          }
          const name = namedAsDirectory ? entry.fileName.slice(0, -1) : entry.fileName;
          if (kinds.has(name)) {
            fail(`the archive holds ${name} twice`);
            return;
          }
          const segments = name.split('/');
          const ancestors = segments.slice(0, -1).map((_, index) => segments.slice(0, index + 1).join('/'));
          const fileAncestor = ancestors.find((ancestor) => fileNames.has(ancestor));
          if (fileAncestor !== undefined) {
            fail(`${fileAncestor} is a file and also a directory of ${name}`);
            return;
          }
          if (!isDirectory && directoryNames.has(name)) {
            fail(`${name} is a file and also a directory of an earlier entry`);
            return;
          }
          kinds.set(name, isDirectory ? 'directory' : 'file');
          for (const ancestor of ancestors) directoryNames.add(ancestor);
          (isDirectory ? directoryNames : fileNames).add(name);
          modificationTimes.push(formatDosTime(entry.lastModFileDate, entry.lastModFileTime));
          const mode = unixMode === null ? null : unixMode & 0o7777;
          if (isDirectory && entry.uncompressedSize !== 0) {
            fail(`directory entry ${name} holds data (${entry.uncompressedSize} bytes declared)`);
            return;
          }
          if (isDirectory && entry.crc32 >>> 0 !== 0) {
            fail(`directory entry ${name} holds data: its CRC-32 is not that of no data`);
            return;
          }
          uncompressedBytes += entry.uncompressedSize;
          if (uncompressedBytes > limits.maxArchiveUncompressedBytes) {
            fail(`more than ${limits.maxArchiveUncompressedBytes} uncompressed bytes`);
            return;
          }
          zipFile.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) {
              fail(`unreadable archive entry ${name}: ${streamError?.message ?? 'no stream'}`);
              return;
            }
            const hash = createHash('sha256');
            let checksum = 0;
            let bytes = 0;
            stream.on('data', (chunk: Buffer) => {
              bytes += chunk.length;
              hash.update(chunk);
              checksum = crc32(chunk, checksum);
            });
            stream.on('error', (error: Error) => fail(`unreadable archive entry ${name}: ${error.message}`));
            stream.on('end', () => {
              if (settled) return;
              if (checksum >>> 0 !== entry.crc32 >>> 0) {
                fail(`archive entry ${name} does not match its CRC-32`);
                return;
              }
              // A directory is read too, so data its headers do not declare cannot hide in it.
              if (isDirectory && bytes !== 0) {
                fail(`directory entry ${name} holds data (${bytes} bytes read)`);
                return;
              }
              entries.push(
                isDirectory
                  ? { path: name, kind: 'directory', mode, bytes: null, sha256: null }
                  : { path: name, kind: 'file', mode, bytes, sha256: hash.digest('hex') }
              );
              zipFile.readEntry();
            });
          });
        });
        zipFile.readEntry();
      }
    );
  });

const inspectArchive = async ({
  absolutePath,
  path,
  bytes,
  sha256,
  limits
}: {
  absolutePath: string;
  path: string;
  bytes: number;
  sha256: string;
  limits: InspectionLimits;
}): Promise<ArchiveManifest> => {
  const { entries, modificationTimes } = await readArchivePayload(absolutePath, limits);
  const sorted = entries.toSorted((left, right) => compareUtf8(left.path, right.path));
  const modes: Record<string, number> = {};
  for (const { mode } of sorted) modes[formatMode(mode)] = (modes[formatMode(mode)] ?? 0) + 1;
  const times = [...new Set(modificationTimes)].toSorted();
  return {
    path,
    bytes,
    sha256,
    ...layoutFields(readArchiveLayout(await readFile(absolutePath))),
    entries: sorted.length,
    files: sorted.filter(({ kind }) => kind === 'file').length,
    uncompressedBytes: sorted.reduce((sum, entry) => sum + (entry.bytes ?? 0), 0),
    canonicalSha256: canonicalPayloadDigest(sorted),
    modes,
    modificationTimes: { distinct: times.length, earliest: times[0] ?? null, latest: times.at(-1) ?? null },
    entryList: sorted.slice(0, limits.maxListedArchiveEntries),
    entryListTruncated: sorted.length > limits.maxListedArchiveEntries
  };
};

const layoutFields = (layout: ArchiveLayout | null) => ({
  timestampNormalizedSha256: layout?.timestampNormalizedSha256 ?? null,
  entryOrderSha256: layout?.entryOrderSha256 ?? null,
  entrywiseNormalizedSha256: layout?.entrywiseNormalizedSha256 ?? null
});

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Inspects everything under `root`, which the harness owns. The root is not followed if it is a link, and nothing
 * outside it is read.
 */
export const inspectArtifacts = async ({
  root,
  limits = DEFAULT_LIMITS
}: {
  root: string;
  limits?: InspectionLimits;
}): Promise<ArtifactManifest> => {
  const started = performance.now();
  const manifest: ArtifactManifest = {
    schema: MANIFEST_SCHEMA,
    state: 'absent',
    invocationDirectories: [],
    entries: [],
    archives: [],
    totals: { files: 0, directories: 0, bytes: 0, archives: 0 },
    problems: [],
    inspectMs: 0
  };
  const finish = () => {
    manifest.entries.sort((left, right) => compareUtf8(left.path, right.path));
    manifest.archives.sort((left, right) => compareUtf8(left.path, right.path));
    manifest.inspectMs = Math.round((performance.now() - started) * 10) / 10;
    return manifest;
  };

  const rootStats = await lstat(root).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    manifest.problems.push(`the output directory cannot be read: ${error.message}`);
    return undefined;
  });
  if (rootStats === null) return finish();
  manifest.state = 'present';
  if (rootStats === undefined) return finish();
  if (!rootStats.isDirectory()) {
    manifest.problems.push(
      rootStats.isSymbolicLink() ? 'the output directory is a symbolic link' : 'the output path is not a directory'
    );
    return finish();
  }

  const topLevel = await readdir(root).catch((error: Error) => {
    manifest.problems.push(`the output directory cannot be listed: ${error.message}`);
    return [] as string[];
  });
  if (topLevel.length === 0 && manifest.problems.length === 0) {
    manifest.state = 'empty';
    return finish();
  }
  manifest.invocationDirectories = topLevel.filter((name) => INVOCATION_DIRECTORY_PATTERN.test(name)).toSorted();
  if (manifest.invocationDirectories.length > 1) {
    manifest.problems.push(
      `more than one invocation directory, so their paths cannot be told apart: ${manifest.invocationDirectories.join(', ')}`
    );
  }
  const displayPath = (relativePath: string) => {
    const [first, ...rest] = relativePath.split('/');
    return first && INVOCATION_DIRECTORY_PATTERN.test(first)
      ? [INVOCATION_PLACEHOLDER, ...rest].join('/')
      : relativePath;
  };

  let visited = 0;
  const visit = async (relativePath: string): Promise<void> => {
    const directory = relativePath ? join(root, relativePath) : root;
    let children: Dirent[];
    try {
      children = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      manifest.problems.push(`${displayPath(relativePath) || '.'} cannot be listed: ${describeError(error)}`);
      return;
    }
    for (const child of children.toSorted((left, right) => compareUtf8(left.name, right.name))) {
      visited += 1;
      if (visited > limits.maxTreeEntries) {
        if (visited === limits.maxTreeEntries + 1) manifest.problems.push(`more than ${limits.maxTreeEntries} entries`);
        return;
      }
      const childPath = relativePath ? `${relativePath}/${child.name}` : child.name;
      const absolutePath = join(root, childPath);
      const path = displayPath(childPath);
      let stats: Awaited<ReturnType<typeof lstat>>;
      try {
        stats = await lstat(absolutePath);
      } catch (error) {
        manifest.problems.push(`${path} cannot be read: ${describeError(error)}`);
        continue;
      }
      const mode = stats.mode & 0o7777;
      if (stats.isSymbolicLink()) {
        manifest.problems.push(`unexpected symbolic link: ${path}`);
        continue;
      }
      if (stats.isDirectory()) {
        manifest.entries.push({ path, kind: 'directory', mode, bytes: null, sha256: null });
        manifest.totals.directories += 1;
        await visit(childPath);
        continue;
      }
      if (!stats.isFile()) {
        manifest.problems.push(`unexpected special file: ${path}`);
        continue;
      }
      if (stats.size > limits.maxFileBytes) {
        manifest.problems.push(`${path} is larger than ${limits.maxFileBytes} bytes`);
        continue;
      }
      let sha256: string;
      try {
        sha256 = await hashFile(absolutePath);
      } catch (error) {
        manifest.problems.push(`${path} cannot be read: ${describeError(error)}`);
        continue;
      }
      manifest.entries.push({ path, kind: 'file', mode, bytes: stats.size, sha256 });
      manifest.totals.files += 1;
      manifest.totals.bytes += stats.size;
      if (child.name.endsWith('.zip')) {
        manifest.totals.archives += 1;
        try {
          manifest.archives.push(await inspectArchive({ absolutePath, path, bytes: stats.size, sha256, limits }));
        } catch (error) {
          manifest.problems.push(`${path}: ${describeError(error)}`);
        }
      }
    }
  };
  await visit('');
  return finish();
};

/**
 * What the harness does once a sample's process has exited: optionally inspect the output directory, then remove it,
 * whatever the inspection found. The manifest is null when inspection is off. An inspection that throws still ends
 * with the directory removed, and becomes a manifest whose only content is the problem.
 */
export const inspectThenRemove = async ({
  outputDirectory,
  inspect,
  limits
}: {
  outputDirectory: string;
  inspect: boolean;
  limits?: InspectionLimits;
}): Promise<ArtifactManifest | null> => {
  let manifest: ArtifactManifest | null = null;
  try {
    if (inspect) {
      try {
        manifest = await inspectArtifacts({ root: outputDirectory, ...(limits && { limits }) });
      } catch (error) {
        manifest = {
          schema: MANIFEST_SCHEMA,
          state: 'present',
          invocationDirectories: [],
          entries: [],
          archives: [],
          totals: { files: 0, directories: 0, bytes: 0, archives: 0 },
          problems: [`the inspection failed: ${describeError(error)}`],
          inspectMs: 0
        };
      }
    }
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
  return manifest;
};
