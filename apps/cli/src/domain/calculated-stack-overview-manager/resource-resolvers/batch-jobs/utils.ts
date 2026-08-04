import type { ContainerProperties } from '@stacktape/cloudformation/resources/aws-batch-jobdefinition';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type { StpBatchJob } from '@domain-services/config-manager/resolved-types/batch-jobs';
import type { StpResourceScopableByConnectToAffectingRole } from '@domain-services/config-manager/resolved-types/resources';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';

import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import type { SupportedAWSRegion as AWSRegion } from '@stacktape/config/aws-regions';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getCfEnvironment, getCloudFormationLogRetentionDays } from '@utils/cloudformation';
import { getAugmentedEnvironment } from '@utils/environment';
import { getImageUrlForSingleTask } from '../_utils/image-urls';
import { getPoliciesForRoles } from '../_utils/role-helpers';
import type { ConnectToAwsServicesMacro } from '@stacktape/config/aws-service-macros';
import type {
  CustomDockerfileBjImagePackaging,
  EsLanguageSpecificConfig,
  PrebuiltBjImagePackaging
} from '@stacktape/config/deployment-artifacts';
import type { StpIamRoleStatement } from '@stacktape/config/shared';
import type { StpStateMachine } from '@stacktape/config/state-machines';
import { DEFAULT_CONTAINER_NODE_VERSION } from '@stacktape/packaging/bundlers/constants';

type BatchJobInstanceKind = 'spot' | 'onDemand';

/**
 * Generates the IAM Service Role Object to be used by the Batch Compute Environment
 */
export const getBatchServiceRole = () =>
  cfnResource('AWS::IAM::Role', {
    Path: '/',
    AssumeRolePolicyDocument: {
      Version: '2008-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'batch.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AWSBatchServiceRole']
  });

/**
 * Generates Iam role used by step function to execute services batchJobs
 */
export const getBatchStateMachineExecutionRole = () =>
  cfnResource('AWS::IAM::Role', {
    Path: '/',
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'states.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    Policies: [
      {
        PolicyName: 'batchjob-sm-policy',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            { Action: ['batch:SubmitJob', 'batch:DescribeJobs', 'batch:TerminateJob'], Resource: '*', Effect: 'Allow' },
            {
              Action: ['events:PutTargets', 'events:PutRule', 'events:DescribeRule'],
              Resource: [
                `arn:aws:events:${calculatedStackOverviewManager.context.region}:${calculatedStackOverviewManager.context.accountId}:rule/StepFunctionsGetEventsForBatchJobsRule`
              ],
              Effect: 'Allow'
            }
          ]
        }
      }
    ]
  });

/**
 * Generate execution role for batchJob
 */
export const getBatchJobExecutionRole = ({
  workloadName,
  iamRoleStatements,
  accessToResourcesRequiringRoleChanges,
  accessToAwsServices
}: {
  workloadName: string;
  iamRoleStatements: StpIamRoleStatement[];
  accessToResourcesRequiringRoleChanges: StpResourceScopableByConnectToAffectingRole[];
  accessToAwsServices: ConnectToAwsServicesMacro[];
}) =>
  cfnResource('AWS::IAM::Role', {
    Path: '/',
    RoleName: awsResourceNames.batchJobRole(
      calculatedStackOverviewManager.context.stackName,
      calculatedStackOverviewManager.context.region,
      workloadName
    ),
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'ecs-tasks.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    Policies: getPoliciesForRoles({
      iamRoleStatements,
      accessToResourcesRequiringRoleChanges,
      accessToAwsServices
    })
  });

/**
 * Generates the IAM Service Role Object that will be used to manage spot instances in the compute environment
 */
