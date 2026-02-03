/**
 * AWS SDK Executor
 * Executes AWS SDK v3 commands directly.
 * LLMs know AWS SDK v3 well - this provides direct access.
 */

import type { AwsCredentialIdentity } from '@aws-sdk/types';
import * as lambda from '@aws-sdk/client-lambda';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import * as s3 from '@aws-sdk/client-s3';
import * as logs from '@aws-sdk/client-cloudwatch-logs';
import * as cloudformation from '@aws-sdk/client-cloudformation';
import * as cloudwatch from '@aws-sdk/client-cloudwatch';
import * as sqs from '@aws-sdk/client-sqs';
import * as sns from '@aws-sdk/client-sns';
import * as sfn from '@aws-sdk/client-sfn';
import * as eventbridge from '@aws-sdk/client-eventbridge';
import * as secretsmanager from '@aws-sdk/client-secrets-manager';
import * as ssm from '@aws-sdk/client-ssm';
import * as sts from '@aws-sdk/client-sts';
import * as iam from '@aws-sdk/client-iam';
import * as ec2 from '@aws-sdk/client-ec2';
import * as ecs from '@aws-sdk/client-ecs';
import * as ecr from '@aws-sdk/client-ecr';
import * as rds from '@aws-sdk/client-rds';
import * as ses from '@aws-sdk/client-ses';
import * as sesv2 from '@aws-sdk/client-sesv2';
import * as cloudfront from '@aws-sdk/client-cloudfront';
import * as route53 from '@aws-sdk/client-route-53';
import * as acm from '@aws-sdk/client-acm';
import * as cognito from '@aws-sdk/client-cognito-identity-provider';
import * as opensearch from '@aws-sdk/client-opensearch';
import * as wafv2 from '@aws-sdk/client-wafv2';
import * as elbv2 from '@aws-sdk/client-elastic-load-balancing-v2';
import * as autoscaling from '@aws-sdk/client-auto-scaling';
import * as budgets from '@aws-sdk/client-budgets';
import * as costexplorer from '@aws-sdk/client-cost-explorer';
import * as codebuild from '@aws-sdk/client-codebuild';
import * as codedeploy from '@aws-sdk/client-codedeploy';
import * as servicediscovery from '@aws-sdk/client-servicediscovery';
import * as xray from '@aws-sdk/client-xray';
import * as apigatewayv2 from '@aws-sdk/client-apigatewayv2';
import * as kinesis from '@aws-sdk/client-kinesis';
import * as firehose from '@aws-sdk/client-firehose';

export type AwsSdkContext = {
  region: string;
  credentials: AwsCredentialIdentity;
};

export type AwsSdkResult = { ok: true; data?: unknown } | { ok: false; error: string; hint?: string };

type SdkModule = Record<string, unknown>;

type ClientConfig = {
  module: SdkModule;
  clientClass: string;
};

