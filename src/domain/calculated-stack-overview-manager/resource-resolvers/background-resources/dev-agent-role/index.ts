import { GetAtt } from '@cloudform/functions';
import Role, { Policy } from '@cloudform/iam/role';
import { globalStateManager } from '@application-services/global-state-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackMetadataNames } from '@shared/naming/metadata-names';
import { tagNames } from '@shared/naming/tag-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { SubWithoutMapping } from '@utils/cloudformation';

const DEV_AGENT_ROLE_LOGICAL_NAME = 'StpDevAgentRole';

/**
 * Creates an IAM role for the dev agent API with stack-scoped permissions.
 * Allows read access to most resources and data-level writes,
 * but blocks infrastructure changes (create/delete resources) and secret access.
 */
export const resolveDevAgentRole = () => {
  const { stackName, globallyUniqueStackHash } = globalStateManager.targetStack;

  const stackTagCondition = {
    StringEquals: {
      [`aws:ResourceTag/${tagNames.stackName()}`]: stackName
    }
  };

  const role = new Role({
    RoleName: `${stackName}-dev-agent`,
    Description: `Dev agent role for stack ${stackName}`,
    MaxSessionDuration: 43200,
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
      // Lambda: Read + Invoke
      new Policy({
        PolicyName: 'lambda-access',
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
                'lambda:ListTags',
                'lambda:InvokeFunction',
                'lambda:InvokeAsync'
              ],
              Resource: SubWithoutMapping(`arn:aws:lambda:*:\${AWS::AccountId}:function:${stackName}-*`)
            }
          ]
        }
      }),

      // DynamoDB: Full data access
      new Policy({
        PolicyName: 'dynamodb-access',
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
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:BatchWriteItem',
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

      // S3: Full data access (objects)
      new Policy({
        PolicyName: 's3-access',
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
                's3:PutObject',
                's3:PutObjectTagging',
                's3:DeleteObject',
                's3:DeleteObjectVersion',
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

      // SQS: Full access
      new Policy({
        PolicyName: 'sqs-access',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'sqs:SendMessage',
                'sqs:SendMessageBatch',
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:DeleteMessageBatch',
                'sqs:GetQueueAttributes',
                'sqs:GetQueueUrl',
                'sqs:ListQueueTags',
                'sqs:PurgeQueue'
              ],
              Resource: SubWithoutMapping(`arn:aws:sqs:*:\${AWS::AccountId}:${stackName}-*`)
            }
          ]
        }
      }),

      // SNS: Publish + Read
      new Policy({
        PolicyName: 'sns-access',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'sns:Publish',
                'sns:GetTopicAttributes',
                'sns:ListTagsForResource',
                'sns:ListSubscriptionsByTopic'
              ],
              Resource: SubWithoutMapping(`arn:aws:sns:*:\${AWS::AccountId}:${stackName}-*`)
            }
          ]
        }
      }),

      // EventBridge: Put events + Read
      new Policy({
        PolicyName: 'eventbridge-access',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'events:PutEvents',
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

      // Step Functions: Execute + Read
      new Policy({
        PolicyName: 'stepfunctions-access',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'states:StartExecution',
                'states:StartSyncExecution',
                'states:StopExecution',
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
        PolicyName: 'logs-access',
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
                SubWithoutMapping(`arn:aws:logs:*:\${AWS::AccountId}:log-group:/ecs/${stackName}-*`),
                SubWithoutMapping(`arn:aws:logs:*:\${AWS::AccountId}:log-group:/ecs/${stackName}-*:*`),
                SubWithoutMapping(`arn:aws:logs:*:\${AWS::AccountId}:log-group:${stackName}-*`),
                SubWithoutMapping(`arn:aws:logs:*:\${AWS::AccountId}:log-group:${stackName}-*:*`)
              ]
            }
          ]
        }
      }),

      // ECS: Read + Execute command
      new Policy({
        PolicyName: 'ecs-access',
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
                'ecs:ListTagsForResource',
                'ecs:ExecuteCommand'
              ],
              Resource: '*',
              Condition: stackTagCondition
            }
          ]
        }
      }),

      // RDS: Read only
      new Policy({
        PolicyName: 'rds-access',
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
        PolicyName: 'elasticache-access',
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

      // OpenSearch: Read + data access
      new Policy({
        PolicyName: 'opensearch-access',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'es:DescribeDomain',
                'es:DescribeDomains',
                'es:ListTags',
                'es:ESHttpGet',
                'es:ESHttpHead',
                'es:ESHttpPost',
                'es:ESHttpPut',
                'es:ESHttpDelete'
              ],
              Resource: SubWithoutMapping(`arn:aws:es:*:\${AWS::AccountId}:domain/${stackName}-*`)
            }
          ]
        }
      }),

      // Cognito: Read + user management
      new Policy({
        PolicyName: 'cognito-access',
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
                'cognito-idp:AdminListGroupsForUser',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminDeleteUser',
                'cognito-idp:AdminSetUserPassword',
                'cognito-idp:AdminUpdateUserAttributes',
                'cognito-idp:AdminAddUserToGroup',
                'cognito-idp:AdminRemoveUserFromGroup',
                'cognito-idp:AdminEnableUser',
                'cognito-idp:AdminDisableUser'
              ],
              Resource: SubWithoutMapping(`arn:aws:cognito-idp:*:\${AWS::AccountId}:userpool/*`),
              Condition: stackTagCondition
            }
          ]
        }
      }),

      // API Gateway: Read
      new Policy({
        PolicyName: 'apigateway-access',
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
        PolicyName: 'cloudformation-access',
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
        PolicyName: 'cloudwatch-access',
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

      // Batch: Read + submit jobs
      new Policy({
        PolicyName: 'batch-access',
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
                'batch:SubmitJob',
                'batch:TerminateJob',
                'batch:ListTagsForResource'
              ],
              Resource: '*',
              Condition: stackTagCondition
            }
          ]
        }
      }),

      // Explicit deny for dangerous operations
      new Policy({
        PolicyName: 'deny-dangerous-operations',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
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
          ]
        }
      })
    ]
  });

  calculatedStackOverviewManager.addCfChildResource({
    nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
    cfLogicalName: DEV_AGENT_ROLE_LOGICAL_NAME,
    resource: role,
    initial: true
  });

  // Export role ARN and external ID for the dev agent
  calculatedStackOverviewManager.addUserCustomStackOutput({
    cloudformationOutputName: 'DevAgentRoleArn',
    value: GetAtt(DEV_AGENT_ROLE_LOGICAL_NAME, 'Arn'),
    description: 'ARN of the dev agent IAM role'
  });

  calculatedStackOverviewManager.addStackMetadata({
    metaName: stackMetadataNames.devAgentRoleExternalId(),
    metaValue: globallyUniqueStackHash,
    showDuringPrint: false
  });
};
