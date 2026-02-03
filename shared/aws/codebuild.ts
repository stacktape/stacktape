import type { Build, ComputeType } from '@aws-sdk/client-codebuild';
import type { AwsSdkManager } from './sdk-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { getStacktapeApiKeySsmParameterName } from '@shared/naming/ssm-secret-parameters';
import { getStackName } from '@shared/naming/utils';
import { wait } from '@shared/utils/misc';

export const preparePipelineResources = async ({
  awsSdkManager,
  awsAccountId,
  deploymentBucketTransferAccelerationEnabled
}: {
  awsSdkManager: AwsSdkManager;
  awsAccountId: string;
  deploymentBucketTransferAccelerationEnabled?: boolean;
}) => {
  // it is assumed that passed AWS SDK manager was initialized and we draw region from its properties
  const region = awsSdkManager.region;
  // check if role for codebuild exists in account
  let role = await awsSdkManager.getRole({ roleName: awsResourceNames.codebuildServiceRole() });
  if (!role) {
    const assumeRolePolicyDocumentStatements: { [key: string]: any }[] = [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'codebuild.amazonaws.com'
        },
        Action: 'sts:AssumeRole'
      }
    ];
    role = await awsSdkManager.createIamRole({
      roleName: awsResourceNames.codebuildServiceRole(),
      assumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: assumeRolePolicyDocumentStatements
      },
      description: 'Stacktape created role, used by CodeBuild',
      maxSessionDuration: 36000
    });
    // after assume policy is updated, AWS needs to achieve consistency before trying to use the role in project
    await wait(30000);
    // self reference for role must be added post creation otherwise error is thrown
    // by the new AWS rules roles do not self trust, therefore we need to do this to be able to assume role within codebuild
    // https://aws.amazon.com/blogs/security/announcing-an-update-to-iam-role-trust-policy-behavior/
    assumeRolePolicyDocumentStatements.push({
      Effect: 'Allow',
      Principal: {
        AWS: role.Arn
      },
      Action: 'sts:AssumeRole'
    });
    await awsSdkManager.updateIamRoleAssumePolicy({
      roleName: role.RoleName,
      assumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: assumeRolePolicyDocumentStatements
      }
    });
    // add policy
    await awsSdkManager.attachPolicyToRole({
      roleName: role.RoleName,
      policyArn: 'arn:aws:iam::aws:policy/AdministratorAccess'
    });
    // after assume policies are updated, AWS needs to achieve consistency before trying to use the role in project
    await wait(10000);
  }
  let logGroup = await awsSdkManager.getLogGroup({ logGroupName: awsResourceNames.stackOperationsLogGroup() });
  if (!logGroup) {
    logGroup = await awsSdkManager.createLogGroup({
      logGroupName: awsResourceNames.stackOperationsLogGroup()
      // retentionDays: 30
    });
  }

  // check if codebuild project exists in this region
  // if not create one
  let project = await awsSdkManager.getCodebuildProject({
    projectName: awsResourceNames.codebuildProject(region)
  });
  if (!project) {
    project = await awsSdkManager.createDummyCodebuildProject({
      projectName: awsResourceNames.codebuildProject(region),
      serviceRoleArn: role.Arn,
      logGroupName: logGroup.logGroupName
    });
  }

  const bucketName = awsResourceNames.codebuildDeploymentBucket(region, awsAccountId);
  const bucketExists = await awsSdkManager.bucketExists({ bucketName });
  if (!bucketExists) {
    await awsSdkManager.createBucket({
      bucketName,
      setEncryption: true,
      enableTransferAcceleration: deploymentBucketTransferAccelerationEnabled,
      bucketPolicy: {
        Statement: [
          {
            Action: 's3:*',
            Effect: 'Deny',
            Principal: '*',
            Resource: [`arn:aws:s3:::${bucketName}/*`],
            Condition: { Bool: { 'aws:SecureTransport': false } }
          }
        ]
      }
    });
  }
  return {
    bucketName,
    logGroupName: logGroup.logGroupName!,
    codebuildProjectName: project.name!,
    roleArn: role.Arn!
  };
};

