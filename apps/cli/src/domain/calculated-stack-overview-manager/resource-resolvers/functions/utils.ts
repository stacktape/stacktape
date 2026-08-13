import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import type { Policy } from '@stacktape/cloudformation/resources/aws-iam-role';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { LambdaTargetDetails } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { StpEfsFilesystem } from '@domain-services/config-manager/resolved-types/efs-filesystem';
import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import type { StpResourceScopableByConnectToAffectingRole } from '@domain-services/config-manager/resolved-types/resources';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { defaultLogRetentionDays } from '@config';
import { configManager } from '@domain-services/config-manager';
import { resolveReferenceToApplicationLoadBalancer } from '@domain-services/config-manager/utils/application-load-balancers';
import { resolveReferenceToLambdaFunction } from '@domain-services/config-manager/utils/lambdas';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getCloudFormationLogRetentionDays } from '@utils/cloudformation';
import { getAssumeRolePolicyDocumentForFunctionRole } from 'src/aws/iam';
import {
  getLambdaLogResourceArnsForPermissions,
  getLogGroupPolicyDocumentStatements,
  getPoliciesForRoles
} from '../_utils/role-helpers';
import type { ApplicationLoadBalancerIntegration } from '@stacktape/config/events';
import type { CloudWatchLogGroupOptions } from '@stacktape/config/log-forwarding';
import type { StpIamRoleStatement } from '@stacktape/config/shared';
import { getCloudFormationLogGroupClassProperties } from '../_utils/log-groups';

export const getLambdaFunctionSecurityGroup = ({
  stackName,
  stpFunctionName
}: {
  stackName: string;
  stpFunctionName: string;
}) =>
  cfnResource('AWS::EC2::SecurityGroup', {
    VpcId: vpcManager.getVpcId(),
    GroupName: awsResourceNames.workloadSecurityGroup(stpFunctionName, stackName),
    GroupDescription: awsResourceNames.workloadSecurityGroupGroupDescription(stpFunctionName, stackName)
  });

export const getLambdaLogGroup = (
  logGroupName: string,
  logRetentionInDays?: number,
  logClass?: CloudWatchLogGroupOptions['logClass']
) => {
  const logGroup = cfnResource('AWS::Logs::LogGroup', {
    LogGroupName: logGroupName,
    ...getCloudFormationLogGroupClassProperties(logClass)
  });
  Object.assign(logGroup.Properties, {
    RetentionInDays: getCloudFormationLogRetentionDays(logRetentionInDays || defaultLogRetentionDays.lambdaFunction)
  });
  return logGroup;
};

export const getLambdaFunctionRole = ({
  workloadName,
  lambdaResourceName,
  accessToResourcesRequiringRoleChanges,
  accessToAwsServices,
  iamRoleStatements,
  joinVpc,
  destinations,
  isUsedInDeploymentHook,
  configParentResourceType,
  mountedEfsFilesystems,
  mountedS3FilesAccessPointArns
}: {
  workloadName: string;
  lambdaResourceName: string;
  iamRoleStatements: StpIamRoleStatement[];
  accessToResourcesRequiringRoleChanges: StpResourceScopableByConnectToAffectingRole[];
  accessToAwsServices: never[];
  joinVpc?: boolean;
  destinations?: StpLambdaFunction['destinations'];
  isUsedInDeploymentHook?: boolean;
  configParentResourceType: StpLambdaFunction['configParentResourceType'];
  mountedEfsFilesystems?: StpEfsFilesystem[];
  mountedS3FilesAccessPointArns?: (string | Intrinsic)[];
}) => {
  const isDevStack = calculatedStackOverviewManager.context.command === 'dev';
  const role = cfnResource('AWS::IAM::Role', {
    RoleName: awsResourceNames.lambdaRole(
      calculatedStackOverviewManager.context.stackName,
      calculatedStackOverviewManager.context.region,
      workloadName,
      configParentResourceType
    ),
    AssumeRolePolicyDocument: getAssumeRolePolicyDocumentForFunctionRole(),
    // 12 hours for dev stacks, 1 hour for regular stacks (default)
    ...(isDevStack && { MaxSessionDuration: 43200 }),
    Policies: [
      {
        PolicyName: 'allow-cloudwatch-logging-policy',
        PolicyDocument: {
          Statement: getLogGroupPolicyDocumentStatements(
            getLambdaLogResourceArnsForPermissions({ lambdaResourceName }),
            false
          ),
          Version: '2012-10-17'
        }
      }
    ]
  });
  const policies = getPoliciesForRoles({
    iamRoleStatements,
    accessToResourcesRequiringRoleChanges,
    accessToAwsServices,
    mountedEfsFilesystems,
    mountedS3FilesAccessPointArns
  });
  if (joinVpc) {
    policies.push({
      PolicyName: 'allow-vpc-network-interfaces-policy',
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: ['ec2:DeleteNetworkInterface', 'ec2:DescribeNetworkInterfaces', 'ec2:CreateNetworkInterface'],
            Resource: '*',
            Effect: 'Allow'
          }
        ]
      }
    });
  }
  if (destinations && (destinations.onFailure || destinations.onSuccess)) {
    policies.push({
      PolicyName: 'allow-destinations',
      PolicyDocument: {
        Version: '2012-10-17',
        // @note We don't know type of the destination, so we add all possible
        Statement: ['lambda:InvokeFunction', 'sqs:SendMessage', 'sns:Publish', 'events:PutEvents'].map((action) => ({
          Effect: 'Allow',
          Action: [action],
          Resource: []
            .concat(destinations.onFailure ? [destinations.onFailure] : [])
            .concat(destinations.onSuccess ? [destinations.onSuccess] : [])
        }))
      }
    });
  }
  if (isUsedInDeploymentHook) {
    policies.push({
      PolicyName: 'allow-hook-response',
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: ['codedeploy:PutLifecycleEventHookExecutionStatus'],
            Resource: '*',
            Effect: 'Allow'
          }
        ]
      }
    });
  }
  (role.Properties.Policies as Policy[]).push(...policies);
  return role;
};

