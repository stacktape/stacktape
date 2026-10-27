import type { ServiceLambdaResolver } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type {
  StpServiceCustomResourceEdgeFunctionProps,
  StpServiceCustomResourceProperties
} from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { FunctionConfiguration, Runtime } from '@aws-sdk/client-lambda';
import {
  CloudWatchLogs,
  ResourceNotFoundException as LogGroupNotFoundException
} from '@aws-sdk/client-cloudwatch-logs';
import { IAM, NoSuchEntityException } from '@aws-sdk/client-iam';
import {
  InvalidParameterValueException,
  Lambda,
  ResourceNotFoundException as LambdaNotFoundException,
  waitUntilFunctionUpdated
} from '@aws-sdk/client-lambda';
import { S3 } from '@aws-sdk/client-s3';
import { helperLambdaAwsResourceNames } from '@stacktape/naming/helper-lambda-resource-names';
import { tagNames } from '@stacktape/naming/tag-names';
import { REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION } from 'src/config/constants';
import { wait } from '@utils/misc';
import { getAssumeRolePolicyDocumentForFunctionRole } from 'src/aws/iam';
import { ensureEdgeDeploymentBucket } from './edge-lambda-bucket';

const configurationChangeDetectionParameters: (keyof StpServiceCustomResourceEdgeFunctionProps)[] = [
  'packaging',
  'timeout',
  'runtime',
  'memory'
];

const roleChangeDetectionParameters: (keyof StpServiceCustomResourceEdgeFunctionProps)[] = ['preprocessedRolePolicies'];

const codeChangeDetectionParameters: (keyof StpServiceCustomResourceEdgeFunctionProps)[] = [
  'artifactS3Key',
  'artifactBucketName'
];

const logGroupChangeDetectionParameters: (keyof StpServiceCustomResourceEdgeFunctionProps)[] = ['logging'];

let EDGE_DEPLOYMENT_BUCKET_NAME: string;

const lambdaApi = new Lambda({ region: 'us-east-1' });
const iamApi = new IAM({ region: 'us-east-1' });
const s3Api = new S3({ region: 'us-east-1' });

const tags = {
  [tagNames.stackName()]: process.env.STACK_NAME,
  [tagNames.projectName()]: process.env.PROJECT_NAME,
  [tagNames.stage()]: process.env.STAGE,
  [tagNames.globallyUniqueStackHash()]: process.env.GLOBALLY_UNIQUE_STACK_HASH
};

const loggingApis = REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION.map((region) => {
  return new CloudWatchLogs({ region });
});

