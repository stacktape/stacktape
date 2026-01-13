import type {
  DependencyAnalysisResult,
  FunctionLayerContext,
  LayerAssignment,
  MultiLayerAnalysisResult
} from './dependency-analyzer';
import { analyzeDependencies, analyzeDependenciesFromPackageJson, analyzeOptimalLayers } from './dependency-analyzer';
import {
  buildSharedLayerSimple,
  generateLayerHash,
  getLayerName,
  buildMultipleLayers,
  type LayerBuildResult,
  type MultiLayerBuildResult
} from './layer-builder';

export type SharedLayerConfig = {
  /** Enable/disable shared layer optimization */
  enabled: boolean;
  /** Minimum savings in bytes to include a dep in layer (default: 200KB) */
  minSavingsBytes?: number;
  /** Minimum number of functions using a dep to include it (default: 2) */
  minUsageCount?: number;
  /** Max layer size in bytes (default: 40MB) */
  maxLayerSizeBytes?: number;
};

export type LayerInfo = {
  layerArn: string;
  layerVersionArn: string;
  layerHash: string;
  dependencies: { name: string; version: string }[];
};

export type MultiLayerInfo = {
  layerId: string;
  layerArn: string;
  layerVersionArn: string;
  layerHash: string;
  functions: string[]; // Functions that use this layer
  dependencies: { name: string; version: string }[];
};

type PublishLayerParams = {
  layerName: string;
  zipFilePath: string;
  compatibleRuntimes: string[];
  description?: string;
};

type DeleteLayerVersionParams = {
  layerName: string;
  versionNumber: number;
};

type ListLayerVersionsParams = {
  layerName: string;
};

type LayerVersionInfo = {
  versionNumber: number;
  createdDate: string;
  description?: string;
};

/**
 * Manages shared Lambda layers for dependency optimization.
 */
export class SharedLayerManager {
  #stackName: string;
  #region: string;
  #accountId: string;
  #cwd: string;
  #distFolderPath: string;
  #nodeVersion: number;
  #packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
  #architecture: 'linux/amd64' | 'linux/arm64';
  #allSameArchitecture: boolean;

