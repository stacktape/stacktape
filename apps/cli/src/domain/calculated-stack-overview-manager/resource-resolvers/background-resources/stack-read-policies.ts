import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { sub } from '@stacktape/cloudformation/intrinsics';

import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { tagNames } from '@stacktape/naming/tag-names';

type PolicyStatement = { Effect: 'Allow' | 'Deny'; Action: string[]; Resource: unknown; Condition?: unknown };
export type InlinePolicy = ReturnType<typeof policy>;

export const policy = (PolicyName: string, Statement: PolicyStatement[]) => ({
  PolicyName,
  PolicyDocument: { Version: '2012-10-17', Statement }
});

export const regionalArn = (service: string, resource: string) =>
  sub(`arn:aws:${service}:\${AWS::Region}:\${AWS::AccountId}:${resource}`);

export const inRegion = { 'aws:RequestedRegion': { Ref: 'AWS::Region' } };

/**
 * The ARNs `arn` makes of the identifiers of the template's resources of a type: the literal name in `nameProperty`,
 * which keeps the role free of a dependency on the resource, or else its `Ref`.
 */
export const ownResourceArns = (
  template: CloudFormationTemplate,
  type: string,
  nameProperty: string | undefined,
  arn: (identifier: string) => unknown[]
) =>
  Object.keys(template.Resources)
    .filter((logicalName) => (template.Resources[logicalName] as { Type: string }).Type === type)
    .sort()
    .flatMap((logicalName) => {
      const name =
        nameProperty && (template.Resources[logicalName].Properties as Record<string, unknown>)?.[nameProperty];
      return arn(typeof name === 'string' ? name : `\${${logicalName}}`);
    });

/**
 * The read access the dev agent role (`stacktape dev`) and the debug agent role (`aws call`, `query dynamodb`,
 * `query opensearch`) share: reads of this stack's resources, in this stack's region, and no write.
 *
 * A stack name is unique in an account and region, so the stack-name tag CloudFormation puts on every resource it
 * creates, together with the region in the ARN or `aws:RequestedRegion`, picks out exactly this stack; a name prefix
 * does not (`shop-dev-*` also names the resources of a stage `dev-production`). Where an action ignores resource tags,
 * the policies list this stack's resources by their identifiers in the finished template instead
 * ({@link stackIdentifierPolicies}). Checked against IAM on 28 Oct 2026 for every tag-limited action here except ECS
 * and Batch, and on 31 Oct 2026 for `lambda:GetEventSourceMapping` and `events:ListRules`.
 *
 * These are the policies that the stack-name tag, the stack ID or the region can limit.
 */
