import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  hasHostExecutableBit,
  listArchiveEntries,
  matchesExecutablePattern,
  UnsupportedArchiveEntryError
} from './archive-entries';

/** Links, execute bits, FIFOs and descriptor limits are POSIX fixtures; Windows keeps the portable tests below. */
const isPosix = process.platform !== 'win32';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

const createRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-archive-entries-'));
  roots.push(root);
  return root;
};

const file = async (path: string, contents: string, mode = 0o644) => {
  await writeFile(path, contents);
  await chmod(path, mode);
};

const describeEntries = async (sourcePath: string, options: { platform?: NodeJS.Platform } = {}) =>
  (await listArchiveEntries({ sourcePath, ...options })).entries.map((entry) =>
    entry.type === 'symlink'
      ? `${entry.path} -> ${entry.target}`
      : `${entry.path}${entry.type === 'directory' ? '/' : ''} ${entry.mode.toString(8)}`
  );

describe('archive entries', () => {
  test('mark files executable by explicit pattern, matching release archive patterns literally', async () => {
    expect(matchesExecutablePattern('pack/pack', ['*/pack'])).toBe(true);
    expect(matchesExecutablePattern('pack/packer', ['*/pack'])).toBe(false);
    expect(matchesExecutablePattern('stacktape', ['stacktape'])).toBe(true);
    expect(matchesExecutablePattern('bin/stacktape', ['stacktape'])).toBe(true);
    expect(matchesExecutablePattern('stacktapeXexe', ['stacktape.exe'])).toBe(false);
    expect(matchesExecutablePattern('pack/packXexe', ['*/pack.exe'])).toBe(false);

    const source = join(await createRoot(), 'source');
    await mkdir(join(source, 'pack'), { recursive: true });
    await file(join(source, 'pack', 'pack'), 'binary');
    const { entries } = await listArchiveEntries({ sourcePath: source, executablePatterns: ['*/pack'] });
    expect(entries.find(({ path }) => path === 'pack/pack')?.mode).toBe(0o755);
  });

  test('on Windows, ignore host modes and recognize executables by their ELF or script header', async () => {
    // Simulated with an injected platform: this runs the Windows rules, not a Windows host.
    const source = join(await createRoot(), 'source');
    await mkdir(source);
    await file(join(source, 'engine'), '\u007fELF\u0002\u0001', 0o644);
    await file(join(source, 'run.sh'), '#!/bin/sh\n', 0o644);
    await file(join(source, 'bootstrap'), 'MZ', 0o644);
    await file(join(source, 'looks-executable.txt'), 'text', 0o755);

    expect(await describeEntries(source, { platform: 'win32' })).toEqual([
      'bootstrap 755',
      'engine 755',
      'looks-executable.txt 644',
      'run.sh 755'
    ]);
    expect(hasHostExecutableBit(0o755, 'win32')).toBe(false);
  });
});

