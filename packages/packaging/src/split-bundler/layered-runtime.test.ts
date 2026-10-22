/*
 * A layered split artifact, executed the way Lambda assembles it: the function package at its own path, the shared
 * layer answering `/opt/nodejs/chunks/…`, and no Docker. The Docker lanes run the same shape in the official runtime;
 * this keeps the layer mount path, the layer's module format, the removal of layered chunks and the attribution of
 * file assets in per-PR CI, where they were previously only inferred from unit tests of the helpers.
 */
import { afterEach, expect, test } from 'bun:test';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSplitBundle } from './bundler';
import { assignChunksToLayers, DEFAULT_LAYER_CONFIG } from './layer-assignment';
import { createLayerArtifacts } from './layer-builder';
import type { PackagingErrorDetails } from './types';

const temporaryDirectories: string[] = [];
const createPackagingError = ({ message, cause }: PackagingErrorDetails) =>
  new Error(message, cause === undefined ? undefined : { cause });

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const listFiles = async (directory: string) =>
  (await readdir(directory, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) =>
      join(entry.parentPath, entry.name)
        .slice(directory.length + 1)
        .replaceAll('\\', '/')
    )
    .toSorted();

/**
 * Runs a function package's handler in Node with the layer answering the mount path Lambda gives it. Only the mount
 * is redirected: the chunk is still loaded from the layer's own tree, so its module format and its own imports are
 * resolved exactly as they would be under `/opt`.
 */
const invoke = async ({
  functionDirectory,
  layerDirectory
}: {
  functionDirectory: string;
  layerDirectory?: string;
}) => {
  const hooks = await mkdtemp(join(tmpdir(), 'stacktape-layer-hooks-'));
  temporaryDirectories.push(hooks);
  const layerChunks = layerDirectory ? pathToFileURL(join(layerDirectory, 'nodejs', 'chunks')).href : undefined;
  await writeFile(
    join(hooks, 'resolve.mjs'),
    [
      `const layerChunks = ${JSON.stringify(layerChunks)};`,
      'export const resolve = (specifier, context, next) =>',
      "  layerChunks && specifier.startsWith('/opt/nodejs/chunks/')",
      "    ? next(`${layerChunks}/${specifier.slice('/opt/nodejs/chunks/'.length)}`, context)",
      '    : next(specifier, context);'
    ].join('\n')
  );
  await writeFile(
    join(hooks, 'register.mjs'),
    "import { register } from 'node:module';\nregister('./resolve.mjs', import.meta.url);\n"
  );
  const execution = spawnSync(
    process.env.npm_node_execpath || 'node',
    [
      '--import',
      pathToFileURL(join(hooks, 'register.mjs')).href,
      '--input-type=module',
      '--eval',
      `import { handler } from ${JSON.stringify(pathToFileURL(join(functionDirectory, 'index.js')).href)}; console.log(JSON.stringify(await handler()));`
    ],
    { cwd: functionDirectory, encoding: 'utf8', timeout: 10_000 }
  );
  return execution;
};

