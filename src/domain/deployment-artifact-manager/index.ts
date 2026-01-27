import type { ImageIdentifier } from '@aws-sdk/client-ecr';
import type { _Object, ObjectIdentifier } from '@aws-sdk/client-s3';
import { eventManager } from '@application-services/event-manager';
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
import { packagingManager } from '@domain-services/packaging-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { fsPaths } from '@shared/naming/fs-paths';
import {
  buildLambdaS3Key,
  getBaseS3EndpointForRegion,
  getCfTemplateS3Key,
  getCloudformationTemplateUrl,
  getEcrImageTag,
  getEcrImageUrl,
  getEcrRepositoryUrl,
  getStpTemplateS3Key
} from '@shared/naming/utils';
import { dockerLogin, pushDockerImage, tagDockerImage } from '@shared/utils/docker';
import { processConcurrently } from '@shared/utils/misc';
import { parseYaml } from '@shared/utils/yaml';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { ExpectedError } from '@utils/errors';
import { getHotSwapDeployVersionString } from '@utils/versioning';
import { getDeploymentBucketObjectType, parseBucketObjectS3Key, parseImageTag } from './utils';

export class DeploymentArtifactManager {
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
  previouslyUploadedLambdaS3KeysUsedInDeployment: string[] = [];
  previouslyUploadedImageTagsUsedInDeployment: string[] = [];
  uploadedLayerS3Keys: Map<number, string> = new Map(); // layerNumber -> s3Key

  getLambdasToUpload({ hotSwapDeploy }: { hotSwapDeploy: boolean }) {
    return configManager.allLambdasToUpload
      .map((lambda) => {
        const s3UploadInfo = this.getLambdaS3UploadInfo({
          artifactName: lambda.artifactName,
          packaging: lambda.packaging,
          hotSwapDeploy
        });
        // Skip if no artifact path (lambda wasn't packaged, e.g., in dev mode for some resources)
        if (!s3UploadInfo.artifactPath) {
          return null;
        }
        if (s3UploadInfo.alreadyUploaded) {
          this.previouslyUploadedLambdaS3KeysUsedInDeployment.push(s3UploadInfo.s3Key);
          return null;
        }
        return s3UploadInfo;
      })
      .filter(Boolean);
  }

