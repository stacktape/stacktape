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
import { getJobName } from '@shared/naming/utils';
import { buildUsingCustomArtifact } from '@shared/packaging/custom-artifact';
import { buildUsingCustomDockerfile } from '@shared/packaging/custom-dockerfile';
import { buildUsingExternalBuildpack } from '@shared/packaging/external-buildpack';
import { createNextjsWebArtifacts } from '@shared/packaging/nextjs-web';
import { buildUsingNixpacks } from '@shared/packaging/nixpacks';
import { buildUsingStacktapeEsImageBuildpack } from '@shared/packaging/stacktape-es-image-buildpack';
import { buildUsingStacktapeEsLambdaBuildpack } from '@shared/packaging/stacktape-es-lambda-buildpack';
import { buildUsingStacktapeGoImageBuildpack } from '@shared/packaging/stacktape-go-image-buildpack';
import { buildUsingStacktapeGoLambdaBuildpack } from '@shared/packaging/stacktape-go-lambda-buildpack';
import { buildUsingStacktapeJavaImageBuildpack } from '@shared/packaging/stacktape-java-image-buildpack';
import { buildUsingStacktapeJavaLambdaBuildpack } from '@shared/packaging/stacktape-java-lambda-buildpack';
import { buildUsingStacktapePyImageBuildpack } from '@shared/packaging/stacktape-py-image-buildpack';
import { buildUsingStacktapePyLambdaBuildpack } from '@shared/packaging/stacktape-py-lambda-buildpack';
import { buildSplitBundle, type LambdaEntrypoint } from '@shared/packaging/bundlers/es/split-bundler';
import {
  ensureBuildxBuilderForCache,
  getDockerBuildxSupportedPlatforms,
  installDockerPlatforms,
  isDockerRunning
} from '@shared/utils/docker';
import { getFileExtension, getFileSize, getFolderSize } from '@shared/utils/fs-utils';
import { getHashFromMultipleFiles } from '@shared/utils/fs-utils';
import { archiveItem } from '@shared/utils/zip';
import { localBuildTsConfigPath } from '@shared/utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import objectHash from 'object-hash';
import { rename } from 'fs-extra';
import { resolveEnvironmentDirectives } from 'src/commands/dev/utils';