describe.if(isPosix)('archive entries on POSIX hosts', () => {
  test('resolve an absolute target in kernel order, so a `..` after a link applies where that link led', async () => {
    const source = join(await createRoot(), 'source');
    await mkdir(join(source, 'versions', 'v2'), { recursive: true });
    await mkdir(join(source, 'nested'));
    await file(join(source, 'config.json'), 'root');
    await file(join(source, 'versions', 'config.json'), 'versions');
    await symlink('versions/v2', join(source, 'current'));
    // Concatenated on purpose: path.join would collapse the `..` before the link is followed.
    await symlink(`${source}/current/../config.json`, join(source, 'through-link'));
    await symlink(`${source}/versions/v2`, join(source, 'nested', 'absolute-current'));
    await symlink(`${source}/nested/absolute-current/../config.json`, join(source, 'nested', 'through-absolute'));

    const entries = await describeEntries(source);

    // The kernel reads versions/config.json through both links; the root config.json would be a different file.
    expect(entries).toContain('through-link -> versions/config.json');
    expect(entries).toContain('nested/absolute-current -> ../versions/v2');
    expect(entries).toContain('nested/through-absolute -> ../versions/config.json');
  });

  test.each([
    ['leaves the directory', (root: string) => symlink('../outside.txt', join(root, 'source', 'link'))],
    ['is absolute and outside', (root: string) => symlink(join(root, 'outside.txt'), join(root, 'source', 'link'))],
    [
      'is absolute in a sibling whose name starts like the directory',
      (root: string) => symlink(`${root}/source-sibling/inside.txt`, join(root, 'source', 'link'))
    ],
    [
      'climbs out after an absolute path through a link',
      async (root: string) => {
        await mkdir(join(root, 'source', 'versions', 'v2'), { recursive: true });
        await symlink('versions/v2', join(root, 'source', 'current'));
        await symlink(`${root}/source/current/../../../outside.txt`, join(root, 'source', 'link'));
      }
    ],
    ['does not exist', (root: string) => symlink('missing.txt', join(root, 'source', 'link'))],
    ['continues past a file with a slash', (root: string) => symlink('inside.txt/', join(root, 'source', 'link'))],
    ['continues past a file with a dot', (root: string) => symlink('inside.txt/.', join(root, 'source', 'link'))],
    [
      'continues past a file through another link',
      async (root: string) => {
        await symlink('inside.txt', join(root, 'source', 'file-link'));
        await symlink('file-link/', join(root, 'source', 'link'));
      }
    ],
    [
      'leaves through another link',
      async (root: string) => {
        // `here` is the root itself, so `here/../outside.txt` is outside even though the text looks contained.
        await symlink('.', join(root, 'source', 'here'));
        await symlink('here/../outside.txt', join(root, 'source', 'link'));
      }
    ],
    [
      'is a loop',
      async (root: string) => {
        await symlink('link-b', join(root, 'source', 'link'));
        await symlink('link', join(root, 'source', 'link-b'));
      }
    ]
  ])('refuse a link that %s instead of following it', async (_description, createLink) => {
    const root = await createRoot();
    await mkdir(join(root, 'source'));
    await mkdir(join(root, 'source-sibling'));
    await file(join(root, 'outside.txt'), 'outside');
    await file(join(root, 'source', 'inside.txt'), 'inside');
    await file(join(root, 'source-sibling', 'inside.txt'), 'sibling');
    await createLink(root);

    const listing = listArchiveEntries({ sourcePath: join(root, 'source') });
    await expect(listing).rejects.toBeInstanceOf(UnsupportedArchiveEntryError);
    await expect(listing).rejects.toThrow(/symbolic link link(-b)? /);
  });

  test('refuse a name or link target with a backslash, which ZIP readers take for a path separator', async () => {
    const root = await createRoot();
    await mkdir(join(root, 'names'));
    await file(join(root, 'names', 'a\\b'), 'backslash name');
    await mkdir(join(root, 'targets'));
    await file(join(root, 'targets', 'a'), 'a');
    await symlink('a\\b', join(root, 'targets', 'link'));

    await expect(listArchiveEntries({ sourcePath: join(root, 'names') })).rejects.toThrow(
      'a\\b has a backslash in its name'
    );
    await expect(listArchiveEntries({ sourcePath: join(root, 'targets') })).rejects.toThrow(
      'a target with a backslash'
    );
    await expect(listArchiveEntries({ sourcePath: join(root, 'names', 'a\\b') })).rejects.toThrow(
      'its name has a backslash'
    );
  });

  test('never hold more file descriptors than a low limit allows, even reading every file header', async () => {
    const source = join(await createRoot(), 'source');
    await mkdir(source);
    await Promise.all(Array.from({ length: 500 }, (_, index) => file(join(source, `file-${index}.txt`), `${index}`)));
    const script = `const { listArchiveEntries } = await import(${JSON.stringify(join(import.meta.dir, 'archive-entries.ts'))});
      const { entries } = await listArchiveEntries({ sourcePath: ${JSON.stringify(source)}, platform: 'win32' });
      console.log(entries.length);`;

    // The Windows policy opens every file to read its header; 128 descriptors must still be enough for 500 files.
    const child = Bun.spawnSync(['sh', '-c', 'ulimit -n 128 && exec "$0" -e "$1"', process.execPath, script], {
      stdout: 'pipe',
      stderr: 'pipe'
    });

    expect(child.stderr.toString()).toBe('');
    expect(child.stdout.toString().trim()).toBe('500');
  });

  test('refuse special files an archive cannot contain', async () => {
    const source = join(await createRoot(), 'source');
    await mkdir(source);
    expect(Bun.spawnSync(['mkfifo', join(source, 'pipe')]).exitCode).toBe(0);

    await expect(listArchiveEntries({ sourcePath: source })).rejects.toThrow('pipe is a special file');
  });

  test('follow a linked source root, which the caller chose, while never following links inside it', async () => {
    const root = await createRoot();
    await mkdir(join(root, 'real'));
    await file(join(root, 'real', 'index.js'), 'export {}');
    await symlink('real', join(root, 'linked-root'));

    expect(await describeEntries(join(root, 'linked-root'))).toEqual(['index.js 644']);
  });
});
