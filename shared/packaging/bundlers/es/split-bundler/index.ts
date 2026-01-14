/**
 * Split Bundler - Uses Bun's code splitting to bundle multiple Lambda entrypoints together.
 *
 * This module bundles all Lambda functions in a single Bun.build() call with splitting enabled.
 * Bun automatically creates shared chunks for code used by multiple entrypoints.
 *
 * Output structure:
 * - outdir/
 *   - [relative-path]/index.js (entry points, mirrors input structure)
 *   - chunks/chunk-[hash].js (shared code)
 *
 * Each Lambda package includes its entry file + all chunks it imports.
 * Shared chunks can be extracted into Lambda Layers for deduplication.
 */

// Core bundling
export { buildSplitBundle } from './bundler';

// Layer assignment
export { assignChunksToLayers } from './layer-assignment';

// Layer building
export { createLayerArtifacts } from './layer-builder';

// Constants
export { DEFAULT_LAYER_CONFIG, LAYER_CHUNKS_PATH } from './constants';

// Types
export type {
  BuildSplitBundleOptions,
  ChunkLayerAssignment,
  ChunkUsageAnalysis,
  LambdaEntrypoint,
  LambdaSplitOutput,
  LayerArtifact,
  LayerAssignmentResult,
  LayerConfig,
  ModuleInfo,
  ProgressLogger,
  SplitBundleResult
} from './types';
