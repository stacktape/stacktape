import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import type { AnyCloudFormationResource } from '@stacktape/cloudformation/resource';
import type { Policy } from '@stacktape/cloudformation/resources/aws-iam-role';
import { getAtt, join, ref, select, split } from '@stacktape/cloudformation/intrinsics';
import type { CloudformationIamRoleStatement } from '@domain-services/cloudformation-stack-manager/types';
import type { SupportedMongoAtlasV1CfResourceType } from '@domain-services/cloudformation-registry-manager/types';
import type { StpEfsFilesystem } from '@domain-services/config-manager/resolved-types/efs-filesystem';
import type { StpMongoDbAtlasCluster } from '@domain-services/config-manager/resolved-types/mongo-db-atlas-clusters';
import type { StpResourceScopableByConnectToAffectingRole } from '@domain-services/config-manager/resolved-types/resources';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { thirdPartyProviderManager } from '@domain-services/third-party-provider-credentials-manager';
import { arns } from '@stacktape/naming/arns';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import type { SupportedAWSRegion as AWSRegion } from '@stacktape/config/aws-regions';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import type { ConnectToAwsServicesMacro } from '@stacktape/config/aws-service-macros';
import type { BucketPolicyIamRoleStatement } from '@stacktape/config/buckets';
import type { StpIamRoleStatement } from '@stacktape/config/shared';

export const getAtlasMongoRoleAssociatedUserResource = ({
  roleCfLogicalName,
  accessToAtlasMongoClusterResources
}: {
  roleCfLogicalName: string;
  accessToAtlasMongoClusterResources: StpMongoDbAtlasCluster[];
}) => {
  const atlasMongoProviderConfig = thirdPartyProviderManager.getAtlasMongoDbProviderConfig();
  const resourceType: SupportedMongoAtlasV1CfResourceType = 'MongoDB::StpAtlasV1::DatabaseUser';
  return {
    Type: resourceType,
    DependsOn: accessToAtlasMongoClusterResources.map(({ name }) => cfLogicalNames.atlasMongoCluster(name)),
    Properties: {
      DatabaseName: '$external',
      ProjectId: ref(cfLogicalNames.atlasMongoProject()),
      AwsIAMType: 'ROLE',
      Roles: [{ RoleName: 'readWriteAnyDatabase', DatabaseName: 'admin' }],
      Scopes: accessToAtlasMongoClusterResources.map(({ name }) => ({
        Type: 'CLUSTER',
        Name: awsResourceNames.atlasMongoCluster(name)
      })),
      Username: getAtt(roleCfLogicalName, 'Arn'),
      ApiKeys: {
        PublicKey: atlasMongoProviderConfig.publicKey,
        PrivateKey: atlasMongoProviderConfig.privateKey
      }
    }
  } as AnyCloudFormationResource;
};

export const getFormattedRuleStatements = (
  statements: (StpIamRoleStatement | BucketPolicyIamRoleStatement)[]
): CloudformationIamRoleStatement[] =>
  statements.map(({ Resource, Effect, Action, Sid, Condition, ...PrincipalProps }) => ({
    Sid,
    Resource,
    Effect: Effect || 'Allow',
    Action: Action || '*',
    Condition,
    Principal: (PrincipalProps as BucketPolicyIamRoleStatement).Principal
  }));

type StatementProps = {
  stacktapeResourceName: string;
  accountId: string;
  stackName: string;
  region: AWSRegion;
};

const getStatementsForAccessingLambda = (statementProps: StatementProps) => [
  {
    Effect: 'Allow',
    Action: ['lambda:InvokeFunction'],
    Resource: arns.lambda(statementProps)
  }
];

const getStatementsForAccessingContainerWorkloads = (statementProps: StatementProps) => [
  {
    Effect: 'Allow',
    Action: ['ecs:DescribeServices', 'ecs:UpdateService'],
    Resource: arns.wildcardContainerService({
      accountId: statementProps.accountId,
      stackName: statementProps.stackName,
      workloadName: statementProps.stacktapeResourceName,
      region: calculatedStackOverviewManager.context.region
    })
  },
  {
    Effect: 'Allow',
    Action: ['ecs:ListServices'],
    Resource: '*'
  }
];