export const edgeFunctions: ServiceLambdaResolver<StpServiceCustomResourceProperties['edgeFunctions']> = async (
  currentProps,
  previousProps,
  operation
) => {
  console.info(
    `Resolver edgeFunctions, event type: ${operation}\n` +
      `Properties: ${JSON.stringify(currentProps, null, 2)}\n` +
      `Previous properties: ${JSON.stringify(previousProps, null, 2)}\n`
  );

  let oldEdgeFunctions: StpServiceCustomResourceEdgeFunctionProps[] = [];
  let newEdgeFunctions: StpServiceCustomResourceEdgeFunctionProps[] = [];
  if (operation === 'Delete') {
    oldEdgeFunctions = currentProps;
  } else {
    newEdgeFunctions = currentProps;
    oldEdgeFunctions = previousProps || [];
  }

  const globallyUniqueStackHash =
    newEdgeFunctions[0]?.globallyUniqueStackHash || oldEdgeFunctions[0]?.globallyUniqueStackHash;

  // set global EDGE_DEPLOYMENT_BUCKET_NAME
  EDGE_DEPLOYMENT_BUCKET_NAME = helperLambdaAwsResourceNames.edgeDeploymentBucket(globallyUniqueStackHash);

  const versionsData: { [lambdaResourceName: string]: string } = {};

  const {
    modifiedRoleFunctions,
    modifiedConfigurationFunctions,
    modifiedCodeFunctions,
    modifiedLoggingFunctions,
    newFunctions,
    toBeDeletedFunctions,
    functionsNotRequiringPublish,
    functionsRequiringPublish
  } = getDesiredOperations(newEdgeFunctions, oldEdgeFunctions);

  // The edge deployment bucket resource may still be creating the bucket, so whichever comes first creates it.
  let edgeBucketReady: Promise<void> | undefined;
  const ensureEdgeBucket = () => (edgeBucketReady ??= ensureEdgeDeploymentBucket(EDGE_DEPLOYMENT_BUCKET_NAME));

  // dealing with completely new functions
  await Promise.all(
    newFunctions.map(async (lambdaProps) => {
      const lambdaResourceName = lambdaProps.resourceName;
      const lambdaRoleResourceName = lambdaProps.lambdaRoleResourceName;
      const createFunctionAndRole = async () => {
        const [existingFunction, existingRole] = await Promise.all([
          functionExists(lambdaResourceName),
          roleExists(lambdaRoleResourceName)
        ]);
        const getRoleArn = async () => {
          if (existingRole) {
            return existingRole.Arn;
          }
          console.info(`Creating role for ${lambdaResourceName} edge lambda...`);
          const createdRole = await createRole(lambdaProps);
          console.info(`Creating role for ${lambdaResourceName} edge lambda - SUCCESS`);
          modifiedRoleFunctions.push(lambdaProps);
          return createdRole.Arn;
        };
        // function can already exist even though it is "new" in the customResource.
        // This is due to leftovers after deletion of the stack which had same name.
        // in these cases, we rather update the function and release new version
        if (existingFunction) {
          await getRoleArn();
          console.info(`Function ${lambdaResourceName} already exists. Function and its policies will get updated...`);
          modifiedConfigurationFunctions.push(lambdaProps);
          modifiedCodeFunctions.push(lambdaProps);
          modifiedRoleFunctions.push(lambdaProps);
          return;
        }
        const [roleArn] = await Promise.all([
          getRoleArn(),
          (async () => {
            await ensureEdgeBucket();
            console.info(`Copying artifact for edge lambda ${lambdaResourceName}...`);
            await copyBetweenBuckets(
              lambdaProps.artifactBucketName,
              EDGE_DEPLOYMENT_BUCKET_NAME,
              lambdaProps.artifactS3Key
            );
            console.info(`Copying artifact for edge lambda ${lambdaResourceName} - SUCCESS`);
          })()
        ]);
        console.info(`Creating lambda ${lambdaResourceName}...`);
        await createFunction(lambdaProps, roleArn, EDGE_DEPLOYMENT_BUCKET_NAME, lambdaResourceName);
        console.info(`Creating lambda ${lambdaResourceName} - SUCCESS`);
      };
      await Promise.all([setupLogGroupsInAllRegions({ lambdaProps }), createFunctionAndRole()]);
      return lambdaResourceName;
    })
  );

  // dealing with modified role functions
  await Promise.all(
    modifiedRoleFunctions.map(async (lambdaProps) => {
      const lambdaResourceName = lambdaProps.resourceName;
      const lambdaRoleResourceName = lambdaProps.lambdaRoleResourceName;
      console.info(`Updating policies for ${lambdaResourceName} edge lambda role...`);
      await modifyPoliciesForRole(lambdaProps, lambdaRoleResourceName, lambdaResourceName);
      console.info(`Updating policies for ${lambdaResourceName} edge lambda role - SUCCESS`);
      return lambdaResourceName;
    })
  );

  // dealing with modified code functions
  await Promise.all(
    modifiedCodeFunctions.map(async (lambdaProps) => {
      const lambdaResourceName = lambdaProps.resourceName;
      await ensureEdgeBucket();
      console.info(`Copying artifact for edge lambda ${lambdaResourceName}...`);
      await copyBetweenBuckets(lambdaProps.artifactBucketName, EDGE_DEPLOYMENT_BUCKET_NAME, lambdaProps.artifactS3Key);
      console.info(`Copying artifact for edge lambda ${lambdaResourceName} - SUCCESS`);
      console.info(`Updating function code for ${lambdaResourceName} edge lambda...`);
      await modifyFunctionCode(lambdaProps, lambdaResourceName, EDGE_DEPLOYMENT_BUCKET_NAME);
      console.info(`Updating function code for ${lambdaResourceName} edge lambda - SUCCESS`);
      return lambdaResourceName;
    })
  );

  // dealing with modified configuration functions
  await Promise.all(
    modifiedConfigurationFunctions.map(async (lambdaProps) => {
      const lambdaResourceName = lambdaProps.resourceName;
      console.info(`Updating function configuration for ${lambdaResourceName} edge lambda...`);
      await modifyFunctionConfiguration(lambdaProps, lambdaResourceName);
      console.info(`Updating function configuration for ${lambdaResourceName} edge lambda - SUCCESS`);
      return lambdaResourceName;
    })
  );

  // dealing with modified logging functions
  await Promise.all(
    modifiedLoggingFunctions.map(async (lambdaProps) => {
      const lambdaResourceName = lambdaProps.resourceName;
      console.info(`Updating log groups for ${lambdaResourceName} edge lambda...`);
      await setupLogGroupsInAllRegions({ lambdaProps });
      console.info(`Updating log groups for ${lambdaResourceName} edge lambda - SUCCESS`);
      return lambdaResourceName;
    })
  );

  // getting latest versions of edge functions that did not change
  await Promise.all(
    functionsNotRequiringPublish.map(async (lambdaProps) => {
      const lambdaResourceName = lambdaProps.resourceName;
      console.info(`Getting latest version of ${lambdaResourceName} edge lambda...`);
      const latestFunctionVersion = await getLatestVersionOfFunction(lambdaResourceName);
      console.info(`Getting latest version of ${lambdaResourceName} edge lambda - SUCCESS`);
      versionsData[lambdaResourceName] = latestFunctionVersion.FunctionArn;
      return lambdaResourceName;
    })
  );

  // publishing new versions of functions
  await Promise.all(
    functionsRequiringPublish.map(async (lambdaProps) => {
      const lambdaResourceName = lambdaProps.resourceName;
      console.info(`Publishing new version of ${lambdaResourceName} edge lambda...`);
      const newPublishedVersion = await publishFunction(lambdaResourceName);
      console.info(`Publishing new version of ${lambdaResourceName} edge lambda - SUCCESS`);
      versionsData[lambdaResourceName] = newPublishedVersion.FunctionArn;
      return lambdaResourceName;
    })
  );

  // we tag all the functions
  await Promise.all(
    [...functionsNotRequiringPublish, ...functionsRequiringPublish].map(async (lambdaProps) => {
      const lambdaResourceName = lambdaProps.resourceName;
      await tagFunction(versionsData[lambdaResourceName]);
      return lambdaResourceName;
    })
  );

  // The handler is frozen once it responds, so every deletion must finish before it returns.
  await Promise.all(
    toBeDeletedFunctions.map((lambdaProps) =>
      // During an update the distribution may still reference a removed function until it is updated after this
      // resource, so only a deletion removes its role and the function itself.
      operation === 'Delete' ? deleteEdgeFunction({ lambdaProps }) : deleteLogGroupsInAllRegions({ lambdaProps })
    )
  );

  return { data: versionsData };
};

