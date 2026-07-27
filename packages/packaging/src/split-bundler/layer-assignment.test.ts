import type { ChunkUsageAnalysis, LayerConfig } from './types';
import { describe, expect, test } from 'bun:test';
import { assignChunksToLayers, DEFAULT_LAYER_CONFIG } from './layer-assignment';

const chunk = ({
  name,
  sizeBytes,
  usageCount,
  dependsOn = []
}: {
  name: string;
  sizeBytes: number;
  usageCount: number;
  dependsOn?: string[];
}): ChunkUsageAnalysis => ({
  chunkName: name,
  chunkPath: `/build/shared/chunks/${name}`,
  sizeBytes,
  usedByLambdas: Array.from({ length: usageCount }, (_, index) => `lambda-${index}`),
  usageCount,
  deduplicationValue: sizeBytes * (usageCount - 1),
  dependsOn
});

const names = (assignments: Array<{ chunkName: string }>) => assignments.map(({ chunkName }) => chunkName).sort();

describe('assignChunksToLayers', () => {
  test('leaves a chunk in the lambda package when it is used by too few lambdas', () => {
    const result = assignChunksToLayers([chunk({ name: 'chunk-solo.js', sizeBytes: 5 * 1024, usageCount: 1 })]);

    expect(result.layeredChunks).toEqual([]);
    expect(names(result.unLayeredChunks)).toEqual(['chunk-solo.js']);
    expect(result.layers).toEqual([]);
    expect(result.totalBytesSaved).toBe(0);
  });

  test('leaves a chunk in the lambda package when it is smaller than the minimum layer-worthy size', () => {
    const result = assignChunksToLayers([chunk({ name: 'chunk-tiny.js', sizeBytes: 512, usageCount: 4 })]);

    expect(result.layeredChunks).toEqual([]);
    expect(names(result.unLayeredChunks)).toEqual(['chunk-tiny.js']);
  });

  test('layers a shared chunk that clears both defaults and reports the bytes it deduplicates', () => {
    const result = assignChunksToLayers([chunk({ name: 'chunk-shared.js', sizeBytes: 8 * 1024, usageCount: 3 })]);

    expect(result.layeredChunks).toEqual([
      { chunkName: 'chunk-shared.js', chunkPath: '/build/shared/chunks/chunk-shared.js', layerNumber: 1 }
    ]);
    expect(result.layers).toEqual([{ layerNumber: 1, chunks: ['chunk-shared.js'], totalSizeBytes: 8 * 1024 }]);
    expect(result.totalBytesSaved).toBe(8 * 1024 * 2);
  });

  test('promotes a dependency of a layered chunk even when the dependency itself is not layer-worthy', () => {
    // A layered chunk lives at /opt/nodejs/chunks and cannot import a chunk that stayed in /var/task.
    const result = assignChunksToLayers([
      chunk({ name: 'chunk-shared.js', sizeBytes: 8 * 1024, usageCount: 3, dependsOn: ['chunk-helper.js'] }),
      chunk({ name: 'chunk-helper.js', sizeBytes: 16, usageCount: 1 })
    ]);

    expect(names(result.layeredChunks)).toEqual(['chunk-helper.js', 'chunk-shared.js']);
    expect(result.unLayeredChunks).toEqual([]);
    // The promoted chunk is used by a single lambda, so it saves nothing and must not inflate the reported saving.
    expect(result.totalBytesSaved).toBe(8 * 1024 * 2);
  });

  test('packs chunks largest-first and never exceeds the per-layer size limit', () => {
    const config: LayerConfig = { minUsageCount: 2, minChunkSize: 1, maxLayers: 2, maxLayerSize: 1000 };
    const result = assignChunksToLayers(
      [
        chunk({ name: 'chunk-a.js', sizeBytes: 600, usageCount: 2 }),
        chunk({ name: 'chunk-b.js', sizeBytes: 500, usageCount: 2 }),
        chunk({ name: 'chunk-c.js', sizeBytes: 400, usageCount: 2 }),
        chunk({ name: 'chunk-d.js', sizeBytes: 300, usageCount: 2 })
      ],
      config
    );

    expect(result.layers).toEqual([
      { layerNumber: 1, chunks: ['chunk-a.js', 'chunk-c.js'], totalSizeBytes: 1000 },
      { layerNumber: 2, chunks: ['chunk-b.js', 'chunk-d.js'], totalSizeBytes: 800 }
    ]);
    for (const layer of result.layers) {
      expect(layer.totalSizeBytes).toBeLessThanOrEqual(config.maxLayerSize);
    }
  });

  test('keeps a chunk in the lambda package when no layer has room for it', () => {
    const result = assignChunksToLayers(
      [
        chunk({ name: 'chunk-big.js', sizeBytes: 900, usageCount: 2 }),
        chunk({ name: 'chunk-rest.js', sizeBytes: 800, usageCount: 2 })
      ],
      { minUsageCount: 2, minChunkSize: 1, maxLayers: 1, maxLayerSize: 1000 }
    );

    expect(names(result.layeredChunks)).toEqual(['chunk-big.js']);
    expect(result.unLayeredChunks).toEqual([
      { chunkName: 'chunk-rest.js', chunkPath: '/build/shared/chunks/chunk-rest.js', layerNumber: 0 }
    ]);
  });

  test('drops a chunk rather than layering it without its dependency when the layers are over capacity', () => {
    const result = assignChunksToLayers(
      [
        chunk({ name: 'chunk-app.js', sizeBytes: 900, usageCount: 2, dependsOn: ['chunk-helper.js'] }),
        chunk({ name: 'chunk-helper.js', sizeBytes: 100, usageCount: 1 }),
        chunk({ name: 'chunk-other.js', sizeBytes: 900, usageCount: 2 })
      ],
      { minUsageCount: 2, minChunkSize: 1, maxLayers: 1, maxLayerSize: 1000 }
    );

    expect(names(result.layeredChunks)).toEqual(['chunk-other.js']);
    expect(names(result.unLayeredChunks)).toEqual(['chunk-app.js', 'chunk-helper.js']);
  });

  test('every layered chunk has all of its dependencies layered too', () => {
    const analysis = [
      chunk({ name: 'chunk-root.js', sizeBytes: 40 * 1024, usageCount: 4, dependsOn: ['chunk-mid.js'] }),
      chunk({ name: 'chunk-mid.js', sizeBytes: 200, usageCount: 1, dependsOn: ['chunk-leaf.js'] }),
      chunk({ name: 'chunk-leaf.js', sizeBytes: 50, usageCount: 1 }),
      chunk({ name: 'chunk-private.js', sizeBytes: 90 * 1024, usageCount: 1 })
    ];
    const result = assignChunksToLayers(analysis);
    const layered = new Set(result.layeredChunks.map(({ chunkName }) => chunkName));

    expect(layered).toEqual(new Set(['chunk-root.js', 'chunk-mid.js', 'chunk-leaf.js']));
    for (const { chunkName, dependsOn } of analysis) {
      if (!layered.has(chunkName)) continue;
      for (const dependency of dependsOn) {
        expect(layered.has(dependency)).toBe(true);
      }
    }
  });

  test('assigns every analyzed chunk to exactly one of the two outcomes', () => {
    const analysis = [
      chunk({ name: 'chunk-a.js', sizeBytes: 8 * 1024, usageCount: 3 }),
      chunk({ name: 'chunk-b.js', sizeBytes: 8 * 1024, usageCount: 1 }),
      chunk({ name: 'chunk-c.js', sizeBytes: 64, usageCount: 5 })
    ];
    const result = assignChunksToLayers(analysis);

    expect(names([...result.layeredChunks, ...result.unLayeredChunks])).toEqual(names(analysis));
  });

  test('defaults keep three layers of 50MB and a 1KB/2-lambda entry bar', () => {
    expect(DEFAULT_LAYER_CONFIG).toEqual({
      minUsageCount: 2,
      minChunkSize: 1024,
      maxLayers: 3,
      maxLayerSize: 50 * 1024 * 1024
    });
  });
});
