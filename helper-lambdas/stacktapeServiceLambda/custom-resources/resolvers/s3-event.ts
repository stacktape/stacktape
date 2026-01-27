import type { FilterRuleName, LambdaFunctionConfiguration, NotificationConfiguration } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { Lambda, ResourceNotFoundException } from '@aws-sdk/client-lambda';
import { NoSuchBucket, S3 } from '@aws-sdk/client-s3';
import { WRONG_BUCKET_ARN_FORMAT_MESSAGE_PREFIX } from '../constants';

export const s3Events: ServiceLambdaResolver<StpServiceCustomResourceProperties['s3Events']> = async (
  currentProps,
  previousProps,
  operation
) => {
  console.info(
    `Resolver s3Events, event type: ${operation}\n` +
      `Properties: ${JSON.stringify(currentProps, null, 2)}\n` +
      `Previous properties: ${JSON.stringify(previousProps, null, 2)}\n`
  );

  const lambdaApi = new Lambda({ region: process.env.AWS_REGION });
  const s3Api = new S3({ region: process.env.AWS_REGION });

  let oldS3Events = [];
  let newS3Events = [];
  if (operation === 'Delete') {
    oldS3Events = currentProps;
  } else {
    newS3Events = currentProps;
    oldS3Events = previousProps || [];
  }

  const { notificationObjectsToBeAdded, notificationObjectsToBeDeleted } = getDesiredNotificationOperations(
    newS3Events,
    oldS3Events
  );
  console.info(
    `planned s3 bucket notification changes:\n${JSON.stringify(
      { notificationObjectsToBeAdded, notificationObjectsToBeDeleted },
      null,
      2
    )}`
  );

  const { permissionsToBeDeleted, permissionsToBeAdded } = getDesiredPermissionOperations(newS3Events, oldS3Events);
  console.info(
    `planned lambda bucket permission changes:\n${JSON.stringify(
      { permissionsToBeDeleted, permissionsToBeAdded },
      null,
      2
    )}`
  );
  // first we add permissions
  await Promise.all(
    permissionsToBeAdded.map(async (uniqueComb: { lambdaArn: string; bucketArn: string }) => {
      return createPermissionsForBucket(uniqueComb, lambdaApi);
    })
  );
  console.info('new permissions added');

  // now we modify and rewrite notifications configurations where needed
  const updatedNotificationConfigurations: { [bucketArn: string]: NotificationConfiguration } = {};
  await Promise.all(
    Object.keys(notificationObjectsToBeDeleted).map(async (bucketArn) => {
      try {
        updatedNotificationConfigurations[bucketArn] = await s3Api.getBucketNotificationConfiguration({
          Bucket: getBucketNameFromArn(bucketArn)
        });
        console.info(
          `current notification configuration for bucket ${bucketArn}:\n${JSON.stringify(
            updatedNotificationConfigurations[bucketArn],
            null,
            2
          )}`
        );
        updatedNotificationConfigurations[bucketArn].LambdaFunctionConfigurations = (
          updatedNotificationConfigurations[bucketArn].LambdaFunctionConfigurations || []
        ).filter(
          (notificationConf) =>
            !notificationObjectsToBeDeleted[bucketArn]?.some((toDelConf) => toDelConf.Id === notificationConf.Id)
        );
      } catch (err) {
        if (
          err instanceof NoSuchBucket ||
          (err.message as string)?.startsWith(WRONG_BUCKET_ARN_FORMAT_MESSAGE_PREFIX)
        ) {
          console.info(`Bucket with arn ${bucketArn}, does not exist. Skipping...`);
        } else {
          throw err;
        }
      }

      return bucketArn;
    })
  );
  await Promise.all(
    [...Object.keys(updatedNotificationConfigurations), ...Object.keys(notificationObjectsToBeAdded)]
      .filter((bucketArn, index, arr) => bucketArn !== arr[index + 1])
      .map(async (bucketArn) => {
        if (!updatedNotificationConfigurations[bucketArn]) {
          updatedNotificationConfigurations[bucketArn] = await s3Api.getBucketNotificationConfiguration({
            Bucket: getBucketNameFromArn(bucketArn)
          });
        }
        updatedNotificationConfigurations[bucketArn].LambdaFunctionConfigurations = (
          updatedNotificationConfigurations[bucketArn].LambdaFunctionConfigurations || []
        ).concat(notificationObjectsToBeAdded[bucketArn] || []);
        await s3Api.putBucketNotificationConfiguration({
          Bucket: getBucketNameFromArn(bucketArn),
          NotificationConfiguration: updatedNotificationConfigurations[bucketArn]
        });
        console.info(`notification configuration for bucket ${bucketArn} updated`);
      })
  );
  console.info('all notification configurations updated');

  // now we remove obsolete permissions
  await Promise.all(
    permissionsToBeDeleted.map(async (uniqueComb: { lambdaArn: string; bucketArn: string }) => {
      return removePermissionsForBucket(uniqueComb, lambdaApi);
    })
  );
  console.info('obsolete permissions deleted');

  return { data: {} };
};

