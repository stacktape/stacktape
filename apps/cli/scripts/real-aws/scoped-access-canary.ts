/**
 * Real-AWS check of what `connectTo` grants, what it revokes on update, and what reaches a function through a real HTTP
 * API and a `$Secret()` dynamic reference. MiniStack cannot show any of this: it does not enforce IAM, and it does not
 * resolve CloudFormation dynamic references.
 *
 * It creates one owned Secrets Manager secret, deploys `_test-stacks/scoped-access` through the source-built CLI
 * (`pnpm dev:cli`, which reads the Stacktape API key from `apps/cli/.env.local` in dev mode), then deletes everything:
 * 1. variant `a`: the function is connected to `tableA`, `bucketA` and `queueA`. A request through the HTTP API must
 *    show those three allowed and `tableB`/`bucketB` denied, the matching `STP_*` variables only, the secret's first
 *    value, and no `/extra` route;
 * 2. the secret gets a new value, and variant `b` connects the function to `tableB` and `bucketB` instead. The same
 *    request must show the access reversed, the `STP_*` variables swapped, the secret's new value and the new route;
 * 3. delete the stack with the CLI, then confirm with AWS that the stack, its buckets, tables, queue, function, API and
 *    log groups are gone, and delete the secret.
 *
 * Guardrails (docs/testing.md, "Live AWS"): an explicit opt-in; STS must resolve the credentials to the explicitly
 * expected account, and the CLI deploys through the single active Stacktape connection to that same account; a new
 * `v4scopedcanary-` project and secret carrying the run's owner tag; recovery state written before the first creation;
 * cleanup in `finally` after success or failure, verified with AWS; one exact `--cleanup-only` command when cleanup does
 * not finish. The API key, credentials and secret values never appear in commands, logs or the report.
 *
 *   STP_AWS_SCOPED_CANARY_DEPLOY=1 STP_AWS_SCOPED_CANARY_EXPECTED_ACCOUNT_ID=<12 digits>
 *   STP_AWS_SCOPED_CANARY_PROFILE=<name> STP_AWS_SCOPED_CANARY_OWNER=<run id>
 *   STP_AWS_SCOPED_CANARY_STATE_FILE=<absolute path> [STP_AWS_SCOPED_CANARY_REPORT=<absolute path>]
 *   [STP_AWS_SCOPED_CANARY_PROJECT_NAME=v4scopedcanary-…] [STP_AWS_SCOPED_CANARY_REGION=eu-west-1]
 *   pnpm --filter @stacktape/cli run test:real-aws-scoped-access-canary [-- --cleanup-only]
 */