export const getLambdaAliasResource = ({
  lambdaProps,
  provisionedConcurrency
}: {
  lambdaProps: StpLambdaFunction | StpHelperLambdaFunction;
  provisionedConcurrency?: number;
}) => {
  const resource = cfnResource('AWS::Lambda::Alias', {
    FunctionName: ref(lambdaProps.cfLogicalName),
    FunctionVersion: getAtt(cfLogicalNames.lambdaVersionPublisherCustomResource(lambdaProps.name), 'version'),
    Name: awsResourceNames.lambdaStpAlias()
  });
  // Explicit DependsOn ensures version publisher custom resource has completed before alias is created.
  // CloudFormation doesn't always properly detect dependencies via GetAtt on custom resource attributes.
  resource.DependsOn = [cfLogicalNames.lambdaVersionPublisherCustomResource(lambdaProps.name)];
  const effectiveProvisionedConcurrency = provisionedConcurrency ?? lambdaProps.provisionedConcurrency;
  if (effectiveProvisionedConcurrency) {
    Object.assign(resource.Properties, {
      ProvisionedConcurrencyConfig: {
        ProvisionedConcurrentExecutions: effectiveProvisionedConcurrency
      }
    });
  }
  if (lambdaProps.deployment) {
    resource.UpdatePolicy = {
      CodeDeployLambdaAliasUpdate: {
        ApplicationName: ref(cfLogicalNames.lambdaCodeDeployApp()),
        DeploymentGroupName: ref(cfLogicalNames.codeDeployDeploymentGroup(lambdaProps.name)),
        AfterAllowTrafficHook:
          lambdaProps.deployment.afterTrafficShiftFunction &&
          ref(
            resolveReferenceToLambdaFunction({
              stpResourceReference: lambdaProps.deployment.afterTrafficShiftFunction,
              referencedFrom: lambdaProps.name,
              referencedFromType: 'function'
            }).cfLogicalName
          ),
        BeforeAllowTrafficHook:
          lambdaProps.deployment.beforeAllowTrafficFunction &&
          ref(
            resolveReferenceToLambdaFunction({
              stpResourceReference: lambdaProps.deployment.beforeAllowTrafficFunction,
              referencedFrom: lambdaProps.name,
              referencedFromType: 'function'
            }).cfLogicalName
          )
      }
    };
  }
  return resource;
};

export const getLambdaVersionPublisherCustomResource = ({
  lambdaProps
}: {
  lambdaProps: StpLambdaFunction | StpHelperLambdaFunction;
}) => {
  const resource = cfnResource('AWS::CloudFormation::CustomResource', {
    ServiceToken: getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn')
  });
  // Note: codeDigest property is added via templateManager.addFinalTemplateOverrideFn in index.ts
  // This ensures the custom resource is re-invoked when (and only when) lambda code changes.
  const additionalProperties: Pick<StpServiceCustomResourceProperties, 'publishLambdaVersion'> = {
    publishLambdaVersion: {
      functionName: ref(lambdaProps.cfLogicalName)
    }
  };
  resource.Properties = { ...resource.Properties, ...additionalProperties };
  // Explicit DependsOn ensures Lambda function code is fully deployed before publishing version.
  // This is critical because the custom resource publishes whatever code is currently deployed.
  resource.DependsOn = [lambdaProps.cfLogicalName];
  return resource;
};