/**
 * Deletes everything a deleted stack's edge function owns. CloudFormation deletes the distribution first, but AWS keeps
 * the function's replicas for up to a few hours afterwards and refuses to delete a replicated function until then. That
 * refusal must not fail the stack deletion: the function stays, and a later stack with the same name reuses it.
 */
const deleteEdgeFunction = async ({ lambdaProps }: { lambdaProps: StpServiceCustomResourceEdgeFunctionProps }) => {
  await deleteLogGroupsInAllRegions({ lambdaProps });
  await deleteRole(lambdaProps.lambdaRoleResourceName);
  const lambdaResourceName = lambdaProps.resourceName;
  try {
    await lambdaApi.deleteFunction({ FunctionName: lambdaResourceName });
    console.info(`Deleting edge lambda ${lambdaResourceName} - SUCCESS`);
  } catch (err) {
    if (err instanceof LambdaNotFoundException) return;
    if (err instanceof InvalidParameterValueException && /replicated function/i.test(err.message)) {
      console.info(`Edge lambda ${lambdaResourceName} still has CloudFront replicas and cannot be deleted yet.`);
      return;
    }
    throw err;
  }
};

const deleteRole = async (roleName: string) => {
  try {
    const policyNames = await listAllPoliciesForRole(roleName);
    await Promise.all(policyNames.map((PolicyName) => iamApi.deleteRolePolicy({ PolicyName, RoleName: roleName })));
    await iamApi.deleteRole({ RoleName: roleName });
    console.info(`Deleting edge lambda role ${roleName} - SUCCESS`);
  } catch (err) {
    if (err instanceof NoSuchEntityException) return;
    throw err;
  }
};