const getSubmitJobStatement = (
  { accountId, stacktapeResourceName, stackName }: StatementProps,
  isSpotInstance: boolean,
  hasGpu: boolean
) => {
  return {
    Action: ['batch:SubmitJob'],
    Resource: [
      `arn:aws:batch:${calculatedStackOverviewManager.context.region}:${accountId}:job-definition/${awsResourceNames.batchJobDefinition(
        stacktapeResourceName,
        stackName
      )}*`,
      `arn:aws:batch:${calculatedStackOverviewManager.context.region}:${accountId}:job-queue/${awsResourceNames.batchJobQueue(
        stackName,
        isSpotInstance,
        hasGpu
      )}`
    ],
    Effect: 'Allow'
  };
};

const getStatementsForAccessingBatchJobs = (statementProps: StatementProps, hasGpu: boolean): StpIamRoleStatement[] => [
  getSubmitJobStatement(statementProps, true, hasGpu),
  getSubmitJobStatement(statementProps, false, hasGpu),
  {
    Action: ['batch:DescribeJobs', 'batch:TerminateJob', 'batch:ListJobs'],
    Resource: ['*'],
    Effect: 'Allow'
  },
  {
    Effect: 'Allow',
    Action: ['states:StartExecution', 'states:StopExecution', 'states:ListExecutions'],
    Resource: [ref(cfLogicalNames.batchStateMachine(statementProps.stacktapeResourceName)) as unknown as string]
  },
  {
    Effect: 'Allow',
    Action: ['states:DescribeExecution'],
    Resource: [
      join(':', [
        select(0, split(':', ref(cfLogicalNames.batchStateMachine(statementProps.stacktapeResourceName)))),
        select(1, split(':', ref(cfLogicalNames.batchStateMachine(statementProps.stacktapeResourceName)))),
        select(2, split(':', ref(cfLogicalNames.batchStateMachine(statementProps.stacktapeResourceName)))),
        select(3, split(':', ref(cfLogicalNames.batchStateMachine(statementProps.stacktapeResourceName)))),
        select(4, split(':', ref(cfLogicalNames.batchStateMachine(statementProps.stacktapeResourceName)))),
        'execution',
        select(6, split(':', ref(cfLogicalNames.batchStateMachine(statementProps.stacktapeResourceName)))),
        '*'
      ]) as unknown as string
    ]
  }
];

const getStatementsForAccessingStateMachine = (statementProps: StatementProps): StpIamRoleStatement[] => [
  {
    Effect: 'Allow',
    Action: ['states:StartExecution', 'states:StopExecution', 'states:ListExecutions', 'states:DescribeExecution'],
    Resource: [ref(cfLogicalNames.stateMachine(statementProps.stacktapeResourceName)) as unknown as string]
  },
  {
    Effect: 'Allow',
    Action: ['states:DescribeExecution'],
    Resource: [
      join(':', [
        select(0, split(':', ref(cfLogicalNames.stateMachine(statementProps.stacktapeResourceName)))),
        select(1, split(':', ref(cfLogicalNames.stateMachine(statementProps.stacktapeResourceName)))),
        select(2, split(':', ref(cfLogicalNames.stateMachine(statementProps.stacktapeResourceName)))),
        select(3, split(':', ref(cfLogicalNames.stateMachine(statementProps.stacktapeResourceName)))),
        select(4, split(':', ref(cfLogicalNames.stateMachine(statementProps.stacktapeResourceName)))),
        'execution',
        select(6, split(':', ref(cfLogicalNames.stateMachine(statementProps.stacktapeResourceName)))),
        '*'
      ]) as unknown as string
    ]
  }
];

const getStatementsForAccessingEventBus = (statementProps: StatementProps): StpIamRoleStatement[] => [
  {
    Resource: [getAtt(cfLogicalNames.eventBus(statementProps.stacktapeResourceName), 'Arn') as unknown as string],
    Action: ['events:PutEvents'],
    Effect: 'Allow'
  }
];