export const stackReadPolicies = () => {
  const { stackName, globallyUniqueStackHash } = calculatedStackOverviewManager.context;
  const ownStack = { StringEquals: { [`aws:ResourceTag/${tagNames.stackName()}`]: stackName } };
  const ownStackInRegion = { StringEquals: { ...ownStack.StringEquals, ...inRegion } };

  return [
    policy('lambda-access', [
      {
        Effect: 'Allow',
        Action: [
          'lambda:GetFunction',
          'lambda:GetFunctionConfiguration',
          'lambda:GetFunctionConcurrency',
          'lambda:GetFunctionUrlConfig',
          'lambda:GetPolicy',
          'lambda:GetAlias',
          'lambda:ListAliases',
          'lambda:ListVersionsByFunction',
          'lambda:ListTags'
        ],
        Resource: [regionalArn('lambda', 'function:*')],
        Condition: ownStack
      },
      // A mapping's state, last processing result and last transition. `ListEventSourceMappings` has no resource or
      // condition that limits it to a stack, so `aws call` and the dev agent answer it from the stack's own mappings
      // (`listStackResources`).
      {
        Effect: 'Allow',
        Action: ['lambda:GetEventSourceMapping'],
        Resource: [regionalArn('lambda', 'event-source-mapping:*')],
        Condition: ownStack
      }
    ]),
    policy('dynamodb-access', [
      {
        Effect: 'Allow',
        Action: [
          'dynamodb:GetItem',
          'dynamodb:BatchGetItem',
          'dynamodb:Query',
          'dynamodb:Scan',
          'dynamodb:DescribeTable',
          'dynamodb:DescribeTimeToLive',
          'dynamodb:DescribeContinuousBackups',
          'dynamodb:ListTagsOfResource'
        ],
        // An index is authorized by its table's tags.
        Resource: [regionalArn('dynamodb', 'table/*'), regionalArn('dynamodb', 'table/*/index/*')],
        Condition: ownStack
      }
    ]),
    // Object actions ignore bucket tags. Every bucket of the stack carries its globally unique hash in its name.
    policy('s3-access', [
      {
        Effect: 'Allow',
        Action: [
          's3:GetObject',
          's3:GetObjectVersion',
          's3:GetObjectAttributes',
          's3:GetObjectTagging',
          's3:ListBucket',
          's3:ListBucketVersions',
          's3:GetBucketLocation',
          's3:GetBucketTagging',
          's3:GetBucketVersioning',
          's3:GetEncryptionConfiguration'
        ],
        Resource: [sub(`arn:aws:s3:::*${globallyUniqueStackHash}*`), sub(`arn:aws:s3:::*${globallyUniqueStackHash}*/*`)]
      }
    ]),
    policy('sqs-access', [
      {
        Effect: 'Allow',
        Action: ['sqs:GetQueueAttributes', 'sqs:GetQueueUrl', 'sqs:ListQueueTags', 'sqs:ListDeadLetterSourceQueues'],
        Resource: [regionalArn('sqs', '*')],
        Condition: ownStack
      }
    ]),
    policy('sns-access', [
      {
        Effect: 'Allow',
        Action: ['sns:GetTopicAttributes', 'sns:ListSubscriptionsByTopic', 'sns:ListTagsForResource'],
        Resource: [regionalArn('sns', '*')],
        Condition: ownStack
      }
    ]),
    policy('eventbridge-access', [
      {
        Effect: 'Allow',
        Action: [
          'events:DescribeEventBus',
          'events:DescribeRule',
          'events:ListTargetsByRule',
          'events:ListTagsForResource'
        ],
        Resource: [regionalArn('events', 'event-bus/*'), regionalArn('events', 'rule/*')],
        Condition: ownStack
      }
    ]),
    policy('stepfunctions-access', [
      {
        Effect: 'Allow',
        Action: [
          'states:DescribeStateMachine',
          'states:DescribeExecution',
          'states:GetExecutionHistory',
          'states:ListExecutions',
          'states:ListTagsForResource'
        ],
        // An execution is authorized by its state machine's tags.
        Resource: [regionalArn('states', 'stateMachine:*'), regionalArn('states', 'execution:*:*')],
        Condition: ownStack
      }
    ]),
    policy('logs-access', [
      {
        Effect: 'Allow',
        Action: [
          'logs:DescribeLogStreams',
          'logs:GetLogEvents',
          'logs:FilterLogEvents',
          'logs:GetLogGroupFields',
          'logs:StartQuery'
        ],
        Resource: [regionalArn('logs', 'log-group:*')],
        Condition: ownStack
      },
      // A query's results, by the ID `StartQuery` returned; the query could only read this stack's log groups.
      { Effect: 'Allow', Action: ['logs:GetQueryResults'], Resource: '*', Condition: { StringEquals: inRegion } }
    ]),
    policy('ecs-access', [
      {
        Effect: 'Allow',
        Action: [
          'ecs:DescribeClusters',
          'ecs:DescribeServices',
          'ecs:DescribeTasks',
          'ecs:ListContainerInstances',
          'ecs:ListTagsForResource'
        ],
        Resource: [regionalArn('ecs', '*')],
        Condition: ownStack
      },
      // ECS authorizes a task definition read with no resource or tag: within the region. The executor redacts the
      // environment values it returns.
      {
        Effect: 'Allow',
        Action: ['ecs:DescribeTaskDefinition'],
        Resource: '*',
        Condition: { StringEquals: inRegion }
      }
    ]),
    policy('cognito-access', [
      {
        Effect: 'Allow',
        Action: [
          'cognito-idp:DescribeUserPool',
          'cognito-idp:DescribeUserPoolClient',
          'cognito-idp:ListUserPoolClients',
          'cognito-idp:ListUsers',
          'cognito-idp:ListGroups',
          'cognito-idp:ListUsersInGroup',
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminListGroupsForUser'
        ],
        Resource: [regionalArn('cognito-idp', 'userpool/*')],
        Condition: ownStack
      }
    ]),
    // Metadata of the stack's secrets; their values stay denied below.
    policy('secretsmanager-access', [
      {
        Effect: 'Allow',
        Action: ['secretsmanager:DescribeSecret', 'secretsmanager:ListSecretVersionIds'],
        Resource: [regionalArn('secretsmanager', 'secret:*')],
        Condition: ownStack
      }
    ]),
    policy('cloudformation-access', [
      {
        Effect: 'Allow',
        Action: [
          'cloudformation:DescribeStacks',
          'cloudformation:DescribeStackResource',
          'cloudformation:DescribeStackResources',
          'cloudformation:DescribeStackEvents',
          'cloudformation:GetStackPolicy',
          'cloudformation:GetTemplate',
          'cloudformation:ListStackResources'
        ],
        Resource: [sub('${AWS::StackId}')]
      }
    ]),
    // Metrics and alarms have no stack of their own: CloudWatch reads stay account-wide, within the region.
    policy('cloudwatch-access', [
      {
        Effect: 'Allow',
        Action: [
          'cloudwatch:DescribeAlarms',
          'cloudwatch:DescribeAlarmsForMetric',
          'cloudwatch:GetMetricData',
          'cloudwatch:GetMetricStatistics',
          'cloudwatch:ListMetrics',
          'cloudwatch:ListTagsForResource'
        ],
        Resource: '*',
        Condition: { StringEquals: inRegion }
      }
    ]),
    policy('batch-access', [
      // Batch's describe and list actions take no resource ARN, so a resource tag condition always denies them.
      // `aws call` and the dev agent scope these calls to the stack's queues and job definitions (`scopeBatchCall`).
      {
        Effect: 'Allow',
        Action: [
          'batch:DescribeJobs',
          'batch:DescribeJobDefinitions',
          'batch:DescribeJobQueues',
          'batch:DescribeComputeEnvironments',
          'batch:ListJobs'
        ],
        Resource: '*',
        Condition: { StringEquals: inRegion }
      },
      { Effect: 'Allow', Action: ['batch:ListTagsForResource'], Resource: '*', Condition: ownStackInRegion }
    ]),
    policy('deny-dangerous-operations', [
      {
        Effect: 'Deny',
        Action: [
          'cloudformation:CreateStack',
          'cloudformation:DeleteStack',
          'cloudformation:UpdateStack',
          'cloudformation:ExecuteChangeSet',
          'cloudformation:CreateChangeSet',
          'iam:*',
          'organizations:*',
          'account:*',
          'secretsmanager:GetSecretValue',
          'ssm:GetParameter',
          'ssm:GetParameters',
          'ssm:GetParametersByPath'
        ],
        Resource: '*'
      }
    ])
  ];
};

