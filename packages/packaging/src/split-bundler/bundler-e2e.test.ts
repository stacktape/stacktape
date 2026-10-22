/* eslint-disable no-await-in-loop -- These fixtures intentionally build and inspect each sequential generation. */
import { afterEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildEsCode } from '../bundlers/es';
import { planLambdaDependencies } from '../es/native-dependencies';
import { buildSplitBundle } from './bundler';
import type { PackagingErrorDetails } from './types';

const temporaryDirectories: string[] = [];
const createPackagingError = ({ message, cause }: PackagingErrorDetails) =>
  new Error(message, cause === undefined ? undefined : { cause });

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const manifest = (name: string, fields: Record<string, unknown> = {}) =>
  JSON.stringify({ name, version: '1.0.0', main: 'index.js', ...fields });

const createRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-split-e2e-'));
  temporaryDirectories.push(root);
  return root;
};

describe('split bundler end-to-end regressions', () => {
  test('returns function outputs in entrypoint order, whichever function finishes postprocessing first', async () => {
    const root = await createRoot();
    // The large function's entry and source map take far longer to rewrite than the small one's.
    const large = Array.from({ length: 20_000 }, (_, index) => `export const value${index} = () => '${index}';`);
    await Promise.all([
      writeFile(join(root, 'package.json'), manifest('app')),
      writeFile(join(root, 'values.ts'), large.join('\n')),
      writeFile(
        join(root, 'large.ts'),
        `import * as values from './values'; export const handler = async () => values;`
      ),
      writeFile(join(root, 'small.ts'), 'export const handler = async () => 1;')
    ]);
    for (const names of [
      ['large', 'small'],
      ['small', 'large']
    ]) {
      const label = names.join('-');
      const result = await buildSplitBundle({
        entrypoints: names.map((name) => ({
          name,
          jobName: name,
          entryfilePath: join(root, `${name}.ts`),
          distFolderPath: join(root, label, name)
        })),
        sharedOutdir: join(root, label, 'shared'),
        cwd: root,
        sourceMaps: 'external',
        installDependencies: async () => {},
        createPackagingError
      });
      expect([...result.lambdaOutputs.keys()]).toEqual(names);
    }
  });

  test('shared edits keep function imports stable beside dynamic CommonJS import wrappers', async () => {
    const root = await createRoot();
    const files = {
      'package.json': manifest('app'),
      'shared.ts': `import common from './common.cjs'; export const revision = 'old' + common.value;`,
      'common.cjs': 'module.exports = { value: 3 };',
      'one.cjs': 'module.exports = { value: 1 };',
      'two.cjs': 'module.exports = { value: 2 };',
      'first.ts': `import { revision } from './shared'; export const handler = async () => [revision, (await import('./one.cjs')).default];`,
      'second.ts': `import { revision } from './shared'; export const handler = async () => [revision, (await import('./two.cjs')).default];`
    };
    await Promise.all(Object.entries(files).map(([path, contents]) => writeFile(join(root, path), contents)));
    const build = async (label: string) => {
      const result = await buildSplitBundle({
        entrypoints: ['first', 'second'].map((name) => ({
          name,
          jobName: name,
          entryfilePath: join(root, `${name}.ts`),
          distFolderPath: join(root, label, name)
        })),
        sharedOutdir: join(root, label, 'shared'),
        cwd: root,
        sourceMaps: 'external',
        installDependencies: async () => {},
        createPackagingError
      });
      const entries = await Promise.all(
        [...result.lambdaOutputs.values()].map((output) => readFile(output.entryFile, 'utf8'))
      );
      return { entries, chunks: result.chunkAnalysis.map(({ chunkName }) => chunkName).toSorted() };
    };
    const old = await build('old');
    await writeFile(
      join(root, 'shared.ts'),
      `import common from './common.cjs'; export const revision = 'new' + common.value;`
    );
    const next = await build('next');
    expect(next.entries).toEqual(old.entries);
    expect(next.chunks).toEqual(old.chunks);
  });

  test('runs an installed dependency that loads locale JSON through a computed relative require', async () => {
    const root = await createRoot();
    const files = {
      'package.json': manifest('app', { dependencies: { 'locale-library': '1.0.0' } }),
      'handler.ts': "import locale from 'locale-library'; export const handler = () => locale.name;",
      'node_modules/locale-library/package.json': manifest('locale-library'),
      'node_modules/locale-library/index.js':
        "const language = process.env.FIXTURE_LOCALE || 'en'; module.exports = require('./langs/' + language + '.json');",
      'node_modules/locale-library/langs/en.json': '{"name":"English"}'
    };
    for (const [path, contents] of Object.entries(files)) {
      await mkdir(join(root, path, '..'), { recursive: true });
      await writeFile(join(root, path), contents);
    }
    const runtime = await createRoot();
    await buildSplitBundle({
      entrypoints: [
        { name: 'handler', jobName: 'handler', entryfilePath: join(root, 'handler.ts'), distFolderPath: runtime }
      ],
      sharedOutdir: join(root, 'shared'),
      cwd: root,
      sourceMaps: 'disabled',
      sourceMapBannerType: 'disabled',
      installDependencies: async () => {},
      createPackagingError
    });
    await cp(join(root, 'node_modules'), join(runtime, 'node_modules'), { recursive: true });
    const execution = spawnSync(
      process.env.npm_node_execpath || 'node',
      [
        '--input-type=module',
        '--eval',
        `import { handler } from ${JSON.stringify(pathToFileURL(join(runtime, 'index.js')).href)}; console.log(handler());`
      ],
      { cwd: runtime, encoding: 'utf8', timeout: 10_000, env: { ...process.env, NODE_PATH: '' } }
    );
    expect(execution.status, execution.stderr).toBe(0);
    expect(execution.stdout.trim()).toBe('English');
  });

  test('attributes nested native dependency versions to only their importing Lambda', async () => {
    const root = await createRoot();
    await writeFile(join(root, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
    for (const [name, version] of [
      ['a', '1.0.0'],
      ['b', '2.0.0']
    ] as const) {
      const packageRoot = join(root, 'packages', name);
      const dependencyRoot = join(packageRoot, 'node_modules', 'fake-native');
      await mkdir(dependencyRoot, { recursive: true });
      await writeFile(
        join(dependencyRoot, 'package.json'),
        JSON.stringify({ name: 'fake-native', version, main: 'index.js', gypfile: true })
      );
      await writeFile(join(dependencyRoot, 'index.js'), `module.exports = { version: '${version}' };`);
      await writeFile(
        join(packageRoot, 'index.ts'),
        `import native from 'fake-native'; export const handler = () => native.version;`
      );
    }

    const result = await buildSplitBundle({
      entrypoints: ['a', 'b'].map((name) => ({
        name,
        jobName: name,
        entryfilePath: join(root, 'packages', name, 'index.ts'),
        distFolderPath: join(root, 'dist', name)
      })),
      sharedOutdir: join(root, 'shared'),
      cwd: root,
      installDependencies: async () => {},
      createPackagingError
    });

    expect(result.lambdaOutputs.get('a')?.externalDependencies.map(({ version }) => version)).toEqual(['1.0.0']);
    expect(result.lambdaOutputs.get('b')?.externalDependencies.map(({ version }) => version)).toEqual(['2.0.0']);
  });

  test('cleans reused shared and Lambda output paths before a rebuild', async () => {
    const root = await createRoot();
    const entryfilePath = join(root, 'src', 'handler.ts');
    const sharedOutdir = join(root, 'shared');
    const distFolderPath = join(root, 'dist', 'handler');
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(entryfilePath, 'export const handler = () => "first";');
    const options = {
      entrypoints: [{ name: 'handler', jobName: 'handler', entryfilePath, distFolderPath }],
      sharedOutdir,
      cwd: root,
      installDependencies: async () => {},
      createPackagingError
    };
    await buildSplitBundle(options);
    await writeFile(join(sharedOutdir, 'obsolete.js'), 'stale');
    await writeFile(join(distFolderPath, 'chunks', 'obsolete.js'), 'stale');
    await writeFile(entryfilePath, 'export const handler = () => "second";');

    await buildSplitBundle(options);

    expect(await Bun.file(join(sharedOutdir, 'obsolete.js')).exists()).toBe(false);
    expect(await readdir(join(distFolderPath, 'chunks'))).not.toContain('obsolete.js');
    expect(await Bun.file(join(distFolderPath, 'index.js')).text()).toContain('second');
  });

  test('resolves a require() of a dual-entry package to its CommonJS entry point', async () => {
    // The layout that broke every deployed Lambda importing `pg`: a CommonJS module extends the class it
    // gets from `require()`. Resolving that `require()` to the package's ESM entry hands the consumer a
    // module namespace object, and the chunk dies on load with "Class extends value #<Object> is not a
    // constructor or null".
    const root = await createRoot();
    const dualEntryRoot = join(root, 'node_modules', 'dual-entry');
    const consumerRoot = join(root, 'node_modules', 'cjs-consumer');
    await mkdir(join(dualEntryRoot, 'esm'), { recursive: true });
    await mkdir(consumerRoot, { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'fixture', private: true }));
    await writeFile(
      join(dualEntryRoot, 'package.json'),
      JSON.stringify({
        name: 'dual-entry',
        version: '1.0.0',
        main: './index.js',
        module: './esm/index.mjs',
        exports: { '.': { import: './esm/index.mjs', require: './index.js', default: './index.js' } }
      })
    );
    await writeFile(join(dualEntryRoot, 'index.js'), "module.exports = class Base { get kind() { return 'base'; } };");
    await writeFile(join(dualEntryRoot, 'esm', 'index.mjs'), "import Base from '../index.js';\nexport default Base;\n");
    await writeFile(
      join(consumerRoot, 'package.json'),
      JSON.stringify({ name: 'cjs-consumer', version: '1.0.0', main: 'index.js' })
    );
    await writeFile(
      join(consumerRoot, 'index.js'),
      "const Base = require('dual-entry');\nmodule.exports = class Derived extends Base { get kind() { return 'derived'; } };"
    );
    for (const name of ['a', 'b']) {
      await writeFile(
        join(root, `${name}.ts`),
        `import Derived from 'cjs-consumer'; export const handler = () => new Derived().kind;`
      );
    }

    await buildSplitBundle({
      entrypoints: ['a', 'b'].map((name) => ({
        name,
        jobName: name,
        entryfilePath: join(root, `${name}.ts`),
        distFolderPath: join(root, 'dist', name)
      })),
      sharedOutdir: join(root, 'shared'),
      cwd: root,
      minify: false,
      sourceMaps: 'disabled',
      sourceMapBannerType: 'disabled',
      installDependencies: async () => {},
      createPackagingError
    });

    // Loading the bundle is the assertion: the broken output threw while evaluating the class declaration.
    const entryUrl = pathToFileURL(join(root, 'dist', 'a', 'index.js')).href;
    const execution = spawnSync(
      process.env.npm_node_execpath || 'node',
      ['--input-type=module', '--eval', `import { handler } from ${JSON.stringify(entryUrl)}; console.log(handler());`],
      { cwd: root, encoding: 'utf8', timeout: 10_000 }
    );
    expect(execution.status, execution.stderr).toBe(0);
    expect(execution.stdout.trim()).toBe('derived');
  });

  test("leaves a dependency's require() of an uninstalled optional package to fail at run time", async () => {
    // NestJS probes for `@nestjs/microservices`, `ws` for `bufferutil`: a require() inside a try/catch for a package
    // most projects never install. Node raises MODULE_NOT_FOUND there and the library carries on.
    const root = await createRoot();
    const frameworkRoot = join(root, 'node_modules', 'framework');
    await mkdir(frameworkRoot, { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'fixture', private: true }));
    await writeFile(
      join(frameworkRoot, 'package.json'),
      JSON.stringify({ name: 'framework', version: '1.0.0', main: 'index.js' })
    );
    await writeFile(
      join(frameworkRoot, 'index.js'),
      "let optional = 'absent';\ntry { optional = require('optional-integration'); } catch {}\nmodule.exports = { optional, later: () => import('optional-esm-integration').catch(() => 'absent too') };"
    );
    await writeFile(
      join(root, 'a.ts'),
      "import framework from 'framework'; export const handler = () => framework.optional;"
    );

    await buildSplitBundle({
      entrypoints: [
        { name: 'a', jobName: 'a', entryfilePath: join(root, 'a.ts'), distFolderPath: join(root, 'dist', 'a') }
      ],
      sharedOutdir: join(root, 'shared'),
      cwd: root,
      minify: false,
      sourceMaps: 'disabled',
      sourceMapBannerType: 'disabled',
      installDependencies: async () => {},
      createPackagingError
    });

    const entryUrl = pathToFileURL(join(root, 'dist', 'a', 'index.js')).href;
    const execution = spawnSync(
      process.env.npm_node_execpath || 'node',
      ['--input-type=module', '--eval', `import { handler } from ${JSON.stringify(entryUrl)}; console.log(handler());`],
      { cwd: root, encoding: 'utf8', timeout: 10_000 }
    );
    expect(execution.status, execution.stderr).toBe(0);
    expect(execution.stdout.trim()).toBe('absent');

    // The project's own missing import is still an error, whether it is written as an import or a require().
    await writeFile(
      join(root, 'b.ts'),
      "import missing from 'not-installed-anywhere'; export const handler = () => missing;"
    );
    await writeFile(
      join(root, 'c.ts'),
      "const missing = require('not-installed-anywhere'); export const handler = () => missing;"
    );
    for (const name of ['b', 'c']) {
      await expect(
        buildEsCode({
          sourcePath: join(root, `${name}.ts`),
          distPath: join(root, `single-${name}/index.js`),
          cwd: root,
          externals: [],
          outputModuleFormat: 'esm',
          sourceMaps: 'disabled',
          sourceMapBannerType: 'disabled',
          createPackagingError
        })
      ).rejects.toThrow('not-installed-anywhere');
      await expect(
        buildSplitBundle({
          entrypoints: [
            { name, jobName: name, entryfilePath: join(root, `${name}.ts`), distFolderPath: join(root, 'dist', name) }
          ],
          sharedOutdir: join(root, `shared-${name}`),
          cwd: root,
          minify: false,
          sourceMaps: 'disabled',
          sourceMapBannerType: 'disabled',
          installDependencies: async () => {},
          createPackagingError
        })
      ).rejects.toThrow('not-installed-anywhere');
    }
  });

  test("a native package's pure dependency still bundles for a function that never imports the native package", async () => {
    // The per-Lambda bundler externalizes a native package's dependency tree with it, because that artifact has one
    // installed tree. A split build serves several functions from one pass: externalizing `pure-dep` for everyone
    // would leave `orders`, which has no native layer, resolving it at run time from nothing.
    const root = await createRoot();
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'fixture', private: true }));
    for (const [name, packageJson, code] of [
      [
        'native-pkg',
        { gypfile: true, dependencies: { 'pure-dep': '1.0.0' } },
        "module.exports = { native: true, pure: require('pure-dep') };"
      ],
      ['pure-dep', {}, "module.exports = 'pure-build-copy';"]
    ] as const) {
      const packageRoot = join(root, 'node_modules', name);
      await mkdir(packageRoot, { recursive: true });
      await writeFile(
        join(packageRoot, 'package.json'),
        JSON.stringify({ name, version: '1.0.0', main: 'index.js', ...packageJson })
      );
      await writeFile(join(packageRoot, 'index.js'), code);
    }
    // The pure dependency sits several modules deep, so the native package is classified first, as in a real
    // project where the framework is imported at the entry and its helpers deep in the application.
    await mkdir(join(root, 'src', 'lib', 'deep'), { recursive: true });
    await writeFile(
      join(root, 'src', 'lib', 'deep', 'pure.ts'),
      "import pure from 'pure-dep'; export const value = pure;"
    );
    await writeFile(join(root, 'src', 'lib', 'deep', 'index.ts'), "export { value } from './pure';");
    await writeFile(join(root, 'src', 'lib', 'orders.ts'), "export { value } from './deep';");
    await writeFile(
      join(root, 'src', 'images.ts'),
      "import native from 'native-pkg'; import { value } from './lib/orders'; export const handler = () => [native.native, value];"
    );
    await writeFile(
      join(root, 'src', 'orders.ts'),
      "import { value } from './lib/orders'; export const handler = () => value;"
    );

    const result = await buildSplitBundle({
      entrypoints: ['images', 'orders'].map((name) => ({
        name,
        jobName: name,
        entryfilePath: join(root, 'src', `${name}.ts`),
        distFolderPath: join(root, 'dist', name)
      })),
      sharedOutdir: join(root, 'shared'),
      cwd: root,
      minify: false,
      sourceMaps: 'disabled',
      sourceMapBannerType: 'disabled',
      installDependencies: async () => {},
      createPackagingError
    });

    expect(result.lambdaOutputs.get('images')?.externalDependencies.map(({ name }) => name)).toEqual(['native-pkg']);
    expect(result.lambdaOutputs.get('orders')?.externalDependencies).toEqual([]);
    // `orders` runs from a copy with no node_modules at all: its pure dependency has to be in its own bytes.
    const runtime = await mkdtemp(join(tmpdir(), 'stacktape-split-pure-'));
    temporaryDirectories.push(runtime);
    await cp(join(root, 'dist', 'orders'), runtime, { recursive: true });
    const execution = spawnSync(
      process.env.npm_node_execpath || 'node',
      [
        '--input-type=module',
        '--eval',
        `import { handler } from ${JSON.stringify(pathToFileURL(join(runtime, 'index.js')).href)}; console.log(handler());`
      ],
      { cwd: runtime, encoding: 'utf8', timeout: 10_000, env: { ...process.env, NODE_PATH: '' } }
    );
    expect(execution.status, execution.stderr).toBe(0);
    expect(execution.stdout.trim()).toBe('pure-build-copy');
  });

  test('gives a function the optional peers the project root depends on when the build runs from a subdirectory', async () => {
    // The CLI runs from `infra/`, which has a manifest of its own, so `infra/` is detected as the project root. The
    // handlers come from `../src`, and the repository's root manifest lists `@swc/helpers`, which `@swc/core` loads
    // as an optional peer.
    const root = await createRoot();
    const files = {
      '.git/HEAD': 'ref: refs/heads/main',
      'package.json': manifest('app', { dependencies: { '@swc/core': '*', '@swc/helpers': '*' } }),
      'infra/package.json': manifest('infra', { private: true }),
      'src/handler.ts': "import { compile } from '@swc/core'; export const handler = () => compile();",
      'node_modules/@swc/core/package.json': manifest('@swc/core', {
        peerDependencies: { '@swc/helpers': '*' },
        peerDependenciesMeta: { '@swc/helpers': { optional: true } }
      }),
      'node_modules/@swc/core/index.js': "exports.compile = () => require('@swc/helpers/_/_class_call_check').name;",
      'node_modules/@swc/core/prebuilds/linux-x64/addon.node': 'addon',
      'node_modules/@swc/helpers/package.json': manifest('@swc/helpers'),
      'node_modules/@swc/helpers/_/_class_call_check.js': "exports.name = '_class_call_check';"
    };
    for (const [path, contents] of Object.entries(files)) {
      await mkdir(join(root, path, '..'), { recursive: true });
      await writeFile(join(root, path), contents);
    }

    const result = await buildSplitBundle({
      entrypoints: [
        {
          name: 'handler',
          jobName: 'handler',
          entryfilePath: join(root, 'src', 'handler.ts'),
          distFolderPath: join(root, 'dist', 'handler')
        }
      ],
      sharedOutdir: join(root, 'shared'),
      cwd: join(root, 'infra'),
      installDependencies: async () => {},
      createPackagingError
    });

    const output = result.lambdaOutputs.get('handler')!;
    expect(output.productionDependencies).toContain('@swc/helpers');
    const plan = await planLambdaDependencies({
      dependencies: output.externalDependencies,
      productionDependencies: new Set(output.productionDependencies),
      architecture: 'x64'
    });
    expect([...plan.packages.values()].map(({ name }) => name).toSorted()).toEqual(['@swc/core', '@swc/helpers']);
  });
});