const getStatementsForAccessingBucket = (statementProps: StatementProps): StpIamRoleStatement[] => [
  {
    Resource: [getAtt(cfLogicalNames.bucket(statementProps.stacktapeResourceName), 'Arn') as unknown as string],
    Action: ['s3:ListBucket', 's3:GetBucket*'],
    Effect: 'Allow'
  },
  {
    Resource: [
      join('', [getAtt(cfLogicalNames.bucket(statementProps.stacktapeResourceName), 'Arn'), '/*']) as unknown as string
    ],
    Action: ['s3:*Object*', 's3:Abort*', 's3:*MultipartUpload*'],
    Effect: 'Allow'
  }
];

const getStatementsForAccessingDynamoTable = (statementProps: StatementProps): StpIamRoleStatement[] => [
  {
    Effect: 'Allow',
    Action: [
      'dynamodb:BatchGet*',
      'dynamodb:ConditionCheckItem',
      'dynamodb:DescribeStream',
      'dynamodb:DescribeTable',
      'dynamodb:Get*',
      'dynamodb:Query',
      'dynamodb:Scan',
      'dynamodb:BatchWrite*',
      'dynamodb:DeleteItem',
      'dynamodb:UpdateItem',
      'dynamodb:PutItem'
    ],
    Resource: [
      getAtt(cfLogicalNames.dynamoGlobalTable(statementProps.stacktapeResourceName), 'Arn') as unknown as string,
      join('', [
        getAtt(cfLogicalNames.dynamoGlobalTable(statementProps.stacktapeResourceName), 'Arn'),
        '/index/*'
      ]) as unknown as string
    ]
  }
];

const getStatementsForAccessingOpenSearchDomain = (statementProps: StatementProps): StpIamRoleStatement[] => [
  {
    Effect: 'Allow',
    Action: ['es:ESHttp*'],
    Resource: [
      join('', [
        getAtt(cfLogicalNames.openSearchDomain(statementProps.stacktapeResourceName), 'Arn'),
        '/*'
      ]) as unknown as string
    ]
  }
];

const getStatementsForAccessingUserAuthPool = (statementProps: StatementProps): StpIamRoleStatement[] => [
  {
    Effect: 'Allow',
    Action: ['cognito-idp:*'],
    Resource: [getAtt(cfLogicalNames.userPool(statementProps.stacktapeResourceName), 'Arn') as unknown as string]
  }
];

const getStatementsForAccessingSqsQueue = (statementProps: StatementProps): StpIamRoleStatement[] => [
  {
    Effect: 'Allow',
    Action: [
      'sqs:ChangeMessageVisibility',
      'sqs:DeleteMessage',
      'sqs:GetQueueAttributes',
      'sqs:GetQueueUrl',
      'sqs:ListQueueTags',
      'sqs:PurgeQueue',
      'sqs:ReceiveMessage',
      'sqs:SendMessage'
    ],
    Resource: [getAtt(cfLogicalNames.sqsQueue(statementProps.stacktapeResourceName), 'Arn') as unknown as string]
  }
];

const getStatementsForAccessingSnsTopic = (statementProps: StatementProps): StpIamRoleStatement[] => [
  {
    Effect: 'Allow',
    Action: [
      'sns:ConfirmSubscription',
      'sns:GetTopicAttributes',
      'sns:ListSubscriptionsByTopic',
      'sns:Publish',
      'sns:Subscribe',
      'sns:Unsubscribe'
    ],
    Resource: [getAtt(cfLogicalNames.snsTopic(statementProps.stacktapeResourceName), 'TopicArn') as unknown as string]
  }
];

const getStatementsForAccessingKinesisStream = (statementProps: StatementProps): StpIamRoleStatement[] => [
  {
    Effect: 'Allow',
    Action: [
      'kinesis:DescribeStream',
      'kinesis:DescribeStreamSummary',
      'kinesis:GetRecords',
      'kinesis:GetShardIterator',
      'kinesis:ListShards',
      'kinesis:ListStreams',
      'kinesis:PutRecord',
      'kinesis:PutRecords'
    ],
    Resource: [getAtt(cfLogicalNames.kinesisStream(statementProps.stacktapeResourceName), 'Arn') as unknown as string]
  }
];

