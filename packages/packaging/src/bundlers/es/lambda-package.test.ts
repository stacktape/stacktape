/*
 * What a per-Lambda ES deployment package contains and how it is identified, through the real `createEsBundle`:
 * the files the customer includes and excludes, the source map a ZIP ships, the handler contract the Lambda runtime
 * loads, and the digest that decides whether a cached artifact is reused.
 */
import { afterEach, describe, expect, test } from 'bun:test';
import type { PackagingProgressLogger } from '../../runtime-contracts';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readSourceMapBundle } from '../../es/packaged-source-map';
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

describe('the source maps of a Lambda ZIP', () => {
  const handlerSource = "export default async () => {\n  throw new Error('bad order');\n};\n";
  type Bundle = { files: Record<string, { sources: string[]; sourcesContent?: unknown }> };

  test('stay outside the package, under the runtime path of their code, without its text', async () => {
    const cwd = await createProject({ 'handler.ts': handlerSource });

    const result = await bundle(cwd, { minify: true });

    expect(existsSync(`${result.distIndexFilePath}.map`)).toBe(false);
    expect(result.sourceMapsPath!.endsWith('.source-maps.json.gz')).toBe(true);
    const sourceMaps = (await readSourceMapBundle(result.sourceMapsPath!)) as Bundle;
    expect(Object.keys(sourceMaps.files)).toEqual(['/var/task/index.js']);
    expect(sourceMaps.files['/var/task/index.js']!.sources).toContain('handler.ts');
    expect(JSON.stringify(sourceMaps)).not.toContain('bad order');
  });

  test('are part of the digest: a change that moves only the original lines deploys again', async () => {
    const first = await createProject({ 'handler.ts': handlerSource });
    const shifted = await createProject({ 'handler.ts': `// a comment shifts every line\n${handlerSource}` });

    const [before, after] = [await bundle(first, { minify: true }), await bundle(shifted, { minify: true })];

    expect(await Bun.file(after.distIndexFilePath).text()).toBe(await Bun.file(before.distIndexFilePath).text());
    expect(await readSourceMapBundle(after.sourceMapsPath!)).not.toEqual(
      await readSourceMapBundle(before.sourceMapsPath!)
    );
    expect(after.digest).not.toBe(before.digest);
  });

  test('stay in the package, without the source text, when the configuration keeps them there', async () => {
    const cwd = await createProject({ 'handler.ts': handlerSource });

    const result = await bundle(cwd, { keepSourceMapsInPackage: true });
    const map = JSON.parse(await Bun.file(`${result.distIndexFilePath}.map`).text()) as {
      sources: string[];
      sourcesContent?: unknown;
    };

    expect(result.sourceMapsPath).toBeUndefined();
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
  test('are copied with the function, also through another included file, except excluded ones', async () => {
    const cwd = await createProject({
      'handler.ts': "export const handler = async () => 'handler';",
      'jobs/worker.js': "const { pad } = require('./helper.cjs'); console.log(pad('x'));",
      'jobs/helper.cjs': [
        "const leftPad = require('left-pad');",
        // An optional local module guarded the way Node.js programs do; scanning must not stop at it.
        "try { require('./not-generated-yet.cjs'); } catch {}",
        // Excluded from the deployment package, so it must not be copied.
        "try { require('excluded-dep'); } catch {}",
        "exports.pad = (text) => leftPad(text, 3, '.');"
      ].join('\n'),
      'node_modules/excluded-dep/package.json': JSON.stringify({ name: 'excluded-dep', version: '1.0.0' }),
      'node_modules/excluded-dep/index.js': 'module.exports = 1;',
      'node_modules/left-pad/package.json': JSON.stringify({ name: 'left-pad', version: '1.3.0', main: 'index.js' }),
      'node_modules/left-pad/index.js':
        'module.exports = (text, length, fill) => fill.repeat(length - text.length) + text;'
    });

    await bundle(cwd, {
      includeFiles: ['jobs/**'],
      excludeDependencies: ['excluded-dep'],
      packageExternalDependencies: true
    });
    expect(existsSync(join(cwd, '.stacktape', 'dist', 'node_modules', 'excluded-dep'))).toBe(false);

    const execution = spawnSync(process.env.npm_node_execpath || 'node', ['jobs/worker.js'], {
      cwd: join(cwd, '.stacktape', 'dist'),
      encoding: 'utf8',
      env: { ...process.env, NODE_PATH: '' }
    });
    expect(execution.stderr).toBe('');
    expect(execution.stdout.trim()).toBe('..x');
  });
});

const manifest = (name: string, fields: Record<string, unknown> = {}) =>
  JSON.stringify({ name, version: '1.0.0', main: 'index.js', ...fields });
/** A native package whose prebuilt addon runs on Lambda as installed, so no Docker build is needed. */
const nativePackage = (name: string, fields: Record<string, unknown> = {}, code = `exports.name = '${name}';`) => ({
  [`node_modules/${name}/package.json`]: manifest(name, fields),
  [`node_modules/${name}/index.js`]: code,
  [`node_modules/${name}/prebuilds/linux-x64/addon.node`]: 'addon',
  [`node_modules/${name}/prebuilds/linux-arm64/addon.node`]: 'addon'
});

const projectManifest = (fields: Record<string, unknown>) =>
  JSON.stringify({ name: 'lambda-package-fixture', private: true, ...fields });

/** Copies the function's artifact out of the project, where only its own `node_modules` can be found, as on Lambda. */
const copyArtifact = async (cwd: string) => {
  const artifact = await mkdtemp(join(tmpdir(), 'stacktape-es-artifact-'));
  temporaryDirectories.push(artifact);
  await cp(join(cwd, '.stacktape', 'dist'), artifact, { recursive: true, verbatimSymlinks: true });
  return { artifact, installed: join(artifact, 'node_modules', '.installed', 'node_modules') };
};

const runHandler = (artifact: string) => {
  const url = JSON.stringify(pathToFileURL(join(artifact, 'index.js')).href);
  return runNode(
    `const { default: handler } = await import(${url}); console.log(JSON.stringify(await handler()));`,
    artifact
  );
};

/**
 * @swc/core has this shape: with `externalHelpers`, code its native compiler emits imports `@swc/helpers`, an optional
 * peer that the project installs when it relies on it.
 */
const swcCore = nativePackage(
  '@swc/core',
  { peerDependencies: { '@swc/helpers': '*' }, peerDependenciesMeta: { '@swc/helpers': { optional: true } } },
  "exports.compile = () => require(['@swc', 'helpers', '_', '_class_call_check'].join('/')).name;"
);
const swcHelpers = {
  'node_modules/@swc/helpers/package.json': manifest('@swc/helpers'),
  'node_modules/@swc/helpers/_/_class_call_check.js': "exports.name = '_class_call_check';"
};

/**
 * The rule follows a production install (`npm install --omit=dev`): dependencies, optional dependencies and required
 * peers, and an optional peer only when the project depends on it in production.
 */
describe('packages a Lambda gets beside its bundle', () => {
  test('are what a production install gives the code, without optional peers the project only develops with', async () => {
    const cwd = await createProject({
      'package.json': projectManifest({
        dependencies: { orm: '*', pdf: '*', 'sqlite-driver': '*' },
        devDependencies: { typescript: '*' }
      }),
      'handler.ts':
        "import { query } from 'orm'; import { render } from 'pdf'; export default async () => [query(), render()];",
      // Bundled. It loads its database driver through a require the bundler cannot follow, as Sequelize does, and
      // lists TypeScript as an optional peer, as Prisma does.
      'node_modules/orm/package.json': manifest('orm', {
        peerDependencies: { 'sqlite-driver': '*', typescript: '*' },
        peerDependenciesMeta: { 'sqlite-driver': { optional: true }, typescript: { optional: true } }
      }),
      'node_modules/orm/index.js':
        "const load = (name) => require(name); exports.query = () => load('sqlite-driver').name;",
      ...nativePackage('sqlite-driver'),
      // TypeScript 7 is native: it loads a compiler binary from a platform package.
      ...nativePackage('typescript'),
      // Left out of the bundle. npm installs its optional dependencies, whether or not its code names them.
      ...nativePackage(
        'pdf',
        { dependencies: { fonts: '*' }, optionalDependencies: { 'fast-zlib': '*' } },
        "let zlib; try { zlib = require('fast-' + 'zlib'); } catch {} exports.render = () => [require('fonts').name, zlib?.name];"
      ),
      'node_modules/fonts/package.json': manifest('fonts'),
      'node_modules/fonts/index.js': "exports.name = 'fonts';",
      'node_modules/fast-zlib/package.json': manifest('fast-zlib'),
      'node_modules/fast-zlib/index.js': "exports.name = 'fast-zlib';",
      // Yarn's own state, which pdfkit publishes by mistake.
      'node_modules/pdf/.yarn/releases/yarn-4.cjs': '// Yarn',
      'node_modules/pdf/.yarn/install-state.gz': 'state'
    });

    const result = await bundle(cwd, { packageExternalDependencies: true });

    expect(result.languageSpecificBundleOutput.es.externalDependencies?.map(({ name }) => name).toSorted()).toEqual([
      'pdf',
      'sqlite-driver'
    ]);
    const { artifact, installed } = await copyArtifact(cwd);
    expect(['typescript', 'pdf/.yarn'].filter((path) => existsSync(join(installed, path)))).toEqual([]);
    const execution = runHandler(artifact);
    expect(execution.status, execution.stderr).toBe(0);
    expect(JSON.parse(execution.stdout)).toEqual(['sqlite-driver', ['fonts', 'fast-zlib']]);
  });

  test('include an optional peer that a left-out package loads by a name no code spells out, once the project depends on it', async () => {
    const cwd = await createProject({
      'package.json': projectManifest({ dependencies: { '@swc/core': '*' } }),
      'handler.ts': "import { compile } from '@swc/core'; export default async () => compile();",
      ...swcCore,
      ...swcHelpers
    });

    // Without it in the project's dependencies, a production install would not have it either.
    await bundle(cwd, { packageExternalDependencies: true });
    expect(existsSync(join((await copyArtifact(cwd)).installed, '@swc', 'helpers'))).toBe(false);

    // The project's manifest is read again for every build, also within one process.
    await writeFile(
      join(cwd, 'package.json'),
      projectManifest({ dependencies: { '@swc/core': '*', '@swc/helpers': '*' } })
    );
    await bundle(cwd, { packageExternalDependencies: true });
    const { artifact } = await copyArtifact(cwd);
    const execution = runHandler(artifact);
    expect(execution.status, execution.stderr).toBe(0);
    expect(JSON.parse(execution.stdout)).toBe('_class_call_check');
  });

  test('include an optional peer that only a bundled package depends on, as a production install does', async () => {
    // The project does not list `@swc/helpers`, but fontkit, which the bundle takes in, depends on it, so a production
    // install has it, and `@swc/core` finds it there.
    const cwd = await createProject({
      'package.json': projectManifest({ dependencies: { '@swc/core': '*', pdf: '*' } }),
      'handler.ts':
        "import { compile } from '@swc/core'; import { render } from 'pdf'; export default async () => [compile(), render()];",
      ...swcCore,
      'node_modules/pdf/package.json': manifest('pdf', { dependencies: { fontkit: '*' } }),
      'node_modules/pdf/index.js': "exports.render = () => require('fontkit').layout();",
      'node_modules/fontkit/package.json': manifest('fontkit', { dependencies: { '@swc/helpers': '*' } }),
      'node_modules/fontkit/index.js':
        "const { name } = require('@swc/helpers/_/_class_call_check'); exports.layout = () => `fontkit ${name}`;",
      ...swcHelpers
    });

    const result = await bundle(cwd, { packageExternalDependencies: true });

    expect(result.languageSpecificBundleOutput.es.externalDependencies?.map(({ name }) => name)).toEqual(['@swc/core']);
    const { artifact } = await copyArtifact(cwd);
    const execution = runHandler(artifact);
    expect(execution.status, execution.stderr).toBe(0);
    expect(JSON.parse(execution.stdout)).toEqual(['_class_call_check', 'fontkit _class_call_check']);
  });

  test('include an optional peer that the workspace package holding the code depends on, past a nested package.json', async () => {
    // `src/package.json` only sets the module type; the workspace package's own manifest still lists `@swc/helpers`.
    const cwd = await createProject({
      'package.json': projectManifest({ workspaces: ['packages/*'] }),
      'packages/app/package.json': manifest('app', { dependencies: { '@swc/core': '*', '@swc/helpers': '*' } }),
      'packages/app/src/package.json': JSON.stringify({ type: 'commonjs' }),
      'packages/app/src/handler.ts': "import { compile } from '@swc/core'; export default async () => compile();",
      ...swcCore,
      ...swcHelpers
    });

    await bundle(cwd, { packageExternalDependencies: true, entryfilePath: join(cwd, 'packages/app/src/handler.ts') });
    const { artifact } = await copyArtifact(cwd);
    const execution = runHandler(artifact);
    expect(execution.status, execution.stderr).toBe(0);
    expect(JSON.parse(execution.stdout)).toBe('_class_call_check');
  });

  test('include the required peers of the workspace package holding the code, also when the project depends on it', async () => {
    // npm installs a workspace package's required peers. Here `app` is both where the code comes from and a
    // dependency of the project root, linked into `node_modules`.
    const cwd = await createProject({
      'package.json': projectManifest({ workspaces: ['packages/*'], dependencies: { app: '*' } }),
      'packages/app/package.json': manifest('app', {
        dependencies: { '@swc/core': '*' },
        peerDependencies: { '@swc/helpers': '*' }
      }),
      'packages/app/handler.ts': "import { compile } from '@swc/core'; export default async () => compile();",
      ...swcCore,
      ...swcHelpers
    });
    await symlink(join('..', 'packages', 'app'), join(cwd, 'node_modules', 'app'));

    await bundle(cwd, { packageExternalDependencies: true, entryfilePath: join(cwd, 'packages/app/handler.ts') });
    const { artifact } = await copyArtifact(cwd);
    const execution = runHandler(artifact);
    expect(execution.status, execution.stderr).toBe(0);
    expect(JSON.parse(execution.stdout)).toBe('_class_call_check');
  });

  test('include the optional dependencies of a left-out package, which its commands load', async () => {
    // bunyan has this shape: its `bin/bunyan` command, a script without an extension, requires its optional
    // dependency `moment`.
    const cwd = await createProject({
      'package.json': projectManifest({ dependencies: { logger: '*' } }),
      'handler.ts': "import { log } from 'logger'; export default async () => log();",
      'node_modules/logger/package.json': manifest('logger', {
        bin: { logger: 'bin/logger' },
        optionalDependencies: { moment: '*' }
      }),
      'node_modules/logger/index.js': "exports.log = () => 'logged';",
      'node_modules/logger/bin/logger': "#!/usr/bin/env node\nconsole.log(require('moment').name);",
      'node_modules/moment/package.json': manifest('moment'),
      'node_modules/moment/index.js': "exports.name = 'moment';"
    });

    await bundle(cwd, { packageExternalDependencies: true, dependenciesToExcludeFromBundle: ['logger'] });

    const { artifact, installed } = await copyArtifact(cwd);
    expect(runHandler(artifact).stdout.trim()).toBe('"logged"');
    const command = spawnSync(process.env.npm_node_execpath || 'node', [join(installed, 'logger', 'bin', 'logger')], {
      encoding: 'utf8',
      timeout: 10_000
    });
    expect(command.status, command.stderr).toBe(0);
    expect(command.stdout.trim()).toBe('moment');
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
