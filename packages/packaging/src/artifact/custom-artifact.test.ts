import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildUsingCustomArtifact } from './custom-artifact';
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
