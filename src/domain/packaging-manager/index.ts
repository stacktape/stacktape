import { cpus } from 'node:os';
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
import { SharedLayerManager, analyzeDependencies } from '@shared/packaging/lambda-shared-layer';
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
import {
  ensureBuildxBuilderForCache,
  getDockerBuildxSupportedPlatforms,
  installDockerPlatforms,
  isDockerRunning
} from '@shared/utils/docker';
import { getFileExtension } from '@shared/utils/fs-utils';
import { processConcurrently } from '@shared/utils/misc';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import objectHash from 'object-hash';
import { resolveEnvironmentDirectives } from 'src/commands/dev/utils';

type SharedLayerInfo = {
  layerArn: string;
  layerVersionArn: string;
  externalizedDependencies: string[];
};

type FirstPassResult = {
  jobName: string;
  functionName: string;
  resolvedModules: string[];
  packaging: LambdaPackaging;
  architecture: 'x86_64' | 'arm64';
  runtime?: LambdaRuntime;
};

const getCacheRef = (jobName: string) => {
  const repositoryUrl = deploymentArtifactManager.repositoryUrl;
  if (!repositoryUrl) return undefined;
  // Use jobName without hash for stable cache tag
  const cacheTag = `${jobName}-cache`;
  return `${repositoryUrl}:${cacheTag}`;
};

const doesTargetStackExist = () => {
  // We only want to use remote registry cache when deploying to an existing stack.
  // On first deploy (stack create), the deployment ECR repo doesn't exist yet, and BuildKit cache export fails with 404.
  return Boolean(stackManager.existingStackDetails && stackManager.existingStackResources.length);
};

const shouldUseRemoteDockerCache = () => {
  return (
    globalStateManager.command !== 'dev' && !globalStateManager.args.disableDockerRemoteCache && doesTargetStackExist()
  );
};

export class PackagingManager {
  #packagedJobs: PackageWorkloadOutput[] = [];
  #sharedLayerInfo: SharedLayerInfo | null = null;

  init = async () => {};

  clearPackagedJobs() {
    this.#packagedJobs = [];
    this.#sharedLayerInfo = null;
  }

  getPackagingOutputForJob(jobName: string) {
    return this.#packagedJobs.find((job) => job.jobName === jobName) || null;
  }

  getSharedLayerInfo(): SharedLayerInfo | null {
    return this.#sharedLayerInfo;
  }

