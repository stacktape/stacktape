import type { NativeBinaryLayerResult } from '@shared/packaging/bundlers/es/copy-docker-installed-modules';
import type { LambdaEntrypoint, LayerAssignmentResult, ModuleInfo } from '@shared/packaging/bundlers/es/split-bundler';
import { join } from 'node:path';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { DEFAULT_CONTAINER_NODE_VERSION, DEFAULT_LAMBDA_NODE_VERSION } from '@config';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { ec2Manager } from '@domain-services/ec2-manager';
import { fsPaths } from '@shared/naming/fs-paths';
import { buildLayerS3Key, getJobName } from '@shared/naming/utils';
import { DEPENDENCIES_WITH_BINARIES } from '@shared/packaging/bundlers/es/config';
import { buildNativeBinaryLayer } from '@shared/packaging/bundlers/es/copy-docker-installed-modules';
import {
  assignChunksToLayers,
  buildSplitBundle,
  createLayerArtifacts,
  DEFAULT_LAYER_CONFIG
} from '@shared/packaging/bundlers/es/split-bundler';
import { getLambdaRuntimeFromNodeTarget, getLockFileData } from '@shared/packaging/bundlers/es/utils';
import { buildUsingCustomArtifact } from '@shared/packaging/custom-artifact';
import { buildUsingCustomDockerfile } from '@shared/packaging/custom-dockerfile';
import { buildUsingExternalBuildpack } from '@shared/packaging/external-buildpack';
import { buildHostingBucket } from '@shared/packaging/hosting-bucket-build';
import { createNextjsWebArtifacts } from '@shared/packaging/nextjs-web';
import { createSsrWebArtifacts } from '@shared/packaging/ssr-web-shared';
import {
  SSR_WEB_FRAMEWORK_CONFIGS,
  type SsrWebResourceType
} from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/ssr-web-shared';
import { buildUsingNixpacks } from '@shared/packaging/nixpacks';
import { buildUsingStacktapeEsImageBuildpack } from '@shared/packaging/stacktape-es-image-buildpack';
import { buildUsingStacktapeEsLambdaBuildpack } from '@shared/packaging/stacktape-es-lambda-buildpack';
import { buildUsingStacktapeGoImageBuildpack } from '@shared/packaging/stacktape-go-image-buildpack';
import { buildUsingStacktapeGoLambdaBuildpack } from '@shared/packaging/stacktape-go-lambda-buildpack';
import { buildUsingStacktapeJavaImageBuildpack } from '@shared/packaging/stacktape-java-image-buildpack';
import { buildUsingStacktapeJavaLambdaBuildpack } from '@shared/packaging/stacktape-java-lambda-buildpack';
import { buildUsingStacktapeRbImageBuildpack } from '@shared/packaging/stacktape-rb-image-buildpack';
import { buildUsingStacktapeRbLambdaBuildpack } from '@shared/packaging/stacktape-rb-lambda-buildpack';
import { buildUsingStacktapePhpImageBuildpack } from '@shared/packaging/stacktape-php-image-buildpack';
import { buildUsingStacktapePhpLambdaBuildpack } from '@shared/packaging/stacktape-php-lambda-buildpack';
import { buildUsingStacktapeDotnetImageBuildpack } from '@shared/packaging/stacktape-dotnet-image-buildpack';
import { buildUsingStacktapeDotnetLambdaBuildpack } from '@shared/packaging/stacktape-dotnet-lambda-buildpack';
import { buildUsingStacktapePyImageBuildpack } from '@shared/packaging/stacktape-py-image-buildpack';
import { buildUsingStacktapePyLambdaBuildpack } from '@shared/packaging/stacktape-py-lambda-buildpack';
import {
  ensureBuildxBuilderForCache,
  getDockerBuildxSupportedPlatforms,
  installDockerPlatforms,
  isDockerRunning
} from '@shared/utils/docker';
import { getFileExtension, getFileSize, getFolderSize, getHashFromMultipleFiles } from '@shared/utils/fs-utils';
import { localBuildTsConfigPath } from '@shared/utils/misc';
import { archiveItem } from '@shared/utils/zip';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { rename } from 'fs-extra';
import objectHash from 'object-hash';
import { resolveEnvironmentDirectives } from 'src/commands/dev/utils';
import { isDevCommand } from '../../commands/dev/dev-resource-filter';

const formatLambdaSize = ({ sizeMB, sizeKB }: { sizeMB: number; sizeKB: number }) => {
  if (Number.isNaN(sizeMB) || Number.isNaN(sizeKB)) {
    return '0KB';
  }
  if (sizeMB >= 0.1) {
    return `${sizeMB}MB`;
  }
  return `${sizeKB}KB`;
};

const MINIMUM_LAMBDAS_FOR_SPLIT_BUNDLING = 2;

const getCacheRef = (jobName: string) => {
  const repositoryUrl = deploymentArtifactManager.repositoryUrl;
  if (!repositoryUrl) return undefined;
  const cacheTag = `${jobName}-cache`;
  return `${repositoryUrl}:${cacheTag}`;
};

const doesTargetStackExist = () => {
  return Boolean(stackManager.existingStackDetails && stackManager.existingStackResources.length);
};

const shouldUseRemoteDockerCache = () => {
  return (
    globalStateManager.command !== 'dev' && !globalStateManager.args.disableDockerRemoteCache && doesTargetStackExist()
  );
};