/** Minimum number of Node.js lambdas to use split bundling (otherwise bundle individually) */
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

  init = async () => {};

  clearPackagedJobs() {
    this.#packagedJobs = [];
  }

  getPackagingOutputForJob(jobName: string) {
    return this.#packagedJobs.find((job) => job.jobName === jobName) || null;
  }

  /**
   * Legacy method - no longer used with split bundling.
   * Kept for compatibility but always returns false.
   */
  shouldLambdaUseSharedLayer(_lambdaName: string): boolean {
    return false;
  }

  /**
   * Legacy method - no longer used with split bundling.
   * Kept for compatibility but always returns null.
   */
  getSharedLayerInfo(): null {
    return null;
  }

  /**
   * Legacy method - no longer used with split bundling.
   * Kept for compatibility but always returns null.
   */
  getPendingSharedLayer(): null {
    return null;
  }

  /**
   * Legacy method - no longer used with split bundling.
   * Kept for compatibility but always returns empty array.
   */
  getLayerArnsForFunction(_functionName: string): string[] {
    return [];
  }

  /**
   * Legacy method - no longer needed with split bundling (no Lambda Layers).
   */
  publishSharedLayer = async (): Promise<void> => {};

  /**
   * Check if we should use split bundling for Node.js lambdas.
   * Split bundling is more efficient when there are multiple lambdas that share code.
   */
  #shouldUseSplitBundling(): boolean {
    const nodeLambdas = configManager.allUserCodeLambdas.filter(({ packaging }) => {
      const ext = getFileExtension((packaging?.properties as { entryfilePath?: string })?.entryfilePath || '');
      return ['js', 'ts', 'jsx', 'mjs', 'tsx'].includes(ext);
    });
    return nodeLambdas.length >= MINIMUM_LAMBDAS_FOR_SPLIT_BUNDLING;
  }

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

    // Run split bundle
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

    // Finish the shared layer build
    await sharedLayerLogger.finishEvent({
      eventType: 'BUILD_CODE',
      finalMessage: `${splitResult.sharedChunkCount} shared chunks created`
    });

    // Finish the "identifying shared resources" phase for all lambdas
    for (const [name] of lambdaLoggers) {
      const logger = lambdaLoggers.get(name)!;
      const lambdaOutput = splitResult.lambdaOutputs.get(name);
      // files includes entry + chunks, so chunk count = files.length - 1
      const chunkCount = lambdaOutput ? lambdaOutput.files.length - 1 : 0;
      await logger.finishEvent({
        eventType: 'BUILD_CODE',
        finalMessage: `Bundled (uses ${chunkCount} shared chunks)`
      });
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

      // Calculate digest for caching
      const shouldUseCache = this.#shouldWorkloadUseCache({ workloadName: name, commandCanUseCache });
      const existingDigests = shouldUseCache ? deploymentArtifactManager.getExistingDigestsForJob(jobName) : [];

      // Create digest from source files
      const sourceFilePaths = lambdaOutput.sourceFiles.map((f) => f.path);
      const hashObj = await getHashFromMultipleFiles(sourceFilePaths.filter((p) => p && p.length > 0));
      const digest = hashObj.digest('hex');

      // Check if we can skip (artifact already exists with same digest)
      if (existingDigests.includes(digest)) {
        this.#packagedJobs.push({
          jobName,
          digest,
          skipped: true,
          size: null,
          resolvedModules: lambdaOutput.resolvedModules
        });
        return;
      }

      await lambdaLogger.startEvent({
        eventType: 'ZIP_PACKAGE',
        description: 'Zipping package'
      });

      // Get sizes
      const unzippedSize = await getFolderSize(distFolderPath, 'MB', 2);

      // Check size limits
      const sizeLimit = 250; // MB
      const zippedSizeLimit = 50; // MB

      if (unzippedSize > sizeLimit) {
        throw new Error(`Function ${name} has size ${unzippedSize}MB. Should be less than ${sizeLimit}MB.`);
      }

      // Zip the lambda folder
      await archiveItem({
        absoluteSourcePath: distFolderPath,
        format: 'zip',
        useNativeZip: true
      });

      const originalZipPath = `${distFolderPath}.zip`;
      const zippedSize = await getFileSize(originalZipPath, 'MB', 2);

      if (zippedSize > zippedSizeLimit) {
        throw new Error(`Function ${name} zipped size ${zippedSize}MB exceeds limit of ${zippedSizeLimit}MB.`);
      }

      // Rename with digest
      const adjustedZipPath = `${distFolderPath}-${digest}.zip`;
      await rename(originalZipPath, adjustedZipPath);

      // files includes entry + chunks, so chunk count = files.length - 1
      const chunkCount = lambdaOutput.files.length - 1;
      await lambdaLogger.finishEvent({
        eventType: 'ZIP_PACKAGE',
        finalMessage: `${zippedSize}MB (${chunkCount} shared chunks)`
      });

      this.#packagedJobs.push({
        jobName,
        digest,
        skipped: false,
        size: unzippedSize,
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

    // Identify Node.js Lambda functions
    const nodeLambdas = configManager.allUserCodeLambdas.filter(({ packaging }) => {
      const ext = getFileExtension((packaging?.properties as { entryfilePath?: string })?.entryfilePath || '');
      return ['js', 'ts', 'jsx', 'mjs', 'tsx'].includes(ext);
    });

    // Non-Node.js lambdas
    const nonNodeLambdas = configManager.allUserCodeLambdas.filter(({ packaging }) => {
      const ext = getFileExtension((packaging?.properties as { entryfilePath?: string })?.entryfilePath || '');
      return !['js', 'ts', 'jsx', 'mjs', 'tsx'].includes(ext);
    });

    // Prepare other packaging jobs (containers, non-Node lambdas, nextjs)
    const otherPackagingJobs = [
      ...nonNodeLambdas.map(({ name, type, packaging, architecture, runtime }) => {
        return () =>
          this.packageWorkload({
            commandCanUseCache,
            jobName: getJobName({ workloadName: name, workloadType: type }),
            workloadName: name,
            packaging,
            runtime,
            dockerBuildOutputArchitecture: architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64'
          });
      }),
      ...configManager.allContainersRequiringPackaging.map(({ jobName, packaging, workloadName, resources }) => {
        return () =>
          this.packageWorkload({
            commandCanUseCache,
            jobName,
            packaging,
            workloadName,
            dockerBuildOutputArchitecture: this.getTargetCpuArchitectureForContainer(resources)
          });
      }),
      ...configManager.nextjsWebs.map((resource) => {
        return () =>
          this.packageNextjsWeb({
            nextjsWebResource: resource,
            commandCanUseCache
          });
      })
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
      ...[...lambdasToRepackage, ...nextjsLambdasToRepackage].map(({ name, packaging, architecture }) => {
        const originalJobIndex = this.#packagedJobs.findIndex(({ jobName }) => jobName === name);
        this.#packagedJobs.splice(originalJobIndex, 1);
        return this.packageWorkload({
          commandCanUseCache: false,
          jobName: name,
          workloadName: name,
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
    let environment;
    try {
      environment = await resolveEnvironmentDirectives(nextjsWebResource.environment);
    } catch {}
    const packagingOutputs = await createNextjsWebArtifacts({
      environmentVars: environment as any,
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

  packageWorkload = async ({
    commandCanUseCache,
    workloadName,
    jobName,
    packaging,
    runtime,
    dockerBuildOutputArchitecture = 'linux/amd64',
    parentEventType = 'PACKAGE_ARTIFACTS',
    devMode,
    customProgressLogger
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
          const useEsm = languageSpecificConfig?.outputModuleFormat === 'esm' || nodeVersion >= 24;
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
