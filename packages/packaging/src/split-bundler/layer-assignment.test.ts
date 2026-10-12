import type { ChunkUsageAnalysis, LayerConfig } from './types';
import { describe, expect, test } from 'bun:test';
import { assignChunksToLayers } from './layer-assignment';

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
});
