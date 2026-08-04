import { afterEach, describe, expect, test } from 'bun:test';
import type { PackagingProgressLogger } from '../../runtime-contracts';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEsBundle, removeExplicitlyExcludedFiles } from './index';

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

describe('ECMAScript deployment-package file selection', () => {
  test('removes excluded files after explicitly included files are copied', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'stacktape-es-files-'));
    temporaryDirectories.push(cwd);
    const assetDirectory = join(cwd, 'assets');
    const distFolderPath = join(cwd, '.stacktape', 'dist');
    await mkdir(assetDirectory);
    await Promise.all([
      writeFile(join(cwd, 'handler.ts'), 'export default async () => ({ statusCode: 200 });'),
      writeFile(join(assetDirectory, 'public.txt'), 'public'),
      writeFile(join(assetDirectory, 'credentials.secret'), 'secret')
    ]);

    const result = await createEsBundle({
      name: 'handler',
      cwd,
      entryfilePath: join(cwd, 'handler.ts'),
      distFolderPath,
      existingDigests: [],
      invocationId: 'test',
      progressLogger,
      minify: false,
      nodeTarget: '24',
      sourceMaps: 'disabled',
      sourceMapBannerType: 'disabled',
      includeFiles: ['assets/**'],
      excludeFiles: ['**/*.secret'],
      installNonStaticallyBuiltDepsInDocker: false,
      nativeDependencyInstallationRootPath: join(cwd, '.stacktape', 'native'),
      installDependencies: async () => {},
      runDocker: async () => {
        throw new Error('Docker should not be needed for this bundle.');
      },
      createPackagingError: ({ message, cause }) => new Error(message, cause === undefined ? undefined : { cause })
    });

    expect(await Bun.file(join(distFolderPath, 'assets', 'public.txt')).text()).toBe('public');
    expect(await Bun.file(join(distFolderPath, 'assets', 'credentials.secret')).exists()).toBe(false);
    expect(await Bun.file(join(distFolderPath, 'index.js')).exists()).toBe(true);
    expect(result.sourceFiles.some(({ path }) => path.endsWith('credentials.secret'))).toBe(false);
  });

  test('does not follow an artifact directory symlink while applying exclusions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-es-exclusion-link-'));
    temporaryDirectories.push(root);
    const outputDirectory = join(root, 'artifact');
    const externalDirectory = join(root, 'external');
    await Promise.all([mkdir(outputDirectory), mkdir(externalDirectory)]);
    const sentinelPath = join(externalDirectory, 'sentinel.secret');
    await writeFile(sentinelPath, 'must survive');
    await symlink(
      externalDirectory,
      join(outputDirectory, 'linked-dir'),
      process.platform === 'win32' ? 'junction' : 'dir'
    );

    await removeExplicitlyExcludedFiles({
      createPackagingError: ({ message }) => new Error(message),
      excludeFiles: ['**/*.secret'],
      outputDirectory
    });

    expect(await Bun.file(sentinelPath).text()).toBe('must survive');
  });
});
