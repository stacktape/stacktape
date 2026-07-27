import { isAbsolute, join } from 'node:path';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { notificationManager } from '@domain-services/notification-manager';
import { stpErrors } from '@errors';
import { isDirAccessible } from '@shared/utils/fs-utils';
import { getCloudformationChildResources } from '@shared/utils/stack-info-map';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { initializeStackServicesForWorkingWithDeployedStack, loadUserCredentials } from '../_utils/initialization';

export const commandBucketSync = async () => {
  validateInputs();

  if (!globalStateManager.args.bucketId) {
    await initializeStackServicesForWorkingWithDeployedStack({
      commandModifiesStack: false,
      commandRequiresConfig: true
    });
  } else {
    await loadUserCredentials();
  }

  const bucketName = getBucketName();
  const absoluteSourcePath = getDirectoryPath();
  const prettyDirPath = tuiManager.prettyFilePath(absoluteSourcePath);

  await notificationManager.sendDeploymentNotification({
    message: { text: `Syncing ${prettyDirPath} to bucket ${bucketName} (deletes removed files).`, type: 'progress' }
  });

  await eventManager.startEvent({
    eventType: 'SYNC_BUCKET',
    description: `Syncing ${prettyDirPath} to ${bucketName}`
  });
  let lastProgressPercent = null;
  const stats = await awsSdkManager.syncDirectoryIntoBucket({
    bucketName,
    uploadConfiguration: {
      directoryPath: absoluteSourcePath,
      headersPreset: getHeadersPreset(),
      excludeFilesPatterns: getSkipFilesConfig(),
      fileOptions: getFilterFilesConfig(),
      disableS3TransferAcceleration: getIsS3TransferAccelerationDisabled()
    },
    onProgress: async ({ progressPercent }) => {
      if (progressPercent !== lastProgressPercent && !Number.isNaN(Number(progressPercent))) {
        await eventManager.updateEvent({
          eventType: 'SYNC_BUCKET',
          additionalMessage: `${progressPercent}%`
        });
        lastProgressPercent = progressPercent;
      }
    },
    deleteRemoved: true
  });
  await eventManager.finishEvent({
    eventType: 'SYNC_BUCKET',
    data: stats,
    finalMessage: `Files deleted from bucket: ${stats.deleteAmount}. Total files in destination bucket: ${stats.filesFound}.`
  });

  if (globalStateManager.args.invalidateCdnCache) {
    const connectedCloudfrontDistributions = await awsSdkManager.getCloudfrontDistributionForBucketName({ bucketName });
    if (connectedCloudfrontDistributions.length) {
      await eventManager.startEvent({ eventType: 'INVALIDATE_CACHE', description: 'Invalidating CDN caches' });
      await Promise.all(
        connectedCloudfrontDistributions.map((distribution) =>
          awsSdkManager.invalidateCloudfrontDistributionCache({
            distributionId: distribution.Id,
            invalidatePaths: ['/*']
          })
        )
      );
      await eventManager.finishEvent({
        eventType: 'INVALIDATE_CACHE',
        finalMessage: 'Invalidation has started but it might take few seconds until all edge locations are invalidated.'
      });
    }
  }

  if (!globalStateManager.args.bucketId) {
    deployedStackOverviewManager.printResourceInfo([globalStateManager.args.resourceName]);
  }
  await notificationManager.sendDeploymentNotification({
    message: { text: `Synced ${prettyDirPath} to bucket ${bucketName}.`, type: 'success' }
  });

  return null;
};

const validateInputs = () => {
  const { stage, resourceName, bucketId, sourcePath } = globalStateManager.args;
  const combinesWrongOptions = (stage || resourceName) && bucketId;
  const missesAllOptions = !stage && !resourceName && !bucketId;
  const missesOptionsForSyncFromConfig = (stage && !resourceName) || (resourceName && !stage);
  const missesOptionsForSyncUsingBucketId = (bucketId && !sourcePath) || (sourcePath && !bucketId);
  if (combinesWrongOptions || missesOptionsForSyncFromConfig || missesOptionsForSyncUsingBucketId || missesAllOptions) {
    throw stpErrors.e12({});
  }
};

const getBucketName = () => {
  if (globalStateManager.args.bucketId) {
    return globalStateManager.args.bucketId;
  }
  const resource = deployedStackOverviewManager.getStpResource({ nameChain: globalStateManager.args.resourceName });
  if (!resource) {
    throw stpErrors.e77({
      stackName: globalStateManager.targetStack.stackName,
      resourceName: globalStateManager.args.resourceName
    });
  }
  const [cfLogicalName] = Object.entries(getCloudformationChildResources({ resource })).find(
    ([_cfLogicalName, { cloudformationResourceType }]) => cloudformationResourceType === 'AWS::S3::Bucket'
  );
  const bucketCfResourceInfo = stackManager.existingStackResources.find(
    (cfRes) => cfRes.LogicalResourceId === cfLogicalName
  );
  return bucketCfResourceInfo.PhysicalResourceId;
};

const getDirectoryPath = () => {
  const { sourcePath, resourceName } = globalStateManager.args;
  let res: string;
  if (sourcePath) {
    res = isAbsolute(sourcePath) ? sourcePath : join(process.cwd(), sourcePath);
  } else {
    const { directoryPath } = configManager.allBuckets.find((bucket) => bucket.name === resourceName).directoryUpload;
    res = join(globalStateManager.workingDir, directoryPath);
  }
  if (!isDirAccessible(res)) {
    throw stpErrors.e13({ directoryPath: res });
  }
  return res;
};

const getHeadersPreset = () => {
  const { headersPreset, resourceName } = globalStateManager.args;
  if (headersPreset) {
    return headersPreset;
  }
  return resourceName
    ? configManager?.allBuckets?.find((bucket) => bucket.name === resourceName)?.directoryUpload?.headersPreset
    : undefined;
};

const getSkipFilesConfig = () => {
  const { resourceName } = globalStateManager.args;
  return resourceName
    ? configManager?.allBuckets?.find((bucket) => bucket.name === resourceName)?.directoryUpload?.excludeFilesPatterns
    : undefined;
};

const getFilterFilesConfig = () => {
  const { resourceName } = globalStateManager.args;
  return resourceName
    ? configManager?.allBuckets?.find((bucket) => bucket.name === resourceName)?.directoryUpload?.fileOptions
    : undefined;
};

const getIsS3TransferAccelerationDisabled = () => {
  const { resourceName } = globalStateManager.args;
  const disabledInConfig =
    resourceName &&
    configManager.allBuckets.find((bucket) => bucket.name === resourceName)?.directoryUpload
      ?.disableS3TransferAcceleration;

  const disabledInRegion = !configManager.isS3TransferAccelerationAvailableInDeploymentRegion;

  return disabledInConfig || disabledInRegion;
};
