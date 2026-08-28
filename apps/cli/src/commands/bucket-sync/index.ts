import type { StacktapeCliArgs } from 'src/config/cli/types';
import type { StackContext } from '@domain-services/stack-context';
import type { SupportedAWSRegion as AWSRegion } from '@stacktape/config/aws-regions';
import type { AwsCloudFront } from 'src/aws/cloudfront';
import type { AwsS3 } from 'src/aws/s3';
import { isAbsolute, join } from 'node:path';
import { operationReporter } from '@application-services/operation-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { deployedResourceNotFoundError } from '@domain-services/deployed-stack-overview-manager/errors';
import { notificationManager } from '@domain-services/notification-manager';
import { isDirAccessible } from '@utils/fs-utils';
import { CliError } from '@utils/errors';
import { getCloudformationChildResources } from '@utils/stack-info-map';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { isTransferAccelerationEnabledInRegion } from 'src/aws/buckets';
import { initializeStackServicesForWorkingWithDeployedStack, loadUserCredentials } from '../_utils/initialization';

type BucketSyncTarget =
  | { kind: 'bucket-id'; initialization: 'credentials-only'; bucketName: string }
  | { kind: 'stack-resource'; initialization: 'deployed-stack'; resourceName: string };

type BucketSyncInput =
  | Readonly<
      Extract<BucketSyncTarget, { kind: 'bucket-id' }> & {
        args: Readonly<StacktapeCliArgs>;
        region: AWSRegion;
      }
    >
  | Readonly<
      Extract<BucketSyncTarget, { kind: 'stack-resource' }> & {
        args: Readonly<StacktapeCliArgs>;
        stackContext: StackContext;
      }
    >;

type BucketSyncExecutionServices = {
  cloudFront: Pick<AwsCloudFront, 'findDistributionsForBucket' | 'invalidateCache'>;
  event: Pick<typeof operationReporter, 'finishEvent' | 'startEvent' | 'updateEvent'>;
  notification: Pick<typeof notificationManager, 'sendDeploymentNotification'>;
  s3: Pick<AwsS3, 'syncDirectory'>;
};

type BucketSyncCommandDependencies = {
  getExecutionServices: () => BucketSyncExecutionServices;
  initializeCredentials: typeof loadUserCredentials;
  initializeDeployedStack: typeof initializeStackServicesForWorkingWithDeployedStack;
};

const getDefaultExecutionServices = (): BucketSyncExecutionServices => ({
  cloudFront: awsSdkManager.cloudFront,
  event: operationReporter,
  notification: notificationManager,
  s3: awsSdkManager.s3
});

export const resolveBucketSyncTarget = ({
  bucketId,
  resourceName
}: Pick<StacktapeCliArgs, 'bucketId' | 'resourceName'>): BucketSyncTarget =>
  bucketId
    ? { kind: 'bucket-id', initialization: 'credentials-only', bucketName: bucketId }
    : { kind: 'stack-resource', initialization: 'deployed-stack', resourceName };

export const getDirectBucketSyncUploadConfiguration = ({
  args,
  directoryPath,
  region
}: {
  args: Pick<StacktapeCliArgs, 'headersPreset'>;
  directoryPath: string;
  region: AWSRegion;
}) => ({
  directoryPath,
  headersPreset: args.headersPreset,
  excludeFilesPatterns: undefined,
  fileOptions: undefined,
  disableS3TransferAcceleration: !isTransferAccelerationEnabledInRegion({ region })
});

