import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSplitBundle } from './bundler';
import type { PackagingErrorDetails } from './types';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

const createFixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-split-bundle-error-'));
  temporaryDirectories.push(root);
  const sourceDirectory = join(root, 'src');
  await mkdir(sourceDirectory);
  const entryfilePath = join(sourceDirectory, 'handler.ts');
  await writeFile(entryfilePath, 'export default async () => ({ statusCode: 200 });');
  return { root, entryfilePath };
};

const runBuild = async ({
  cwd,
  entryfilePath,
  sharedOutdir = join(cwd, 'shared'),
  createPackagingError
}: {
  cwd: string;
  entryfilePath: string;
  sharedOutdir?: string;
  createPackagingError: (details: PackagingErrorDetails) => Error;
}) =>
  buildSplitBundle({
    entrypoints: [
      {
        name: 'handler',
        jobName: 'handler',
        entryfilePath,
        distFolderPath: join(cwd, 'dist', 'handler')
      }
    ],
    sharedOutdir,
    cwd,
    nodeTarget: '22',
    installDependencies: async () => {},
    createPackagingError
  });

describe('split bundle failure translation', () => {
  test('creates one semantic error for build diagnostics', async () => {
    const { root } = await createFixture();
    const detailsSeen: PackagingErrorDetails[] = [];
    const errorsCreated: Error[] = [];
    const createPackagingError = (details: PackagingErrorDetails) => {
      detailsSeen.push(details);
      const error = new Error(details.message, details.cause === undefined ? undefined : { cause: details.cause });
      errorsCreated.push(error);
      return error;
    };

    const missingEntrypoint = join(root, 'src', 'missing.ts');
    const error = await runBuild({ cwd: root, entryfilePath: missingEntrypoint, createPackagingError }).catch(
      (caught: unknown) => caught
    );

    expect(errorsCreated).toHaveLength(1);
    expect(error).toBe(errorsCreated[0]);
    expect(detailsSeen[0]?.message).toStartWith('Split bundle build failed:');
    expect(detailsSeen[0]?.message).not.toContain('Split bundle failed: Split bundle build failed:');
  });

  test('preserves an unexpected Bun failure as the semantic error cause', async () => {
    const { root, entryfilePath } = await createFixture();
    const buildFailure = new Error('Bun could not start the build');
    const buildSpy = spyOn(Bun, 'build').mockRejectedValue(buildFailure);
    const detailsSeen: PackagingErrorDetails[] = [];
    const createPackagingError = (details: PackagingErrorDetails) => {
      detailsSeen.push(details);
      return new Error(details.message, details.cause === undefined ? undefined : { cause: details.cause });
    };

    const error = await runBuild({ cwd: root, entryfilePath, createPackagingError }).catch((caught: unknown) => caught);
    buildSpy.mockRestore();

    expect(error).toBeInstanceOf(Error);
    expect(detailsSeen).toHaveLength(1);
    expect(detailsSeen[0]?.message).toStartWith('Split bundle failed:');
    expect(detailsSeen[0]?.cause).toBe(buildFailure);
    expect((error as Error).cause).toBe(buildFailure);
  });
});
