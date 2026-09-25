import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import * as tar from 'tar';
import yauzl from 'yauzl';
import { archiveItem, createArchive } from './zip';

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
  test('archives hidden files and empty directories with modes Lambda can read and run', async () => {
    const root = await createRoot();
    const source = await createSource(root);

    const result = await createArchive({ absoluteSourcePath: source, format: 'zip' });

    expect(result).toEqual({ path: `${source}.zip`, backend: 'archiver' });
    expect(await readZip(result.path)).toEqual({
      '.hidden': '100644 hidden',
      'bin/': '40755',
      'bin/tool.sh': '100755 #!/bin/sh\necho tool\n',
      'empty/': '40755',
      'index.js': '100644 export const handler = 1;',
      'private.txt': '100644 private'
    });
  });

  test('keeps a single file executable and names the archive after it', async () => {
    const root = await createRoot();
    await file(join(root, 'bootstrap'), '#!/bin/sh\n', 0o755);

    const archivePath = await archiveItem({
      absoluteSourcePath: join(root, 'bootstrap'),
      format: 'zip',
      useNativeZip: true
    });

    expect(archivePath).toBe(join(root, 'bootstrap.zip'));
    expect(await readZip(archivePath)).toEqual({ bootstrap: '100755 #!/bin/sh\n' });
  });

  test('replaces an archive at the same destination without keeping entries removed from the source', async () => {
    const root = await createRoot();
    const source = await createSource(root);
    const destination = join(root, 'out dir');
    await archiveItem({ absoluteSourcePath: source, absoluteDestDirPath: destination, format: 'zip' });
    await rm(join(source, '.hidden'));

    const archivePath = await archiveItem({
      absoluteSourcePath: source,
      absoluteDestDirPath: destination,
      format: 'zip'
    });

    expect(Object.keys(await readZip(archivePath))).not.toContain('.hidden');
    expect(await readdir(destination)).toEqual(['source dir.zip']);
  });

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
  test('keeps links as links and stores an absolute link relative to its target', async () => {
    const root = await createRoot();
    const source = await createSource(root);
    await symlink('bin/tool.sh', join(source, 'tool'));
    await symlink(join(source, 'bin', 'tool.sh'), join(source, 'absolute-tool'));

    const entries = await readZip(await archiveItem({ absoluteSourcePath: source, format: 'zip' }));

    expect(entries.tool).toBe('120777 -> bin/tool.sh');
    expect(entries['absolute-tool']).toBe('120777 -> bin/tool.sh');
  });

  test('keeps the execute intent of group- or other-only executables through extraction and execution', async () => {
    const root = await createRoot();
    const source = await createSource(root);
    await file(join(source, 'bin', 'group-tool.sh'), '#!/bin/sh\necho group\n', 0o654);
    await file(join(source, 'bin', 'other-tool.sh'), '#!/bin/sh\necho other\n', 0o645);

    const archivePath = await archiveItem({ absoluteSourcePath: source, format: 'zip' });
    const entries = await readZip(archivePath);
    expect(entries['bin/group-tool.sh']).toStartWith('100755 ');
    expect(entries['bin/other-tool.sh']).toStartWith('100755 ');

    const extracted = join(root, 'extracted');
    await mkdir(extracted);
    expect(Bun.spawnSync(['unzip', '-q', archivePath, '-d', extracted]).exitCode).toBe(0);
    for (const [name, output] of [
      ['group-tool.sh', 'group'],
      ['other-tool.sh', 'other']
    ]) {
      expect(((await stat(join(extracted, 'bin', name!))).mode & 0o777).toString(8)).toBe('755');
      expect(
        Bun.spawnSync([join(extracted, 'bin', name!)])
          .stdout.toString()
          .trim()
      ).toBe(output!);
    }
  });

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