export const commandBucketSync = async (dependencies: Partial<BucketSyncCommandDependencies> = {}) => {
  const initializeCredentials = dependencies.initializeCredentials ?? loadUserCredentials;
  const initializeDeployedStack =
    dependencies.initializeDeployedStack ?? initializeStackServicesForWorkingWithDeployedStack;
  const args = Object.freeze({ ...globalStateManager.args }) as Readonly<StacktapeCliArgs>;
  validateBucketSyncInput(args);
  const target = resolveBucketSyncTarget(args);

  let input: BucketSyncInput;
  if (target.initialization === 'deployed-stack') {
    const { stackContext } = await initializeDeployedStack({
      commandModifiesStack: false,
      commandRequiresConfig: true
    });
    input = Object.freeze({ ...target, args, stackContext });
  } else {
    const { region } = await initializeCredentials();
    input = Object.freeze({ ...target, args, region });
  }
  const { cloudFront, event, notification, s3 } =
    dependencies.getExecutionServices?.() ?? getDefaultExecutionServices();

  const bucketName = getBucketName(input);
  const absoluteSourcePath = getDirectoryPath(input);
  const prettyDirPath = tuiManager.prettyFilePath(absoluteSourcePath);
  const uploadConfiguration =
    input.kind === 'bucket-id'
      ? getDirectBucketSyncUploadConfiguration({
          args: input.args,
          directoryPath: absoluteSourcePath,
          region: input.region
        })
      : {
          directoryPath: absoluteSourcePath,
          headersPreset: getHeadersPreset(input),
          excludeFilesPatterns: getSkipFilesConfig(input),
          fileOptions: getFilterFilesConfig(input),
          disableS3TransferAcceleration: getIsS3TransferAccelerationDisabled(input)
        };

  await notification.sendDeploymentNotification({
    message: { text: `Syncing ${prettyDirPath} to bucket ${bucketName} (deletes removed files).`, type: 'progress' }
  });

  await event.startEvent({
    eventType: 'SYNC_BUCKET',
    description: `Syncing ${prettyDirPath} to ${bucketName}`
  });
  let lastProgressPercent = null;
  const stats = await s3.syncDirectory({
    bucketName,
    uploadConfiguration,
    onProgress: async ({ progressPercent }) => {
      if (progressPercent !== lastProgressPercent && !Number.isNaN(Number(progressPercent))) {
        await event.updateEvent({
          eventType: 'SYNC_BUCKET',
          additionalMessage: `${progressPercent}%`
        });
        lastProgressPercent = progressPercent;
      }
    },
    deleteRemoved: true
  });
  await event.finishEvent({
    eventType: 'SYNC_BUCKET',
    data: stats,
    finalMessage: `Files deleted from bucket: ${stats.deleteAmount}. Total files in destination bucket: ${stats.filesFound}.`
  });

  if (args.invalidateCdnCache) {
    const connectedCloudfrontDistributions = await cloudFront.findDistributionsForBucket({ bucketName });
    if (connectedCloudfrontDistributions.length) {
      await event.startEvent({ eventType: 'INVALIDATE_CACHE', description: 'Invalidating CDN caches' });
      await Promise.all(
        connectedCloudfrontDistributions.map((distribution) =>
          cloudFront.invalidateCache({
            distributionId: distribution.Id,
            invalidatePaths: ['/*']
          })
        )
      );
      await event.finishEvent({
        eventType: 'INVALIDATE_CACHE',
        finalMessage: 'Invalidation has started but it might take few seconds until all edge locations are invalidated.'
      });
    }
  }

  if (input.kind === 'stack-resource') {
    deployedStackOverviewManager.printResourceInfo([input.resourceName]);
  }
  await notification.sendDeploymentNotification({
    message: { text: `Synced ${prettyDirPath} to bucket ${bucketName}.`, type: 'success' }
  });

  return null;
};

const bucketSyncInputHints = [
  'To sync a configured bucket, provide both `--stage` and `--resourceName`. Stacktape resolves the bucket from the deployed stack and the source directory from your configuration.',
  'To sync directly to a bucket, provide both `--bucketId` and `--sourcePath`. `--bucketId` accepts an AWS physical ID or bucket name. For a Stacktape-managed bucket, find its ID with `stacktape info:stack`.'
];

