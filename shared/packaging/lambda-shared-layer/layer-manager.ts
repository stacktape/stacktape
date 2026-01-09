import { join } from 'node:path';
import objectHash from 'object-hash';
import type { DependencyInfo, DependencyAnalysisResult } from './dependency-analyzer';
import { analyzeDependencies, analyzeDependenciesFromPackageJson } from './dependency-analyzer';
import {
  buildSharedLayer,
  buildSharedLayerSimple,
  generateLayerHash,
  getLayerName,
  type LayerBuildResult
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
   */
  getLayerDependencyNames(): string[] {
    return this.#analysisResult?.sharedDependencies.map((d) => d.name) ?? [];
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

    const hasNative = this.#analysisResult.sharedDependencies.some((d) => d.isNative);

    if (hasNative) {
      // Use Docker build for native dependencies
      this.#builtLayer = await buildSharedLayer({
        dependencies: this.#analysisResult.sharedDependencies,
        cwd: this.#cwd,
        distFolderPath: this.#distFolderPath,
        nodeVersion: this.#nodeVersion,
        packageManager: this.#packageManager,
        architecture: this.#architecture
      });
    } else {
      // Use simple copy for pure JS dependencies (faster)
      this.#builtLayer = await buildSharedLayerSimple({
        dependencies: this.#analysisResult.sharedDependencies,
        cwd: this.#cwd,
        distFolderPath: this.#distFolderPath
      });
    }

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
    const description = `Shared dependencies: ${this.#builtLayer.dependencies.map((d) => d.name).join(', ')}`;

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
      description: `${description} [hash:${this.#builtLayer.layerHash}]`
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
}
