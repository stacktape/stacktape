import { codeSwapIntegration } from '@domain-services/code-swap/integration';
import { CLOUD_MAP_DRAIN_IMAGES, cloudMapDrainImageTag } from './cloud-map-drain-image';
import { needsCloudMapDrain } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/multi-container-workloads/cloud-map-drain';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { StackActionType } from '@domain-services/cloudformation-stack-manager/types';
import type { DeploymentBucketObjectType } from '@domain-services/deployment-artifact-manager/types';
import type { LoggableEventType } from '@application-services/operation-manager';
import type { HelperLambdaPackaging } from '@domain-services/packaging-manager/types';
import type { ImageIdentifier } from '@aws-sdk/client-ecr';
import type { _Object, ObjectIdentifier } from '@aws-sdk/client-s3';
import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import {
  CF_TEMPLATE_FILE_NAME_WITHOUT_EXT,
  DEFAULT_KEEP_PREVIOUS_DEPLOYMENT_ARTIFACTS_COUNT,
  DEFAULT_MAXIMUM_PARALLEL_ARTIFACT_UPLOADS,
  DEFAULT_MAXIMUM_PARALLEL_BUCKET_SYNCS,
  STP_TEMPLATE_FILE_NAME_WITHOUT_EXT
} from '@config';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import type { PackagingManager } from '@domain-services/packaging-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { fsPaths } from 'src/config/runtime-paths';
import {
  buildLambdaS3Key,
  getBaseS3EndpointForRegion,
  getCfTemplateS3Key,
  getCloudformationTemplateUrl,
  getEcrCacheImageTag,
  getEcrImageTag,
  getEcrImageUrl,
  getEcrRepositoryUrl,
  getStpTemplateS3Key
} from '@domain-services/deployment-artifact-manager/artifact-names';
import { dockerLogin, pushDockerImage, tagDockerImage } from '@utils/docker';
import { getLocalS3Endpoint } from '@utils/local-aws-endpoint';
import { processConcurrently } from '@utils/misc';
import { outputNames } from '@stacktape/naming/stack-output-names';
import { parseYaml, stringifyToYaml } from '@utils/yaml';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/compose';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { ExpectedError } from '@utils/errors';
import { getNumericVersion } from '@utils/versioning';
import { tagNames } from '@stacktape/naming/tag-names';
import { readFile } from 'node:fs/promises';
import { getDeploymentBucketObjectType, parseBucketObjectS3Key, parseImageTag } from './utils';
import {
  keepImagesOfRunningServices,
  keepLayersOfRetainedReleases,
  selectObsoleteArtifacts,
  type StoredArtifact
} from './retention';
import {
  buildRepublishedLayerS3Key,
  getDeployedSharedLayers,
  getDeployedArtifactDigest,
  getSharedLayersOfFunctionInTemplate,
  getTagValue,
  needsLayerRepublish,
  sharedLayerIdentity,
  sharedLayerNumberOf
} from './shared-layers';
import { templateManager } from '@domain-services/template-manager';
import { getSourceMapManifest, selectObsoleteSourceMapKeys, sourceMapKeyForArtifact } from './source-maps';
import { SOURCE_MAP_KEY_PREFIX } from '@stacktape/console-api/source-maps';
import type { DirectoryUpload } from '@stacktape/config/buckets';
import type { LambdaPackaging } from '@stacktape/config/deployment-artifacts';

type ArtifactPackagingSource = Pick<
  PackagingManager,
  | 'getPackagingOutputForJob'
  | 'getPendingSharedLayer'
  | 'getLayerArtifacts'
  | 'getLayerArtifact'
  | 'getLayerNumbersForLambda'
  | 'publishSharedLayer'
>;

type LambdaS3UploadInfo = {
  artifactName: string;
  artifactPath: string;
  digest: string;
  s3Key: string;
  alreadyUploaded: boolean;
  /** Set when the stored object is copied under a new key instead of uploading a build. */
  copyFromS3Key?: string;
};

const LEGACY_HOTSWAP_VERSION = 'v000000';
/** Stored with each successful fast release, which CloudFormation's deployment version output does not record. */
const FAST_RELEASE_MARKER_NAME = 'fast-release';

const ECR_LOGIN_REUSE_MS = 60 * 60 * 1000;

class DeploymentArtifactManager {
  #packagingSource: ArtifactPackagingSource | undefined;

  setPackagingSource = (packagingSource: ArtifactPackagingSource) => {
    this.#packagingSource = packagingSource;
  };