export const validateBucketSyncInput = (args: Readonly<StacktapeCliArgs>) => {
  const { stage, resourceName, bucketId, sourcePath } = args;
  const combinesWrongOptions = (stage || resourceName) && bucketId;
  const missesAllOptions = !stage && !resourceName && !bucketId;
  const missesOptionsForSyncFromConfig = (stage && !resourceName) || (resourceName && !stage);
  const missesOptionsForSyncUsingBucketId = (bucketId && !sourcePath) || (sourcePath && !bucketId);
  if (combinesWrongOptions || missesOptionsForSyncFromConfig || missesOptionsForSyncUsingBucketId || missesAllOptions) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_BUCKET_SYNC_INPUT_INVALID',
      message: 'Invalid bucket sync options.',
      hints: bucketSyncInputHints
    });
  }
};

const getBucketName = (input: BucketSyncInput) => {
  if (input.kind === 'bucket-id') {
    return input.bucketName;
  }
  const resource = deployedStackOverviewManager.getStpResource({ nameChain: input.resourceName });
  if (!resource) {
    throw deployedResourceNotFoundError({
      stackName: input.stackContext.stackName,
      resourceName: input.resourceName
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

const getDirectoryPath = (input: BucketSyncInput) => {
  const { sourcePath, resourceName } = input.args;
  let directoryPath: string;
  let workingDir: string;
  if (sourcePath) {
    directoryPath = sourcePath;
    workingDir = process.cwd();
  } else if (input.kind === 'stack-resource') {
    directoryPath = configManager.allBuckets.find((bucket) => bucket.name === resourceName).directoryUpload
      .directoryPath;
    workingDir = input.stackContext.workingDir;
  } else {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_BUCKET_SYNC_INPUT_INVALID',
      message: 'Invalid bucket sync options.',
      hints: bucketSyncInputHints
    });
  }
  return resolveBucketSyncDirectoryPath({ directoryPath, workingDir });
};

export const resolveBucketSyncDirectoryPath = ({
  directoryPath,
  workingDir
}: {
  directoryPath: string;
  workingDir: string;
}) => {
  const absolutePath = isAbsolute(directoryPath) ? directoryPath : join(workingDir, directoryPath);
  if (!isDirAccessible(absolutePath)) {
    throw new CliError({
      category: 'SYNC_BUCKET',
      code: 'SYNC_BUCKET_DIRECTORY_INACCESSIBLE',
      message: `Directory \`${absolutePath}\` is not accessible or is not a directory.`
    });
  }
  return absolutePath;
};

const getHeadersPreset = ({ args }: Extract<BucketSyncInput, { kind: 'stack-resource' }>) => {
  const { headersPreset, resourceName } = args;
  if (headersPreset) {
    return headersPreset;
  }
  return resourceName
    ? configManager?.allBuckets?.find((bucket) => bucket.name === resourceName)?.directoryUpload?.headersPreset
    : undefined;
};

const getSkipFilesConfig = ({ args }: Extract<BucketSyncInput, { kind: 'stack-resource' }>) => {
  const { resourceName } = args;
  return resourceName
    ? configManager?.allBuckets?.find((bucket) => bucket.name === resourceName)?.directoryUpload?.excludeFilesPatterns
    : undefined;
};

const getFilterFilesConfig = ({ args }: Extract<BucketSyncInput, { kind: 'stack-resource' }>) => {
  const { resourceName } = args;
  return resourceName
    ? configManager?.allBuckets?.find((bucket) => bucket.name === resourceName)?.directoryUpload?.fileOptions
    : undefined;
};

const getIsS3TransferAccelerationDisabled = ({ args }: Extract<BucketSyncInput, { kind: 'stack-resource' }>) => {
  const { resourceName } = args;
  const disabledInConfig =
    resourceName &&
    configManager.allBuckets.find((bucket) => bucket.name === resourceName)?.directoryUpload
      ?.disableS3TransferAcceleration;

  const disabledInRegion = !configManager.isS3TransferAccelerationAvailableInDeploymentRegion;

  return disabledInConfig || disabledInRegion;
};
