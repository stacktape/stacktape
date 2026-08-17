import type { LambdaSplitOutput, LayerAssignmentResult } from './types';
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outputFile, pathExists } from 'fs-extra';
import { createLayerArtifacts } from './layer-builder';

const LAYER_MOUNT = '/opt/nodejs/chunks/';

const workspaces: string[] = [];

/**
 * Mirrors what the split bundler leaves on disk: a shared outdir holding every chunk, plus one lambda
 * package that already carries a copy of the chunks it imports.
 */
const buildWorkspace = async ({ sharedChunkBody = 'import "./chunk-dep.js";\nexport const shared = 1;\n' } = {}) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-layer-builder-'));
  workspaces.push(root);

  const sharedChunks = join(root, 'shared', 'chunks');
  const lambdaDir = join(root, 'lambda-a');
  const lambdaChunks = join(lambdaDir, 'chunks');

  const chunkBodies = {
    'chunk-shared.js': sharedChunkBody,
    'chunk-dep.js': 'export const dep = 1;\n',
    'chunk-local.js': 'import "./chunk-shared.js";\nexport const local = 1;\n'
  };

  await Promise.all([
    ...Object.entries(chunkBodies).flatMap(([name, body]) => [
      outputFile(join(sharedChunks, name), body),
      outputFile(join(lambdaChunks, name), body)
    ]),
    outputFile(join(sharedChunks, 'chunk-shared.js.map'), '{"version":3}'),
    outputFile(join(lambdaChunks, 'chunk-shared.js.map'), '{"version":3}'),
    outputFile(
      join(lambdaDir, 'index.js'),
      'import "./chunks/chunk-shared.js";\nimport "./chunks/chunk-local.js";\nexport const handler = () => 1;\n'
    )
  ]);

  const layeredChunk = (name: string) => ({
    chunkName: name,
    chunkPath: join(sharedChunks, name),
    layerNumber: 1
  });

  const layerAssignment: LayerAssignmentResult = {
    layeredChunks: [layeredChunk('chunk-shared.js'), layeredChunk('chunk-dep.js')],
    unLayeredChunks: [{ chunkName: 'chunk-local.js', chunkPath: join(sharedChunks, 'chunk-local.js'), layerNumber: 0 }],
    layers: [{ layerNumber: 1, chunks: ['chunk-shared.js', 'chunk-dep.js'], totalSizeBytes: 4242 }],
    totalBytesSaved: 4242
  };

  const output: LambdaSplitOutput = {
    name: 'lambda-a',
    entryFile: join(lambdaDir, 'index.js'),
    files: [
      join(lambdaDir, 'index.js'),
      join(lambdaChunks, 'chunk-shared.js'),
      join(lambdaChunks, 'chunk-dep.js'),
      join(lambdaChunks, 'chunk-local.js')
    ],
    sourceFiles: [],
    dependenciesToInstallInDocker: [],
    resolvedModules: []
  };

  return {
    lambdaChunks,
    lambdaDir,
    layerBasePath: join(root, 'layers'),
    layerAssignment,
    lambdaOutputs: new Map([['lambda-a', output]]),
    output
  };
};

afterEach(async () => {
  await Promise.all(workspaces.map((dir) => rm(dir, { recursive: true, force: true })));
  workspaces.length = 0;
});

