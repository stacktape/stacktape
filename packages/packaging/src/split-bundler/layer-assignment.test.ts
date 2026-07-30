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
  dependsOn?: string[] | undefined;
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

  test('layers nothing when every candidate importer depends on a chunk the packing cannot place', () => {
    // The candidates fit the layers in aggregate (17 bytes into 2 x 10), but first fit puts one importer in
    // each layer and leaves 4 free bytes behind in both, so the 5-byte dependency fits in neither. Layering
    // the importers anyway would ship /opt chunks importing a chunk that stayed in /var/task.
    const analysis = [
      chunk({ name: 'chunk-a.js', sizeBytes: 6, usageCount: 2, dependsOn: ['chunk-dep.js'] }),
      chunk({ name: 'chunk-b.js', sizeBytes: 6, usageCount: 2, dependsOn: ['chunk-dep.js'] }),
      chunk({ name: 'chunk-dep.js', sizeBytes: 5, usageCount: 1 })
    ];
    const result = assignChunksToLayers(analysis, {
      minUsageCount: 2,
      minChunkSize: 1,
      maxLayers: 2,
      maxLayerSize: 10
    });

    expect(result.layeredChunks).toEqual([]);
    expect(names(result.unLayeredChunks)).toEqual(['chunk-a.js', 'chunk-b.js', 'chunk-dep.js']);
    expect(result.layers).toEqual([]);
    expect(result.totalBytesSaved).toBe(0);
  });

  test('keeps layering the chunks that survive when a stranded dependency drops only its own importer', () => {
    const analysis = [
      chunk({ name: 'chunk-importer.js', sizeBytes: 6, usageCount: 2, dependsOn: ['chunk-dep.js'] }),
      chunk({ name: 'chunk-alone.js', sizeBytes: 6, usageCount: 2 }),
      chunk({ name: 'chunk-dep.js', sizeBytes: 5, usageCount: 1 })
    ];
    const result = assignChunksToLayers(analysis, {
      minUsageCount: 2,
      minChunkSize: 1,
      maxLayers: 2,
      maxLayerSize: 10
    });

    // `chunk-alone.js` depends on nothing stranded, so it keeps the layer that dropping the other two freed.
    expect(names(result.layeredChunks)).toEqual(['chunk-alone.js']);
    expect(names(result.unLayeredChunks)).toEqual(['chunk-dep.js', 'chunk-importer.js']);
    expect(result.layers).toEqual([{ layerNumber: 1, chunks: ['chunk-alone.js'], totalSizeBytes: 6 }]);
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

  test('holds the layering invariant across deeper dependency graphs and tighter layers', () => {
    // The two importers over one dependency above is only the smallest shape in which packing can strand a
    // dependency. Chains, shared sub-dependencies and layer counts other than two have to come out consistent
    // too, so sweep deterministic graphs and assert the three properties the rest of the pipeline relies on.
    let seed = 20260727;
    const nextInt = (bound: number) => {
      seed = (seed * 48271) % 2147483647;
      return seed % bound;
    };

    for (let round = 0; round < 200; round++) {
      const analysis: ChunkUsageAnalysis[] = [];
      const chunkCount = 3 + nextInt(8);
      for (let index = 0; index < chunkCount; index++) {
        const dependsOn = Array.from({ length: index }, (_, earlier) => earlier)
          .filter(() => nextInt(4) === 0)
          .map((earlier) => `chunk-${earlier}.js`);
        analysis.push(
          chunk({ name: `chunk-${index}.js`, sizeBytes: 1 + nextInt(12), usageCount: 1 + nextInt(3), dependsOn })
        );
      }

      const config: LayerConfig = {
        minUsageCount: 2,
        minChunkSize: 1,
        maxLayers: 1 + nextInt(3),
        maxLayerSize: 5 + nextInt(20)
      };
      const result = assignChunksToLayers(analysis, config);
      const layered = new Set(result.layeredChunks.map(({ chunkName }) => chunkName));

      // A layered chunk's direct dependencies are layered, which by induction covers its transitive ones.
      for (const { chunkName, dependsOn } of analysis) {
        if (!layered.has(chunkName)) continue;
        for (const dependency of dependsOn) {
          expect(layered).toContain(dependency);
        }
      }
      expect(names([...result.layeredChunks, ...result.unLayeredChunks])).toEqual(names(analysis));
      for (const layer of result.layers) {
        expect(layer.totalSizeBytes).toBeLessThanOrEqual(config.maxLayerSize);
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
