import type { ArchiveEntry } from '@stacktape/packaging/artifact/archive-entries';
import { availableParallelism } from 'node:os';
import { open, readFile, stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import { crc32, deflateRaw } from 'node:zlib';
import { withFileDescriptor } from '@stacktape/packaging/artifact/archive-entries';

/**
 * Writes Stacktape's Lambda ZIPs in-process. Files are compressed in parallel on the runtime's thread pool, so a
 * function with a few large files and a layer with thousands of small ones both use every core, where Info-ZIP's `zip`
 * compresses one file at a time. The archive is written exactly as `listArchiveEntries` describes it: modes and links
 * come from the entries, so nothing has to be checked or rewritten afterwards.
 *
 * Plain ZIP only: an archive with more than 65,535 entries or 4 GiB of data needs ZIP64, which this writer leaves to
 * the caller's fallback (`ZipLimitError`). A Lambda package is at most 250 MB unzipped.
 */

const compress = promisify(deflateRaw);

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
/** Info-ZIP's extended timestamp: the modification time in UTC seconds, which DOS time cannot hold exactly. */
const EXTENDED_TIMESTAMP = 0x5455;
const HOST_UNIX = 3;
/** ZIP 2.0: deflate and directories. */
const VERSION = 20;
/** General-purpose flag 11: names are UTF-8. */
const UTF8_NAMES = 0x0800;
const STORED = 0;
const DEFLATED = 8;
const MS_DOS_DIRECTORY = 0x10;
const TYPE_BITS = { directory: 0o040000, file: 0o100000, symlink: 0o120000 } as const;
const MAX_ENTRIES = 0xffff;
const MAX_OFFSET = 0xffffffff;
/** Directories and links carry no time of their own in the entry list; they all get the earliest DOS date. */
const NO_TIME = new Date(1980, 0, 1);

/** The archive needs ZIP64, which this writer does not produce; the caller uses another backend. */
export class ZipLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZipLimitError';
  }
}

type PreparedEntry = {
  name: Buffer;
  method: number;
  crc: number;
  data: Buffer;
  size: number;
  modifiedAt: Date;
  externalAttributes: number;
};

/** MS-DOS date and time in local time, as Info-ZIP writes them; years before 1980 cannot be represented. */
const toDosDateTime = (date: Date) => {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
};

const extendedTimestamp = (date: Date) => {
  const field = Buffer.alloc(9);
  field.writeUInt16LE(EXTENDED_TIMESTAMP, 0);
  field.writeUInt16LE(5, 2);
  // Flag bit 0: the modification time follows.
  field.writeUInt8(1, 4);
  field.writeUInt32LE(Math.max(0, Math.min(Math.floor(date.getTime() / 1000), MAX_OFFSET)), 5);
  return field;
};

const prepareEntry = async (entry: ArchiveEntry, level: number): Promise<PreparedEntry> => {
  const externalAttributes =
    (((TYPE_BITS[entry.type] | entry.mode) << 16) | (entry.type === 'directory' ? MS_DOS_DIRECTORY : 0)) >>> 0;
  const name = Buffer.from(entry.type === 'directory' ? `${entry.path}/` : entry.path, 'utf8');
  if (entry.type === 'directory') {
    return { name, method: STORED, crc: 0, data: Buffer.alloc(0), size: 0, modifiedAt: NO_TIME, externalAttributes };
  }
  if (entry.type === 'symlink') {
    const data = Buffer.from(entry.target, 'utf8');
    return { name, method: STORED, crc: crc32(data), data, size: data.length, modifiedAt: NO_TIME, externalAttributes };
  }
  const [content, { mtime }] = await withFileDescriptor(() =>
    Promise.all([readFile(entry.sourcePath), stat(entry.sourcePath)])
  );
  if (content.length !== entry.size) {
    throw new Error(
      `${entry.sourcePath} changed while it was archived: it has ${content.length} bytes, not ${entry.size}.`
    );
  }
  const compressed = level > 0 && content.length > 0 ? await compress(content, { level }) : undefined;
  const deflate = compressed !== undefined && compressed.length < content.length;
  return {
    name,
    method: deflate ? DEFLATED : STORED,
    crc: crc32(content),
    data: deflate ? compressed : content,
    size: content.length,
    modifiedAt: mtime,
    externalAttributes
  };
};