export const getCodeDeployDeploymentGroup = ({
  lambdaProps
}: {
  lambdaProps: StpLambdaFunction | StpHelperLambdaFunction;
}) => {
  return cfnResource('AWS::CodeDeploy::DeploymentGroup', {
    ApplicationName: ref(cfLogicalNames.lambdaCodeDeployApp()),
    AutoRollbackConfiguration: {
      Enabled: true,
      Events: ['DEPLOYMENT_FAILURE', 'DEPLOYMENT_STOP_ON_ALARM', 'DEPLOYMENT_STOP_ON_REQUEST']
    },
    DeploymentGroupName: awsResourceNames.codeDeployDeploymentGroup({
      stackName: calculatedStackOverviewManager.context.stackName,
      stpResourceName: lambdaProps.name
    }),
    DeploymentStyle: {
      DeploymentType: 'BLUE_GREEN',
      DeploymentOption: 'WITH_TRAFFIC_CONTROL'
    },
    DeploymentConfigName: `CodeDeployDefault.Lambda${lambdaProps.deployment.strategy}`,
    ServiceRoleArn: getAtt(cfLogicalNames.codeDeployServiceRole(), 'Arn')
  });
};

export const getTargetsForLambdaWorkloadEvents = ({
  lambdaProps
}: {
  lambdaProps: StpLambdaFunction | StpHelperLambdaFunction;
}) => {
  const targets: { [targetIdentifier: string]: LambdaTargetDetails } = {};
  const { name, configParentResourceType, cfLogicalName, aliasLogicalName } = lambdaProps;
  (lambdaProps.events || [])
    .filter((event) => event.type === 'application-load-balancer')
    .forEach((event: ApplicationLoadBalancerIntegration) => {
      const resolvedLbReference = resolveReferenceToApplicationLoadBalancer(
        event.properties,
        name,
        configParentResourceType as 'batch-job' | 'function'
      );
      const targetGroupIdentifier = getTargetGroupIdentifier(resolvedLbReference.loadBalancer.name, name);
      if (targets[targetGroupIdentifier]) {
        return;
      }
      targets[targetGroupIdentifier] = {
        lambdaEndpointArn: aliasLogicalName ? ref(aliasLogicalName) : getAtt(cfLogicalName, 'Arn'),
        loadBalancerName: resolvedLbReference.loadBalancer.name,
        stpResourceName: name
      };
    });
  return Object.values(targets);
};

const getTargetGroupIdentifier = (loadBalancerName: string, workloadName: string, targetContainerPort?: number) =>
  `${loadBalancerName}${workloadName}${targetContainerPort || ''}`;

export const getLambdaUrl = ({ lambdaProps }: { lambdaProps: StpLambdaFunction | StpHelperLambdaFunction }) => {
  const defaultCors = getDefaultCorsConfiguration();
  const { url, aliasLogicalName, cfLogicalName } = lambdaProps;
  return cfnResource('AWS::Lambda::Url', {
    AuthType: url?.authMode || 'NONE',
    Cors: url?.cors?.enabled
      ? {
          AllowOrigins: url.cors.allowedOrigins || defaultCors.AllowOrigins,
          AllowHeaders: url.cors.allowedMethods || defaultCors.AllowHeaders,
          AllowCredentials: url.cors.allowCredentials,
          AllowMethods: url.cors.allowedMethods || defaultCors.AllowMethods,
          MaxAge: url.cors.maxAge,
          ExposeHeaders: url.cors.exposedResponseHeaders
        }
      : undefined,
    InvokeMode: url?.responseStreamEnabled ? 'RESPONSE_STREAM' : 'BUFFERED',
    TargetFunctionArn: aliasLogicalName ? ref(aliasLogicalName) : getAtt(cfLogicalName, 'Arn')
  });
};

const getDefaultCorsConfiguration = () => {
  return {
    AllowOrigins: ['*'],
    AllowHeaders: [
      'Content-Type',
      'X-Amz-Date',
      'Authorization',
      'X-Api-Key',
      'X-Amz-Security-Token',
      'X-Amz-User-Agent'
    ],
    AllowMethods: ['*']
  };
};

export const getLambdaPublicUrlPermission = ({
  lambdaProps: { aliasLogicalName, cfLogicalName }
}: {
  lambdaProps: StpLambdaFunction | StpHelperLambdaFunction;
}) => {
  return cfnResource('AWS::Lambda::Permission', {
    Principal: '*',
    Action: 'lambda:InvokeFunctionUrl',
    FunctionName: aliasLogicalName ? ref(aliasLogicalName) : getAtt(cfLogicalName, 'Arn'),
    FunctionUrlAuthType: 'NONE'
  });
};
