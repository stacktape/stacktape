import type { LoggableEventType, ProgressReporter as ProgressLogger } from '@application-services/operation-manager';
import type { HelperLambdaPackaging, PackageWorkloadOutput } from '@domain-services/packaging-manager/types';
import type { Subtype } from '@utils/type-helpers';
import type { StpAstroWeb } from '@domain-services/config-manager/resolved-types/astro-web';
import type { StpEdgeLambdaFunction } from '@domain-services/config-manager/resolved-types/edge-lambda-functions';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { StpNextjsWeb } from '@domain-services/config-manager/resolved-types/nextjs-web';
import type { StpNuxtWeb } from '@domain-services/config-manager/resolved-types/nuxt-web';
import type { StpRemixWeb } from '@domain-services/config-manager/resolved-types/remix-web';
import type { StpSolidStartWeb } from '@domain-services/config-manager/resolved-types/solidstart-web';
import type { StpSvelteKitWeb } from '@domain-services/config-manager/resolved-types/sveltekit-web';
import type { StpTanStackWeb } from '@domain-services/config-manager/resolved-types/tanstack-web';
import type { NativeBinaryLayerResult } from '@stacktape/packaging/es/native-dependencies';
import type { DockerBuildOutputArchitecture, PackagingOutput } from '@stacktape/packaging/runtime-contracts';
import { packagingMessages } from '@stacktape/packaging/runtime-contracts';
import type { LambdaEntrypoint } from '@stacktape/packaging/split-bundler/types';
import { existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { ec2Manager } from '@domain-services/ec2-manager';
import { fsPaths } from 'src/config/runtime-paths';
import { LAMBDA_TRACING_RUNTIME_DIST_PATH, SOURCE_MAP_INSTALL_DIST_PATH } from 'src/config/project-paths';
import { buildLayerS3Key, getEcrCacheImageTag } from '@domain-services/deployment-artifact-manager/artifact-names';
import { getJobName } from '@stacktape/naming/workload-names';
import { buildNativeBinaryLayer } from '@stacktape/packaging/es/native-dependencies';
import { buildSplitBundle } from '@stacktape/packaging/split-bundler/bundler';
import { getLambdaRuntimeFromNodeTarget, getLockFileData } from '@stacktape/packaging/bundlers/es/utils';
import { STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION } from '@stacktape/packaging/bundlers/constants';
import { assignChunksToLayers, DEFAULT_LAYER_CONFIG } from '@stacktape/packaging/split-bundler/layer-assignment';
import { createLayerArtifacts } from '@stacktape/packaging/split-bundler/layer-builder';
import { buildUsingCustomArtifact } from '@stacktape/packaging/artifact/custom-artifact';
import { buildUsingCustomDockerfile } from '@stacktape/packaging/image/custom-dockerfile';
import { buildUsingExternalBuildpack } from '@stacktape/packaging/image/external-buildpack';
import { buildHostingBucket } from '@stacktape/packaging/web/hosting-bucket-build';
import { createNextjsWebArtifacts } from '@stacktape/packaging/web/nextjs-web';
import { createSsrWebArtifacts } from '@stacktape/packaging/web/ssr-web-shared';
import {
  SSR_WEB_FRAMEWORK_CONFIGS,
  type SsrWebResourceType
} from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/ssr-web-shared';
import { buildUsingNixpacks } from '@stacktape/packaging/image/nixpacks';

import { buildUsingStacktapeEsImageBuildpack } from '@stacktape/packaging/buildpacks/stacktape-es-image-buildpack';
import { buildUsingStacktapeEsLambdaBuildpack } from '@stacktape/packaging/buildpacks/stacktape-es-lambda-buildpack';
import { buildUsingStacktapeGoImageBuildpack } from '@stacktape/packaging/buildpacks/stacktape-go-image-buildpack';
import { buildUsingStacktapeGoLambdaBuildpack } from '@stacktape/packaging/buildpacks/stacktape-go-lambda-buildpack';
import { buildUsingStacktapeJavaImageBuildpack } from '@stacktape/packaging/buildpacks/stacktape-java-image-buildpack';
import { buildUsingStacktapeJavaLambdaBuildpack } from '@stacktape/packaging/buildpacks/stacktape-java-lambda-buildpack';
import { buildUsingStacktapeRbImageBuildpack } from '@stacktape/packaging/buildpacks/stacktape-rb-image-buildpack';
import { buildUsingStacktapeRbLambdaBuildpack } from '@stacktape/packaging/buildpacks/stacktape-rb-lambda-buildpack';
import { buildUsingStacktapePhpImageBuildpack } from '@stacktape/packaging/buildpacks/stacktape-php-image-buildpack';
import { buildUsingStacktapeDotnetImageBuildpack } from '@stacktape/packaging/buildpacks/stacktape-dotnet-image-buildpack';
import { buildUsingStacktapeDotnetLambdaBuildpack } from '@stacktape/packaging/buildpacks/stacktape-dotnet-lambda-buildpack';
import { buildUsingStacktapePyImageBuildpack } from '@stacktape/packaging/buildpacks/stacktape-py-image-buildpack';
import { buildUsingStacktapePyLambdaBuildpack } from '@stacktape/packaging/buildpacks/stacktape-py-lambda-buildpack';
import {
  buildDockerImage,
  checkDockerImageExists,
  ensureBuildxBuilderForCache,
  execDocker,
  getDockerImageDetails,
  getDockerBuildxSupportedPlatforms,
  installDockerPlatforms,
  isDockerRunning
} from '@utils/docker';
import { dependencyInstaller } from '@domain-services/packaging-manager/dependency-installer';
import { createCliPackagingError } from '@domain-services/packaging-manager/errors';
import { exec } from '@utils/exec';
import { getFileExtension } from '@utils/fs-utils';
import { execNixpacks } from '@domain-services/packaging-manager/nixpacks-command';
import { execPack } from '@domain-services/packaging-manager/pack-command';
import { archiveItem } from './timed-archive';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { markTiming, startTiming, timeAsync } from '@utils/timings';
import { rename } from 'fs-extra';
import objectHash from 'object-hash';
import { resolveEnvironmentDirectives } from 'src/commands/dev/utils';
import { isDevCommand } from '../../commands/dev/dev-resource-filter';
import type { BatchJobResources } from '@stacktape/config/batch-jobs';
import type {
  BatchJobContainerPackaging,
  ContainerWorkloadContainerPackaging,
  DotnetLanguageSpecificConfig,
  EsLanguageSpecificConfig,
  JavaLanguageSpecificConfig,
  LambdaPackaging,
  PhpLanguageSpecificConfig,
  PyLanguageSpecificConfig,
  RubyLanguageSpecificConfig
} from '@stacktape/config/deployment-artifacts';
import type { ContainerWorkloadResourcesConfig } from '@stacktape/config/multi-container-workloads';
import type { LambdaRuntime } from '@stacktape/config/primitives';
import type { EnvironmentVar } from '@stacktape/config/shared';
import { resolveNodeVersion } from '@stacktape/packaging/bundlers/node-version';
import { getFileSizeBytes, getFolderSizeBytes } from '@stacktape/packaging/fs/files';
import { getSplitFunctionDigest } from '@stacktape/packaging/split-bundler/function-digest';
import {
  formatBytesAsMb,
  getLambdaCombinedUnzippedSizeBytes,
  LAMBDA_MAX_COMBINED_UNZIPPED_SIZE_BYTES,
  LAMBDA_MAX_LAYERS
} from '@stacktape/packaging/artifact/lambda-limits';
import { loadFromJavascript, loadFromTypescript } from '@utils/file-loaders';
import { getStableBuildpackDigestProps } from './artifact-digest-inputs';
import { canBuildSplitNativeDependencies, selectSplitBundlingGroup } from './split-bundling-policy';
import { groupCompatibleNativeDependencies } from './native-layer-groups';
import {
  areBuildAndRuntimeVersionsAligned,
  getDotnetBuildVersionForRuntime,
  getJavaBuildVersionForRuntime,
  getPythonBuildVersionForRuntime,
  getRubyBuildVersionForRuntime
} from './runtime-build-version';

const resolveManagedLambdaBuildVersion = <Version extends string | number>({
  configuredVersion,
  runtimeVersion,
  runtime,
  language,
  workloadName
}: {
  configuredVersion?: Version | undefined;
  runtimeVersion?: Version | undefined;
  runtime?: LambdaRuntime | undefined;
  language: string;
  workloadName: string;
}): Version | undefined => {
  if (runtime !== undefined && runtimeVersion === undefined) {
    throw createCliPackagingError({
      type: 'PACKAGING',
      message: `Lambda runtime ${runtime} is not compatible with the ${language} Stacktape buildpack for ${workloadName}.`,
      hint: `Select a managed ${language} runtime that matches the entry file.`
    });
  }
  if (
    configuredVersion !== undefined &&
    runtimeVersion !== undefined &&
    !areBuildAndRuntimeVersionsAligned(configuredVersion, runtimeVersion)
  ) {
    throw createCliPackagingError({
      type: 'PACKAGING',
      message: `${language} build version ${configuredVersion} does not match Lambda runtime ${runtime} for ${workloadName}.`,
      hint: 'Remove the explicit language version to inherit it from the runtime, or make both versions match.'
    });
  }
  return configuredVersion ?? runtimeVersion;
};

const formatLambdaSize = ({ sizeMB, sizeKB }: { sizeMB: number; sizeKB: number }) => {
  if (Number.isNaN(sizeMB) || Number.isNaN(sizeKB)) {
    return '0 KB';
  }
  if (sizeMB >= 0.1) {
    return `${sizeMB} MB`;
  }
  return `${sizeKB} KB`;
};

const loadPackagingModuleExport = async <T>({
  filePath,
  exportName
}: {
  filePath: string;
  exportName: string;
}): Promise<T> => {
  const load =
    filePath.endsWith('.js') || filePath.endsWith('.cjs') || filePath.endsWith('.mjs')
      ? loadFromJavascript
      : loadFromTypescript;
  return load({ filePath, exportName }) as Promise<T>;
};

const getCacheRef = (jobName: string) => {
  const repositoryUrl = deploymentArtifactManager.repositoryUrl;
  if (!repositoryUrl) return undefined;
  return `${repositoryUrl}:${getEcrCacheImageTag(jobName)}`;
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

  /** Native/external dependency layers (bcrypt, sharp, explicit externals, etc.) - separate from chunk layers. */
  #nativeBinaryLayers: Array<NativeBinaryLayerResult & { layerNumber: number; s3Key: string }> = [];

  /** Maps lambda name -> set of layer numbers it uses (for chunk layers) */
  #lambdaLayerMap: Map<string, Set<number>> = new Map();

  /** Maps each Lambda to its compatible native dependency layer. */
  #nativeBinaryLayerByLambda: Map<string, number> = new Map();

  /**
   * Docker setup for this process, started by the first job that needs each part. Jobs that ask while a part is being
   * prepared wait for the same attempt. A failed attempt is forgotten, so a later build (a `dev` rebuild, say) tries
   * again.
   */
  #dockerPreparations = new Map<string, Promise<unknown>>();

  #prepareDockerOnce = <Value>(part: string, prepare: () => Promise<Value>): Promise<Value> => {
    const started = this.#dockerPreparations.get(part) as Promise<Value> | undefined;
    if (started) {
      return started;
    }
    const preparation = prepare().catch((error: unknown) => {
      this.#dockerPreparations.delete(part);
      throw error;
    });
    this.#dockerPreparations.set(part, preparation);
    return preparation;
  };

  /** Installs emulation for `platform` only when the current builder does not support it yet. */
  #prepareDockerPlatform = (platform: string) =>
    this.#prepareDockerOnce(`platform ${platform}`, () =>
      timeAsync(
        'docker:build-platforms',
        async () => {
          const supportedPlatforms = await this.#prepareDockerOnce(
            'supported platforms',
            getDockerBuildxSupportedPlatforms
          );
          const isMissing = !supportedPlatforms.includes(platform);
          markTiming('docker:missing-build-platforms', { platform, count: isMissing ? 1 : 0 });
          if (isMissing) {
            await installDockerPlatforms([platform]);
          }
        },
        { platform }
      )
    );

  /** Prepares the platform a Docker, pack or Nixpacks command names with `--platform`, when it names one. */
  #prepareRequestedDockerPlatform = async (args: string[]) => {
    const platformIndex = args.indexOf('--platform');
    const platform = platformIndex === -1 ? undefined : args[platformIndex + 1];
    if (platform) {
      await this.#prepareDockerPlatform(platform);
    }
  };

  #prepareRemoteDockerCache = () =>
    this.#prepareDockerOnce('remote cache', () =>
      timeAsync('docker:remote-cache', async () => {
        await ensureBuildxBuilderForCache();
        // Registry cache pulls and exports authenticate at build time, but the CLI's only other ECR
        // login runs later, at artifact upload. Builds otherwise coast on the credential a previous
        // deploy persisted, and ECR tokens expire after 12 hours — the first redeploy after an idle
        // half-day then fails every cache export with 403 until the login is refreshed here.
        await deploymentArtifactManager.loginToEcr();
      })
    );

  /**
   * The Docker, pack and Nixpacks runners jobs receive. Each prepares what its own command needs just before running
   * it: the platform the command names, and the registry cache builder and login when an image build uses the cache.
   * A job that never runs such a command prepares nothing.
   */
  #dockerRunners = {
    buildDockerImage: async (options: Parameters<typeof buildDockerImage>[0]) => {
      if (options.dockerBuildOutputArchitecture) {
        await this.#prepareDockerPlatform(options.dockerBuildOutputArchitecture);
      }
      if (options.cacheFromRef || options.cacheToRef) {
        await this.#prepareRemoteDockerCache();
      }
      return buildDockerImage(options);
    },
    runDocker: async (...[commands, options]: Parameters<typeof execDocker>) => {
      await this.#prepareRequestedDockerPlatform(commands);
      return execDocker(commands, options);
    },
    runPack: async (input: Parameters<typeof execPack>[0]) => {
      await this.#prepareRequestedDockerPlatform(input.args);
      return execPack(input);
    },
    runNixpacks: async (input: Parameters<typeof execNixpacks>[0]) => {
      await this.#prepareRequestedDockerPlatform(input.args);
      return execNixpacks(input);
    }
  };

  init = async () => {};

  #waitForAllOrThrow = async (promises: Promise<unknown>[]) => {
    const results = await Promise.allSettled(promises);
    const firstRejectedResult = results.find((result) => result.status === 'rejected') as
      | PromiseRejectedResult
      | undefined;

    if (firstRejectedResult) {
      throw firstRejectedResult.reason;
    }
  };

  clearPackagedJobs() {
    this.#packagedJobs = [];
    this.#layerArtifacts = [];
    this.#nativeBinaryLayers = [];
    this.#lambdaLayerMap.clear();
    this.#nativeBinaryLayerByLambda.clear();
  }

  getPackagingOutputForJob(jobName: string) {
    return this.#packagedJobs.find((job) => job.jobName === jobName) || null;
  }

  /**
   * Check if a lambda uses shared layers.
   */
  shouldLambdaUseSharedLayer(lambdaName: string): boolean {
    return (this.#lambdaLayerMap.get(lambdaName)?.size ?? 0) > 0 || this.#nativeBinaryLayerByLambda.has(lambdaName);
  }

  /**
   * Get layer artifacts for a specific layer number.
   */
  getLayerArtifact(layerNumber: number) {
    // Layer 0 is native binary layer
    const nativeLayer = this.#nativeBinaryLayers.find((layer) => layer.layerNumber === layerNumber);
    if (nativeLayer) {
      return {
        layerNumber: nativeLayer.layerNumber,
        layerPath: nativeLayer.layerPath,
        chunks: [], // Native layer doesn't have chunks
        sizeBytes: nativeLayer.sizeBytes,
        contentHash: nativeLayer.contentHash,
        s3Key: nativeLayer.s3Key
      };
    }
    return this.#layerArtifacts.find((l) => l.layerNumber === layerNumber) || null;
  }

  /**
   * Get all layer artifacts (chunk layers + native binary layer).
   */
  getLayerArtifacts() {
    const allLayers = [...this.#layerArtifacts];

    for (const nativeLayer of this.#nativeBinaryLayers) {
      allLayers.unshift({
        layerNumber: nativeLayer.layerNumber,
        layerPath: nativeLayer.layerPath,
        chunks: [],
        sizeBytes: nativeLayer.sizeBytes,
        contentHash: nativeLayer.contentHash,
        s3Key: nativeLayer.s3Key
      });
    }

    return allLayers;
  }

  /**
   * Which Node Lambdas are built together, and which keep the ordinary per-Lambda path.
   *
   * Building them together is what lets code several of them share be packaged once, as a layer
   * they all use, instead of copied into every artifact.
   *
   * The ordinary Lambda buildpack remains the fallback for what the split path cannot serve. Docker
   * is not asked here: pure JavaScript never needs it, and a native dependency found by the shared
   * analysis makes the split build require Docker before any artifact is written.
   */
  #partitionNodeLambdas<
    Candidate extends {
      packaging: LambdaPackaging;
      architecture?: 'x86_64' | 'arm64' | undefined;
      runtime?: LambdaRuntime | undefined;
    }
  >(nodeLambdas: Candidate[]): { split: Candidate[]; perFunction: Candidate[] } {
    if (globalStateManager.args.disableLayerOptimization) {
      return { split: [], perFunction: nodeLambdas };
    }
    return selectSplitBundlingGroup(nodeLambdas);
  }

  /**
   * Get layer numbers that a lambda should use.
   * Returns array of layer numbers (0 for native binaries, 1-5 for chunks) used by this lambda.
   */
  getLayerNumbersForLambda(lambdaName: string): number[] {
    const layerNumbers: number[] = [];

    // Add native binary layer (layer 0) if this lambda uses native deps
    const nativeLayerNumber = this.#nativeBinaryLayerByLambda.get(lambdaName);
    if (
      nativeLayerNumber !== undefined &&
      this.#nativeBinaryLayers.some((layer) => layer.layerNumber === nativeLayerNumber)
    ) {
      layerNumbers.push(nativeLayerNumber);
    }

    // Add chunk layers (1-5)
    const chunkLayerNumbers = this.#lambdaLayerMap.get(lambdaName);
    if (chunkLayerNumbers) {
      layerNumbers.push(...Array.from(chunkLayerNumbers));
    }

    return layerNumbers.sort((left, right) => left - right);
  }

  /**
   * Check if a lambda uses the native binary layer.
   */
  lambdaUsesNativeBinaryLayer(lambdaName: string): boolean {
    return this.#nativeBinaryLayerByLambda.has(lambdaName);
  }

  /**
   * Get native binary layer artifact if one was created.
   */
  getNativeBinaryLayer() {
    return this.#nativeBinaryLayers[0] ?? null;
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
    const first = this.getLayerArtifacts()[0];
    if (!first) return null;
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
   * Zip shared layers for upload, each beside its directory as `<layerPath>.zip`. A deployment passes exactly the chunk
   * and native-dependency layers its bucket does not hold yet.
   */
  publishSharedLayer = async (layers: { layerPath: string }[]): Promise<void> => {
    await Promise.all(
      layers.map(({ layerPath }) =>
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
    this.#layerArtifacts = [];
    this.#nativeBinaryLayers = [];
    this.#lambdaLayerMap.clear();
    this.#nativeBinaryLayerByLambda.clear();

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

    /*
     * Every Lambda in the group shares one compatibility key, so the build inputs the single
     * `Bun.build` call needs are the same for all of them and the first one's are the group's.
     * `selectSplitBundlingGroup` admits only the Stacktape buildpack, so the narrow always holds.
     */
    const firstLambda = nodeLambdas[0];
    if (firstLambda.packaging.type !== 'stacktape-lambda-buildpack') {
      throw createCliPackagingError({
        type: 'PACKAGING',
        message: `Function ${firstLambda.name} cannot be built together with other functions: its packaging is ${firstLambda.packaging.type}.`
      });
    }
    const sharedPackagingProperties = firstLambda.packaging.properties;
    const languageSpecificConfig = sharedPackagingProperties.languageSpecificConfig as
      | EsLanguageSpecificConfig
      | undefined;
    const nodeVersion = resolveNodeVersion({
      nodeVersion: languageSpecificConfig?.nodeVersion,
      runtime: firstLambda.runtime,
      target: 'lambda'
    });

    // Create progress logger for the shared layer (split bundle process)
    const sharedLayerLogger = operationReporter.createChildLogger({
      parentEventType: 'PACKAGE_ARTIFACTS',
      instanceId: 'shared-layer',
      label: 'shared layer'
    });
    await sharedLayerLogger.startEvent({
      eventType: 'BUILD_CODE',
      description: 'Building shared lambda dependencies'
    });

    // Create progress loggers for each lambda immediately so they're visible from the start
    const lambdaLoggers = new Map<string, ReturnType<typeof operationReporter.createChildLogger>>();
    for (const { name, type } of nodeLambdas) {
      const jobName = getJobName({ workloadName: name, workloadType: type as any });
      const logger = operationReporter.createChildLogger({
        parentEventType: 'PACKAGE_ARTIFACTS',
        instanceId: jobName,
        label: name
      });
      lambdaLoggers.set(name, logger);
      // Start each lambda in "identifying shared resources" state
      await logger.startEvent({
        eventType: 'BUILD_CODE',
        description: 'Identifying shared resources'
      });
    }

    const configuredTsConfigPath = languageSpecificConfig?.tsConfigPath;
    const explicitTsConfigPath = configuredTsConfigPath
      ? isAbsolute(configuredTsConfigPath)
        ? configuredTsConfigPath
        : join(globalStateManager.workingDir, configuredTsConfigPath)
      : undefined;
    if (explicitTsConfigPath && !existsSync(explicitTsConfigPath)) {
      throw createCliPackagingError({
        type: 'PACKAGING',
        message: `Configured TypeScript configuration file does not exist: ${configuredTsConfigPath}.`
      });
    }
    const defaultTsConfigPath = join(globalStateManager.workingDir, 'tsconfig.json');
    const tsConfigPath = explicitTsConfigPath ?? (existsSync(defaultTsConfigPath) ? defaultTsConfigPath : undefined);

    const endSplitBuild = startTiming('split:build', { functions: entrypoints.length });
    const splitResult = await buildSplitBundle({
      entrypoints,
      sharedOutdir: fsPaths.absoluteSplitBundleOutdir({ invocationId: globalStateManager.invocationId }),
      cwd: globalStateManager.workingDir,
      ...(tsConfigPath ? { tsConfigPath } : {}),
      minify: languageSpecificConfig?.minify ?? true,
      minifyIdentifiers: languageSpecificConfig?.minifyIdentifiers ?? false,
      bundleAwsSdk: languageSpecificConfig?.bundleAwsSdk ?? false,
      sourceMaps: languageSpecificConfig?.disableSourceMaps ? 'disabled' : 'external',
      sourceMapBannerType: 'pre-compiled',
      excludeDependencies: sharedPackagingProperties.excludeDependencies || [],
      dependenciesToExcludeFromBundle: languageSpecificConfig?.dependenciesToExcludeFromBundle || [],
      isLambda: true,
      nodeTarget: nodeVersion,
      installDependencies: async () => {
        await dependencyInstaller.install({
          rootProjectDirPath: globalStateManager.workingDir,
          progressLogger: {
            eventContext: {},
            startEvent: async () => {},
            updateEvent: async () => {},
            finishEvent: async () => {}
          }
        });
      },
      createPackagingError: ({ message, hint, cause }) =>
        createCliPackagingError({ type: 'PACKAGING', message, hint, cause })
    });
    endSplitBuild({ ...splitResult.timings, sharedChunks: splitResult.sharedChunkCount });

    // Build native binaries (bcrypt, sharp, prisma, etc.) into a shared layer
    // This is more efficient than copying to each lambda - upload once, use everywhere
    const lambdasWithNativeDeps = Array.from(splitResult.lambdaOutputs.entries()).filter(
      ([, output]) => output.dependenciesToInstallInDocker.length > 0
    );

    const dockerStillRunning = lambdasWithNativeDeps.length === 0 || (await isDockerRunning());
    if (
      !canBuildSplitNativeDependencies({
        dependencyCount: lambdasWithNativeDeps.length,
        dockerIsRunning: dockerStillRunning
      })
    ) {
      const needs = lambdasWithNativeDeps.map(
        ([lambdaName, output]) =>
          `${lambdaName} (${output.dependenciesToInstallInDocker.map(({ name }) => name).join(', ')})`
      );
      throw createCliPackagingError({
        type: 'PACKAGING',
        message: `Docker is not running or not installed, and native dependencies need it: ${needs.join('; ')}.`,
        hint: 'Start Docker, or install it from https://www.docker.com/products/docker-desktop/, and retry.'
      });
    }

    if (lambdasWithNativeDeps.length > 0) {
      const { packageManager } = await getLockFileData(globalStateManager.workingDir);
      if (!packageManager) {
        throw new Error(
          'Failed to load dependency lockfile. You need to install your dependencies first. Supported package managers are npm and yarn.'
        );
      }

      // Determine architecture from first lambda (all should be same in a split bundle)
      const firstLambdaArch = nodeLambdas[0]?.architecture;
      const dockerArch = firstLambdaArch === 'arm64' ? 'linux/arm64' : 'linux/amd64';

      const dependencyGroups = groupCompatibleNativeDependencies(
        lambdasWithNativeDeps.map(([lambdaName, output]) => ({
          lambdaName,
          dependencies: output.dependenciesToInstallInDocker
        }))
      );
      const endNativeLayers = startTiming('split:native-layers', { groups: dependencyGroups.length });
      const nativeLayers = await Promise.all(
        dependencyGroups.map(async ({ dependencies, lambdaNames }, groupIndex) => {
          // Preserve layer 0 for the ordinary single-group case. Additional version-isolated layers use a disjoint
          // range so their logical IDs cannot collide with shared chunk layers 1-5.
          const layerNumber = groupIndex === 0 ? 0 : 99 + groupIndex;
          const nativeLayer = await buildNativeBinaryLayer({
            dependencies,
            installationRootPath: join(
              fsPaths.absoluteBuildFolderPath({ invocationId: globalStateManager.invocationId }),
              '_bin-install'
            ),
            layerBasePath: `${fsPaths.absoluteBuildFolderPath({ invocationId: globalStateManager.invocationId })}/layers`,
            lambdaRuntimeVersion: getLambdaRuntimeFromNodeTarget(String(nodeVersion)),
            packageManager,
            dockerBuildOutputArchitecture: dockerArch,
            usedByLambdas: lambdaNames,
            layerName: groupIndex === 0 ? 'layer-native' : `layer-native-${layerNumber}`,
            runDocker: this.#dockerRunners.runDocker
          });
          if (!nativeLayer) {
            throw createCliPackagingError({
              type: 'PACKAGING',
              message: 'Failed to create a native dependency layer for the split Lambda bundle.',
              hint: 'Review the native dependency build output and retry the deployment.'
            });
          }
          return {
            ...nativeLayer,
            layerNumber,
            s3Key: buildLayerS3Key(layerNumber, nativeLayer.contentHash, '')
          };
        })
      );
      endNativeLayers();
      this.#nativeBinaryLayers = nativeLayers;
      for (const layer of nativeLayers) {
        for (const lambdaName of layer.usedByLambdas) {
          this.#nativeBinaryLayerByLambda.set(lambdaName, layer.layerNumber);
        }
      }
    }

    const skipLayers = globalStateManager.args.disableLayerOptimization;
    /*
     * AWS attaches at most 5 layers to a function, and shared chunks are not the only claimants: the
     * user's own layers and this build's native-dependency layer are counted too. Taking the default
     * three chunk layers regardless means a function with two layers of its own and a native dependency
     * asks for six, and synthesis rejects the whole deployment after packaging has already run — telling
     * the user to remove layers Stacktape chose for them. Packing into fewer layers instead leaves more
     * code in each package, which is the lesser cost.
     */
    const mostUserLayersOnOneLambda = Math.max(
      0,
      ...nodeLambdas.map(({ name }) => {
        const resource = configManager.allUserCodeLambdas.find((lambda) => lambda.name === name);
        // Edge functions carry no layers and never reach a split build, but the union type admits them.
        return (resource as { layers?: unknown[] } | undefined)?.layers?.length ?? 0;
      })
    );
    const chunkLayerBudget = Math.max(
      1,
      Math.min(
        DEFAULT_LAYER_CONFIG.maxLayers,
        LAMBDA_MAX_LAYERS - mostUserLayersOnOneLambda - (this.#nativeBinaryLayers.length > 0 ? 1 : 0)
      )
    );
    const endAssignLayers = startTiming('split:assign-layers');
    const layerAssignment = skipLayers
      ? { layeredChunks: [], unLayeredChunks: [], layers: [], totalBytesSaved: 0 }
      : assignChunksToLayers(splitResult.chunkAnalysis, { ...DEFAULT_LAYER_CONFIG, maxLayers: chunkLayerBudget });
    endAssignLayers({ layeredChunks: layerAssignment.layeredChunks.length });
    let layerArtifactsWithS3Keys: Array<{
      layerNumber: number;
      layerPath: string;
      chunks: string[];
      sizeBytes: number;
      contentHash: string;
      s3Key: string;
    }> = [];
    if (layerAssignment.layeredChunks.length > 0) {
      const layerResult = await timeAsync('split:create-layer-artifacts', () =>
        createLayerArtifacts({
          lambdaOutputs: splitResult.lambdaOutputs,
          layerAssignment,
          layerBasePath: `${fsPaths.absoluteBuildFolderPath({ invocationId: globalStateManager.invocationId })}/layers`
        })
      );

      // Compute S3 keys for each layer (needed for both template and upload)
      // Use contentHash for caching instead of version (ensures re-upload only when content changes)
      layerArtifactsWithS3Keys = layerResult.layerArtifacts.map((layer) => ({
        ...layer,
        s3Key: buildLayerS3Key(layer.layerNumber, layer.contentHash, '')
      }));
    }

    // Store layer assignment and artifacts
    this.#layerArtifacts = layerArtifactsWithS3Keys;

    // Build lambda -> layer map: which lambdas use which layers
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
      const totalSavingsMB = Math.round(layerAssignment.totalBytesSaved / (1024 * 1024));
      const layerCount = layerArtifactsWithS3Keys.length;
      // Dependencies shared by several functions are packaged once as a Lambda
      // layer instead of being copied into every function bundle.
      finalMessage = `${layeredChunkCount} shared modules${layerCount > 1 ? ` in ${layerCount} layers` : ''} · ${totalLayerSizeMB} MB (saves ~${totalSavingsMB} MB)`;
    } else {
      // No layers created - either no shared code or chunks didn't meet threshold
      finalMessage = `Analyzed ${splitResult.sharedChunkCount} shared modules (none qualified for a shared layer)`;
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

      const layerNumbers = this.#lambdaLayerMap.get(name);
      const nativeLayerNumber = this.#nativeBinaryLayerByLambda.get(name);
      const nativeLayer =
        nativeLayerNumber === undefined
          ? undefined
          : this.#nativeBinaryLayers.find((layer) => layer.layerNumber === nativeLayerNumber);
      const usesNativeLayer = nativeLayerNumber !== undefined;
      if (usesNativeLayer && !nativeLayer) {
        throw createCliPackagingError({
          type: 'PACKAGING',
          message: `A native dependency layer was assigned to function ${name}, but its artifact is missing.`
        });
      }
      // Every final package file (local chunks and source maps included), the layers its imports point into, and the
      // archive layout it is zipped with.
      const endDigest = startTiming('split:function-digest', { job: jobName });
      const digest = await getSplitFunctionDigest({
        distFolderPath,
        chunkLayers: Array.from(layerNumbers ?? []).map((layerNumber) => ({
          layerNumber,
          contentHash: this.#layerArtifacts.find((artifact) => artifact.layerNumber === layerNumber)?.contentHash
        })),
        nativeLayer: nativeLayer ? { layerNumber: nativeLayer.layerNumber, contentHash: nativeLayer.contentHash } : null
      });
      endDigest();

      const functionSizeBytes = await getFolderSizeBytes(distFolderPath);
      const attachedLayers = Array.from(layerNumbers ?? []).map((layerNumber) => {
        const layer = this.#layerArtifacts.find((artifact) => artifact.layerNumber === layerNumber);
        if (!layer) {
          throw createCliPackagingError({
            type: 'PACKAGING',
            message: `Shared layer ${layerNumber} was assigned to function ${name}, but its artifact is missing.`
          });
        }
        return { label: `shared layer ${layerNumber}`, sizeBytes: layer.sizeBytes };
      });
      if (nativeLayer) {
        attachedLayers.push({ label: 'native dependency layer', sizeBytes: nativeLayer.sizeBytes });
      }
      // Lambda counts the unzipped function and every attached layer together; the ZIP size does not matter for code
      // deployed from S3. Layers the user attaches are outside this build, so they are left out, and the message says so.
      const combinedUnzippedSizeBytes = getLambdaCombinedUnzippedSizeBytes({
        functionSizeBytes,
        layerSizeBytes: attachedLayers.map(({ sizeBytes }) => sizeBytes)
      });
      if (combinedUnzippedSizeBytes > LAMBDA_MAX_COMBINED_UNZIPPED_SIZE_BYTES) {
        const layerSizes = attachedLayers.map(({ label, sizeBytes }) => `${label}: ${formatBytesAsMb(sizeBytes)}MB`);
        throw createCliPackagingError({
          type: 'PACKAGING',
          message: `Function ${name} is ${formatBytesAsMb(functionSizeBytes)}MB unzipped and its Stacktape layers add ${formatBytesAsMb(combinedUnzippedSizeBytes - functionSizeBytes)}MB (${layerSizes.join(', ')}), ${formatBytesAsMb(combinedUnzippedSizeBytes)}MB in total. AWS Lambda allows 250MB for a function and all its layers together. Layers attached outside Stacktape are not counted here.`,
          hint: 'Exclude unnecessary files or dependencies, reduce source maps, or disable shared-layer optimization for this deployment.'
        });
      }

      // Check if we can skip (artifact already exists with same digest)
      if (existingDigests.includes(digest)) {
        await lambdaLogger.finishEvent({
          eventType: 'BUILD_CODE',
          finalMessage: packagingMessages.unchanged
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

      const unzippedSizeMB = Number((functionSizeBytes / 1024 / 1024).toFixed(2));
      const unzippedSizeKB = Number((functionSizeBytes / 1024).toFixed(1));

      await archiveItem({
        absoluteSourcePath: distFolderPath,
        format: 'zip',
        useNativeZip: true
      });

      const originalZipPath = `${distFolderPath}.zip`;
      const zippedSizeBytes = await getFileSizeBytes(originalZipPath);
      const zippedSizeMB = Number((zippedSizeBytes / 1024 / 1024).toFixed(2));
      const zippedSizeKB = Number((zippedSizeBytes / 1024).toFixed(1));

      const adjustedZipPath = `${distFolderPath}-${digest}.zip`;
      await rename(originalZipPath, adjustedZipPath);

      // Zip message: "Lambda bundle · 1.2 MB (420 KB zipped) · uses 1 shared layer"
      // Reuse layerNumbers from digest calculation above
      const layerCount = layerNumbers ? layerNumbers.size : 0;
      const layerSuffix = layerCount > 0 ? ` · uses ${layerCount} shared layer${layerCount > 1 ? 's' : ''}` : '';
      const unzippedLabel = formatLambdaSize({ sizeMB: unzippedSizeMB, sizeKB: unzippedSizeKB });
      const zippedLabel = formatLambdaSize({ sizeMB: zippedSizeMB, sizeKB: zippedSizeKB });
      await lambdaLogger.finishEvent({
        eventType: 'BUILD_CODE',
        finalMessage: `${packagingMessages.lambdaBundle({ size: unzippedLabel, zippedSize: zippedLabel })}${layerSuffix}`
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

    await this.#waitForAllOrThrow(zipPromises);
  };

  packageAllWorkloads = async ({
    commandCanUseCache,
    onlyWorkloads
  }: {
    commandCanUseCache: boolean;
    /** If provided, only package workloads whose names are in this list */
    onlyWorkloads?: string[];
  }): Promise<PackageWorkloadOutput[]> => {
    await operationReporter.startEvent({
      eventType: 'PACKAGE_ARTIFACTS',
      description: 'Packaging workloads'
    });

    // Helper to check if a workload should be packaged based on onlyWorkloads filter
    const shouldPackageWorkload = (workloadName: string): boolean => {
      if (!onlyWorkloads || onlyWorkloads.length === 0) return true;
      return onlyWorkloads.includes(workloadName);
    };

    // Identify Node.js Lambda functions (excluding edge functions which need separate handling)
    const tracedLambdaNames = new Set(configManager.instrumentedLambdaFunctions.map(({ name }) => name));
    const nodeLambdas = configManager.allUserCodeLambdas
      .filter(({ name, packaging, type }) => {
        if (!shouldPackageWorkload(name)) return false;
        const ext = getFileExtension((packaging?.properties as { entryfilePath?: string })?.entryfilePath || '');
        // Exclude edge functions from split bundling - they don't support ESM with top-level await
        return ['js', 'ts', 'jsx', 'mjs', 'tsx'].includes(ext) && type !== 'edge-lambda-function';
      })
      // Tracing is applied by the per-Lambda buildpack, which wraps the handler at the bundle entry.
      .map((lambda) => Object.assign({}, lambda, { tracingEnabled: tracedLambdaNames.has(lambda.name) }));

    // Edge Lambda functions - need to be packaged separately with CJS
    const edgeLambdas = configManager.allUserCodeLambdas.filter(({ name, packaging, type }) => {
      if (!shouldPackageWorkload(name)) return false;
      const ext = getFileExtension((packaging?.properties as { entryfilePath?: string })?.entryfilePath || '');
      return ['js', 'ts', 'jsx', 'mjs', 'tsx'].includes(ext) && type === 'edge-lambda-function';
    });

    // Non-Node.js lambdas
    const nonNodeLambdas = configManager.allUserCodeLambdas.filter(({ name, packaging }) => {
      if (!shouldPackageWorkload(name)) return false;
      const ext = getFileExtension((packaging?.properties as { entryfilePath?: string })?.entryfilePath || '');
      return !['js', 'ts', 'jsx', 'mjs', 'tsx'].includes(ext);
    });

    // In dev mode, skip container and hosting bucket builds (they run locally)
    const skipContainersAndHosting = isDevCommand();

    // Hosting bucket builds (skip in dev mode, filter by onlyWorkloads)
    const hostingBucketBuildJobs = skipContainersAndHosting
      ? []
      : configManager.hostingBuckets
          .filter(({ name, build }) => build && shouldPackageWorkload(name))
          .map(({ name, build }) => {
            return () =>
              buildHostingBucket({
                name,
                cwd: globalStateManager.workingDir,
                build: build!,
                createPackagingError: createCliPackagingError,
                executeProcess: exec,
                progressLogger: operationReporter.createChildLogger({
                  instanceId: name,
                  label: name,
                  parentEventType: 'PACKAGE_ARTIFACTS'
                })
              });
          });

    // Container packaging jobs (skip in dev mode, filter by onlyWorkloads)
    const containerPackagingJobs = skipContainersAndHosting
      ? []
      : configManager.allContainersRequiringPackaging
          .filter(({ workloadName }) => shouldPackageWorkload(workloadName))
          .map(({ jobName, packaging, workloadName, resources }) => {
            return () =>
              this.packageWorkload({
                commandCanUseCache,
                jobName,
                packaging,
                workloadName,
                dockerBuildOutputArchitecture: this.getTargetCpuArchitectureForContainer(resources)
              });
          });

    const agentCoreRuntimePackagingJobs = skipContainersAndHosting
      ? []
      : configManager.agentCoreRuntimesRequiringPackaging
          .filter(({ name }) => shouldPackageWorkload(name))
          .map(({ name, jobName, packaging }) => {
            return () =>
              this.packageWorkload({
                commandCanUseCache,
                jobName,
                packaging,
                workloadName: name,
                workloadType: 'agentcore-runtime',
                dockerBuildOutputArchitecture: 'linux/arm64'
              });
          });

    // NextJS packaging jobs (skip in dev mode, filter by onlyWorkloads)
    const nextjsPackagingJobs = skipContainersAndHosting
      ? []
      : configManager.nextjsWebs
          .filter((resource) => shouldPackageWorkload(resource.name))
          .map((resource) => {
            return () =>
              this.packageNextjsWeb({
                nextjsWebResource: resource,
                commandCanUseCache
              });
          });

    // SSR Web packaging jobs (Astro, Nuxt, SvelteKit, SolidStart, TanStack, Remix) - skip in dev mode, filter by onlyWorkloads
    const ssrWebPackagingJobs = skipContainersAndHosting
      ? []
      : [
          ...configManager.astroWebs
            .filter((resource) => shouldPackageWorkload(resource.name))
            .map((resource) => () => this.packageSsrWeb({ resource, resourceType: 'astro-web', commandCanUseCache })),
          ...configManager.nuxtWebs
            .filter((resource) => shouldPackageWorkload(resource.name))
            .map((resource) => () => this.packageSsrWeb({ resource, resourceType: 'nuxt-web', commandCanUseCache })),
          ...configManager.sveltekitWebs
            .filter((resource) => shouldPackageWorkload(resource.name))
            .map(
              (resource) => () => this.packageSsrWeb({ resource, resourceType: 'sveltekit-web', commandCanUseCache })
            ),
          ...configManager.solidstartWebs
            .filter((resource) => shouldPackageWorkload(resource.name))
            .map(
              (resource) => () => this.packageSsrWeb({ resource, resourceType: 'solidstart-web', commandCanUseCache })
            ),
          ...configManager.tanstackWebs
            .filter((resource) => shouldPackageWorkload(resource.name))
            .map(
              (resource) => () => this.packageSsrWeb({ resource, resourceType: 'tanstack-web', commandCanUseCache })
            ),
          ...configManager.remixWebs
            .filter((resource) => shouldPackageWorkload(resource.name))
            .map((resource) => () => this.packageSsrWeb({ resource, resourceType: 'remix-web', commandCanUseCache }))
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
      ...agentCoreRuntimePackagingJobs,
      ...nextjsPackagingJobs,
      ...ssrWebPackagingJobs,
      ...hostingBucketBuildJobs
    ];

    // Run all packaging in parallel:
    // - Node.js lambdas use split bundling (single Bun.build call)
    // - Other workloads (containers, non-Node lambdas, nextjs) run in parallel
    const packagingPromises: Promise<void>[] = [];

    // Node.js lambdas: the largest compatible set shares one split build, the rest are packaged on
    // their own. One function the split path cannot serve no longer costs the others their layer.
    const { split: splitBundledLambdas, perFunction: individuallyBundledLambdas } =
      this.#partitionNodeLambdas(nodeLambdas);
    markTiming('packaging:paths', {
      split: splitBundledLambdas.length,
      perFunction: individuallyBundledLambdas.length,
      edge: edgeLambdas.length,
      other: otherPackagingJobs.length
    });

    if (splitBundledLambdas.length > 0) {
      packagingPromises.push(
        this.#packageNodeLambdasWithSplitBundling({ nodeLambdas: splitBundledLambdas, commandCanUseCache })
      );
    }
    if (individuallyBundledLambdas.length > 0) {
      packagingPromises.push(
        Promise.all(
          individuallyBundledLambdas.map(({ name, type, packaging, architecture, runtime }) =>
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

    await this.#waitForAllOrThrow(packagingPromises);

    const packagedJobCount = this.#packagedJobs.length;
    const reusedCount = this.#packagedJobs.filter((job) => job.skipped).length;
    const summaryParts = [`Packaged ${packagedJobCount} workload${packagedJobCount === 1 ? '' : 's'}`];
    if (reusedCount > 0) {
      summaryParts.push(`${packagedJobCount - reusedCount} built`, `${reusedCount} unchanged`);
    }
    await operationReporter.finishEvent({
      eventType: 'PACKAGE_ARTIFACTS',
      ...(packagedJobCount > 0 && { finalMessage: summaryParts.join(' · ') }),
      data: { packagedJobs: this.#packagedJobs }
    });

    return this.#packagedJobs;
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

    await operationReporter.startEvent({
      eventType: 'REPACKAGE_ARTIFACTS',
      description: 'Rebuilding cached workloads for the full deployment'
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

    await operationReporter.finishEvent({
      eventType: 'REPACKAGE_ARTIFACTS',
      finalMessage: 'Cached workloads rebuilt',
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
    const progressLogger = operationReporter.createChildLogger({
      parentEventType: 'PACKAGE_ARTIFACTS',
      instanceId: nextjsWebResource.name,
      label: nextjsWebResource.name
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
      createProgressLogger: (instanceId) =>
        operationReporter.createChildLogger({ instanceId, label: instanceId, parentEventType: 'PACKAGE_ARTIFACTS' }),
      progressLogger,
      archiveItem,
      createPackagingError: createCliPackagingError,
      executeProcess: exec,
      loadModuleExport: loadPackagingModuleExport
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
    const progressLogger = operationReporter.createChildLogger({
      parentEventType: 'PACKAGE_ARTIFACTS',
      instanceId: resource.name,
      label: resource.name
    });

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
      progressLogger,
      createProgressLogger: (instanceId) =>
        operationReporter.createChildLogger({ instanceId, label: instanceId, parentEventType: 'PACKAGE_ARTIFACTS' }),
      buildConfig: {
        buildCommand: resource.buildCommand || frameworkConfig.defaultBuildCommand,
        bundledApplicationPackages: frameworkConfig.bundledApplicationPackages,
        copyStaticAssetsToServerDirectory: frameworkConfig.copyStaticAssetsToServerDirectory,
        workingDir,
        serverOutputPath: frameworkConfig.serverOutputPath,
        staticOutputPath: frameworkConfig.staticOutputPath,
        handlerFileName: frameworkConfig.handlerPath,
        adapterConfigurationHint: frameworkConfig.adapterConfigurationHint,
        preserveServerOutputDirectory: frameworkConfig.preserveServerOutputDirectory,
        requiredAdapterPackages: frameworkConfig.requiredAdapterPackages,
        nativeRuntimePackages: frameworkConfig.nativeRuntimePackages,
        traceBasePath: globalStateManager.workingDir,
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
        : [],
      archiveItem,
      createPackagingError: createCliPackagingError,
      executeProcess: exec,
      runDocker: this.#dockerRunners.runDocker,
      nativeDependencyInstallationRootPath: join(
        fsPaths.absoluteBuildFolderPath({ invocationId: globalStateManager.invocationId }),
        '_bin-install'
      ),
      dockerBuildOutputArchitecture: 'linux/amd64'
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
    /** Workload type - used to determine packaging behavior (e.g., edge functions don't support ESM) */
    workloadType?: string;
  }): Promise<PackagingOutput | undefined> => {
    const shouldUseCache = this.#shouldWorkloadUseCache({ workloadName, commandCanUseCache });
    const existingDigests = shouldUseCache ? deploymentArtifactManager.getExistingDigestsForJob(jobName) : [];
    const packagingType = packaging.type;
    const progressLogger =
      customProgressLogger ||
      operationReporter.createChildLogger({ parentEventType, instanceId: jobName, label: workloadName });
    const cacheRef = shouldUseRemoteDockerCache() ? getCacheRef(jobName) : undefined;

    const sharedProps = {
      name: jobName,
      existingDigests,
      cwd: globalStateManager.workingDir,
      progressLogger,
      invocationId: globalStateManager.invocationId,
      dockerBuildOutputArchitecture,
      cacheFromRef: cacheRef,
      cacheToRef: cacheRef,
      archiveItem,
      buildDockerImage: this.#dockerRunners.buildDockerImage,
      checkDockerImageExists,
      createPackagingError: createCliPackagingError,
      getDockerImageDetails,
      installDependencies: dependencyInstaller.install,
      nativeDependencyInstallationRootPath: join(
        fsPaths.absoluteBuildFolderPath({ invocationId: globalStateManager.invocationId }),
        '_bin-install'
      ),
      runDocker: this.#dockerRunners.runDocker,
      sourceMapInstallPath: SOURCE_MAP_INSTALL_DIST_PATH
    };

    if (packagingType === 'custom-dockerfile') {
      const result = await buildUsingCustomDockerfile({ ...sharedProps, ...packaging.properties });
      this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
      return result;
    }
    if (packagingType === 'external-buildpack') {
      const result = await buildUsingExternalBuildpack({
        ...sharedProps,
        ...packaging.properties,
        runPack: this.#dockerRunners.runPack
      });
      this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
      return result;
    }
    if (packagingType === 'nixpacks') {
      const result = await buildUsingNixpacks({
        ...sharedProps,
        ...packaging.properties,
        runNixpacks: this.#dockerRunners.runNixpacks
      });
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
          const nodeVersionFromUser = languageSpecificConfig?.nodeVersion;
          const nodeVersion = resolveNodeVersion({
            nodeVersion: nodeVersionFromUser,
            runtime,
            target: packagingType === 'stacktape-image-buildpack' ? 'container' : 'lambda'
          });
          // Lambda@Edge doesn't support ESM with top-level await, so force CJS for edge functions
          const isEdgeFunction = workloadType === 'edge-lambda-function';
          const useEsm = !isEdgeFunction && (languageSpecificConfig?.outputModuleFormat === 'esm' || nodeVersion >= 24);
          // Traced functions get Stacktape's OTel runtime bundled in and their handler wrapped at
          // the bundle entry — module format stays whatever the function would use anyway. The
          // AWS-managed layer is not used for Node: its hooks cannot see bundled code at all and it
          // cannot wrap ESM handlers (verified live).
          const tracingRuntimeFilePath =
            packagingType === 'stacktape-lambda-buildpack' &&
            configManager.instrumentedLambdaFunctions.some(({ name: tracedName }) => tracedName === workloadName)
              ? LAMBDA_TRACING_RUNTIME_DIST_PATH
              : undefined;
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            minify: languageSpecificConfig?.minify ?? true,
            nodeTarget: String(nodeVersion),
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath),
            ...(tracingRuntimeFilePath && { tracingRuntimeFilePath }),
            ...(useEsm && { outputModuleFormat: 'esm' as const })
          };
          const additionalDigestInput = objectHash({
            buildpackImplementationVersion: STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION,
            props: getStableBuildpackDigestProps({ props: sharedStpBuildpackProps, configured: packaging.properties })
          });

          if (packagingType === 'stacktape-lambda-buildpack') {
            const result = await buildUsingStacktapeEsLambdaBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              sizeLimit: 250,
              debug: globalStateManager.isDebugMode,
              distFolderPath: fsPaths.absoluteLambdaArtifactFolderPath({
                jobName,
                invocationId: globalStateManager.invocationId
              }),
              additionalDigestInput
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
          const languageSpecificConfig = packaging.properties.languageSpecificConfig as
            | PyLanguageSpecificConfig
            | undefined;
          const runtimePythonVersion =
            packagingType === 'stacktape-lambda-buildpack' ? getPythonBuildVersionForRuntime(runtime) : undefined;
          const pythonVersion =
            packagingType === 'stacktape-lambda-buildpack'
              ? resolveManagedLambdaBuildVersion({
                  configuredVersion: languageSpecificConfig?.pythonVersion,
                  runtimeVersion: runtimePythonVersion,
                  runtime,
                  language: 'Python',
                  workloadName
                })
              : languageSpecificConfig?.pythonVersion;
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            languageSpecificConfig: {
              ...languageSpecificConfig,
              minify: languageSpecificConfig?.minify ?? true,
              ...(pythonVersion !== undefined ? { pythonVersion } : {})
            },
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath)
          };
          const additionalDigestInput = objectHash({
            buildpackImplementationVersion: STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION,
            props: getStableBuildpackDigestProps({ props: sharedStpBuildpackProps, configured: packaging.properties })
          });
          if (packagingType === 'stacktape-lambda-buildpack') {
            const result = await buildUsingStacktapePyLambdaBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              sizeLimit: 250,
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
          const languageSpecificConfig = packaging.properties.languageSpecificConfig as
            | JavaLanguageSpecificConfig
            | undefined;
          const runtimeJavaVersion =
            packagingType === 'stacktape-lambda-buildpack' ? getJavaBuildVersionForRuntime(runtime) : undefined;
          const javaVersion =
            packagingType === 'stacktape-lambda-buildpack'
              ? resolveManagedLambdaBuildVersion({
                  configuredVersion: languageSpecificConfig?.javaVersion,
                  runtimeVersion: runtimeJavaVersion,
                  runtime,
                  language: 'Java',
                  workloadName
                })
              : languageSpecificConfig?.javaVersion;
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            languageSpecificConfig: {
              ...languageSpecificConfig,
              ...(javaVersion !== undefined ? { javaVersion } : {})
            },
            minify: true,
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath)
          };
          const additionalDigestInput = objectHash({
            buildpackImplementationVersion: STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION,
            props: getStableBuildpackDigestProps({ props: sharedStpBuildpackProps, configured: packaging.properties })
          });
          if (packagingType === 'stacktape-lambda-buildpack') {
            const result = await buildUsingStacktapeJavaLambdaBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              sizeLimit: 250,
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
          if (
            packagingType === 'stacktape-lambda-buildpack' &&
            runtime !== undefined &&
            runtime !== 'provided.al2' &&
            runtime !== 'provided.al2023'
          ) {
            throw createCliPackagingError({
              type: 'PACKAGING',
              message: `Lambda runtime ${runtime} is not compatible with the Go Stacktape buildpack for ${workloadName}.`,
              hint: 'Use provided.al2023 for Go Lambda functions.'
            });
          }
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            minify: true,
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath)
          };
          const additionalDigestInput = objectHash({
            buildpackImplementationVersion: STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION,
            props: getStableBuildpackDigestProps({ props: sharedStpBuildpackProps, configured: packaging.properties })
          });
          if (packagingType === 'stacktape-lambda-buildpack') {
            const result = await buildUsingStacktapeGoLambdaBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              sizeLimit: 250,
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
          const languageSpecificConfig = packaging.properties.languageSpecificConfig as
            | RubyLanguageSpecificConfig
            | undefined;
          const runtimeRubyVersion =
            packagingType === 'stacktape-lambda-buildpack' ? getRubyBuildVersionForRuntime(runtime) : undefined;
          const rubyVersion =
            packagingType === 'stacktape-lambda-buildpack'
              ? resolveManagedLambdaBuildVersion({
                  configuredVersion: languageSpecificConfig?.rubyVersion,
                  runtimeVersion: runtimeRubyVersion,
                  runtime,
                  language: 'Ruby',
                  workloadName
                })
              : languageSpecificConfig?.rubyVersion;
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            languageSpecificConfig: {
              ...languageSpecificConfig,
              ...(rubyVersion !== undefined ? { rubyVersion } : {})
            },
            minify: true,
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath)
          };
          const additionalDigestInput = objectHash({
            buildpackImplementationVersion: STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION,
            props: getStableBuildpackDigestProps({ props: sharedStpBuildpackProps, configured: packaging.properties })
          });
          if (packagingType === 'stacktape-lambda-buildpack') {
            const result = await buildUsingStacktapeRbLambdaBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              sizeLimit: 250,
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
          if (packagingType === 'stacktape-lambda-buildpack') {
            throw createCliPackagingError({
              type: 'PACKAGING',
              message: `The Stacktape Lambda buildpack cannot create a PHP custom runtime for ${workloadName}.`,
              hint: 'Use stacktape-image-buildpack for a container workload, or custom-artifact with a PHP runtime and bootstrap executable.'
            });
          }
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            languageSpecificConfig: packaging.properties.languageSpecificConfig as PhpLanguageSpecificConfig,
            minify: true,
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath)
          };
          const additionalDigestInput = objectHash({
            buildpackImplementationVersion: STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION,
            props: getStableBuildpackDigestProps({ props: sharedStpBuildpackProps, configured: packaging.properties })
          });
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
          const languageSpecificConfig = packaging.properties.languageSpecificConfig as
            | DotnetLanguageSpecificConfig
            | undefined;
          const runtimeDotnetVersion =
            packagingType === 'stacktape-lambda-buildpack' ? getDotnetBuildVersionForRuntime(runtime) : undefined;
          const dotnetVersion =
            packagingType === 'stacktape-lambda-buildpack'
              ? resolveManagedLambdaBuildVersion({
                  configuredVersion: languageSpecificConfig?.dotnetVersion,
                  runtimeVersion: runtimeDotnetVersion,
                  runtime,
                  language: '.NET',
                  workloadName
                })
              : languageSpecificConfig?.dotnetVersion;
          const sharedStpBuildpackProps = {
            ...packaging.properties,
            languageSpecificConfig: {
              ...languageSpecificConfig,
              ...(dotnetVersion !== undefined ? { dotnetVersion } : {})
            },
            minify: true,
            entryfilePath: join(globalStateManager.workingDir, packaging.properties.entryfilePath)
          };
          const additionalDigestInput = objectHash({
            buildpackImplementationVersion: STACKTAPE_BUILDPACK_IMPLEMENTATION_VERSION,
            props: getStableBuildpackDigestProps({ props: sharedStpBuildpackProps, configured: packaging.properties })
          });
          if (packagingType === 'stacktape-lambda-buildpack') {
            const result = await buildUsingStacktapeDotnetLambdaBuildpack({
              ...sharedProps,
              ...sharedStpBuildpackProps,
              sizeLimit: 250,
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