  #shouldUseSharedLayers(): boolean {
    // Only use shared layers for Node.js Lambda functions
    // Require at least 2 functions to make shared layers worthwhile
    const nodeLambdas = configManager.allUserCodeLambdas.filter(({ packaging }) => {
      const ext = getFileExtension((packaging?.properties as { entryfilePath?: string })?.entryfilePath || '');
      return ['js', 'ts', 'jsx', 'mjs', 'tsx'].includes(ext);
    });
    return nodeLambdas.length >= 2;
  }

  /**
   * Build and publish shared layer using actual dependency data from first-pass bundling.
   * @param firstPassResults - Results from first-pass bundling containing resolved modules per function
   */
  #buildAndPublishSharedLayer = async (firstPassResults: FirstPassResult[]): Promise<void> => {
    if (firstPassResults.length < 2) {
      // Need at least 2 functions for shared layers to be worthwhile
      return;
    }

    const { stackName, region, accountId } = globalStateManager.targetStack;

    // Get node version from first lambda (they should all be compatible)
    const firstLambda = configManager.allUserCodeLambdas.find(({ name }) =>
      firstPassResults.some((r) => r.functionName === name)
    );
    const languageSpecificConfig = (
      firstLambda?.packaging?.properties as { languageSpecificConfig?: EsLanguageSpecificConfig }
    )?.languageSpecificConfig;
    const nodeVersionFromRuntime = Number(firstLambda?.runtime?.match(/nodejs(\d+)/)?.[1]) || null;
    const nodeVersion =
      languageSpecificConfig?.nodeVersion || nodeVersionFromRuntime || DEFAULT_LAMBDA_NODE_VERSION;

    // Check if all lambdas have the same architecture - if so, we can include native deps
    const architectures = firstPassResults.map(({ architecture }) => architecture || 'x86_64');
    const uniqueArchitectures = [...new Set(architectures)];
    const allSameArchitecture = uniqueArchitectures.length === 1;
    const architecture = allSameArchitecture
      ? (uniqueArchitectures[0] === 'arm64' ? 'linux/arm64' : 'linux/amd64')
      : undefined;

    const sharedLayerManager = new SharedLayerManager({
      stackName,
      region,
      accountId,
      cwd: globalStateManager.workingDir,
      distFolderPath: fsPaths.absoluteSharedLayerFolderPath({ invocationId: globalStateManager.invocationId }),
      nodeVersion,
      packageManager: 'npm', // Could be detected from lockfile
      ...(architecture && { architecture }),
      publishLayer: awsSdkManager.publishLambdaLayer,
      deleteLayerVersion: awsSdkManager.deleteLambdaLayerVersion,
      listLayerVersions: awsSdkManager.listLambdaLayerVersions,
      checkLayerExists: awsSdkManager.checkLambdaLayerExists
    });

    await eventManager.startEvent({
      eventType: 'BUILD_SHARED_LAYER',
      description: 'Analyzing dependencies for shared layer'
    });

    try {
      // Convert first-pass results to the format expected by analyzeDependencies
      // Filter out node built-ins and non-npm modules, get unique module names per function
      const functions = firstPassResults.map(({ functionName, resolvedModules }) => {
        // Filter to only npm packages (not built-ins, not relative imports)
        const npmModules = [...new Set(resolvedModules)].filter((mod) => {
          // Exclude node built-ins
          if (mod.startsWith('node:') || ['fs', 'path', 'os', 'util', 'crypto', 'http', 'https', 'stream', 'events', 'buffer', 'url', 'querystring', 'zlib', 'child_process', 'cluster', 'dgram', 'dns', 'net', 'readline', 'repl', 'tls', 'tty', 'v8', 'vm', 'worker_threads', 'perf_hooks', 'async_hooks', 'trace_events', 'inspector', 'assert', 'constants', 'domain', 'module', 'process', 'punycode', 'string_decoder', 'sys', 'timers', 'wasi'].includes(mod)) {
            return false;
          }
          return true;
        });

        return {
          name: functionName,
          dependencies: npmModules.map((name) => ({ name, version: '*' })) // Version will be resolved from node_modules
        };
      });

      await sharedLayerManager.analyze(functions);

      if (!sharedLayerManager.hasSharedDependencies()) {
        await eventManager.finishEvent({
          eventType: 'BUILD_SHARED_LAYER',
          finalMessage: 'No shared dependencies found, skipping layer creation.'
        });
        return;
      }

      const { totalSavings, layerSize, depsCount } = sharedLayerManager.getSavingsSummary();
      const savingsMB = Math.round(totalSavings / (1024 * 1024));
      const layerSizeMB = Math.round(layerSize / (1024 * 1024));

      await eventManager.updateEvent({
        eventType: 'BUILD_SHARED_LAYER',
        description: `Building shared layer (${depsCount} deps, ~${layerSizeMB}MB, saves ~${savingsMB}MB)`
      });

      await sharedLayerManager.build();

      await eventManager.updateEvent({
        eventType: 'BUILD_SHARED_LAYER',
        description: 'Publishing shared layer'
      });

      const layerInfo = await sharedLayerManager.publish();

      this.#sharedLayerInfo = {
        layerArn: layerInfo.layerArn,
        layerVersionArn: layerInfo.layerVersionArn,
        externalizedDependencies: sharedLayerManager.getLayerDependencyNames()
      };

      await eventManager.finishEvent({
        eventType: 'BUILD_SHARED_LAYER',
        finalMessage: `Shared layer published (${depsCount} deps, ~${layerSizeMB}MB, saves ~${savingsMB}MB)`
      });
    } catch (error) {
      await eventManager.finishEvent({
        eventType: 'BUILD_SHARED_LAYER',
        finalMessage: `Shared layer skipped: ${(error as Error).message}`
      });
    }
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
    // if docker is running, get supported platforms and install missing ones
    // the check is fast so it is OK to do it on every packaging run
    // install only happens once on the given machine
    if (await isDockerRunning()) {
      await this.#installMissingDockerBuildPlatforms();
      // Ensure buildx builder for remote cache is available (required for cache export)
      if (shouldUseRemoteDockerCache()) {
        await ensureBuildxBuilderForCache();
      }
    }

    // Identify Node.js Lambda functions that can use shared layers
    const nodeLambdas = configManager.allUserCodeLambdas.filter(({ packaging }) => {
      const ext = getFileExtension((packaging?.properties as { entryfilePath?: string })?.entryfilePath || '');
      return ['js', 'ts', 'jsx', 'mjs', 'tsx'].includes(ext);
    });

    // Determine concurrency limits
    const logicalCores = cpus().length;
    const physicalCores = Math.max(1, Math.floor(logicalCores / 2));

    // TWO-PASS BUNDLING FOR SHARED LAYERS
    // If we have 2+ Node.js lambdas, we do two-pass bundling:
    // 1. First pass: Bundle all lambdas to discover dependencies
    // 2. Analyze shared dependencies and build layer
    // 3. Second pass: Re-bundle with shared deps as externals

    let sharedLayerExternals: string[] = [];

    if (this.#shouldUseSharedLayers()) {
      // FIRST PASS: Bundle Node.js lambdas to discover dependencies
      const firstPassJobs = nodeLambdas.map(({ name, type, packaging, architecture, runtime }) => {
        return async (): Promise<FirstPassResult | null> => {
          const jobName = getJobName({ workloadName: name, workloadType: type });
          const result = await this.packageWorkload({
            commandCanUseCache,
            jobName,
            workloadName: name,
            packaging,
            runtime,
            dockerBuildOutputArchitecture: architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64',
            sharedLayerExternals: [], // No externals in first pass
            isFirstPass: true
          });

          if (result?.resolvedModules?.length) {
            return {
              jobName,
              functionName: name,
              resolvedModules: result.resolvedModules,
              packaging,
              architecture: architecture || 'x86_64',
              runtime
            };
          }
          return null;
        };
      });

      const maxConcurrent = Math.min(firstPassJobs.length, physicalCores);
      const firstPassResults: (FirstPassResult | null)[] = [];

      // Run first pass bundling concurrently
      await processConcurrently(
        firstPassJobs.map((job) => async () => {
          const result = await job();
          firstPassResults.push(result);
        }),
        maxConcurrent
      );

      const validFirstPassResults = firstPassResults.filter((r): r is FirstPassResult => r !== null);

      // Build and publish shared layer based on first-pass results
      await this.#buildAndPublishSharedLayer(validFirstPassResults);
      sharedLayerExternals = this.#sharedLayerInfo?.externalizedDependencies || [];

      // SECOND PASS: If we have shared dependencies, re-bundle with externals
      if (sharedLayerExternals.length > 0) {
        // Remove first-pass results from packaged jobs (they'll be replaced)
        const firstPassJobNames = new Set(validFirstPassResults.map((r) => r.jobName));
        this.#packagedJobs = this.#packagedJobs.filter((job) => !firstPassJobNames.has(job.jobName));

        // Re-bundle with externals
        const secondPassJobs = validFirstPassResults.map(({ functionName, jobName, packaging, architecture, runtime }) => {
          return () =>
            this.packageWorkload({
              commandCanUseCache,
              jobName,
              workloadName: functionName,
              packaging,
              runtime,
              dockerBuildOutputArchitecture: architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64',
              sharedLayerExternals
            });
        });

        await processConcurrently(secondPassJobs, maxConcurrent);
      }

      // Package remaining Node.js lambdas that weren't in first pass (unlikely but handle edge case)
      const processedNames = new Set(validFirstPassResults.map((r) => r.functionName));
      const remainingNodeLambdas = nodeLambdas.filter(({ name }) => !processedNames.has(name));

      if (remainingNodeLambdas.length > 0) {
        const remainingJobs = remainingNodeLambdas.map(({ name, type, packaging, architecture, runtime }) => {
          return () =>
            this.packageWorkload({
              commandCanUseCache,
              jobName: getJobName({ workloadName: name, workloadType: type }),
              workloadName: name,
              packaging,
              runtime,
              dockerBuildOutputArchitecture: architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64',
              sharedLayerExternals
            });
        });
        await processConcurrently(remainingJobs, Math.min(remainingJobs.length, physicalCores));
      }
    } else {
      // No shared layers - package Node.js lambdas normally
      const nodeLambdaJobs = nodeLambdas.map(({ name, type, packaging, architecture, runtime }) => {
        return () =>
          this.packageWorkload({
            commandCanUseCache,
            jobName: getJobName({ workloadName: name, workloadType: type }),
            workloadName: name,
            packaging,
            runtime,
            dockerBuildOutputArchitecture: architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64',
            sharedLayerExternals: []
          });
      });
      await processConcurrently(nodeLambdaJobs, Math.min(nodeLambdaJobs.length, physicalCores));
    }

    // Package non-Node.js lambdas
    const nonNodeLambdas = configManager.allUserCodeLambdas.filter(({ packaging }) => {
      const ext = getFileExtension((packaging?.properties as { entryfilePath?: string })?.entryfilePath || '');
      return !['js', 'ts', 'jsx', 'mjs', 'tsx'].includes(ext);
    });

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

    if (otherPackagingJobs.length > 0) {
      const maxConcurrent = Math.min(otherPackagingJobs.length, physicalCores);
      await processConcurrently(otherPackagingJobs, maxConcurrent);
    }

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
        this.getPackagingOutputForJob(name).skipped &&
        !ignoreWorkloads.includes(name)
    );
    const containerWorkloadsToRepackage = configManager.allContainersRequiringPackaging.filter(
      ({ workloadName, jobName }) =>
        deployedStackOverviewManager.isWorkloadCurrentlyUsingHotSwapDeploy(workloadName) &&
        this.getPackagingOutputForJob(jobName).skipped &&
        !ignoreWorkloads.includes(workloadName)
    );
    // for repackaging, we do not need to use packageNextjsWeb method
    // because the nextjs project and all its assets were already build before
    // we just need to handle the lambda packages
    const nextjsLambdasToRepackage = configManager.nextjsWebs
      .map(({ _nestedResources }) => {
        return Object.values(_nestedResources)
          .filter(Boolean)
          .filter(
            ({ name }) =>
              deployedStackOverviewManager.isWorkloadCurrentlyUsingHotSwapDeploy(name) &&
              this.getPackagingOutputForJob(name).skipped &&
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
      }),
      ...nextjsLambdasToRepackage
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
      // we cannot use cache during full (Cloudformation) deploy for compute resources which are currently deployed using fast-deploy
      // this could lead to scenarios where cloudformation does not realize that the compute resource needs to be updated (because template has not changed)
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
    customProgressLogger,
    sharedLayerExternals = [],
    isFirstPass = false
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
    sharedLayerExternals?: string[];
    /** When true, this is the first pass of two-pass bundling for shared layer analysis */
    isFirstPass?: boolean;
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
      // Remote cache refs for Docker buildx
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
            // Node.js 24+ on lambda only works with ESM. It has interoperability with CJS, so we always use ESM
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
              additionalDigestInput,
              sharedLayerExternals
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
