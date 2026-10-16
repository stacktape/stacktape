import type { LambdaSplitOutput, LayerAssignmentResult } from './types';
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outputFile } from 'fs-extra';
import { getDirectoryChecksum } from '../artifact/hashing';
import { createLayerArtifacts } from './layer-builder';

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
    externalDependencies: [],
    productionDependencies: [],
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
  test('names a layer by a hash its pre-format ZIP never had, so that ZIP is not reused', async () => {
    const [layer] = (await createLayerArtifacts(await buildWorkspace())).layerArtifacts;
    // The hash, and so the S3 key, a layer had before Lambda archives had a format: its directory checksum alone.
    const previousFormula = (await getDirectoryChecksum({ absoluteDirectoryPath: layer!.layerPath })).slice(0, 12);

    expect(layer!.contentHash).not.toBe(previousFormula);
  });
});