export class PackagingManager {
  #packagedJobs: PackageWorkloadOutput[] = [];
  #layerAssignment: LayerAssignmentResult | null = null;
  #layerArtifacts: Array<{
    layerNumber: number;
    layerPath: string;
    chunks: string[];
    sizeBytes: number;
    /** Content-based hash for caching */
    contentHash: string;
    /** S3 key computed during packaging, used for both template and upload */
    s3Key: string;
  }> = [];

  /** Native binary layer (bcrypt, sharp, etc.) - separate from chunk layers */
  #nativeBinaryLayer: (NativeBinaryLayerResult & { s3Key: string }) | null = null;

  /** Maps lambda name -> set of layer numbers it uses (for chunk layers) */
  #lambdaLayerMap: Map<string, Set<number>> = new Map();

  /** Set of lambda names that use the native binary layer */
  #lambdasUsingNativeBinaryLayer: Set<string> = new Set();

  init = async () => {};

  clearPackagedJobs() {
    this.#packagedJobs = [];
  }

  getPackagingOutputForJob(jobName: string) {
    return this.#packagedJobs.find((job) => job.jobName === jobName) || null;
  }

  /**
   * Check if a lambda uses shared layers.
   */
  shouldLambdaUseSharedLayer(_lambdaName: string): boolean {
    if (!this.#layerAssignment) return false;
    // Check if any layered chunk is used by this lambda
    return this.#layerAssignment.layeredChunks.some((chunk) => {
      const analysis = this.#layerAssignment?.layeredChunks.find((c) => c.chunkName === chunk.chunkName);
      // We'd need to look up the original chunk analysis for usedByLambdas
      // For now, if we have layers, all lambdas use them
      return analysis !== undefined;
    });
  }

  /**
   * Get layer artifacts for a specific layer number.
   */
  getLayerArtifact(layerNumber: number) {
    // Layer 0 is native binary layer
    if (layerNumber === 0 && this.#nativeBinaryLayer) {
      return {
        layerNumber: 0,
        layerPath: this.#nativeBinaryLayer.layerPath,
        chunks: [], // Native layer doesn't have chunks
        sizeBytes: this.#nativeBinaryLayer.sizeBytes,
        contentHash: this.#nativeBinaryLayer.contentHash,
        s3Key: this.#nativeBinaryLayer.s3Key
      };
    }
    return this.#layerArtifacts.find((l) => l.layerNumber === layerNumber) || null;
  }

  /**
   * Get all layer artifacts (chunk layers + native binary layer).
   */
  getLayerArtifacts() {
    const allLayers = [...this.#layerArtifacts];

    // Include native binary layer as layer 0 if it exists
    if (this.#nativeBinaryLayer) {
      allLayers.unshift({
        layerNumber: 0,
        layerPath: this.#nativeBinaryLayer.layerPath,
        chunks: [],
        sizeBytes: this.#nativeBinaryLayer.sizeBytes,
        contentHash: this.#nativeBinaryLayer.contentHash,
        s3Key: this.#nativeBinaryLayer.s3Key
      });
    }

    return allLayers;
  }

  /**
   * Split bundling is more efficient when there are multiple lambdas that share code.
   */
  #shouldUseSplitBundling(): boolean {
    if (globalStateManager.args.disableLayerOptimization) {
      return false;
    }
    const nodeLambdas = configManager.allUserCodeLambdas.filter(({ packaging }) => {
      const ext = getFileExtension((packaging?.properties as { entryfilePath?: string })?.entryfilePath || '');
      return ['js', 'ts', 'jsx', 'mjs', 'tsx'].includes(ext);
    });
    return nodeLambdas.length >= MINIMUM_LAMBDAS_FOR_SPLIT_BUNDLING;
  }

  /**
   * Get layer numbers that a lambda should use.
   * Returns array of layer numbers (0 for native binaries, 1-5 for chunks) used by this lambda.
   */
  getLayerNumbersForLambda(lambdaName: string): number[] {
    const layerNumbers: number[] = [];

    // Add native binary layer (layer 0) if this lambda uses native deps
    if (this.#lambdasUsingNativeBinaryLayer.has(lambdaName) && this.#nativeBinaryLayer) {
      layerNumbers.push(0);
    }

    // Add chunk layers (1-5)
    const chunkLayerNumbers = this.#lambdaLayerMap.get(lambdaName);
    if (chunkLayerNumbers) {
      layerNumbers.push(...Array.from(chunkLayerNumbers));
    }

    return layerNumbers.sort();
  }

  /**
   * Check if a lambda uses the native binary layer.
   */
  lambdaUsesNativeBinaryLayer(lambdaName: string): boolean {
    return this.#lambdasUsingNativeBinaryLayer.has(lambdaName);
  }

  /**
   * Get native binary layer artifact if one was created.
   */
  getNativeBinaryLayer() {
    return this.#nativeBinaryLayer;
  }

  /**
   * Legacy method - returns empty array as layer ARNs are resolved at deploy time.
   */
  getLayerArnsForFunction(_functionName: string): string[] {
    return [];
  }

  /**
   * Get pending shared layer(s) that need to be published.
   * Returns the first layer artifact if there are any, null otherwise.
   */
  getPendingSharedLayer(): { layerPath: string; layerNumber: number } | null {
    if (this.#layerArtifacts.length === 0) return null;
    // Return first layer - the upload process will handle all layers
    const first = this.#layerArtifacts[0];
    return { layerPath: first.layerPath, layerNumber: first.layerNumber };
  }

  /**
   * Get shared layer info after publishing.
   * For now returns null as layers are created via CloudFormation.
   */
  getSharedLayerInfo(): null {
    // Layer ARNs are resolved at deploy time via CloudFormation
    return null;
  }

  /**
   * Zip shared layer artifacts for upload.
   * Creates zip files for each layer (chunk layers + native binary layer) that can be uploaded to S3.
   */
  publishSharedLayer = async (): Promise<void> => {
    const layersToZip: string[] = [];

    // Add chunk layers
    for (const layer of this.#layerArtifacts) {
      layersToZip.push(layer.layerPath);
    }

    // Add native binary layer
    if (this.#nativeBinaryLayer) {
      layersToZip.push(this.#nativeBinaryLayer.layerPath);
    }

    if (layersToZip.length === 0) return;

    // Zip all layer artifacts in parallel
    await Promise.all(
      layersToZip.map((layerPath) =>
        archiveItem({
          absoluteSourcePath: layerPath,
          format: 'zip',
          useNativeZip: true
        })
      )
    );
  };

  /**
   * Package all Node.js lambdas using Bun's code splitting.
   * This bundles all lambdas together in a single pass, creating shared chunks automatically.
   */
  #packageNodeLambdasWithSplitBundling = async ({
    nodeLambdas,
    commandCanUseCache
  }: {
    nodeLambdas: Array<{
      name: string;
      type: string;
      packaging: LambdaPackaging;
      architecture?: 'x86_64' | 'arm64';
      runtime?: LambdaRuntime;
    }>;
    commandCanUseCache: boolean;
  }): Promise<void> => {
    if (nodeLambdas.length === 0) return;

    // Prepare entrypoints for split bundling
    const entrypoints: LambdaEntrypoint[] = nodeLambdas.map(({ name, type, packaging }) => {
      const jobName = getJobName({ workloadName: name, workloadType: type as any });
      return {
        name,
        entryfilePath: join(globalStateManager.workingDir, (packaging.properties as any).entryfilePath),
        jobName,
        distFolderPath: fsPaths.absoluteLambdaArtifactFolderPath({
          jobName,
          invocationId: globalStateManager.invocationId
        })
      };
    });

    // Get node version from first lambda (they should all be compatible)
    const firstLambda = nodeLambdas[0];
    const languageSpecificConfig = (firstLambda.packaging.properties as any)?.languageSpecificConfig as
      | EsLanguageSpecificConfig
      | undefined;
    const nodeVersionFromRuntime = Number(firstLambda.runtime?.match(/nodejs(\d+)/)?.[1]) || null;
    const nodeVersion = languageSpecificConfig?.nodeVersion || nodeVersionFromRuntime || DEFAULT_LAMBDA_NODE_VERSION;

    // Create progress logger for the shared layer (split bundle process)
    const sharedLayerLogger = eventManager.createChildLogger({
      parentEventType: 'PACKAGE_ARTIFACTS',
      instanceId: 'shared-lambda-layer'
    });
    await sharedLayerLogger.startEvent({
      eventType: 'BUILD_CODE',
      description: 'Building shared lambda dependencies'
    });

    // Create progress loggers for each lambda immediately so they're visible from the start
    const lambdaLoggers = new Map<string, ReturnType<typeof eventManager.createChildLogger>>();
    for (const { name, type } of nodeLambdas) {
      const jobName = getJobName({ workloadName: name, workloadType: type as any });
      const logger = eventManager.createChildLogger({
        parentEventType: 'PACKAGE_ARTIFACTS',
        instanceId: jobName
      });
      lambdaLoggers.set(name, logger);
      // Start each lambda in "identifying shared resources" state
      await logger.startEvent({
        eventType: 'BUILD_CODE',
        description: 'Identifying shared resources'
      });
    }

    const splitResult = await buildSplitBundle({
      entrypoints,
      sharedOutdir: fsPaths.absoluteSplitBundleOutdir({ invocationId: globalStateManager.invocationId }),
      cwd: globalStateManager.workingDir,
      tsConfigPath: localBuildTsConfigPath,
      nodeTarget: String(nodeVersion),
      minify: false, // Match existing behavior
      sourceMaps: languageSpecificConfig?.disableSourceMaps ? 'disabled' : 'external',
      sourceMapBannerType: 'pre-compiled',
      excludeDependencies: languageSpecificConfig?.dependenciesToExcludeFromBundle || [],
      dependenciesToExcludeFromBundle: languageSpecificConfig?.dependenciesToExcludeFromBundle || []
    });

    // Build native binaries (bcrypt, sharp, prisma, etc.) into a shared layer
    // This is more efficient than copying to each lambda - upload once, use everywhere
    const lambdasWithNativeDeps = Array.from(splitResult.lambdaOutputs.entries()).filter(
      ([, output]) => output.dependenciesToInstallInDocker.length > 0
    );

    if (lambdasWithNativeDeps.length > 0 && (await isDockerRunning())) {
      const { packageManager } = await getLockFileData(globalStateManager.workingDir);
      if (!packageManager) {
        throw new Error(
          'Failed to load dependency lockfile. You need to install your dependencies first. Supported package managers are npm and yarn.'
        );
      }

      // Determine architecture from first lambda (all should be same in a split bundle)
      const firstLambdaArch = nodeLambdas[0]?.architecture;
      const dockerArch = firstLambdaArch === 'arm64' ? 'linux/arm64' : 'linux/amd64';

      // Collect all unique native dependencies across all lambdas
      const allNativeDeps = new Map<string, ModuleInfo>();
      for (const [, output] of lambdasWithNativeDeps) {
        for (const dep of output.dependenciesToInstallInDocker) {
          if (!allNativeDeps.has(dep.name)) {
            allNativeDeps.set(dep.name, dep);
          }
        }
      }

      // Build native binaries into a shared layer
      const nativeLayer = await buildNativeBinaryLayer({
        dependencies: Array.from(allNativeDeps.values()) as any[],
        invocationId: globalStateManager.invocationId,
        layerBasePath: `${fsPaths.absoluteBuildFolderPath({ invocationId: globalStateManager.invocationId })}/layers`,
        lambdaRuntimeVersion: getLambdaRuntimeFromNodeTarget(String(nodeVersion)),
        packageManager,
        dockerBuildOutputArchitecture: dockerArch,
        usedByLambdas: lambdasWithNativeDeps.map(([name]) => name)
      });

      if (nativeLayer) {
        // Store native layer with S3 key for upload
        // Use layer number 0 for native binaries (chunk layers use 1-5)
        this.#nativeBinaryLayer = {
          ...nativeLayer,
          s3Key: buildLayerS3Key(0, nativeLayer.contentHash, '')
        };

        // Track which lambdas use the native binary layer
        for (const [lambdaName] of lambdasWithNativeDeps) {
          this.#lambdasUsingNativeBinaryLayer.add(lambdaName);
        }
      }
    }

    const skipLayers = globalStateManager.args.disableLayerOptimization;
    const layerAssignment = skipLayers
      ? { layeredChunks: [], unLayeredChunks: [], layers: [], totalBytesSaved: 0 }
      : assignChunksToLayers(splitResult.chunkAnalysis, DEFAULT_LAYER_CONFIG);
    let layerArtifactsWithS3Keys: Array<{
      layerNumber: number;
      layerPath: string;
      chunks: string[];
      sizeBytes: number;
      contentHash: string;
      s3Key: string;
    }> = [];
    if (layerAssignment.layeredChunks.length > 0) {
      const layerResult = await createLayerArtifacts({
        lambdaOutputs: splitResult.lambdaOutputs,
        layerAssignment,
        layerBasePath: `${fsPaths.absoluteBuildFolderPath({ invocationId: globalStateManager.invocationId })}/layers`
      });

      // Compute S3 keys for each layer (needed for both template and upload)
      // Use contentHash for caching instead of version (ensures re-upload only when content changes)
      layerArtifactsWithS3Keys = layerResult.layerArtifacts.map((layer) => ({
        ...layer,
        s3Key: buildLayerS3Key(layer.layerNumber, layer.contentHash, '')
      }));
    }

    // Store layer assignment and artifacts
    this.#layerAssignment = layerAssignment;
    this.#layerArtifacts = layerArtifactsWithS3Keys;

    // Build lambda -> layer map: which lambdas use which layers
    this.#lambdaLayerMap.clear();
    for (const layeredChunk of layerAssignment.layeredChunks) {
      // Find the original chunk analysis to get usedByLambdas
      const chunkAnalysis = splitResult.chunkAnalysis.find((c) => c.chunkName === layeredChunk.chunkName);
      if (chunkAnalysis) {
        for (const lambdaName of chunkAnalysis.usedByLambdas) {
          if (!this.#lambdaLayerMap.has(lambdaName)) {
            this.#lambdaLayerMap.set(lambdaName, new Set());
          }
          this.#lambdaLayerMap.get(lambdaName)!.add(layeredChunk.layerNumber);
        }
      }
    }

    // Finish the shared layer build with clear summary
    let finalMessage: string;
    if (skipLayers) {
      finalMessage = `Shared layers disabled (--disableLayerOptimization)`;
    } else if (layerArtifactsWithS3Keys.length > 0) {
      const totalLayerBytes = layerArtifactsWithS3Keys.reduce((sum, l) => sum + l.sizeBytes, 0);
      const totalLayerSizeMB = (totalLayerBytes / (1024 * 1024)).toFixed(1);
      const layeredChunkCount = layerAssignment.layeredChunks.length;
      const totalSavingsMB = (layerAssignment.totalBytesSaved / (1024 * 1024)).toFixed(1);
      const layerCount = layerArtifactsWithS3Keys.length;
      // Clear message: "Created 1 shared layer (70 modules, 17MB) - saves ~169MB"
      finalMessage = `Created ${layerCount} shared layer${layerCount > 1 ? 's' : ''} (${layeredChunkCount} modules, ${totalLayerSizeMB}MB) - saves ~${totalSavingsMB}MB`;
    } else {
      // No layers created - either no shared code or chunks didn't meet threshold
      finalMessage = `Analyzed ${splitResult.sharedChunkCount} shared modules (none qualified for shared layer)`;
    }
    await sharedLayerLogger.finishEvent({
      eventType: 'BUILD_CODE',
      finalMessage
    });

    // Update the "identifying shared resources" phase for all lambdas
    // Keep them in progress until zipping starts to avoid flicker in the UI
    for (const [name] of lambdaLoggers) {
      const logger = lambdaLoggers.get(name)!;
      const layerNumbers = this.#lambdaLayerMap.get(name);
      const usesSharedLayer = layerNumbers && layerNumbers.size > 0;
      const bundleInfo = usesSharedLayer ? 'Bundled (uses shared layer)' : 'Bundled';
      await logger.updateEvent({ eventType: 'BUILD_CODE', additionalMessage: bundleInfo });
    }

    // Now zip each lambda and add to packaged jobs
    const zipPromises = nodeLambdas.map(async ({ name, type }) => {
      const jobName = getJobName({ workloadName: name, workloadType: type as any });
      const lambdaOutput = splitResult.lambdaOutputs.get(name);
      const lambdaLogger = lambdaLoggers.get(name)!;

      if (!lambdaOutput) {
        throw new Error(`Split bundle output not found for lambda: ${name}`);
      }

      const distFolderPath = fsPaths.absoluteLambdaArtifactFolderPath({
        jobName,
        invocationId: globalStateManager.invocationId
      });

      // Calculate digest for caching - hash the bundled output file + layer info
      const shouldUseCache = this.#shouldWorkloadUseCache({ workloadName: name, commandCanUseCache });
      const existingDigests = shouldUseCache ? deploymentArtifactManager.getExistingDigestsForJob(jobName) : [];

      // Hash the bundled output file (like normal bundler does)
      const bundledIndexPath = join(distFolderPath, 'index.js');
      const bundleHashObj = await getHashFromMultipleFiles([bundledIndexPath]);

      // Include layer assignment in digest - layer assignment affects import paths
      const layerNumbers = this.#lambdaLayerMap.get(name);
      const layerDigestParts = layerNumbers
        ? Array.from(layerNumbers)
            .sort()
            .map((layerNum) => {
              const layerArtifact = this.#layerArtifacts.find((l) => l.layerNumber === layerNum);
              return `${layerNum}:${layerArtifact?.contentHash || 'unknown'}`;
            })
            .join(',')
        : 'none';
      bundleHashObj.update(layerDigestParts);
      const digest = bundleHashObj.digest('hex');

      // Check if we can skip (artifact already exists with same digest)
      if (existingDigests.includes(digest)) {
        await lambdaLogger.finishEvent({
          eventType: 'BUILD_CODE',
          finalMessage: 'Skipped (cached)'
        });
        this.#packagedJobs.push({
          jobName,
          digest,
          skipped: true,
          size: null,
          resolvedModules: lambdaOutput.resolvedModules
        });
        return;
      }

      await lambdaLogger.updateEvent({ eventType: 'BUILD_CODE', additionalMessage: 'Zipping package' });

      const unzippedSizeMB = await getFolderSize(distFolderPath, 'MB', 2);
      const unzippedSizeKB = await getFolderSize(distFolderPath, 'KB', 1);

      // Check size limits
      const sizeLimit = 250; // MB
      const zippedSizeLimit = 50; // MB

      if (unzippedSizeMB > sizeLimit) {
        throw new Error(`Function ${name} has size ${unzippedSizeMB}MB. Should be less than ${sizeLimit}MB.`);
      }

      await archiveItem({
        absoluteSourcePath: distFolderPath,
        format: 'zip',
        useNativeZip: true
      });

      const originalZipPath = `${distFolderPath}.zip`;
      const zippedSizeMB = await getFileSize(originalZipPath, 'MB', 2);
      const zippedSizeKB = await getFileSize(originalZipPath, 'KB', 1);

      if (zippedSizeMB > zippedSizeLimit) {
        throw new Error(`Function ${name} zipped size ${zippedSizeMB}MB exceeds limit of ${zippedSizeLimit}MB.`);
      }

      const adjustedZipPath = `${distFolderPath}-${digest}.zip`;
      await rename(originalZipPath, adjustedZipPath);

      // Zip message: "120KB (unzipped), 42KB (zipped) + 1 shared layer"
      // Reuse layerNumbers from digest calculation above
      const layerCount = layerNumbers ? layerNumbers.size : 0;
      const layerSuffix = layerCount > 0 ? ` + ${layerCount} shared layer${layerCount > 1 ? 's' : ''}` : '';
      const unzippedLabel = formatLambdaSize({ sizeMB: unzippedSizeMB, sizeKB: unzippedSizeKB });
      const zippedLabel = formatLambdaSize({ sizeMB: zippedSizeMB, sizeKB: zippedSizeKB });
      await lambdaLogger.finishEvent({
        eventType: 'BUILD_CODE',
        finalMessage: `${unzippedLabel} (unzipped), ${zippedLabel} (zipped)${layerSuffix}`
      });

      this.#packagedJobs.push({
        jobName,
        digest,
        skipped: false,
        size: unzippedSizeMB,
        artifactPath: adjustedZipPath,
        resolvedModules: lambdaOutput.resolvedModules
      });
    });

    await Promise.all(zipPromises);
  };

  packageAllWorkloads = async ({
    commandCanUseCache
  }: {
    commandCanUseCache: boolean;
  }): Promise<PackageWorkloadOutput[]> => {
    await eventManager.startEvent({
      eventType: 'PACKAGE_ARTIFACTS',
      description: 'Packaging workloads'
    });

    // Setup Docker if running
    if (await isDockerRunning()) {
      await this.#installMissingDockerBuildPlatforms();
      if (shouldUseRemoteDockerCache()) {
        await ensureBuildxBuilderForCache();
      }
    }

    // Identify Node.js Lambda functions (excluding edge functions which need separate handling)
    const nodeLambdas = configManager.allUserCodeLambdas.filter(({ packaging, type }) => {
      const ext = getFileExtension((packaging?.properties as { entryfilePath?: string })?.entryfilePath || '');
      // Exclude edge functions from split bundling - they don't support ESM with top-level await
      return ['js', 'ts', 'jsx', 'mjs', 'tsx'].includes(ext) && type !== 'edge-lambda-function';
    });

    // Edge Lambda functions - need to be packaged separately with CJS
    const edgeLambdas = configManager.allUserCodeLambdas.filter(({ packaging, type }) => {
      const ext = getFileExtension((packaging?.properties as { entryfilePath?: string })?.entryfilePath || '');
      return ['js', 'ts', 'jsx', 'mjs', 'tsx'].includes(ext) && type === 'edge-lambda-function';
    });

    // Non-Node.js lambdas
    const nonNodeLambdas = configManager.allUserCodeLambdas.filter(({ packaging }) => {
      const ext = getFileExtension((packaging?.properties as { entryfilePath?: string })?.entryfilePath || '');
      return !['js', 'ts', 'jsx', 'mjs', 'tsx'].includes(ext);
    });

    // In dev mode, skip container and hosting bucket builds (they run locally)
    const skipContainersAndHosting = isDevCommand();

    // Hosting bucket builds (skip in dev mode)
    const hostingBucketBuildJobs = skipContainersAndHosting
      ? []
      : configManager.hostingBuckets
          .filter(({ build }) => build)
          .map(({ name, build }) => {
            return () =>
              buildHostingBucket({
                name,
                build: build!,
                progressLogger: eventManager.createChildLogger({
                  instanceId: name,
                  parentEventType: 'PACKAGE_ARTIFACTS'
                })
              });
          });

    // Container packaging jobs (skip in dev mode)
    const containerPackagingJobs = skipContainersAndHosting
      ? []
      : configManager.allContainersRequiringPackaging.map(({ jobName, packaging, workloadName, resources }) => {
          return () =>
            this.packageWorkload({
              commandCanUseCache,
              jobName,
              packaging,
              workloadName,
              dockerBuildOutputArchitecture: this.getTargetCpuArchitectureForContainer(resources)
            });
        });

    // NextJS packaging jobs (skip in dev mode)
    const nextjsPackagingJobs = skipContainersAndHosting
      ? []
      : configManager.nextjsWebs.map((resource) => {
          return () =>
            this.packageNextjsWeb({
              nextjsWebResource: resource,
              commandCanUseCache
            });
        });

    // SSR Web packaging jobs (Astro, Nuxt, SvelteKit, SolidStart, TanStack, Remix) - skip in dev mode
    const ssrWebPackagingJobs = skipContainersAndHosting
      ? []
      : [
          ...configManager.astroWebs.map(
            (resource) => () => this.packageSsrWeb({ resource, resourceType: 'astro-web', commandCanUseCache })
          ),
          ...configManager.nuxtWebs.map(
            (resource) => () => this.packageSsrWeb({ resource, resourceType: 'nuxt-web', commandCanUseCache })
          ),
          ...configManager.sveltekitWebs.map(
            (resource) => () => this.packageSsrWeb({ resource, resourceType: 'sveltekit-web', commandCanUseCache })
          ),
          ...configManager.solidstartWebs.map(
            (resource) => () => this.packageSsrWeb({ resource, resourceType: 'solidstart-web', commandCanUseCache })
          ),
          ...configManager.tanstackWebs.map(
            (resource) => () => this.packageSsrWeb({ resource, resourceType: 'tanstack-web', commandCanUseCache })
          ),
          ...configManager.remixWebs.map(
            (resource) => () => this.packageSsrWeb({ resource, resourceType: 'remix-web', commandCanUseCache })
          )
        ];

    // Prepare other packaging jobs (containers, non-Node lambdas, nextjs, ssr-web)
    const otherPackagingJobs = [
      ...nonNodeLambdas.map(({ name, type, packaging, architecture, runtime }) => {
        return () =>
          this.packageWorkload({
            commandCanUseCache,
            jobName: getJobName({ workloadName: name, workloadType: type }),
            workloadName: name,
            workloadType: type,
            packaging,
            runtime,
            dockerBuildOutputArchitecture: architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64'
          });
      }),
      ...containerPackagingJobs,
      ...nextjsPackagingJobs,
      ...ssrWebPackagingJobs,
      ...hostingBucketBuildJobs
    ];

    // Run all packaging in parallel:
    // - Node.js lambdas use split bundling (single Bun.build call)
    // - Other workloads (containers, non-Node lambdas, nextjs) run in parallel
    const packagingPromises: Promise<void>[] = [];

    // Node.js lambdas with split bundling
    if (this.#shouldUseSplitBundling() && nodeLambdas.length > 0) {
      packagingPromises.push(this.#packageNodeLambdasWithSplitBundling({ nodeLambdas, commandCanUseCache }));
    } else if (nodeLambdas.length > 0) {
      // Fallback: package Node.js lambdas individually (for single lambda or when split bundling disabled)
      packagingPromises.push(
        Promise.all(
          nodeLambdas.map(({ name, type, packaging, architecture, runtime }) =>
            this.packageWorkload({
              commandCanUseCache,
              jobName: getJobName({ workloadName: name, workloadType: type }),
              workloadName: name,
              workloadType: type,
              packaging,
              runtime,
              dockerBuildOutputArchitecture: architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64'
            })
          )
        ).then(() => {})
      );
    }

    // Edge Lambda functions - packaged separately with CJS (don't support ESM with top-level await)
    if (edgeLambdas.length > 0) {
      packagingPromises.push(
        Promise.all(
          edgeLambdas.map(({ name, type, packaging, architecture, runtime }) =>
            this.packageWorkload({
              commandCanUseCache,
              jobName: getJobName({ workloadName: name, workloadType: type }),
              workloadName: name,
              workloadType: type,
              packaging,
              runtime,
              dockerBuildOutputArchitecture: architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64'
            })
          )
        ).then(() => {})
      );
    }

    // Other workloads
    if (otherPackagingJobs.length > 0) {
      packagingPromises.push(Promise.all(otherPackagingJobs.map((job) => job())).then(() => {}));
    }

    await Promise.all(packagingPromises);

    await eventManager.finishEvent({
      eventType: 'PACKAGE_ARTIFACTS',
      data: { packagedJobs: this.#packagedJobs }
    });

    return this.#packagedJobs;
  };

  #installMissingDockerBuildPlatforms = async () => {
    const supportedDockerPlatforms = await getDockerBuildxSupportedPlatforms();
    const platformsToInstall = ['linux/amd64', 'linux/arm64'].filter(
      (platform) => !supportedDockerPlatforms.includes(platform)
    );
    if (platformsToInstall.length) {
      await installDockerPlatforms(platformsToInstall);
    }
  };

  repackageSkippedPackagingJobsCurrentlyUsingHotSwapDeploy = async ({
    ignoreWorkloads
  }: {
    ignoreWorkloads: string[];
  }) => {
    const lambdasToRepackage = configManager.allUserCodeLambdas.filter(
      ({ name }) =>
        deployedStackOverviewManager.isWorkloadCurrentlyUsingHotSwapDeploy(name) &&
        this.getPackagingOutputForJob(name)?.skipped &&
        !ignoreWorkloads.includes(name)
    );
    const containerWorkloadsToRepackage = configManager.allContainersRequiringPackaging.filter(
      ({ workloadName, jobName }) =>
        deployedStackOverviewManager.isWorkloadCurrentlyUsingHotSwapDeploy(workloadName) &&
        this.getPackagingOutputForJob(jobName)?.skipped &&
        !ignoreWorkloads.includes(workloadName)
    );
    const nextjsLambdasToRepackage = configManager.nextjsWebs
      .map(({ _nestedResources }) => {
        return Object.values(_nestedResources)
          .filter(Boolean)
          .filter(
            ({ name }) =>
              deployedStackOverviewManager.isWorkloadCurrentlyUsingHotSwapDeploy(name) &&
              this.getPackagingOutputForJob(name)?.skipped &&
              !ignoreWorkloads.includes(name)
          );
      })
      .flat() as (StpLambdaFunction | StpEdgeLambdaFunction)[];

    const requiresRepackaging =
      lambdasToRepackage.length || containerWorkloadsToRepackage.length || nextjsLambdasToRepackage.length;

    if (!requiresRepackaging) {
      return;
    }

    await eventManager.startEvent({
      eventType: 'REPACKAGE_ARTIFACTS',
      description: 'Finish packaging workloads'
    });

    await Promise.all([
      ...[...lambdasToRepackage, ...nextjsLambdasToRepackage].map(({ name, type, packaging, architecture }) => {
        const originalJobIndex = this.#packagedJobs.findIndex(({ jobName }) => jobName === name);
        this.#packagedJobs.splice(originalJobIndex, 1);
        return this.packageWorkload({
          commandCanUseCache: false,
          jobName: name,
          workloadName: name,
          workloadType: type,
          packaging,
          parentEventType: 'REPACKAGE_ARTIFACTS',
          dockerBuildOutputArchitecture: architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64'
        });
      }),
      ...containerWorkloadsToRepackage.map(async ({ jobName, packaging, workloadName, resources }) => {
        const originalJobIndex = this.#packagedJobs.findIndex(
          ({ jobName: processedJobName }) => jobName === processedJobName
        );
        this.#packagedJobs.splice(originalJobIndex, 1);
        return this.packageWorkload({
          commandCanUseCache: false,
          jobName,
          packaging,
          workloadName,
          dockerBuildOutputArchitecture: this.getTargetCpuArchitectureForContainer(resources),
          parentEventType: 'REPACKAGE_ARTIFACTS'
        });
      })
    ]);

    await eventManager.finishEvent({
      eventType: 'REPACKAGE_ARTIFACTS',
      data: { packagedJobs: this.#packagedJobs }
    });

    return this.#packagedJobs;
  };

  #shouldWorkloadUseCache = ({
    workloadName,
    commandCanUseCache
  }: {
    workloadName: string;
    commandCanUseCache: boolean;
  }) => {
    return (
      commandCanUseCache &&
      !globalStateManager.args.noCache &&
      !(
        deployedStackOverviewManager.isWorkloadCurrentlyUsingHotSwapDeploy(workloadName) &&
        globalStateManager.command === 'deploy' &&
        !globalStateManager.args.hotSwap
      )
    );
  };

  packageNextjsWeb = async ({
    nextjsWebResource,
    commandCanUseCache
  }: {
    nextjsWebResource: StpNextjsWeb;
    commandCanUseCache: boolean;
  }) => {
    const progressLogger = eventManager.createChildLogger({
      parentEventType: 'PACKAGE_ARTIFACTS',
      instanceId: nextjsWebResource.name
    });
    let environment: EnvironmentVar[] = [];
    try {
      environment = (await resolveEnvironmentDirectives(nextjsWebResource.environment)) as EnvironmentVar[];
    } catch {}
    const packagingOutputs = await createNextjsWebArtifacts({
      environmentVars: environment,
      resource: nextjsWebResource,
      cwd: globalStateManager.workingDir,
      distFolderPath: fsPaths.absoluteNextjsBuiltProjectFolderPath({
        invocationId: globalStateManager.invocationId,
        stpResourceName: nextjsWebResource.name
      }),
      existingDigests: {
        imageFunction: this.#shouldWorkloadUseCache({
          workloadName: nextjsWebResource._nestedResources.imageFunction.name,
          commandCanUseCache
        })
          ? deploymentArtifactManager.getExistingDigestsForJob(
              getJobName({
                workloadName: nextjsWebResource._nestedResources.imageFunction.name,
                workloadType: 'function'
              })
            )
          : [],
        revalidationFunction: this.#shouldWorkloadUseCache({
          workloadName: nextjsWebResource._nestedResources.revalidationFunction.name,
          commandCanUseCache
        })
          ? deploymentArtifactManager.getExistingDigestsForJob(
              getJobName({
                workloadName: nextjsWebResource._nestedResources.revalidationFunction.name,
                workloadType: 'function'
              })
            )
          : [],
        revalidationInsertFunction: this.#shouldWorkloadUseCache({
          workloadName: nextjsWebResource._nestedResources.revalidationInsertFunction.name,
          commandCanUseCache
        })
          ? deploymentArtifactManager.getExistingDigestsForJob(
              getJobName({
                workloadName: nextjsWebResource._nestedResources.revalidationInsertFunction.name,
                workloadType: 'function'
              })
            )
          : [],
        serverFunction:
          nextjsWebResource._nestedResources.serverFunction &&
          this.#shouldWorkloadUseCache({
            workloadName: nextjsWebResource._nestedResources.serverFunction.name,
            commandCanUseCache
          })
            ? deploymentArtifactManager.getExistingDigestsForJob(
                getJobName({
                  workloadName: nextjsWebResource._nestedResources.serverFunction.name,
                  workloadType: 'function'
                })
              )
            : [],
        serverEdgeFunction:
          nextjsWebResource._nestedResources.serverEdgeFunction &&
          this.#shouldWorkloadUseCache({
            workloadName: nextjsWebResource._nestedResources.serverEdgeFunction.name,
            commandCanUseCache
          })
            ? deploymentArtifactManager.getExistingDigestsForJob(
                getJobName({
                  workloadName: nextjsWebResource._nestedResources.serverEdgeFunction.name,
                  workloadType: 'edge-lambda-function'
                })
              )
            : [],
        warmerFunction:
          nextjsWebResource._nestedResources.warmerFunction &&
          this.#shouldWorkloadUseCache({
            workloadName: nextjsWebResource._nestedResources.warmerFunction.name,
            commandCanUseCache
          })
            ? deploymentArtifactManager.getExistingDigestsForJob(
                getJobName({
                  workloadName: nextjsWebResource._nestedResources.warmerFunction.name,
                  workloadType: 'function'
                })
              )
            : []
      },
      progressLogger
    });
    packagingOutputs.forEach((result) => this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' }));
  };

  packageSsrWeb = async ({
    resource,
    resourceType,
    commandCanUseCache
  }: {
    resource: StpAstroWeb | StpNuxtWeb | StpSvelteKitWeb | StpSolidStartWeb | StpTanStackWeb | StpRemixWeb;
    resourceType: SsrWebResourceType;
    commandCanUseCache: boolean;
  }) => {
    const frameworkConfig = SSR_WEB_FRAMEWORK_CONFIGS[resourceType];
    let environment: EnvironmentVar[] = [];
    try {
      environment = (await resolveEnvironmentDirectives(resource.environment)) as EnvironmentVar[];
    } catch {}

    const appDirectory = resource.appDirectory || '.';
    const workingDir = join(globalStateManager.workingDir, appDirectory);

    const packagingOutputs = await createSsrWebArtifacts({
      resourceName: resource.name,
      resourceType,
      serverFunctionName: resource._nestedResources.serverFunction.name,
      distFolderPath: fsPaths.absoluteSsrWebBuiltProjectFolderPath({
        invocationId: globalStateManager.invocationId,
        stpResourceName: resource.name,
        resourceType
      }),
      cwd: globalStateManager.workingDir,
      buildConfig: {
        buildCommand: resource.buildCommand || frameworkConfig.defaultBuildCommand,
        workingDir,
        serverOutputPath: frameworkConfig.serverOutputPath,
        staticOutputPath: frameworkConfig.staticOutputPath,
        handlerFileName: frameworkConfig.handlerPath,
        staticAssetPrefix: frameworkConfig.staticAssetPrefix,
        wrapperType: frameworkConfig.wrapperType,
        buildEnv:
          frameworkConfig.presetEnvVar && frameworkConfig.presetValue
            ? { [frameworkConfig.presetEnvVar]: frameworkConfig.presetValue }
            : undefined
      },
      environmentVars: environment,
      existingDigests: this.#shouldWorkloadUseCache({
        workloadName: resource._nestedResources.serverFunction.name,
        commandCanUseCache
      })
        ? deploymentArtifactManager.getExistingDigestsForJob(
            getJobName({
              workloadName: resource._nestedResources.serverFunction.name,
              workloadType: 'function'
            })
          )
        : []
    });

    packagingOutputs.forEach((result) => this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' }));
  };

  packageWorkload = async ({
    commandCanUseCache,
    workloadName,
    jobName,
    packaging,
    runtime,
    dockerBuildOutputArchitecture = 'linux/amd64',
    parentEventType = 'PACKAGE_ARTIFACTS',
    devMode,
    customProgressLogger,
    useDeployedLayers,
    workloadType
  }: {
    workloadName: string;
    jobName: string;
    packaging:
      | ContainerWorkloadContainerPackaging
      | BatchJobContainerPackaging
      | LambdaPackaging
      | HelperLambdaPackaging;
    commandCanUseCache: boolean;
    runtime?: LambdaRuntime;
    dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture;
    parentEventType?: Subtype<LoggableEventType, 'PACKAGE_ARTIFACTS' | 'REPACKAGE_ARTIFACTS'>;
    devMode?: boolean;
    customProgressLogger?: ProgressLogger;
    /** When true, externalize native binary deps assuming they're available from deployed layers */
    useDeployedLayers?: boolean;
    /** Workload type - used to determine packaging behavior (e.g., edge functions don't support ESM) */
    workloadType?: string;
  }): Promise<PackagingOutput | undefined> => {
    const shouldUseCache = this.#shouldWorkloadUseCache({ workloadName, commandCanUseCache });
    const existingDigests = shouldUseCache ? deploymentArtifactManager.getExistingDigestsForJob(jobName) : [];
    const packagingType = packaging.type;
    const progressLogger =
      customProgressLogger || eventManager.createChildLogger({ parentEventType, instanceId: jobName });
    const cacheRef = shouldUseRemoteDockerCache() ? getCacheRef(jobName) : undefined;

    const sharedProps = {
      name: jobName,
      existingDigests,
      cwd: globalStateManager.workingDir,
      args: globalStateManager.args,
      progressLogger,
      invocationId: globalStateManager.invocationId,
      dockerBuildOutputArchitecture,
      cacheFromRef: cacheRef,
      cacheToRef: cacheRef
    };

    if (packagingType === 'custom-dockerfile') {
      const result = await buildUsingCustomDockerfile({ ...sharedProps, ...packaging.properties });
      this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
      return result;
    }
    if (packagingType === 'external-buildpack') {
      const result = await buildUsingExternalBuildpack({ ...sharedProps, ...packaging.properties });
      this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
      return result;
    }
    if (packagingType === 'nixpacks') {
      const result = await buildUsingNixpacks({ ...sharedProps, ...packaging.properties });
      this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
      return result;
    }
    if (packagingType === 'custom-artifact') {
      const distFolderPath = fsPaths.absoluteLambdaArtifactFolderPath({
        jobName,
        invocationId: globalStateManager.invocationId
      });
      const result = await buildUsingCustomArtifact({ ...sharedProps, ...packaging.properties, distFolderPath });
      this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
      return result;
    }
    if (packagingType === 'stacktape-image-buildpack' || packagingType === 'stacktape-lambda-buildpack') {
      const extension = getFileExtension(packaging.properties.entryfilePath);
      switch (extension) {
        case 'js':
        case 'ts':
        case 'jsx':
        case 'mjs':
        case 'tsx': {
          const languageSpecificConfig =
            (packaging.properties.languageSpecificConfig as EsLanguageSpecificConfig) || undefined;
          const nodeVersionFromRuntime = Number(runtime?.match(/nodejs(\d+)/)?.[1]) || null;
          const nodeVersionFromUser = languageSpecificConfig?.nodeVersion;
          const nodeVersion =
            packagingType === 'stacktape-image-buildpack'
              ? nodeVersionFromUser || DEFAULT_CONTAINER_NODE_VERSION
              : nodeVersionFromUser || nodeVersionFromRuntime || DEFAULT_LAMBDA_NODE_VERSION;
          // Lambda@Edge doesn't support ESM with top-level await, so force CJS for edge functions
          const isEdgeFunction = workloadType === 'edge-lambda-function';
          const useEsm = !isEdgeFunction && (languageSpecificConfig?.outputModuleFormat === 'esm' || nodeVersion >= 24);
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            minify: false,
            keepNames: true,
            nodeTarget: String(nodeVersion),
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath),
            ...(useEsm && { outputModuleFormat: 'esm' as const })
          };
          const additionalDigestInput = objectHash(sharedStpBuildpackProps);

          if (packagingType === 'stacktape-lambda-buildpack') {
            // When useDeployedLayers is true (dev mode with deployed layers), externalize native binary deps
            // These deps are available from the deployed native binary layer at /opt/nodejs/node_modules
            const sharedLayerExternals = useDeployedLayers ? DEPENDENCIES_WITH_BINARIES : [];

            const result = await buildUsingStacktapeEsLambdaBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              sizeLimit: 250,
              zippedSizeLimit: 50,
              debug: globalStateManager.isDebugMode,
              distFolderPath: fsPaths.absoluteLambdaArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput,
              ...(sharedLayerExternals.length > 0 && { sharedLayerExternals, usesSharedLayer: true })
            });
            this.#packagedJobs.push({
              ...result,
              skipped: result.outcome === 'skipped',
              resolvedModules: result.resolvedModules
            });
            return result;
          }
          if (packagingType === 'stacktape-image-buildpack') {
            const result = await buildUsingStacktapeEsImageBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              requiresGlibcBinaries: packaging.properties.requiresGlibcBinaries,
              debug: globalStateManager.isDebugMode,
              distFolderPath: fsPaths.absoluteContainerArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput,
              devMode
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
            return result;
          }
          break;
        }

        case 'py': {
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            languageSpecificConfig: packaging.properties.languageSpecificConfig as PyLanguageSpecificConfig,
            minify: true,
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath)
          };
          if (sharedStpBuildpackProps.languageSpecificConfig?.packageManagerFile) {
            sharedStpBuildpackProps.languageSpecificConfig.packageManagerFile = join(
              globalStateManager.workingDir,
              sharedStpBuildpackProps.languageSpecificConfig.packageManagerFile
            );
          }
          const additionalDigestInput = objectHash(sharedStpBuildpackProps);
          if (packagingType === 'stacktape-lambda-buildpack') {
            const result = await buildUsingStacktapePyLambdaBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              sizeLimit: 250,
              zippedSizeLimit: 50,
              distFolderPath: fsPaths.absoluteLambdaArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
            return result;
          }
          if (packagingType === 'stacktape-image-buildpack') {
            const result = await buildUsingStacktapePyImageBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              distFolderPath: fsPaths.absoluteContainerArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
            return result;
          }
          break;
        }
        case 'java': {
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            languageSpecificConfig: packaging.properties.languageSpecificConfig as JavaLanguageSpecificConfig,
            minify: true,
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath)
          };
          const additionalDigestInput = objectHash(sharedStpBuildpackProps);
          if (packagingType === 'stacktape-lambda-buildpack') {
            const result = await buildUsingStacktapeJavaLambdaBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              sizeLimit: 250,
              zippedSizeLimit: 50,
              distFolderPath: fsPaths.absoluteLambdaArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
            return result;
          }
          if (packagingType === 'stacktape-image-buildpack') {
            const result = await buildUsingStacktapeJavaImageBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              distFolderPath: fsPaths.absoluteContainerArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
            return result;
          }
          break;
        }
        case 'go': {
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            minify: true,
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath)
          };
          const additionalDigestInput = objectHash(sharedStpBuildpackProps);
          if (packagingType === 'stacktape-lambda-buildpack') {
            const result = await buildUsingStacktapeGoLambdaBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              sizeLimit: 250,
              zippedSizeLimit: 50,
              distFolderPath: fsPaths.absoluteLambdaArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
            return result;
          }
          if (packagingType === 'stacktape-image-buildpack') {
            const result = await buildUsingStacktapeGoImageBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              distFolderPath: fsPaths.absoluteContainerArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
            return result;
          }
          break;
        }
        case 'rb': {
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            languageSpecificConfig: packaging.properties.languageSpecificConfig as RubyLanguageSpecificConfig,
            minify: true,
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath)
          };
          const additionalDigestInput = objectHash(sharedStpBuildpackProps);
          if (packagingType === 'stacktape-lambda-buildpack') {
            const result = await buildUsingStacktapeRbLambdaBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              sizeLimit: 250,
              zippedSizeLimit: 50,
              distFolderPath: fsPaths.absoluteLambdaArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
            return result;
          }
          if (packagingType === 'stacktape-image-buildpack') {
            const result = await buildUsingStacktapeRbImageBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              distFolderPath: fsPaths.absoluteContainerArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
            return result;
          }
          break;
        }
        case 'php': {
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            languageSpecificConfig: packaging.properties.languageSpecificConfig as PhpLanguageSpecificConfig,
            minify: true,
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath)
          };
          const additionalDigestInput = objectHash(sharedStpBuildpackProps);
          if (packagingType === 'stacktape-lambda-buildpack') {
            const result = await buildUsingStacktapePhpLambdaBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              sizeLimit: 250,
              zippedSizeLimit: 50,
              distFolderPath: fsPaths.absoluteLambdaArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
            return result;
          }
          if (packagingType === 'stacktape-image-buildpack') {
            const result = await buildUsingStacktapePhpImageBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              distFolderPath: fsPaths.absoluteContainerArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
            return result;
          }
          break;
        }
        case 'cs': {
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            languageSpecificConfig: packaging.properties.languageSpecificConfig as DotnetLanguageSpecificConfig,
            minify: true,
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath)
          };
          const additionalDigestInput = objectHash(sharedStpBuildpackProps);
          if (packagingType === 'stacktape-lambda-buildpack') {
            const result = await buildUsingStacktapeDotnetLambdaBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              sizeLimit: 250,
              zippedSizeLimit: 50,
              distFolderPath: fsPaths.absoluteLambdaArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
            return result;
          }
          if (packagingType === 'stacktape-image-buildpack') {
            const result = await buildUsingStacktapeDotnetImageBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              distFolderPath: fsPaths.absoluteContainerArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
            return result;
          }
          break;
        }
      }
    }
  };

  getTargetCpuArchitectureForContainer = (resources: BatchJobResources | ContainerWorkloadResourcesConfig) => {
    if ((resources as ContainerWorkloadResourcesConfig).instanceTypes?.length) {
      return ec2Manager.ec2InstanceTypes
        .find(({ InstanceType }) => InstanceType === (resources as ContainerWorkloadResourcesConfig).instanceTypes[0])
        ?.ProcessorInfo.SupportedArchitectures.includes('arm64')
        ? 'linux/arm64'
        : 'linux/amd64';
    }
    return (resources as ContainerWorkloadResourcesConfig)?.architecture
      ? (resources as ContainerWorkloadResourcesConfig)?.architecture === 'arm64'
        ? 'linux/arm64'
        : 'linux/amd64'
      : 'linux/amd64';
  };
}

export const packagingManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new PackagingManager());