// Map service names to their modules and client class names
const SERVICE_MAP: Record<string, ClientConfig> = {
  lambda: { module: lambda, clientClass: 'LambdaClient' },
  dynamodb: { module: dynamodb, clientClass: 'DynamoDBClient' },
  s3: { module: s3, clientClass: 'S3Client' },
  logs: { module: logs, clientClass: 'CloudWatchLogsClient' },
  cloudformation: { module: cloudformation, clientClass: 'CloudFormationClient' },
  cloudwatch: { module: cloudwatch, clientClass: 'CloudWatchClient' },
  sqs: { module: sqs, clientClass: 'SQSClient' },
  sns: { module: sns, clientClass: 'SNSClient' },
  sfn: { module: sfn, clientClass: 'SFNClient' },
  stepfunctions: { module: sfn, clientClass: 'SFNClient' },
  eventbridge: { module: eventbridge, clientClass: 'EventBridgeClient' },
  events: { module: eventbridge, clientClass: 'EventBridgeClient' },
  secretsmanager: { module: secretsmanager, clientClass: 'SecretsManagerClient' },
  ssm: { module: ssm, clientClass: 'SSMClient' },
  sts: { module: sts, clientClass: 'STSClient' },
  iam: { module: iam, clientClass: 'IAMClient' },
  ec2: { module: ec2, clientClass: 'EC2Client' },
  ecs: { module: ecs, clientClass: 'ECSClient' },
  ecr: { module: ecr, clientClass: 'ECRClient' },
  rds: { module: rds, clientClass: 'RDSClient' },
  ses: { module: ses, clientClass: 'SESClient' },
  sesv2: { module: sesv2, clientClass: 'SESv2Client' },
  cloudfront: { module: cloudfront, clientClass: 'CloudFrontClient' },
  route53: { module: route53, clientClass: 'Route53Client' },
  acm: { module: acm, clientClass: 'ACMClient' },
  cognito: { module: cognito, clientClass: 'CognitoIdentityProviderClient' },
  opensearch: { module: opensearch, clientClass: 'OpenSearchClient' },
  wafv2: { module: wafv2, clientClass: 'WAFV2Client' },
  elb: { module: elbv2, clientClass: 'ElasticLoadBalancingV2Client' },
  elbv2: { module: elbv2, clientClass: 'ElasticLoadBalancingV2Client' },
  autoscaling: { module: autoscaling, clientClass: 'AutoScalingClient' },
  budgets: { module: budgets, clientClass: 'BudgetsClient' },
  costexplorer: { module: costexplorer, clientClass: 'CostExplorerClient' },
  codebuild: { module: codebuild, clientClass: 'CodeBuildClient' },
  codedeploy: { module: codedeploy, clientClass: 'CodeDeployClient' },
  servicediscovery: { module: servicediscovery, clientClass: 'ServiceDiscoveryClient' },
  xray: { module: xray, clientClass: 'XRayClient' },
  apigatewayv2: { module: apigatewayv2, clientClass: 'ApiGatewayV2Client' },
  kinesis: { module: kinesis, clientClass: 'KinesisClient' },
  firehose: { module: firehose, clientClass: 'FirehoseClient' }
};

/**
 * Execute an AWS SDK command
 *
 * @param service - Service name (e.g., "lambda", "s3", "dynamodb")
 * @param command - Command name without "Command" suffix (e.g., "ListFunctions", "GetObject")
 * @param input - Command input parameters
 * @param context - AWS credentials and region
 */
export const executeAwsSdkCommand = async (
  service: string,
  command: string,
  input: Record<string, unknown>,
  context: AwsSdkContext
): Promise<AwsSdkResult> => {
  try {
    const config = SERVICE_MAP[service.toLowerCase()];
    if (!config) {
      return {
        ok: false,
        error: `Unknown service: ${service}`,
        hint: `Supported services: ${Object.keys(SERVICE_MAP).join(', ')}`
      };
    }

    const { module, clientClass } = config;

    // Get client class
    const ClientClass = module[clientClass] as new (cfg: { region: string; credentials: AwsCredentialIdentity }) => {
      send: (cmd: unknown) => Promise<unknown>;
    };

    if (!ClientClass) {
      return { ok: false, error: `Client class ${clientClass} not found` };
    }

    // Get command class - try with and without "Command" suffix
    const commandName = command.endsWith('Command') ? command : `${command}Command`;
    const CommandClass = module[commandName] as new (input: Record<string, unknown>) => unknown;

    if (!CommandClass) {
      const availableCommands = Object.keys(module)
        .filter((k) => k.endsWith('Command') && k !== 'Command')
        .map((k) => k.replace('Command', ''))
        .slice(0, 20);

      return {
        ok: false,
        error: `Unknown command: ${command} for service ${service}`,
        hint: `Some available commands: ${availableCommands.join(', ')}...`
      };
    }

    // Create client and command instances, execute
    const client = new ClientClass({ region: context.region, credentials: context.credentials });
    const cmd = new CommandClass(input);
    const result = await client.send(cmd);

    // Clean up response (remove $metadata for cleaner output)
    if (result && typeof result === 'object' && '$metadata' in result) {
      const { $metadata: _, ...data } = result as Record<string, unknown>;
      return { ok: true, data };
    }

    return { ok: true, data: result };
  } catch (err: unknown) {
    return handleAwsError(err);
  }
};