test('functions load their shared chunk from the layer mount and only ship the assets they use', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-layered-runtime-'));
  temporaryDirectories.push(root);
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'layered-fixture', private: true }));
  await mkdir(join(root, 'src', 'lib'), { recursive: true });
  await mkdir(join(root, 'src', 'assets'));
  await writeFile(join(root, 'src', 'assets', 'logo.bin'), randomBytes(1024));
  await writeFile(
    join(root, 'src', 'lib', 'shared.ts'),
    [
      "import logoPath from '../assets/logo.bin';",
      `export const payload = ${JSON.stringify('shared-'.repeat(1024))};`,
      'export const logo = logoPath;'
    ].join('\n')
  );
  await Promise.all(
    ['orders', 'reports'].map((name) =>
      writeFile(
        join(root, 'src', `${name}.ts`),
        `import { logo, payload } from './lib/shared'; export const handler = async () => ({ function: '${name}', size: payload.length, logo });`
      )
    )
  );
  await writeFile(join(root, 'src', 'health.ts'), "export const handler = async () => ({ function: 'health' });");

  const names = ['orders', 'reports', 'health'];
  const split = await buildSplitBundle({
    entrypoints: names.map((name) => ({
      name,
      jobName: name,
      entryfilePath: join(root, 'src', `${name}.ts`),
      distFolderPath: join(root, 'functions', name)
    })),
    sharedOutdir: join(root, 'shared'),
    cwd: root,
    minify: true,
    sourceMaps: 'external',
    installDependencies: async () => {},
    createPackagingError
  });
  // Shared code and its shifted map are prepared once, but each consumer must receive identical complete bytes.
  const sharedChunks = await readdir(join(root, 'functions', 'orders', 'chunks'));
  expect(sharedChunks.some((name) => name.endsWith('.js.map'))).toBe(true);
  await Promise.all(
    sharedChunks.map(async (chunk) => {
      const [orders, reports] = await Promise.all([
        readFile(join(root, 'functions', 'orders', 'chunks', chunk)),
        readFile(join(root, 'functions', 'reports', 'chunks', chunk))
      ]);
      expect(orders).toEqual(reports);
      if (chunk.endsWith('.map')) expect(JSON.parse(orders.toString()).sourcesContent).toBeUndefined();
    })
  );
  // The shared code is the project's own, which normally stays in the functions; this layers it as large own code is.
  const layerAssignment = assignChunksToLayers(split.chunkAnalysis, {
    ...DEFAULT_LAYER_CONFIG,
    minChunkSize: 1,
    maxOwnCodeInFunctions: 0
  });
  const { layerArtifacts } = await createLayerArtifacts({
    lambdaOutputs: split.lambdaOutputs,
    layerAssignment,
    layerBasePath: join(root, 'layers')
  });

  expect(layerArtifacts).toHaveLength(1);
  const [layer] = layerArtifacts;
  const layeredChunks = new Set(layer!.chunks.flatMap((chunk) => [chunk, `${chunk}.map`]));
  expect(layeredChunks.size).toBeGreaterThan(0);
  const layerFiles = await listFiles(layer!.layerPath);
  expect(layerFiles).toContain('nodejs/package.json');
  for (const chunk of layer!.chunks) expect(layerFiles).toContain(`nodejs/chunks/${chunk}`);

  const packages = Object.fromEntries(
    await Promise.all(names.map(async (name) => [name, await listFiles(join(root, 'functions', name))] as const))
  );
  // A layered chunk, or its map, in a function package would be shipped twice and loaded from the wrong place.
  for (const name of names) {
    expect(packages[name]!.filter((file) => layeredChunks.has(basename(file)))).toEqual([]);
  }

  for (const name of ['orders', 'reports']) {
    // oxlint-disable-next-line no-await-in-loop -- Functions are invoked one at a time, each in its own Node process.
    const execution = await invoke({
      functionDirectory: join(root, 'functions', name),
      layerDirectory: layer!.layerPath
    });
    expect(execution.status, `${name}: ${execution.stderr}`).toBe(0);
    const response = JSON.parse(execution.stdout) as { function: string; size: number; logo: string };
    expect(response.function).toBe(name);
    expect(response.size).toBe('shared-'.repeat(1024).length);
    // The shared chunk reads the asset under the function's task root, so every consumer must carry it.
    expect(response.logo.startsWith('/var/task/')).toBe(true);
    expect(packages[name]).toContain(basename(response.logo));
    expect(response.logo).toMatch(/\/logo-[a-z0-9]+\.bin$/);
  }
  expect(packages.health!.filter((file) => file.endsWith('.bin'))).toEqual([]);
  const health = await invoke({ functionDirectory: join(root, 'functions', 'health') });
  expect(health.status, health.stderr).toBe(0);
  expect(JSON.parse(health.stdout)).toEqual({ function: 'health' });
}, 30_000);

const readLayerCode = (layer: { layerPath: string; chunks: string[] }) =>
  Promise.all(layer.chunks.map((chunk) => readFile(join(layer.layerPath, 'nodejs', 'chunks', chunk), 'utf8')));

