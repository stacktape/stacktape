/**
 * Layer assignment algorithm for distributing chunks across Lambda Layers.
 *
 * Uses a dependency-aware algorithm that:
 * 1. Identifies high-value chunks (meet usage/size thresholds)
 * 2. Promotes their dependencies to also be layered (even if below threshold)
 * 3. Assigns to layers using First Fit Decreasing (FFD) bin-packing
 *
 * IMPORTANT: A chunk can only be layered if ALL chunks it depends on are also layered.
 * This is because layered chunks live at /opt/nodejs/chunks/ and cannot import
 * non-layered chunks which live at /var/task/chunks/ (lambda-specific).
 */

import type { ChunkLayerAssignment, ChunkUsageAnalysis, LayerAssignmentResult, LayerConfig } from './types';
import { DEFAULT_LAYER_CONFIG } from './constants';

/**
 * Assign chunks to Lambda Layers based on usage analysis and configuration.
 *
 * Algorithm:
 * 1. Identify "seed" chunks that meet usage/size thresholds
 * 2. Recursively include all dependencies of seed chunks (dependency promotion)
 * 3. Assign to layers using First Fit Decreasing (FFD) bin-packing
 * 4. Respect layer count and size limits
 *
 * @param chunkAnalysis - Chunk usage analysis (should be sorted by deduplicationValue descending)
 * @param config - Layer configuration options
 * @returns Layer assignment result with chunk distributions
 */
export const assignChunksToLayers = (
  chunkAnalysis: ChunkUsageAnalysis[],
  config: LayerConfig = DEFAULT_LAYER_CONFIG
): LayerAssignmentResult => {
  // Build lookup maps for quick access
  const chunkByName = new Map<string, ChunkUsageAnalysis>();
  for (const chunk of chunkAnalysis) {
    chunkByName.set(chunk.chunkName, chunk);
  }

  // Step 1: Identify "seed" chunks that meet the minimum criteria
  const seedChunks = new Set<string>();
  for (const chunk of chunkAnalysis) {
    if (chunk.usageCount >= config.minUsageCount && chunk.sizeBytes >= config.minChunkSize) {
      seedChunks.add(chunk.chunkName);
    }
  }

  // Step 2: Promote dependencies - if a seed chunk depends on another chunk,
  // that dependency must also be layered (even if it doesn't meet thresholds)
  const layerCandidates = new Set<string>();
  const toProcess = [...seedChunks];

  while (toProcess.length > 0) {
    const chunkName = toProcess.pop()!;
    if (layerCandidates.has(chunkName)) continue;

    layerCandidates.add(chunkName);

    // Add all dependencies to be processed
    const chunk = chunkByName.get(chunkName);
    if (chunk) {
      for (const dep of chunk.dependsOn) {
        if (!layerCandidates.has(dep)) {
          toProcess.push(dep);
        }
      }
    }
  }

  // Step 3: Calculate total size of all candidates to check if they fit
  let totalCandidateSize = 0;
  for (const chunkName of layerCandidates) {
    const chunk = chunkByName.get(chunkName);
    if (chunk) {
      totalCandidateSize += chunk.sizeBytes;
    }
  }

  const maxTotalLayerSize = config.maxLayers * config.maxLayerSize;

  // If candidates exceed max layer capacity, we need to be selective
  // Fall back to only including chunks where ALL dependencies also meet threshold
  if (totalCandidateSize > maxTotalLayerSize) {
    layerCandidates.clear();

    // Start with seeds
    for (const seed of seedChunks) {
      layerCandidates.add(seed);
    }

    // Remove chunks whose dependencies aren't all in the candidate set
    let changed = true;
    while (changed) {
      changed = false;
      for (const chunkName of layerCandidates) {
        const chunk = chunkByName.get(chunkName);
        if (!chunk) continue;

        for (const dep of chunk.dependsOn) {
          if (!layerCandidates.has(dep)) {
            layerCandidates.delete(chunkName);
            changed = true;
            break;
          }
        }
      }
    }
  }

  // Step 4: Assign eligible chunks to layers using FFD bin-packing
  // Sort candidates by size descending for better bin packing
  const sortedCandidates = [...layerCandidates]
    .map((name) => chunkByName.get(name)!)
    .filter(Boolean)
    .sort((a, b) => b.sizeBytes - a.sizeBytes);

  const layeredChunks: ChunkLayerAssignment[] = [];
  const unLayeredChunks: ChunkLayerAssignment[] = [];

  const layerContents = new Map<number, { chunks: string[]; totalSize: number }>();
  for (let i = 1; i <= config.maxLayers; i++) {
    layerContents.set(i, { chunks: [], totalSize: 0 });
  }

  // First, assign all candidates
  for (const chunk of sortedCandidates) {
    let assignedLayer = 0;
    for (let layerNum = 1; layerNum <= config.maxLayers; layerNum++) {
      const layer = layerContents.get(layerNum)!;
      if (layer.totalSize + chunk.sizeBytes <= config.maxLayerSize) {
        layer.chunks.push(chunk.chunkName);
        layer.totalSize += chunk.sizeBytes;
        assignedLayer = layerNum;
        break;
      }
    }

    if (assignedLayer > 0) {
      layeredChunks.push({
        chunkName: chunk.chunkName,
        chunkPath: chunk.chunkPath,
        layerNumber: assignedLayer
      });
    } else {
      // Shouldn't happen if we calculated sizes correctly, but handle gracefully
      unLayeredChunks.push({
        chunkName: chunk.chunkName,
        chunkPath: chunk.chunkPath,
        layerNumber: 0
      });
    }
  }

  // Add non-candidates to unLayered list
  for (const chunk of chunkAnalysis) {
    if (!layerCandidates.has(chunk.chunkName)) {
      unLayeredChunks.push({
        chunkName: chunk.chunkName,
        chunkPath: chunk.chunkPath,
        layerNumber: 0
      });
    }
  }

  // Build layer summaries (only non-empty layers)
  const layers: LayerAssignmentResult['layers'] = [];
  for (let i = 1; i <= config.maxLayers; i++) {
    const content = layerContents.get(i)!;
    if (content.chunks.length > 0) {
      layers.push({
        layerNumber: i,
        chunks: content.chunks,
        totalSizeBytes: content.totalSize
      });
    }
  }

  // Calculate total bytes saved (only count chunks that meet original criteria)
  const totalBytesSaved = layeredChunks.reduce((sum, assignment) => {
    const analysis = chunkByName.get(assignment.chunkName);
    if (analysis && analysis.usageCount >= config.minUsageCount) {
      return sum + analysis.deduplicationValue;
    }
    return sum;
  }, 0);

  return {
    layeredChunks,
    unLayeredChunks,
    layers,
    totalBytesSaved
  };
};
