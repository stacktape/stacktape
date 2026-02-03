import { GetAtt } from '@cloudform/functions';
import Role, { Policy } from '@cloudform/iam/role';
import { globalStateManager } from '@application-services/global-state-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { tagNames } from '@shared/naming/tag-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { SubWithoutMapping } from '@utils/cloudformation';

const DEBUG_AGENT_ROLE_LOGICAL_NAME = 'StpDebugAgentRole';

/**
 * Creates an IAM role for debug commands with read-only permissions.
 * Allows read access to stack resources and data, but blocks all write operations.
 * Also allows SSM parameter access for connection strings.
 */
export const resolveDebugAgentRole = () => {
  const { stackName, globallyUniqueStackHash } = globalStateManager.targetStack;

  const stackTagCondition = {
    StringEquals: {
      [`aws:ResourceTag/${tagNames.stackName()}`]: stackName
    }
  };

  const role = new Role({
    RoleName: `${stackName}-debug-agent`,
    Description: `Read-only debug agent role for stack ${stackName}`,
    MaxSessionDuration: 3600, // 1 hour max
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          // eslint-disable-next-line no-template-curly-in-string
          Principal: { AWS: SubWithoutMapping('arn:aws:iam::${AWS::AccountId}:root') },
          Action: 'sts:AssumeRole',
          Condition: { StringEquals: { 'sts:ExternalId': globallyUniqueStackHash } }
        }
      ]
    },
    Policies: [
      // SSM: Read parameters for this stack (needed for connection strings)
      new Policy({
        PolicyName: 'ssm-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
              Resource: SubWithoutMapping(`arn:aws:ssm:*:\${AWS::AccountId}:parameter/stp/*/${stackName}/*`)
            }
          ]
        }
      }),

      // Secrets Manager: Read secrets for this stack
      new Policy({
        PolicyName: 'secrets-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
              Resource: SubWithoutMapping(`arn:aws:secretsmanager:*:\${AWS::AccountId}:secret:*`),
              Condition: stackTagCondition
            }
          ]
        }
      }),

      // Lambda: Read only
      new Policy({
        PolicyName: 'lambda-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'lambda:GetFunction',
                'lambda:GetFunctionConfiguration',
                'lambda:GetFunctionUrlConfig',
                'lambda:GetPolicy',
                'lambda:GetAlias',
                'lambda:ListAliases',
                'lambda:ListVersionsByFunction',
                'lambda:ListTags'
              ],
              Resource: SubWithoutMapping(`arn:aws:lambda:*:\${AWS::AccountId}:function:${stackName}-*`)
            }
          ]
        }
      }),

      // DynamoDB: Read only
      new Policy({
        PolicyName: 'dynamodb-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'dynamodb:GetItem',
                'dynamodb:BatchGetItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:DescribeTable',
                'dynamodb:DescribeTimeToLive',
                'dynamodb:ListTagsOfResource'
              ],
              Resource: [
                SubWithoutMapping(`arn:aws:dynamodb:*:\${AWS::AccountId}:table/${stackName}-*`),
                SubWithoutMapping(`arn:aws:dynamodb:*:\${AWS::AccountId}:table/${stackName}-*/index/*`)
              ]
            }
          ]
        }
      }),

      // S3: Read only
      new Policy({
        PolicyName: 's3-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                's3:GetObject',
                's3:GetObjectVersion',
                's3:GetObjectTagging',
                's3:ListBucket',
                's3:ListBucketVersions',
                's3:GetBucketLocation',
                's3:GetBucketTagging'
              ],
              Resource: [
                SubWithoutMapping(`arn:aws:s3:::*${globallyUniqueStackHash}*`),
                SubWithoutMapping(`arn:aws:s3:::*${globallyUniqueStackHash}*/*`)
              ]
            }
          ]
        }
      }),

      // SQS: Read only
      new Policy({
        PolicyName: 'sqs-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['sqs:GetQueueAttributes', 'sqs:GetQueueUrl', 'sqs:ListQueueTags'],
              Resource: SubWithoutMapping(`arn:aws:sqs:*:\${AWS::AccountId}:${stackName}-*`)
            }
          ]
        }
      }),

      // SNS: Read only
      new Policy({
        PolicyName: 'sns-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['sns:GetTopicAttributes', 'sns:ListTagsForResource', 'sns:ListSubscriptionsByTopic'],
              Resource: SubWithoutMapping(`arn:aws:sns:*:\${AWS::AccountId}:${stackName}-*`)
            }
          ]
        }
      }),

      // EventBridge: Read only
      new Policy({
        PolicyName: 'eventbridge-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'events:DescribeEventBus',
                'events:ListRules',
                'events:DescribeRule',
                'events:ListTargetsByRule',
                'events:ListTagsForResource'
              ],
              Resource: SubWithoutMapping(`arn:aws:events:*:\${AWS::AccountId}:event-bus/${stackName}-*`)
            }
          ]
        }
      }),

      // Step Functions: Read only
      new Policy({
        PolicyName: 'stepfunctions-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'states:DescribeStateMachine',
                'states:DescribeExecution',
                'states:GetExecutionHistory',
                'states:ListExecutions',
                'states:ListTagsForResource'
              ],
              Resource: [
                SubWithoutMapping(`arn:aws:states:*:\${AWS::AccountId}:stateMachine:${stackName}-*`),
                SubWithoutMapping(`arn:aws:states:*:\${AWS::AccountId}:execution:${stackName}-*:*`)
              ]
            }
          ]
        }
      }),

      // CloudWatch Logs: Read
      new Policy({
        PolicyName: 'logs-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
                'logs:GetLogEvents',
                'logs:FilterLogEvents',
                'logs:GetLogGroupFields',
                'logs:StartQuery',
                'logs:StopQuery',
                'logs:GetQueryResults'
              ],
              Resource: [
                SubWithoutMapping(`arn:aws:logs:*:\${AWS::AccountId}:log-group:/aws/lambda/${stackName}-*`),
                SubWithoutMapping(`arn:aws:logs:*:\${AWS::AccountId}:log-group:/aws/lambda/${stackName}-*:*`),
                SubWithoutMapping(`arn:aws:logs:*:\${AWS::AccountId}:log-group:/stp/${stackName}/*`),
                SubWithoutMapping(`arn:aws:logs:*:\${AWS::AccountId}:log-group:/stp/${stackName}/*:*`),
                SubWithoutMapping(`arn:aws:logs:*:\${AWS::AccountId}:log-group:${stackName}-*`),
                SubWithoutMapping(`arn:aws:logs:*:\${AWS::AccountId}:log-group:${stackName}-*:*`)
              ]
            }
          ]
        }
      }),

      // ECS: Read only (no ExecuteCommand)
      new Policy({
        PolicyName: 'ecs-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'ecs:DescribeClusters',
                'ecs:DescribeServices',
                'ecs:DescribeTasks',
                'ecs:DescribeTaskDefinition',
                'ecs:DescribeContainerInstances',
                'ecs:ListTasks',
                'ecs:ListServices',
                'ecs:ListContainerInstances',
                'ecs:ListTagsForResource'
              ],
              Resource: '*',
              Condition: stackTagCondition
            }
          ]
        }
      }),

      // RDS: Read only
      new Policy({
        PolicyName: 'rds-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'rds:DescribeDBInstances',
                'rds:DescribeDBClusters',
                'rds:DescribeDBClusterEndpoints',
                'rds:DescribeDBSnapshots',
                'rds:DescribeDBClusterSnapshots',
                'rds:ListTagsForResource'
              ],
              Resource: [
                SubWithoutMapping(`arn:aws:rds:*:\${AWS::AccountId}:db:${stackName}-*`),
                SubWithoutMapping(`arn:aws:rds:*:\${AWS::AccountId}:cluster:${stackName}-*`)
              ]
            }
          ]
        }
      }),

      // ElastiCache: Read only
      new Policy({
        PolicyName: 'elasticache-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'elasticache:DescribeReplicationGroups',
                'elasticache:DescribeCacheClusters',
                'elasticache:ListTagsForResource'
              ],
              Resource: SubWithoutMapping(`arn:aws:elasticache:*:\${AWS::AccountId}:replicationgroup:${stackName}-*`)
            }
          ]
        }
      }),

      // OpenSearch: Read only (no HTTP write methods)
      new Policy({
        PolicyName: 'opensearch-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['es:DescribeDomain', 'es:DescribeDomains', 'es:ListTags', 'es:ESHttpGet', 'es:ESHttpHead'],
              Resource: SubWithoutMapping(`arn:aws:es:*:\${AWS::AccountId}:domain/${stackName}-*`)
            }
          ]
        }
      }),

      // Cognito: Read only
      new Policy({
        PolicyName: 'cognito-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'cognito-idp:DescribeUserPool',
                'cognito-idp:DescribeUserPoolClient',
                'cognito-idp:ListUsers',
                'cognito-idp:ListGroups',
                'cognito-idp:ListUsersInGroup',
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminListGroupsForUser'
              ],
              Resource: SubWithoutMapping(`arn:aws:cognito-idp:*:\${AWS::AccountId}:userpool/*`),
              Condition: stackTagCondition
            }
          ]
        }
      }),

      // API Gateway: Read
      new Policy({
        PolicyName: 'apigateway-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['apigateway:GET'],
              Resource: [
                SubWithoutMapping('arn:aws:apigateway:*::/apis/*'),
                SubWithoutMapping('arn:aws:apigateway:*::/apis/*/stages/*')
              ]
            }
          ]
        }
      }),

      // CloudFormation: Read stack info
      new Policy({
        PolicyName: 'cloudformation-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'cloudformation:DescribeStacks',
                'cloudformation:DescribeStackResources',
                'cloudformation:DescribeStackEvents',
                'cloudformation:GetStackPolicy',
                'cloudformation:GetTemplate',
                'cloudformation:ListStackResources'
              ],
              Resource: SubWithoutMapping(`arn:aws:cloudformation:*:\${AWS::AccountId}:stack/${stackName}/*`)
            }
          ]
        }
      }),

      // CloudWatch: Read metrics
      new Policy({
        PolicyName: 'cloudwatch-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
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
              Resource: '*'
            }
          ]
        }
      }),

      // Batch: Read only
      new Policy({
        PolicyName: 'batch-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'batch:DescribeJobs',
                'batch:DescribeJobDefinitions',
                'batch:DescribeJobQueues',
                'batch:DescribeComputeEnvironments',
                'batch:ListJobs',
                'batch:ListTagsForResource'
              ],
              Resource: '*',
              Condition: stackTagCondition
            }
          ]
        }
      })
    ]
  });

  calculatedStackOverviewManager.addCfChildResource({
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
    cfLogicalName: DEBUG_AGENT_ROLE_LOGICAL_NAME,
    resource: role,
    initial: true
  });

  // Export role ARN and external ID for the debug agent
  calculatedStackOverviewManager.addUserCustomStackOutput({
    cloudformationOutputName: 'DebugAgentRoleArn',
    value: GetAtt(DEBUG_AGENT_ROLE_LOGICAL_NAME, 'Arn'),
    description: 'ARN of the debug agent IAM role (read-only)'
  });

  calculatedStackOverviewManager.addStackMetadata({
    metaName: stackMetadataNames.debugAgentRoleExternalId(),
    metaValue: globallyUniqueStackHash,
    showDuringPrint: false
  });
};
