import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildEsCode } from './index';
import type { PackagingErrorDetails } from '../../runtime-contracts';

const temporaryDirectories: string[] = [];
const createPackagingError = ({ message }: PackagingErrorDetails) => new Error(message);

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const writeFileAt = async (path: string, contents: string) => {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, contents);
};

/**
 * Builds the layout that broke every deployed Lambda importing `pg`.
 *
 * `dual-entry` publishes both a CommonJS and an ESM entry point, and the CommonJS consumer extends the
 * class it gets from `require()`. Resolving that `require()` to the ESM entry hands the consumer a module
 * namespace object, so `class Derived extends Base` fails with "Class extends value #<Object> is not a
 * constructor or null" the moment the bundle loads.
 *
 * `dual-entry` sits in the consumer's own `node_modules` because the loose resolver takes over entry-point
 * resolution for a nested package on every platform, not only on Windows.
 */
const createFixture = async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'stacktape-require-condition-')));
  temporaryDirectories.push(root);
  const consumerRoot = join(root, 'node_modules', 'cjs-consumer');
  const dualEntryRoot = join(consumerRoot, 'node_modules', 'dual-entry');

  await writeFileAt(join(root, 'package.json'), JSON.stringify({ name: 'fixture', private: true }));
  await writeFileAt(
    join(consumerRoot, 'package.json'),
    JSON.stringify({ name: 'cjs-consumer', version: '1.0.0', main: 'index.js' })
  );
  await writeFileAt(
    join(consumerRoot, 'index.js'),
    [
      "const Base = require('dual-entry');",
      'module.exports = class Derived extends Base {',
      "  get kind() { return 'derived'; }",
      '};'
    ].join('\n')
  );
  await writeFileAt(
    join(dualEntryRoot, 'package.json'),
    JSON.stringify({
      name: 'dual-entry',
      version: '1.0.0',
      main: './index.js',
      module: './esm/index.mjs',
      exports: { '.': { import: './esm/index.mjs', require: './index.js', default: './index.js' } }
    })
  );
  await writeFileAt(
    join(dualEntryRoot, 'index.js'),
    ['module.exports = class Base {', "  get kind() { return 'base'; }", '};'].join('\n')
  );
  await writeFileAt(join(dualEntryRoot, 'esm', 'index.mjs'), "import Base from '../index.js';\nexport default Base;\n");
  await writeFileAt(
    join(root, 'handler.ts'),
    ["import Derived from 'cjs-consumer';", 'export const handler = () => new Derived().kind;'].join('\n')
  );

  return root;
};

test('resolves a require() of a dual-entry package to its CommonJS entry point', async () => {
  const root = await createFixture();
  const distPath = join(root, 'dist', 'handler.js');

  await buildEsCode({
    sourcePath: join(root, 'handler.ts'),
    distPath,
    cwd: root,
    externals: [],
    minify: false,
    outputModuleFormat: 'esm',
    sourceMaps: 'disabled',
    sourceMapBannerType: 'disabled',
    createPackagingError
  });

  // Loading the bundle is the assertion: the broken output threw while evaluating the class declaration.
  const bundle = (await import(pathToFileURL(distPath).href)) as { handler: () => string };
  expect(bundle.handler()).toBe('derived');
});

/**
 * The layout that stopped the Console API from packaging: `better-auth` imports `better-call/node`, and `better-call`
 * sits in a nested `node_modules`, where the loose resolver takes over. The subpath exists only in the `exports` map
 * (`./node` → `dist/node.mjs`); probing `node.js` or `node/index.js` finds nothing, and falling back to the package's
 * main entry fails the build with `No matching export ... for import "toNodeHandler"`.
 */
test('resolves a subpath import of a nested package through its exports map', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'stacktape-exports-subpath-')));
  temporaryDirectories.push(root);
  const consumerRoot = join(root, 'node_modules', 'esm-consumer');
  const subpathRoot = join(consumerRoot, 'node_modules', 'subpath-exports');

  await writeFileAt(join(root, 'package.json'), JSON.stringify({ name: 'fixture', private: true, type: 'module' }));
  await writeFileAt(
    join(consumerRoot, 'package.json'),
    JSON.stringify({ name: 'esm-consumer', version: '1.0.0', type: 'module', exports: './index.mjs' })
  );
  await writeFileAt(
    join(consumerRoot, 'index.mjs'),
    "import { toNodeHandler } from 'subpath-exports/node';\nexport const run = () => toNodeHandler();\n"
  );
  await writeFileAt(
    join(subpathRoot, 'package.json'),
    JSON.stringify({
      name: 'subpath-exports',
      version: '1.0.0',
      type: 'module',
      exports: {
        '.': { 'dev-source': './src/index.ts', import: { types: './dist/index.d.mts', default: './dist/index.mjs' } },
        './node': { 'dev-source': './src/node.ts', import: { types: './dist/node.d.mts', default: './dist/node.mjs' } },
        './adapters/*': { import: './dist/adapters/*.mjs' }
      }
    })
  );
  await writeFileAt(join(subpathRoot, 'dist', 'index.mjs'), "export const createRouter = () => 'router';\n");
  await writeFileAt(join(subpathRoot, 'dist', 'node.mjs'), "export const toNodeHandler = () => 'node handler';\n");
  await writeFileAt(
    join(root, 'handler.ts'),
    "import { run } from 'esm-consumer';\nexport const handler = () => run();\n"
  );

  const distPath = join(root, 'dist', 'handler.js');
  await buildEsCode({
    sourcePath: join(root, 'handler.ts'),
    distPath,
    cwd: root,
    externals: [],
    minify: false,
    outputModuleFormat: 'esm',
    sourceMaps: 'disabled',
    sourceMapBannerType: 'disabled',
    createPackagingError
  });

  const bundle = (await import(pathToFileURL(distPath).href)) as { handler: () => string };
  expect(bundle.handler()).toBe('node handler');
});
