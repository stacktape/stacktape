/**
 * Constants for the split bundler module.
 */

import type { LayerConfig } from './types';

/** Path where layer chunks are mounted in AWS Lambda runtime */
export const LAYER_CHUNKS_PATH = '/opt/nodejs/chunks/';

/** Default configuration for layer assignment algorithm */
export const DEFAULT_LAYER_CONFIG: LayerConfig = {
  minUsageCount: 2, // Chunk must be used by at least 2 lambdas
  minChunkSize: 1024, // At least 1KB
  maxLayers: 3, // Use up to 3 layers (leave 2 for user's custom layers)
  maxLayerSize: 50 * 1024 * 1024 // 50MB per layer (conservative limit)
};
