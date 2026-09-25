import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getArchiveLayoutDigest,
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
  // Every executable fixture here starts with `#!`, which Windows recognizes without execute bits.
  test('keep hidden files and empty directories and normalize every mode to what Lambda can read', async () => {
    const source = join(await createRoot(), 'source');
    await mkdir(join(source, '.config'), { recursive: true });
    await mkdir(join(source, 'empty'));
    await mkdir(join(source, 'lib', 'nested'), { recursive: true });
    await file(join(source, '.config', 'settings.json'), '{}');
    await file(join(source, '.env'), 'A=1');
    await file(join(source, 'private.txt'), 'private', 0o600);
    await file(join(source, 'group-writable.txt'), 'shared', 0o664);
    await file(join(source, 'tool.sh'), '#!/bin/sh\necho tool\n', 0o755);
    await file(join(source, 'owner-only-tool'), '#!/bin/sh\necho owner\n', 0o700);
    await file(join(source, 'lib', 'nested', 'data.bin'), 'data');

    expect(await describeEntries(source)).toEqual([
      '.config/ 755',
      '.config/settings.json 644',
      '.env 644',
      'empty/ 755',
      'group-writable.txt 644',
      'lib/ 755',
      'lib/nested/ 755',
      'lib/nested/data.bin 644',
      'owner-only-tool 755',
      'private.txt 644',
      'tool.sh 755'
    ]);
  });

  test('name a single file after itself and keep its executable intent', async () => {
    const root = await createRoot();
    await file(join(root, 'tool'), '#!/bin/sh\n', 0o755);
    await file(join(root, 'notes.txt'), 'notes');
    // A custom runtime's entrypoint must be executable even when the host did not say so.
    await file(join(root, 'bootstrap'), 'binary');

    expect(await describeEntries(join(root, 'tool'))).toEqual(['tool 755']);
    expect(await describeEntries(join(root, 'notes.txt'))).toEqual(['notes.txt 644']);
    expect(await describeEntries(join(root, 'bootstrap'))).toEqual(['bootstrap 755']);
  });

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

  test('describe layout changes, not content changes, in the layout digest', async () => {
    const source = join(await createRoot(), 'source');
    await mkdir(source);
    await file(join(source, 'tool.sh'), 'first');
    const digest = async () => getArchiveLayoutDigest((await listArchiveEntries({ sourcePath: source })).entries);

    const initial = await digest();
    await file(join(source, 'tool.sh'), 'changed contents, same layout');
    expect(await digest()).toBe(initial);

    await file(join(source, 'other.txt'), 'another entry');
    expect(await digest()).not.toBe(initial);
  });
});

describe.if(isPosix)('archive entries on POSIX hosts', () => {
  test('treat any execute bit as executable intent, as Lambda runs code as another user', async () => {
    const source = join(await createRoot(), 'source');
    await mkdir(source);
    // No `#!` headers: only the mode says these are executable.
    await file(join(source, 'group-only'), 'binary', 0o654);
    await file(join(source, 'other-only'), 'binary', 0o645);
    await file(join(source, 'owner-only'), 'binary', 0o744);
    await file(join(source, 'none'), 'binary', 0o644);

    expect(await describeEntries(source)).toEqual(['group-only 755', 'none 644', 'other-only 755', 'owner-only 755']);
    expect(hasHostExecutableBit(0o610, 'linux')).toBe(true);
    expect(hasHostExecutableBit(0o601, 'linux')).toBe(true);
    expect(hasHostExecutableBit(0o666, 'linux')).toBe(false);
  });

  test('change the layout digest when only an execute bit changes, and not when a normalized bit does', async () => {
    const source = join(await createRoot(), 'source');
    await mkdir(source);
    await file(join(source, 'tool.sh'), 'same bytes');
    await symlink('tool.sh', join(source, 'link'));
    const digest = async () => getArchiveLayoutDigest((await listArchiveEntries({ sourcePath: source })).entries);

    const initial = await digest();
    await chmod(join(source, 'tool.sh'), 0o654);
    const groupExecutable = await digest();
    expect(groupExecutable).not.toBe(initial);

    // Another executable mode normalizes to the same 0755, so the layout is the same.
    await chmod(join(source, 'tool.sh'), 0o775);
    expect(await digest()).toBe(groupExecutable);

    await rm(join(source, 'link'));
    await file(join(source, 'other.txt'), 'other');
    await symlink('other.txt', join(source, 'link'));
    expect(await digest()).not.toBe(groupExecutable);
  });

  test('keep relative links inside the directory as links, including links through other links', async () => {
    const source = join(await createRoot(), 'source');
    await mkdir(join(source, 'versions', 'v2'), { recursive: true });
    await file(join(source, 'versions', 'v2', 'tool.sh'), '#!/bin/sh\n', 0o755);
    await symlink('versions/v2', join(source, 'current'));
    await symlink('current/tool.sh', join(source, 'tool'));
    await symlink('../current/tool.sh', join(source, 'versions', 'tool-in-parent'));
    await symlink('versions/v2/', join(source, 'directory-with-slash'));
    await symlink('current/.', join(source, 'directory-with-dot'));

    expect(await describeEntries(source)).toEqual([
      'current -> versions/v2',
      'directory-with-dot -> current/.',
      'directory-with-slash -> versions/v2/',
      'tool -> current/tool.sh',
      'versions/ 755',
      'versions/tool-in-parent -> ../current/tool.sh',
      'versions/v2/ 755',
      'versions/v2/tool.sh 755'
    ]);
  });

  test('store an absolute link inside the directory relative to the entry it resolves to', async () => {
    const source = join(await createRoot(), 'source');
    await mkdir(join(source, 'versions', 'v2'), { recursive: true });
    await mkdir(join(source, 'nested'));
    await file(join(source, 'versions', 'v2', 'tool.sh'), '#!/bin/sh\n', 0o755);
    // Windows junctions and some tools write absolute targets even when the target is part of the same tree.
    await symlink(`${source}/versions/v2`, join(source, 'current'));
    await symlink(`${source}/current/tool.sh`, join(source, 'nested', 'tool'));

    expect(await describeEntries(source)).toEqual([
      'current -> versions/v2',
      'nested/ 755',
      'nested/tool -> ../versions/v2/tool.sh',
      'versions/ 755',
      'versions/v2/ 755',
      'versions/v2/tool.sh 755'
    ]);
  });

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
