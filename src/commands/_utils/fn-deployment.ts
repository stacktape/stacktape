import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { tagNames } from '@shared/naming/tag-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';

export const buildAndUpdateFunctionCode = async (stpResourceName: string, options: { devMode?: boolean } = {}) => {
  const { devMode } = options;
  const lambdaProps = configManager.allLambdasEligibleForHotswap.find(({ name }) => name === stpResourceName);

  // Dev mode: use spinners for progress feedback
  const spinner = devMode ? tuiManager.createSpinner({ text: 'Packaging function' }) : null;

  if (!devMode) {
    await eventManager.startEvent({
      eventType: 'PACKAGE_ARTIFACTS',
      description: 'Packaging function'
    });
  }

  // In dev mode, check if deployed stack has shared layers
  // If native binary layer (layer 0) exists, we can externalize those deps for faster upload
  const hasNativeBinaryLayer =
    devMode &&
    Boolean(
      stackManager.existingStackResources.find(
        ({ LogicalResourceId, PhysicalResourceId }) =>
          LogicalResourceId === cfLogicalNames.sharedChunkLayer(0) && PhysicalResourceId
      )
    );

  const packagingOutput = (await packagingManager.packageWorkload({
    jobName: lambdaProps.name,
    packaging: lambdaProps.packaging,
    workloadName: lambdaProps.name,
    commandCanUseCache: false,
    dockerBuildOutputArchitecture: lambdaProps.architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64',
    ...(devMode && { customProgressLogger: tuiManager.createSpinnerProgressLogger(spinner, lambdaProps.name) }),
    ...(devMode && hasNativeBinaryLayer && { useDeployedLayers: true })
  })) as PackagingOutput;

  if (!devMode) {
    await eventManager.finishEvent({ eventType: 'PACKAGE_ARTIFACTS' });
  } else {
    spinner.success({ details: `${packagingOutput.size} MB` });
  }

  const { artifactInfo, lambdaResourceName, aliasName } = getLambdaFunctionHotswapInformation({ lambdaProps });

  // Upload phase
  const uploadSpinner = devMode ? tuiManager.createSpinner({ text: 'Uploading to S3' }) : null;

  if (!devMode) {
    await eventManager.startEvent({
      eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS',
      description: 'Uploading deployment artifacts'
    });
  }

  await deploymentArtifactManager.uploadLambda(artifactInfo);

  if (!devMode) {
    await eventManager.finishEvent({ eventType: 'UPLOAD_DEPLOYMENT_ARTIFACTS' });
  } else {
    uploadSpinner.success();
  }

  // Hotswap update phase
  const updateSpinner = devMode ? tuiManager.createSpinner({ text: 'Updating function code' }) : null;

  if (!devMode) {
    await eventManager.startEvent({
      eventType: 'HOTSWAP_UPDATE',
      description: 'Performing hotswap update'
    });
  }

  const { FunctionArn } = await updateFunctionCode({
    workloadName: lambdaProps.name,
    lambdaResourceName,
    artifactInfo,
    aliasName,
    devMode
  });

  if (!devMode) {
    await eventManager.finishEvent({ eventType: 'HOTSWAP_UPDATE' });
  } else {
    updateSpinner.success();
  }

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
  aliasName,
  devMode
}: {
  workloadName: string;
  lambdaResourceName: string;
  artifactInfo: { s3Key: string; digest: string };
  aliasName?: string;
  devMode?: boolean;
}) => {
  const updateWorkloadLogger = devMode
    ? null
    : eventManager.createChildLogger({
        parentEventType: 'HOTSWAP_UPDATE',
        instanceId: workloadName
      });

  if (!devMode) {
    await updateWorkloadLogger.startEvent({
      eventType: 'UPDATE_FUNCTION_CODE',
      description: 'Updating function code'
    });
  }

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

  if (!devMode) {
    await updateWorkloadLogger.finishEvent({ eventType: 'UPDATE_FUNCTION_CODE' });
  }

  return { FunctionArn };
};
