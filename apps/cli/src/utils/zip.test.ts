import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, readdir, readFile, readlink, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { EXECUTABLE_FILE_PATTERNS } from '../../scripts/release/build-cli-sources';
import * as tar from 'tar';
import yauzl from 'yauzl';
import { listArchiveEntries } from '@stacktape/packaging/artifact/archive-entries';
import { archiveItem, createArchive, writeZipWithArchiver } from './zip';
import { writeFully } from './zip-writer';

/** Links, execute bits, shell fixtures and unreadable files are POSIX fixtures; the portable tests run everywhere. */
const isPosix = process.platform !== 'win32';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

// Paths with spaces and quotes, as users' project directories can have. Windows forbids `"` in names.
const createRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), isPosix ? `stacktape zip "archive" 'test' ` : `stacktape zip 'test' `));
  roots.push(root);
  return root;
};

const file = async (path: string, contents: string, mode = 0o644) => {
  await writeFile(path, contents);
  await chmod(path, mode);
};

/** What an extractor restores from the archive, read with yauzl rather than Stacktape's own ZIP code. */
const readZip = (zipPath: string): Promise<Record<string, string>> =>
  new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openError, zipFile) => {
      if (openError || !zipFile) return reject(openError);
      const entries: Record<string, string> = {};
      zipFile.on('error', reject);
      zipFile.on('entry', (entry: yauzl.Entry) => {
        const mode = (entry.externalFileAttributes >>> 16).toString(8);
        zipFile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) return reject(streamError);
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => {
            const data = Buffer.concat(chunks).toString('utf8');
            entries[entry.fileName] = mode.startsWith('120')
              ? `${mode} -> ${data}`
              : entry.fileName.endsWith('/')
                ? mode
                : `${mode} ${data}`;
            zipFile.readEntry();
          });
        });
      });
      zipFile.on('end', () => resolve(entries));
      zipFile.readEntry();
    });
  });

/** A source any host can create: the executable carries `#!`, which Windows recognizes without execute bits. */
const createSource = async (root: string) => {
  const source = join(root, 'source dir');
  await mkdir(join(source, 'bin'), { recursive: true });
  await mkdir(join(source, 'empty'));
  await file(join(source, 'index.js'), 'export const handler = 1;');
  await file(join(source, '.hidden'), 'hidden');
  await file(join(source, 'private.txt'), 'private', 0o600);
  await file(join(source, 'bin', 'tool.sh'), '#!/bin/sh\necho tool\n', 0o755);
  return source;
};

describe('archiveItem', () => {
  test('refuses to write an archive inside the directory it archives', async () => {
    const root = await createRoot();
    const source = await createSource(root);

    await expect(
      archiveItem({ absoluteSourcePath: source, absoluteDestDirPath: join(source, 'bin'), format: 'zip' })
    ).rejects.toThrow('which is inside it');
  });

  test('gives release tarballs their pattern-only modes, whatever the host marks executable', async () => {
    const root = await createRoot();
    const source = join(root, 'release');
    await mkdir(join(source, 'docs'), { recursive: true });
    await mkdir(join(source, 'helper-lambdas'));
    await file(join(source, 'stacktape'), 'binary');
    await file(join(source, 'helper-lambdas', 'stacktape-supervisor'), '#!/bin/sh\necho supervisor-ready\n');
    // The release build marks every file executable on disk; only the patterns decide.
    await file(join(source, 'docs', 'readme.md'), 'docs', 0o755);

    const archivePath = await archiveItem({
      absoluteSourcePath: source,
      format: 'tgz',
      executablePatterns: EXECUTABLE_FILE_PATTERNS
    });

    const modes: Record<string, string> = {};
    await tar.t({ file: archivePath, onReadEntry: (entry) => (modes[entry.path] = (entry.mode! & 0o777).toString(8)) });
    expect(archivePath).toBe(`${source}.tar.gz`);
    expect(modes).toMatchObject({
      stacktape: '755',
      'helper-lambdas/stacktape-supervisor': '755',
      'docs/readme.md': '644'
    });
    if (isPosix) {
      const extracted = join(root, 'extracted');
      await mkdir(extracted);
      await tar.x({ file: archivePath, cwd: extracted });
      const result = spawnSync(join(extracted, 'helper-lambdas', 'stacktape-supervisor'), { encoding: 'utf8' });
      expect(result.status).toBe(0);
      expect(result.stdout.trim()).toBe('supervisor-ready');
    }
  });

  test('keeps the modification times of small and large files in an archive without a fixed time', async () => {
    const root = await createRoot();
    const source = join(root, 'source dir');
    await mkdir(source);
    await writeFile(join(source, 'small.js'), 'small');
    await writeFile(join(source, 'large.js'), ' '.repeat(70_000));
    const modified = new Date('2001-02-03T04:05:06Z');
    await Promise.all(['small.js', 'large.js'].map((name) => utimes(join(source, name), modified, modified)));

    const archivePath = await archiveItem({ absoluteSourcePath: source, format: 'zip' });

    const years = await new Promise<Record<string, number>>((resolve, reject) => {
      yauzl.open(archivePath, (error, zipFile) => {
        if (error || !zipFile) return reject(error);
        const found: Record<string, number> = {};
        zipFile.on('entry', (entry: yauzl.Entry) => (found[entry.fileName] = entry.getLastModDate().getFullYear()));
        zipFile.on('end', () => resolve(found));
        zipFile.on('error', reject);
      });
    });
    expect(years).toEqual({ 'small.js': 2001, 'large.js': 2001 });
  });
});