const getDesiredPermissionOperations = (
  currS3Events: StpServiceCustomResourceProperties['s3Events'],
  oldS3Events: StpServiceCustomResourceProperties['s3Events']
) => {
  const currentlyNeededPermissions = getUniqueLambdaBucketCombinations(currS3Events);
  const previouslyNeededPermissions = getUniqueLambdaBucketCombinations(oldS3Events);
  return {
    permissionsToBeDeleted: previouslyNeededPermissions.filter(({ lambdaArn, bucketArn }) =>
      currentlyNeededPermissions.every(
        (currNeeded) => lambdaArn !== currNeeded.lambdaArn || bucketArn !== currNeeded.bucketArn
      )
    ),
    permissionsToBeAdded: currentlyNeededPermissions.filter(({ lambdaArn, bucketArn }) =>
      previouslyNeededPermissions.every(
        (prevNeeded) => lambdaArn !== prevNeeded.lambdaArn || bucketArn !== prevNeeded.bucketArn
      )
    )
  };
};

const getDesiredNotificationOperations = (
  currS3Events: StpServiceCustomResourceProperties['s3Events'],
  oldS3Events: StpServiceCustomResourceProperties['s3Events']
) => {
  const newNotificationObjectsPerBucket: { [bucketArn: string]: LambdaFunctionConfiguration[] } = {};
  currS3Events.forEach((s3Event) => {
    newNotificationObjectsPerBucket[s3Event.eventConf.bucketArn] = (
      newNotificationObjectsPerBucket[s3Event.eventConf.bucketArn] || []
    ).concat(createBucketNotificationConfigurationObject(s3Event));
  });
  const oldNotificationObjectsPerBucket: { [bucketArn: string]: LambdaFunctionConfiguration[] } = {};
  oldS3Events.forEach((s3Event) => {
    oldNotificationObjectsPerBucket[s3Event.eventConf.bucketArn] = (
      oldNotificationObjectsPerBucket[s3Event.eventConf.bucketArn] || []
    ).concat(createBucketNotificationConfigurationObject(s3Event));
  });

  const notificationObjectsToBeDeleted: { [bucketArn: string]: LambdaFunctionConfiguration[] } = {};
  const notificationObjectsToBeAdded: { [bucketArn: string]: LambdaFunctionConfiguration[] } = {};

  Object.keys(oldNotificationObjectsPerBucket).forEach((bucketArn) => {
    oldNotificationObjectsPerBucket[bucketArn].forEach((oldNotificationObj) => {
      if (
        !(bucketArn in newNotificationObjectsPerBucket) ||
        newNotificationObjectsPerBucket[bucketArn].every(({ Id }) => oldNotificationObj.Id !== Id)
      ) {
        notificationObjectsToBeDeleted[bucketArn] = (notificationObjectsToBeDeleted[bucketArn] || []).concat(
          oldNotificationObj
        );
      }
    });
  });

  Object.keys(newNotificationObjectsPerBucket).forEach((bucketArn) => {
    newNotificationObjectsPerBucket[bucketArn].forEach((newNotificationObj) => {
      if (
        !(bucketArn in oldNotificationObjectsPerBucket) ||
        oldNotificationObjectsPerBucket[bucketArn].every(({ Id }) => newNotificationObj.Id !== Id)
      ) {
        notificationObjectsToBeAdded[bucketArn] = (notificationObjectsToBeAdded[bucketArn] || []).concat(
          newNotificationObj
        );
      }
    });
  });
  return { notificationObjectsToBeAdded, notificationObjectsToBeDeleted };
};

