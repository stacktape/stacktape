import type { ArchiveEntry } from '@stacktape/packaging/artifact/archive-entries';
import { afterEach, describe, expect, test } from 'bun:test';
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ZipArchive } from 'archiver';
import yauzl from 'yauzl';
import { applyArchivePolicy, ArchiveMismatchError } from './zip-central-directory';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

type RawEntry = { name: string; data?: string; mode: number; type?: 'directory' | 'symlink'; target?: string };

/** A ZIP storing raw host modes, the way zip and 7-Zip write one before Stacktape normalizes it. */
const writeRawZip = async (entries: RawEntry[], { forceZip64 = false } = {}) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-central-directory-'));
  roots.push(root);
  const zipPath = join(root, 'native.zip');
  const archive = new ZipArchive({ zlib: { level: 1 }, forceZip64 });
  const output = createWriteStream(zipPath);
  const closed = new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
  });
  archive.pipe(output);
  for (const entry of entries) {
    if (entry.type === 'symlink') archive.symlink(entry.name, entry.target!, entry.mode);
    else if (entry.type === 'directory')
      archive.append(Buffer.alloc(0), { name: entry.name, type: 'directory', mode: entry.mode });
    else archive.append(entry.data ?? '', { name: entry.name, mode: entry.mode });
  }
  await archive.finalize();
  await closed;
  return zipPath;
};

const readModes = (zipPath: string): Promise<Record<string, string>> =>
  new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (error, zipFile) => {
      if (error || !zipFile) return reject(error);
      const modes: Record<string, string> = {};
      zipFile.on('entry', (entry: yauzl.Entry) => {
        modes[entry.fileName] = `${entry.versionMadeBy >> 8}:${(entry.externalFileAttributes >>> 16).toString(8)}`;
        zipFile.readEntry();
      });
      zipFile.on('end', () => resolve(modes));
      zipFile.readEntry();
    });
  });

const policy: ArchiveEntry[] = [
  { type: 'directory', path: 'bin', mode: 0o755 },
  { type: 'file', path: 'bin/tool', sourcePath: '/unused', size: 4, mode: 0o755 },
  { type: 'file', path: 'private.txt', sourcePath: '/unused', size: 7, mode: 0o644 },
  { type: 'symlink', path: 'tool', target: 'bin/tool', mode: 0o777 }
];

const rawEntries: RawEntry[] = [
  { name: 'bin/', type: 'directory', mode: 0o700 },
  { name: 'bin/tool', data: 'tool', mode: 0o700 },
  { name: 'private.txt', data: 'private', mode: 0o600 },
  { name: 'tool', type: 'symlink', target: 'bin/tool', mode: 0o777 }
];

describe('native archive policy', () => {
  test.each([false, true])('rewrites raw host modes to the policy modes (ZIP64: %p)', async (forceZip64) => {
    const zipPath = await writeRawZip(rawEntries, { forceZip64 });

    await applyArchivePolicy({ zipPath, entries: policy });

    expect(await readModes(zipPath)).toEqual({
      'bin/': '3:40755',
      'bin/tool': '3:100755',
      'private.txt': '3:100644',
      tool: '3:120777'
    });
  });

  test.each([
    ['an entry the source does not have', [...rawEntries, { name: 'extra.txt', data: 'x', mode: 0o644 }], 'extra.txt'],
    ['a missing entry', rawEntries.filter(({ name }) => name !== 'private.txt'), 'missing 1 entry'],
    [
      'a file whose size differs',
      rawEntries.map((entry) => (entry.name === 'private.txt' ? { ...entry, data: 'changed!' } : entry)),
      'not 7'
    ],
    [
      'a followed link stored as a file',
      rawEntries.map((entry) => (entry.name === 'tool' ? { name: 'tool', data: 'tool', mode: 0o755 } : entry)),
      'as a file, not a symlink'
    ],
    [
      'a link with another target',
      rawEntries.map((entry) => (entry.name === 'tool' ? { ...entry, target: '../elsewhere' } : entry)),
      'links tool to ../elsewhere'
    ],
    ['a repeated entry', [...rawEntries, rawEntries[2]!], 'more than once']
  ])('rejects an archive with %s', async (_case, entries, message) => {
    const zipPath = await writeRawZip(entries as RawEntry[]);

    const result = applyArchivePolicy({ zipPath, entries: policy });

    await expect(result).rejects.toBeInstanceOf(ArchiveMismatchError);
    await expect(result).rejects.toThrow(message);
  });

  test('rejects a file that is not a ZIP at all', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-central-directory-'));
    roots.push(root);
    await writeFile(join(root, 'partial.zip'), 'PK partial output');

    await expect(applyArchivePolicy({ zipPath: join(root, 'partial.zip'), entries: policy })).rejects.toThrow(
      'no end-of-central-directory record'
    );
  });
});
