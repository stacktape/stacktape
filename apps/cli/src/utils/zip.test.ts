import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import * as tar from 'tar';
import yauzl from 'yauzl';
import { archiveItem, createArchive } from './zip';
import { writeZip as writeParallelZip, ZipLimitError } from './zip-writer';

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
  test('refuses an archive that would replace the single file it archives', async () => {
    const root = await createRoot();
    await file(join(root, 'payload.zip'), 'an input whose name already ends in .zip');

    await expect(archiveItem({ absoluteSourcePath: join(root, 'payload.zip'), format: 'zip' })).rejects.toThrow(
      'the archive would replace the file it archives'
    );
    expect(await readFile(join(root, 'payload.zip'), 'utf8')).toBe('an input whose name already ends in .zip');
    expect(await readdir(root)).toEqual(['payload.zip']);
  });

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
    await file(join(source, 'stacktape'), 'binary');
    // The release build marks every file executable on disk; only the patterns decide.
    await file(join(source, 'docs', 'readme.md'), 'docs', 0o755);

    const archivePath = await archiveItem({
      absoluteSourcePath: source,
      format: 'tgz',
      executablePatterns: ['stacktape']
    });

    const modes: Record<string, string> = {};
    await tar.t({ file: archivePath, onReadEntry: (entry) => (modes[entry.path] = (entry.mode! & 0o777).toString(8)) });
    expect(archivePath).toBe(`${source}.tar.gz`);
    expect(modes).toMatchObject({ stacktape: '755', 'docs/readme.md': '644' });
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

  test('leaves archives that need ZIP64 to the fallback', async () => {
    const root = await createRoot();
    const entries = Array.from({ length: 0x10000 }, (_, index) => ({
      type: 'directory' as const,
      path: `d${index}`,
      mode: 0o755
    }));

    await expect(writeParallelZip({ entries, outputPath: join(root, 'many.zip'), level: 6 })).rejects.toBeInstanceOf(
      ZipLimitError
    );
    expect(await readdir(root)).toEqual([]);
  });
});
