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
      runDocker: async () => {
        generatedInitFileName = (await readdir(sourcePath)).find(
          (name) => name.startsWith('stp-init-') && name.endsWith('.gradle')
        );
        expect(generatedInitFileName).toBeDefined();
        throw buildFailure;
      }
    });

    await expect(operation).rejects.toBe(buildFailure);
    expect(await readFile(customerInitPath, 'utf8')).toBe('customer-owned');
    expect(await readdir(sourcePath)).not.toContain(generatedInitFileName);
  });
});
