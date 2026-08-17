import { afterEach, describe, expect, test } from 'bun:test';
import type { PackagingProgressLogger } from '../../runtime-contracts';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildJavaArtifact } from './index';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

const progressLogger: PackagingProgressLogger = {
  eventContext: {},
  startEvent: () => {},
  updateEvent: () => {},
  finishEvent: () => {}
};

describe('Java artifact build files', () => {
  test('preserves customer files and removes its unique Gradle init script after a build failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-java-build-'));
    temporaryDirectories.push(root);
    const sourcePath = join(root, 'service');
    const distFolderPath = join(root, 'dist');
    await mkdir(sourcePath);
    await writeFile(join(sourcePath, 'Handler.java'), 'public class Handler {}');
    const customerInitPath = join(sourcePath, 'stp-init.gradle');
    await writeFile(customerInitPath, 'customer-owned');
    const buildFailure = new Error('Docker build failed');
    let generatedInitFileName: string | undefined;

    const operation = buildJavaArtifact({
      name: 'handler',
      cwd: root,
      sourcePath,
      entryfilePath: 'Handler.java',
      rawEntryfilePath: 'Handler.java',
      distFolderPath,
      invocationId: 'test',
      existingDigests: [],
      languageSpecificConfig: {},
      progressLogger,
      createPackagingError: ({ message }) => new Error(message),
      runDocker: async (args) => {
        const dockerfilePath = args[args.indexOf('--file') + 1]!;
        const dockerfile = await readFile(dockerfilePath, 'utf8');
        generatedInitFileName = dockerfile.match(/--init-script ([^\s]+)/)?.[1];
        expect(generatedInitFileName).toStartWith('stp-init-');
        expect(await readFile(join(sourcePath, generatedInitFileName!), 'utf8')).toContain('stacktapeDist');
        throw buildFailure;
      }
    });

    await expect(operation).rejects.toBe(buildFailure);
    expect(await readFile(customerInitPath, 'utf8')).toBe('customer-owned');
    expect(await readdir(sourcePath)).not.toContain(generatedInitFileName);
  });

  test('removes its Gradle init script when writing the generated Dockerfile fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-java-build-'));
    temporaryDirectories.push(root);
    const sourcePath = join(root, 'service');
    const invalidDistFolderPath = join(root, 'dist');
    await mkdir(sourcePath);
    await writeFile(join(sourcePath, 'Handler.java'), 'public class Handler {}');
    await writeFile(invalidDistFolderPath, 'this is a file, not a directory');

    const operation = buildJavaArtifact({
      name: 'handler',
      cwd: root,
      sourcePath,
      entryfilePath: 'Handler.java',
      rawEntryfilePath: 'Handler.java',
      distFolderPath: invalidDistFolderPath,
      invocationId: 'test',
      existingDigests: [],
      languageSpecificConfig: {},
      progressLogger,
      createPackagingError: ({ message }) => new Error(message),
      runDocker: async () => {
        throw new Error('Docker should not run when the Dockerfile cannot be written.');
      }
    });

    await expect(operation).rejects.toBeInstanceOf(Error);
    expect((await readdir(sourcePath)).filter((fileName) => fileName.startsWith('stp-init-'))).toEqual([]);
  });
});
