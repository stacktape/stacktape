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
import {
  ensureBuildxBuilderForCache,
  getDockerBuildxSupportedPlatforms,
  installDockerPlatforms,
  isDockerRunning
} from '@shared/utils/docker';
import { getFileExtension } from '@shared/utils/fs-utils';
import { processConcurrently } from '@shared/utils/misc';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import objectHash from 'object-hash';
import { resolveEnvironmentDirectives } from 'src/commands/dev/utils';

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

  init = async () => {};

  clearPackagedJobs() {
    this.#packagedJobs = [];
  }

  getPackagingOutputForJob(jobName: string) {
    return this.#packagedJobs.find((job) => job.jobName === jobName) || null;
  }

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

    const packagingJobs = [
      ...configManager.allUserCodeLambdas.map(({ name, type, packaging, architecture, runtime }) => {
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
    // Use limited concurrency to prevent event loop starvation and allow UI updates
    const maxConcurrentPackaging = Math.min(packagingJobs.length, 6);
    await processConcurrently(packagingJobs, maxConcurrentPackaging);
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
    parentEventType = 'PACKAGE_ARTIFACTS'
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
  }) => {
    const shouldUseCache = this.#shouldWorkloadUseCache({ workloadName, commandCanUseCache });

    const existingDigests = shouldUseCache ? deploymentArtifactManager.getExistingDigestsForJob(jobName) : [];
    const packagingType = packaging.type;
    const progressLogger = eventManager.createChildLogger({ parentEventType, instanceId: jobName });

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
              additionalDigestInput
            });
            this.#packagedJobs.push({ ...result, skipped: result.outcome === 'skipped' });
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
              additionalDigestInput
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