import { ApiGatewayV2Client, GetApiCommand } from '@aws-sdk/client-apigatewayv2';
import {
  CloudFormationClient,
  DeleteStackCommand,
  waitUntilStackDeleteComplete,
  type StackResource
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { DescribeTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DescribeRepositoriesCommand, ECRClient } from '@aws-sdk/client-ecr';
import { GetRoleCommand, IAMClient } from '@aws-sdk/client-iam';
import { GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import {
  CreateSecretCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
  PutSecretValueCommand,
  SecretsManagerClient
} from '@aws-sdk/client-secrets-manager';
import { GetQueueUrlCommand, SQSClient } from '@aws-sdk/client-sqs';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { createHash, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import {
  assert,
  assertOwned,
  awaitDomainsReleased,
  type BaseState,
  type CanaryOptions,
  cleanupCommand,
  createSourceCliRunner,
  deleteLogGroups,
  describeStack,
  emptyBucket,
  gone,
  hasDevApiKey,
  isMissing,
  OWNER_TAG,
  readStackResources,
  readState,
  resolveCanaryOptions,
  sleep,
  writeState
} from './source-cli-canary';

type Variant = 'a' | 'b';
type OwnedResources = {
  deploymentBucket?: string;
  buckets?: string[];
  tables?: string[];
  queueNames?: string[];
  functionNames?: string[];
  roleNames?: string[];
  repositories?: string[];
  apiIds?: string[];
  domains?: string[];
  logGroupNames?: string[];
};
type State = BaseState &
  OwnedResources & {
    secretName: string;
    secretArn?: string;
  };
type Clients = {
  apiGateway: ApiGatewayV2Client;
  cloudFormation: CloudFormationClient;
  dynamo: DynamoDBClient;
  ecr: ECRClient;
  iam: IAMClient;
  lambda: LambdaClient;
  logs: CloudWatchLogsClient;
  s3: S3Client;
  secrets: SecretsManagerClient;
  sqs: SQSClient;
  sts: STSClient;
};
type Runner = ReturnType<typeof createSourceCliRunner>;
type ProbeResponse = {
  status: number;
  body: { variant?: string; access?: Record<string, string>; stpVariables?: string[]; secretSha256?: string } | null;
};

const PREFIX = 'STP_AWS_SCOPED_CANARY_';
const SCRIPT = 'test:real-aws-scoped-access-canary';
const STAGE = 'canary';
const FUNCTION = 'probe';
const CONFIG_PATH = '_test-stacks/scoped-access/stacktape.ts';
/** IAM changes reach a running function within seconds, but AWS documents no bound; this is generous. */
const PROPAGATION_TIMEOUT_MS = 3 * 60 * 1000;

const EXPECTED: Record<Variant, { access: Record<string, string>; stpPrefixes: string[]; extraRoute: number }> = {
  a: {
    access: { tableA: 'allowed', tableB: 'denied', bucketA: 'allowed', bucketB: 'denied', queueA: 'allowed' },
    stpPrefixes: ['STP_TABLE_A_', 'STP_BUCKET_A_', 'STP_QUEUE_A_'],
    extraRoute: 404
  },
  b: {
    access: { tableA: 'denied', tableB: 'allowed', bucketA: 'denied', bucketB: 'allowed', queueA: 'denied' },
    stpPrefixes: ['STP_TABLE_B_', 'STP_BUCKET_B_'],
    extraRoute: 200
  }
};
const TARGET_PREFIXES = ['STP_TABLE_A_', 'STP_TABLE_B_', 'STP_BUCKET_A_', 'STP_BUCKET_B_', 'STP_QUEUE_A_'];

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export const resolveOptions = (env = process.env) =>
  resolveCanaryOptions(env, { prefix: PREFIX, projectPrefix: 'v4scopedcanary-' });

const createClients = ({ profile, region }: CanaryOptions): Clients => {
  const config = { credentials: fromIni({ profile }), region, maxAttempts: 6, ignoreConfiguredEndpointUrls: true };
  return {
    apiGateway: new ApiGatewayV2Client(config),
    cloudFormation: new CloudFormationClient(config),
    dynamo: new DynamoDBClient(config),
    ecr: new ECRClient(config),
    iam: new IAMClient(config),
    lambda: new LambdaClient(config),
    logs: new CloudWatchLogsClient(config),
    s3: new S3Client(config),
    secrets: new SecretsManagerClient(config),
    sqs: new SQSClient(config),
    sts: new STSClient(config)
  };
};

const deploy = (runner: Runner, state: State, variant: Variant, invocationId: string) =>
  runner.runStackCommand('deploy', {
    configPath: CONFIG_PATH,
    stage: STAGE,
    awsAccountName: state.awsAccountName,
    fixture: { [`${PREFIX}VARIANT`]: variant, [`${PREFIX}SECRET_NAME`]: state.secretName },
    invocationId
  });

/** The physical identities the post-deletion check looks for, read from the stack itself. */
const describeOwnedResources = (resources: StackResource[]): OwnedResources => {
  const physical = (...types: string[]) =>
    resources
      .filter(({ ResourceType }) => types.includes(ResourceType ?? ''))
      .flatMap(({ PhysicalResourceId }) => PhysicalResourceId ?? []);
  return {
    deploymentBucket: resources.find(({ LogicalResourceId }) => LogicalResourceId === cfLogicalNames.deploymentBucket())
      ?.PhysicalResourceId,
    buckets: physical('AWS::S3::Bucket'),
    // Stacktape creates DynamoDB tables as single-region global tables.
    tables: physical('AWS::DynamoDB::Table', 'AWS::DynamoDB::GlobalTable'),
    // An SQS queue's physical id is its URL; the name is its last path segment.
    queueNames: physical('AWS::SQS::Queue').map((url) => url.split('/').at(-1)!),
    functionNames: physical('AWS::Lambda::Function'),
    roleNames: physical('AWS::IAM::Role'),
    repositories: physical('AWS::ECR::Repository'),
    apiIds: physical('AWS::ApiGatewayV2::Api'),
    domains: physical('AWS::ApiGatewayV2::DomainName'),
    logGroupNames: physical('AWS::Logs::LogGroup')
  };
};

/** Merges new identities into the state without forgetting ones an earlier deploy recorded. */
const mergeOwned = (state: State, owned: OwnedResources) => {
  const merge = (left: string[] = [], right: string[] = []) => [...new Set([...left, ...right])];
  state.deploymentBucket ??= owned.deploymentBucket;
  for (const key of [
    'buckets',
    'tables',
    'queueNames',
    'functionNames',
    'roleNames',
    'repositories',
    'apiIds',
    'domains',
    'logGroupNames'
  ] as const) {
    state[key] = merge(state[key], owned[key]);
  }
};

const requestApi = async (url: string): Promise<ProbeResponse> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const text = await response.text();
  try {
    return { status: response.status, body: JSON.parse(text) as ProbeResponse['body'] };
  } catch {
    return { status: response.status, body: null };
  }
};

/** Mismatches between a probe response and the variant's expectation; empty when it matches. */
export const probeMismatches = (variant: Variant, secretSha256: string, probe: ProbeResponse) => {
  const expected = EXPECTED[variant];
  const mismatches: string[] = [];
  if (probe.status !== 200 || !probe.body) return [`HTTP ${probe.status}`];
  if (probe.body.variant !== variant) mismatches.push(`variant ${String(probe.body.variant)}`);
  for (const [target, outcome] of Object.entries(expected.access)) {
    const actual = probe.body.access?.[target];
    if (actual !== outcome) mismatches.push(`${target} ${String(actual)} (expected ${outcome})`);
  }
  const variables = probe.body.stpVariables ?? [];
  for (const prefix of TARGET_PREFIXES) {
    const present = variables.some((name) => name.startsWith(prefix));
    if (present !== expected.stpPrefixes.includes(prefix)) {
      mismatches.push(`${prefix}* ${present ? 'present' : 'missing'}`);
    }
  }
  if (probe.body.secretSha256 !== secretSha256) mismatches.push('secret value');
  return mismatches;
};

/**
 * Requests the probe until it matches the variant. A deploy returns once CloudFormation is done; the new function
 * configuration and IAM policy can take a little longer to reach the code that runs.
 */
const awaitProbe = async (apiUrl: string, variant: Variant, secretSha256: string) => {
  const startedAt = Date.now();
  let attempts = 0;
  let last: string[] = [];
  while (Date.now() - startedAt < PROPAGATION_TIMEOUT_MS) {
    attempts += 1;
    const probe = await requestApi(`${apiUrl}/probe`).catch(
      (error: unknown): ProbeResponse => ({ status: 0, body: { variant: String(error) } })
    );
    last = probeMismatches(variant, secretSha256, probe);
    if (last.length === 0) {
      return { attempts, secondsToMatch: Math.round((Date.now() - startedAt) / 1000), body: probe.body };
    }
    await sleep(5000);
  }
  throw new Error(`Variant ${variant} never matched after ${attempts} requests: ${last.join('; ')}.`);
};

/** Deletes the stack with the CLI, then the secret, and checks with AWS that everything this run owns is gone. */
const cleanup = async (clients: Clients, options: CanaryOptions, runner: Runner, stackName: string) => {
  const state = await readState<State>(options, stackName);
  const stack = await describeStack(clients.cloudFormation, stackName);
  const verification: Record<string, unknown> = {};
  if (stack) {
    assertOwned(stack, options.owner, state.stackId);
    mergeOwned(state, describeOwnedResources(await readStackResources(clients.cloudFormation, stackName)));
    await writeState(options, state);
    try {
      const deletion = await runner.runStackCommand('delete', {
        configPath: CONFIG_PATH,
        stage: STAGE,
        awsAccountName: state.awsAccountName,
        fixture: { [`${PREFIX}VARIANT`]: 'b', [`${PREFIX}SECRET_NAME`]: state.secretName },
        invocationId: `scoped-canary-delete-${Date.now()}`
      });
      verification.deletedBy = 'stacktape delete';
      verification.deleteDurationMs = deletion.durationMs;
    } catch (cliError) {
      console.warn(`Stacktape delete failed; deleting the owned stack directly. ${String(cliError).slice(0, 600)}`);
      verification.cliDeleteError = String(cliError).slice(0, 600);
      // CloudFormation cannot delete a non-empty bucket; these exact ones belong to the stack.
      for (const bucket of [state.deploymentBucket, ...(state.buckets ?? [])].filter(Boolean) as string[]) {
        await emptyBucket(clients.s3, bucket).catch((error: unknown) => {
          if (!isMissing(error, ['NoSuchBucket', 'NotFound'])) throw error;
        });
      }
      await clients.cloudFormation.send(new DeleteStackCommand({ StackName: stack.StackId }));
      verification.deletedBy = 'CloudFormation DeleteStack after a failed stacktape delete';
    }
    const waited = await waitUntilStackDeleteComplete(
      { client: clients.cloudFormation, maxWaitTime: 20 * 60, minDelay: 5, maxDelay: 20 },
      { StackName: stack.StackId }
    );
    assert(waited.state === 'SUCCESS', `CloudFormation did not confirm deletion of ${stackName}: ${waited.state}.`);
  }
  assert(!(await describeStack(clients.cloudFormation, stackName)), `${stackName} still exists.`);
  verification.stack = 'absent';

  const checks: [string, string[], (name: string) => Promise<unknown>, string[]][] = [
    [
      'bucket',
      [state.deploymentBucket, ...(state.buckets ?? [])].filter(Boolean) as string[],
      (name) => clients.s3.send(new HeadBucketCommand({ Bucket: name })),
      ['NotFound', 'NoSuchBucket']
    ],
    [
      'table',
      state.tables ?? [],
      (name) => clients.dynamo.send(new DescribeTableCommand({ TableName: name })),
      ['ResourceNotFoundException']
    ],
    [
      'queue',
      state.queueNames ?? [],
      (name) => clients.sqs.send(new GetQueueUrlCommand({ QueueName: name })),
      ['QueueDoesNotExist', 'AWS.SimpleQueueService.NonExistentQueue']
    ],
    [
      'function',
      state.functionNames ?? [],
      (name) => clients.lambda.send(new GetFunctionCommand({ FunctionName: name })),
      ['ResourceNotFoundException']
    ],
    [
      'role',
      state.roleNames ?? [],
      (name) => clients.iam.send(new GetRoleCommand({ RoleName: name })),
      ['NoSuchEntityException', 'NoSuchEntity']
    ],
    [
      'repository',
      state.repositories ?? [],
      (name) => clients.ecr.send(new DescribeRepositoriesCommand({ repositoryNames: [name] })),
      ['RepositoryNotFoundException']
    ],
    [
      'api',
      state.apiIds ?? [],
      (name) => clients.apiGateway.send(new GetApiCommand({ ApiId: name })),
      ['NotFoundException']
    ]
  ];
  const leftovers: string[] = [];
  const absent: Record<string, number> = {};
  for (const [kind, names, describe, missingErrors] of checks) {
    for (const name of new Set(names)) {
      if (!(await gone(() => describe(name), missingErrors))) leftovers.push(`${kind} ${name}`);
    }
    absent[kind] = new Set(names).size;
  }
  assert(leftovers.length === 0, `Stack deletion left owned resources: ${leftovers.join(', ')}.`);
  verification.stackResourcesAbsent = absent;

  verification.logGroups = await deleteLogGroups(clients.logs, [
    ...(state.logGroupNames ?? []),
    ...(state.functionNames ?? []).map((name) => `/aws/lambda/${name}`)
  ]);
  verification.domains = await awaitDomainsReleased(state.domains ?? []);
  verification.secret = await deleteOwnedSecret(clients, options, state);
  await writeState(options, { ...state, cleanupVerifiedAt: new Date().toISOString() });
  return verification;
};

/** Deletes the run's secret without a recovery window, after checking its owner tag, and waits until it is gone. */
const deleteOwnedSecret = async (clients: Clients, options: CanaryOptions, state: State) => {
  const describe = () => clients.secrets.send(new DescribeSecretCommand({ SecretId: state.secretName }));
  let secret: Awaited<ReturnType<typeof describe>>;
  try {
    secret = await describe();
  } catch (error) {
    if (isMissing(error, ['ResourceNotFoundException'])) return 'absent';
    throw error;
  }
  const owner = secret.Tags?.find(({ Key }) => Key === OWNER_TAG)?.Value;
  assert(
    owner === options.owner,
    `Refusing to delete secret ${state.secretName}: its owner tag is ${owner ?? 'missing'}.`
  );
  assert(
    !state.secretArn || state.secretArn === secret.ARN,
    `Refusing to delete secret ${state.secretName}: its ARN changed.`
  );
  await clients.secrets.send(new DeleteSecretCommand({ SecretId: secret.ARN, ForceDeleteWithoutRecovery: true }));
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    if (await gone(describe, ['ResourceNotFoundException'])) return 'absent';
    await sleep(5000);
  }
  throw new Error(`Secret ${state.secretName} still exists two minutes after its deletion.`);
};

const readApiUrl = async (clients: Clients, state: State) => {
  assert(state.apiIds?.length === 1, `Expected one HTTP API in the stack, found ${state.apiIds?.length ?? 0}.`);
  const api = await clients.apiGateway.send(new GetApiCommand({ ApiId: state.apiIds[0] }));
  assert(api.ApiEndpoint, 'The HTTP API has no endpoint.');
  return api.ApiEndpoint;
};

export const runScopedAccessCanary = async ({ cleanupOnly = false }: { cleanupOnly?: boolean } = {}) => {
  const options = resolveOptions();
  const clients = createClients(options);
  const runner = createSourceCliRunner(options, `${PREFIX}OWNER`);
  const stackName = `${options.projectName}-${STAGE}`;
  const report: Record<string, unknown> = {
    kind: 'stacktape-scoped-access-canary',
    startedAt: new Date().toISOString(),
    region: options.region,
    projectName: options.projectName,
    stage: STAGE,
    stackName,
    owner: options.owner
  };
  const writeReport = () =>
    options.reportFile ? writeFile(options.reportFile, `${JSON.stringify(report, null, 2)}\n`) : Promise.resolve();
  let creationAttempted = false;
  let bodyError: unknown;
  let cleanupError: unknown;

  try {
    const identity = await clients.sts.send(new GetCallerIdentityCommand({}));
    assert(
      identity.Account === options.expectedAccountId,
      `AWS credentials resolved to account ${identity.Account}, not the expected ${options.expectedAccountId}.`
    );
    report.accountId = identity.Account;
    if (cleanupOnly) {
      report.cleanup = await cleanup(clients, options, runner, stackName);
      return;
    }
    assert(await hasDevApiKey(), 'apps/cli/.env.local sets no STACKTAPE_API_KEY.');
    const run = options.owner.replace(/[^\w-]/g, '-');
    const awsAccountName = await runner.resolveAwsAccountName(`scoped-canary-whoami-${run}`);
    report.awsAccountName = awsAccountName;
    assert(
      !(await describeStack(clients.cloudFormation, stackName)),
      `Refusing to mutate existing stack ${stackName}.`
    );
    const secretName = `${options.projectName}-secret`;
    assert(
      await gone(
        () => clients.secrets.send(new DescribeSecretCommand({ SecretId: secretName })),
        ['ResourceNotFoundException']
      ),
      `Refusing to reuse existing secret ${secretName}.`
    );
    const state: State = {
      accountId: options.expectedAccountId,
      region: options.region,
      projectName: options.projectName,
      stage: STAGE,
      stackName,
      owner: options.owner,
      awsAccountName,
      secretName
    };
    await writeState(options, state);

    // A rejected preflight above authorizes no cleanup; from here on, cleanup always runs.
    creationAttempted = true;
    // Random test values, not credentials; only their hashes are compared and reported.
    const tokens = { a: randomBytes(16).toString('hex'), b: randomBytes(16).toString('hex') };
    const created = await clients.secrets.send(
      new CreateSecretCommand({
        Name: secretName,
        SecretString: JSON.stringify({ token: tokens.a }),
        Tags: [{ Key: OWNER_TAG, Value: options.owner }]
      })
    );
    state.secretArn = created.ARN;
    await writeState(options, state);

    const first = await deploy(runner, state, 'a', `scoped-canary-1-${run}`);
    const stack = await describeStack(clients.cloudFormation, stackName);
    assert(stack, `${stackName} does not exist after the first deploy.`);
    assertOwned(stack, options.owner);
    state.stackId = stack.StackId;
    const resources = await readStackResources(clients.cloudFormation, stackName);
    mergeOwned(state, describeOwnedResources(resources));
    await writeState(options, state);
    assert(
      resources.some(({ LogicalResourceId }) => LogicalResourceId === cfLogicalNames.lambda(FUNCTION)),
      `The stack has no ${cfLogicalNames.lambda(FUNCTION)} function.`
    );
    report.resources = resources.map(({ LogicalResourceId, ResourceType }) => `${LogicalResourceId} ${ResourceType}`);

    const apiUrl = await readApiUrl(clients, state);
    const variantA = await awaitProbe(apiUrl, 'a', sha256(tokens.a));
    // Customers use the default domain, which a custom resource creates in Stacktape's zone.
    assert(state.domains?.length === 1, `Expected one default domain, found ${state.domains?.length ?? 0}.`);
    const viaDomain = probeMismatches('a', sha256(tokens.a), await requestApi(`https://${state.domains[0]}/probe`));
    assert(viaDomain.length === 0, `The default domain did not serve the probe: ${viaDomain.join('; ')}.`);
    const extraBefore = (await requestApi(`${apiUrl}/extra`)).status;
    report.variantA = {
      deployDurationMs: first.durationMs,
      ...variantA,
      defaultDomain: state.domains[0],
      extraRouteStatus: extraBefore
    };
    await writeReport();
    assert(extraBefore === EXPECTED.a.extraRoute, `/extra answered ${extraBefore} before it was added.`);

    await clients.secrets.send(
      new PutSecretValueCommand({ SecretId: state.secretArn, SecretString: JSON.stringify({ token: tokens.b }) })
    );
    const second = await deploy(runner, state, 'b', `scoped-canary-2-${run}`);
    mergeOwned(state, describeOwnedResources(await readStackResources(clients.cloudFormation, stackName)));
    await writeState(options, state);
    const variantB = await awaitProbe(apiUrl, 'b', sha256(tokens.b));
    const extraAfter = (await requestApi(`${apiUrl}/extra`)).status;
    report.variantB = { deployDurationMs: second.durationMs, ...variantB, extraRouteStatus: extraAfter };
    await writeReport();
    assert(extraAfter === EXPECTED.b.extraRoute, `/extra answered ${extraAfter} after it was added.`);
  } catch (error) {
    bodyError = error;
  } finally {
    if (!cleanupOnly && creationAttempted) {
      try {
        report.cleanup = await cleanup(clients, options, runner, stackName);
      } catch (error) {
        cleanupError = error;
        report.cleanup = { failed: String(error), recoveryCommand: cleanupCommand(options, PREFIX, SCRIPT) };
      }
    }
    await runner.dispose();
    report.finishedAt = new Date().toISOString();
    report.result = bodyError || cleanupError ? 'failed' : 'passed';
    if (bodyError) report.error = String(bodyError);
    await writeReport();
    for (const client of Object.values(clients)) client.destroy();
  }

  if (cleanupError) {
    console.error(
      `Cleanup did not finish. Keep ${options.stateFile} and run:\n${cleanupCommand(options, PREFIX, SCRIPT)}`
    );
  }
  if (bodyError && cleanupError) {
    throw new AggregateError([bodyError, cleanupError], `The canary and its cleanup failed.`);
  }
  if (bodyError) throw bodyError;
  if (cleanupError) throw cleanupError;
  console.info(`Scoped access canary passed for ${stackName}, and its deletion was verified.`);
};

if (import.meta.main) {
  runScopedAccessCanary({ cleanupOnly: process.argv.includes('--cleanup-only') }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