describe('createLayerArtifacts', () => {
  test('lays out a publishable layer under nodejs/chunks with an ESM package.json', async () => {
    const workspace = await buildWorkspace();

    const { layerArtifacts } = await createLayerArtifacts(workspace);

    expect(layerArtifacts).toHaveLength(1);
    const [artifact] = layerArtifacts;
    expect(artifact!.layerNumber).toBe(1);
    expect(artifact!.layerPath).toBe(join(workspace.layerBasePath, 'layer-1'));
    expect(artifact!.chunks).toEqual(['chunk-shared.js', 'chunk-dep.js']);
    expect(artifact!.sizeBytes).toBeGreaterThan(0);

    const layerNodejs = join(artifact!.layerPath, 'nodejs');
    expect((await readdir(join(layerNodejs, 'chunks'))).toSorted()).toEqual([
      'chunk-dep.js',
      'chunk-shared.js',
      'chunk-shared.js.map'
    ]);
    expect(JSON.parse(await readFile(join(layerNodejs, 'package.json'), 'utf8'))).toEqual({ type: 'module' });
  });

  test('removes obsolete files when a stable layer number is rebuilt', async () => {
    const workspace = await buildWorkspace();
    const obsoletePath = join(workspace.layerBasePath, 'layer-1', 'nodejs', 'chunks', 'obsolete.js');
    await outputFile(obsoletePath, 'stale');

    await createLayerArtifacts(workspace);

    expect(await pathExists(obsoletePath)).toBe(false);
  });

  test('points layered chunks at the layer mount and non-layered chunks at the lambda package', async () => {
    const workspace = await buildWorkspace();

    await createLayerArtifacts(workspace);

    // Inside the layer, a chunk reaches its layered dependency through the mount path.
    expect(
      await readFile(join(workspace.layerBasePath, 'layer-1', 'nodejs', 'chunks', 'chunk-shared.js'), 'utf8')
    ).toBe(`import "${LAYER_MOUNT}chunk-dep.js";\nexport const shared = 1;\n`);
    // The chunk that stayed behind reaches the layered chunk through the mount path too.
    expect(await readFile(join(workspace.lambdaChunks, 'chunk-local.js'), 'utf8')).toBe(
      `import "${LAYER_MOUNT}chunk-shared.js";\nexport const local = 1;\n`
    );
    // The entry file keeps its relative import for the chunk it still ships.
    expect(await readFile(join(workspace.lambdaDir, 'index.js'), 'utf8')).toBe(
      `import "${LAYER_MOUNT}chunk-shared.js";\nimport "./chunks/chunk-local.js";\nexport const handler = () => 1;\n`
    );
  });

  test('removes the layered chunks and their source maps from the lambda package', async () => {
    const workspace = await buildWorkspace();

    await createLayerArtifacts(workspace);

    expect(await readdir(workspace.lambdaChunks)).toEqual(['chunk-local.js']);
    expect(await pathExists(join(workspace.lambdaChunks, 'chunk-shared.js.map'))).toBe(false);
    expect(workspace.output.files).toEqual([
      join(workspace.lambdaDir, 'index.js'),
      join(workspace.lambdaChunks, 'chunk-local.js')
    ]);
  });

  test('derives the layer content hash from the chunks so an unchanged layer is not re-uploaded', async () => {
    const first = await createLayerArtifacts(await buildWorkspace());
    const identical = await createLayerArtifacts(await buildWorkspace());
    const changed = await createLayerArtifacts(
      await buildWorkspace({ sharedChunkBody: 'import "./chunk-dep.js";\nexport const shared = "grown";\n' })
    );

    expect(first.layerArtifacts[0]!.contentHash).toMatch(/^[a-f0-9]{1,12}$/);
    expect(identical.layerArtifacts[0]!.contentHash).toBe(first.layerArtifacts[0]!.contentHash);
    expect(changed.layerArtifacts[0]!.contentHash).not.toBe(first.layerArtifacts[0]!.contentHash);
  });

  test('changes the layer hash when same-size chunk contents change', async () => {
    const first = await createLayerArtifacts(
      await buildWorkspace({ sharedChunkBody: 'import "./chunk-dep.js";\nexport const shared = 1;\n' })
    );
    const changed = await createLayerArtifacts(
      await buildWorkspace({ sharedChunkBody: 'import "./chunk-dep.js";\nexport const shared = 2;\n' })
    );

    expect(changed.layerArtifacts[0]!.contentHash).not.toBe(first.layerArtifacts[0]!.contentHash);
  });
});