export const startCodebuildDeployment = async ({
  awsSdkManager,
  awsAccountId,
  invocationId,
  systemId,
  stacktapeUserInfo,
  stacktapeVersion,
  projectZipS3Key,
  commandArgs,
  projectName,
  codebuildPipeline,
  gitInfo,
  additionalBuildCommands = [],
  callbackAfterBuildStart,
  codebuildBuildImage,
  stacktapeTrpcEndpoint,
  additionalInstallCommands = [],
  computeTypeOverride
}: {
  awsSdkManager: AwsSdkManager;
  /**
   * Target aws account id
   */
  awsAccountId: string;
  // invocationId usually comes from globalStateManager
  invocationId: string;
  // systemId is unique identifier for the system - during codebuild deploy this system ID is injected as env variable
  // this helps to identify system from which codebuild deploy was started (instead of codebuild machine where it is running)
  systemId: string;
  // information about stacktape user - deployment will be performed sing provided api key
  stacktapeUserInfo: {
    // stacktape user id - should be id of the user whose API KEY you are passing into codebuild deploy operation
    id: string;
    // stacktape api key to use within codebuild deploy
    apiKey: string;
  };
  // version of stacktape to use during deploy - if nothing is specified, latest prod release is used
  stacktapeVersion?: string;
  // path to zip with project
  projectZipS3Key: string;
  // stacktape arguments used during deploy operation
  commandArgs: StacktapeArgs;
  // name of the service
  projectName: string;
  // information about codebuild pipeline
  codebuildPipeline: {
    bucketName: string;
    logGroupName: string;
    codebuildProjectName: string;
    roleArn: string;
  };
  // git information about the project
  gitInfo: GitInformation;
  additionalBuildCommands?: string[];
  // function which runs after build is started
  callbackAfterBuildStart?: (build?: Build) => any;
  // image used for codebuild build environment
  codebuildBuildImage?: string;
  stacktapeTrpcEndpoint?: string;
  additionalInstallCommands?: string[];
  computeTypeOverride?: ComputeType;
}) => {
  const stackName = getStackName(projectName, commandArgs.stage);
  // storing API_KEY as SSM parameter for purposes of passing it to build
  const apiKeySsmParameterName = getStacktapeApiKeySsmParameterName({
    region: awsSdkManager.region,
    invocationId,
    userId: stacktapeUserInfo.id
  });
  await awsSdkManager.putSsmParameterValue({
    ssmParameterName: apiKeySsmParameterName,
    value: stacktapeUserInfo.apiKey,
    encrypt: true
  });
  let build: Build;
  try {
    build = await awsSdkManager.startCodebuildDeployment({
      codebuildProjectName: codebuildPipeline.codebuildProjectName,
      codebuildRoleArn: codebuildPipeline.roleArn,
      projectZipBucketName: codebuildPipeline.bucketName,
      projectZipS3Key,
      commandArgs,
      logGroupName: codebuildPipeline.logGroupName,
      gitInfo,
      stackName,
      apiKeySsmParameterName,
      systemId,
      useStacktapeVersion: stacktapeVersion,
      additionalBuildCommands,
      invocationId,
      codebuildBuildImage,
      stacktapeTrpcEndpoint,
      additionalInstallCommands,
      computeTypeOverride
    });
    if (callbackAfterBuildStart) {
      await callbackAfterBuildStart(build);
    }
    // wait for codebuild deployment to reach build phase - this is when deployment phase starts
    await awsSdkManager.waitForCodebuildDeploymentToReachBuildPhase({
      buildId: build.id,
      awsAccountId
    });
  } finally {
    // attempt to delete SSM parameter in case Codebuild failed to do so
    await awsSdkManager.deleteSsmParameter({ ssmParameterName: apiKeySsmParameterName });
  }
  return awsSdkManager.getCodebuildDeployment({ buildId: build.id });
};

