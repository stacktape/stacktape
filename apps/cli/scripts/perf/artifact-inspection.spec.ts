import type { PayloadEntry } from './artifact-inspection';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import {
  canonicalPayloadDigest,
  digestSubtree,
  inspectArtifacts,
  inspectThenRemove,
  INVOCATION_PLACEHOLDER
} from './artifact-inspection';

type TestEntry = {
  name: string;
  content?: string;
  /** Unix permission bits; the type bits come from `directory` and `link`. */
  mode?: number;
  directory?: boolean;
  link?: boolean;
  /** DOS date and time words. */
  date?: number;
  time?: number;
  deflate?: boolean;
  level?: number;
  extra?: Buffer;
  crc?: number;
  flags?: number;
  /** The uncompressed size the headers declare, when it must differ from the content's. */
  declaredSize?: number;
};

/**
 * A ZIP written byte by byte, so every piece of metadata the canonical digest must ignore can be varied on its own:
 * timestamps, compression, entry order, extra fields, the creator's version and the archive comment.
 */
const writeZip = (entries: TestEntry[], { comment = '', creatorVersion = 20 } = {}) => {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.directory ? `${entry.name}/` : entry.name);
    const content = Buffer.from(entry.content ?? '');
    const compressed = entry.deflate ? deflateRawSync(content, { level: entry.level ?? 6 }) : content;
    // Traditional ZIP encryption puts a 12-byte header before the data.
    const data = (entry.flags ?? 0) & 0x1 ? Buffer.concat([Buffer.alloc(12), compressed]) : compressed;
    const method = entry.deflate ? 8 : 0;
    const checksum = entry.crc ?? crc32(content);
    const extra = entry.extra ?? Buffer.alloc(0);
    const time = entry.time ?? 0x6000;
    const date = entry.date ?? 0x5a21;
    const flags = 0x0800 | (entry.flags ?? 0);
    const type = entry.directory ? 0o040000 : entry.link ? 0o120000 : 0o100000;
    const mode = entry.mode ?? (entry.directory ? 0o755 : 0o644);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(checksum >>> 0, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(entry.declaredSize ?? content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(extra.length, 28);
    locals.push(local, name, extra, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | creatorVersion, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(checksum >>> 0, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(entry.declaredSize ?? content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(extra.length, 30);
    central.writeUInt32LE((((type | mode) << 16) | (entry.directory ? 0x10 : 0)) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name, extra);
    offset += 30 + name.length + extra.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const commentBytes = Buffer.from(comment);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(commentBytes.length, 20);
  return Buffer.concat([...locals, directory, end, commentBytes]);
};

const sha256 = (content: string | Buffer) => createHash('sha256').update(content).digest('hex');

const INVOCATION = '2026-09-24T11-30-00-123_abcdefghijkmnopqrstuvw';
const HANDLER = 'export const handler = async () => ({ statusCode: 200 });\n';
const SOURCE_MAP = '{"version":3,"sources":[],"mappings":""}\n';

/** The payload of `baseline()`: a directory, a handler and its source map, with 0644 files. */
const baseline = (): TestEntry[] => [
  { name: 'chunks', directory: true },
  { name: 'index.mjs', content: HANDLER, deflate: true },
  { name: 'index.mjs.map', content: SOURCE_MAP, deflate: true }
];

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'stacktape-artifact-inspection-'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

/** A fresh `.stacktape` holding one archive and the unzipped function folder beside it. */
const writeOutput = async (name: string, archive: Buffer) => {
  const output = join(root, name, '.stacktape');
  const lambdas = join(output, INVOCATION, 'build', 'lambdas');
  await mkdir(join(lambdas, 'handler01'), { recursive: true });
  await writeFile(join(lambdas, 'handler01', 'index.mjs'), HANDLER);
  await writeFile(join(lambdas, 'handler01-0123abcd.zip'), archive);
  return output;
};

const inspectArchive = async (name: string, entries: TestEntry[], options?: Parameters<typeof writeZip>[1]) => {
  const archive = writeZip(entries, options);
  const manifest = await inspectArtifacts({ root: await writeOutput(name, archive) });
  return { archive, manifest, zip: manifest.archives[0]! };
};

describe('inspectArtifacts', () => {
  test('lists the output and reads a ZIP: exact hash, entries, modes and canonical payload digest', async () => {
    const { archive, manifest, zip } = await inspectArchive('success', baseline());
    expect(manifest.problems).toEqual([]);
    expect(manifest.state).toBe('present');
    expect(manifest.invocationDirectories).toEqual([INVOCATION]);
    const lambdas = `${INVOCATION_PLACEHOLDER}/build/lambdas`;
    expect(manifest.entries.map(({ path, kind }) => `${kind} ${path}`)).toEqual([
      `directory ${INVOCATION_PLACEHOLDER}`,
      `directory ${INVOCATION_PLACEHOLDER}/build`,
      `directory ${lambdas}`,
      `directory ${lambdas}/handler01`,
      `file ${lambdas}/handler01-0123abcd.zip`,
      `file ${lambdas}/handler01/index.mjs`
    ]);
    expect(manifest.totals).toEqual({ files: 2, directories: 4, bytes: archive.length + HANDLER.length, archives: 1 });

    const expectedPayload: PayloadEntry[] = [
      { path: 'chunks', kind: 'directory', mode: 0o755, bytes: null, sha256: null },
      { path: 'index.mjs', kind: 'file', mode: 0o644, bytes: HANDLER.length, sha256: sha256(HANDLER) },
      { path: 'index.mjs.map', kind: 'file', mode: 0o644, bytes: SOURCE_MAP.length, sha256: sha256(SOURCE_MAP) }
    ];
    expect(zip).toMatchObject({
      path: `${lambdas}/handler01-0123abcd.zip`,
      bytes: archive.length,
      sha256: sha256(archive),
      entries: 3,
      files: 2,
      uncompressedBytes: HANDLER.length + SOURCE_MAP.length,
      modes: { '644': 2, '755': 1 },
      entryList: expectedPayload,
      entryListTruncated: false
    });
    expect(zip.canonicalSha256).toBe(canonicalPayloadDigest(expectedPayload));
    // The unzipped folder of the same file gives its own digest from the tree listing, with the mode the filesystem
    // reports: 0o644 under a POSIX umask, other bits on Windows.
    const { mode } = await stat(
      join(root, 'success', '.stacktape', INVOCATION, 'build', 'lambdas', 'handler01', 'index.mjs')
    );
    expect(digestSubtree(manifest.entries, `${lambdas}/handler01`)).toBe(
      canonicalPayloadDigest([
        { path: 'index.mjs', kind: 'file', mode: mode & 0o7777, bytes: HANDLER.length, sha256: sha256(HANDLER) }
      ])
    );
  });

  test('gives archives that differ only in metadata the same canonical digest and different exact hashes', async () => {
    const first = await inspectArchive('metadata-a', baseline());
    const second = await inspectArchive(
      'metadata-b',
      [
        // Another order, stored instead of deflated, another compression level, other timestamps, an extra field.
        { name: 'index.mjs.map', content: SOURCE_MAP, date: 0x5b3c, time: 0x7abc },
        { name: 'index.mjs', content: HANDLER, deflate: true, level: 9, date: 0x5b3c, time: 0x7abe },
        {
          name: 'chunks',
          directory: true,
          date: 0x5b3c,
          time: 0x7abc,
          extra: Buffer.from([0x55, 0x54, 0x05, 0x00, 0x01, 0x10, 0x20, 0x30, 0x40])
        }
      ],
      { comment: 'rebuilt', creatorVersion: 63 }
    );
    expect(second.manifest.problems).toEqual([]);
    expect(second.zip.sha256).not.toBe(first.zip.sha256);
    expect(second.zip.modificationTimes.earliest).not.toBe(first.zip.modificationTimes.earliest);
    expect(second.zip.canonicalSha256).toBe(first.zip.canonicalSha256);
  });

  test('proves timestamp-only variation: timestamps zeroed, the two archives are the same bytes', async () => {
    const extendedTimestamp = (seconds: number) => {
      const extra = Buffer.from([0x55, 0x54, 0x05, 0x00, 0x01, 0, 0, 0, 0]);
      extra.writeUInt32LE(seconds, 5);
      return extra;
    };
    const stamped = (date: number, time: number, seconds: number) =>
      baseline().map((entry) => ({ ...entry, date, time, extra: extendedTimestamp(seconds) }));
    const first = await inspectArchive('timestamps-a', stamped(0x5a21, 0x6000, 1_790_000_000));
    const second = await inspectArchive('timestamps-b', stamped(0x5b3c, 0x7abc, 1_790_000_600));
    expect(second.zip.sha256).not.toBe(first.zip.sha256);
    expect(second.zip.timestampNormalizedSha256).toBe(first.zip.timestampNormalizedSha256);
    expect(second.zip.canonicalSha256).toBe(first.zip.canonicalSha256);

    const changed = await inspectArchive(
      'timestamps-c',
      stamped(0x5a21, 0x6000, 1_790_000_000).map((entry) =>
        entry.name === 'index.mjs' ? { ...entry, content: `${HANDLER}// changed\n` } : entry
      )
    );
    expect(changed.zip.timestampNormalizedSha256).not.toBe(first.zip.timestampNormalizedSha256);
  });

  test('tells entry order and storage apart from timestamps', async () => {
    const ordered = await inspectArchive('layout-a', baseline());
    const reordered = await inspectArchive(
      'layout-b',
      [...baseline()].reverse().map((entry) => ({ ...entry, date: 0x5b3c, time: 0x7abc }))
    );
    expect(reordered.zip.canonicalSha256).toBe(ordered.zip.canonicalSha256);
    expect(reordered.zip.timestampNormalizedSha256).not.toBe(ordered.zip.timestampNormalizedSha256);
    expect(reordered.zip.entryOrderSha256).not.toBe(ordered.zip.entryOrderSha256);
    expect(reordered.zip.entrywiseNormalizedSha256).toBe(ordered.zip.entrywiseNormalizedSha256);

    // Stored instead of deflated: the same payload, stored differently.
    const stored = await inspectArchive(
      'layout-c',
      baseline().map(({ deflate: _deflate, ...entry }) => entry)
    );
    expect(stored.zip.canonicalSha256).toBe(ordered.zip.canonicalSha256);
    expect(stored.zip.entrywiseNormalizedSha256).not.toBe(ordered.zip.entrywiseNormalizedSha256);
  });

  test.each([
    ['one changed byte', { content: `${HANDLER.slice(0, -2)}}\n` }],
    ['an executable mode', { mode: 0o755 }],
    ['a renamed file', { name: 'main.mjs' }]
  ] as const)('changes the canonical digest for %s', async (_label, change) => {
    const original = await inspectArchive(`original-${_label}`, baseline());
    const changed = await inspectArchive(
      `changed-${_label}`,
      baseline().map((entry) => (entry.name === 'index.mjs' ? { ...entry, ...change } : entry))
    );
    expect(changed.manifest.problems).toEqual([]);
    expect(changed.zip.canonicalSha256).not.toBe(original.zip.canonicalSha256);
  });

  test.each([
    ['a parent-directory path', [{ name: '../escape.mjs', content: HANDLER }], 'invalid relative path'],
    ['an absolute path', [{ name: '/etc/escape', content: HANDLER }], 'absolute path'],
    ['a backslash', [{ name: 'dir\\escape.mjs', content: HANDLER }], 'invalid characters'],
    ['a `.` segment', [{ name: 'a/./index.mjs', content: HANDLER }], 'an empty, `.` or `..` path segment'],
    ['a link entry', [{ name: 'index.mjs', content: '/etc/passwd', link: true }], 'is a symbolic link'],
    ['a wrong CRC-32', [{ name: 'index.mjs', content: HANDLER, crc: 1 }], 'does not match its CRC-32'],
    [
      'a duplicate entry',
      [
        { name: 'index.mjs', content: HANDLER },
        { name: 'index.mjs', content: SOURCE_MAP }
      ],
      'holds index.mjs twice'
    ],
    ['an encrypted entry', [{ name: 'index.mjs', content: HANDLER, flags: 0x1 }], 'is encrypted']
  ] as const)('refuses an archive with %s', async (label, entries, problem) => {
    const { manifest } = await inspectArchive(`refused-${label}`, entries as unknown as TestEntry[]);
    expect(manifest.archives).toEqual([]);
    expect(manifest.problems.join('\n')).toContain(problem);
  });

  // Each of these archives was accepted before Run16b: every entry passed on its own, but no tree extracts from them.
  test.each([
    [
      'a file that is also the parent of a later entry',
      [
        { name: 'index.mjs', content: HANDLER },
        { name: 'index.mjs/inner.mjs', content: HANDLER }
      ],
      'index.mjs is a file and also a directory of index.mjs/inner.mjs'
    ],
    [
      'a file that is also the parent of an earlier entry',
      [
        { name: 'lib/inner.mjs', content: HANDLER },
        { name: 'lib', content: HANDLER }
      ],
      'lib is a file and also a directory of an earlier entry'
    ],
    [
      'an explicit directory below a file',
      [
        { name: 'lib', content: HANDLER },
        { name: 'lib/chunks', directory: true }
      ],
      'lib is a file and also a directory of lib/chunks'
    ],
    [
      'a directory entry with data',
      [{ name: 'chunks', directory: true, content: 'not empty' }],
      'directory entry chunks holds data'
    ],
    [
      'a directory entry whose CRC-32 is not that of no data',
      [{ name: 'chunks', directory: true, crc: 0x1234 }],
      'directory entry chunks holds data'
    ],
    [
      'a deflated directory entry that declares no data but holds some',
      [{ name: 'chunks', directory: true, content: 'hidden bytes', deflate: true, declaredSize: 0, crc: 0 }],
      'unreadable archive entry chunks'
    ]
  ] as const)('refuses an archive with %s', async (label, entries, problem) => {
    const { manifest } = await inspectArchive(`ambiguous-${label}`, entries as unknown as TestEntry[]);
    expect(manifest.archives).toEqual([]);
    expect(manifest.problems.join('\n')).toContain(problem);
  });

  test('keeps explicit directory entries, stored or deflated, and their modes', async () => {
    const { manifest, zip } = await inspectArchive('explicit-directories', [
      { name: 'chunks', directory: true, mode: 0o750 },
      { name: 'src', directory: true, deflate: true },
      { name: 'src/handlers', directory: true },
      { name: 'src/handlers/index.mjs', content: HANDLER, mode: 0o640 }
    ]);
    expect(manifest.problems).toEqual([]);
    expect(zip.entryList.map(({ kind, path, mode }) => `${kind} ${path} ${mode?.toString(8)}`)).toEqual([
      'directory chunks 750',
      'directory src 755',
      'directory src/handlers 755',
      'file src/handlers/index.mjs 640'
    ]);
  });

  test('refuses a truncated archive and a link in the tree', async () => {
    const truncated = await inspectArchive('truncated', baseline()).then(async ({ archive }) =>
      inspectArtifacts({ root: await writeOutput('truncated-2', archive.subarray(0, archive.length - 30)) })
    );
    expect(truncated.problems.join('\n')).toContain('unreadable archive');

    const linked = await writeOutput('linked', writeZip(baseline()));
    await symlink('/etc/hostname', join(linked, INVOCATION, 'build', 'escape'));
    const manifest = await inspectArtifacts({ root: linked });
    expect(manifest.problems).toEqual([`unexpected symbolic link: ${INVOCATION_PLACEHOLDER}/build/escape`]);
  });

  test('records an absent and an empty output directory without a problem', async () => {
    const absent = await inspectArtifacts({ root: join(root, 'never-created', '.stacktape') });
    expect(absent).toMatchObject({ state: 'absent', entries: [], archives: [], problems: [] });
    await mkdir(join(root, 'empty', '.stacktape'), { recursive: true });
    const empty = await inspectArtifacts({ root: join(root, 'empty', '.stacktape') });
    expect(empty).toMatchObject({ state: 'empty', entries: [], archives: [], problems: [] });
  });
});

describe('inspectThenRemove', () => {
  test('inspects the output before removing it', async () => {
    const output = await writeOutput('cleanup-inspected', writeZip(baseline()));
    const manifest = await inspectThenRemove({ outputDirectory: output, inspect: true });
    expect(manifest?.archives).toHaveLength(1);
    expect(manifest?.problems).toEqual([]);
    expect(existsSync(output)).toBe(false);
  });

  test('removes the output without a manifest when inspection is off', async () => {
    const output = await writeOutput('cleanup-off', writeZip(baseline()));
    expect(await inspectThenRemove({ outputDirectory: output, inspect: false })).toBeNull();
    expect(existsSync(output)).toBe(false);
  });

  test('removes the output even when the inspection finds a problem or fails outright', async () => {
    const corrupt = await writeOutput('cleanup-corrupt', Buffer.from('not a zip'));
    const withProblem = await inspectThenRemove({ outputDirectory: corrupt, inspect: true });
    expect(withProblem?.problems.join('\n')).toContain('unreadable archive');
    expect(existsSync(corrupt)).toBe(false);

    const failing = await writeOutput('cleanup-failing', writeZip(baseline()));
    const failed = await inspectThenRemove({
      outputDirectory: failing,
      inspect: true,
      // A limit that cannot be read makes the inspection throw instead of reporting.
      limits: {
        get maxTreeEntries(): number {
          throw new Error('unreadable limit');
        }
      } as never
    });
    expect(failed?.problems.join('\n')).toContain('the inspection failed');
    expect(existsSync(failing)).toBe(false);
  });
});
