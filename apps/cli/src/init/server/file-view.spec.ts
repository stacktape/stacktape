import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FILE_VIEW_MAX_BYTES,
  FILE_VIEW_MAX_LINES,
  maskEnvironmentText,
  maskUrlCredentials,
  normaliseRepositoryPath,
  readSeenFile,
  seenFilePaths
} from './file-view';

let base: string;
let root: string;

beforeAll(async () => {
  base = await mkdtemp(join(tmpdir(), 'stacktape-file-view-'));
  root = join(base, 'repository');
  await mkdir(join(root, 'lib', 'db'), { recursive: true });
  await writeFile(join(root, 'package.json'), '{\n  "name": "app",\n  "dependencies": { "postgres": "^3" }\n}\n');
  await writeFile(join(root, 'lib', 'db', 'drizzle.ts'), 'export const db = drizzle(process.env.POSTGRES_URL);\n');
  await writeFile(join(root, '.env.example'), '# Database\nPOSTGRES_URL=postgres://user:pass@localhost/db\nEMPTY=\n');
  await writeFile(join(root, 'logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]));
  await writeFile(join(root, 'latin1.txt'), Buffer.from([0x63, 0x61, 0x66, 0xe9]));
  await writeFile(join(root, 'huge.json'), 'x'.repeat(FILE_VIEW_MAX_BYTES + 1));
  await writeFile(
    join(root, 'long.ts'),
    Array.from({ length: FILE_VIEW_MAX_LINES + 5 }, (_, i) => `// ${i + 1}`).join('\n')
  );
  await writeFile(join(base, 'secret.txt'), 'outside the repository\n');
  await symlink(join(base, 'secret.txt'), join(root, 'escape.txt'));
  await symlink(join(root, 'package.json'), join(root, 'inside-link.json'));
  await mkdir(join(root, 'folder'));
});

afterAll(async () => {
  await rm(base, { recursive: true, force: true });
});

const everything = new Set([
  'package.json',
  'lib/db/drizzle.ts',
  '.env.example',
  'logo.png',
  'latin1.txt',
  'huge.json',
  'long.ts',
  'escape.txt',
  'inside-link.json',
  'folder',
  'missing.ts'
]);

describe('which paths are allowed', () => {
  test.each([
    ['package.json', 'package.json'],
    ['./lib/db/drizzle.ts', 'lib/db/drizzle.ts'],
    ['lib\\db\\drizzle.ts', 'lib/db/drizzle.ts'],
    ['../secret.txt', undefined],
    ['lib/../../secret.txt', undefined],
    ['/etc/passwd', undefined],
    ['C:/Windows/win.ini', undefined],
    ['lib//db.ts', undefined],
    ['lib/./db.ts', undefined],
    ['', undefined],
    ['a\0b', undefined]
  ])('%p normalises to %p', (input, expected) => {
    expect(normaliseRepositoryPath(input)).toBe(expected);
  });

  test('the seen list is the read_file timeline entries plus every file cited as evidence', () => {
    const seen = seenFilePaths({
      timeline: [
        { kind: 'tool', label: 'read_file package.json' },
        { kind: 'tool', label: 'list_dir app' },
        { kind: 'tool', label: 'grep process.env' },
        { kind: 'tool', label: 'read_file ../outside.txt' },
        { kind: 'note', label: 'read_file not-a-tool.txt' }
      ],
      evidenceSources: [
        { services: [{ evidence: [{ file: 'lib/db/drizzle.ts', line: 1, quote: 'drizzle' }] }] },
        { mainDatabase: { reason: 'Seen in .env.secret', evidence: [{ file: './.env.example', line: 2 }] } },
        { file: 'no-line.ts' }
      ]
    });
    expect([...seen].sort()).toEqual(['.env.example', 'lib/db/drizzle.ts', 'package.json']);
  });
});

describe('reading a seen file', () => {
  const read = (path: string, seen: ReadonlySet<string> = everything) =>
    readSeenFile({ repositoryRoot: root, path, seen });

  test('returns the text of a seen file', async () => {
    expect(await read('lib/db/drizzle.ts')).toEqual({
      path: 'lib/db/drizzle.ts',
      status: 'shown',
      text: 'export const db = drizzle(process.env.POSTGRES_URL);\n',
      lineCount: 2,
      truncated: false,
      masked: false
    });
  });

  test('refuses a file the session has not seen, without reading it', async () => {
    expect(await read('package.json', new Set(['lib/db/drizzle.ts']))).toMatchObject({
      status: 'not-shown',
      reason: 'not-seen'
    });
  });

  test('refuses a path that leaves the repository, even when listed', async () => {
    expect(await read('../secret.txt', new Set(['../secret.txt']))).toMatchObject({ reason: 'outside' });
  });

  test('refuses a symlink that points outside the repository', async () => {
    expect(await read('escape.txt')).toMatchObject({ status: 'not-shown', reason: 'outside' });
  });

  test('follows a symlink that stays inside the repository', async () => {
    expect(await read('inside-link.json')).toMatchObject({ status: 'shown', masked: false });
  });

  test.each([
    ['logo.png', 'binary'],
    ['latin1.txt', 'binary'],
    ['huge.json', 'too-large'],
    ['folder', 'not-a-file'],
    ['missing.ts', 'missing']
  ])('names %p but does not show it (%p)', async (path, reason) => {
    expect(await read(path)).toEqual({ path, status: 'not-shown', reason } as never);
  });

  test('cuts a long file at the line cap and says so', async () => {
    const view = await read('long.ts');
    if (view.status !== 'shown') throw new Error('expected the file to be shown');
    expect(view.truncated).toBe(true);
    expect(view.lineCount).toBe(FILE_VIEW_MAX_LINES + 5);
    expect(view.text.split('\n')).toHaveLength(FILE_VIEW_MAX_LINES);
  });

  test('masks every value in a .env file and keeps the keys and line numbers', async () => {
    expect(await read('.env.example')).toMatchObject({
      status: 'shown',
      masked: true,
      text: '# Database\nPOSTGRES_URL=••••\nEMPTY=\n'
    });
  });
});

describe('masking .env text', () => {
  test.each([
    ['KEY=value', 'KEY=••••'],
    ['export KEY="quoted value"', 'export KEY=••••'],
    ['  KEY = spaced', '  KEY =••••'],
    ['KEY: yaml-style', 'KEY:••••'],
    ['# OLD_KEY=sk_live_123', '# OLD_KEY=••••'],
    ['# Note: this stays readable', '# Note: this stays readable'],
    ['EMPTY=', 'EMPTY='],
    ['', ''],
    ['continuation of a multi-line value', '••••'],
    ['WINDOWS=crlf\r', 'WINDOWS=••••\r']
  ])('%p becomes %p', (input, expected) => {
    expect(maskEnvironmentText(input)).toBe(expected);
  });
});

describe('masking URL credentials in any file', () => {
  test.each([
    ['PG_URL: "postgres://${PG_USER}:pa55@w0rd@db:5432/db"', 'PG_URL: "postgres://••••@db:5432/db"'],
    ['amqp://guest:guest@localhost:5672/', 'amqp://••••@localhost:5672/'],
    [
      "url: 'mysql://root:pw@db.test/app' # and https://example.com",
      "url: 'mysql://••••@db.test/app' # and https://example.com"
    ],
    ['git clone ssh://git@github.com/acme/app', 'git clone ssh://git@github.com/acme/app'],
    ['see https://docs.example.com/a:b@c', 'see https://docs.example.com/a:b@c']
  ])('%p becomes %p', (input, expected) => {
    expect(maskUrlCredentials(input)).toBe(expected);
  });
});