const _startCodebuildDelete = async ({
  awsSdkManager,
  awsAccountId,
  invocationId,
  systemId,
  stacktapeUserInfo,
  stacktapeVersion,
  commandArgs,
  projectName,
  codebuildPipeline,
  callbackAfterBuildStart,
  codebuildBuildImage,
  stacktapeTrpcEndpoint
}: {
  awsSdkManager: AwsSdkManager;
  /**
   * Target aws account id
   */
  awsAccountId: string;
  // invocationId usually comes from globalStateManager
  invocationId: string;
  // systemId is unique identifier for the system - during codebuild deploy this system ID is injected as env variable
  // this helps to identify system from which codebuild deploy was started (instead of codebuild machine where it is running)
  systemId: string;
  // information about stacktape user - deployment will be performed sing provided api key
  stacktapeUserInfo: {
    // stacktape user id - should be id of the user whose API KEY you are passing into codebuild deploy operation
    id: string;
    // stacktape api key to use within codebuild deploy
    apiKey: string;
  };
  // version of stacktape to use during deploy - if nothing is specified, latest prod release is used
  stacktapeVersion?: string;
  // stacktape arguments used during deploy operation
  commandArgs: StacktapeArgs;
  // name of the service (as specified in stacktape config)
  projectName: string;
  // information about codebuild pipeline
  codebuildPipeline: {
    bucketName: string;
    logGroupName: string;
    codebuildProjectName: string;
    roleArn: string;
  };
  // function which runs after build is started
  callbackAfterBuildStart?: (build?: Build) => any;
  // image used for codebuild build environment
  codebuildBuildImage?: string;
  stacktapeTrpcEndpoint?: string;
}) => {
  const stackName = getStackName(projectName, commandArgs.stage);
  // storing API_KEY as SSM parameter for purposes of passing it to build
  const apiKeySsmParameterName = getStacktapeApiKeySsmParameterName({
    region: awsSdkManager.region,
    invocationId,
    userId: stacktapeUserInfo.id
  });
  await awsSdkManager.putSsmParameterValue({
    ssmParameterName: apiKeySsmParameterName,
    value: stacktapeUserInfo.apiKey,
    encrypt: true
  });
  let build: Build;
  try {
    build = await awsSdkManager.startCodebuildDelete({
      codebuildProjectName: codebuildPipeline.codebuildProjectName,
      codebuildRoleArn: codebuildPipeline.roleArn,
      commandArgs,
      logGroupName: codebuildPipeline.logGroupName,
      stackName,
      apiKeySsmParameterName,
      systemId,
      useStacktapeVersion: stacktapeVersion,
      invocationId,
      codebuildBuildImage,
      stacktapeTrpcEndpoint
    });
    if (callbackAfterBuildStart) {
      await callbackAfterBuildStart(build);
    }
    // wait for codebuild deployment to reach build phase - this is when deployment phase starts
    await awsSdkManager.waitForCodebuildDeploymentToReachBuildPhase({
      buildId: build.id,
      awsAccountId
    });
  } finally {
    // attempt to delete SSM parameter in case Codebuild failed to do so
    await awsSdkManager.deleteSsmParameter({ ssmParameterName: apiKeySsmParameterName });
  }
  return awsSdkManager.getCodebuildDeployment({ buildId: build.id });
};

export const getCodebuildLogStreamNameFromBuildInfo = ({ buildInfo }: { buildInfo: Build }) => {
  return `${buildInfo.logs?.cloudWatchLogs?.streamName}/${buildInfo.arn.split(':').at(-1)}`;
};

export const getCodebuildLogGroupNameFromBuildInfo = ({ buildInfo }: { buildInfo: Build }) => {
  return buildInfo.logs?.cloudWatchLogs?.groupName;
};