describe.if(isPosix)('archiveItem on POSIX hosts', () => {
  test.skipIf(!Bun.which('unzip'))(
    'links to what the kernel reads in the source, also after an absolute path through another link',
    async () => {
      const root = await createRoot();
      const source = join(root, 'source dir');
      await mkdir(join(source, 'versions', 'v2'), { recursive: true });
      await mkdir(join(source, 'nested'));
      await file(join(source, 'config.json'), 'root');
      await file(join(source, 'versions', 'config.json'), 'versions');
      await symlink('versions/v2', join(source, 'current'));
      // Concatenated on purpose: path.join would collapse the `..` before the link is followed.
      await symlink(`${source}/current/../config.json`, join(source, 'through-link'));
      await symlink(`${source}/versions/v2`, join(source, 'nested', 'absolute-current'));
      await symlink(`${source}/nested/absolute-current/../config.json`, join(source, 'nested', 'through-absolute'));

      const archivePath = await archiveItem({ absoluteSourcePath: source, format: 'zip' });
      const extracted = join(root, 'extracted');
      await mkdir(extracted);
      expect(Bun.spawnSync(['unzip', '-q', archivePath, '-d', extracted]).exitCode).toBe(0);

      for (const link of ['through-link', 'nested/through-absolute']) {
        expect(await readFile(join(source, link), 'utf8')).toBe('versions');
        expect(await readFile(join(extracted, link), 'utf8')).toBe('versions');
      }
    }
  );

  test('refuses a link leaving the source and keeps the previous archive at the destination', async () => {
    const root = await createRoot();
    const source = await createSource(root);
    const archivePath = await archiveItem({ absoluteSourcePath: source, format: 'zip' });
    const previous = await readFile(archivePath);
    await file(join(root, 'secret.txt'), 'outside the source');
    await symlink('../secret.txt', join(source, 'escape'));

    await expect(archiveItem({ absoluteSourcePath: source, format: 'zip' })).rejects.toThrow(
      'the symbolic link escape points to ../secret.txt, outside the archived directory'
    );
    expect(await readFile(archivePath)).toEqual(previous);
    expect((await readdir(root)).toSorted()).toEqual(['secret.txt', 'source dir', 'source dir.zip']);
  });

  test.skipIf(process.getuid?.() === 0)(
    'reports a file that cannot be read while archiving and leaves no partial archive behind',
    async () => {
      const root = await createRoot();
      const source = await createSource(root);
      const archivePath = await archiveItem({ absoluteSourcePath: source, format: 'zip' });
      const previous = await readFile(archivePath);
      await chmod(join(source, 'index.js'), 0o000);

      await expect(archiveItem({ absoluteSourcePath: source, format: 'zip' })).rejects.toThrow();
      expect(await readFile(archivePath)).toEqual(previous);
      expect((await readdir(root)).toSorted()).toEqual(['source dir', 'source dir.zip']);
    }
  );

  test.skipIf(process.getuid?.() === 0)(
    'fails rather than waits when a streamed file far into the archive cannot be read',
    async () => {
      const root = await createRoot();
      const source = join(root, 'source dir');
      await mkdir(source);
      await Promise.all(
        Array.from({ length: 300 }, (_, index) =>
          writeFile(join(source, `${String(index).padStart(3, '0')}.js`), ' '.repeat(70_000))
        )
      );
      await chmod(join(source, '250.js'), 0o000);
      const { entries } = await listArchiveEntries({ sourcePath: source, executablePatterns: [] });

      await expect(
        writeZipWithArchiver({ entries, outputPath: join(root, 'failed.zip'), compressionLevel: 1 })
      ).rejects.toThrow('EACCES');
    }
  );

  test.skipIf(process.getuid?.() === 0 || process.platform !== 'linux')(
    'opens no more files once a file early in the archive fails, and closes every one it opened',
    async () => {
      const root = await createRoot();
      const source = join(root, 'source dir');
      await mkdir(source);
      await Promise.all(
        Array.from({ length: 300 }, (_, index) =>
          writeFile(join(source, `${String(index).padStart(3, '0')}.js`), ' '.repeat(70_000))
        )
      );
      await chmod(join(source, '000.js'), 0o000);
      const { entries } = await listArchiveEntries({ sourcePath: source, executablePatterns: [] });
      const openSourceFiles = async () => {
        const targets = await Promise.all(
          (await readdir('/proc/self/fd')).map((fd) => readlink(join('/proc/self/fd', fd)).catch(() => ''))
        );
        return targets.filter((target) => target.startsWith(`${source}/`));
      };

      await expect(
        writeZipWithArchiver({ entries, outputPath: join(root, 'failed.zip'), compressionLevel: 1 })
      ).rejects.toThrow('EACCES');
      expect(await openSourceFiles()).toEqual([]);
      // A loop still appending after the failure would open further files the aborted archive never reads.
      await Bun.sleep(200);
      expect(await openSourceFiles()).toEqual([]);
    }
  );
});

