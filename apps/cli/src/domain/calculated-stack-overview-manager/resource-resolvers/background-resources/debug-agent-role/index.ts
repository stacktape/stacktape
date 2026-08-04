import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, sub } from '@stacktape/cloudformation/intrinsics';

import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { tagNames } from '@stacktape/naming/tag-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';

const DEBUG_AGENT_ROLE_LOGICAL_NAME = 'StpDebugAgentRole';

/**
 * Creates an IAM role for debug commands with read-only permissions.
 * Allows read access to stack resources and data, but blocks all write operations.
 * Also allows SSM parameter access for connection strings.
 */
export const resolveDebugAgentRole = () => {
  const { stackName, globallyUniqueStackHash } = calculatedStackOverviewManager.context;

  const stackTagCondition = {
    StringEquals: {
      [`aws:ResourceTag/${tagNames.stackName()}`]: stackName
    }
  };

  const role = cfnResource('AWS::IAM::Role', {
    RoleName: `${stackName}-debug-agent`,
    Description: `Read-only debug agent role for stack ${stackName}`,
    MaxSessionDuration: 3600, // 1 hour max
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
      // SSM: Read parameters for this stack (needed for connection strings)
      {
        PolicyName: 'ssm-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['ssm:GetParameter', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
              Resource: sub(`arn:aws:ssm:*:\${AWS::AccountId}:parameter/stp/*/${stackName}/*`)
            }
          ]
        }
      },

      // Secrets Manager: Read secrets for this stack
      {
        PolicyName: 'secrets-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
              Resource: sub(`arn:aws:secretsmanager:*:\${AWS::AccountId}:secret:*`),
              Condition: stackTagCondition
            }
          ]
        }
      },

      // Lambda: Read only
      {
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
              Resource: sub(`arn:aws:lambda:*:\${AWS::AccountId}:function:${stackName}-*`)
            }
          ]
        }
      },

      // DynamoDB: Read only
      {
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
                sub(`arn:aws:dynamodb:*:\${AWS::AccountId}:table/${stackName}-*`),
                sub(`arn:aws:dynamodb:*:\${AWS::AccountId}:table/${stackName}-*/index/*`)
              ]
            }
          ]
        }
      },

      // S3: Read only
      {
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
                sub(`arn:aws:s3:::*${globallyUniqueStackHash}*`),
                sub(`arn:aws:s3:::*${globallyUniqueStackHash}*/*`)
              ]
            }
          ]
        }
      },

      // SQS: Read only
      {
        PolicyName: 'sqs-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['sqs:GetQueueAttributes', 'sqs:GetQueueUrl', 'sqs:ListQueueTags'],
              Resource: sub(`arn:aws:sqs:*:\${AWS::AccountId}:${stackName}-*`)
            }
          ]
        }
      },

      // SNS: Read only
      {
        PolicyName: 'sns-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['sns:GetTopicAttributes', 'sns:ListTagsForResource', 'sns:ListSubscriptionsByTopic'],
              Resource: sub(`arn:aws:sns:*:\${AWS::AccountId}:${stackName}-*`)
            }
          ]
        }
      },

      // EventBridge: Read only
      {
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
              Resource: sub(`arn:aws:events:*:\${AWS::AccountId}:event-bus/${stackName}-*`)
            }
          ]
        }
      },

      // Step Functions: Read only
      {
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
                sub(`arn:aws:states:*:\${AWS::AccountId}:stateMachine:${stackName}-*`),
                sub(`arn:aws:states:*:\${AWS::AccountId}:execution:${stackName}-*:*`)
              ]
            }
          ]
        }
      },

      // CloudWatch Logs: Read
      {
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
                sub(`arn:aws:logs:*:\${AWS::AccountId}:log-group:/aws/lambda/${stackName}-*`),
                sub(`arn:aws:logs:*:\${AWS::AccountId}:log-group:/aws/lambda/${stackName}-*:*`),
                sub(`arn:aws:logs:*:\${AWS::AccountId}:log-group:/stp/${stackName}/*`),
                sub(`arn:aws:logs:*:\${AWS::AccountId}:log-group:/stp/${stackName}/*:*`),
                sub(`arn:aws:logs:*:\${AWS::AccountId}:log-group:${stackName}-*`),
                sub(`arn:aws:logs:*:\${AWS::AccountId}:log-group:${stackName}-*:*`)
              ]
            }
          ]
        }
      },

      // ECS: Read only (no ExecuteCommand)
      {
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
      },

      // RDS: Read only
      {
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
                'rds:DescribeDBSubnetGroups',
                'rds:DescribeDBParameterGroups',
                'rds:DescribeDBClusterParameterGroups',
                'rds:DescribeDBEngineVersions',
                'rds:DescribeOrderableDBInstanceOptions',
                'rds:DescribeDBSnapshots',
                'rds:DescribeDBClusterSnapshots',
                'rds:DescribeEvents',
                'rds:ListTagsForResource'
              ],
              Resource: '*'
            }
          ]
        }
      },

      // ElastiCache: Read only
      {
        PolicyName: 'elasticache-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'elasticache:DescribeReplicationGroups',
                'elasticache:DescribeCacheClusters',
                'elasticache:DescribeCacheSubnetGroups',
                'elasticache:DescribeEvents',
                'elasticache:ListTagsForResource'
              ],
              Resource: '*'
            }
          ]
        }
      },

      // OpenSearch: Read only (no HTTP write methods)
      {
        PolicyName: 'opensearch-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['es:DescribeDomain', 'es:DescribeDomains', 'es:ListTags', 'es:ESHttpGet', 'es:ESHttpHead'],
              Resource: sub(`arn:aws:es:*:\${AWS::AccountId}:domain/${stackName}-*`)
            }
          ]
        }
      },

      // Cognito: Read only
      {
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
              Resource: sub(`arn:aws:cognito-idp:*:\${AWS::AccountId}:userpool/*`),
              Condition: stackTagCondition
            }
          ]
        }
      },

      // API Gateway: Read
      {
        PolicyName: 'apigateway-read',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['apigateway:GET'],
              Resource: [sub('arn:aws:apigateway:*::/apis/*'), sub('arn:aws:apigateway:*::/apis/*/stages/*')]
            }
          ]
        }
      },

      // CloudFormation: Read stack info
      {
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
              Resource: sub(`arn:aws:cloudformation:*:\${AWS::AccountId}:stack/${stackName}/*`)
            }
          ]
        }
      },

      // CloudWatch: Read metrics
      {
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
      },

      // Batch: Read only
      {
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
      }
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
    value: getAtt(DEBUG_AGENT_ROLE_LOGICAL_NAME, 'Arn'),
    description: 'ARN of the debug agent IAM role (read-only)'
  });

  calculatedStackOverviewManager.addStackMetadata({
    metaName: stackMetadataNames.debugAgentRoleExternalId(),
    metaValue: globallyUniqueStackHash,
    showDuringPrint: false
  });
};