const getBucketNameFromArn = (bucketArn: string) => {
  const splittedBucketName = bucketArn.split(':');
  if (!splittedBucketName[5]) {
    throw new Error(`${WRONG_BUCKET_ARN_FORMAT_MESSAGE_PREFIX}: ${bucketArn}`);
  }
  return splittedBucketName[5];
};

const createBucketNotificationConfigurationObject = (
  notificationConf: StpServiceCustomResourceEventProps<S3IntegrationProps>
): LambdaFunctionConfiguration => {
  return {
    Id: getNotificationConfigurationId(notificationConf),
    LambdaFunctionArn: notificationConf.lambdaArn,
    Events: [notificationConf.eventConf.s3EventType].flat(),
    Filter: notificationConf.eventConf.filterRule
      ? {
          Key: {
            // FilterRules: notificationConf.eventConf.filterRules.map((rule) => ({
            //   Name: (rule as { prefix: string }).prefix ? 'prefix' : 'suffix',
            //   Value: (rule as { prefix: string }).prefix
            //     ? (rule as { suffix: string }).suffix
            //     : (rule as { suffix: string }).suffix
            // }))
            FilterRules: [
              ...(notificationConf.eventConf.filterRule.prefix
                ? [{ Name: 'prefix' as FilterRuleName, Value: notificationConf.eventConf.filterRule.prefix }]
                : []),
              ...(notificationConf.eventConf.filterRule.suffix
                ? [{ Name: 'suffix' as FilterRuleName, Value: notificationConf.eventConf.filterRule.suffix }]
                : [])
            ]
          }
        }
      : undefined
  };
};

const createPermissionsForBucket = async (uniqueComb: { lambdaArn: string; bucketArn: string }, lambdaApi: Lambda) => {
  const statementId = getPermissionStatementId(uniqueComb.lambdaArn, uniqueComb.bucketArn);
  console.info(`Creating permission with statementId ${statementId}`);
  await lambdaApi.addPermission({
    Action: 'lambda:InvokeFunction',
    FunctionName: uniqueComb.lambdaArn,
    Principal: 's3.amazonaws.com',
    StatementId: statementId,
    SourceArn: uniqueComb.bucketArn,
    SourceAccount: process.env.AWS_ACCOUNT_ID
  });
  console.info(`Successfully created permission with statementId ${statementId}`);
  return statementId;
};

const removePermissionsForBucket = async (uniqueComb: { lambdaArn: string; bucketArn: string }, lambdaApi: Lambda) => {
  const statementId = getPermissionStatementId(uniqueComb.lambdaArn, uniqueComb.bucketArn);
  console.info(`Deleting permission with statementId ${statementId}`);
  try {
    await lambdaApi.removePermission({
      FunctionName: uniqueComb.lambdaArn,
      StatementId: statementId
    });
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      console.info(`Permission with id ${statementId} on function ${uniqueComb.lambdaArn} not found. Skipping...`);
      return;
    }
    throw err;
  }
  console.info(`Successfully deleted permission with statementId ${statementId}`);
  return statementId;
};

const getUniqueLambdaBucketCombinations = (currS3Events: StpServiceCustomResourceProperties['s3Events']) => {
  const uniqueSet: { lambdaArn: string; bucketArn: string }[] = [];
  currS3Events.forEach((event) => {
    if (
      !uniqueSet.some(
        (setRecord) => setRecord.lambdaArn === event.lambdaArn && setRecord.bucketArn === event.eventConf.bucketArn
      )
    ) {
      uniqueSet.push({ lambdaArn: event.lambdaArn, bucketArn: event.eventConf.bucketArn });
    }
  });
  return uniqueSet;
};

const getPermissionStatementId = (functionArn: string, bucketArn: string): string => {
  const hash = createHash('sha1').update(`${functionArn}${bucketArn}`);
  return hash.digest('hex');
};

const getNotificationConfigurationId = (
  notificationConf: StpServiceCustomResourceEventProps<S3IntegrationProps>
): string => {
  const hash = createHash('sha1').update(`${notificationConf.lambdaArn}`);

  hash.update(notificationConf.eventConf.s3EventType);

  if (notificationConf.eventConf.filterRule) {
    // notificationConf.eventConf.filterRules.sort().forEach((rule) => {
    hash.update(
      // (rule as { prefix: string }).prefix ? (rule as { suffix: string }).suffix : (rule as { suffix: string }).suffix
      JSON.stringify(notificationConf.eventConf.filterRule)
    );
    // });
  }
  return hash.digest('hex');
};
