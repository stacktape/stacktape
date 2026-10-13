import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { crc32 } from 'node:zlib';
import { listArchiveEntries } from '@stacktape/packaging/artifact/archive-entries';
import { replaceInFiles } from './asset-replacer';
import { extractFunctionArchive } from './asset-replacer-archive';

/** Links, execute bits and FIFO modes are POSIX fixtures; the Lambda that runs this code is Linux. */
const isPosix = process.platform !== 'win32';

// Fixed now: the resolver tests below point TMPDIR elsewhere to watch the resolver's own workspace.
const TEST_BASE = tmpdir();
const roots: string[] = [];
const createRoot = async () => {
  const root = await mkdtemp(join(TEST_BASE, 'stp-asset-replacer-test-'));
  roots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const file = async (path: string, contents: string | Buffer, mode = 0o644) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
  await chmod(path, mode);
};

/**
 * A ZIP with exactly the given entries, stored uncompressed and marked as made on Unix: the shapes the production
 * archiver never writes, such as escaping names, repeated paths, FIFOs or encrypted entries.
 */
const craftZip = (entries: { name: string; data?: string; mode: number; flags?: number }[]) => {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const { name, data = '', mode, flags = 0 } of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const plain = Buffer.from(data, 'utf8');
    // An encrypted stored entry starts with a 12-byte encryption header.
    const dataBytes = flags & 0x1 ? Buffer.concat([Buffer.alloc(12), plain]) : plain;
    const checksum = crc32(plain);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags | 0x800, 6);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(dataBytes.length, 18);
    local.writeUInt32LE(plain.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags | 0x800, 8);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(dataBytes.length, 20);
    central.writeUInt32LE(plain.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE((mode << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, dataBytes);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + dataBytes.length;
  }
  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDirectory, end]);
};

const FILE = 0o100644;
const DIRECTORY = 0o040755;
const LINK = 0o120777;

describe('replacing placeholders', () => {
  test('refuses an empty search string without naming any value', async () => {
    const root = await createRoot();
    await file(join(root, 'a.js'), 'secret');

    await expect(
      replaceInFiles({
        entries: (await listArchiveEntries({ sourcePath: root })).entries,
        replacements: [{ includeFilesPattern: '**/*.js', searchString: '', replaceString: 'secret-value' }]
      })
    ).rejects.toThrow('Asset replacer: replacement 1 has an empty search string.');
  });

  test.skipIf(!isPosix || process.getuid?.() === 0)(
    'reports a failed write only after every other replacement has finished',
    async () => {
      const root = await createRoot();
      const large = `${'x'.repeat(2 * 1024 * 1024)}{{ A }}`;
      await file(join(root, 'a00-read-only.js'), '{{ A }}', 0o444);
      for (let index = 1; index <= 40; index++) {
        await file(join(root, `a${String(index).padStart(2, '0')}.js`), large);
      }
      const { entries } = await listArchiveEntries({ sourcePath: root });
      const snapshot = async () => Promise.all(entries.map(async ({ path }) => (await stat(join(root, path))).mtimeMs));

      await expect(
        replaceInFiles({
          entries,
          replacements: [{ includeFilesPattern: '*.js', searchString: '{{ A }}', replaceString: 'value' }]
        })
      ).rejects.toThrow('EACCES');
      const atFailure = await snapshot();
      await Bun.sleep(300);

      // Nothing is still writing: a workspace removed now stays removed.
      expect(await snapshot()).toEqual(atFailure);
    },
    30_000
  );
});

describe.if(isPosix)('extracting a function package', () => {
  const refusals: { title: string; entries: Parameters<typeof craftZip>[0]; message: string }[] = [
    {
      title: 'a name that climbs out',
      entries: [{ name: '../escape.txt', mode: FILE }],
      message: 'invalid relative path'
    },
    { title: 'an absolute name', entries: [{ name: '/etc/escape.txt', mode: FILE }], message: 'absolute path' },
    { title: 'a backslash in a name', entries: [{ name: 'a\\b.txt', mode: FILE }], message: 'invalid characters' },
    {
      title: 'an empty name component',
      entries: [{ name: 'a//b.txt', mode: FILE }],
      message: 'is not a plain relative path'
    },
    {
      title: 'a `.` name component',
      entries: [{ name: './a.txt', mode: FILE }],
      message: 'is not a plain relative path'
    },
    {
      title: 'a repeated path',
      entries: [
        { name: 'a.txt', mode: FILE, data: 'first' },
        { name: 'a.txt', mode: FILE, data: 'second' }
      ],
      message: 'a.txt appears more than once'
    },
    {
      title: 'an entry below a file',
      entries: [
        { name: 'a', mode: FILE },
        { name: 'a/b.txt', mode: FILE }
      ],
      message: 'a/b.txt lies below a, which is not a directory'
    },
    {
      title: 'an entry below a link, whatever the entry order',
      entries: [
        { name: 'dir/', mode: DIRECTORY },
        { name: 'dir/inside.txt', mode: FILE, data: 'x' },
        { name: 'link/written-through.txt', mode: FILE, data: 'x' },
        { name: 'link', mode: LINK, data: 'dir' }
      ],
      message: 'link/written-through.txt lies below link, which is not a directory'
    },
    {
      title: 'a link to an absolute path',
      entries: [{ name: 'link', mode: LINK, data: '/etc/passwd' }],
      message: 'points to an absolute path'
    },
    {
      title: 'a link with an empty target',
      entries: [{ name: 'link', mode: LINK, data: '' }],
      message: 'unusable target'
    },
    {
      title: 'a FIFO',
      entries: [{ name: 'pipe', mode: 0o010644 }],
      message: 'is not a directory, a regular file or a symbolic link'
    },
    { title: 'an encrypted entry', entries: [{ name: 'a.txt', mode: FILE, flags: 0x1 }], message: 'is encrypted' }
  ];

  for (const { title, entries, message } of refusals) {
    test(`refuses ${title} before writing anything`, async () => {
      const root = await createRoot();
      await writeFile(join(root, 'input.zip'), craftZip(entries));

      const extraction = extractFunctionArchive({
        zipPath: join(root, 'input.zip'),
        targetPath: join(root, 'extracted')
      });

      await expect(extraction).rejects.toThrow(message);
      await expect(extraction).rejects.toThrow('Cannot extract the function package:');
      expect(await readdir(root)).toEqual(['input.zip']);
    });
  }
});