test("an edit of the project's shared code changes the functions, not the layer of installed packages", async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-layered-own-code-'));
  temporaryDirectories.push(root);
  const files: Record<string, string> = {
    'package.json': JSON.stringify({ name: 'layered-own-code', private: true, dependencies: { pricing: '1.0.0' } }),
    // An ESM package with more exports than the code uses: the anchor must not keep the unused one.
    'node_modules/pricing/package.json': JSON.stringify({
      name: 'pricing',
      version: '1.0.0',
      type: 'module',
      main: 'index.js'
    }),
    'node_modules/pricing/index.js': [
      'export const total = (lines) => lines.reduce((sum, line) => sum + line, 0);',
      `export const unusedTable = ${JSON.stringify('unused-'.repeat(512))};`
    ].join('\n'),
    'src/lib/orders.ts':
      "import { total } from 'pricing'; export const revision = 'one'; export const sum = () => total([1, 2]);",
    'src/orders.ts':
      "import { revision, sum } from './lib/orders'; export const handler = async () => ({ revision, sum: sum() });",
    'src/reports.ts':
      "import { revision, sum } from './lib/orders'; export const handler = async () => ({ revision, sum: sum() });"
  };
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      await mkdir(join(root, path, '..'), { recursive: true });
      await writeFile(join(root, path), contents);
    })
  );
  const build = async (label: string) => {
    const split = await buildSplitBundle({
      entrypoints: ['orders', 'reports'].map((name) => ({
        name,
        jobName: name,
        entryfilePath: join(root, 'src', `${name}.ts`),
        distFolderPath: join(root, label, name)
      })),
      sharedOutdir: join(root, label, 'shared'),
      cwd: root,
      installDependencies: async () => {},
      createPackagingError
    });
    const layerAssignment = assignChunksToLayers(split.chunkAnalysis, { ...DEFAULT_LAYER_CONFIG, minChunkSize: 1 });
    const { layerArtifacts } = await createLayerArtifacts({
      lambdaOutputs: split.lambdaOutputs,
      layerAssignment,
      layerBasePath: join(root, label, 'layers')
    });
    return { split, layerArtifacts };
  };

  const first = await build('first');
  // No chunk holds both the project's code and the package's, and only the package's chunk is layered.
  expect(first.split.chunkAnalysis.map(({ code }) => code).toSorted()).toEqual(['own', 'packages']);
  expect(first.layerArtifacts).toHaveLength(1);
  const layerCode = (await readLayerCode(first.layerArtifacts[0]!)).join('');
  expect(layerCode).toContain('reduce');
  expect(layerCode).not.toContain('unused-');
  expect(layerCode).not.toContain('"one"');
  for (const name of ['orders', 'reports']) {
    // oxlint-disable-next-line no-await-in-loop -- Functions are invoked one at a time, each in its own Node process.
    const execution = await invoke({
      functionDirectory: join(root, 'first', name),
      layerDirectory: first.layerArtifacts[0]!.layerPath
    });
    expect(execution.status, `${name}: ${execution.stderr}`).toBe(0);
    expect(JSON.parse(execution.stdout)).toEqual({ revision: 'one', sum: 3 });
  }

  await writeFile(
    join(root, 'src', 'lib', 'orders.ts'),
    "import { total } from 'pricing'; export const revision = 'two'; export const sum = () => total([1, 2]);"
  );
  const second = await build('second');
  expect(second.layerArtifacts.map(({ contentHash }) => contentHash)).toEqual(
    first.layerArtifacts.map(({ contentHash }) => contentHash)
  );
  // The new function package runs against the layer the first build published.
  const execution = await invoke({
    functionDirectory: join(root, 'second', 'orders'),
    layerDirectory: first.layerArtifacts[0]!.layerPath
  });
  expect(execution.status, execution.stderr).toBe(0);
  expect(JSON.parse(execution.stdout)).toEqual({ revision: 'two', sum: 3 });
}, 30_000);

