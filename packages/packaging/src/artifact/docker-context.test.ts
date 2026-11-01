import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDockerContextChecksum, getDockerIgnoreContents } from './docker-context';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.map(async (root) => {
      await chmod(join(root, '.stacktape', 'dev-data'), 0o755).catch(() => {});
      await rm(root, { force: true, recursive: true });
    })
  );
  roots.length = 0;
});

const createContext = async (files: Record<string, string>) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-docker-context-'));
  roots.push(root);
  for (const [path, contents] of Object.entries(files)) {
    // oxlint-disable-next-line no-await-in-loop -- A few fixture files, written in order.
    await mkdir(join(root, path, '..'), { recursive: true });
    // oxlint-disable-next-line no-await-in-loop -- A few fixture files, written in order.
    await writeFile(join(root, path), contents);
  }
  return root;
};

describe('docker build context checksum', () => {
  // r2mm: once dev mode had run, the local MySQL container owned `.stacktape/dev-data`, and the checksum of a batch job
  // image built from the project root failed with EACCES although the image excludes `.stacktape`.
  test('does not read a directory that the exclusions drop', async () => {
    const root = await createContext({ 'report.ts': 'console.log("report");\n' });
    await mkdir(join(root, '.stacktape', 'dev-data', 'mysql'), { recursive: true });
    await chmod(join(root, '.stacktape', 'dev-data'), 0o000);

    const { includedFilePaths } = await getDockerContextChecksum({
      absoluteBuildContextPath: root,
      includeDockerfile: false,
      ignorePatterns: ['**/.git', '**/.stacktape', '**/node_modules']
    });
    expect(includedFilePaths).toEqual([join(root, 'report.ts')]);
  });

  // r2bm: the excluded directories themselves were counted, so installing dependencies changed the checksum of a
  // context Docker receives unchanged, and an excluded directory was read in full.
  test.each<[string, { ignorePatterns?: string[] }]>([
    ['the Railpack exclusions', { ignorePatterns: ['**/.git', '**/.stacktape', '**/node_modules'] }],
    ['a .dockerignore', {}]
  ])('an excluded directory is neither counted nor read, with %s', async (_, options) => {
    const files = {
      Dockerfile: 'FROM alpine\n',
      '.dockerignore': '.git\nnode_modules/\n**/node_modules\n',
      'package.json': '{}',
      'jobs/report/package.json': '{}'
    };
    const clean = await createContext(files);
    const installed = await createContext(files);
    await mkdir(join(installed, '.git'), { recursive: true });
    await writeFile(join(installed, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    await mkdir(join(installed, 'jobs', 'report', 'node_modules', '@mini'), { recursive: true });
    await mkdir(join(installed, 'node_modules', '.pnpm'), { recursive: true });
    await chmod(join(installed, 'node_modules', '.pnpm'), 0o000);
    const checksum = async (root: string) =>
      (await getDockerContextChecksum({ absoluteBuildContextPath: root, ...options })).checksum;
    try {
      expect(await checksum(installed)).toBe(await checksum(clean));
    } finally {
      await chmod(join(installed, 'node_modules', '.pnpm'), 0o755);
    }
  });

  // Review of #384: a `.dockerignore` line `.` became an exclusion of the whole tree, so a changed `app.txt` kept the
  // digest and a deploy reused the image with the old file. Docker excludes nothing for that line.
  test.each<[string[]]>([
    [['.']],
    [['./']],
    [['/.']],
    [['*', '!app.txt']],
    [['**', '!app.txt', '!Dockerfile']],
    [['vendor', 'node_modules/', '!node_modules/keep']],
    [['*/cache', '!lib/cache/keep.txt']]
  ])('a changed source file changes the digest with .dockerignore %j', async (lines) => {
    const root = await createContext({
      Dockerfile: 'FROM alpine\nCOPY app.txt /app.txt\n',
      '.dockerignore': `${lines.join('\n')}\n`,
      'app.txt': 'first',
      'node_modules/keep': 'kept',
      'lib/cache/keep.txt': 'kept'
    });
    const checksum = async () => (await getDockerContextChecksum({ absoluteBuildContextPath: root })).checksum;
    const before = await checksum();
    await writeFile(join(root, 'app.txt'), 'second');
    expect(await checksum()).not.toBe(before);
  });

  test('an exception brings back a file inside an excluded directory', async () => {
    const root = await createContext({
      Dockerfile: 'FROM alpine\n',
      '.dockerignore': 'node_modules\n!node_modules/keep\n',
      'node_modules/keep': 'kept',
      'node_modules/drop': 'dropped'
    });
    const { includedFilePaths } = await getDockerContextChecksum({ absoluteBuildContextPath: root });
    expect(includedFilePaths.map((path) => path.slice(root.length + 1)).toSorted()).toEqual([
      '.dockerignore',
      'Dockerfile',
      'node_modules/keep'
    ]);
  });

  // r2bb: with `COPY . .`, a Dockerfile image carried the project's `.stacktape` (local database files, dev session
  // records) unless `.dockerignore` excluded it, and a running local PostgreSQL made the checksum fail with EACCES.
  test.each<[string, string | undefined]>([
    ['no .dockerignore', undefined],
    ['a .dockerignore without .stacktape', 'node_modules\n'],
    ['a .dockerignore that brings .stacktape back', '*\n!app.txt\n!Dockerfile\n!.stacktape\n!**/.stacktape/**\n']
  ])("Stacktape's local state is never in the context with %s", async (_, dockerIgnore) => {
    const root = await createContext({
      Dockerfile: 'FROM alpine\nCOPY . /app\n',
      'app.txt': 'app',
      '.stacktape/invocation/build.log': 'log',
      'services/api/.stacktape/dev-agents/shop-dev.json': '{}',
      '.stacktape-install.lock': '',
      ...(dockerIgnore === undefined ? {} : { '.dockerignore': dockerIgnore })
    });
    await mkdir(join(root, '.stacktape', 'dev-data'), { recursive: true });
    await chmod(join(root, '.stacktape', 'dev-data'), 0o000);
    const { includedFilePaths } = await getDockerContextChecksum({ absoluteBuildContextPath: root });
    const included = includedFilePaths.map((path) => path.slice(root.length + 1));
    expect(included).toContain('app.txt');
    expect(included.filter((path) => path.includes('.stacktape'))).toEqual([]);

    // Docker receives the same exclusions: the project's patterns first, Stacktape's last.
    const contents = await getDockerIgnoreContents({
      absoluteBuildContextPath: root,
      absoluteDockerfilePath: join(root, 'Dockerfile')
    });
    expect(contents.startsWith(dockerIgnore ?? '**/.stacktape')).toBeTrue();
    expect(contents.trimEnd().split('\n').slice(-3)).toEqual([
      '**/.stacktape',
      '**/.stacktape/**',
      '**/.stacktape-install.lock'
    ]);
  });
});