/**
 * Handle AWS SDK errors with helpful messages
 */
const handleAwsError = (err: unknown): AwsSdkResult => {
  if (err && typeof err === 'object' && 'name' in err) {
    const awsErr = err as { name: string; message: string; Code?: string };

    if (awsErr.name === 'AccessDeniedException' || awsErr.Code === 'AccessDenied') {
      return {
        ok: false,
        error: `Access denied: ${awsErr.message}`,
        hint: 'This operation may not be allowed by the dev agent IAM policy'
      };
    }

    if (
      awsErr.name === 'ResourceNotFoundException' ||
      awsErr.name === 'NoSuchBucket' ||
      awsErr.name === 'NoSuchKey' ||
      awsErr.name === 'NotFoundException'
    ) {
      return { ok: false, error: `Resource not found: ${awsErr.message}` };
    }

    if (awsErr.name === 'ValidationException' || awsErr.name === 'InvalidParameterException') {
      return { ok: false, error: `Invalid parameter: ${awsErr.message}` };
    }

    return { ok: false, error: `${awsErr.name}: ${awsErr.message}` };
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  return { ok: false, error: message };
};

/**
 * Get list of supported services and example commands
 */
export const getSupportedServices = (): Record<string, string[]> => {
  const exampleCommands: Record<string, string[]> = {
    lambda: ['ListFunctions', 'GetFunction', 'Invoke', 'GetFunctionConfiguration', 'ListEventSourceMappings'],
    dynamodb: ['ListTables', 'DescribeTable', 'Scan', 'Query', 'GetItem', 'PutItem', 'DeleteItem'],
    s3: ['ListBuckets', 'ListObjectsV2', 'GetObject', 'PutObject', 'DeleteObject', 'HeadObject'],
    logs: ['DescribeLogGroups', 'DescribeLogStreams', 'FilterLogEvents', 'GetLogEvents'],
    cloudformation: ['DescribeStacks', 'DescribeStackResources', 'ListStacks', 'DescribeStackEvents'],
    cloudwatch: ['GetMetricData', 'ListMetrics', 'DescribeAlarms', 'GetMetricStatistics'],
    sqs: ['ListQueues', 'GetQueueAttributes', 'SendMessage', 'ReceiveMessage', 'DeleteMessage'],
    sns: ['ListTopics', 'ListSubscriptions', 'Publish', 'GetTopicAttributes'],
    sfn: ['ListStateMachines', 'DescribeStateMachine', 'ListExecutions', 'DescribeExecution', 'StartExecution'],
    eventbridge: ['ListRules', 'DescribeRule', 'ListTargetsByRule', 'PutEvents'],
    secretsmanager: ['ListSecrets', 'GetSecretValue', 'DescribeSecret'],
    ssm: ['GetParameter', 'GetParameters', 'GetParametersByPath'],
    sts: ['GetCallerIdentity'],
    iam: ['ListRoles', 'ListPolicies', 'GetRole', 'GetPolicy'],
    ec2: ['DescribeInstances', 'DescribeSecurityGroups', 'DescribeVpcs', 'DescribeSubnets'],
    ecs: ['ListClusters', 'ListServices', 'ListTasks', 'DescribeServices', 'DescribeTasks'],
    ecr: ['DescribeRepositories', 'ListImages', 'DescribeImages'],
    rds: ['DescribeDBInstances', 'DescribeDBClusters'],
    cognito: ['ListUserPools', 'ListUsers', 'DescribeUserPool'],
    apigatewayv2: ['GetApis', 'GetRoutes', 'GetStages'],
    xray: ['GetTraceSummaries', 'BatchGetTraces', 'GetServiceGraph'],
    kinesis: ['ListStreams', 'DescribeStream', 'GetRecords'],
    firehose: ['ListDeliveryStreams', 'DescribeDeliveryStream']
  };

  const result: Record<string, string[]> = {};
  const seen = new Set<string>();

  for (const service of Object.keys(SERVICE_MAP)) {
    // Skip aliases
    if (seen.has(service)) continue;
    seen.add(service);

    result[service] = exampleCommands[service] || [];
  }

  return result;
};