/** Writes the project, then split-builds the two functions `a` and `b` and assigns their chunks to layers. */
const buildTwoFunctions = async (files: Record<string, string>) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-layered-order-'));
  temporaryDirectories.push(root);
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      await mkdir(join(root, path, '..'), { recursive: true });
      await writeFile(join(root, path), contents);
    })
  );
  const split = await buildSplitBundle({
    entrypoints: ['a', 'b'].map((name) => ({
      name,
      jobName: name,
      entryfilePath: join(root, 'src', `${name}.ts`),
      distFolderPath: join(root, 'functions', name)
    })),
    sharedOutdir: join(root, 'shared'),
    cwd: root,
    installDependencies: async () => {},
    createPackagingError
  });
  const layerAssignment = assignChunksToLayers(split.chunkAnalysis, { ...DEFAULT_LAYER_CONFIG, minChunkSize: 1 });
  const { layerArtifacts } = await createLayerArtifacts({
    lambdaOutputs: split.lambdaOutputs,
    layerAssignment,
    layerBasePath: join(root, 'layers')
  });
  return { root, split, layerArtifacts };
};

const esmPackage = (name: string, code: Record<string, string>) => ({
  [`node_modules/${name}/package.json`]: JSON.stringify({ name, version: '1.0.0', type: 'module', main: 'index.js' }),
  ...Object.fromEntries(Object.entries(code).map(([file, contents]) => [`node_modules/${name}/${file}`, contents]))
});

const twoHandlers = (body: string) => ({
  'src/a.ts': `import { read } from './lib/shared'; export const handler = async () => (${body});`,
  'src/b.ts': `import { read } from './lib/shared'; export const handler = async () => (${body});`
});

test('own setup code still runs before the packages it was imported before', async () => {
  // An env, polyfill or tracing bootstrap the shared code imports first, then a package that reads it when it loads.
  const { root, layerArtifacts } = await buildTwoFunctions({
    'package.json': JSON.stringify({ name: 'layered-order', private: true, type: 'module' }),
    ...esmPackage('esm-config', {
      'index.js': `export const mode = process.env.MODE;\nexport const padding = ${JSON.stringify('config-'.repeat(256))};`
    }),
    'src/lib/setup.ts': "process.env.MODE ??= 'configured';",
    'src/lib/shared.ts':
      "import './setup';\nimport { mode, padding } from 'esm-config';\nexport const read = () => ({ mode, size: padding.length });",
    ...twoHandlers('read()')
  });
  const execution = await invoke({
    functionDirectory: join(root, 'functions', 'a'),
    ...(layerArtifacts[0] ? { layerDirectory: layerArtifacts[0].layerPath } : {})
  });
  expect(execution.status, execution.stderr).toBe(0);
  expect(JSON.parse(execution.stdout)).toEqual({ mode: 'configured', size: 'config-'.repeat(256).length });
}, 30_000);

test('separating own code keeps tree shaking of a namespace the code reads members of', async () => {
  // zod exports `z` as a namespace of every schema type; code that calls `z.string()` needs only that one.
  const { root, split, layerArtifacts } = await buildTwoFunctions({
    'package.json': JSON.stringify({ name: 'layered-namespace', private: true, type: 'module' }),
    ...esmPackage('schemas', {
      'index.js': "export * as s from './all.js';",
      'all.js': [
        `export const used = () => ${JSON.stringify('used-'.repeat(256))};`,
        `export const unused = () => ${JSON.stringify('unused-'.repeat(512))};`
      ].join('\n')
    }),
    'src/lib/shared.ts': "import { s } from 'schemas';\nexport const read = () => s.used().length;",
    ...twoHandlers('{ size: read() }')
  });
  expect(split.chunkAnalysis.map(({ code }) => code).toSorted()).toEqual(['own', 'packages']);
  expect(layerArtifacts).toHaveLength(1);
  const layerCode = (await readLayerCode(layerArtifacts[0]!)).join('');
  expect(layerCode).toContain('used-');
  expect(layerCode).not.toContain('unused-');
  const execution = await invoke({
    functionDirectory: join(root, 'functions', 'b'),
    layerDirectory: layerArtifacts[0]!.layerPath
  });
  expect(execution.status, execution.stderr).toBe(0);
  expect(JSON.parse(execution.stdout)).toEqual({ size: 'used-'.repeat(256).length });
}, 30_000);