  getImagesToUpload({ hotSwapDeploy }: { hotSwapDeploy: boolean }) {
    return configManager.allContainersRequiringPackaging
      .map((container) => {
        const imageUploadInfo = this.getImageUploadInfoForJob({ jobName: container.jobName, hotSwapDeploy });
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
    stackActionType,
    parentEventType
  }: {
    globallyUniqueStackHash: string;
    accountId: string;
    stackActionType?: StackActionType;
    /** Optional parent event for grouping (e.g., LOAD_METADATA_FROM_AWS) */
    parentEventType?: LoggableEventType;
  }) => {
    this.deploymentBucketName = awsResourceNames.deploymentBucket(globallyUniqueStackHash);
    this.repositoryName = awsResourceNames.deploymentEcrRepo(globallyUniqueStackHash);
    this.repositoryUrl = getEcrRepositoryUrl(accountId, globalStateManager.region, this.repositoryName);
    await this.loginToEcr();
    // Skip artifact lookup for create (nothing to look up) and dev (running locally)
    if (stackActionType && stackActionType !== 'create' && stackActionType !== 'dev') {
      await eventManager.startEvent({
        eventType: 'FETCH_PREVIOUS_ARTIFACTS',
        description: 'Fetching previous deployment artifacts',
        parentEventType,
        instanceId: parentEventType ? 'previous-artifacts' : undefined
      });
      await Promise.all([
        this.loadPreviousBucketObjects(this.deploymentBucketName, stackActionType),
        this.loadPreviousImages(this.repositoryName, stackActionType)
      ]);
      await eventManager.finishEvent({
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
    return getCloudformationTemplateUrl(this.deploymentBucketName, globalStateManager.region, stackManager.nextVersion);
  }

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

  getImageUrlForJob = ({ tag }: { tag: string }) => {
    return getEcrImageUrl(this.repositoryUrl, tag); // hotSwapDeploy
  };

  getLambdaS3UploadInfo = ({
    artifactName,
    hotSwapDeploy,
    packaging
  }: {
    artifactName: string;
    hotSwapDeploy?: boolean;
    packaging: HelperLambdaPackaging | LambdaPackaging;
  }) => {
    if (packaging.type === 'helper-lambda') {
      return this.#getHelperLambdaS3UploadInfo({ artifactName, packaging });
    }
    return this.#getUserLambdaS3UploadInfo({ name: artifactName, hotSwapDeploy });
  };

  getImageUploadInfoForJob = ({ jobName, hotSwapDeploy }: { jobName: string; hotSwapDeploy?: boolean }) => {
    const packagingOutput = packagingManager.getPackagingOutputForJob(jobName);
    if (!packagingOutput) {
      return null;
    }
    const { skipped, digest } = packagingOutput;
    const tag = skipped
      ? this.previousImages
          .filter(({ name }) => name === jobName)
          .sort(({ version: v1 }, { version: v2 }) => v2.localeCompare(v1))
          .find((img) => img.digest === digest && img.name === jobName).tag
      : getEcrImageTag(jobName, hotSwapDeploy ? getHotSwapDeployVersionString() : stackManager.nextVersion, digest);

    const imageTagWithUrl = this.getImageUrlForJob({ tag });

    return { tag, jobName, alreadyDeployed: skipped, imageTagWithUrl };
  };

  #getUserLambdaS3UploadInfo = ({ name, hotSwapDeploy }: { name: string; hotSwapDeploy?: boolean }) => {
    const packagingOutput = packagingManager.getPackagingOutputForJob(name);
    if (!packagingOutput) {
      return { artifactName: name, artifactPath: null, digest: null, s3Key: null, alreadyUploaded: null };
    }
    const { artifactPath, digest, skipped } = packagingOutput;
    const s3Key = skipped
      ? this.previousObjects
          .filter(({ name: artifactName }) => name === artifactName)
          .sort(({ version: v1 }, { version: v2 }) => v2.localeCompare(v1))
          .find(({ digest: existingArtifactDigest }) => existingArtifactDigest === digest)?.s3Key
      : buildLambdaS3Key(name, hotSwapDeploy ? getHotSwapDeployVersionString() : stackManager.nextVersion, digest);

    return {
      artifactName: name,
      artifactPath,
      digest,
      s3Key,
      alreadyUploaded: skipped
    };
  };

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
    const childLogger = eventManager.createChildLogger({
      instanceId: shortName || bucketName,
      parentEventType: 'SYNC_BUCKET'
    });
    await childLogger.startEvent({ eventType: 'UPLOAD_BUCKET_CONTENT', description: 'Uploading content' });
    const syncStats = await awsSdkManager.syncDirectoryIntoBucket({
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
    await childLogger.finishEvent({ eventType: 'UPLOAD_BUCKET_CONTENT', data: syncStats });
  };

  // this is ran when the stack is rolled back
  deleteArtifactsRollbackedDeploy = async () => {
    // we are deleting all artifacts of specific version:
    // 1. all objects/images/templates which were uploaded during this attempt
    // 2. all previous objects/images which are in the same version as the stack version for current (failed) attempt
    //    - there could have been multiple failed updates which created new artifacts with same version (but different digest)
    await eventManager.startEvent({
      eventType: 'DELETE_OBSOLETE_ARTIFACTS',
      description: 'Deleting obsolete artifacts.'
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
    await eventManager.finishEvent({
      eventType: 'DELETE_OBSOLETE_ARTIFACTS',
      data: {}
    });
  };

  // this is ran after a stack which was in UPDATE_FAILED state gets successfully updated
  deleteArtifactsFixedDeploy = async () => {
    await eventManager.startEvent({
      eventType: 'DELETE_OBSOLETE_ARTIFACTS',
      description: 'Deleting obsolete artifacts.'
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
              !this.previouslyUploadedLambdaS3KeysUsedInDeployment.includes(s3Key)
          )
          .map(({ s3Key }) => s3Key)
      )
    ]);
    await eventManager.finishEvent({
      eventType: 'DELETE_OBSOLETE_ARTIFACTS',
      data: {}
    });
  };

  getObsoleteItems = <T extends { version: string; name: string; s3Key?: string; tag?: string }>(
    previousItems: T[]
  ): T[] => {
    return previousItems
      .map((previousItem) => {
        const sortedVersions = previousItems
          .filter((item) => item.version && item.name === previousItem.name)
          .map((item) => item.version)
          .sort();

        const wasSameNameItemUploadedDuringCurrentDeployment = Boolean(
          (previousItem.tag && this.successfullyUploadedImages.find((img) => img.name === previousItem.name)) ||
          (previousItem.s3Key && this.successfullyCreatedObjects.find((obj) => obj.name === previousItem.name))
        );
        const isItemUsedInCurrentDeployment = Boolean(
          (previousItem.tag &&
            (this.previouslyUploadedImageTagsUsedInDeployment.includes(previousItem.tag) ||
              this.successfullyUploadedImages.find(({ tag }) => tag === previousItem.tag))) ||
          (previousItem.s3Key &&
            (this.previouslyUploadedLambdaS3KeysUsedInDeployment.includes(previousItem.s3Key) ||
              this.successfullyCreatedObjects.find(({ s3Key }) => s3Key === previousItem.s3Key)))
        );

        const versionsToKeep = sortedVersions.slice(
          Math.max(
            sortedVersions.length -
              this.maxArtifactVersionsToKeep +
              (wasSameNameItemUploadedDuringCurrentDeployment ? 1 : 0),
            0
          )
        );
        return versionsToKeep.includes(previousItem.version) || isItemUsedInCurrentDeployment ? null : previousItem;
      })
      .filter(Boolean);
  };

  deleteAllObsoleteArtifacts = async () => {
    const obsoleteImages = this.getObsoleteItems(this.previousImages);
    const obsoleteObjects = this.getObsoleteItems(this.previousObjects);
    if (obsoleteImages.length || obsoleteObjects.length) {
      await eventManager.startEvent({
        eventType: 'DELETE_OBSOLETE_ARTIFACTS',
        description: 'Deleting obsolete artifacts.'
      });
      await Promise.all([
        this.deleteImagesFromEcrRepo(
          obsoleteImages.filter((img) => img.tag).map((img) => img.tag),
          // for deleting untagged images
          obsoleteImages.filter(({ tag }) => !tag).map(({ dockerDigest }) => dockerDigest)
        ),
        this.deleteObjectsFromDeploymentBucket(obsoleteObjects.map((obj) => obj.s3Key))
      ]);
      await eventManager.finishEvent({
        eventType: 'DELETE_OBSOLETE_ARTIFACTS',
        data: { obsoleteImages, obsoleteObjects }
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

  uploadAllArtifacts = async ({ useHotswap }: { useHotswap: boolean }) => {
    const jobs: (() => Promise<any>)[] = [];

    if (!useHotswap) {
      jobs.push(() => this.uploadCloudFormationTemplate());
      jobs.push(() => this.uploadStacktapeTemplate());
    }

    this.getLambdasToUpload({ hotSwapDeploy: useHotswap }).forEach(({ artifactName, artifactPath, s3Key }) => {
      jobs.push(() => {
        return this.uploadLambda({
          artifactName,
          artifactPath,
          s3Key
        });
      });
    });
    this.getImagesToUpload({ hotSwapDeploy: useHotswap }).forEach(({ jobName, tag, imageTagWithUrl }) => {
      jobs.push(() => {
        return this.uploadImage({
          tag,
          jobName,
          imageTagWithUrl
        });
      });
    });

    // Publish shared Lambda layer if one was built
    if (packagingManager.getPendingSharedLayer()) {
      jobs.push(() => this.uploadSharedLayer());
    }

    if (jobs.length) {
      await eventManager.startEvent({
        eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
        description: 'Uploading deployment artifacts'
      });

      await Promise.all([
        // on some occasions i started getting "NoSuchBucket: The specified bucket does not exist" when creating fresh stacks
        // this waiting should prevent it (and lose no time otherwise)
        // Note: S3 bucket creation can take up to 30-60 seconds due to eventual consistency
        awsSdkManager.waitForBucketExists({ bucketName: this.deploymentBucketName, maxTime: 60 })
      ]);

      await processConcurrently(jobs, DEFAULT_MAXIMUM_PARALLEL_ARTIFACT_UPLOADS);
      await eventManager.finishEvent({
        eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
        data: { images: this.successfullyUploadedImages, objects: this.successfullyCreatedObjects }
      });
    } else {
      await eventManager.startEvent({
        eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
        description: 'No artifacts to upload'
      });
      await eventManager.finishEvent({
        eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
        finalMessage: 'All artifacts already deployed.'
      });
    }
  };

  syncBuckets = async () => {
    await eventManager.startEvent({ eventType: 'SYNC_BUCKET', description: 'Syncing directories into buckets' });
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
    await eventManager.finishEvent({ eventType: 'SYNC_BUCKET', data: { syncedDirs: configManager.allBucketsToSync } });
  };

  deleteAllArtifacts = async () => {
    await eventManager.startEvent({
      eventType: 'DELETE_ARTIFACTS',
      description: 'Deleting all deployment artifacts'
    });
    const nonEmptyBuckets = Object.entries(await this.getBucketsContent()).filter(
      ([_bucketName, objects]) => objects.length
    );
    let emptyBucketsPromises = [];
    if (nonEmptyBuckets.length) {
      emptyBucketsPromises = nonEmptyBuckets.map(async ([bucketName, objects]) => {
        await awsSdkManager.batchDeleteObjects(bucketName, objects as ObjectIdentifier[]);
        // after first delete, we need to list all versions (including delete markers) and delete them
        const versionedObjects = await awsSdkManager.listAllVersionedObjectsInBucket(bucketName);
        return awsSdkManager.batchDeleteObjects(bucketName, versionedObjects as ObjectIdentifier[]);
      });
    }

    const [deletedImages, deletedObjects] = await Promise.all([
      this.deleteAllImages(),
      this.deleteAllObjects(),
      ...emptyBucketsPromises
      // this.emptyAllAutoSyncedUserBuckets()
    ]);
    await eventManager.finishEvent({
      eventType: 'DELETE_ARTIFACTS',
      data: { deletedImages, deletedObjects }
    });
  };

  deleteAllObjects = async () => {
    await this.deleteObjectsFromDeploymentBucket(this.previousObjects.map((obj) => obj.s3Key));
    return this.previousObjects;
  };

  deleteAllImages = async () => {
    await this.deleteImagesFromEcrRepo(
      [],
      this.previousImages.map((image) => image.dockerDigest)
    );
    return this.previousImages;
  };

  getTemplate = async ({ version }: { version: string }): Promise<CloudformationTemplate> => {
    const template = await awsSdkManager.getFromBucket({
      bucketName: this.deploymentBucketName,
      s3Key: getCfTemplateS3Key(version || stackManager.lastVersion)
    });

    return parseYaml(template);
  };

  loadPreviousBucketObjects = async (deploymentBucketName: string, stackActionType: StackActionType) => {
    let objects: _Object[];
    try {
      objects = await awsSdkManager.listAllObjectsInBucket(deploymentBucketName);
    } catch (err) {
      if (stackActionType === 'delete' && err.toString().includes('NoSuchBucket')) {
        tuiManager.debug(`Deployment bucket ${deploymentBucketName} not found; skipping artifact load.`);
        return;
      }
      throw err;
    }
    objects.forEach((object) => {
      const s3Key = object.Key;
      const { digest, name, version } = parseBucketObjectS3Key(s3Key);
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
      imagesInRepo = await awsSdkManager.listAllImagesInEcrRepo(repositoryName);
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

  loginToEcr = async () => {
    const loginDetails = await awsSdkManager.getEcrAuthDetails();
    await dockerLogin(loginDetails);
  };

  deleteImagesFromEcrRepo = (imageTags: string[], imageDigests: string[]) => {
    if (imageDigests.length || imageTags.length) {
      return awsSdkManager.batchDeleteImages(this.repositoryName, imageTags, imageDigests);
    }
  };

  uploadToDeploymentBucket = async ({
    artifactPath,
    s3Key,
    contentType,
    artifactName,
    metadata
  }: {
    artifactPath: string;
    s3Key: string;
    artifactName: string;
    contentType: string;
    metadata?: { [key: string]: string };
  }) => {
    const upload = async (useS3Acceleration?: boolean) => {
      await awsSdkManager.uploadToBucket({
        s3Key,
        filePath: artifactPath,
        bucketName: this.deploymentBucketName,
        contentType,
        useS3Acceleration: useS3Acceleration ?? configManager.deploymentConfig.disableS3TransferAcceleration !== true,
        metadata
      });
    };

    try {
      await upload();
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      if (errMessage.includes('NoSuchBucket')) {
        await awsSdkManager.waitForBucketExists({ bucketName: this.deploymentBucketName, maxTime: 60 });
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
        return await awsSdkManager.batchDeleteObjects(
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
    const uploadLogger = eventManager.createChildLogger({
      parentEventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
      instanceId: isHelperLambda ? `${artifactName} (stacktape internal)` : artifactName
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
      await uploadLogger.finishEvent({ eventType: 'UPLOAD_PACKAGE' });
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
    const uploadLogger = eventManager.createChildLogger({
      parentEventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
      instanceId: jobName
    });
    await uploadLogger.startEvent({ eventType: 'UPLOAD_IMAGE', description: 'Uploading image' });
    await tagDockerImage(jobName, imageTagWithUrl);
    await pushDockerImage(imageTagWithUrl);
    this.successfullyUploadedImages.push({ tag, name: jobName });
    await uploadLogger.finishEvent({ eventType: 'UPLOAD_IMAGE' });
    return { jobName, imageTagWithUrl };
  };

  uploadSharedLayer = async () => {
    // Skip if no pending layers
    const pendingLayer = packagingManager.getPendingSharedLayer();
    if (!pendingLayer) {
      return;
    }

    const layerArtifacts = packagingManager.getLayerArtifacts();
    if (layerArtifacts.length === 0) {
      return;
    }

    // Check which layers already exist in S3 (content-hash based caching)
    const existingS3Keys = new Set(this.previousObjects.map((obj) => obj.s3Key));
    const layersToUpload = layerArtifacts.filter((layer) => !existingS3Keys.has(layer.s3Key));
    const cachedLayers = layerArtifacts.filter((layer) => existingS3Keys.has(layer.s3Key));

    // Mark cached layers as uploaded (they already exist in S3)
    for (const layer of cachedLayers) {
      this.uploadedLayerS3Keys.set(layer.layerNumber, layer.s3Key);
    }

    // If all layers are cached, skip upload entirely
    if (layersToUpload.length === 0) {
      return;
    }

    const uploadLogger = eventManager.createChildLogger({
      parentEventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
      instanceId: 'shared-lambda-layers'
    });
    await uploadLogger.startEvent({
      eventType: 'UPLOAD_SHARED_LAYER',
      description: `Uploading ${layersToUpload.length} shared layer(s)${cachedLayers.length > 0 ? ` (${cachedLayers.length} cached)` : ''}`
    });

    try {
      // Zip only the layers that need uploading
      await packagingManager.publishSharedLayer();

      // Upload each layer to S3 using the S3 key computed during packaging
      for (const layer of layersToUpload) {
        const zipPath = `${layer.layerPath}.zip`;
        // Use the S3 key computed during packaging (ensures consistency with CF template)
        const s3Key = layer.s3Key;

        await awsSdkManager.uploadToBucket({
          s3Key,
          filePath: zipPath,
          bucketName: this.deploymentBucketName
        });

        this.uploadedLayerS3Keys.set(layer.layerNumber, s3Key);
        this.successfullyCreatedObjects.push({
          s3Key,
          name: `shared-layer-${layer.layerNumber}`
        });
      }

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
          objectsToRemove[bucketName] = await awsSdkManager.listAllObjectsInBucket(bucketName);
          // even if there are no regular objects, there can be some old versions (delete markers), which would fail bucket deletion as well
          // we only check for versioned objects to ensure the bucket is truly empty. We will still need to do list versioned objects after
          // the delete of regular objects, as that can create new delete markers, etc
          if (!objectsToRemove[bucketName].length) {
            objectsToRemove[bucketName] = await awsSdkManager.listAllVersionedObjectsInBucket(bucketName);
          }
          return bucketName;
        })
    );
    return objectsToRemove;
  };

  getExistingDigestsForJob = (jobName: string) => {
    return [...this.previousImages, ...this.previousObjects]
      .filter(({ name }) => {
        return name === jobName; // && version !== getHotSwapDeployVersionString();
      })
      .map(({ digest }) => digest);
  };
}

export const deploymentArtifactManager = compose(
  skipInitIfInitialized,
  cancelablePublicMethods
)(new DeploymentArtifactManager());
