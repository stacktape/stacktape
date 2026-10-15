/*
 * What a per-Lambda ES deployment package contains and how it is identified, through the real `createEsBundle`:
 * the files the customer includes and excludes, the source map a ZIP ships, the handler contract the Lambda runtime
 * loads, and the digest that decides whether a cached artifact is reused.
 */
import { afterEach, describe, expect, test } from 'bun:test';
import type { PackagingProgressLogger } from '../../runtime-contracts';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { removeExplicitlyExcludedFiles } from '../../artifact/file-selection';
import { createEsBundle } from './index';

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

const createProject = async (sources: Record<string, string>) => {
  const cwd = await mkdtemp(join(tmpdir(), 'stacktape-es-files-'));
  temporaryDirectories.push(cwd);
  await writeFile(join(cwd, 'package.json'), JSON.stringify({ name: 'lambda-package-fixture', private: true }));
  await Promise.all(
    Object.entries(sources).map(async ([path, contents]) => {
      await mkdir(join(cwd, path, '..'), { recursive: true });
      await writeFile(join(cwd, path), contents);
    })
  );
  return cwd;
};

/** The production buildpack call for one Lambda ZIP, with Docker refused: nothing here may need it. */
const bundle = (cwd: string, options: Partial<Parameters<typeof createEsBundle>[0]> = {}) =>
  createEsBundle({
    name: 'handler',
    cwd,
    entryfilePath: join(cwd, 'handler.ts'),
    distFolderPath: join(cwd, '.stacktape', 'dist'),
    existingDigests: [],
    invocationId: 'test',
    progressLogger,
    minify: false,
    nodeTarget: '24',
    sourceMaps: 'external',
    sourceMapBannerType: 'pre-compiled',
    isLambda: true,
    lambdaZip: true,
    packageExternalDependencies: false,
    nativeDependencyInstallationRootPath: join(cwd, '.stacktape', 'native'),
    installDependencies: async () => {},
    runDocker: async () => {
      throw new Error('Docker should not be needed for this bundle.');
    },
    createPackagingError: ({ message, cause }) => new Error(message, cause === undefined ? undefined : { cause }),
    ...options
  });

const runNode = (script: string, cwd: string) =>
  spawnSync(process.env.npm_node_execpath || 'node', ['--input-type=module', '--eval', script], {
    cwd,
    encoding: 'utf8',
    timeout: 10_000
  });

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
      packageExternalDependencies: false,
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

  test('an exclusion also removes files the build itself produced', async () => {
    // Included files are filtered before they are copied; the bundle's own outputs are only ever removed afterwards.
    const cwd = await createProject({ 'handler.ts': 'export default async () => ({ statusCode: 200 });' });

    const result = await bundle(cwd, { excludeFiles: ['**/*.map'] });

    expect(await Bun.file(result.distIndexFilePath).exists()).toBe(true);
    expect(await Bun.file(`${result.distIndexFilePath}.map`).exists()).toBe(false);
  });
});

describe('the source map a Lambda ZIP ships', () => {
  test('names the original file without carrying its text', async () => {
    const cwd = await createProject({ 'handler.ts': 'export default async () => ({ statusCode: 200 });' });

    const result = await bundle(cwd);
    const map = JSON.parse(await Bun.file(`${result.distIndexFilePath}.map`).text()) as {
      sources: string[];
      sourcesContent?: unknown;
    };

    expect(map.sources).toContain('handler.ts');
    expect(map).not.toHaveProperty('sourcesContent');
  });
});

describe('the handler the Lambda runtime loads', () => {
  test('a CommonJS bundle resolves index.default under import() as well as require()', async () => {
    // The CLI deploys every js-bundle function as `index.default`. Node's own ESM loader, which the Node 24 runtime
    // and the tracing wrapper use, gives a CommonJS module's namespace `module.exports` itself as `default`; a
    // getter-defined `default` is invisible there and the function dies with Runtime.HandlerNotFound.
    const cwd = await createProject({ 'handler.ts': "export const handler = async () => 'commonjs-handler';" });

    const result = await bundle(cwd, { outputModuleFormat: 'cjs' });
    const url = JSON.stringify(pathToFileURL(result.distIndexFilePath).href);
    const execution = runNode(
      `import { createRequire } from 'node:module'; const loaded = await import(${url}); const required = createRequire(import.meta.url)(${JSON.stringify(result.distIndexFilePath)}); console.log(JSON.stringify([typeof loaded.default, await loaded.default(), await required.handler()]));`,
      cwd
    );

    expect(execution.status, execution.stderr).toBe(0);
    expect(JSON.parse(execution.stdout)).toEqual(['function', 'commonjs-handler', 'commonjs-handler']);
  });
});

describe('packages that included files load', () => {
  test('are copied with the function, also when an included file reaches them through another', async () => {
    const cwd = await createProject({
      'handler.ts': "export const handler = async () => 'handler';",
      'jobs/worker.js': "const { pad } = require('./helper.cjs'); console.log(pad('x'));",
      'jobs/helper.cjs': "const leftPad = require('left-pad'); exports.pad = (text) => leftPad(text, 3, '.');",
      'node_modules/left-pad/package.json': JSON.stringify({ name: 'left-pad', version: '1.3.0', main: 'index.js' }),
      'node_modules/left-pad/index.js':
        'module.exports = (text, length, fill) => fill.repeat(length - text.length) + text;'
    });

    await bundle(cwd, { includeFiles: ['jobs/**'], packageExternalDependencies: true });

    const execution = spawnSync(process.env.npm_node_execpath || 'node', ['jobs/worker.js'], {
      cwd: join(cwd, '.stacktape', 'dist'),
      encoding: 'utf8',
      env: { ...process.env, NODE_PATH: '' }
    });
    expect(execution.stderr).toBe('');
    expect(execution.stdout.trim()).toBe('..x');
  });
});

describe('what identifies a cached Lambda artifact', () => {
  test('a new version of a dependency installed outside the bundle is a new artifact', async () => {
    // A native dependency leaves the bundle and is installed on the target platform, so its bytes are not in the
    // package directory the digest reads. Only its version can tell the cache that the artifact changed. Each build
    // gets its own checkout: package metadata is cached per directory for the life of the process, as one CLI run.
    const checkout = async (version: string) => {
      const cwd = await createProject({
        'handler.ts': "import native from 'native-dep'; export default async () => native;",
        // A Docker-installed dependency needs the project's lockfile to name its package manager.
        'package-lock.json': JSON.stringify({ name: 'lambda-package-fixture', lockfileVersion: 3, packages: {} }),
        'node_modules/native-dep/index.js': "module.exports = 'native';",
        'node_modules/native-dep/package.json': JSON.stringify({
          name: 'native-dep',
          version,
          main: 'index.js',
          gypfile: true
        })
      });
      return bundle(cwd);
    };

    const [first, same, bumped] = await Promise.all([checkout('1.0.0'), checkout('1.0.0'), checkout('2.0.0')]);

    expect(first.outcome).toBe('bundled');
    expect(first.languageSpecificBundleOutput.es.externalDependencies?.map(({ name }) => name)).toEqual(['native-dep']);
    expect(same.digest).toBe(first.digest);
    expect(bumped.digest).not.toBe(first.digest);
  });
});
