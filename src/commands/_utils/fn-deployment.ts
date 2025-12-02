import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { tagNames } from '@shared/naming/tag-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';

export const buildAndUpdateFunctionCode = async (stpResourceName: string) => {
  const lambdaProps = configManager.allLambdasEligibleForHotswap.find(({ name }) => name === stpResourceName);
  await eventManager.startEvent({
    eventType: 'PACKAGE_ARTIFACTS',
    description: 'Packaging function'
  });
  const packagingOutput = (await packagingManager.packageWorkload({
    jobName: lambdaProps.name,
    packaging: lambdaProps.packaging,
    workloadName: lambdaProps.name,
    commandCanUseCache: false,
    dockerBuildOutputArchitecture: lambdaProps.architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64'
  })) as PackagingOutput;

  await eventManager.finishEvent({
    eventType: 'PACKAGE_ARTIFACTS'
  });

  const { artifactInfo, lambdaResourceName, aliasName } = getLambdaFunctionHotswapInformation({ lambdaProps });

  await eventManager.startEvent({
    eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
    description: 'Uploading deployment artifacts'
  });

  await deploymentArtifactManager.uploadLambda(artifactInfo);

  await eventManager.finishEvent({ eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS' });

  await eventManager.startEvent({
    eventType: 'HOTSWAP_UPDATE',
    description: 'Performing hotswap update'
  });

  const { FunctionArn } = await updateFunctionCode({
    workloadName: lambdaProps.name,
    lambdaResourceName,
    artifactInfo,
    aliasName
  });

  await eventManager.finishEvent({ eventType: 'HOTSWAP_UPDATE' });

  return { packagingOutput, lambdaArn: FunctionArn };
};

export const getLambdaFunctionHotswapInformation = ({ lambdaProps }: { lambdaProps: StpLambdaFunction }) => {
  const artifactInfo = deploymentArtifactManager.getLambdaS3UploadInfo({
    artifactName: lambdaProps.artifactName,
    packaging: lambdaProps.packaging,
    hotSwapDeploy: true
  });

  const deployedLambdaDigest = stackManager.existingStackResources
    .find(({ LogicalResourceId }) => LogicalResourceId === lambdaProps.cfLogicalName)
    ?.tags?.find(({ key }) => key === tagNames.codeDigest())?.value;

  // if alias is part of the current deployment, it means we will be updating
  const aliasName = stackManager.existingStackResources
    .find(({ LogicalResourceId }) => LogicalResourceId === cfLogicalNames.lambdaStpAlias(lambdaProps.name))
    ?.PhysicalResourceId?.split(':')?.[7];

  return {
    workloadName: lambdaProps.name,
    lambdaResourceName: lambdaProps.resourceName,
    artifactInfo,
    needsUpdate: deployedLambdaDigest !== artifactInfo.digest,
    aliasName
  };
};

export const updateFunctionCode = async ({
  workloadName,
  lambdaResourceName,
  artifactInfo: { s3Key, digest },
  aliasName
}: {
  workloadName: string;
  lambdaResourceName: string;
  artifactInfo: { s3Key: string; digest: string };
  aliasName?: string;
}) => {
  const updateWorkloadLogger = eventManager.getNamespacedInstance({
    eventType: 'HOTSWAP_UPDATE',
    identifier: workloadName
  });
  await updateWorkloadLogger.startEvent({
    eventType: 'UPDATE_FUNCTION_CODE',
    description: 'Updating function code'
  });
  const { FunctionArn } = await awsSdkManager.updateExistingLambdaFunctionCode({
    lambdaResourceName,
    artifactBucketName: awsResourceNames.deploymentBucket(globalStateManager.targetStack.globallyUniqueStackHash),
    artifactS3Key: s3Key
  });

  await Promise.all([
    awsSdkManager.waitUntilFunctionIsUpdated({ lambdaResourceName }).then(async () => {
      // if lambda uses alias we must update it as well
      if (aliasName) {
        const { Version: version } = await awsSdkManager.publishFunctionVersion({ lambdaResourceName });
        return awsSdkManager.updateFunctionAlias({ lambdaResourceName, aliasName, version });
      }
    }),
    awsSdkManager.tagLambdaFunction({
      lambdaArn: FunctionArn,
      tags: [
        { key: tagNames.hotSwapDeploy(), value: 'true' },
        { key: tagNames.codeDigest(), value: digest }
      ]
    })
  ]);
  await updateWorkloadLogger.finishEvent({ eventType: 'UPDATE_FUNCTION_CODE' });
  return { FunctionArn };
};
