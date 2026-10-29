import { cfnResource } from '@stacktape/cloudformation/resource';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { sub } from '@stacktape/cloudformation/intrinsics';

import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { tagNames } from '@stacktape/naming/tag-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';

const DEV_AGENT_ROLE_LOGICAL_NAME = 'StpDevAgentRole';

type PolicyStatement = { Effect: 'Allow' | 'Deny'; Action: string[]; Resource: unknown; Condition?: unknown };
const policy = (PolicyName: string, Statement: PolicyStatement[]) => ({
  PolicyName,
  PolicyDocument: { Version: '2012-10-17', Statement }
});

/**
 * The ARNs `arn` makes of the identifiers of the template's resources of a type: the literal name in `nameProperty`,
 * which keeps the role free of a dependency on the resource, or else its `Ref`.
 */
const ownResourceArns = (
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
 * Creates the IAM role the dev agent reads AWS with (`/aws/sdk`, deployed tables, Batch job runs). It reads only: the
 * agent's executor sends nothing outside the read-only catalog, and the role grants no write either.
 *
 * The role reaches this stack's resources in this stack's region only. A stack name is unique in an account and region,
 * so the stack-name tag CloudFormation puts on every resource it creates, together with the region in the ARN or
 * `aws:RequestedRegion`, picks out exactly this stack; a name prefix does not (`shop-dev-*` also names the resources of
 * a stage `dev-production`). Where an action ignores resource tags, the role lists this stack's resources by their
 * identifiers in the template instead. Checked against IAM on 28 Oct 2026 for every tag-limited action here except ECS
 * and Batch.
 */
export const resolveDevAgentRole = () => {
  const { stackName, globallyUniqueStackHash } = calculatedStackOverviewManager.context;

  const inRegion = { 'aws:RequestedRegion': { Ref: 'AWS::Region' } };
  const ownStack = { StringEquals: { [`aws:ResourceTag/${tagNames.stackName()}`]: stackName } };
  const ownStackInRegion = { StringEquals: { ...ownStack.StringEquals, ...inRegion } };
  const regional = (service: string, resource: string) =>
    sub(`arn:aws:${service}:\${AWS::Region}:\${AWS::AccountId}:${resource}`);

  const roleName = `${stackName}-dev-agent`;
  const role = cfnResource('AWS::IAM::Role', {
    RoleName: roleName,
    Description: `Dev agent role for stack ${stackName}`,
    MaxSessionDuration: 43200,
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: sub('arn:aws:iam::${AWS::AccountId}:root') },
          Action: 'sts:AssumeRole',
          Condition: { StringEquals: { 'sts:ExternalId': globallyUniqueStackHash } }
        }
      ]
    },
    Policies: [
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
          Resource: [regional('lambda', 'function:*')],
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
          Resource: [regional('dynamodb', 'table/*'), regional('dynamodb', 'table/*/index/*')],
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
          Resource: [
            sub(`arn:aws:s3:::*${globallyUniqueStackHash}*`),
            sub(`arn:aws:s3:::*${globallyUniqueStackHash}*/*`)
          ]
        }
      ]),
      policy('sqs-access', [
        {
          Effect: 'Allow',
          Action: ['sqs:GetQueueAttributes', 'sqs:GetQueueUrl', 'sqs:ListQueueTags', 'sqs:ListDeadLetterSourceQueues'],
          Resource: [regional('sqs', '*')],
          Condition: ownStack
        }
      ]),
      policy('sns-access', [
        {
          Effect: 'Allow',
          Action: ['sns:GetTopicAttributes', 'sns:ListSubscriptionsByTopic', 'sns:ListTagsForResource'],
          Resource: [regional('sns', '*')],
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
          Resource: [regional('events', 'event-bus/*'), regional('events', 'rule/*')],
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
          Resource: [regional('states', 'stateMachine:*'), regional('states', 'execution:*:*')],
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
          Resource: [regional('logs', 'log-group:*')],
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
          Resource: [regional('ecs', '*')],
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
          Resource: [regional('cognito-idp', 'userpool/*')],
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
        // The dev agent scopes these calls to the stack's queues and job definitions (`scopeBatchCall`).
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
    ]
  });

  // Databases, caches, search domains and HTTP APIs by their identifiers in the finished template: their read actions
  // are not authorized by the stack tag.
  templateManager.addFinalTemplateOverrideFn(async (template) => {
    const policies = (template.Resources[DEV_AGENT_ROLE_LOGICAL_NAME].Properties as { Policies: unknown[] }).Policies;
    const add = (name: string, actions: string[], resources: unknown[]) => {
      if (resources.length) policies.push(policy(name, [{ Effect: 'Allow', Action: actions, Resource: resources }]));
    };
    add(
      'rds-access',
      [
        'rds:DescribeDBInstances',
        'rds:DescribeDBClusters',
        'rds:DescribeDBClusterEndpoints',
        'rds:ListTagsForResource'
      ],
      [
        ...ownResourceArns(template, 'AWS::RDS::DBInstance', 'DBInstanceIdentifier', (id) => [
          regional('rds', `db:${id}`)
        ]),
        ...ownResourceArns(template, 'AWS::RDS::DBCluster', 'DBClusterIdentifier', (id) => [
          regional('rds', `cluster:${id}`)
        ])
      ]
    );
    add(
      'elasticache-access',
      ['elasticache:DescribeReplicationGroups', 'elasticache:ListTagsForResource'],
      ownResourceArns(template, 'AWS::ElastiCache::ReplicationGroup', 'ReplicationGroupId', (id) => [
        regional('elasticache', `replicationgroup:${id}`)
      ])
    );
    add(
      'elasticache-serverless-access',
      ['elasticache:DescribeServerlessCaches', 'elasticache:ListTagsForResource'],
      ownResourceArns(template, 'AWS::ElastiCache::ServerlessCache', 'ServerlessCacheName', (name) => [
        regional('elasticache', `serverlesscache:${name}`)
      ])
    );
    add(
      'opensearch-access',
      ['es:DescribeDomain', 'es:DescribeDomains', 'es:DescribeDomainConfig', 'es:ListTags'],
      ownResourceArns(template, 'AWS::OpenSearchService::Domain', 'DomainName', (name) => [
        regional('es', `domain/${name}`)
      ])
    );
    // ECS authorizes these by the cluster they list or describe in (`ecs:cluster`), not by its tags.
    const clusters = ownResourceArns(template, 'AWS::ECS::Cluster', 'ClusterName', (name) => [
      regional('ecs', `cluster/${name}`)
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
    // AWS generates an API's ID, so these name the API by its `Ref`.
    add(
      'apigateway-access',
      ['apigateway:GET'],
      ownResourceArns(template, 'AWS::ApiGatewayV2::Api', undefined, (id) => [
        sub(`arn:aws:apigateway:\${AWS::Region}::/apis/${id}`),
        sub(`arn:aws:apigateway:\${AWS::Region}::/apis/${id}/*`)
      ])
    );
  });

  calculatedStackOverviewManager.addCfChildResource({
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
    cfLogicalName: DEV_AGENT_ROLE_LOGICAL_NAME,
    resource: role
  });

  // Export role ARN and external ID for the dev agent
  calculatedStackOverviewManager.addUserCustomStackOutput({
    cloudformationOutputName: 'DevAgentRoleArn',
    // Built from the role name rather than `Fn::GetAtt`: an output that depends on the role adds several seconds to
    // every stack update.
    value: sub(`arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/${roleName}`),
    description: 'ARN of the dev agent IAM role'
  });

  calculatedStackOverviewManager.addStackMetadata({
    metaName: stackMetadataNames.devAgentRoleExternalId(),
    metaValue: globallyUniqueStackHash,
    showDuringPrint: false
  });
};
