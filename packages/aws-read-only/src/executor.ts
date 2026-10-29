/**
 * Sends one AWS SDK v3 operation by name: the CLI's `aws call`, the dev agent's `/aws/sdk` endpoint and a hosted incident
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

/**
 * Why a call failed, for a caller that decides what to do next: `OPERATION_NOT_ALLOWED` is outside the read-only
 * catalog and never sent, `ACCESS_DENIED` was refused by IAM, and `AWS_ERROR` is any other error AWS returned.
 */
export type AwsSdkErrorCode =
  | 'OPERATION_NOT_ALLOWED'
  | 'ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'AWS_ERROR';

export type AwsSdkResult =
  | { ok: true; data?: unknown }
  | { ok: false; code: AwsSdkErrorCode; error: string; hint?: string };

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
  batch: { load: () => import('@aws-sdk/client-batch'), clientClass: 'BatchClient' },
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
    if (refusal) return { ok: false, code: 'OPERATION_NOT_ALLOWED', error: refusal.message, hint: refusal.hint };
    // Accepted by the catalog, so the service has a canonical name.
    const canonicalService = resolveAwsServiceName(service)!;

    const { load, clientClass } = SERVICE_MAP[canonicalService];
    const module = await load();

    // Get client class
    const ClientClass = module[clientClass] as new (cfg: AwsSdkContext) => {
      send: (cmd: unknown) => Promise<unknown>;
    };

    if (!ClientClass) {
      return { ok: false, code: 'AWS_ERROR', error: `Client class ${clientClass} not found` };
    }

    // Get command class - try with and without "Command" suffix
    const commandName = command.endsWith('Command') ? command : `${command}Command`;
    const CommandClass = module[commandName] as new (input: Record<string, unknown>) => unknown;

    if (!CommandClass) {
      // Suggest from the catalog rather than from the module's exports, which are mostly commands nothing here will
      // send anyway.
      return {
        ok: false,
        code: 'OPERATION_NOT_ALLOWED',
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
    const data =
      result && typeof result === 'object' && '$metadata' in result
        ? (({ $metadata: _, ...rest }) => rest)(result as Record<string, unknown>)
        : result;
    return redactResponse(canonicalService, data);
  } catch (err: unknown) {
    return handleAwsError(err);
  }
};

const REDACTED_VALUE = '[redacted]';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;

/**
 * Environment variable values where AWS returns them as structured data: Lambda function configurations
 * (`GetFunction`, `GetFunctionConfiguration`, `ListFunctions`, `ListVersionsByFunction`), ECS container environments
 * (`DescribeTaskDefinition`, and the task overrides in `DescribeTasks`) and Batch container environments
 * (`DescribeJobDefinitions`, `DescribeJobs`): `environment` of ECS-style containers, multi-node ranges and overrides, and
 * `env` of EKS pod containers. Secrets given by reference (`secrets[].valueFrom`) are ARNs and stay. Applications keep secrets there, so every
 * caller gets the variable names and the rest of the metadata, never the values. Other content reads are not touched.
 */
const redactEnvironmentValues = (service: 'lambda' | 'ecs' | 'batch', response: unknown): unknown => {
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit);
    if (!isPlainObject(node)) return node;
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => {
        if (service === 'lambda' && key === 'Environment' && isPlainObject(value) && isPlainObject(value.Variables)) {
          return [key, { ...value, Variables: redactRecordValues(value.Variables) }];
        }
        const isContainerEnvironment = key === 'environment' || (service === 'batch' && key === 'env');
        if ((service === 'ecs' || service === 'batch') && isContainerEnvironment && Array.isArray(value)) {
          return [key, value.map((entry) => (isPlainObject(entry) ? { ...entry, value: REDACTED_VALUE } : entry))];
        }
        return [key, visit(value)];
      })
    );
  };
  return visit(response);
};

const redactRecordValues = (record: Record<string, unknown>) =>
  Object.fromEntries(Object.keys(record).map((name) => [name, REDACTED_VALUE]));

/** Replaces the values of the keys `redact` names, anywhere in `node`, with what it returns. */
const redactKeys = (node: unknown, redact: (key: string, value: unknown) => unknown): unknown => {
  if (Array.isArray(node)) return node.map((item) => redactKeys(item, redact));
  if (!isPlainObject(node)) return node;
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => {
      const redacted = redact(key, value);
      return [key, redacted === undefined ? redactKeys(value, redact) : redacted];
    })
  );
};

/** Template properties that hold a credential itself rather than a reference to one. */
const TEMPLATE_CREDENTIAL_PROPERTIES = new Set([
  'AuthToken',
  'ClientSecret',
  'MasterUserPassword',
  'Password',
  'SecretString'
]);

/**
 * The values a deployed template holds literally: environment variables of Lambda functions (`Environment.Variables`),
 * ECS and Batch containers (`Environment`, `Env`) and canaries (`EnvironmentVariables`), the connection details
 * Stacktape stores through its sensitive-data resource (`sensitiveData`), credential properties such as
 * `MasterUserPassword`, and the defaults of `NoEcho` parameters. `aws call` masks the same environment values in
 * Lambda, ECS and Batch reads, and the template must not show them either.
 */