const localHeader = (entry: PreparedEntry, extra: Buffer) => {
  const { time, date } = toDosDateTime(entry.modifiedAt);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(LOCAL_FILE_HEADER, 0);
  header.writeUInt16LE(VERSION, 4);
  header.writeUInt16LE(UTF8_NAMES, 6);
  header.writeUInt16LE(entry.method, 8);
  header.writeUInt16LE(time, 10);
  header.writeUInt16LE(date, 12);
  header.writeUInt32LE(entry.crc, 14);
  header.writeUInt32LE(entry.data.length, 18);
  header.writeUInt32LE(entry.size, 22);
  header.writeUInt16LE(entry.name.length, 26);
  header.writeUInt16LE(extra.length, 28);
  return Buffer.concat([header, entry.name, extra]);
};

const centralRecord = (entry: PreparedEntry, extra: Buffer, localHeaderOffset: number) => {
  const { time, date } = toDosDateTime(entry.modifiedAt);
  const record = Buffer.alloc(46);
  record.writeUInt32LE(CENTRAL_DIRECTORY_ENTRY, 0);
  record.writeUInt16LE((HOST_UNIX << 8) | VERSION, 4);
  record.writeUInt16LE(VERSION, 6);
  record.writeUInt16LE(UTF8_NAMES, 8);
  record.writeUInt16LE(entry.method, 10);
  record.writeUInt16LE(time, 12);
  record.writeUInt16LE(date, 14);
  record.writeUInt32LE(entry.crc, 16);
  record.writeUInt32LE(entry.data.length, 20);
  record.writeUInt32LE(entry.size, 24);
  record.writeUInt16LE(entry.name.length, 28);
  record.writeUInt16LE(extra.length, 30);
  // Comment length, disk number and internal attributes stay 0.
  record.writeUInt32LE(entry.externalAttributes, 38);
  record.writeUInt32LE(localHeaderOffset, 42);
  return Buffer.concat([record, entry.name, extra]);
};

/**
 * Writes `entries` to `outputPath`, a new file, with deflate at `level` (0 stores every file). Entries are written in
 * their given order; up to twice the core count are read and compressed ahead of the one being written. Each file keeps
 * its modification time, as Info-ZIP keeps it, and is stored uncompressed when deflate would not make it smaller.
 */
export const writeZip = async ({
  entries,
  outputPath,
  level
}: {
  entries: ArchiveEntry[];
  outputPath: string;
  level: number;
}) => {
  if (entries.length > MAX_ENTRIES) {
    throw new ZipLimitError(`${entries.length} entries need ZIP64.`);
  }
  const ahead = Math.max(2, availableParallelism() * 2);
  const pending: Promise<PreparedEntry>[] = [];
  const start = (index: number) => {
    if (index >= entries.length) return;
    pending[index] = prepareEntry(entries[index]!, level);
    // Rejections are awaited in order below; this only keeps an early one from being reported as unhandled.
    pending[index].catch(() => {});
  };
  for (let index = 0; index < ahead; index++) start(index);

  const output = await open(outputPath, 'wx');
  try {
    const central: Buffer[] = [];
    let offset = 0;
    for (let index = 0; index < entries.length; index++) {
      const entry = await pending[index]!;
      delete pending[index];
      start(index + ahead);
      const extra = extendedTimestamp(entry.modifiedAt);
      const header = localHeader(entry, extra);
      if (offset + header.length + entry.data.length > MAX_OFFSET) {
        throw new ZipLimitError('The archive needs ZIP64: it is larger than 4 GiB.');
      }
      central.push(centralRecord(entry, extra, offset));
      await output.writev([header, entry.data]);
      offset += header.length + entry.data.length;
    }
    const directory = Buffer.concat(central);
    if (offset + directory.length > MAX_OFFSET) {
      throw new ZipLimitError('The archive needs ZIP64: its central directory ends past 4 GiB.');
    }
    const end = Buffer.alloc(22);
    end.writeUInt32LE(END_OF_CENTRAL_DIRECTORY, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(directory.length, 12);
    end.writeUInt32LE(offset, 16);
    await output.writev([directory, end]);
  } finally {
    await output.close();
  }
};
