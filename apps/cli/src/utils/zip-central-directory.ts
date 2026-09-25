import type { ArchiveEntry } from '@stacktape/packaging/artifact/archive-entries';
import { open } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';

/**
 * Checks and rewrites the central directory of a ZIP a native tool produced: the index at the end of the file that
 * lists every entry with its name, sizes and file attributes. zip and 7-Zip store whatever modes the host has; this
 * sets each entry to the mode Stacktape's archive policy chose, and rejects the archive unless it holds exactly the
 * entries that policy listed. File data is never rewritten.
 */

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY = 0x06064b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR = 0x07064b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const HOST_UNIX = 3;
const MS_DOS_DIRECTORY = 0x10;
const TYPE_BITS = { directory: 0o040000, file: 0o100000, symlink: 0o120000 } as const;

type CentralDirectoryRecord = {
  name: string;
  /** Offset of this record inside the central directory buffer. */
  offset: number;
  versionMadeBy: number;
  externalAttributes: number;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

/** The archive is not the one the policy described; the caller discards it. */
export class ArchiveMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArchiveMismatchError';
  }
}

const utf8 = new TextDecoder('utf-8', { fatal: true });

const readAt = async (file: Awaited<ReturnType<typeof open>>, position: number, length: number) => {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await file.read(buffer, 0, length, position);
  if (bytesRead !== length) {
    throw new ArchiveMismatchError('The archive ends before its central directory does.');
  }
  return buffer;
};

const locateCentralDirectory = async (file: Awaited<ReturnType<typeof open>>, fileSize: number) => {
  const tailLength = Math.min(fileSize, 22 + 0xffff);
  const tail = await readAt(file, fileSize - tailLength, tailLength);
  let end = -1;
  for (let index = tail.length - 22; index >= 0; index--) {
    if (
      tail.readUInt32LE(index) === END_OF_CENTRAL_DIRECTORY &&
      index + 22 + tail.readUInt16LE(index + 20) === tail.length
    ) {
      end = index;
      break;
    }
  }
  if (end < 0) {
    throw new ArchiveMismatchError('The archive has no end-of-central-directory record.');
  }
  let entryCount = tail.readUInt16LE(end + 10);
  let size = tail.readUInt32LE(end + 12);
  let offset = tail.readUInt32LE(end + 16);
  if (entryCount === 0xffff || size === 0xffffffff || offset === 0xffffffff) {
    const locatorPosition = fileSize - tailLength + end - 20;
    const locator = await readAt(file, locatorPosition, 20);
    if (locator.readUInt32LE(0) !== ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR) {
      throw new ArchiveMismatchError('The archive needs ZIP64 but has no ZIP64 locator.');
    }
    const record = await readAt(file, Number(locator.readBigUInt64LE(8)), 56);
    if (record.readUInt32LE(0) !== ZIP64_END_OF_CENTRAL_DIRECTORY) {
      throw new ArchiveMismatchError('The archive has no ZIP64 end-of-central-directory record.');
    }
    entryCount = Number(record.readBigUInt64LE(32));
    size = Number(record.readBigUInt64LE(40));
    offset = Number(record.readBigUInt64LE(48));
  }
  if (offset + size > fileSize) {
    throw new ArchiveMismatchError('The central directory extends past the end of the archive.');
  }
  return { entryCount, size, offset };
};