  private get packagingSource() {
    if (!this.#packagingSource)
      throw new Error('Deployment artifact manager was used before its packaging source was configured.');
    return this.#packagingSource;
  }

  successfullyUploadedImages: { tag: string; name: string }[] = [];
  successfullyCreatedObjects: { s3Key: string; name: string }[] = [];
  maximumParallelArtifactUploads: number;
  previousObjects: {
    name: string;
    version: string;
    digest: string;
    s3Key: string;
    type: DeploymentBucketObjectType;
  }[] = [];

  previousImages: { name: string; version: string; digest: string; tag: string; dockerDigest: string }[] = [];
  deploymentBucketName: string;
  repositoryName: string;
  repositoryUrl: string;
  previouslyUploadedS3KeysUsedInDeployment: string[] = [];
  previouslyUploadedImageTagsUsedInDeployment: string[] = [];
  uploadedLayerS3Keys: Map<number, string> = new Map(); // layerNumber -> s3Key
  /** Source-map bundles in the deployment bucket, including those this run uploaded (`sourceMapKeyForArtifact`). */
  #storedSourceMapKeys = new Set<string>();

  getLambdasToUpload() {
    return [...configManager.allLambdasToUpload, ...configManager.uptimeProberUploadArtifacts]
      .map((lambda) => {
        const s3UploadInfo = this.getLambdaS3UploadInfo({
          artifactName: lambda.artifactName,
          packaging: lambda.packaging
        });
        /*
         * A reused artifact uploads nothing, but the template points at its stored object, so retention must keep it.
         * A user function reused this way has no `artifactPath`, so this is checked first: a function reverted to an
         * earlier build reuses an object older than the kept versions under its name.
         */
        if (s3UploadInfo.alreadyUploaded) {
          if (s3UploadInfo.s3Key) this.previouslyUploadedS3KeysUsedInDeployment.push(s3UploadInfo.s3Key);
          return null;
        }
        // Skip if no artifact path (lambda wasn't packaged, e.g., in dev mode for some resources)
        if (!s3UploadInfo.artifactPath && !s3UploadInfo.copyFromS3Key) {
          return null;
        }
        return s3UploadInfo;
      })
      .filter(Boolean);
  }

  getImagesToUpload() {
    return [...configManager.allContainersRequiringPackaging, ...configManager.agentCoreRuntimesRequiringPackaging]
      .map((container) => {
        const imageUploadInfo = this.getImageUploadInfoForJob({ jobName: container.jobName });
        // In dev mode, containers are not packaged so imageUploadInfo will be null
        if (!imageUploadInfo) {
          return null;
        }
        if (imageUploadInfo.alreadyDeployed) {
          this.previouslyUploadedImageTagsUsedInDeployment.push(imageUploadInfo.tag);
          return null;
        }
        return imageUploadInfo;
      })
      .filter(Boolean);
  }

  init = async ({
    globallyUniqueStackHash,
    accountId,
    packagingSource,
    stackActionType,
    parentEventType
  }: {
    globallyUniqueStackHash: string;
    accountId: string;
    packagingSource: ArtifactPackagingSource;
    stackActionType?: StackActionType;
    /** Optional parent event for grouping (e.g., LOAD_METADATA_FROM_AWS) */
    parentEventType?: LoggableEventType;
  }) => {
    this.setPackagingSource(packagingSource);
    this.deploymentBucketName = awsResourceNames.deploymentBucket(globallyUniqueStackHash);
    this.repositoryName = awsResourceNames.deploymentEcrRepo(globallyUniqueStackHash);
    this.repositoryUrl = getEcrRepositoryUrl(accountId, globalStateManager.region, this.repositoryName);
    // Skip artifact lookup for create (nothing to look up) and dev (running locally)
    if (stackActionType && stackActionType !== 'create' && stackActionType !== 'dev') {
      await operationReporter.startEvent({
        eventType: 'FETCH_PREVIOUS_ARTIFACTS',
        description: 'Fetching previous deployment artifacts',
        parentEventType,
        instanceId: parentEventType ? 'previous-artifacts' : undefined
      });
      await Promise.all([
        this.loadPreviousBucketObjects(this.deploymentBucketName, stackActionType),
        this.loadPreviousImages(this.repositoryName, stackActionType)
      ]);
      stackManager.setLatestRecordedRelease(this.latestRecordedRelease);
      await operationReporter.finishEvent({
        eventType: 'FETCH_PREVIOUS_ARTIFACTS',
        parentEventType,
        instanceId: parentEventType ? 'previous-artifacts' : undefined
      });
    }
  };

  get baseS3Endpoint() {
    return getBaseS3EndpointForRegion(globalStateManager.region);
  }

  get cloudformationTemplateUrl() {
    return this.getCloudformationTemplateUrlForVersion(stackManager.nextVersion);
  }

  /**
   * Where CloudFormation fetches a version's template: the bucket's AWS URL, or the path-style URL of a local
   * emulator when one is configured. Deploy, diff and rollback must agree, or a rollback against an emulator would
   * hand CloudFormation a real AWS address.
   */
  getCloudformationTemplateUrlForVersion = (version: string) => {
    const localEndpoint = getLocalS3Endpoint();
    if (localEndpoint) {
      return `${localEndpoint}/${this.deploymentBucketName}/${getCfTemplateS3Key(version)}`;
    }
    return getCloudformationTemplateUrl(this.deploymentBucketName, globalStateManager.region, version);
  };

  get maxArtifactVersionsToKeep() {
    const keepArtifactsCountFromConfig = configManager.deploymentConfig.previousVersionsToKeep;
    return (
      1 +
      (keepArtifactsCountFromConfig !== undefined
        ? keepArtifactsCountFromConfig
        : DEFAULT_KEEP_PREVIOUS_DEPLOYMENT_ARTIFACTS_COUNT)
    );
  }

  get availablePreviousVersions() {
    return this.previousObjects
      .filter((obj) => obj.name === CF_TEMPLATE_FILE_NAME_WITHOUT_EXT)
      .map((obj) => obj.version);
  }

  /**
   * The newest fast release. A full deployment or rollback records its release in the stack's deployment version
   * output instead; a template stored by a failed attempt is never a release.
   */
  get latestRecordedRelease(): string | null {
    return (
      this.previousObjects
        .filter(({ name }) => name === FAST_RELEASE_MARKER_NAME)
        .map(({ version }) => version)
        .toSorted((a, b) => getNumericVersion(b) - getNumericVersion(a))
        .at(0) ?? null
    );
  }

  getImageUrlForJob = ({ tag }: { tag: string }) => {
    return getEcrImageUrl(this.repositoryUrl, tag);
  };

  getLambdaS3UploadInfo = ({
    artifactName,
    packaging
  }: {
    artifactName: string;
    packaging: HelperLambdaPackaging | LambdaPackaging;
  }): LambdaS3UploadInfo => {
    if (packaging.type === 'helper-lambda') {
      return this.#getHelperLambdaS3UploadInfo({ artifactName, packaging });
    }
    return this.#getUserLambdaS3UploadInfo({ name: artifactName });
  };

  getImageUploadInfoForJob = ({ jobName }: { jobName: string }) => {
    const packagingOutput = this.packagingSource.getPackagingOutputForJob(jobName);
    if (!packagingOutput) {
      return null;
    }
    const { skipped, digest } = packagingOutput;
    /*
     * A skipped workload reuses the image its digest already has in ECR — but that image can be gone: a
     * registry lifecycle policy, an untagged entry, a repository someone cleaned out. Reading `.tag`
     * straight off the lookup turned that into an unexplained TypeError partway through a deploy. The
     * Lambda equivalent below has always used optional chaining; this now says what happened instead.
     */
    const storedTag = skipped
      ? this.previousImages
          .filter(({ name }) => name === jobName)
          .sort(({ version: v1 }, { version: v2 }) => v2.localeCompare(v1))
          .find((img) => img.digest === digest && img.name === jobName)?.tag
      : undefined;
    // As for functions: a service running another image gets this build's image under a new tag, so it is updated.
    const copyFromTag = storedTag && this.#imageRunsOtherCode({ jobName, digest }) ? storedTag : undefined;
    const tag = skipped && !copyFromTag ? storedTag : getEcrImageTag(jobName, stackManager.nextVersion, digest);

    if (skipped && !storedTag) {
      throw new ExpectedError(
        'STACK',
        `The container image for ${jobName} was reported unchanged, but no matching image is left in the deployment repository.`,
        'Deploy again with --no-cache to rebuild and push it.'
      );
    }

    const imageTagWithUrl = this.getImageUrlForJob({ tag });

    return { tag, jobName, alreadyDeployed: skipped && !copyFromTag, imageTagWithUrl, copyFromTag };
  };

  #getUserLambdaS3UploadInfo = ({ name }: { name: string }) => {
    const packagingOutput = this.packagingSource.getPackagingOutputForJob(name);
    if (!packagingOutput) {
      return { artifactName: name, artifactPath: null, digest: null, s3Key: null, alreadyUploaded: null };
    }
    const { artifactPath, digest, skipped } = packagingOutput;
    const storedS3Key = skipped
      ? this.previousObjects
          .filter(({ name: artifactName }) => name === artifactName)
          .sort(({ version: v1 }, { version: v2 }) => v2.localeCompare(v1))
          .find(({ digest: existingArtifactDigest }) => existingArtifactDigest === digest)?.s3Key
      : undefined;
    // The function may run other code than this build: a fast deployment or `dev` changed it without CloudFormation.
    // Reusing a stored object the template already references would then change nothing, so it is copied instead.
    if (storedS3Key && this.#functionRunsOtherCode({ artifactName: name, digest })) {
      return {
        artifactName: name,
        artifactPath: null,
        digest,
        s3Key: buildLambdaS3Key(name, stackManager.nextVersion, digest),
        alreadyUploaded: false,
        copyFromS3Key: storedS3Key
      };
    }
    return {
      artifactName: name,
      artifactPath,
      digest,
      s3Key: skipped ? storedS3Key : buildLambdaS3Key(name, stackManager.nextVersion, digest),
      alreadyUploaded: skipped
    };
  };

