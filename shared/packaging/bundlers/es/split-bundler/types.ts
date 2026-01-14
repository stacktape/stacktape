/**
 * Type definitions for the split bundler module.
 */

/** Lambda entrypoint configuration for split bundling */
export type LambdaEntrypoint = {
  /** Lambda function name */
  name: string;
  /** Absolute path to the entry file */
  entryfilePath: string;
  /** Job name for packaging output */
  jobName: string;
  /** Target folder for this lambda's output */
  distFolderPath: string;
};

/** Output information for a single lambda after split bundling */
export type LambdaSplitOutput = {
  /** Lambda function name */
  name: string;
  /** Path to the entry index.js file in distFolderPath */
  entryFile: string;
  /** All files in the lambda's dist folder (entry + chunks) */
  files: string[];
  /** Source files that were bundled for this lambda */
  sourceFiles: { path: string }[];
  /** Dependencies that need Docker installation */
  dependenciesToInstallInDocker: ModuleInfo[];
  /** All resolved npm modules */
  resolvedModules: string[];
};

/** Module info for dependencies that need special handling */
export type ModuleInfo = {
  name: string;
  version?: string;
  note?: string;
  hasBinary?: boolean;
  peerDependencies?: ModuleInfo[];
  optionalPeerDependencies?: ModuleInfo[];
};

/** Result of the split bundling process */
export type SplitBundleResult = {
  /** Map of lambda name -> output info */
  lambdaOutputs: Map<string, LambdaSplitOutput>;
  /** Total number of shared chunks created */
  sharedChunkCount: number;
  /** Time taken to bundle (ms) */
  bundleTimeMs: number;
  /** Chunk usage analysis for layer optimization */
  chunkAnalysis: ChunkUsageAnalysis[];
};

/** Analysis of a single chunk's usage across lambdas */
export type ChunkUsageAnalysis = {
  /** Chunk filename (e.g., "chunk-abc123.js") */
  chunkName: string;
  /** Full path to the chunk file in shared outdir */
  chunkPath: string;
  /** Size in bytes */
  sizeBytes: number;
  /** Lambda names that use this chunk */
  usedByLambdas: string[];
  /** Number of lambdas using this chunk */
  usageCount: number;
  /** Deduplication value: sizeBytes * (usageCount - 1) - bytes saved if put in layer */
  deduplicationValue: number;
  /** Other chunk names that this chunk imports (dependencies) */
  dependsOn: string[];
};

/** Layer assignment for a single chunk */
export type ChunkLayerAssignment = {
  chunkName: string;
  chunkPath: string;
  /** Layer number (1-5) or 0 if chunk stays in lambda package */
  layerNumber: number;
};

/** Configuration for layer assignment algorithm */
export type LayerConfig = {
  /** Minimum number of lambdas that must use a chunk for it to go in a layer */
  minUsageCount: number;
  /** Minimum chunk size (bytes) to consider for layer */
  minChunkSize: number;
  /** Maximum number of layers to create (1-5) */
  maxLayers: number;
  /** Maximum size per layer in bytes (AWS limit is 250MB unzipped) */
  maxLayerSize: number;
};

/** Result of layer assignment computation */
export type LayerAssignmentResult = {
  /** Chunks assigned to layers (layer 1-5) */
  layeredChunks: ChunkLayerAssignment[];
  /** Chunks that stay in lambda packages (layer 0) */
  unLayeredChunks: ChunkLayerAssignment[];
  /** Layer summaries */
  layers: Array<{
    layerNumber: number;
    chunks: string[];
    totalSizeBytes: number;
  }>;
  /** Total bytes saved by using layers */
  totalBytesSaved: number;
};

/** Layer artifact ready for deployment */
export type LayerArtifact = {
  layerNumber: number;
  layerPath: string;
  chunks: string[];
  sizeBytes: number;
  /** Content-based hash for caching (based on chunk names and sizes) */
  contentHash: string;
};

/** Options for buildSplitBundle */
export type BuildSplitBundleOptions = {
  entrypoints: LambdaEntrypoint[];
  /** Shared output directory for the initial bundle */
  sharedOutdir: string;
  cwd: string;
  tsConfigPath?: string;
  nodeTarget: string;
  minify?: boolean;
  sourceMaps?: 'inline' | 'external' | 'disabled';
  sourceMapBannerType?: 'node_modules' | 'pre-compiled' | 'disabled';
  excludeDependencies?: string[];
  dependenciesToExcludeFromBundle?: string[];
  progressLogger?: ProgressLogger;
};

/** Progress logger interface for build events */
export type ProgressLogger = {
  eventContext: Record<string, unknown>;
  startEvent: (params: unknown) => Promise<void>;
  updateEvent: (params: unknown) => Promise<void>;
  finishEvent: (params: unknown) => Promise<void>;
};
