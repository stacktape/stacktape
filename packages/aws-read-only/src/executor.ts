/**
 * Sends one AWS SDK v3 operation by name: the CLI's `aws:call`, the dev agent's `/aws/sdk` endpoint and a hosted incident
 * run's `aws_call` all come through here. Callers may sign with a person's own AWS credentials or with an organization's
 * connected-account role, so this is where the reviewed read-only catalog is enforced: an operation outside it is
 * refused before a client is even created. A service's SDK client is loaded only when that service is called.
 */

import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@aws-sdk/types';
import {
  AWS_READ_ONLY_OPERATIONS,
  type AwsReadOnlyService,
  describeAwsCallRefusal,
  resolveAwsServiceName
} from './operations';

export type AwsSdkContext = {
  region: string;
  credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
};

export type AwsSdkResult = { ok: true; data?: unknown } | { ok: false; error: string; hint?: string };

type SdkModule = Record<string, unknown>;

type ClientConfig = {
  load: () => Promise<SdkModule>;
  clientClass: string;
};

/**
 * The client wiring for every service the catalog covers. Keyed by the canonical names in `AWS_READ_ONLY_OPERATIONS`,
 * so the type checker keeps the two in step: a service with reviewed operations always has a client here, and a client
 * here is never one the catalog has never heard of. Alternate spellings (`stepfunctions`, `events`, `elb`) resolve
 * through that module too, rather than being repeated here.
 */
const SERVICE_MAP: Record<AwsReadOnlyService, ClientConfig> = {
  lambda: { load: () => import('@aws-sdk/client-lambda'), clientClass: 'LambdaClient' },
  dynamodb: { load: () => import('@aws-sdk/client-dynamodb'), clientClass: 'DynamoDBClient' },
  s3: { load: () => import('@aws-sdk/client-s3'), clientClass: 'S3Client' },
  logs: { load: () => import('@aws-sdk/client-cloudwatch-logs'), clientClass: 'CloudWatchLogsClient' },
  cloudformation: { load: () => import('@aws-sdk/client-cloudformation'), clientClass: 'CloudFormationClient' },
  cloudwatch: { load: () => import('@aws-sdk/client-cloudwatch'), clientClass: 'CloudWatchClient' },
  sqs: { load: () => import('@aws-sdk/client-sqs'), clientClass: 'SQSClient' },
  sns: { load: () => import('@aws-sdk/client-sns'), clientClass: 'SNSClient' },
  sfn: { load: () => import('@aws-sdk/client-sfn'), clientClass: 'SFNClient' },
  eventbridge: { load: () => import('@aws-sdk/client-eventbridge'), clientClass: 'EventBridgeClient' },
  secretsmanager: { load: () => import('@aws-sdk/client-secrets-manager'), clientClass: 'SecretsManagerClient' },
  ssm: { load: () => import('@aws-sdk/client-ssm'), clientClass: 'SSMClient' },
  sts: { load: () => import('@aws-sdk/client-sts'), clientClass: 'STSClient' },
  iam: { load: () => import('@aws-sdk/client-iam'), clientClass: 'IAMClient' },
  ec2: { load: () => import('@aws-sdk/client-ec2'), clientClass: 'EC2Client' },
  ecs: { load: () => import('@aws-sdk/client-ecs'), clientClass: 'ECSClient' },
  ecr: { load: () => import('@aws-sdk/client-ecr'), clientClass: 'ECRClient' },
  rds: { load: () => import('@aws-sdk/client-rds'), clientClass: 'RDSClient' },
  ses: { load: () => import('@aws-sdk/client-ses'), clientClass: 'SESClient' },
  sesv2: { load: () => import('@aws-sdk/client-sesv2'), clientClass: 'SESv2Client' },
  cloudfront: { load: () => import('@aws-sdk/client-cloudfront'), clientClass: 'CloudFrontClient' },
  route53: { load: () => import('@aws-sdk/client-route-53'), clientClass: 'Route53Client' },
  acm: { load: () => import('@aws-sdk/client-acm'), clientClass: 'ACMClient' },
  cognito: {
    load: () => import('@aws-sdk/client-cognito-identity-provider'),
    clientClass: 'CognitoIdentityProviderClient'
  },
  opensearch: { load: () => import('@aws-sdk/client-opensearch'), clientClass: 'OpenSearchClient' },
  synthetics: { load: () => import('@aws-sdk/client-synthetics'), clientClass: 'SyntheticsClient' },
  wafv2: { load: () => import('@aws-sdk/client-wafv2'), clientClass: 'WAFV2Client' },
  elbv2: {
    load: () => import('@aws-sdk/client-elastic-load-balancing-v2'),
    clientClass: 'ElasticLoadBalancingV2Client'
  },
  autoscaling: { load: () => import('@aws-sdk/client-auto-scaling'), clientClass: 'AutoScalingClient' },
  budgets: { load: () => import('@aws-sdk/client-budgets'), clientClass: 'BudgetsClient' },
  costexplorer: { load: () => import('@aws-sdk/client-cost-explorer'), clientClass: 'CostExplorerClient' },
  codedeploy: { load: () => import('@aws-sdk/client-codedeploy'), clientClass: 'CodeDeployClient' },
  servicediscovery: { load: () => import('@aws-sdk/client-servicediscovery'), clientClass: 'ServiceDiscoveryClient' },
  xray: { load: () => import('@aws-sdk/client-xray'), clientClass: 'XRayClient' },
  apigatewayv2: { load: () => import('@aws-sdk/client-apigatewayv2'), clientClass: 'ApiGatewayV2Client' },
  kinesis: { load: () => import('@aws-sdk/client-kinesis'), clientClass: 'KinesisClient' },
  firehose: { load: () => import('@aws-sdk/client-firehose'), clientClass: 'FirehoseClient' }
};