export const getBatchSpotFleetRole = () =>
  cfnResource('AWS::IAM::Role', {
    Path: '/',
    AssumeRolePolicyDocument: {
      Version: '2008-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'spotfleet.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AmazonEC2SpotFleetTaggingRole']
  });

/**
 * Generates the IAM Service Role Object that will be used on instances within our compute environment to launch containers
 */
export const getBatchInstanceRole = () =>
  cfnResource('AWS::IAM::Role', {
    Path: '/',
    AssumeRolePolicyDocument: {
      Version: '2008-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'ec2.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role']
  });

export const getBatchInstanceProfile = () =>
  cfnResource('AWS::IAM::InstanceProfile', {
    Path: '/',
    Roles: [ref(cfLogicalNames.batchInstanceRole())]
  });

export const getBatchInstanceDefaultSecurityGroup = () =>
  cfnResource('AWS::EC2::SecurityGroup', {
    VpcId: vpcManager.getVpcId(),
    GroupName: awsResourceNames.batchInstanceDefaultSecurityGroup(calculatedStackOverviewManager.context.stackName),
    GroupDescription: `Stacktape generated security group for batch ec2 instances in stack ${calculatedStackOverviewManager.context.stackName}`
  });
/**
 * Generates Launch Template used by compute environments. This launch template increases disk size for every instance spawned into compute environment
 */
export const getIncreasedDiskSizeLaunchTemplate = () =>
  cfnResource('AWS::EC2::LaunchTemplate', {
    LaunchTemplateName: awsResourceNames.batchInstanceLaunchTemplate(calculatedStackOverviewManager.context.stackName),
    LaunchTemplateData: {
      BlockDeviceMappings: [
        {
          DeviceName: '/dev/xvda',
          Ebs: {
            VolumeSize: 100
          }
        }
      ]
    }
  });

/**
 * generates Compute Resource Config for compute environment
 */
export const getBatchComputeResourcesConfig = (spot: boolean, gpu: boolean) => {
  const tagObject = {};
  stackManager.getTags().forEach(({ Key, Value }) => {
    tagObject[Key] = Value;
  });
  return {
    Type: spot ? 'SPOT' : 'EC2',
    InstanceRole: getAtt(cfLogicalNames.batchInstanceProfile(), 'Arn'),
    SpotIamFleetRole: getAtt(cfLogicalNames.batchSpotFleetRole(), 'Arn'),
    MinvCpus: 0,
    MaxvCpus: 1000,
    Ec2Configuration: [{ ImageType: gpu ? 'ECS_AL2_NVIDIA' : 'ECS_AL2' }],
    InstanceTypes: gpu ? ['p4d', 'g5'] : ['optimal'],
    Subnets: vpcManager.getPublicSubnetIds().slice(0, 2),
    AllocationStrategy: 'BEST_FIT',
    SecurityGroupIds: [ref(cfLogicalNames.batchInstanceDefaultSecurityGroup())],
    LaunchTemplate: {
      LaunchTemplateId: ref(cfLogicalNames.batchInstanceLaunchTemplate())
    },
    Tags: tagObject
  };
};

export const getBatchComputeEnvironment = ({ spot, gpu }: { spot: boolean; gpu: boolean }) => {
  const tagObject = {};
  stackManager.getTags().forEach(({ Key, Value }) => {
    tagObject[Key] = Value;
  });
  return cfnResource('AWS::Batch::ComputeEnvironment', {
    // ComputeEnvironmentName: awsResourceNames.batchComputeEnvironment(calculatedStackOverviewManager.context.stackName, spot, gpu),
    ServiceRole: getAtt(cfLogicalNames.batchServiceRole(), 'Arn'),
    State: 'ENABLED',
    Type: 'MANAGED',
    ComputeResources: getBatchComputeResourcesConfig(spot, gpu),
    Tags: tagObject
  });
};

export const getBatchJobQueue = ({ spot, gpu }: { spot: boolean; gpu: boolean }) =>
  cfnResource('AWS::Batch::JobQueue', {
    JobQueueName: awsResourceNames.batchJobQueue(calculatedStackOverviewManager.context.stackName, spot, gpu),
    Priority: 10,
    State: 'ENABLED',
    ComputeEnvironmentOrder: [
      {
        ComputeEnvironment: ref(cfLogicalNames.batchComputeEnvironment(spot, gpu)),
        Order: 0
      }
    ]
  });

export const getBatchJobDefinitionContainerProperties = ({
  name,
  workload
}: {
  name: string;
  workload: StpBatchJob;
}): ContainerProperties => {
  const logsEnabled = !workload.logging?.disabled;

  // Get packaging info for environment augmentation
  const packagingType = workload.container.packaging?.type as Parameters<
    typeof getAugmentedEnvironment
  >[0]['packagingType'];
  const entryfilePath = (workload.container.packaging?.properties as { entryfilePath?: string })?.entryfilePath;
  const languageSpecificConfig = (
    workload.container.packaging?.properties as { languageSpecificConfig?: EsLanguageSpecificConfig }
  )?.languageSpecificConfig;
  const nodeVersion = languageSpecificConfig?.nodeVersion || DEFAULT_CONTAINER_NODE_VERSION;

  // Augment environment with source maps and experimental flags for JS/TS workloads
  const augmentedEnvironment = getAugmentedEnvironment({
    environment: workload.container.environment,
    workloadType: 'batch-job',
    packagingType,
    entryfilePath,
    nodeVersion
  });

  return {
    Command: (workload.container.packaging as CustomDockerfileBjImagePackaging | PrebuiltBjImagePackaging).properties
      .command,
    Environment: getCfEnvironment(augmentedEnvironment),
    Image: getImageUrlForSingleTask(workload),
    // @todo set this cpu number properties consistently
    Vcpus: workload.resources.cpu,
    Memory: workload.resources.memory,
    LogConfiguration: logsEnabled
      ? {
          LogDriver: 'awslogs',
          Options: {
            'awslogs-region': calculatedStackOverviewManager.context.region as string,
            'awslogs-group': ref(cfLogicalNames.batchJobLogGroup(name)),
            'awslogs-stream-prefix': 'batch'
          }
        }
      : undefined,
    Ulimits: [
      {
        SoftLimit: 10000,
        HardLimit: 10000,
        Name: 'nofile'
      }
    ],
    ResourceRequirements: workload.resources.gpu ? [{ Type: 'GPU', Value: `${workload.resources.gpu}` }] : [],
    JobRoleArn: getAtt(cfLogicalNames.batchJobExecutionRole(name), 'Arn')
  };
};

export const getBatchJobDefinition = ({ name, workload }: { name: string; workload: StpBatchJob }) => {
  return cfnResource('AWS::Batch::JobDefinition', {
    JobDefinitionName: awsResourceNames.batchJobDefinition(name, calculatedStackOverviewManager.context.stackName),
    Type: 'container',
    PropagateTags: true,
    ContainerProperties: getBatchJobDefinitionContainerProperties({
      name,
      workload
    })
  });
};

const buildStateName = ({ instanceKind, index }: { instanceKind: BatchJobInstanceKind; index: number }) => {
  return `${instanceKind}${index}`;
};

export const getBatchStateMachineDefinitionString = (
  name: string,
  workload: StpBatchJob,
  stackName: string,
  region: AWSRegion,
  accountId: string
) => {
  const usesGpu = Boolean(workload.resources.gpu);
  let states: StpStateMachine['definition']['States'] = {};
  states = {
    fail: {
      Type: 'Fail'
    },
    succeed: {
      Type: 'Succeed'
    }
  };

  const totalAttempts = workload.retryConfig?.attempts || 1;
  const instanceKind: BatchJobInstanceKind = workload.useSpotInstances ? 'spot' : 'onDemand';

  for (let i = 1; i <= totalAttempts; i++) {
    states = {
      ...states,
      [buildStateName({ instanceKind, index: i })]: {
        Type: 'Task',
        Resource: 'arn:aws:states:::batch:submitJob.sync',
        Parameters: {
          JobDefinition: `arn:aws:batch:${region}:${accountId}:job-definition/${awsResourceNames.batchJobDefinition(
            name,
            stackName
          )}`,
          'JobName.$': '$.jobName',
          JobQueue: `arn:aws:batch:${region}:${accountId}:job-queue/${awsResourceNames.batchJobQueue(
            stackName,
            instanceKind === 'spot',
            usesGpu
          )}`,
          ContainerOverrides: {
            Environment: [
              {
                Name: 'STP_TRIGGER_EVENT_DATA',
                'Value.$': '$.triggerEvent'
              },
              {
                Name: 'STP_MAXIMUM_ATTEMPTS',
                Value: `${totalAttempts}`
              },
              {
                Name: 'STP_CURRENT_ATTEMPT',
                Value: `${i}`
              },
              {
                Name: 'AWS_REGION',
                Value: calculatedStackOverviewManager.context.region
              }
            ]
          },
          Timeout: workload.timeout
            ? {
                AttemptDurationSeconds: workload.timeout
              }
            : undefined
        },
        Next: 'succeed',
        Catch: [
          {
            ErrorEquals: ['States.ALL'],
            Next: i === totalAttempts ? 'fail' : `wait${i}`,
            ResultPath: '$.error-info'
          }
        ]
      },
      ...(i === totalAttempts
        ? {}
        : {
            [`wait${i}`]: {
              Type: 'Wait',
              Seconds:
                (workload.retryConfig?.retryIntervalSeconds || 0) *
                i *
                (workload.retryConfig?.retryIntervalMultiplier || 1),
              Next: buildStateName({ instanceKind, index: i + 1 })
            }
          })
    };
  }

  const stateMachine = {
    StartAt: buildStateName({ instanceKind, index: 1 }),
    States: states
  };
  return JSON.stringify(stateMachine);
};

export const getBatchStateMachine = (
  name: string,
  workload: StpBatchJob,
  stackName: string,
  region: AWSRegion,
  accountId: string
) => {
  return cfnResource('AWS::StepFunctions::StateMachine', {
    StateMachineName: awsResourceNames.batchStateMachine(name, stackName),
    RoleArn: getAtt(cfLogicalNames.batchStateMachineExecutionRole(), 'Arn'),
    StateMachineType: 'STANDARD',
    DefinitionString: getBatchStateMachineDefinitionString(name, workload, stackName, region, accountId)
  });
};

export const getBachJobLogGroup = ({
  stackName,
  workloadName,
  retentionDays
}: {
  workloadName: string;
  stackName: string;
  retentionDays: number;
}) => {
  return cfnResource('AWS::Logs::LogGroup', {
    LogGroupName: awsResourceNames.batchJobLogGroup({ stpResourceName: workloadName, stackName }),
    RetentionInDays: getCloudFormationLogRetentionDays(retentionDays)
  });
};
