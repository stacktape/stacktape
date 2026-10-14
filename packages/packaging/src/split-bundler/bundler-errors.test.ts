import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
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

const createTestPackagingError = (details: PackagingErrorDetails) =>
  new Error(details.message, details.cause === undefined ? undefined : { cause: details.cause });

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
    installDependencies: async () => {},
    createPackagingError
  });

describe('split bundle failure translation', () => {
  test('a missing entrypoint reports the original build diagnostics once', async () => {
    const { root } = await createFixture();
    const missingEntrypoint = join(root, 'src', 'missing.ts');
    const error = await runBuild({
      cwd: root,
      entryfilePath: missingEntrypoint,
      createPackagingError: createTestPackagingError
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toStartWith('Split bundle build failed:');
    expect((error as Error).message).toContain('missing.ts');
    expect((error as Error).message.match(/Split bundle/g)).toHaveLength(1);
  });

  test('preserves an unexpected Bun failure as the semantic error cause', async () => {
    const { root, entryfilePath } = await createFixture();
    const buildFailure = new Error('Bun could not start the build');
    const buildSpy = spyOn(Bun, 'build').mockRejectedValue(buildFailure);
    try {
      const error = await runBuild({ cwd: root, entryfilePath, createPackagingError: createTestPackagingError }).catch(
        (caught: unknown) => caught
      );
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toStartWith('Split bundle failed:');
      expect((error as Error).cause).toBe(buildFailure);
    } finally {
      buildSpy.mockRestore();
    }
  });
});

describe('split bundle entrypoint mapping', () => {
  test('maps same-named entry files by their exact canonical paths, through a linked directory too', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-split-bundle-entrypoints-'));
    temporaryDirectories.push(root);
    const apiDirectory = join(root, 'api');
    await mkdir(apiDirectory);
    const rootEntrypoint = join(root, 'handler.ts');
    // Configured through a symlink (a linked workspace package): Bun records the real file, the mapping must agree.
    await symlink(apiDirectory, join(root, 'linked-api'), process.platform === 'win32' ? 'junction' : 'dir');
    const apiEntrypoint = join(root, 'linked-api', 'handler.ts');
    await writeFile(rootEntrypoint, `export default async () => ({ source: 'root-handler' });`);
    await writeFile(apiEntrypoint, `export default async () => ({ source: 'api-handler' });`);

    const rootDist = join(root, 'dist', 'root-handler');
    const apiDist = join(root, 'dist', 'api-handler');
    await buildSplitBundle({
      entrypoints: [
        { name: 'root-handler', jobName: 'root-handler', entryfilePath: rootEntrypoint, distFolderPath: rootDist },
        { name: 'api-handler', jobName: 'api-handler', entryfilePath: apiEntrypoint, distFolderPath: apiDist }
      ],
      sharedOutdir: join(root, 'shared'),
      cwd: root,
      installDependencies: async () => {},
      createPackagingError: createTestPackagingError
    });

    for (const [directory, expected] of [
      [rootDist, 'root-handler'],
      [apiDist, 'api-handler']
    ] as const) {
      const execution = spawnSync(
        process.env.npm_node_execpath || 'node',
        [
          '--input-type=module',
          '--eval',
          `import handler from ${JSON.stringify(pathToFileURL(join(directory, 'index.js')).href)}; console.log(JSON.stringify(await handler()));`
        ],
        { cwd: root, encoding: 'utf8', timeout: 10_000 }
      );
      expect(execution.status, execution.stderr).toBe(0);
      expect(JSON.parse(execution.stdout)).toEqual({ source: expected });
    }
  });
});