/**
 * Execute an AWS SDK command, if it is a reviewed read-only operation for the service.
 *
 * @param service - Service name (e.g., "lambda", "s3", "dynamodb")
 * @param command - Command name without "Command" suffix (e.g., "ListFunctions", "GetObject")
 * @param input - Command input parameters
 * @param context - AWS credentials, or a provider of them, and region
 */
export const executeAwsSdkCommand = async (
  service: string,
  command: string,
  input: Record<string, unknown>,
  context: AwsSdkContext
): Promise<AwsSdkResult> => {
  try {
    const refusal = describeAwsCallRefusal(service, command);
    if (refusal) return { ok: false, error: refusal.message, hint: refusal.hint };
    // Accepted by the catalog, so the service has a canonical name.
    const canonicalService = resolveAwsServiceName(service)!;

    const { load, clientClass } = SERVICE_MAP[canonicalService];
    const module = await load();

    // Get client class
    const ClientClass = module[clientClass] as new (cfg: AwsSdkContext) => {
      send: (cmd: unknown) => Promise<unknown>;
    };

    if (!ClientClass) {
      return { ok: false, error: `Client class ${clientClass} not found` };
    }

    // Get command class - try with and without "Command" suffix
    const commandName = command.endsWith('Command') ? command : `${command}Command`;
    const CommandClass = module[commandName] as new (input: Record<string, unknown>) => unknown;

    if (!CommandClass) {
      // Suggest from the catalog rather than from the module's exports, which are mostly commands nothing here will
      // send anyway.
      return {
        ok: false,
        error: `Unknown command: ${command} for service ${service}`,
        hint: `Accepted commands for ${canonicalService}: ${AWS_READ_ONLY_OPERATIONS[canonicalService].join(', ')}`
      };
    }

    // Create client and command instances, execute
    const client = new ClientClass({ region: context.region, credentials: context.credentials });
    let result: unknown;
    try {
      result = await client.send(new CommandClass(input));
    } catch (err) {
      // SDK timestamp fields require Date instances, but calls arrive as JSON where callers naturally write epoch
      // numbers or ISO strings (e.g. GetMetricData StartTime). Only after the SDK proves a timestamp is involved is the
      // input re-tried with likely timestamp keys revived — a blind pass would corrupt epoch-typed long fields like
      // FilterLogEvents startTime.
      if (err instanceof TypeError && err.message.includes('toISOString')) {
        // Reviving keeps the input's shape: a record stays a record.
        result = await client.send(new CommandClass(reviveTimestampInputs(input) as Record<string, unknown>));
      } else {
        throw err;
      }
    }

    // Clean up response (remove $metadata for cleaner output)
    if (result && typeof result === 'object' && '$metadata' in result) {
      const { $metadata: _, ...data } = result as Record<string, unknown>;
      return { ok: true, data: redactEnvironmentValues(canonicalService, data) };
    }

    return { ok: true, data: redactEnvironmentValues(canonicalService, result) };
  } catch (err: unknown) {
    return handleAwsError(err);
  }
};

const REDACTED_VALUE = '[redacted]';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;

/**
 * Environment variable values where AWS returns them as structured data: Lambda function configurations
 * (`GetFunction`, `GetFunctionConfiguration`, `ListFunctions`, `ListVersionsByFunction`) and ECS container environments
 * (`DescribeTaskDefinition`, and the task overrides in `DescribeTasks`). Applications keep secrets there, so every
 * caller gets the variable names and the rest of the metadata, never the values. Other content reads are not touched.
 */
const redactEnvironmentValues = (service: AwsReadOnlyService, response: unknown): unknown => {
  if (service !== 'lambda' && service !== 'ecs') return response;
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit);
    if (!isPlainObject(node)) return node;
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => {
        if (service === 'lambda' && key === 'Environment' && isPlainObject(value) && isPlainObject(value.Variables)) {
          const names = Object.keys(value.Variables);
          return [key, { ...value, Variables: Object.fromEntries(names.map((name) => [name, REDACTED_VALUE])) }];
        }
        if (service === 'ecs' && key === 'environment' && Array.isArray(value)) {
          return [key, value.map((entry) => (isPlainObject(entry) ? { ...entry, value: REDACTED_VALUE } : entry))];
        }
        return [key, visit(value)];
      })
    );
  };
  return visit(response);
};

const TIMESTAMP_KEY_PATTERN = /(Time|Date|Timestamp)$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const reviveTimestampInputs = (node: unknown): unknown => {
  if (Array.isArray(node)) {
    return node.map(reviveTimestampInputs);
  }
  if (!node || typeof node !== 'object') {
    return node;
  }
  return Object.fromEntries(
    Object.entries(node as Record<string, unknown>).map(([key, value]) => {
      if (TIMESTAMP_KEY_PATTERN.test(key)) {
        if (typeof value === 'number') {
          // Epoch seconds fit comfortably under 1e12 for centuries; milliseconds never do.
          return [key, new Date(value > 1e12 ? value : value * 1000)];
        }
        if (typeof value === 'string' && ISO_DATE_PATTERN.test(value)) {
          return [key, new Date(value)];
        }
      }
      return [key, reviveTimestampInputs(value)];
    })
  );
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
        hint: 'The AWS role or credentials used for this call do not allow this operation.'
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