const redactTemplate = (template: Record<string, unknown>) => {
  const parameters = isPlainObject(template.Parameters)
    ? Object.fromEntries(
        Object.entries(template.Parameters).map(([name, parameter]) => [
          name,
          isPlainObject(parameter) && parameter.NoEcho !== undefined && parameter.Default !== undefined
            ? { ...parameter, Default: REDACTED_VALUE }
            : parameter
        ])
      )
    : template.Parameters;
  const redactEntries = (entries: unknown[]) =>
    entries.map((entry) =>
      isPlainObject(entry)
        ? Object.fromEntries(
            Object.entries(entry).map(([key, value]) => [key, /^value$/i.test(key) ? REDACTED_VALUE : value])
          )
        : entry
    );
  return redactKeys({ ...template, ...(parameters === undefined ? {} : { Parameters: parameters }) }, (key, value) => {
    if (TEMPLATE_CREDENTIAL_PROPERTIES.has(key)) return REDACTED_VALUE;
    if (key === 'sensitiveData' && Array.isArray(value)) return redactEntries(value);
    if (key !== 'Environment' && key !== 'Env' && key !== 'EnvironmentVariables') return undefined;
    if (Array.isArray(value)) return redactEntries(value);
    if (!isPlainObject(value)) return undefined;
    return isPlainObject(value.Variables)
      ? { ...value, Variables: redactRecordValues(value.Variables) }
      : redactRecordValues(value);
  });
};

/**
 * Masks what a read returns of credentials and configuration values, or refuses to return a response it cannot mask:
 * environment values (see `redactEnvironmentValues`), a Cognito app client's `ClientSecret` (`DescribeUserPoolClient`),
 * a canary's `RunConfig.EnvironmentVariables` (`GetCanary`, `DescribeCanaries`) and the literal values of a
 * CloudFormation template (`GetTemplate`, see `redactTemplate`). A template that is not JSON (a YAML template) is
 * refused: its masking would depend on parsing CloudFormation's YAML tags.
 */
const redactResponse = (service: AwsReadOnlyService, data: unknown): AwsSdkResult => {
  if (service === 'lambda' || service === 'ecs' || service === 'batch') {
    return { ok: true, data: redactEnvironmentValues(service, data) };
  }
  if (service === 'cognito') {
    return {
      ok: true,
      data: redactKeys(data, (key, value) =>
        key === 'ClientSecret' && typeof value === 'string' ? REDACTED_VALUE : undefined
      )
    };
  }
  if (service === 'synthetics') {
    return {
      ok: true,
      data: redactKeys(data, (key, value) =>
        key === 'EnvironmentVariables' && isPlainObject(value) ? redactRecordValues(value) : undefined
      )
    };
  }
  if (service === 'cloudformation' && isPlainObject(data) && typeof data.TemplateBody === 'string') {
    let template: unknown;
    try {
      template = JSON.parse(data.TemplateBody);
    } catch {
      template = undefined;
    }
    if (!isPlainObject(template)) {
      return {
        ok: false,
        code: 'OPERATION_NOT_ALLOWED',
        error:
          'The template is not JSON, so its literal values, such as environment variables, cannot be masked. It is not returned.',
        hint: 'Read the stack with DescribeStacks or DescribeStackResources, or the resources it created with their own describe operations.'
      };
    }
    return { ok: true, data: { ...data, TemplateBody: JSON.stringify(redactTemplate(template), null, 2) } };
  }
  return { ok: true, data };
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

const IAM_DENIAL_NAME =
  /^(AccessDenied(Exception)?|UnauthorizedOperation|AuthorizationError(Exception)?|NotAuthorized)$/;

/**
 * Handle AWS SDK errors with helpful messages
 */
const handleAwsError = (err: unknown): AwsSdkResult => {
  if (err && typeof err === 'object' && 'name' in err) {
    const awsErr = err as { name: string; message: string; Code?: string };

    // Services name an IAM denial differently: `AccessDeniedException`, `AccessDenied` (SQS, S3),
    // `UnauthorizedOperation` (EC2), `AuthorizationError` (SNS).
    if ([awsErr.name, awsErr.Code].some((name) => name && IAM_DENIAL_NAME.test(name))) {
      return {
        ok: false,
        code: 'ACCESS_DENIED',
        error: `Access denied: ${awsErr.message}`,
        hint: 'The AWS role or credentials used for this call do not allow this operation.'
      };
    }

    if (
      awsErr.name === 'ResourceNotFoundException' ||
      awsErr.name === 'NoSuchBucket' ||
      awsErr.name === 'NoSuchKey' ||
      awsErr.name === 'NotFoundException' ||
      awsErr.name === 'QueueDoesNotExist'
    ) {
      return { ok: false, code: 'NOT_FOUND', error: `Resource not found: ${awsErr.message}` };
    }

    if (awsErr.name === 'ValidationException' || awsErr.name === 'InvalidParameterException') {
      return { ok: false, code: 'VALIDATION_ERROR', error: `Invalid parameter: ${awsErr.message}` };
    }

    return { ok: false, code: 'AWS_ERROR', error: `${awsErr.name}: ${awsErr.message}` };
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  return { ok: false, code: 'AWS_ERROR', error: message };
};
