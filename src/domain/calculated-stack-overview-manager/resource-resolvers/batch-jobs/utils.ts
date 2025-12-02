import type { ContainerProperties } from '@cloudform/batch/jobDefinition';
import { globalStateManager } from '@application-services/global-state-manager';
import ComputeEnvironment, { ComputeResources } from '@cloudform/batch/computeEnvironment';
import JobDefinition from '@cloudform/batch/jobDefinition';
import JobQueue from '@cloudform/batch/jobQueue';
import LaunchTemplate from '@cloudform/ec2/launchTemplate';
import SecurityGroup from '@cloudform/ec2/securityGroup';
import { GetAtt, Ref } from '@cloudform/functions';
import IAMInstanceProfile from '@cloudform/iam/instanceProfile';
import IAMRole from '@cloudform/iam/role';
import LogGroup from '@cloudform/logs/logGroup';
import CfStateMachine from '@cloudform/stepFunctions/stateMachine';
import { DEFAULT_CONTAINER_NODE_VERSION } from '@config';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getCfEnvironment } from '@utils/cloudformation';
import { getAugmentedEnvironment } from '@utils/environment';
import { getImageUrlForSingleTask } from '../_utils/image-urls';
import { getPoliciesForRoles } from '../_utils/role-helpers';

type BatchJobInstanceKind = 'spot' | 'onDemand';

/**
 * Generates the IAM Service Role Object to be used by the Batch Compute Environment
 */
export const getBatchServiceRole = () =>
  new IAMRole({
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
  new IAMRole({
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
                `arn:aws:events:${globalStateManager.region}:${globalStateManager.targetAwsAccount.awsAccountId}:rule/StepFunctionsGetEventsForBatchJobsRule`
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
  new IAMRole({
    Path: '/',
    RoleName: awsResourceNames.batchJobRole(
      globalStateManager.targetStack.stackName,
      globalStateManager.region,
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
  new IAMRole({
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
  new IAMRole({
    Path: '/',
    AssumeRolePolicyDocument: {
      Version: '2008-10-17',
      Statement: [{ Effect: 'Allow', Principal: { Service: 'ec2.amazonaws.com' }, Action: 'sts:AssumeRole' }]
    },
    ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role']
  });

export const getBatchInstanceProfile = () =>
  new IAMInstanceProfile({
    Path: '/',
    Roles: [Ref(cfLogicalNames.batchInstanceRole())]
  });

export const getBatchInstanceDefaultSecurityGroup = () =>
  new SecurityGroup({
    VpcId: vpcManager.getVpcId(),
    GroupName: awsResourceNames.batchInstanceDefaultSecurityGroup(globalStateManager.targetStack.stackName),
    GroupDescription: `Stacktape generated security group for batch ec2 instances in stack ${globalStateManager.targetStack.stackName}`
  });
/**
 * Generates Launch Template used by compute environments. This launch template increases disk size for every instance spawned into compute environment
 */
export const getIncreasedDiskSizeLaunchTemplate = () =>
  new LaunchTemplate({
    LaunchTemplateName: awsResourceNames.batchInstanceLaunchTemplate(globalStateManager.targetStack.stackName),
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
  return new ComputeResources({
    Type: spot ? 'SPOT' : 'EC2',
    InstanceRole: GetAtt(cfLogicalNames.batchInstanceProfile(), 'Arn'),
    SpotIamFleetRole: GetAtt(cfLogicalNames.batchSpotFleetRole(), 'Arn'),
    MinvCpus: 0,
    MaxvCpus: 1000,
    Ec2Configuration: [{ ImageType: gpu ? 'ECS_AL2_NVIDIA' : 'ECS_AL2' }],
    InstanceTypes: gpu ? ['p4d', 'g5'] : ['optimal'],
    Subnets: vpcManager.getPublicSubnetIds(),
    AllocationStrategy: 'BEST_FIT',
    SecurityGroupIds: [Ref(cfLogicalNames.batchInstanceDefaultSecurityGroup())],
    LaunchTemplate: {
      LaunchTemplateId: Ref(cfLogicalNames.batchInstanceLaunchTemplate())
    },
    Tags: tagObject
  });
};

export const getBatchComputeEnvironment = ({ spot, gpu }: { spot: boolean; gpu: boolean }) => {
  const tagObject = {};
  stackManager.getTags().forEach(({ Key, Value }) => {
    tagObject[Key] = Value;
  });
  return new ComputeEnvironment({
    // ComputeEnvironmentName: awsResourceNames.batchComputeEnvironment(globalStateManager.targetStack.stackName, spot, gpu),
    ServiceRole: GetAtt(cfLogicalNames.batchServiceRole(), 'Arn'),
    State: 'ENABLED',
    Type: 'MANAGED',
    ComputeResources: getBatchComputeResourcesConfig(spot, gpu),
    Tags: tagObject
  });
};

export const getBatchJobQueue = ({ spot, gpu }: { spot: boolean; gpu: boolean }) =>
  new JobQueue({
    JobQueueName: awsResourceNames.batchJobQueue(globalStateManager.targetStack.stackName, spot, gpu),
    Priority: 10,
    State: 'ENABLED',
    ComputeEnvironmentOrder: [
      {
        ComputeEnvironment: Ref(cfLogicalNames.batchComputeEnvironment(spot, gpu)),
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
            'awslogs-region': globalStateManager.region as string,
            'awslogs-group': Ref(cfLogicalNames.batchJobLogGroup(name)),
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
    JobRoleArn: GetAtt(cfLogicalNames.batchJobExecutionRole(name), 'Arn')
  };
};

export const getBatchJobDefinition = ({ name, workload }: { name: string; workload: StpBatchJob }) => {
  return new JobDefinition({
    JobDefinitionName: awsResourceNames.batchJobDefinition(name, globalStateManager.targetStack.stackName),
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
                Value: globalStateManager.region
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
  return new CfStateMachine({
    StateMachineName: awsResourceNames.batchStateMachine(name, stackName),
    RoleArn: GetAtt(cfLogicalNames.batchStateMachineExecutionRole(), 'Arn'),
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
  return new LogGroup({
    LogGroupName: awsResourceNames.batchJobLogGroup({ stpResourceName: workloadName, stackName }),
    RetentionInDays: retentionDays
  });
};