const getStatementsForAwsServiceMacro = (macro: ConnectToAwsServicesMacro): StpIamRoleStatement[] => {
  if (macro === 'aws:ses') {
    return [
      {
        Effect: 'Allow',
        Action: ['ses:*'],
        Resource: ['*']
      }
    ];
  }
  return [];
};

export const getPolicyForCustomIamRoleStatements = (statements: StpIamRoleStatement[]) => {
  return {
    PolicyName: 'custom-iam-role-statements',
    PolicyDocument: {
      Version: '2012-10-17',
      Statement: getFormattedRuleStatements(statements)
    }
  };
};

export const getPoliciesForRoles = ({
  iamRoleStatements,
  accessToResourcesRequiringRoleChanges,
  accessToAwsServices,
  mountedEfsFilesystems,
  mountedS3FilesAccessPointArns
}: {
  iamRoleStatements: StpIamRoleStatement[];
  accessToResourcesRequiringRoleChanges: StpResourceScopableByConnectToAffectingRole[];
  accessToAwsServices: ConnectToAwsServicesMacro[];
  mountedEfsFilesystems?: StpEfsFilesystem[];
  mountedS3FilesAccessPointArns?: (string | Intrinsic)[];
}) => {
  const policies: Policy[] = [];
  if (iamRoleStatements?.length) {
    policies.push(getPolicyForCustomIamRoleStatements(iamRoleStatements));
  }
  if (mountedEfsFilesystems?.length) {
    policies.push(getPolicyForMountedEfsFilesystems(mountedEfsFilesystems));
  }
  if (mountedS3FilesAccessPointArns?.length) {
    policies.push(getPolicyForMountedS3FilesAccessPoints(mountedS3FilesAccessPointArns));
  }
  if (accessToResourcesRequiringRoleChanges?.length || accessToAwsServices?.length) {
    const connectToStatements = [];
    Array.from(new Set(accessToAwsServices)).forEach((macro) => {
      connectToStatements.push(...getStatementsForAwsServiceMacro(macro));
    });
    accessToResourcesRequiringRoleChanges.forEach((resource) => {
      const statementProps: StatementProps = {
        stacktapeResourceName: resource.name,
        accountId: calculatedStackOverviewManager.context.accountId,
        // stackBaseName: configManager.stackBaseName,
        stackName: calculatedStackOverviewManager.context.stackName,
        region: calculatedStackOverviewManager.context.region
      };
      switch (resource.type) {
        case 'function': {
          connectToStatements.push(...getStatementsForAccessingLambda(statementProps));
          break;
        }
        // case 'web-service':
        // case 'private-service':
        // case 'worker-service':
        case 'multi-container-workload': {
          connectToStatements.push(...getStatementsForAccessingContainerWorkloads(statementProps));
          break;
        }
        case 'batch-job': {
          connectToStatements.push(
            ...getStatementsForAccessingBatchJobs(
              statementProps,
              !!configManager.batchJobs.find((bj) => bj.name === resource.name).resources.gpu
            )
          );
          break;
        }
        case 'state-machine': {
          connectToStatements.push(...getStatementsForAccessingStateMachine(statementProps));
          break;
        }
        case 'event-bus': {
          connectToStatements.push(...getStatementsForAccessingEventBus(statementProps));
          break;
        }
        // case 'hosting-bucket':
        case 'bucket': {
          connectToStatements.push(...getStatementsForAccessingBucket(statementProps));
          break;
        }
        case 'dynamo-db-table': {
          connectToStatements.push(...getStatementsForAccessingDynamoTable(statementProps));
          break;
        }
        case 'open-search-domain': {
          connectToStatements.push(...getStatementsForAccessingOpenSearchDomain(statementProps));
          break;
        }
        case 'user-auth-pool': {
          connectToStatements.push(...getStatementsForAccessingUserAuthPool(statementProps));
          break;
        }
        case 'sqs-queue': {
          connectToStatements.push(...getStatementsForAccessingSqsQueue(statementProps));
          break;
        }
        case 'sns-topic': {
          connectToStatements.push(...getStatementsForAccessingSnsTopic(statementProps));
          break;
        }
        case 'kinesis-stream': {
          connectToStatements.push(...getStatementsForAccessingKinesisStream(statementProps));
          break;
        }
        // @todo
        // case 'custom-resource-definition':
        // case 'deployment-script':
        // case 'edge-lambda-function':
        // case 'nextjs-web':
        // break;
        default: {
          // @note this is to ensure that we handle all possible types, even when new types are added
          const _resourceCheck: never = resource;
        }
      }
    });
    policies.push({
      PolicyName: 'custom-allow-access-to-policy-statements',
      PolicyDocument: {
        Version: '2012-10-17',
        Statement: connectToStatements
      }
    });
  }
  return policies;
};