const getDesiredOperations = (
  newEdgeFunctions: StpServiceCustomResourceProperties['edgeFunctions'],
  oldEdgeFunctions: StpServiceCustomResourceProperties['edgeFunctions']
) => {
  const modifiedRoleFunctions: StpServiceCustomResourceProperties['edgeFunctions'] = [];
  const modifiedConfigurationFunctions: StpServiceCustomResourceProperties['edgeFunctions'] = [];
  const modifiedCodeFunctions: StpServiceCustomResourceProperties['edgeFunctions'] = [];
  const modifiedLoggingFunctions: StpServiceCustomResourceProperties['edgeFunctions'] = [];
  const newFunctions: StpServiceCustomResourceProperties['edgeFunctions'] = [];
  const functionsRequiringPublish: StpServiceCustomResourceProperties['edgeFunctions'] = [];
  const functionsNotRequiringPublish: StpServiceCustomResourceProperties['edgeFunctions'] = [];

  newEdgeFunctions.forEach((lambdaProps) => {
    let functionRequiresPublish = false;
    const matchingOldEdgeFunctionProps = oldEdgeFunctions?.find(
      (oldLambdaProps) => oldLambdaProps.name === lambdaProps.name
    );
    if (matchingOldEdgeFunctionProps) {
      if (
        roleChangeDetectionParameters.some((paramName) =>
          paramHasChanged(lambdaProps, matchingOldEdgeFunctionProps, paramName)
        )
      ) {
        modifiedRoleFunctions.push(lambdaProps);
      }
      if (
        logGroupChangeDetectionParameters.some((paramName) =>
          paramHasChanged(lambdaProps, matchingOldEdgeFunctionProps, paramName)
        )
      ) {
        modifiedLoggingFunctions.push(lambdaProps);
      }
      if (
        configurationChangeDetectionParameters.some((paramName) =>
          paramHasChanged(lambdaProps, matchingOldEdgeFunctionProps, paramName)
        )
      ) {
        modifiedConfigurationFunctions.push(lambdaProps);
        functionRequiresPublish = true;
      }
      if (
        codeChangeDetectionParameters.some((paramName) =>
          paramHasChanged(lambdaProps, matchingOldEdgeFunctionProps, paramName)
        )
      ) {
        modifiedCodeFunctions.push(lambdaProps);
        functionRequiresPublish = true;
      }
    } else {
      newFunctions.push(lambdaProps);
      functionRequiresPublish = true;
    }
    if (functionRequiresPublish) {
      functionsRequiringPublish.push(lambdaProps);
    } else {
      functionsNotRequiringPublish.push(lambdaProps);
    }
  });
  const toBeDeletedFunctions = oldEdgeFunctions.filter(
    ({ name: oldLambdaName }) => !newEdgeFunctions.some(({ name: newLambdaName }) => newLambdaName === oldLambdaName)
  );
  return {
    modifiedRoleFunctions,
    modifiedConfigurationFunctions,
    modifiedCodeFunctions,
    modifiedLoggingFunctions,
    newFunctions,
    toBeDeletedFunctions,
    functionsRequiringPublish,
    functionsNotRequiringPublish
  };
};

const paramHasChanged = (
  lambdaProps: StpServiceCustomResourceEdgeFunctionProps,
  oldLambdaProps: StpServiceCustomResourceEdgeFunctionProps,
  paramName: string
) => {
  if (typeof lambdaProps[paramName] === 'string') {
    return lambdaProps[paramName] !== oldLambdaProps[paramName];
  }
  return JSON.stringify(lambdaProps[paramName]) !== JSON.stringify(oldLambdaProps[paramName]);
};

const createRole = async (lambdaProps: StpServiceCustomResourceEdgeFunctionProps) => {
  const newRole = await iamApi.createRole({
    AssumeRolePolicyDocument: JSON.stringify(getAssumeRolePolicyDocumentForFunctionRole()),
    RoleName: lambdaProps.lambdaRoleResourceName,
    Description: `Role generated by Stacktape for edge function ${lambdaProps.name} defined in stack ${process.env.STACK_NAME} in region ${process.env.AWS_REGION}`
  });

  return newRole.Role;
};

