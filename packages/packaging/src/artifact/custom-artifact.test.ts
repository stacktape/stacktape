import { afterEach, describe, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import objectHash from 'object-hash';
import { getFileHash } from '../fs/files';
import { buildUsingCustomArtifact } from './custom-artifact';
import { getDirectoryChecksum, mergeHashes } from './hashing';
import type { ArchiveItem } from '../runtime-contracts';

const roots: string[] = [];
const progressLogger = { eventContext: {}, startEvent: () => {}, updateEvent: () => {}, finishEvent: () => {} };

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { force: true, recursive: true })));
  roots.length = 0;
});

const createArchive: ArchiveItem = async ({ absoluteDestDirPath }) => {
  if (!absoluteDestDirPath) throw new Error('Test archive destination is required.');
  const archivePath = join(absoluteDestDirPath, `artifact-${crypto.randomUUID()}.zip`);
  await writeFile(archivePath, 'zip');
  return archivePath;
};

describe('custom Lambda artifacts', () => {
  test('changes cache identity when any exactly packaged directory file changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-custom-artifact-'));
    roots.push(root);
    const packagePath = join(root, 'package');
    const distFolderPath = join(root, 'dist');
    await Promise.all([
      mkdir(join(packagePath, 'node_modules', 'runtime'), { recursive: true }),
      mkdir(distFolderPath)
    ]);
    const dependencyPath = join(packagePath, 'node_modules', 'runtime', 'index.js');
    await Promise.all([
      writeFile(join(packagePath, 'index.js'), 'exports.handler = () => 1'),
      writeFile(dependencyPath, 'one')
    ]);

    const build = () =>
      buildUsingCustomArtifact({
        name: 'custom',
        cwd: root,
        packagePath,
        handler: 'index.handler',
        distFolderPath,
        existingDigests: [],
        progressLogger,
        archiveItem: createArchive,
        createPackagingError: ({ message }) => new Error(message)
      });
    const first = await build();
    await writeFile(dependencyPath, 'two');
    const changed = await build();

    expect(changed.digest).not.toBe(first.digest);
  });

  test('keeps cache identity when the same bytes are built from a different directory', async () => {
    /*
     * Next.js and SSR web functions reach this builder with a `packagePath` under
     * `.stacktape/build/<invocationId>/…`, and the invocation id is a fresh timestamp and uuid per CLI
     * process. Hashing the path therefore produced a different digest on every single run, so those
     * artifacts — the largest Lambda zips Stacktape makes — were rebuilt, re-zipped and re-uploaded on
     * every deploy. The same hash also cost every custom artifact its cache whenever the checkout moved,
     * which contradicts a shared cross-machine cache.
     *
     * Identity must come from the bytes, not from where the build happened to put them.
     */
    const buildIn = async (marker: string) => {
      const root = await mkdtemp(join(tmpdir(), `stacktape-custom-artifact-${marker}-`));
      roots.push(root);
      // Stands in for the per-invocation build directory the web builders pass through.
      const packagePath = join(root, `invocation-${marker}`, 'server-function');
      const distFolderPath = join(root, 'dist');
      await Promise.all([mkdir(packagePath, { recursive: true }), mkdir(distFolderPath)]);
      await writeFile(join(packagePath, 'index.js'), 'exports.handler = () => 1');

      return buildUsingCustomArtifact({
        name: 'custom',
        cwd: root,
        packagePath,
        handler: 'index.handler',
        distFolderPath,
        existingDigests: [],
        progressLogger,
        archiveItem: createArchive,
        createPackagingError: ({ message }) => new Error(message)
      });
    };

    const [first, second] = await Promise.all([buildIn('one'), buildIn('two')]);

    expect(second.digest).toBe(first.digest);
  });

  describe('archive identity', () => {
    const buildCustom = ({ root, packagePath }: { root: string; packagePath: string }) =>
      buildUsingCustomArtifact({
        name: 'custom',
        cwd: root,
        packagePath,
        handler: 'bootstrap.handler',
        distFolderPath: join(root, 'dist'),
        existingDigests: [],
        progressLogger,
        archiveItem: createArchive,
        createPackagingError: ({ message }) => new Error(message)
      });

    const createPackage = async () => {
      const root = await mkdtemp(join(tmpdir(), 'stacktape-custom-artifact-identity-'));
      roots.push(root);
      const packagePath = join(root, 'package');
      await Promise.all([mkdir(join(packagePath, 'bin'), { recursive: true }), mkdir(join(root, 'dist'))]);
      await Promise.all([
        writeFile(join(packagePath, 'bootstrap'), '#!/bin/sh\n'),
        writeFile(join(packagePath, 'bin', 'tool'), '#!/bin/sh\necho tool\n')
      ]);
      return { root, packagePath };
    };

    // Windows has no execute bit to change: there the archive reads executable intent from contents, which the identity
    // covers through the layout digest.
    test.skipIf(process.platform === 'win32')('changes when only a file becomes executable', async () => {
      const fixture = await createPackage();
      const first = await buildCustom(fixture);
      await chmod(join(fixture.packagePath, 'bin', 'tool'), 0o755);

      expect((await buildCustom(fixture)).digest).not.toBe(first.digest);
    });

    test('differs from the identity a directory had before Lambda archives had a format', async () => {
      const fixture = await createPackage();
      // The identity before this format: directory checksum, handler and additional input only.
      const previousFormula = mergeHashes(
        await getDirectoryChecksum({ absoluteDirectoryPath: fixture.packagePath }),
        objectHash({ handler: 'bootstrap.handler' }),
        ''
      );

      expect((await buildCustom(fixture)).digest).not.toBe(previousFormula);
    });

    test('keeps a prebuilt ZIP identified by its bytes alone, because it is uploaded unchanged', async () => {
      const root = await mkdtemp(join(tmpdir(), 'stacktape-custom-artifact-prebuilt-'));
      roots.push(root);
      const zipPath = join(root, 'prebuilt.zip');
      await Promise.all([writeFile(zipPath, 'prebuilt zip bytes'), mkdir(join(root, 'dist'))]);
      // The mode of a prebuilt ZIP file says nothing about the entries inside it.
      await chmod(zipPath, 0o755);
      // Its identity from before Lambda archives had a format, so the object already uploaded is still reused.
      const previousFormula = mergeHashes(await getFileHash(zipPath), objectHash({ handler: 'bootstrap.handler' }), '');

      const result = await buildUsingCustomArtifact({
        name: 'custom',
        cwd: root,
        packagePath: zipPath,
        handler: 'bootstrap.handler',
        distFolderPath: join(root, 'dist'),
        existingDigests: [previousFormula],
        progressLogger,
        archiveItem: createArchive,
        createPackagingError: ({ message }) => new Error(message)
      });

      expect(result).toMatchObject({ outcome: 'skipped', digest: previousFormula });
    });

    // A file symlink needs extra privileges on Windows.
    test.skipIf(process.platform === 'win32')(
      'refuses a link that leaves the package before hashing or zipping through it',
      async () => {
        const fixture = await createPackage();
        await writeFile(join(fixture.root, 'outside.txt'), 'outside');
        await symlink('../outside.txt', join(fixture.packagePath, 'escape'));

        await expect(buildCustom(fixture)).rejects.toThrow('the symbolic link escape points to ../outside.txt');
      }
    );
  });

  test('fails clearly when the configured package does not exist', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-missing-custom-artifact-'));
    roots.push(root);

    await expect(
      buildUsingCustomArtifact({
        name: 'custom',
        cwd: root,
        packagePath: 'missing.zip',
        handler: 'index.handler',
        distFolderPath: join(root, 'dist'),
        existingDigests: [],
        progressLogger,
        archiveItem: createArchive,
        createPackagingError: ({ message }) => new Error(message)
      })
    ).rejects.toThrow('Custom Lambda package was not found');
  });
});
