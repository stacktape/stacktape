/**
 * Layer assignment algorithm for distributing chunks across Lambda Layers.
 *
 * Uses a dependency-aware algorithm that:
 * 1. Identifies high-value chunks (meet usage/size thresholds)
 * 2. Promotes their dependencies to also be layered (even if below threshold)
 * 3. Assigns to layers using First Fit Decreasing (FFD) bin-packing
 * 4. Un-layers any chunk the packing could not place, along with everything that imports it
 *
 * IMPORTANT: A chunk can only be layered if ALL chunks it depends on are also layered.
 * This is because layered chunks live at /opt/nodejs/chunks/ and cannot import
 * non-layered chunks which live at /var/task/chunks/ (lambda-specific).
 * Steps 2 and 4 together are what make that hold: promotion alone decides the candidate
 * set, and the packing can still refuse a candidate after that decision.
 */

import type { ChunkLayerAssignment, ChunkUsageAnalysis, LayerAssignmentResult, LayerConfig } from './types';

export const DEFAULT_LAYER_CONFIG: LayerConfig = {
  minUsageCount: 2, // Chunk must be used by at least 2 lambdas
  minChunkSize: 1024, // At least 1KB
  maxLayers: 3, // Use up to 3 layers (leave 2 for user's custom layers)
  maxLayerSize: 50 * 1024 * 1024 // 50MB per layer (conservative limit)
};

/**
 * Fill the layers with the given chunks, largest first, putting each one in the first layer with room for it.
 * Reports the chunks that no layer could take.
 */
const packIntoLayers = (candidates: ChunkUsageAnalysis[], config: LayerConfig) => {
  const layerContents = new Map<number, { chunks: string[]; totalSize: number }>();
  for (let i = 1; i <= config.maxLayers; i++) {
    layerContents.set(i, { chunks: [], totalSize: 0 });
  }

  const placements: ChunkLayerAssignment[] = [];
  const unplaced: ChunkUsageAnalysis[] = [];

  for (const chunk of candidates) {
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
      placements.push({ chunkName: chunk.chunkName, chunkPath: chunk.chunkPath, layerNumber: assignedLayer });
    } else {
      unplaced.push(chunk);
    }
  }

  return { layerContents, placements, unplaced };
};

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
  let sortedCandidates = [...layerCandidates]
    .map((name) => chunkByName.get(name)!)
    .filter(Boolean)
    .toSorted((a, b) => b.sizeBytes - a.sizeBytes);

  // Which chunks import a given chunk, for when a chunk turns out not to be layerable after all.
  const importersOf = new Map<string, string[]>();
  for (const chunk of chunkAnalysis) {
    for (const dep of chunk.dependsOn) {
      const importers = importersOf.get(dep);
      if (importers) {
        importers.push(chunk.chunkName);
      } else {
        importersOf.set(dep, [chunk.chunkName]);
      }
    }
  }

  // Step 5: Fitting in aggregate is not enough. First fit stops filling a layer as soon as the next chunk is
  // too big for it, so the free space ends up split across the layers and a chunk larger than every one of
  // those remainders has nowhere to go even when the candidates would have fit. Leaving such a chunk behind
  // while its importers stay layered is exactly the /opt-imports-/var/task breakage step 2 exists to prevent,
  // so drop it together with everything that transitively imports it. Dropping frees layer space, so the
  // remaining candidates are packed again from scratch rather than patched.
  let packing = packIntoLayers(sortedCandidates, config);
  while (packing.unplaced.length > 0) {
    const toDrop = packing.unplaced.map((chunk) => chunk.chunkName);
    while (toDrop.length > 0) {
      const chunkName = toDrop.pop()!;
      // `delete` reports whether the chunk was still a candidate, which also keeps import cycles finite.
      if (!layerCandidates.delete(chunkName)) continue;
      toDrop.push(...(importersOf.get(chunkName) ?? []));
    }

    sortedCandidates = sortedCandidates.filter((chunk) => layerCandidates.has(chunk.chunkName));
    packing = packIntoLayers(sortedCandidates, config);
  }

  // Every remaining candidate is layered, so everything else is what stays in the lambda package.
  const layeredChunks = packing.placements;
  const unLayeredChunks: ChunkLayerAssignment[] = [];
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
    const content = packing.layerContents.get(i)!;
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