const roleExists = async (roleName: string) => {
  try {
    const existingRole = await iamApi.getRole({ RoleName: roleName });
    return existingRole.Role;
  } catch (err) {
    if (err instanceof NoSuchEntityException) {
      console.info(`Role with name ${roleName} does NOT exist.`);
      return false;
    }
    throw err;
  }
};

const modifyPoliciesForRole = async (
  lambdaProps: StpServiceCustomResourceEdgeFunctionProps,
  roleFriendlyName: string,
  lambdaResourceName: string
) => {
  const policiesToBeDeleted = (await listAllPoliciesForRole(roleFriendlyName)).filter(
    (currentlyIncludedPolicy) =>
      !lambdaProps.preprocessedRolePolicies.some(({ PolicyName }) => PolicyName === currentlyIncludedPolicy)
  );
  console.info(`Updating and adding role policies for lambda ${lambdaResourceName}...`);
  await Promise.all(
    lambdaProps.preprocessedRolePolicies.map(async (policyConfig) => {
      return iamApi.putRolePolicy({
        PolicyName: `${policyConfig.PolicyName}`,
        PolicyDocument: JSON.stringify(policyConfig.PolicyDocument),
        RoleName: roleFriendlyName
      });
    })
  );
  console.info(`Updating and adding role policies for lambda ${lambdaResourceName} - SUCCESS`);

  if (policiesToBeDeleted) {
    console.info(`Policies to be deleted:\n${JSON.stringify(policiesToBeDeleted, null, 2)}`);
    console.info(`Deleting role policies for lambda ${lambdaResourceName}...`);
    await Promise.all(
      policiesToBeDeleted.map(async (PolicyName) => {
        return iamApi.deleteRolePolicy({ PolicyName: `${PolicyName}`, RoleName: roleFriendlyName });
      })
    );
    console.info(`Deleting role policies for lambda ${lambdaResourceName} - SUCCESS`);
  }
};

const listAllPoliciesForRole = async (roleFriendlyName: string) => {
  const allPolicies: string[][] = [];
  let { Marker, PolicyNames } = await iamApi.listRolePolicies({
    RoleName: roleFriendlyName
  });

  allPolicies.push(PolicyNames);
  while (Marker) {
    ({ Marker, PolicyNames } = await iamApi.listRolePolicies({
      RoleName: roleFriendlyName,
      Marker
    }));
    allPolicies.push(PolicyNames);
  }
  return allPolicies.flat();
};

const modifyFunctionConfiguration = async (
  lambdaProps: StpServiceCustomResourceEdgeFunctionProps,
  lambdaResourceName: string
) => {
  await waitForFunctionToBeReadyForOperation(lambdaResourceName);
  return lambdaApi.updateFunctionConfiguration({
    FunctionName: lambdaResourceName,
    Handler: lambdaProps.handler,
    MemorySize: Number(lambdaProps.memory),
    Runtime: lambdaProps.runtime as unknown as Runtime,
    Timeout: Number(lambdaProps.timeout)
  });
};

const modifyFunctionCode = async (
  lambdaProps: StpServiceCustomResourceEdgeFunctionProps,
  lambdaResourceName: string,
  artifactBucketName: string
) => {
  await waitForFunctionToBeReadyForOperation(lambdaResourceName);
  return lambdaApi.updateFunctionCode({
    FunctionName: lambdaResourceName,
    S3Bucket: artifactBucketName,
    S3Key: lambdaProps.artifactS3Key
  });
};

/** How long `createFunction` retries while a new role is not yet assumable by Lambda (IAM propagation). */
const ROLE_PROPAGATION_TIMEOUT_MS = 60_000;
const ROLE_PROPAGATION_RETRY_MS = 2000;