const parseRecords = (directory: Buffer, entryCount: number): CentralDirectoryRecord[] => {
  const records: CentralDirectoryRecord[] = [];
  let offset = 0;
  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > directory.length || directory.readUInt32LE(offset) !== CENTRAL_DIRECTORY_ENTRY) {
      throw new ArchiveMismatchError('The central directory is truncated or corrupt.');
    }
    const nameLength = directory.readUInt16LE(offset + 28);
    const extraLength = directory.readUInt16LE(offset + 30);
    const commentLength = directory.readUInt16LE(offset + 32);
    let name: string;
    try {
      name = utf8.decode(directory.subarray(offset + 46, offset + 46 + nameLength));
    } catch {
      throw new ArchiveMismatchError('The archive stores an entry name that is not UTF-8.');
    }
    let compressedSize = directory.readUInt32LE(offset + 20);
    let uncompressedSize = directory.readUInt32LE(offset + 24);
    let localHeaderOffset = directory.readUInt32LE(offset + 42);
    // ZIP64 keeps values that do not fit in 32 bits in extra field 0x0001, in this order, only for those values.
    const extraStart = offset + 46 + nameLength;
    for (let extra = extraStart; extra + 4 <= extraStart + extraLength;) {
      const id = directory.readUInt16LE(extra);
      const length = directory.readUInt16LE(extra + 2);
      if (id === 0x0001) {
        let cursor = extra + 4;
        if (uncompressedSize === 0xffffffff) {
          uncompressedSize = Number(directory.readBigUInt64LE(cursor));
          cursor += 8;
        }
        if (compressedSize === 0xffffffff) {
          compressedSize = Number(directory.readBigUInt64LE(cursor));
          cursor += 8;
        }
        if (localHeaderOffset === 0xffffffff) {
          localHeaderOffset = Number(directory.readBigUInt64LE(cursor));
        }
      }
      extra += 4 + length;
    }
    records.push({
      name,
      offset,
      versionMadeBy: directory.readUInt16LE(offset + 4),
      externalAttributes: directory.readUInt32LE(offset + 38),
      compressionMethod: directory.readUInt16LE(offset + 10),
      compressedSize,
      uncompressedSize,
      localHeaderOffset
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return records;
};

const readStoredData = async (file: Awaited<ReturnType<typeof open>>, record: CentralDirectoryRecord) => {
  const header = await readAt(file, record.localHeaderOffset, 30);
  if (header.readUInt32LE(0) !== LOCAL_FILE_HEADER) {
    throw new ArchiveMismatchError(`The local header of ${record.name} is missing.`);
  }
  const dataOffset = record.localHeaderOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
  const data = await readAt(file, dataOffset, record.compressedSize);
  if (record.compressionMethod === 0) return data;
  if (record.compressionMethod === 8) return inflateRawSync(data);
  throw new ArchiveMismatchError(`${record.name} uses unsupported compression method ${record.compressionMethod}.`);
};

const describeKind = (record: CentralDirectoryRecord): ArchiveEntry['type'] => {
  if (record.versionMadeBy >> 8 === HOST_UNIX) {
    const type = (record.externalAttributes >>> 16) & 0o170000;
    if (type === TYPE_BITS.symlink) return 'symlink';
    if (type === TYPE_BITS.directory) return 'directory';
    if (type === TYPE_BITS.file) return 'file';
  }
  return record.name.endsWith('/') ? 'directory' : 'file';
};

/**
 * Rewrites every entry's attributes to the mode `entries` gives it, marking it as made on Unix so extractors apply
 * them. Throws `ArchiveMismatchError`, leaving the rest to the caller, unless the archive holds each listed entry exactly
 * once, with the listed kind, file size and link target, and nothing else.
 */
export const applyArchivePolicy = async ({ zipPath, entries }: { zipPath: string; entries: ArchiveEntry[] }) => {
  const expected = new Map(entries.map((entry) => [entry.type === 'directory' ? `${entry.path}/` : entry.path, entry]));
  const file = await open(zipPath, 'r+');
  try {
    const { size: fileSize } = await file.stat();
    const location = await locateCentralDirectory(file, fileSize);
    const directory = await readAt(file, location.offset, location.size);
    const records = parseRecords(directory, location.entryCount);
    const seen = new Set<string>();
    for (const record of records) {
      const entry = expected.get(record.name);
      if (!entry) {
        throw new ArchiveMismatchError(`The archive contains ${record.name}, which is not part of the source.`);
      }
      if (seen.has(record.name)) {
        throw new ArchiveMismatchError(`The archive contains ${record.name} more than once.`);
      }
      seen.add(record.name);
      if (describeKind(record) !== entry.type) {
        throw new ArchiveMismatchError(
          `The archive stores ${record.name} as a ${describeKind(record)}, not a ${entry.type}.`
        );
      }
      if (entry.type === 'file' && record.uncompressedSize !== entry.size) {
        throw new ArchiveMismatchError(
          `The archive stores ${record.uncompressedSize} bytes for ${entry.path}, not ${entry.size}.`
        );
      }
      if (entry.type === 'symlink') {
        // Link targets are few and small; reading them in order keeps this simple.
        const target = (await readStoredData(file, record)).toString('utf8');
        if (target !== entry.target) {
          throw new ArchiveMismatchError(`The archive links ${entry.path} to ${target}, not ${entry.target}.`);
        }
      }
      directory.writeUInt16LE(((HOST_UNIX << 8) | (record.versionMadeBy & 0xff)) >>> 0, record.offset + 4);
      directory.writeUInt32LE(
        (((TYPE_BITS[entry.type] | entry.mode) << 16) | (entry.type === 'directory' ? MS_DOS_DIRECTORY : 0)) >>> 0,
        record.offset + 38
      );
    }
    const missing = [...expected.keys()].filter((name) => !seen.has(name));
    if (missing.length > 0) {
      throw new ArchiveMismatchError(
        `The archive is missing ${missing.length} entr${missing.length === 1 ? 'y' : 'ies'}, including ${missing[0]}.`
      );
    }
    const { bytesWritten } = await file.write(directory, 0, directory.length, location.offset);
    if (bytesWritten !== directory.length) {
      throw new ArchiveMismatchError('The central directory could not be rewritten completely.');
    }
  } finally {
    await file.close();
  }
};