  // AWS SDK functions injected to avoid circular dependencies
  #publishLayer: (
    params: PublishLayerParams
  ) => Promise<{ layerArn: string; layerVersionArn: string; version: number }>;
  #deleteLayerVersion: (params: DeleteLayerVersionParams) => Promise<void>;
  #listLayerVersions: (params: ListLayerVersionsParams) => Promise<LayerVersionInfo[]>;
  #checkLayerExists: (layerName: string) => Promise<boolean>;

  #analysisResult: DependencyAnalysisResult | null = null;
  #builtLayer: LayerBuildResult | null = null;
  #publishedLayer: LayerInfo | null = null;

  // Multi-layer support
  #multiLayerAnalysis: MultiLayerAnalysisResult | null = null;
  #builtLayers: MultiLayerBuildResult | null = null;
  #publishedLayers: Map<string, MultiLayerInfo> = new Map();
  #functionLayerMap: Map<string, string[]> = new Map(); // function -> layer IDs

  constructor({
    stackName,
    region,
    accountId,
    cwd,
    distFolderPath,
    nodeVersion,
    packageManager,
    architecture,
    publishLayer,
    deleteLayerVersion,
    listLayerVersions,
    checkLayerExists
  }: {
    stackName: string;
    region: string;
    accountId: string;
    cwd: string;
    distFolderPath: string;
    nodeVersion: number;
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
    architecture?: 'linux/amd64' | 'linux/arm64';
    publishLayer: (
      params: PublishLayerParams
    ) => Promise<{ layerArn: string; layerVersionArn: string; version: number }>;
    deleteLayerVersion: (params: DeleteLayerVersionParams) => Promise<void>;
    listLayerVersions: (params: ListLayerVersionsParams) => Promise<LayerVersionInfo[]>;
    checkLayerExists: (layerName: string) => Promise<boolean>;
  }) {
    this.#stackName = stackName;
    this.#region = region;
    this.#accountId = accountId;
    this.#cwd = cwd;
    this.#distFolderPath = distFolderPath;
    this.#nodeVersion = nodeVersion;
    this.#packageManager = packageManager;
    // If architecture is provided, all functions share it - can include native deps
    this.#allSameArchitecture = architecture !== undefined;
    this.#architecture = architecture ?? 'linux/amd64';
    this.#publishLayer = publishLayer;
    this.#deleteLayerVersion = deleteLayerVersion;
    this.#listLayerVersions = listLayerVersions;
    this.#checkLayerExists = checkLayerExists;
  }

  /**
   * Analyze dependencies across all functions.
   */
  async analyze(
    functions: { name: string; dependencies: { name: string; version: string }[] }[]
  ): Promise<DependencyAnalysisResult> {
    this.#analysisResult = await analyzeDependencies({
      functions,
      cwd: this.#cwd,
      nodeVersion: this.#nodeVersion
    });
    return this.#analysisResult;
  }

  /**
   * Analyze dependencies from package.json.
   * Simpler approach that assumes all prod deps could be used by all functions.
   */
  async analyzeFromPackageJson(functionCount: number): Promise<DependencyAnalysisResult> {
    this.#analysisResult = await analyzeDependenciesFromPackageJson({
      cwd: this.#cwd,
      nodeVersion: this.#nodeVersion,
      functionCount,
      allSameArchitecture: this.#allSameArchitecture
    });
    return this.#analysisResult;
  }

  /**
   * Get the analysis result. Must call analyze() first.
   */
  getAnalysisResult(): DependencyAnalysisResult | null {
    return this.#analysisResult;
  }

  /**
   * Check if a shared layer is worth building (has shared dependencies).
   */
  hasSharedDependencies(): boolean {
    return (this.#analysisResult?.sharedDependencies.length ?? 0) > 0;
  }

  /**
   * Get list of dependency names that will be in the shared layer.
   * Returns sorted list for deterministic ordering (important for digest calculation).
   */
  getLayerDependencyNames(): string[] {
    return (this.#analysisResult?.sharedDependencies.map((d) => d.name) ?? []).sort();
  }

  /**
   * Get the hash of the layer based on dependencies.
   * Can be called after analyze() to check if layer already exists before building.
   */
  getLayerHash(): string | null {
    if (!this.#analysisResult || this.#analysisResult.sharedDependencies.length === 0) {
      return null;
    }
    return generateLayerHash(
      this.#analysisResult.sharedDependencies.map((d) => ({ name: d.name, version: d.version }))
    );
  }

  /**
   * Check if a layer with the current dependencies already exists in AWS.
   * Returns the existing layer info if found, null otherwise.
   * Can be called after analyze() to skip building if layer exists.
   */
  async checkExistingLayer(): Promise<LayerInfo | null> {
    const hash = this.getLayerHash();
    if (!hash) return null;

    const layerName = getLayerName(this.#stackName, hash);
    const existingLayer = await this.#findExistingLayerByHash(layerName, hash);

    if (existingLayer) {
      // Store the layer info so we can skip build and publish
      this.#publishedLayer = existingLayer;
      return existingLayer;
    }

    return null;
  }

  /**
   * Build the shared layer. Must call analyze() first.
   */
  async build(): Promise<LayerBuildResult> {
    if (!this.#analysisResult) {
      throw new Error('Must call analyze() before build()');
    }

    if (this.#analysisResult.sharedDependencies.length === 0) {
      throw new Error('No shared dependencies to build layer for');
    }

    // Always use simple copy - it's much faster and works for all deps that are
    // already installed in node_modules (including native deps with prebuilt binaries).
    // Docker build was intended for cross-platform compilation but is rarely needed
    // since most native deps (like Prisma) ship with prebuilt binaries for Lambda.
    this.#builtLayer = await buildSharedLayerSimple({
      dependencies: this.#analysisResult.sharedDependencies,
      cwd: this.#cwd,
      distFolderPath: this.#distFolderPath
    });

    return this.#builtLayer;
  }

  /**
   * Publish the built layer to AWS. Must call build() first.
   * Returns the layer ARN to use in Lambda functions.
   */
  async publish(): Promise<LayerInfo> {
    if (!this.#builtLayer) {
      throw new Error('Must call build() before publish()');
    }

    const layerName = getLayerName(this.#stackName, this.#builtLayer.layerHash);
    const compatibleRuntimes = [`nodejs${this.#nodeVersion}.x`];
    const depCount = this.#builtLayer.dependencies.length;
    const depNames = this.#builtLayer.dependencies.map((d) => d.name).join(', ');
    // AWS Lambda layer description has a 256 character limit
    // Account for the hash suffix that will be appended: " [hash:xxxxxxxx]" (18 chars for 8-char hash)
    const maxDescLength = 256;
    const hashSuffix = ` [hash:${this.#builtLayer.layerHash}]`;
    const maxDepsDescLength = maxDescLength - hashSuffix.length;
    const prefix = `Shared deps (${depCount}): `;
    const depsDescription =
      prefix.length + depNames.length <= maxDepsDescLength
        ? `${prefix}${depNames}`
        : `${prefix}${depNames.slice(0, maxDepsDescLength - prefix.length - 3)}...`;
    const fullDescription = `${depsDescription}${hashSuffix}`;

    // Check if a layer with this hash already exists
    const existingLayer = await this.#findExistingLayerByHash(layerName, this.#builtLayer.layerHash);
    if (existingLayer) {
      this.#publishedLayer = existingLayer;
      return existingLayer;
    }

    const { readFile } = await import('fs-extra');
    const zipContent = await readFile(this.#builtLayer.layerZipPath);

    const { layerArn, layerVersionArn, version } = await this.#publishLayer({
      layerName,
      zipFilePath: this.#builtLayer.layerZipPath,
      compatibleRuntimes,
      description: fullDescription
    });

    this.#publishedLayer = {
      layerArn,
      layerVersionArn,
      layerHash: this.#builtLayer.layerHash,
      dependencies: this.#builtLayer.dependencies
    };

    // Cleanup old layer versions
    await this.#cleanupOldVersions(layerName);

    return this.#publishedLayer;
  }

  /**
   * Get the published layer info. Must call publish() first.
   */
  getPublishedLayer(): LayerInfo | null {
    return this.#publishedLayer;
  }

  /**
   * Get the built layer info. Must call build() first.
   */
  getBuiltLayer(): LayerBuildResult | null {
    return this.#builtLayer;
  }

  /**
   * Find an existing layer version by hash (stored in description).
   */
  async #findExistingLayerByHash(layerName: string, hash: string): Promise<LayerInfo | null> {
    try {
      const exists = await this.#checkLayerExists(layerName);
      if (!exists) return null;

      const versions = await this.#listLayerVersions({ layerName });
      const matchingVersion = versions.find((v) => v.description?.includes(`[hash:${hash}]`));

      if (matchingVersion) {
        const layerArn = `arn:aws:lambda:${this.#region}:${this.#accountId}:layer:${layerName}`;
        return {
          layerArn,
          layerVersionArn: `${layerArn}:${matchingVersion.versionNumber}`,
          layerHash: hash,
          dependencies: this.#builtLayer?.dependencies ?? []
        };
      }
    } catch {
      // Layer doesn't exist yet
    }
    return null;
  }

  /**
   * Clean up old layer versions, keeping only the most recent ones.
   */
  async #cleanupOldVersions(layerName: string, keepCount = 3): Promise<void> {
    try {
      const versions = await this.#listLayerVersions({ layerName });

      // Sort by version number descending
      const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

      // Delete old versions beyond keepCount
      const toDelete = sorted.slice(keepCount);

      for (const version of toDelete) {
        await this.#deleteLayerVersion({
          layerName,
          versionNumber: version.versionNumber
        }).catch(() => {
          // Ignore errors during cleanup
        });
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Get summary of estimated savings.
   */
  getSavingsSummary(): { totalSavings: number; layerSize: number; depsCount: number } {
    return {
      totalSavings: this.#analysisResult?.estimatedSavings ?? 0,
      layerSize: this.#analysisResult?.estimatedLayerSize ?? 0,
      depsCount: this.#analysisResult?.sharedDependencies.length ?? 0
    };
  }

  // ================== Multi-Layer Support ==================

  /**
   * Analyze dependencies and compute optimal layer assignments.
   * Uses a greedy weighted algorithm to maximize savings while respecting layer slot limits.
   */
  analyzeMultipleLayers(functionContexts: FunctionLayerContext[]): MultiLayerAnalysisResult {
    this.#multiLayerAnalysis = analyzeOptimalLayers({
      functionContexts,
      nodeVersion: this.#nodeVersion,
      allSameArchitecture: this.#allSameArchitecture
    });

    // Store the function -> layer map
    this.#functionLayerMap = new Map(this.#multiLayerAnalysis.functionLayerMap);

    return this.#multiLayerAnalysis;
  }

  /**
   * Get the multi-layer analysis result.
   */
  getMultiLayerAnalysis(): MultiLayerAnalysisResult | null {
    return this.#multiLayerAnalysis;
  }

  /**
   * Check if multi-layer analysis has produced any layers.
   */
  hasMultipleLayers(): boolean {
    return (this.#multiLayerAnalysis?.layers.length ?? 0) > 0;
  }

  /**
   * Build all layers from multi-layer analysis.
   */
  async buildMultipleLayers(): Promise<MultiLayerBuildResult> {
    if (!this.#multiLayerAnalysis) {
      throw new Error('Must call analyzeMultipleLayers() before buildMultipleLayers()');
    }

    if (this.#multiLayerAnalysis.layers.length === 0) {
      this.#builtLayers = new Map();
      return this.#builtLayers;
    }

    this.#builtLayers = await buildMultipleLayers({
      layerAssignments: this.#multiLayerAnalysis.layers,
      cwd: this.#cwd,
      distFolderPath: this.#distFolderPath,
      nodeVersion: this.#nodeVersion,
      packageManager: this.#packageManager,
      hasNativeDeps: false, // Use simple copy by default
      architecture: this.#architecture
    });

    return this.#builtLayers;
  }

  /**
   * Get layer hash for a specific layer assignment.
   */
  #getMultiLayerHash(layerId: string): string | null {
    const buildResult = this.#builtLayers?.get(layerId);
    return buildResult?.layerHash ?? null;
  }

  /**
   * Publish all built layers to AWS.
   */
  async publishMultipleLayers(): Promise<Map<string, MultiLayerInfo>> {
    if (!this.#builtLayers || !this.#multiLayerAnalysis) {
      throw new Error('Must call buildMultipleLayers() before publishMultipleLayers()');
    }

    for (const [layerId, buildResult] of this.#builtLayers) {
      const assignment = this.#multiLayerAnalysis.layers.find((l) => l.layerId === layerId);
      if (!assignment) continue;

      const layerName = getLayerName(this.#stackName, buildResult.layerHash);
      const compatibleRuntimes = [`nodejs${this.#nodeVersion}.x`];

      // Build description
      const depCount = buildResult.dependencies.length;
      const depNames = buildResult.dependencies.map((d) => d.name).join(', ');
      const maxDescLength = 256;
      const hashSuffix = ` [hash:${buildResult.layerHash}]`;
      const maxDepsDescLength = maxDescLength - hashSuffix.length;
      const prefix = `Shared deps (${depCount}): `;
      const depsDescription =
        prefix.length + depNames.length <= maxDepsDescLength
          ? `${prefix}${depNames}`
          : `${prefix}${depNames.slice(0, maxDepsDescLength - prefix.length - 3)}...`;
      const fullDescription = `${depsDescription}${hashSuffix}`;

      // Check if layer already exists
      const existingLayer = await this.#findExistingLayerByHashForMultiLayer(layerName, buildResult.layerHash);
      if (existingLayer) {
        this.#publishedLayers.set(layerId, {
          ...existingLayer,
          layerId,
          functions: assignment.functions
        });
        continue;
      }

      // Publish new layer
      const { layerArn, layerVersionArn } = await this.#publishLayer({
        layerName,
        zipFilePath: buildResult.layerZipPath,
        compatibleRuntimes,
        description: fullDescription
      });

      this.#publishedLayers.set(layerId, {
        layerId,
        layerArn,
        layerVersionArn,
        layerHash: buildResult.layerHash,
        functions: assignment.functions,
        dependencies: buildResult.dependencies
      });

      // Cleanup old versions
      await this.#cleanupOldVersions(layerName);
    }

    return this.#publishedLayers;
  }

  /**
   * Find existing layer by hash for multi-layer support.
   */
  async #findExistingLayerByHashForMultiLayer(
    layerName: string,
    hash: string
  ): Promise<Omit<MultiLayerInfo, 'layerId' | 'functions'> | null> {
    try {
      const exists = await this.#checkLayerExists(layerName);
      if (!exists) return null;

      const versions = await this.#listLayerVersions({ layerName });
      const matchingVersion = versions.find((v) => v.description?.includes(`[hash:${hash}]`));

      if (matchingVersion) {
        const layerArn = `arn:aws:lambda:${this.#region}:${this.#accountId}:layer:${layerName}`;
        return {
          layerArn,
          layerVersionArn: `${layerArn}:${matchingVersion.versionNumber}`,
          layerHash: hash,
          dependencies: []
        };
      }
    } catch {
      // Layer doesn't exist yet
    }
    return null;
  }

  /**
   * Check if layers already exist in AWS before building.
   * Returns layer IDs that need to be built (not found in AWS).
   */
  async checkExistingMultipleLayers(): Promise<string[]> {
    if (!this.#multiLayerAnalysis) {
      return [];
    }

    const layersToBuild: string[] = [];

    for (const assignment of this.#multiLayerAnalysis.layers) {
      // Generate hash from dependencies to check if layer exists
      const hash = generateLayerHash(assignment.dependencies.map((d) => ({ name: d.name, version: d.version })));
      const layerName = getLayerName(this.#stackName, hash);
      const existing = await this.#findExistingLayerByHashForMultiLayer(layerName, hash);

      if (existing) {
        // Layer exists - store it
        this.#publishedLayers.set(assignment.layerId, {
          ...existing,
          layerId: assignment.layerId,
          functions: assignment.functions,
          dependencies: assignment.dependencies.map((d) => ({ name: d.name, version: d.version }))
        });
      } else {
        // Layer needs to be built
        layersToBuild.push(assignment.layerId);
      }
    }

    return layersToBuild;
  }

  /**
   * Get layer ARNs for a specific function.
   * Returns the ARNs of all layers that should be attached to the function.
   */
  getLayerArnsForFunction(functionName: string): string[] {
    const layerIds = this.#functionLayerMap.get(functionName) ?? [];
    return layerIds
      .map((layerId) => {
        const layerInfo = this.#publishedLayers.get(layerId);
        return layerInfo?.layerVersionArn;
      })
      .filter((arn): arn is string => arn !== undefined);
  }

  /**
   * Get all published layers info.
   */
  getPublishedLayers(): Map<string, MultiLayerInfo> {
    return this.#publishedLayers;
  }

  /**
   * Get all built layers info.
   */
  getBuiltLayers(): MultiLayerBuildResult | null {
    return this.#builtLayers;
  }

  /**
   * Get the function -> layer IDs map.
   */
  getFunctionLayerMap(): Map<string, string[]> {
    return this.#functionLayerMap;
  }

  /**
   * Get multi-layer savings summary.
   */
  getMultiLayerSavingsSummary(): {
    totalSavings: number;
    layerCount: number;
    totalLayerSize: number;
    layerDetails: { layerId: string; size: number; savings: number; functionCount: number }[];
  } {
    if (!this.#multiLayerAnalysis) {
      return { totalSavings: 0, layerCount: 0, totalLayerSize: 0, layerDetails: [] };
    }

    const layerDetails = this.#multiLayerAnalysis.layers.map((l) => ({
      layerId: l.layerId,
      size: l.estimatedSize,
      savings: l.estimatedSavings,
      functionCount: l.functions.length
    }));

    return {
      totalSavings: this.#multiLayerAnalysis.totalEstimatedSavings,
      layerCount: this.#multiLayerAnalysis.layers.length,
      totalLayerSize: layerDetails.reduce((sum, l) => sum + l.size, 0),
      layerDetails
    };
  }
}
