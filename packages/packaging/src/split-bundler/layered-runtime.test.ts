/*
 * A layered split artifact, executed the way Lambda assembles it: the function package at its own path, the shared
 * layer answering `/opt/nodejs/chunks/…`, and no Docker. The Docker lanes run the same shape in the official runtime;
 * this keeps the layer mount path, the layer's module format, the removal of layered chunks and the attribution of
 * file assets in per-PR CI, where they were previously only inferred from unit tests of the helpers.
 */
import { afterEach, expect, test } from 'bun:test';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
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
  const layerAssignment = assignChunksToLayers(split.chunkAnalysis, { ...DEFAULT_LAYER_CONFIG, minChunkSize: 1 });
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