  #functionRunsOtherCode = ({ artifactName, digest }: { artifactName: string; digest: string }) => {
    const lambda = configManager.allLambdasToUpload.find((candidate) => candidate.artifactName === artifactName);
    const cfLogicalName = lambda && 'cfLogicalName' in lambda ? lambda.cfLogicalName : undefined;
    if (!cfLogicalName) return false;
    const tags = stackManager.existingStackResources.find(
      ({ LogicalResourceId }) => LogicalResourceId === cfLogicalName
    )?.tags;
    const layers = getDeployedSharedLayers({
      tags,
      deployedTemplate: templateManager.oldTemplate,
      functionLogicalName: cfLogicalName
    });
    const runningDigest = getDeployedArtifactDigest(
      getTagValue(tags, tagNames.artifactDigest()),
      getTagValue(tags, tagNames.codeDigest()),
      [...layers].map(([layerNumber, identity]) => ({ layerNumber, identity }))
    );
    return runningDigest !== undefined && runningDigest !== digest;
  };

  /** The shared layer content a deployed function runs, or `undefined` when CloudFormation gives it the layer anyway. */
  #deployedSharedLayerIdentity = ({
    functionLogicalName,
    layerNumber
  }: {
    functionLogicalName: string;
    layerNumber: number;
  }) => {
    const deployedResource = stackManager.existingStackResources.find(
      ({ LogicalResourceId }) => LogicalResourceId === functionLogicalName
    );
    if (!deployedResource) return undefined;
    return getDeployedSharedLayers({
      tags: deployedResource.tags,
      deployedTemplate: templateManager.oldTemplate,
      functionLogicalName
    }).get(layerNumber);
  };

  #cfnSharedLayerIdentity = (layerNumber: number) => {
    const s3Key = (
      templateManager.oldTemplate.Resources?.[cfLogicalNames.sharedChunkLayer(layerNumber)]?.Properties as
        | { Content?: { S3Key?: unknown } }
        | undefined
    )?.Content?.S3Key;
    return typeof s3Key === 'string' ? sharedLayerIdentity(s3Key) : undefined;
  };

  /** Layer objects this deployment copies under a release key so that CloudFormation republishes them. */
  #republishedLayers = new Map<number, { sourceKey: string; targetKey: string }>();

  /**
   * The S3 key the template gives a shared layer: the layer's own object, or a copy of it under this release when a
   * function runs a version a fast deployment published and CloudFormation would otherwise leave it there (see
   * `needsLayerRepublish`). The copy is made with the other uploads.
   */
  getSharedLayerS3Key = ({ layerNumber, s3Key }: { layerNumber: number; s3Key: string }) => {
    const identity = sharedLayerIdentity(s3Key);
    const deployedIdentities = configManager.allLambdasToUpload.flatMap((lambda) =>
      'cfLogicalName' in lambda && this.packagingSource.getLayerNumbersForLambda(lambda.name).includes(layerNumber)
        ? [this.#deployedSharedLayerIdentity({ functionLogicalName: lambda.cfLogicalName, layerNumber })]
        : []
    );
    if (
      !needsLayerRepublish({ identity, cfnIdentity: this.#cfnSharedLayerIdentity(layerNumber), deployedIdentities })
    ) {
      this.#republishedLayers.delete(layerNumber);
      return s3Key;
    }
    const targetKey = buildRepublishedLayerS3Key(s3Key, stackManager.nextVersion);
    this.#republishedLayers.set(layerNumber, { sourceKey: s3Key, targetKey });
    return targetKey;
  };

  #copyRepublishedLayers = async () => {
    await Promise.all(
      [...this.#republishedLayers].map(async ([layerNumber, { sourceKey, targetKey }]) => {
        await awsSdkManager.s3.copyObject({ bucketName: this.deploymentBucketName, sourceKey, targetKey });
        this.successfullyCreatedObjects.push({ s3Key: targetKey, name: `shared-layer-${layerNumber}` });
      })
    );
  };

  #imageRunsOtherCode = ({ jobName, digest }: { jobName: string; digest: string }) =>
    stackManager.existingStackResources.some(({ ecsServiceTaskDefinition }) =>
      ecsServiceTaskDefinition?.containerDefinitions?.some(({ image }) => {
        if (!image?.startsWith(`${this.repositoryUrl}:`)) return false;
        const running = parseImageTag(image.slice(this.repositoryUrl.length + 1));
        return (
          running.jobName === jobName &&
          running.digest !== digest &&
          !codeSwapIntegration.imageMatchesRunningCode(jobName, digest, ecsServiceTaskDefinition.taskDefinitionArn)
        );
      })
    );

  #getHelperLambdaS3UploadInfo = ({
    artifactName,
    packaging
  }: {
    artifactName: string;
    packaging: HelperLambdaPackaging;
  }) => {
    let alreadyUploaded = true;
    let s3Key = this.previousObjects
      .filter(({ name }) => name === artifactName)
      .sort(({ version: v1 }, { version: v2 }) => v2.localeCompare(v1))
      .find(({ digest: existingArtifactDigest }) => existingArtifactDigest === packaging.properties.digest)?.s3Key;
    if (!s3Key) {
      alreadyUploaded = false;
      s3Key = buildLambdaS3Key(artifactName, stackManager.nextVersion, packaging.properties.digest);
    }
    return {
      artifactName,
      artifactPath: packaging.properties.artifactPath,
      digest: packaging.properties.digest,
      s3Key,
      alreadyUploaded
    };
  };

  syncDirectoryIntoBucket = async ({
    uploadConfiguration,
    bucketName,
    deleteRemoved,
    shortName
  }: {
    uploadConfiguration: DirectoryUpload;
    bucketName: string;
    deleteRemoved?: boolean;
    shortName: string;
  }) => {
    const childLogger = operationReporter.createChildLogger({
      instanceId: shortName || bucketName,
      label: shortName || bucketName,
      parentEventType: 'SYNC_BUCKET'
    });
    await childLogger.startEvent({ eventType: 'UPLOAD_BUCKET_CONTENT', description: 'Uploading content' });
    const syncStats = await awsSdkManager.s3.syncDirectory({
      uploadConfiguration,
      bucketName,
      deleteRemoved,
      onProgress: ({ progressPercent }) => {
        return childLogger.updateEvent({
          eventType: 'UPLOAD_BUCKET_CONTENT',
          additionalMessage: `${progressPercent}%`
        });
      }
    });
    await childLogger.finishEvent({
      eventType: 'UPLOAD_BUCKET_CONTENT',
      finalMessage: 'Content uploaded',
      data: syncStats
    });
  };

  // this is ran when the stack is rolled back
  deleteArtifactsRollbackedDeploy = async () => {
    // we are deleting all artifacts of specific version:
    // 1. all objects/images/templates which were uploaded during this attempt
    // 2. all previous objects/images which are in the same version as the stack version for current (failed) attempt
    //    - there could have been multiple failed updates which created new artifacts with same version (but different digest)
    await operationReporter.startEvent({
      eventType: 'DELETE_OBSOLETE_ARTIFACTS',
      description: 'Deleting obsolete artifacts'
    });
    await Promise.all([
      this.deleteImagesFromEcrRepo(
        [
          ...this.successfullyUploadedImages.map((image) => image.tag),
          ...this.previousImages.filter(({ version }) => version === stackManager.nextVersion).map(({ tag }) => tag)
        ],
        this.previousImages.filter(({ tag }) => !tag).map(({ dockerDigest }) => dockerDigest)
      ),
      this.deleteObjectsFromDeploymentBucket([
        ...this.successfullyCreatedObjects.map((obj) => obj.s3Key),
        ...this.previousObjects.filter(({ version }) => version === stackManager.nextVersion).map(({ s3Key }) => s3Key)
      ])
    ]);
    await operationReporter.finishEvent({
      eventType: 'DELETE_OBSOLETE_ARTIFACTS',
      finalMessage: 'Obsolete artifacts deleted',
      data: {}
    });
  };

  // this is ran after a stack which was in UPDATE_FAILED state gets successfully updated
  deleteArtifactsFixedDeploy = async () => {
    await operationReporter.startEvent({
      eventType: 'DELETE_OBSOLETE_ARTIFACTS',
      description: 'Deleting obsolete artifacts'
    });
    await Promise.all([
      // we are deleting all image tags with current version that are not used
      this.deleteImagesFromEcrRepo(
        this.previousImages
          .filter(
            ({ version, tag }) =>
              version === stackManager.nextVersion && !this.previouslyUploadedImageTagsUsedInDeployment.includes(tag)
          )
          .map(({ tag }) => tag),
        this.previousImages.filter(({ tag }) => !tag).map(({ dockerDigest }) => dockerDigest)
      ),
      // when loading previous objects both userLambda and userCustomResourceLambda are of type "userLambda"
      // we are deleting all lambda artifacts in current version but not being used
      this.deleteObjectsFromDeploymentBucket(
        this.previousObjects
          .filter(
            ({ version, s3Key, type }) =>
              version === stackManager.nextVersion &&
              type === 'user-lambda' &&
              !this.previouslyUploadedS3KeysUsedInDeployment.includes(s3Key)
          )
          .map(({ s3Key }) => s3Key)
      )
    ]);
    await operationReporter.finishEvent({
      eventType: 'DELETE_OBSOLETE_ARTIFACTS',
      finalMessage: 'Obsolete artifacts deleted',
      data: {}
    });
  };

  getObsoleteItems = <T extends StoredArtifact>(previousItems: T[]): T[] =>
    selectObsoleteArtifacts({
      // Helpers survive release retention so running tasks and rollbacks can still pull them.
      // Code-swap artifacts are collected after history finalization, with live-task and rollback references.
      artifacts: previousItems.filter(
        ({ tag, s3Key }) => !tag?.startsWith('stp-cloudmap-drain-') && !s3Key?.startsWith('code-swap/')
      ),
      usage: {
        uploadedObjects: this.successfullyCreatedObjects,
        uploadedImages: this.successfullyUploadedImages,
        reusedS3Keys: this.previouslyUploadedS3KeysUsedInDeployment,
        reusedImageTags: this.previouslyUploadedImageTagsUsedInDeployment,
        versionsToKeepPerName: this.maxArtifactVersionsToKeep,
        // Every job that builds an image can export a registry cache (`getCacheRef` in the packaging manager).
        registryCacheTags: [
          ...configManager.allContainersRequiringPackaging,
          ...configManager.agentCoreRuntimesRequiringPackaging
        ].map(({ jobName }) => getEcrCacheImageTag(jobName))
      }
    });

  /**
   * Images that running services still use. After a code swap, a service keeps its older task revision, whose image can
   * fall out of the retention window; deleting it would make replacement and scale-out tasks fail to pull.
   */
  #withoutLiveImages = async <T extends { tag: string; dockerDigest: string }>(obsolete: T[]) =>
    obsolete.length
      ? keepImagesOfRunningServices({
          obsolete,
          liveImages: await codeSwapIntegration.liveImages(),
          repositoryUrl: this.repositoryUrl,
          storedImages: this.previousImages
        })
      : obsolete;

  /** See `keepLayersOfRetainedReleases`. The retained templates are read only when a layer is about to go. */
  #withoutLayersOfRetainedReleases = async <T extends { s3Key: string; name: string }>(obsolete: T[]) => {
    const obsoleteLayers = obsolete.filter(({ name }) => name.startsWith('shared-layer-'));
    if (!obsoleteLayers.length) return obsolete;
    const deletedKeys = new Set(obsolete.map(({ s3Key }) => s3Key));
    const retainedVersions = this.previousObjects
      .filter(({ name, s3Key }) => name === CF_TEMPLATE_FILE_NAME_WITHOUT_EXT && !deletedKeys.has(s3Key))
      .map(({ version }) => version);
    try {
      const retainedTemplates = await Promise.all(retainedVersions.map((version) => this.getTemplate({ version })));
      return keepLayersOfRetainedReleases({
        obsolete,
        retainedTemplates,
        deploymentBucketName: this.deploymentBucketName
      });
    } catch (error) {
      // Without the releases' templates there is no telling which layers they need, so none is deleted this time.
      tuiManager.debug(`Kept every shared layer: a retained release's template could not be read (${error}).`);
      return obsolete.filter((artifact) => !obsoleteLayers.includes(artifact));
    }
  };

  deleteAllObsoleteArtifacts = async () => {
    const obsoleteImages = await this.#withoutLiveImages(this.getObsoleteItems(this.previousImages));
    const obsoleteObjects = await this.#withoutLayersOfRetainedReleases(this.getObsoleteItems(this.previousObjects));
    const deletedKeys = new Set(obsoleteObjects.map(({ s3Key }) => s3Key));
    const obsoleteSourceMapKeys = selectObsoleteSourceMapKeys({
      storedKeys: this.#storedSourceMapKeys,
      remainingArtifactKeys: [...this.previousObjects, ...this.successfullyCreatedObjects]
        .map(({ s3Key }) => s3Key)
        .filter((s3Key) => !deletedKeys.has(s3Key))
    });
    if (obsoleteImages.length || obsoleteObjects.length || obsoleteSourceMapKeys.length) {
      await operationReporter.startEvent({
        eventType: 'DELETE_OBSOLETE_ARTIFACTS',
        description: 'Deleting obsolete artifacts'
      });
      await Promise.all([
        this.deleteImagesFromEcrRepo(
          obsoleteImages.filter((img) => img.tag).map((img) => img.tag),
          // for deleting untagged images
          obsoleteImages.filter(({ tag }) => !tag).map(({ dockerDigest }) => dockerDigest)
        ),
        this.deleteObjectsFromDeploymentBucket([...obsoleteObjects.map((obj) => obj.s3Key), ...obsoleteSourceMapKeys])
      ]);
      obsoleteSourceMapKeys.forEach((key) => this.#storedSourceMapKeys.delete(key));
      await operationReporter.finishEvent({
        eventType: 'DELETE_OBSOLETE_ARTIFACTS',
        finalMessage: 'Obsolete artifacts deleted',
        data: { obsoleteImages, obsoleteObjects, obsoleteSourceMapKeys }
      });
    }
  };

  uploadCloudFormationTemplate = async () => {
    const uploadProps = {
      artifactName: CF_TEMPLATE_FILE_NAME_WITHOUT_EXT,
      artifactPath: fsPaths.absoluteCfTemplateFilePath({
        invocationId: globalStateManager.invocationId
      }),
      s3Key: getCfTemplateS3Key(stackManager.nextVersion)
    };
    await this.uploadToDeploymentBucket({
      ...uploadProps,
      contentType: 'text/yaml'
    });
    return uploadProps;
  };

  /**
   * Uploads this invocation's template for a preview such as `diff` and returns its URL and a function that deletes it.
   * The key is outside the release history, so a preview never looks like a release.
   */
  uploadPreviewTemplate = async () => {
    const s3Key = `previews/${globalStateManager.invocationId}/${CF_TEMPLATE_FILE_NAME_WITHOUT_EXT}.yml`;
    await awsSdkManager.s3.putObject({
      bucketName: this.deploymentBucketName,
      s3Key,
      body: await readFile(
        fsPaths.absoluteCfTemplateFilePath({ invocationId: globalStateManager.invocationId }),
        'utf8'
      ),
      contentType: 'text/yaml'
    });
    const localEndpoint = getLocalS3Endpoint();
    return {
      templateUrl: localEndpoint
        ? `${localEndpoint}/${this.deploymentBucketName}/${s3Key}`
        : `https://${this.deploymentBucketName}.${this.baseS3Endpoint}/${s3Key}`,
      deleteTemplate: () => this.deleteObjectsFromDeploymentBucket([s3Key])
    };
  };

  uploadStacktapeTemplate = async () => {
    const uploadProps = {
      artifactName: STP_TEMPLATE_FILE_NAME_WITHOUT_EXT,
      artifactPath: fsPaths.absoluteStpTemplateFilePath({
        invocationId: globalStateManager.invocationId
      }),
      s3Key: getStpTemplateS3Key(stackManager.nextVersion)
    };
    await this.uploadToDeploymentBucket({
      ...uploadProps,
      contentType: 'text/yaml'
    });
    return uploadProps;
  };

  /**
   * Marks a successful fast deployment as a release and stores its templates, so `rollback` can restore it. Fails if
   * another deployment created the same release meanwhile.
   */
  recordFastRelease = async () => {
    const version = stackManager.nextVersion;
    const markerKey = `${FAST_RELEASE_MARKER_NAME}/${version}.json`;
    // The marker is written first and only if missing, so a deployment that lost the race overwrites nothing.
    try {
      await awsSdkManager.s3.putObject({
        bucketName: this.deploymentBucketName,
        s3Key: markerKey,
        body: JSON.stringify({
          version,
          invocationId: globalStateManager.invocationId,
          codeSwap: codeSwapIntegration.releaseIdentity()
        }),
        contentType: 'application/json',
        onlyIfMissing: true
      });
    } catch (err) {
      if (`${err}`.includes('PreconditionFailed')) {
        throw new ExpectedError(
          'STACK',
          `Another deployment of this stack created release ${version} at the same time.`,
          'Deploy again to make sure every function and service runs the code you expect.'
        );
      }
      throw err;
    }
    // Both uploads settle before the marker can be removed, so a failed attempt never writes after another deployment
    // claimed the release.
    const uploads = await Promise.allSettled([this.uploadCloudFormationTemplate(), this.uploadStacktapeTemplate()]);
    const failedUpload = uploads.find((upload): upload is PromiseRejectedResult => upload.status === 'rejected');
    if (failedUpload) {
      await this.deleteObjectsFromDeploymentBucket([markerKey]).catch(() => {});
      throw failedUpload.reason;
    }
    this.successfullyCreatedObjects.push({ s3Key: markerKey, name: FAST_RELEASE_MARKER_NAME });
  };

  /** A fast deployment uploads its templates only after it succeeded, in `recordFastRelease`. */
  uploadAllArtifacts = async ({
    includeTemplates,
    onSharedLayerUploaded
  }: {
    includeTemplates: boolean;
    onSharedLayerUploaded?: (layerNumber: number) => void;
  }) => {
    const jobs: (() => Promise<any>)[] = [];

    if (configManager.allContainerWorkloads.some(needsCloudMapDrain)) {
      jobs.push(async () => {
        for (const digest of Object.values(CLOUD_MAP_DRAIN_IMAGES)) {
          await awsSdkManager.ecr.copyPublicImage({
            repositoryName: this.repositoryName,
            sourceRepository: 'docker/library/busybox',
            digest,
            tag: cloudMapDrainImageTag(digest)
          });
        }
      });
    }

    if (includeTemplates) {
      jobs.push(() => this.uploadCloudFormationTemplate());
      jobs.push(() => this.uploadStacktapeTemplate());
    }

    this.getLambdasToUpload().forEach(({ artifactName, artifactPath, s3Key, copyFromS3Key }) => {
      // A copied artifact keeps its digest, so its maps are already stored.
      const sourceMapsPath =
        !copyFromS3Key && this.packagingSource.getPackagingOutputForJob(artifactName)?.sourceMapsPath;
      if (sourceMapsPath) jobs.push(() => this.#uploadSourceMaps({ artifactS3Key: s3Key, sourceMapsPath }));
      jobs.push(async () => {
        if (!copyFromS3Key) return this.uploadLambda({ artifactName, artifactPath, s3Key });
        await awsSdkManager.s3.copyObject({
          bucketName: this.deploymentBucketName,
          sourceKey: copyFromS3Key,
          targetKey: s3Key
        });
        this.successfullyCreatedObjects.push({ s3Key, name: artifactName });
      });
    });
    const imagesToUpload = this.getImagesToUpload();
    if (imagesToUpload.length > 0) {
      // Validation and synthesis build images locally but never push them. Fetching an ECR token during
      // initialization made those read-only commands contact AWS and modify the user's Docker credential store.
      await this.loginToEcr();
    }
    imagesToUpload.forEach(({ jobName, tag, imageTagWithUrl, copyFromTag }) => {
      jobs.push(async () => {
        if (!copyFromTag) return this.uploadImage({ tag, jobName, imageTagWithUrl });
        await awsSdkManager.ecr.tagImage({
          repositoryName: this.repositoryName,
          sourceTag: copyFromTag,
          targetTag: tag
        });
        this.successfullyUploadedImages.push({ tag, name: jobName });
      });
    });

    // Publish shared Lambda layer if one was built
    if (this.packagingSource.getPendingSharedLayer()) {
      // Make layer objects available first, so version publication can overlap the remaining uploads.
      jobs.unshift(() => this.uploadSharedLayer({ onLayerUploaded: onSharedLayerUploaded }));
    }

    if (jobs.length) {
      await operationReporter.startEvent({
        eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
        description: 'Uploading deployment artifacts'
      });

      // A bucket created moments ago can still answer "NoSuchBucket" for up to a minute. An existing stack's bucket was
      // listed during initialization, and an upload that does not find it waits for it anyway.
      if (stackManager.stackActionType !== 'update') {
        await awsSdkManager.s3.waitForBucketExists({ bucketName: this.deploymentBucketName, maxTime: 60 });
      }

      await processConcurrently(jobs, DEFAULT_MAXIMUM_PARALLEL_ARTIFACT_UPLOADS);
      await operationReporter.finishEvent({
        eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
        finalMessage: 'Deployment artifacts uploaded',
        data: { images: this.successfullyUploadedImages, objects: this.successfullyCreatedObjects }
      });
    } else {
      await operationReporter.startEvent({
        eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
        description: 'Uploading deployment artifacts'
      });
      await operationReporter.finishEvent({
        eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
        finalMessage: 'Nothing to upload (all artifacts unchanged)'
      });
    }
  };

  syncBuckets = async () => {
    await operationReporter.startEvent({ eventType: 'SYNC_BUCKET', description: 'Syncing directories into buckets' });
    const jobs: (() => Promise<any>)[] = [];
    configManager.allBucketsToSync.forEach(
      ({ bucketName, uploadConfiguration, stpConfigBucketName, deleteRemoved }) => {
        jobs.push(() =>
          this.syncDirectoryIntoBucket({
            uploadConfiguration: {
              ...uploadConfiguration,
              disableS3TransferAcceleration:
                uploadConfiguration.disableS3TransferAcceleration ||
                !configManager.isS3TransferAccelerationAvailableInDeploymentRegion
            },
            bucketName,
            deleteRemoved,
            shortName: stpConfigBucketName
          })
        );
      }
    );
    await processConcurrently(jobs, DEFAULT_MAXIMUM_PARALLEL_BUCKET_SYNCS);
    const syncedCount = configManager.allBucketsToSync.length;
    await operationReporter.finishEvent({
      eventType: 'SYNC_BUCKET',
      finalMessage: `${syncedCount} director${syncedCount === 1 ? 'y' : 'ies'} synced into bucket${syncedCount === 1 ? '' : 's'}`,
      data: { syncedDirs: configManager.allBucketsToSync }
    });
  };

  deleteAllArtifacts = async () => {
    await operationReporter.startEvent({
      eventType: 'DELETE_ARTIFACTS',
      description: 'Deleting all deployment artifacts'
    });
    const nonEmptyBuckets = Object.entries(await this.getBucketsContent()).filter(
      ([_bucketName, objects]) => objects.length
    );
    let emptyBucketsPromises = [];
    if (nonEmptyBuckets.length) {
      emptyBucketsPromises = nonEmptyBuckets.map(async ([bucketName, objects]) => {
        await awsSdkManager.s3.deleteObjects(bucketName, objects as ObjectIdentifier[]);
        // after first delete, we need to list all versions (including delete markers) and delete them
        const versionedObjects = await awsSdkManager.s3.listObjectVersions(bucketName);
        return awsSdkManager.s3.deleteObjects(bucketName, versionedObjects as ObjectIdentifier[]);
      });
    }

    const [deletedImages, deletedObjects] = await Promise.all([
      this.deleteAllImages(),
      this.deleteAllObjects(),
      ...emptyBucketsPromises
      // this.emptyAllAutoSyncedUserBuckets()
    ]);
    await operationReporter.finishEvent({
      eventType: 'DELETE_ARTIFACTS',
      data: { deletedImages, deletedObjects }
    });
  };

  deleteAllObjects = async () => {
    await this.deleteObjectsFromDeploymentBucket([
      ...this.previousObjects.map((obj) => obj.s3Key),
      ...this.#storedSourceMapKeys
    ]);
    return this.previousObjects;
  };

  deleteAllImages = async () => {
    await this.deleteImagesFromEcrRepo(
      [],
      this.previousImages.map((image) => image.dockerDigest)
    );
    return this.previousImages;
  };

  getTemplate = async ({ version }: { version: string }): Promise<CloudFormationTemplate> => {
    const template = await awsSdkManager.s3.getObjectText({
      bucketName: this.deploymentBucketName,
      s3Key: getCfTemplateS3Key(version || stackManager.lastVersion)
    });

    return parseYaml(template);
  };

  loadPreviousBucketObjects = async (deploymentBucketName: string, stackActionType: StackActionType) => {
    let objects: _Object[];
    try {
      objects = await awsSdkManager.s3.listObjects(deploymentBucketName);
    } catch (err) {
      if (stackActionType === 'delete' && err.toString().includes('NoSuchBucket')) {
        tuiManager.debug(`Deployment bucket ${deploymentBucketName} not found; skipping artifact load.`);
        return;
      }
      throw err;
    }
    objects.forEach((object) => {
      const s3Key = object.Key;
      if (s3Key.startsWith('code-swap/')) {
        this.previousObjects.push({ s3Key, name: 'code-swap', version: null, digest: null, type: 'user-lambda' });
        return;
      }
      if (s3Key.startsWith(SOURCE_MAP_KEY_PREFIX)) {
        this.#storedSourceMapKeys.add(s3Key);
        return;
      }
      const parsed = parseBucketObjectS3Key(s3Key);
      if (!parsed) {
        tuiManager.debug(`Ignoring ${s3Key} in deployment bucket ${deploymentBucketName}: not a Stacktape artifact.`);
        return;
      }
      const { digest, name, version } = parsed;
      this.previousObjects.push({
        digest,
        s3Key: object.Key,
        version,
        name,
        type: getDeploymentBucketObjectType(name)
      });
    });
  };

  loadPreviousImages = async (repositoryName: string, stackActionType: StackActionType) => {
    let imagesInRepo: ImageIdentifier[] = [];
    try {
      imagesInRepo = await awsSdkManager.ecr.listImages(repositoryName);
    } catch (err) {
      if (stackActionType === 'delete' && err.toString().includes('RepositoryNotFoundException')) {
        tuiManager.debug(`ECR repo ${repositoryName} not found; skipping image load.`);
        return;
      }
      throw err;
    }
    imagesInRepo.forEach((img) => {
      let jobName: string;
      let version: string;
      let digest: string;
      if (img.imageTag) {
        ({ jobName, version, digest } = parseImageTag(img.imageTag));
      }
      this.previousImages.push({ name: jobName, version, digest, tag: img.imageTag, dockerDigest: img.imageDigest });
    });
  };

  /**
   * Logs Docker in to the stack's registry. A deployment asks for it while its images are built and again before it
   * pushes them; both get the same login. ECR tokens last 12 hours, so a login older than an hour is not reused, and a
   * failed one is tried again by the next caller.
   */
  loginToEcr = (): Promise<void> => {
    const recent = this.#ecrLogin && Date.now() - this.#ecrLogin.startedAt < ECR_LOGIN_REUSE_MS;
    if (!recent) {
      const login = (async () => {
        const loginDetails = await awsSdkManager.ecr.getAuthorization();
        await dockerLogin(loginDetails);
      })();
      const attempt = { startedAt: Date.now(), login };
      login.catch(() => {
        if (this.#ecrLogin === attempt) this.#ecrLogin = undefined;
      });
      this.#ecrLogin = attempt;
    }
    return this.#ecrLogin!.login;
  };

  #ecrLogin: { startedAt: number; login: Promise<void> } | undefined;

  deleteImagesFromEcrRepo = (imageTags: string[], imageDigests: string[]) => {
    if (imageDigests.length || imageTags.length) {
      return awsSdkManager.ecr.deleteImages(this.repositoryName, imageTags, imageDigests);
    }
  };

  uploadToDeploymentBucket = async ({
    artifactPath,
    s3Key,
    contentType,
    contentEncoding,
    artifactName,
    metadata
  }: {
    artifactPath: string;
    s3Key: string;
    artifactName: string;
    contentType: string;
    contentEncoding?: 'gzip';
    metadata?: { [key: string]: string };
  }) => {
    const upload = async (useS3Acceleration?: boolean) => {
      await awsSdkManager.s3.uploadFile({
        s3Key,
        filePath: artifactPath,
        bucketName: this.deploymentBucketName,
        contentType,
        contentEncoding,
        useS3Acceleration: useS3Acceleration ?? configManager.deploymentConfig.disableS3TransferAcceleration !== true,
        metadata
      });
    };

    try {
      await upload();
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      if (errMessage.includes('NoSuchBucket')) {
        await awsSdkManager.s3.waitForBucketExists({ bucketName: this.deploymentBucketName, maxTime: 60 });
        await upload();
      } else if (errMessage.includes('PermanentRedirect')) {
        await upload(false);
      } else {
        throw err;
      }
    }
    this.successfullyCreatedObjects.push({ s3Key, name: artifactName });
    return { s3Key };
  };

  deleteObjectsFromDeploymentBucket = async (objectKeys: string[]) => {
    if (objectKeys.length) {
      try {
        return await awsSdkManager.s3.deleteObjects(
          this.deploymentBucketName,
          objectKeys.map((objKey) => ({ Key: objKey }))
        );
      } catch (err) {
        throw new ExpectedError(
          'AWS',
          `Failed to batch delete objects ${objectKeys.join(', ')} from bucket ${
            this.deploymentBucketName
          }. Error message:\n${err}`
        );
      }
    }
  };

  uploadLambda = async ({
    artifactName,
    artifactPath,
    s3Key,
    metadata
  }: {
    artifactName: string;
    s3Key: string;
    artifactPath: string;
    metadata?: { [key: string]: string };
  }) => {
    const isHelperLambda = configManager.helperLambdas.map((l) => l.artifactName).includes(artifactName);
    const uploadLogger = operationReporter.createChildLogger({
      parentEventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
      instanceId: isHelperLambda ? `${artifactName} (stacktape internal)` : artifactName,
      label: artifactName.replace(/-default$/, '')
    });
    // we do not log these events for service lambdas to avoid bloating output
    if (!isHelperLambda) {
      await uploadLogger.startEvent({ eventType: 'UPLOAD_PACKAGE', description: 'Uploading artifact' });
    }
    await this.uploadToDeploymentBucket({
      artifactName,
      artifactPath,
      contentType: 'application/zip',
      s3Key,
      metadata
    });
    if (!isHelperLambda) {
      await uploadLogger.finishEvent({ eventType: 'UPLOAD_PACKAGE', finalMessage: 'Artifact uploaded' });
    }
    return { artifactS3Key: s3Key };
  };

  uploadImage = async ({
    tag,
    jobName,
    imageTagWithUrl
  }: {
    tag: string;
    jobName: string;
    imageTagWithUrl: string;
  }) => {
    const uploadLogger = operationReporter.createChildLogger({
      parentEventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
      instanceId: jobName,
      label: jobName.replace(/-default$/, '')
    });
    await uploadLogger.startEvent({ eventType: 'UPLOAD_IMAGE', description: 'Uploading image' });
    // The image this deployment built, by its ID: the local tag (the job name) may meanwhile name another build's image.
    const imageId = this.packagingSource.getPackagingOutputForJob(jobName)?.imageId;
    if (!imageId) {
      throw new ExpectedError(
        'PACKAGING',
        `The build of container image ${jobName} did not report the image it built.`
      );
    }
    await tagDockerImage(imageId, imageTagWithUrl);
    await pushDockerImage(imageTagWithUrl);
    this.successfullyUploadedImages.push({ tag, name: jobName });
    await uploadLogger.finishEvent({ eventType: 'UPLOAD_IMAGE', finalMessage: 'Container image uploaded' });
    return { jobName, imageTagWithUrl };
  };

  uploadSharedLayer = async ({ onLayerUploaded }: { onLayerUploaded?: (layerNumber: number) => void } = {}) => {
    // Skip if no pending layers
    const pendingLayer = this.packagingSource.getPendingSharedLayer();
    if (!pendingLayer) {
      return;
    }

    const layerArtifacts = this.packagingSource.getLayerArtifacts();
    if (layerArtifacts.length === 0) {
      return;
    }

    // Check which layers already exist in S3 (content-hash based caching)
    const existingS3Keys = new Set(this.previousObjects.map((obj) => obj.s3Key));
    const layersToUpload = layerArtifacts.filter((layer) => !existingS3Keys.has(layer.s3Key));
    const cachedLayers = layerArtifacts.filter((layer) => existingS3Keys.has(layer.s3Key));

    /*
     * Mark cached layers as uploaded (they already exist in S3).
     *
     * Reusing a layer still means this deployment's template points at it, so retention has to be told.
     * Only freshly uploaded layers land in `successfullyCreatedObjects`, and a layer key's version
     * segment is its content hash, so the "keep the newest N" window orders them lexicographically by
     * hash rather than by age. A project with more than that many historical variants of one layer could
     * therefore have the layer it is deploying right now deleted in the same run.
     */
    for (const layer of cachedLayers) {
      this.uploadedLayerS3Keys.set(layer.layerNumber, layer.s3Key);
      this.previouslyUploadedS3KeysUsedInDeployment.push(layer.s3Key);
      onLayerUploaded?.(layer.layerNumber);
    }

    // If all layers are cached, skip upload entirely
    if (layersToUpload.length === 0) {
      await this.#copyRepublishedLayers();
      return;
    }

    const uploadLogger = operationReporter.createChildLogger({
      parentEventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
      instanceId: 'shared-layer',
      label: 'shared layer'
    });
    await uploadLogger.startEvent({
      eventType: 'UPLOAD_SHARED_LAYER',
      description: `Uploading ${layersToUpload.length} shared layer${layersToUpload.length === 1 ? '' : 's'}${cachedLayers.length > 0 ? ` (${cachedLayers.length} cached)` : ''}`
    });

    try {
      // Zip only the layers that need uploading
      await this.packagingSource.publishSharedLayer(layersToUpload);

      const uploads = await Promise.allSettled(
        layersToUpload.map(async (layer) => {
          const zipPath = `${layer.layerPath}.zip`;
          const s3Key = layer.s3Key;
          const results = await Promise.allSettled([
            (async () => {
              await awsSdkManager.s3.uploadFile({ s3Key, filePath: zipPath, bucketName: this.deploymentBucketName });
              this.uploadedLayerS3Keys.set(layer.layerNumber, s3Key);
              // The release needs this S3 object anyway. Let Lambda read it there instead of sending the same
              // archive again as a base64 inline payload, which dominates publication time for realistic layers.
              onLayerUploaded?.(layer.layerNumber);
              this.successfullyCreatedObjects.push({ s3Key, name: `shared-layer-${layer.layerNumber}` });
            })(),
            ...(layer.sourceMapsPath
              ? [this.#uploadSourceMaps({ artifactS3Key: s3Key, sourceMapsPath: layer.sourceMapsPath })]
              : [])
          ]);
          const failed = results.find((result) => result.status === 'rejected');
          if (failed?.status === 'rejected') throw failed.reason;
        })
      );
      const failed = uploads.find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') throw failed.reason;

      await this.#copyRepublishedLayers();
      await uploadLogger.finishEvent({
        eventType: 'UPLOAD_SHARED_LAYER',
        finalMessage: `${layersToUpload.length} layer(s) uploaded${cachedLayers.length > 0 ? `, ${cachedLayers.length} cached` : ''}`
      });
    } catch (error) {
      await uploadLogger.finishEvent({
        eventType: 'UPLOAD_SHARED_LAYER',
        finalMessage: `Layer upload failed: ${(error as Error).message}`
      });
      throw error;
    }
  };

  /**
   * Stores the source maps of the artifact at `artifactS3Key` (`sourceMapKeyForArtifact`), unless they are stored
   * already. The bundle is gzip-compressed JSON (`takeSourceMapsOutOfPackage`), stored as written. A failed deployment
   * deletes it with its other uploads.
   */
  #uploadSourceMaps = async ({ artifactS3Key, sourceMapsPath }: { artifactS3Key: string; sourceMapsPath: string }) => {
    const s3Key = sourceMapKeyForArtifact(artifactS3Key);
    if (!s3Key || this.#storedSourceMapKeys.has(s3Key)) return;
    await this.uploadToDeploymentBucket({
      artifactName: 'source-maps',
      artifactPath: sourceMapsPath,
      contentType: 'application/json',
      contentEncoding: 'gzip',
      s3Key
    });
    this.#storedSourceMapKeys.add(s3Key);
  };

  /** Which stored source maps describe each function of `template`; see `getSourceMapManifest`. */
  getSourceMapManifest = (template: CloudFormationTemplate) =>
    getSourceMapManifest({
      template,
      deploymentBucketName: this.deploymentBucketName,
      storedKeys: this.#storedSourceMapKeys
    });

  /**
   * Get S3 info for a specific layer.
   * Used by CloudFormation to reference the layer artifact.
   */
  getLayerS3Info(layerNumber: number): { bucket: string; key: string } | null {
    const s3Key = this.uploadedLayerS3Keys.get(layerNumber);
    if (!s3Key) return null;
    return { bucket: this.deploymentBucketName, key: s3Key };
  }

  /**
   * Get all uploaded layer S3 info.
   */
  getAllLayerS3Info(): Array<{ layerNumber: number; bucket: string; key: string }> {
    const result: Array<{ layerNumber: number; bucket: string; key: string }> = [];
    for (const [layerNumber, s3Key] of this.uploadedLayerS3Keys) {
      result.push({ layerNumber, bucket: this.deploymentBucketName, key: s3Key });
    }
    return result;
  }

  getBucketsContent = async () => {
    const objectsToRemove: { [bucketName: string]: _Object[] } = {};
    await Promise.all(
      stackManager.existingStackResources
        .filter(
          (stackResource) =>
            stackResource.ResourceType === 'AWS::S3::Bucket' &&
            // stackResource.ResourceStatus !== ResourceStatus.DELETE_COMPLETE &&
            // deployment bucket is handled separately
            stackResource.PhysicalResourceId !==
              awsResourceNames.deploymentBucket(globalStateManager.targetStack.globallyUniqueStackHash)
        )
        .map(async ({ PhysicalResourceId: bucketName }) => {
          // we are first listing all regular objects in the bucket
          objectsToRemove[bucketName] = await awsSdkManager.s3.listObjects(bucketName);
          // even if there are no regular objects, there can be some old versions (delete markers), which would fail bucket deletion as well
          // we only check for versioned objects to ensure the bucket is truly empty. We will still need to do list versioned objects after
          // the delete of regular objects, as that can create new delete markers, etc
          if (!objectsToRemove[bucketName].length) {
            objectsToRemove[bucketName] = await awsSdkManager.s3.listObjectVersions(bucketName);
          }
          return bucketName;
        })
    );
    return objectsToRemove;
  };

  getExistingDigestsForJob = (jobName: string) => {
    return (
      [...this.previousImages, ...this.previousObjects]
        // Older CLIs stored hot-swapped artifacts as v000000, which retention removes first. Rebuild instead of reusing them.
        .filter(({ name, version }) => name === jobName && version !== LEGACY_HOTSWAP_VERSION)
        .map(({ digest }) => digest)
    );
  };

  /**
   * Stores the template of `sourceVersion` as release `newVersion` and returns it with its URL.
   *
   * The restored code is copied under the new release first, so every code reference in the template changes and
   * CloudFormation updates each function and container service, including those a fast deployment changed without
   * CloudFormation. For the same reason, Lambda version publishers run again and move their aliases.
   */
  prepareRollbackTemplate = async (sourceVersion: string, newVersion: string) => {
    const template = await this.getTemplate({ version: sourceVersion });
    codeSwapIntegration.rollbackTemplate(template);
    const copies: Promise<unknown>[] = [];
    this.#restoredFunctionTags = [];
    for (const [logicalId, resource] of Object.entries(template.Resources)) {
      const properties = (resource.Properties ?? {}) as Record<string, any>;
      if (resource.Type === 'AWS::Lambda::Function' && properties.Code) {
        const identityKeys = [tagNames.codeDigest(), tagNames.artifactDigest(), tagNames.sharedLayers()];
        const tags = ((properties.Tags ?? []) as { Key: string; Value: string }[])
          .filter(({ Key, Value }) => identityKeys.includes(Key) && typeof Value === 'string')
          .map(({ Key, Value }) => ({ key: Key, value: Value }));
        if (tags.length) this.#restoredFunctionTags.push({ logicalId, tags });
        const { Code: code } = properties;
        if (code.S3Bucket === this.deploymentBucketName && typeof code.S3Key === 'string') {
          code.S3Key = this.#copyFunctionCodeToRelease({ s3Key: code.S3Key, newVersion, copies });
        }
        if (typeof code.ImageUri === 'string') {
          code.ImageUri = this.#tagImageForRelease({ imageUri: code.ImageUri, newVersion, copies });
        }
      }
      if (resource.Type === 'AWS::Lambda::LayerVersion') {
        const { Content: content } = properties;
        if (content?.S3Bucket === this.deploymentBucketName && typeof content.S3Key === 'string') {
          content.S3Key = this.#republishLayerForRelease({
            logicalId,
            s3Key: content.S3Key,
            template,
            newVersion,
            copies
          });
        }
      }
      if (resource.Type === 'AWS::ECS::TaskDefinition') {
        for (const container of properties.ContainerDefinitions ?? []) {
          if (typeof container.Image === 'string') {
            container.Image = this.#tagImageForRelease({ imageUri: container.Image, newVersion, copies });
          }
        }
      }
      if (resource.Type === 'AWS::CloudFormation::CustomResource' && properties.publishLambdaVersion) {
        properties.restoredRelease = newVersion;
      }
    }
    await Promise.all(copies);
    if (template.Outputs?.[outputNames.deploymentVersion()]) {
      template.Outputs[outputNames.deploymentVersion()].Value = newVersion;
    }
    await awsSdkManager.s3.putObject({
      bucketName: this.deploymentBucketName,
      s3Key: getCfTemplateS3Key(newVersion),
      body: stringifyToYaml(template),
      contentType: 'application/x-yaml'
    });
    return { templateUrl: this.getCloudformationTemplateUrlForVersion(newVersion), template };
  };

  /**
   * Makes each function's code-digest and shared-layers tags say what `template`, now deployed, gave it. CloudFormation
   * rewrites a tag only when its value differs from the template it applied before, so a tag a fast deployment changed
   * in between keeps that value, although the function runs the template's code and layers again. Left alone, the
   * next deployment would update the function once more for nothing.
   */
  repairFunctionTags = async (template: CloudFormationTemplate) => {
    const repaired = [tagNames.codeDigest(), tagNames.artifactDigest(), tagNames.sharedLayers()];
    await Promise.all(
      stackManager.existingStackResources
        .filter(({ ResourceType }) => ResourceType === 'AWS::Lambda::Function')
        .map(async ({ LogicalResourceId, PhysicalResourceId, tags }) => {
          const properties = template.Resources[LogicalResourceId]?.Properties as
            | { Tags?: { Key?: string; Value?: unknown }[] }
            | undefined;
          const stale = (properties?.Tags ?? []).filter(
            ({ Key, Value }) =>
              Key && repaired.includes(Key) && typeof Value === 'string' && getTagValue(tags, Key) !== Value
          );
          const expectedKeys = new Set((properties?.Tags ?? []).map(({ Key }) => Key));
          const obsolete = (tags ?? []).flatMap(({ key }) =>
            key && repaired.includes(key) && !expectedKeys.has(key) ? [key] : []
          );
          if (!stale.length && !obsolete.length) return;
          const { FunctionArn } = await awsSdkManager.lambda.getFunction({ lambdaResourceName: PhysicalResourceId });
          await Promise.all([
            ...(stale.length
              ? [
                  awsSdkManager.lambda.tagFunction({
                    lambdaArn: FunctionArn,
                    tags: stale.map(({ Key, Value }) => ({ key: Key!, value: Value as string }))
                  })
                ]
              : []),
            ...(obsolete.length
              ? [awsSdkManager.lambda.untagFunction({ lambdaArn: FunctionArn, tagKeys: obsolete })]
              : [])
          ]);
        })
    );
  };

  #restoredFunctionTags: { logicalId: string; tags: { key: string; value: string }[] }[] = [];

  /**
   * Sets each restored function's code-digest and shared-layers tags after a rollback. CloudFormation leaves a tag
   * alone when the restored template has the same value it last applied, even if a fast deployment changed it since.
   */
  tagRestoredFunctions = async () => {
    await Promise.all(
      this.#restoredFunctionTags.map(async ({ logicalId, tags }) => {
        const functionName = stackManager.existingStackResources.find(
          ({ LogicalResourceId }) => LogicalResourceId === logicalId
        )?.PhysicalResourceId;
        if (!functionName) return;
        const { FunctionArn } = await awsSdkManager.lambda.getFunction({ lambdaResourceName: functionName });
        await awsSdkManager.lambda.tagFunction({
          lambdaArn: FunctionArn,
          tags
        });
      })
    );
  };

  #copyFunctionCodeToRelease = ({
    s3Key,
    newVersion,
    copies
  }: {
    s3Key: string;
    newVersion: string;
    copies: Promise<unknown>[];
  }) => {
    const artifact = parseBucketObjectS3Key(s3Key);
    // Stacktape's own functions and shared layers never change without CloudFormation.
    if (!artifact?.digest || getDeploymentBucketObjectType(artifact.name) !== 'user-lambda') return s3Key;
    const targetKey = buildLambdaS3Key(artifact.name, newVersion, artifact.digest);
    copies.push(awsSdkManager.s3.copyObject({ bucketName: this.deploymentBucketName, sourceKey: s3Key, targetKey }));
    return targetKey;
  };

  /**
   * The restored template's layer object, or a copy of it under the new release when a function that uses the layer
   * runs a version a fast deployment published: CloudFormation then republishes the layer and gives the functions the
   * new version with their restored code, instead of leaving them on the published version (`needsLayerRepublish`).
   */
  #republishLayerForRelease = ({
    logicalId,
    s3Key,
    template,
    newVersion,
    copies
  }: {
    logicalId: string;
    s3Key: string;
    template: CloudFormationTemplate;
    newVersion: string;
    copies: Promise<unknown>[];
  }) => {
    const layerNumber = sharedLayerNumberOf(logicalId);
    if (layerNumber === undefined) return s3Key;
    const deployedIdentities = Object.entries(template.Resources).flatMap(([functionLogicalName, resource]) =>
      resource.Type === 'AWS::Lambda::Function' &&
      getSharedLayersOfFunctionInTemplate(template, functionLogicalName).has(layerNumber)
        ? [this.#deployedSharedLayerIdentity({ functionLogicalName, layerNumber })]
        : []
    );
    const identity = sharedLayerIdentity(s3Key);
    if (
      !needsLayerRepublish({ identity, cfnIdentity: this.#cfnSharedLayerIdentity(layerNumber), deployedIdentities })
    ) {
      return s3Key;
    }
    const targetKey = buildRepublishedLayerS3Key(s3Key, newVersion);
    copies.push(awsSdkManager.s3.copyObject({ bucketName: this.deploymentBucketName, sourceKey: s3Key, targetKey }));
    return targetKey;
  };

  #tagImageForRelease = ({
    imageUri,
    newVersion,
    copies
  }: {
    imageUri: string;
    newVersion: string;
    copies: Promise<unknown>[];
  }) => {
    if (!imageUri.startsWith(`${this.repositoryUrl}:`)) return imageUri;
    const sourceTag = imageUri.slice(this.repositoryUrl.length + 1);
    const { jobName, digest } = parseImageTag(sourceTag);
    const targetTag = getEcrImageTag(jobName, newVersion, digest);
    copies.push(awsSdkManager.ecr.tagImage({ repositoryName: this.repositoryName, sourceTag, targetTag }));
    return getEcrImageUrl(this.repositoryUrl, targetTag);
  };

  verifyArtifactsForVersion = async (targetVersion: string) => {
    // Verify CF template exists
    const cfTemplateKey = getCfTemplateS3Key(targetVersion);
    const cfTemplateExists = this.previousObjects.some((obj) => obj.s3Key === cfTemplateKey);
    if (!cfTemplateExists) {
      throw new ExpectedError(
        'STACK',
        `CloudFormation template for version ${targetVersion} not found at s3://${this.deploymentBucketName}/${cfTemplateKey}`,
        'The template may have been cleaned up. Check your previousVersionsToKeep setting.'
      );
    }

    /*
     * Check what the target template asks for against what is actually there.
     *
     * This used to filter the live listing for the target version and then assert each of those entries
     * was in that same listing — always true, so a rollback to a version whose artifacts had been
     * cleaned up passed verification and then failed inside CloudFormation. Layers were not looked at
     * at all, and they are the ones retention is most likely to have removed: a layer key's version
     * segment is a content hash, so the "keep the newest N" window orders them by hash, not by age.
     *
     * Reading the template is what makes this a real check: it names every artifact the rollback will
     * try to create, including ones this deployment never produced.
     */
    const template = await this.getTemplate({ version: targetVersion });
    const availableS3Keys = new Set(this.previousObjects.map((obj) => obj.s3Key));
    const availableImageUris = new Set(
      this.previousImages.flatMap(({ tag, dockerDigest }) => [
        ...(tag ? [getEcrImageUrl(this.repositoryUrl, tag)] : []),
        ...(dockerDigest ? [`${this.repositoryUrl}@${dockerDigest}`] : [])
      ])
    );

    const missingS3Keys = new Set<string>();
    const missingImages = new Set<string>();
    const restoredDrainImages = new Map<string, boolean>();
    for (const [logicalId, resource] of Object.entries(template.Resources ?? {})) {
      const properties = (resource as { Properties?: Record<string, unknown> }).Properties ?? {};
      // Lambda code, layer content and anything else pointing into the deployment bucket.
      for (const source of [properties.Code, properties.Content] as { S3Bucket?: string; S3Key?: string }[]) {
        if (source?.S3Bucket === this.deploymentBucketName && source.S3Key && !availableS3Keys.has(source.S3Key)) {
          missingS3Keys.add(source.S3Key);
        }
      }
      const isMissingImage = (imageUri: unknown): imageUri is string =>
        typeof imageUri === 'string' &&
        (imageUri.startsWith(`${this.repositoryUrl}:`) || imageUri.startsWith(`${this.repositoryUrl}@`)) &&
        !availableImageUris.has(imageUri);
      const lambdaImage = (properties.Code as { ImageUri?: unknown } | undefined)?.ImageUri;
      if (isMissingImage(lambdaImage)) missingImages.add(lambdaImage);

      for (const container of (properties.ContainerDefinitions as { Name?: string; Image?: unknown }[] | undefined) ??
        []) {
        const imageUri = container.Image;
        if (!isMissingImage(imageUri)) continue;
        const drainDigest = Object.values(CLOUD_MAP_DRAIN_IMAGES).find(
          (digest) => imageUri === `${this.repositoryUrl}@${digest}`
        );
        if (drainDigest && !restoredDrainImages.has(imageUri)) {
          try {
            await awsSdkManager.ecr.copyPublicImage({
              repositoryName: this.repositoryName,
              sourceRepository: 'docker/library/busybox',
              digest: drainDigest,
              tag: cloudMapDrainImageTag(drainDigest)
            });
            restoredDrainImages.set(imageUri, true);
          } catch (error) {
            restoredDrainImages.set(imageUri, false);
            tuiManager.warn(`Could not restore pinned drain image ${imageUri}: ${error}`);
          }
        }
        if (restoredDrainImages.get(imageUri)) continue;
        const services = Object.entries(template.Resources ?? {}).flatMap(([serviceId, service]) => {
          if (service.Type !== 'AWS::ECS::Service') return [];
          const serviceProperties = service.Properties as
            | { TaskDefinition?: unknown; ServiceName?: unknown }
            | undefined;
          const taskDefinition = serviceProperties?.TaskDefinition;
          return typeof taskDefinition === 'object' &&
            taskDefinition !== null &&
            'Ref' in taskDefinition &&
            taskDefinition.Ref === logicalId
            ? [typeof serviceProperties?.ServiceName === 'string' ? serviceProperties.ServiceName : serviceId]
            : [];
        });
        // ECS can register a dormant task definition, and EC2 hosts may still have this image cached.
        tuiManager.warn(
          `Rollback service ${services.join(', ') || logicalId}, container ${container.Name ?? '(unnamed)'}: image ${imageUri} is missing from this stack's image repository. New tasks that need to pull this image will fail to start. Continuing rollback; dormant services or EC2 hosts with cached images may still succeed.`
        );
      }
    }

    if (missingS3Keys.size > 0 || missingImages.size > 0) {
      throw new ExpectedError(
        'STACK',
        `Version ${targetVersion} cannot be restored: ${[...missingS3Keys, ...missingImages].join(', ')} ${missingS3Keys.size + missingImages.size === 1 ? 'is' : 'are'} no longer in this stack's deployment bucket or image repository.`,
        'Those artifacts may have been removed by retention or deleted manually. Raise `deploymentConfig.previousVersionsToKeep` to keep more, and roll back to a version that is still complete.'
      );
    }
  };

  saveBucketSyncManifest = async (version: string) => {
    if (!configManager.allBucketsToSync.length) return;

    const manifest: Record<string, { versionId: string; key: string }[]> = {};

    for (const { bucketName } of configManager.allBucketsToSync) {
      try {
        const versionedObjects = await awsSdkManager.s3.listObjectVersions(bucketName);
        // Get only the latest (current) version of each object
        manifest[bucketName] = versionedObjects
          .filter((obj: any) => obj.IsLatest)
          .map((obj: any) => ({ versionId: obj.VersionId, key: obj.Key }));
      } catch {
        tuiManager.debug(`Could not list versioned objects in ${bucketName} for manifest`);
      }
    }

    const manifestKey = `bucket-sync-manifest/${version}.json`;
    try {
      await awsSdkManager.s3.putObject({
        bucketName: this.deploymentBucketName,
        s3Key: manifestKey,
        body: JSON.stringify(manifest),
        contentType: 'application/json'
      });
    } catch {
      tuiManager.debug('Could not save bucket sync manifest');
    }
  };

  restoreBucketSyncFromManifest = async (targetVersion: string) => {
    const manifestKey = `bucket-sync-manifest/${targetVersion}.json`;

    let manifestJson: string;
    try {
      manifestJson = await awsSdkManager.s3.getObjectText({
        bucketName: this.deploymentBucketName,
        s3Key: manifestKey
      });
    } catch {
      tuiManager.debug(`No bucket-sync manifest found for ${targetVersion}. Skipping content restore.`);
      return;
    }

    const manifest: Record<string, { versionId: string; key: string }[]> = JSON.parse(manifestJson);

    for (const [bucketName, objects] of Object.entries(manifest)) {
      if (!objects.length) continue;

      const spinner = tuiManager.createSpinner({ text: `Restoring synced content for ${bucketName}` });
      try {
        // Copy each object's old version to become the current version
        for (const { key, versionId } of objects) {
          await awsSdkManager.s3.restoreObjectVersion({
            bucketName,
            key,
            versionId
          });
        }

        // Delete objects that exist now but were not in the manifest (files added after the target version)
        const currentObjects = await awsSdkManager.s3.listObjects(bucketName);
        const manifestKeys = new Set(objects.map((o) => o.key));
        const toDelete = currentObjects.filter((obj: any) => !manifestKeys.has(obj.Key));
        if (toDelete.length) {
          await awsSdkManager.s3.deleteObjects(
            bucketName,
            toDelete.map((obj: any) => ({ Key: obj.Key }))
          );
        }

        spinner.success({ text: `Restored synced content for ${bucketName}` });
      } catch (error) {
        spinner.error(`Failed to restore synced content for ${bucketName}`);
        throw error;
      }
    }
  };
}

export const deploymentArtifactManager = compose(
  skipInitIfInitialized,
  cancelablePublicMethods
)(new DeploymentArtifactManager());