describe.if(isPosix)('native ZIP tool fallback and detection', () => {
  /**
   * Runs `script` in a fresh process whose PATH starts with a directory holding a fake `zip`. Its `--version` answers
   * like zip after logging the probe and a short delay, so concurrent first calls overlap; everything else runs
   * `onArchive`, the shell body standing in for the actual archiving.
   */
  const runWithFakeZip = async ({ root, onArchive, script }: { root: string; onArchive: string; script: string }) => {
    const toolDirectory = join(root, 'fake tools');
    await mkdir(toolDirectory);
    const probeLog = join(root, 'version-probes.log');
    await file(
      join(toolDirectory, 'zip'),
      // The log path is data in the environment, never shell text: it contains spaces and both kinds of quote.
      `#!/bin/sh\nif [ "$1" = "--version" ]; then echo probe >> "$STP_PROBE_LOG"; sleep 0.2; exit 0; fi\n${onArchive}`,
      0o755
    );
    const child = Bun.spawnSync([process.execPath, '-e', script], {
      env: { ...process.env, PATH: `${toolDirectory}${delimiter}${process.env.PATH}`, STP_PROBE_LOG: probeLog },
      stdout: 'pipe',
      stderr: 'pipe'
    });
    expect(child.exitCode, child.stderr.toString()).toBe(0);
    const probes = (await readFile(probeLog, 'utf8').catch(() => '')).split('\n').filter(Boolean).length;
    return { output: JSON.parse(child.stdout.toString().trim().split('\n').at(-1)!), probes };
  };

  const zipModule = JSON.stringify(join(import.meta.dir, 'zip.ts'));

  test.each([
    [
      'fails after writing part of an archive',
      'for argument in "$@"; do case "$argument" in *.zip) printf "PK partial" > "$argument";; esac; done\necho simulated failure >&2\nexit 12\n'
    ],
    [
      'reports success but writes something that is not the archive',
      'for argument in "$@"; do case "$argument" in *.zip) printf "not a zip" > "$argument";; esac; done\nexit 0\n'
    ]
  ])('falls back to archiver, and says so, when native zip %s', async (_case, onArchive) => {
    const root = await createRoot();
    const source = await createSource(root);

    const { output } = await runWithFakeZip({
      root,
      onArchive,
      script: `const { createArchive } = await import(${zipModule});
        console.log(JSON.stringify(await createArchive({ absoluteSourcePath: ${JSON.stringify(source)}, format: 'zip', useNativeZip: true })));`
    });

    expect(output.backend).toBe('archiver');
    expect(output.nativeFailure.tool).toBe('zip');
    expect(Object.keys(await readZip(output.path)).toSorted()).toEqual([
      '.hidden',
      'bin/',
      'bin/tool.sh',
      'empty/',
      'index.js',
      'private.txt'
    ]);
    expect((await readdir(root)).toSorted()).toEqual([
      'fake tools',
      'source dir',
      'source dir.zip',
      'version-probes.log'
    ]);
  });

  test('detects the native tool once for concurrent first archives, and every archive is complete', async () => {
    const root = await createRoot();
    const sources = await Promise.all(
      Array.from({ length: 8 }, async (_, index) => {
        const source = join(root, `source ${index}`);
        await mkdir(join(source, 'bin'), { recursive: true });
        await file(join(source, 'bin', 'tool.sh'), `#!/bin/sh\necho ${index}\n`, 0o755);
        return source;
      })
    );

    // The fake cannot archive, so every call also proves that a failed native attempt still yields a real archive.
    const { output, probes } = await runWithFakeZip({
      root,
      onArchive: 'exit 1\n',
      script: `const { createArchive } = await import(${zipModule});
        const sources = ${JSON.stringify(sources)};
        const results = await Promise.all(sources.map((absoluteSourcePath) => createArchive({ absoluteSourcePath, format: 'zip', useNativeZip: true })));
        console.log(JSON.stringify(results));`
    });

    expect(probes).toBe(1);
    expect(output).toHaveLength(8);
    for (const [index, result] of (output as { path: string; backend: string }[]).entries()) {
      expect(result.backend).toBe('archiver');
      expect((await readZip(result.path))['bin/tool.sh']).toBe(`100755 #!/bin/sh\necho ${index}\n`);
    }
  });
});