/**
 * The policies that name this stack's databases, caches, search domains, ECS clusters, event buses and HTTP APIs by
 * their identifiers in the finished template: their read actions are not authorized by the stack tag.
 */
export const stackIdentifierPolicies = (template: CloudFormationTemplate) => {
  const policies: InlinePolicy[] = [];
  const add = (name: string, actions: string[], resources: unknown[]) => {
    if (resources.length) policies.push(policy(name, [{ Effect: 'Allow', Action: actions, Resource: resources }]));
  };
  add(
    'rds-access',
    ['rds:DescribeDBInstances', 'rds:DescribeDBClusters', 'rds:DescribeDBClusterEndpoints', 'rds:ListTagsForResource'],
    [
      ...ownResourceArns(template, 'AWS::RDS::DBInstance', 'DBInstanceIdentifier', (id) => [
        regionalArn('rds', `db:${id}`)
      ]),
      ...ownResourceArns(template, 'AWS::RDS::DBCluster', 'DBClusterIdentifier', (id) => [
        regionalArn('rds', `cluster:${id}`)
      ])
    ]
  );
  add(
    'elasticache-access',
    ['elasticache:DescribeReplicationGroups', 'elasticache:ListTagsForResource'],
    ownResourceArns(template, 'AWS::ElastiCache::ReplicationGroup', 'ReplicationGroupId', (id) => [
      regionalArn('elasticache', `replicationgroup:${id}`)
    ])
  );
  add(
    'elasticache-serverless-access',
    ['elasticache:DescribeServerlessCaches', 'elasticache:ListTagsForResource'],
    ownResourceArns(template, 'AWS::ElastiCache::ServerlessCache', 'ServerlessCacheName', (name) => [
      regionalArn('elasticache', `serverlesscache:${name}`)
    ])
  );
  add(
    'opensearch-access',
    ['es:DescribeDomain', 'es:DescribeDomains', 'es:DescribeDomainConfig', 'es:ListTags'],
    ownResourceArns(template, 'AWS::OpenSearchService::Domain', 'DomainName', (name) => [
      regionalArn('es', `domain/${name}`)
    ])
  );
  // ECS authorizes these by the cluster they list or describe in (`ecs:cluster`), not by its tags.
  const clusters = ownResourceArns(template, 'AWS::ECS::Cluster', 'ClusterName', (name) => [
    regionalArn('ecs', `cluster/${name}`)
  ]);
  if (clusters.length) {
    policies.push(
      policy('ecs-cluster-access', [
        {
          Effect: 'Allow',
          Action: ['ecs:ListServices', 'ecs:ListTasks', 'ecs:DescribeContainerInstances'],
          Resource: '*',
          Condition: { ArnEquals: { 'ecs:cluster': clusters } }
        }
      ])
    );
  }
  // `ListRules` is authorized by the rules of the bus it names; rules on the default bus belong to many stacks.
  add(
    'eventbridge-list-rules',
    ['events:ListRules'],
    ownResourceArns(template, 'AWS::Events::EventBus', 'Name', (name) => [regionalArn('events', `rule/${name}/*`)])
  );
  // AWS generates an API's ID, so these name the API by its `Ref`.
  add(
    'apigateway-access',
    ['apigateway:GET'],
    ownResourceArns(template, 'AWS::ApiGatewayV2::Api', undefined, (id) => [
      sub(`arn:aws:apigateway:\${AWS::Region}::/apis/${id}`),
      sub(`arn:aws:apigateway:\${AWS::Region}::/apis/${id}/*`)
    ])
  );
  return policies;
};

/** Adds `policies(finishedTemplate)` to the inline policies of the role `roleLogicalName` once the template is done. */
export const addFinalTemplatePolicies = (
  roleLogicalName: string,
  policies: (template: CloudFormationTemplate) => InlinePolicy[]
) => {
  templateManager.addFinalTemplateOverrideFn(async (template) => {
    (template.Resources[roleLogicalName].Properties as { Policies: unknown[] }).Policies.push(...policies(template));
  });
};