export const getLogGroupPolicyDocumentStatements = (logGroupRef: any[], withCreateLogGroup: boolean) => [
  {
    Effect: 'Allow',
    Action: ['logs:PutLogEvents', 'logs:DescribeLogGroups', 'logs:DescribeLogStreams', 'logs:CreateLogStream'].concat(
      withCreateLogGroup ? ['logs:CreateLogGroup'] : []
    ),
    Resource: logGroupRef
  }
];

export const getLambdaLogResourceArnsForPermissions = ({
  lambdaResourceName,
  edgeLambda
}: {
  lambdaResourceName: string;
  edgeLambda?: boolean;
}) => {
  return [
    {
      'Fn::Sub': `arn:\${AWS::Partition}:logs:*:\${AWS::AccountId}:log-group:${awsResourceNames.lambdaLogGroup({
        lambdaAwsResourceName: lambdaResourceName,
        edgeLambda
      })}`
    },
    {
      'Fn::Sub': `arn:\${AWS::Partition}:logs:*:\${AWS::AccountId}:log-group:${awsResourceNames.lambdaLogGroup({
        lambdaAwsResourceName: lambdaResourceName,
        edgeLambda
      })}:*`
    },
    {
      'Fn::Sub': `arn:\${AWS::Partition}:logs:*:\${AWS::AccountId}:log-group:${awsResourceNames.lambdaLogGroup({
        lambdaAwsResourceName: lambdaResourceName,
        edgeLambda
      })}:*:*`
    }
  ];
};

// Function to create IAM policy statements for accessing mounted EFS filesystems
const getPolicyForMountedEfsFilesystems = (mountedEfsFilesystems: StpEfsFilesystem[]): Policy => {
  const efsArns = mountedEfsFilesystems.map(
    (fs) => getAtt(cfLogicalNames.efsFilesystem(fs.name), 'Arn') as unknown as string
  );

  // Define statements separately
  const statements = [
    // Statement for actions supporting resource-level permissions
    {
      Effect: 'Allow',
      Action: [
        'elasticfilesystem:ClientMount',
        'elasticfilesystem:ClientWrite',
        'elasticfilesystem:DescribeMountTargets'
      ],
      Resource: efsArns
    },
    // Statement for DescribeFileSystems which requires Resource: '*'
    {
      Effect: 'Allow',
      Action: 'elasticfilesystem:DescribeFileSystems',
      Resource: '*'
    }
    // Potentially needed for Access Point resolution during mount, but often covered by the above
    // If issues arise, consider adding DescribeAccessPoints for the specific access point ARNs
  ];

  return {
    PolicyName: 'efs-mount-access',
    PolicyDocument: {
      Version: '2012-10-17',
      Statement: statements // Use the combined statements array
    }
  };
};

const getPolicyForMountedS3FilesAccessPoints = (mountedS3FilesAccessPointArns: (string | Intrinsic)[]): Policy => {
  return {
    PolicyName: 's3-files-mount-access',
    PolicyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['s3files:ClientMount', 's3files:ClientWrite'],
          Resource: '*',
          Condition: {
            StringEquals: {
              's3files:AccessPointArn': mountedS3FilesAccessPointArns
            }
          }
        }
      ]
    }
  };
};