const createFunction = async (
  lambdaProps: StpServiceCustomResourceEdgeFunctionProps,
  roleArn: string,
  artifactBucketName: string,
  lambdaResourceName: string
) => {
  const startedAt = Date.now();
  for (;;) {
    try {
      await lambdaApi.createFunction({
        MemorySize: Number(lambdaProps.memory),
        Code: { S3Bucket: artifactBucketName, S3Key: lambdaProps.artifactS3Key },
        FunctionName: lambdaResourceName,
        Handler: lambdaProps.handler,
        Role: roleArn,
        Runtime: lambdaProps.runtime as unknown as Runtime,
        Timeout: Number(lambdaProps.timeout)
      });
      return;
    } catch (err) {
      // A role created moments ago is not assumable until IAM has propagated it, usually within seconds.
      const roleNotReady = err instanceof InvalidParameterValueException && /cannot be assumed/i.test(err.message);
      if (!roleNotReady || Date.now() - startedAt > ROLE_PROPAGATION_TIMEOUT_MS) {
        throw err;
      }
      console.info(`Role of ${lambdaResourceName} is not assumable yet. Retrying...`);
      await wait(ROLE_PROPAGATION_RETRY_MS);
    }
  }
};

const publishFunction = async (lambdaResourceName: string) => {
  // wait for lambda to be active/inactive (to be prepared for publishing)
  await waitForFunctionToBeReadyForOperation(lambdaResourceName);
  return lambdaApi.publishVersion({
    FunctionName: lambdaResourceName
  });
};

const tagFunction = async (lambdaArnWithVersion: string) => {
  const lambdaArn = lambdaArnWithVersion.split(':').slice(0, -1).join(':');
  await waitForFunctionToBeReadyForOperation(lambdaArnWithVersion);
  console.info(`Tagging function with arn ${lambdaArn}...`);
  // try catch must be here, because in older environments service lambda might not have enough permissions
  try {
    await lambdaApi.tagResource({
      Resource: lambdaArn,
      Tags: tags
    });
  } catch (err) {
    console.info(`Tagging function with arn ${lambdaArn} - FAILED. Error: ${err}`);
    return;
  }
  console.info(`Tagging function with arn ${lambdaArn} - SUCCESS.`);
};

const getLatestVersionOfFunction = async (lambdaResourceName: string) => {
  const allVersions = await getAllVersionsOfFunction(lambdaResourceName);
  allVersions.sort(
    ({ Version: ver1 }, { Version: ver2 }) => (Number.parseInt(ver2, 10) || 0) - (Number.parseInt(ver1, 10) || 0)
  );
  console.info(`Latest version of ${lambdaResourceName} lambda is ${allVersions[0].Version}`);
  return allVersions[0];
};

const getAllVersionsOfFunction = async (lambdaResourceName: string) => {
  const allVersions: FunctionConfiguration[][] = [];
  let { NextMarker, Versions } = await lambdaApi.listVersionsByFunction({
    FunctionName: lambdaResourceName
  });

  allVersions.push(Versions);
  while (NextMarker) {
    ({ NextMarker, Versions } = await lambdaApi.listVersionsByFunction({
      FunctionName: lambdaResourceName,
      Marker: NextMarker
    }));
    allVersions.push(Versions);
  }
  return allVersions.flat();
};

const waitForFunctionToBeReadyForOperation = async (lambdaResourceName: string) => {
  console.info(`Waiting for ${lambdaResourceName} to be prepared for operation...`);
  await waitUntilFunctionUpdated({ client: lambdaApi, maxWaitTime: 120 }, { FunctionName: lambdaResourceName });
  console.info(`Lambda ${lambdaResourceName} is prepared for operation`);
};

const functionExists = async (lambdaResourceName: string) => {
  try {
    const existingFunction = await lambdaApi.getFunction({ FunctionName: lambdaResourceName });
    return existingFunction;
  } catch (err) {
    if (err instanceof LambdaNotFoundException) {
      console.info(`Function with name ${lambdaResourceName} does NOT exist.`);
      return false;
    }
    throw err;
  }
};

const copyBetweenBuckets = async (sourceBucketName: string, destBucketName: string, objectKey: string) => {
  return s3Api.copyObject({ Bucket: destBucketName, CopySource: `${sourceBucketName}/${objectKey}`, Key: objectKey });
};