describe('parallel ZIP writer', () => {
  test('writes the entries, modes, links and bytes archiver writes for the same source', async () => {
    const root = await createRoot();
    const source = await createSource(root);
    // Compressible and incompressible content: one is deflated, the other stored.
    await file(join(source, 'bundle.js'), 'export const value = "repeated text";\n'.repeat(2000));
    await writeFile(join(source, 'random.bin'), randomBytes(4096));
    if (isPosix) await symlink('bin/tool.sh', join(source, 'tool-link'));

    const parallel = await createArchive({
      absoluteSourcePath: source,
      absoluteDestDirPath: join(root, 'parallel'),
      format: 'zip',
      parallelZip: true
    });
    const archiver = await createArchive({
      absoluteSourcePath: source,
      absoluteDestDirPath: join(root, 'archiver'),
      format: 'zip'
    });

    expect(parallel.backend).toBe('parallel');
    expect(archiver.backend).toBe('archiver');
    expect(await readZip(parallel.path)).toEqual(await readZip(archiver.path));
    expect(Object.keys(await readZip(parallel.path)).toSorted()).toEqual([
      '.hidden',
      'bin/',
      'bin/tool.sh',
      'bundle.js',
      'empty/',
      'index.js',
      'private.txt',
      'random.bin',
      ...(isPosix ? ['tool-link'] : [])
    ]);
    if (Bun.which('unzip')) {
      expect(Bun.spawnSync(['unzip', '-tq', parallel.path]).exitCode).toBe(0);
    }
  });

  test('writes a directory with more entries than plain ZIP holds through the ZIP64 fallback', async () => {
    const root = await createRoot();
    const source = join(root, 'many');
    // 0x10000 entries: one more than a plain ZIP's entry count can say. Empty files keep the source cheap.
    await mkdir(join(source, 'files'), { recursive: true });
    for (let batch = 0; batch < 0x10000 - 2; batch += 4096) {
      await Promise.all(
        Array.from({ length: Math.min(4096, 0x10000 - 2 - batch) }, (_, index) =>
          writeFile(join(source, 'files', `f${batch + index}`), '')
        )
      );
    }
    await file(join(source, 'index.js'), 'export const handler = 1;');

    const archive = await createArchive({ absoluteSourcePath: source, format: 'zip', parallelZip: true });

    expect(archive.backend).toBe('archiver');
    const entries = await readZip(archive.path);
    expect(Object.keys(entries)).toHaveLength(0x10000);
    expect(entries['index.js']).toBe('100644 export const handler = 1;');
    expect((await readdir(root)).toSorted()).toEqual(['many', 'many.zip']);
  }, 60_000);

  test('keeps writing until every byte is written and reports a write that stops', async () => {
    const written: Buffer[] = [];
    // A file that takes at most three bytes per write, as a pipe or a full disk can.
    const shortWrites = {
      write: async (buffer: Buffer, offset = 0, length = buffer.length) => {
        const bytesWritten = Math.min(3, length);
        written.push(Buffer.from(buffer.subarray(offset, offset + bytesWritten)));
        return { bytesWritten, buffer };
      }
    };
    const content = Buffer.from('a buffer longer than one write');

    await writeFully(shortWrites as never, content);
    expect(Buffer.concat(written)).toEqual(content);

    const stalled = { write: async (buffer: Buffer) => ({ bytesWritten: 0, buffer }) };
    await expect(writeFully(stalled as never, content)).rejects.toThrow('stopped after 0 of 30 bytes');
  });
});
