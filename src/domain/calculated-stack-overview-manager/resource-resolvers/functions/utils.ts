import { globalStateManager } from '@application-services/global-state-manager';
import CustomResource from '@cloudform/cloudFormation/customResource';
import DeploymentGroup from '@cloudform/codeDeploy/deploymentGroup';
import SecurityGroup from '@cloudform/ec2/securityGroup';
import { GetAtt, Ref } from '@cloudform/functions';
import Role, { Policy } from '@cloudform/iam/role';
import Alias from '@cloudform/lambda/alias';
import Permission from '@cloudform/lambda/permission';
import LambdaUrl, { Cors } from '@cloudform/lambda/url';
import LogGroup from '@cloudform/logs/logGroup';
import { defaultLogRetentionDays } from '@config';
import { configManager } from '@domain-services/config-manager';
import { resolveReferenceToApplicationLoadBalancer } from '@domain-services/config-manager/utils/application-load-balancers';
import { resolveReferenceToLambdaFunction } from '@domain-services/config-manager/utils/lambdas';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getAssumeRolePolicyDocumentForFunctionRole } from '@shared/utils/roles';
import {
  getLambdaLogResourceArnsForPermissions,
  getLogGroupPolicyDocumentStatements,
  getPoliciesForRoles
} from '../_utils/role-helpers';

export const getLambdaFunctionSecurityGroup = ({
  stackName,
  stpFunctionName
}: {
  stackName: string;
  stpFunctionName: string;
}) =>
  new SecurityGroup({
    VpcId: vpcManager.getVpcId(),
    GroupName: awsResourceNames.workloadSecurityGroup(stpFunctionName, stackName),
    GroupDescription: awsResourceNames.workloadSecurityGroupGroupDescription(stpFunctionName, stackName)
  });

export const getLambdaLogGroup = (logGroupName: string, logRetentionInDays?: number) => {
  const logGroup = new LogGroup({
    LogGroupName: logGroupName
  });
  logGroup.Properties.RetentionInDays = logRetentionInDays || defaultLogRetentionDays.lambdaFunction;
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
  mountedEfsFilesystems
}: {
  workloadName: string;
  lambdaResourceName: string;
  iamRoleStatements: StpIamRoleStatement[];
  accessToResourcesRequiringRoleChanges: StpResourceScopableByConnectToAffectingRole[];
  accessToAwsServices: ConnectToAwsServicesMacro[];
  joinVpc?: boolean;
  destinations?: StpLambdaFunction['destinations'];
  isUsedInDeploymentHook?: boolean;
  configParentResourceType: StpLambdaFunction['configParentResourceType'];
  mountedEfsFilesystems?: StpEfsFilesystem[];
}) => {
  const role = new Role({
    RoleName: awsResourceNames.lambdaRole(
      globalStateManager.targetStack.stackName,
      globalStateManager.region,
      workloadName,
      configParentResourceType
    ),
    AssumeRolePolicyDocument: getAssumeRolePolicyDocumentForFunctionRole(),
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
    mountedEfsFilesystems
  });
  if (joinVpc) {
    policies.push(
      new Policy({
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
      })
    );
  }
  if (destinations && (destinations.onFailure || destinations.onSuccess)) {
    policies.push(
      new Policy({
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
      })
    );
  }
  if (isUsedInDeploymentHook) {
    policies.push(
      new Policy({
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
      })
    );
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
  const resource = new Alias({
    FunctionName: Ref(lambdaProps.cfLogicalName),
    FunctionVersion: GetAtt(cfLogicalNames.lambdaVersionPublisherCustomResource(lambdaProps.name), 'version'),
    Name: awsResourceNames.lambdaStpAlias()
  });
  const effectiveProvisionedConcurrency = provisionedConcurrency ?? lambdaProps.provisionedConcurrency;
  if (effectiveProvisionedConcurrency) {
    resource.Properties.ProvisionedConcurrencyConfig = {
      ProvisionedConcurrentExecutions: effectiveProvisionedConcurrency
    };
  }
  if (lambdaProps.deployment) {
    resource.UpdatePolicy = {
      CodeDeployLambdaAliasUpdate: {
        ApplicationName: Ref(cfLogicalNames.lambdaCodeDeployApp()),
        DeploymentGroupName: Ref(cfLogicalNames.codeDeployDeploymentGroup(lambdaProps.name)),
        AfterAllowTrafficHook:
          lambdaProps.deployment.afterTrafficShiftFunction &&
          Ref(
            resolveReferenceToLambdaFunction({
              stpResourceReference: lambdaProps.deployment.afterTrafficShiftFunction,
              referencedFrom: lambdaProps.name,
              referencedFromType: 'function'
            }).cfLogicalName
          ),
        BeforeAllowTrafficHook:
          lambdaProps.deployment.beforeAllowTrafficFunction &&
          Ref(
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
  const resource = new CustomResource({
    ServiceToken: GetAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn')
  });
  const additionalProperties: Pick<StpServiceCustomResourceProperties, 'publishLambdaVersion'> & {
    forceUpdate: number;
  } = {
    publishLambdaVersion: {
      functionName: Ref(lambdaProps.cfLogicalName)
    },
    forceUpdate: Date.now()
  };
  resource.Properties = { ...resource.Properties, ...additionalProperties };
  return resource;
};

export const getCodeDeployDeploymentGroup = ({
  lambdaProps
}: {
  lambdaProps: StpLambdaFunction | StpHelperLambdaFunction;
}) => {
  return new DeploymentGroup({
    ApplicationName: Ref(cfLogicalNames.lambdaCodeDeployApp()),
    AutoRollbackConfiguration: {
      Enabled: true,
      Events: ['DEPLOYMENT_FAILURE', 'DEPLOYMENT_STOP_ON_ALARM', 'DEPLOYMENT_STOP_ON_REQUEST']
    },
    DeploymentGroupName: awsResourceNames.codeDeployDeploymentGroup({
      stackName: globalStateManager.targetStack.stackName,
      stpResourceName: lambdaProps.name
    }),
    DeploymentStyle: {
      DeploymentType: 'BLUE_GREEN',
      DeploymentOption: 'WITH_TRAFFIC_CONTROL'
    },
    DeploymentConfigName: `CodeDeployDefault.Lambda${lambdaProps.deployment.strategy}`,
    ServiceRoleArn: GetAtt(cfLogicalNames.codeDeployServiceRole(), 'Arn')
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
        lambdaEndpointArn: aliasLogicalName ? Ref(aliasLogicalName) : GetAtt(cfLogicalName, 'Arn'),
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
  return new LambdaUrl({
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
    TargetFunctionArn: aliasLogicalName ? Ref(aliasLogicalName) : GetAtt(cfLogicalName, 'Arn')
  });
};

const getDefaultCorsConfiguration = () => {
  return new Cors({
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
  });
};

export const getLambdaPublicUrlPermission = ({
  lambdaProps: { aliasLogicalName, cfLogicalName }
}: {
  lambdaProps: StpLambdaFunction | StpHelperLambdaFunction;
}) => {
  return new Permission({
    Principal: '*',
    Action: 'lambda:InvokeFunctionUrl',
    FunctionName: aliasLogicalName ? Ref(aliasLogicalName) : GetAtt(cfLogicalName, 'Arn'),
    FunctionUrlAuthType: 'NONE'
  });
};