const setupLogGroupsInAllRegions = async ({
  lambdaProps
}: {
  lambdaProps: StpServiceCustomResourceEdgeFunctionProps;
}) => {
  console.info(`Setting up logging for ${lambdaProps.resourceName}...`);
  const lambdaLogGroupName = lambdaProps.lambdaLogGroupName;
  await Promise.all(
    loggingApis.map(async (logsCli) => {
      const regionalLogGroup = await getLogGroup({ logGroupName: lambdaLogGroupName, logsCli });
      console.info(
        `Log group for ${lambdaProps.resourceName} ${regionalLogGroup ? 'exists' : 'does not exist'} in region ${await logsCli.config.region()}.`
      );
      if (lambdaProps.logging.disabled) {
        if (regionalLogGroup) {
          console.info(
            `Deleting log group for ${
              lambdaProps.resourceName
            }, since logging is disabled (${await logsCli.config.region()})`
          );
          await deleteLogGroup({ logGroupName: lambdaLogGroupName, logsCli });
        }
        // nothing else to do
        return lambdaLogGroupName;
      }
      const desiredLogGroupClass =
        lambdaProps.logging.logClass === 'infrequent-access' ? 'INFREQUENT_ACCESS' : 'STANDARD';
      const existingLogGroupClass = regionalLogGroup?.logGroupClass || 'STANDARD';
      if (regionalLogGroup && existingLogGroupClass !== desiredLogGroupClass) {
        throw new Error(
          `CloudWatch log group ${lambdaLogGroupName} in ${await logsCli.config.region()} already uses ${existingLogGroupClass}; its immutable class cannot be changed to ${desiredLogGroupClass}. Use a new stage or keep the existing logging.logClass.`
        );
      }
      if (!regionalLogGroup) {
        await createLogGroup({
          logGroupName: lambdaLogGroupName,
          logsCli,
          logGroupClass: desiredLogGroupClass === 'INFREQUENT_ACCESS' ? desiredLogGroupClass : undefined
        });
      }
      await setLogGroupRetention({
        logGroupName: lambdaLogGroupName,
        logsCli,
        retentionInDays: lambdaProps.logging.retentionDays
      });
      return lambdaLogGroupName;
    })
  );
};

const deleteLogGroupsInAllRegions = async ({
  lambdaProps
}: {
  lambdaProps: StpServiceCustomResourceEdgeFunctionProps;
}) => {
  const lambdaLogGroupName = lambdaProps.lambdaLogGroupName;
  await Promise.all(
    loggingApis.map(async (logsCli) => {
      return deleteLogGroup({ logGroupName: lambdaLogGroupName, logsCli });
    })
  );
};

const getLogGroup = async ({ logGroupName, logsCli }: { logGroupName: string; logsCli: CloudWatchLogs }) => {
  const { logGroups } = await logsCli.describeLogGroups({ logGroupNamePrefix: logGroupName });
  return logGroups?.find(({ logGroupName: existingName }) => existingName === logGroupName);
};

const deleteLogGroup = async ({ logGroupName, logsCli }: { logGroupName: string; logsCli: CloudWatchLogs }) => {
  const region = await logsCli.config.region();
  console.info(`Deleting log group ${logGroupName} (${region})...`);
  try {
    await logsCli.deleteLogGroup({ logGroupName });
  } catch (err) {
    if (err instanceof LogGroupNotFoundException) {
      console.info(`Log group ${logGroupName} does not exists (${region}).`);
    }
  }
  console.info(`Deleting log group ${logGroupName} (${region}) - SUCCESS`);
};

const createLogGroup = async ({
  logGroupName,
  logsCli,
  logGroupClass
}: {
  logGroupName: string;
  logsCli: CloudWatchLogs;
  logGroupClass?: 'INFREQUENT_ACCESS';
}) => {
  const region = await logsCli.config.region();
  console.info(`Creating log group ${logGroupName} (${region})...`);
  await logsCli.createLogGroup({ logGroupName, logGroupClass, tags });
  console.info(`Creating log group ${logGroupName} (${region}) - SUCCESS`);
};

const setLogGroupRetention = async ({
  logGroupName,
  logsCli,
  retentionInDays
}: {
  logGroupName: string;
  logsCli: CloudWatchLogs;
  retentionInDays: number;
}) => {
  const region = await logsCli.config.region();
  console.info(`Setting log group retention ${logGroupName} (${region})...`);
  await logsCli.putRetentionPolicy({ logGroupName, retentionInDays: Number(retentionInDays) });
  console.info(`Setting log group retention ${logGroupName} (${region}) - SUCCESS`);
};
