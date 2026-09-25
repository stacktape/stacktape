import { afterEach, describe, expect, test } from 'bun:test';
import type { PackagingProgressLogger } from '../runtime-contracts';
import { chmod, cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listArchiveEntries } from '../artifact/archive-entries';
import { STACKTAPE_LANGUAGE_SOURCE_GLOBS } from '../artifact/language-build-context';
import { buildUsingStacktapeRbLambdaBuildpack } from '../buildpacks/stacktape-rb-lambda-buildpack';
import { getHashFromMultipleFiles } from '../fs/files';
import { STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION } from './constants';
import { getBundleDigestFromGlobs } from './digest';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

/**
 * Runs `operation` as if on `platform`, so the host's executable rule can be exercised on one machine. Only code that
 * reads `process.platform` while running notices; this is not native Windows qualification.
 */
const withPlatform = async <T>(platform: NodeJS.Platform, operation: () => Promise<T>): Promise<T> => {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
  Object.defineProperty(process, 'platform', { ...descriptor, value: platform });
  try {
    return await operation();
  } finally {
    Object.defineProperty(process, 'platform', descriptor);
  }
};

describe('source-set bundle digest', () => {
  test('is independent of source enumeration order', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'stacktape-source-digest-'));
    temporaryDirectories.push(rootPath);
    await Promise.all([writeFile(join(rootPath, 'alpha.ts'), 'alpha'), writeFile(join(rootPath, 'beta.ts'), 'beta')]);

    const getDigest = (extraFiles: string[]) =>
      getBundleDigestFromGlobs({
        rootPath,
        fileGlobs: [],
        extraFiles,
        rawEntryfilePath: 'alpha.ts'
      });

    expect(await getDigest(['alpha.ts', 'beta.ts'])).toBe(await getDigest(['beta.ts', 'alpha.ts']));
  });

  test('invalidates a language artifact when a non-code runtime asset changes', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'stacktape-source-assets-'));
    temporaryDirectories.push(rootPath);
    await Promise.all([
      writeFile(join(rootPath, 'handler.py'), 'def handler(event, context): return {}'),
      writeFile(join(rootPath, 'template.html'), '<h1>first</h1>')
    ]);
    const getDigest = () =>
      getBundleDigestFromGlobs({
        rootPath,
        fileGlobs: STACKTAPE_LANGUAGE_SOURCE_GLOBS,
        rawEntryfilePath: 'handler.py'
      });

    const first = await getDigest();
    await writeFile(join(rootPath, 'template.html'), '<h1>other</h1>');
    expect(await getDigest()).not.toBe(first);
  });

  test('does not make artifacts depend on VCS or Stacktape working state', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'stacktape-source-state-'));
    temporaryDirectories.push(rootPath);
    await Promise.all([mkdir(join(rootPath, '.git')), mkdir(join(rootPath, '.stacktape'))]);
    await writeFile(join(rootPath, 'handler.rb'), 'puts :ok');
    const getDigest = () =>
      getBundleDigestFromGlobs({
        rootPath,
        fileGlobs: STACKTAPE_LANGUAGE_SOURCE_GLOBS,
        rawEntryfilePath: 'handler.rb'
      });

    const first = await getDigest();
    await Promise.all([
      writeFile(join(rootPath, '.git', 'HEAD'), 'changed'),
      writeFile(join(rootPath, '.stacktape', 'local-cache'), 'changed')
    ]);
    expect(await getDigest()).toBe(first);
  });

  // The chmod-only part needs execute bits, which Windows files do not have.
  test.skipIf(process.platform === 'win32')(
    'adds the Lambda archive format and executable bits for Lambda ZIPs and leaves image digests as they were',
    async () => {
      const rootPath = await mkdtemp(join(tmpdir(), 'stacktape-source-lambda-zip-'));
      temporaryDirectories.push(rootPath);
      await Promise.all([
        writeFile(join(rootPath, 'handler.py'), 'def handler(event, context): return {}'),
        writeFile(join(rootPath, 'tool.sh'), '#!/bin/sh\necho tool\n')
      ]);
      const files = ['handler.py', 'tool.sh'];
      const getDigest = (lambdaZip?: boolean) =>
        getBundleDigestFromGlobs({
          rootPath,
          fileGlobs: [],
          extraFiles: files,
          rawEntryfilePath: 'handler.py',
          lambdaZip
        });
      // The digest before Lambda ZIPs had a format: contents with their identities, buildpack version, entry file.
      const imageFormula = async () =>
        (
          await getHashFromMultipleFiles({
            files: files.map((file) => ({ path: join(rootPath, file), identity: file }))
          })
        )
          .update(`stacktape-buildpack:${STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION}`)
          .update('handler.py')
          .digest('hex');

      const image = await getDigest();
      const lambda = await getDigest(true);
      expect(image).toBe(await imageFormula());
      expect(lambda).not.toBe(image);

      await chmod(join(rootPath, 'tool.sh'), 0o755);
      expect(await getDigest()).toBe(image);
      expect(await getDigest(true)).not.toBe(lambda);
    }
  );

  test('keeps identical bytes apart between the POSIX and Windows executable rules', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'stacktape-source-executable-rule-'));
    temporaryDirectories.push(rootPath);
    await Promise.all([
      writeFile(join(rootPath, 'handler.py'), 'def handler(event, context): return {}'),
      writeFile(join(rootPath, 'tool.sh'), '#!/bin/sh\necho tool\n')
    ]);
    await chmod(join(rootPath, 'tool.sh'), 0o644);
    const getDigest = (lambdaZip?: boolean) =>
      getBundleDigestFromGlobs({
        rootPath,
        fileGlobs: [],
        extraFiles: ['handler.py', 'tool.sh'],
        rawEntryfilePath: 'handler.py',
        lambdaZip
      });
    const toolMode = async (platform: NodeJS.Platform) =>
      (await listArchiveEntries({ sourcePath: rootPath, platform })).entries.find(({ path }) => path === 'tool.sh')
        ?.mode;

    // The same bytes become different archives: Linux reads the missing execute bit, Windows reads the `#!` header.
    expect(await toolMode('linux')).toBe(0o644);
    expect(await toolMode('win32')).toBe(0o755);
    expect(await withPlatform('win32', () => getDigest(true))).not.toBe(
      await withPlatform('linux', () => getDigest(true))
    );
    expect(await withPlatform('win32', () => getDigest())).toBe(await withPlatform('linux', () => getDigest()));
  });

  test('makes a Lambda buildpack rebuild, not reuse, what the other executable rule built from the same bytes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-ruby-executable-rule-'));
    temporaryDirectories.push(root);
    const sourcePath = join(root, 'service');
    await mkdir(join(sourcePath, 'bin'), { recursive: true });
    await Promise.all([
      writeFile(join(sourcePath, 'Gemfile'), "source 'https://rubygems.org'\n"),
      writeFile(join(sourcePath, 'handler.rb'), 'def handler(event:, context:) = {}\n'),
      writeFile(join(sourcePath, 'bin', 'tool'), '#!/bin/sh\necho tool\n')
    ]);
    await chmod(join(sourcePath, 'bin', 'tool'), 0o644);
    const progressLogger: PackagingProgressLogger = {
      eventContext: {},
      startEvent: () => {},
      updateEvent: () => {},
      finishEvent: () => {}
    };

    const build = (platform: NodeJS.Platform, existingDigests: string[]) =>
      withPlatform(platform, async () => {
        let archivedToolMode: number | undefined;
        const { outcome, digest } = await buildUsingStacktapeRbLambdaBuildpack({
          name: 'handler',
          cwd: root,
          entryfilePath: join(sourcePath, 'handler.rb'),
          distFolderPath: join(root, 'dist', 'handler'),
          invocationId: 'test',
          existingDigests,
          progressLogger,
          createPackagingError: ({ message }) => new Error(message),
          // Docker's local exporter for an artifact without gems: the build context becomes the artifact.
          runDocker: async (args) => {
            const destination = args
              .find((arg) => arg.startsWith('type=local,dest='))!
              .slice('type=local,dest='.length);
            await cp(args.at(-1)!, destination, { recursive: true });
            return { stdout: '', stderr: '', exitCode: 0 };
          },
          // Stands in for the CLI's ZIP writer, which archives exactly these policy entries.
          archiveItem: async ({ absoluteSourcePath }) => {
            const { entries } = await listArchiveEntries({ sourcePath: absoluteSourcePath });
            archivedToolMode = entries.find(({ path }) => path === 'bin/tool')?.mode;
            await writeFile(`${absoluteSourcePath}.zip`, JSON.stringify(entries));
            return `${absoluteSourcePath}.zip`;
          }
        });
        return { outcome, digest, archivedToolMode };
      });

    const posix = await build('linux', []);
    expect(posix).toMatchObject({ outcome: 'bundled', archivedToolMode: 0o644 });
    const windows = await build('win32', [posix.digest]);
    expect(windows).toMatchObject({ outcome: 'bundled', archivedToolMode: 0o755 });
    expect(windows.digest).not.toBe(posix.digest);
    expect(await build('win32', [posix.digest, windows.digest])).toEqual({
      outcome: 'skipped',
      digest: windows.digest,
      archivedToolMode: undefined
    });
    expect(await build('linux', [windows.digest])).toMatchObject({ outcome: 'bundled', digest: posix.digest });
    expect(await build('linux', [posix.digest])).toMatchObject({ outcome: 'skipped', digest: posix.digest });
  });

  test('does not hash local Node dependencies that non-ECMAScript buildpacks never ship', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'stacktape-source-node-modules-'));
    temporaryDirectories.push(rootPath);
    await mkdir(join(rootPath, 'node_modules', 'local-only'), { recursive: true });
    await Promise.all([
      writeFile(join(rootPath, 'handler.py'), 'def handler(): return 1'),
      writeFile(join(rootPath, 'node_modules', 'local-only', 'index.js'), 'first')
    ]);
    const getDigest = () => getBundleDigestFromGlobs({ rootPath, fileGlobs: STACKTAPE_LANGUAGE_SOURCE_GLOBS });

    const first = await getDigest();
    await writeFile(join(rootPath, 'node_modules', 'local-only', 'index.js'), 'second');
    expect(await getDigest()).toBe(first);
  });
});
