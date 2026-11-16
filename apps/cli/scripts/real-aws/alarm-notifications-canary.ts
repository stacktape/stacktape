/**
 * Real-AWS check that a config alarm's inline notification channels are delivered from the customer's account and
 * that the alarm report to the Stacktape Console carries no channel credentials. Emulators cannot show this: it needs
 * real CloudWatch alarm state changes, EventBridge, the deployed service Lambda's IAM role, S3 conditional writes and
 * Secrets Manager.
 *
 * It creates one owned secret, deploys `_test-stacks/alarm-notifications` through the source-built CLI
 * (`pnpm dev:cli`, which reads the Stacktape API key from `apps/cli/.env.local` in dev mode), then:
 * 1. points the stack's service Lambda at the fixture's receiver as its Console API, so the report is captured
 *    instead of reaching the dev Console;
 * 2. makes the `faulty` function fail, waits for its error-rate alarm to fire and then to recover on its own, and
 *    requires the Teams, Discord and webhook channels to receive one firing and one recovery message each (the webhook
 *    signed with the `$Secret` value and carrying its header), and the Console report of both events to carry no
 *    channel and none of the run's credentials;
 * 3. replays the firing event to the service Lambda exactly as EventBridge built it, and requires no channel to receive
 *    it again;
 * 4. deletes the stack with the CLI and the secret, and confirms with AWS that everything this run owned is gone.
 *
 * Guardrails (docs/testing.md, "Live AWS"): an explicit opt-in; STS must resolve the credentials to the explicitly
 * expected account, and the CLI deploys through the single active Stacktape connection to that same account; a new
 * `v4alarmcanary-` project and secret carrying the run's owner tag; recovery state written before the first creation;
 * cleanup in `finally` after success or failure, verified with AWS; one exact `--cleanup-only` command when cleanup does
 * not finish. The API key, credentials and the run's channel values never appear in commands, logs or the report.
 *
 *   STP_AWS_ALARM_CANARY_DEPLOY=1 STP_AWS_ALARM_CANARY_EXPECTED_ACCOUNT_ID=<12 digits>
 *   STP_AWS_ALARM_CANARY_PROFILE=<name> STP_AWS_ALARM_CANARY_OWNER=<run id>
 *   STP_AWS_ALARM_CANARY_STATE_FILE=<absolute path> [STP_AWS_ALARM_CANARY_REPORT=<absolute path>]
 *   [STP_AWS_ALARM_CANARY_PROJECT_NAME=v4alarmcanary-…] [STP_AWS_ALARM_CANARY_REGION=eu-west-1]
 *   pnpm --filter @stacktape/cli run test:real-aws-alarm-notifications-canary [-- --cleanup-only]
 */
import {
  CloudFormationClient,
  DeleteStackCommand,
  waitUntilStackDeleteComplete,
  type StackResource
} from '@aws-sdk/client-cloudformation';
import { CloudWatchClient, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { EventBridgeClient, ListTargetsByRuleCommand } from '@aws-sdk/client-eventbridge';
import { GetRoleCommand, IAMClient } from '@aws-sdk/client-iam';
import {
  GetFunctionCommand,
  GetFunctionConfigurationCommand,
  GetFunctionUrlConfigCommand,
  InvokeCommand,
  LambdaClient,
  UpdateFunctionConfigurationCommand,
  waitUntilFunctionUpdatedV2
} from '@aws-sdk/client-lambda';
import { GetObjectCommand, HeadBucketCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import {
  CreateSecretCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
  SecretsManagerClient
} from '@aws-sdk/client-secrets-manager';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { createHmac, randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { ALARM_DELIVERY_MARKER_PREFIX } from '../../src/config/constants';
import {
  assert,
  assertOwned,
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

type OwnedResources = {
  buckets?: string[];
  functionNames?: string[];
  roleNames?: string[];
  logGroupNames?: string[];
};
type State = BaseState &
  OwnedResources & {
    secretName: string;
    secretArn?: string;
    /** Random per run, so the fixture can be deleted with the values it was deployed with. */
    channelKeys: ChannelKeys;
    deploymentBucket?: string;
  };
type ChannelKeys = { teams: string; discord: string; webhook: string; header: string };
type Clients = {
  cloudFormation: CloudFormationClient;
  cloudWatch: CloudWatchClient;
  eventBridge: EventBridgeClient;
  iam: IAMClient;
  lambda: LambdaClient;
  logs: CloudWatchLogsClient;
  s3: S3Client;
  secrets: SecretsManagerClient;
  sts: STSClient;
};
type Runner = ReturnType<typeof createSourceCliRunner>;
type ReceivedRequest = {
  key: string;
  path: string;
  headers: Record<string, unknown>;
  body: string;
};

const PREFIX = 'STP_AWS_ALARM_CANARY_';
const SCRIPT = 'test:real-aws-alarm-notifications-canary';
const STAGE = 'canary';
const CONFIG_PATH = '_test-stacks/alarm-notifications/stacktape.ts';
/** CloudWatch publishes Lambda metrics within a minute and evaluates the alarm every minute; this is generous. */
const ALARM_TIMEOUT_MS = 10 * 60 * 1000;

export const resolveOptions = (env = process.env) =>
  resolveCanaryOptions(env, { prefix: PREFIX, projectPrefix: 'v4alarmcanary-' });

const createClients = ({ profile, region }: CanaryOptions): Clients => {
  const config = { credentials: fromIni({ profile }), region, maxAttempts: 6, ignoreConfiguredEndpointUrls: true };
  return {
    cloudFormation: new CloudFormationClient(config),
    cloudWatch: new CloudWatchClient(config),
    eventBridge: new EventBridgeClient(config),
    iam: new IAMClient(config),
    lambda: new LambdaClient(config),
    logs: new CloudWatchLogsClient(config),
    s3: new S3Client(config),
    secrets: new SecretsManagerClient(config),
    sts: new STSClient(config)
  };
};

const fixtureEnvironment = (state: State) => ({
  [`${PREFIX}SECRET_NAME`]: state.secretName,
  [`${PREFIX}TEAMS_KEY`]: state.channelKeys.teams,
  [`${PREFIX}DISCORD_KEY`]: state.channelKeys.discord,
  [`${PREFIX}WEBHOOK_KEY`]: state.channelKeys.webhook,
  [`${PREFIX}HEADER_VALUE`]: state.channelKeys.header
});

const describeOwnedResources = (resources: StackResource[]): OwnedResources => {
  const physical = (...types: string[]) =>
    resources
      .filter(({ ResourceType }) => types.includes(ResourceType ?? ''))
      .flatMap(({ PhysicalResourceId }) => PhysicalResourceId ?? []);
  return {
    buckets: physical('AWS::S3::Bucket'),
    functionNames: physical('AWS::Lambda::Function'),
    roleNames: physical('AWS::IAM::Role'),
    logGroupNames: physical('AWS::Logs::LogGroup')
  };
};

const mergeOwned = (state: State, owned: OwnedResources) => {
  const merge = (left: string[] = [], right: string[] = []) => [...new Set([...left, ...right])];
  for (const key of ['buckets', 'functionNames', 'roleNames', 'logGroupNames'] as const) {
    state[key] = merge(state[key], owned[key]);
  }
};

const physicalId = (resources: StackResource[], logicalId: string) => {
  const id = resources.find(({ LogicalResourceId }) => LogicalResourceId === logicalId)?.PhysicalResourceId;
  assert(id, `The stack has no ${logicalId}.`);
  return id;
};

const waitFor = async <T>(description: string, timeoutMs: number, check: () => Promise<T | undefined>) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await check();
    if (value !== undefined) return { value, seconds: Math.round((Date.now() - startedAt) / 1000) };
    await sleep(10_000);
  }
  throw new Error(`Timed out after ${Math.round(timeoutMs / 1000)} s waiting for ${description}.`);
};

const createRequestReader = (s3: S3Client, bucket: string) => {
  const seen = new Map<string, ReceivedRequest>();
  return async () => {
    let token: string | undefined;
    do {
      const page = await s3.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: 'requests/', ContinuationToken: token })
      );
      for (const { Key } of page.Contents ?? []) {
        if (!Key || seen.has(Key)) continue;
        const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key }));
        const stored = JSON.parse(await object.Body!.transformToString()) as Omit<ReceivedRequest, 'key'>;
        seen.set(Key, { key: Key, ...stored, body: stored.body ?? '' });
      }
      token = page.NextContinuationToken;
    } while (token);
    return [...seen.values()].sort((left, right) => left.key.localeCompare(right.key));
  };
};

/** The alarm state a provider request announces, read from what each provider format carries. */
const announcedState = (request: ReceivedRequest): 'triggered' | 'resolved' | undefined => {
  const text = request.body;
  if (/" triggered/u.test(text)) return 'triggered';
  if (/" resolved/u.test(text)) return 'resolved';
  return undefined;
};

const channelOf = (request: ReceivedRequest) =>
  request.path.startsWith('/teams/')
    ? 'teams'
    : request.path.startsWith('/discord/')
      ? 'discord'
      : request.path.startsWith('/webhook/')
        ? 'webhook'
        : request.path.endsWith('/reportAlarmEvent')
          ? 'console'
          : // Error tracking reports the faulty function's thrown errors through the same service Lambda.
            request.path.endsWith('/reportIssueEvent')
            ? 'issue'
            : 'other';

const consoleReportsOf = (requests: ReceivedRequest[]) =>
  requests
    .filter((request) => channelOf(request) === 'console')
    .map((request) => ({
      request,
      input: (JSON.parse(request.body) as Record<string, Record<string, unknown>>)['0']!
    }));

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
        fixture: fixtureEnvironment(state),
        invocationId: `alarm-canary-delete-${Date.now()}`
      });
      verification.deletedBy = 'stacktape delete';
      verification.deleteDurationMs = deletion.durationMs;
    } catch (cliError) {
      console.warn(`Stacktape delete failed; deleting the owned stack directly. ${String(cliError).slice(0, 600)}`);
      verification.cliDeleteError = String(cliError).slice(0, 600);
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
  verification.secret = await deleteOwnedSecret(clients, options, state);
  await writeState(options, { ...state, cleanupVerifiedAt: new Date().toISOString() });
  return verification;
};

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

/** Fills an EventBridge input template's `<name>` placeholders the way EventBridge does for string values. */
export const fillInputTemplate = (template: string, values: Record<string, string>) =>
  template.replace(/<(\w+)>/gu, (placeholder, name: string) =>
    name in values ? JSON.stringify(values[name]).slice(1, -1) : placeholder
  );

export const runAlarmNotificationsCanary = async ({ cleanupOnly = false }: { cleanupOnly?: boolean } = {}) => {
  const options = resolveOptions();
  const clients = createClients(options);
  const runner = createSourceCliRunner(options, `${PREFIX}OWNER`);
  const stackName = `${options.projectName}-${STAGE}`;
  const report: Record<string, unknown> = {
    kind: 'stacktape-alarm-notifications-canary',
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
    const awsAccountName = await runner.resolveAwsAccountName(`alarm-canary-whoami-${run}`);
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
    const random = () => randomBytes(12).toString('hex');
    const state: State = {
      accountId: options.expectedAccountId,
      region: options.region,
      projectName: options.projectName,
      stage: STAGE,
      stackName,
      owner: options.owner,
      awsAccountName,
      secretName,
      channelKeys: { teams: random(), discord: random(), webhook: random(), header: random() }
    };
    await writeState(options, state);

    // A rejected preflight above authorizes no cleanup; from here on, cleanup always runs.
    creationAttempted = true;
    const signingSecret = random();
    const created = await clients.secrets.send(
      new CreateSecretCommand({
        Name: secretName,
        SecretString: JSON.stringify({ signing: signingSecret }),
        Tags: [{ Key: OWNER_TAG, Value: options.owner }]
      })
    );
    state.secretArn = created.ARN;
    await writeState(options, state);

    const deployed = await runner.runStackCommand('deploy', {
      configPath: CONFIG_PATH,
      stage: STAGE,
      awsAccountName,
      fixture: fixtureEnvironment(state),
      invocationId: `alarm-canary-deploy-${run}`
    });
    const stack = await describeStack(clients.cloudFormation, stackName);
    assert(stack, `${stackName} does not exist after the deploy.`);
    assertOwned(stack, options.owner);
    state.stackId = stack.StackId;
    const resources = await readStackResources(clients.cloudFormation, stackName);
    mergeOwned(state, describeOwnedResources(resources));
    await writeState(options, state);
    report.deployDurationMs = deployed.durationMs;

    const serviceLambda = physicalId(resources, cfLogicalNames.lambda('stacktapeServiceLambda', true));
    const receiver = physicalId(resources, cfLogicalNames.lambda('receiver'));
    const faulty = physicalId(resources, cfLogicalNames.lambda('faulty'));
    const requestsBucket = physicalId(resources, cfLogicalNames.bucket('requests'));
    const alarmName = resources.find(
      ({ ResourceType }) => ResourceType === 'AWS::CloudWatch::Alarm'
    )?.PhysicalResourceId;
    const ruleName = resources.find(
      ({ ResourceType, PhysicalResourceId }) =>
        ResourceType === 'AWS::Events::Rule' && PhysicalResourceId?.includes('alarm')
    )?.PhysicalResourceId;
    assert(alarmName && ruleName, 'The stack has no alarm or no alarm notification rule.');

    const serviceConfiguration = await clients.lambda.send(
      new GetFunctionConfigurationCommand({ FunctionName: serviceLambda })
    );
    const variables = serviceConfiguration.Environment?.Variables ?? {};
    const stackHash = variables.GLOBALLY_UNIQUE_STACK_HASH;
    assert(stackHash, 'The service Lambda has no GLOBALLY_UNIQUE_STACK_HASH.');
    state.deploymentBucket = awsResourceNames.deploymentBucket(stackHash);
    await writeState(options, state);

    // The receiver plays the Console API, so the report the Console would get is captured here.
    const receiverUrl = (await clients.lambda.send(new GetFunctionUrlConfigCommand({ FunctionName: receiver })))
      .FunctionUrl;
    assert(receiverUrl, 'The receiver has no function URL.');
    await clients.lambda.send(
      new UpdateFunctionConfigurationCommand({
        FunctionName: serviceLambda,
        Environment: { Variables: { ...variables, STACKTAPE_TRPC_API_ENDPOINT: `${receiverUrl}console` } }
      })
    );
    await waitUntilFunctionUpdatedV2({ client: clients.lambda, maxWaitTime: 120 }, { FunctionName: serviceLambda });
    const readRequests = createRequestReader(clients.s3, requestsBucket);

    // A new alarm first evaluates to OK. That is not a recovery, so no channel may hear about it.
    const firstState = await waitFor('the alarm to finish its first evaluation', ALARM_TIMEOUT_MS, async () => {
      const { MetricAlarms } = await clients.cloudWatch.send(new DescribeAlarmsCommand({ AlarmNames: [alarmName] }));
      const value = MetricAlarms?.[0]?.StateValue;
      return value && value !== 'INSUFFICIENT_DATA' ? value : undefined;
    });
    report.firstEvaluation = firstState;

    for (let invocation = 0; invocation < 5; invocation += 1) {
      const result = await clients.lambda.send(
        new InvokeCommand({ FunctionName: faulty, Payload: Buffer.from(JSON.stringify({ fail: true })) })
      );
      assert(result.FunctionError, 'The faulty function did not fail when asked to.');
    }
    const firedAt = Date.now();

    const expectedChannels = ['teams', 'discord', 'webhook'] as const;
    const delivered = (requests: ReceivedRequest[], state: 'triggered' | 'resolved') =>
      expectedChannels.every((channel) =>
        requests.some((request) => channelOf(request) === channel && announcedState(request) === state)
      ) &&
      consoleReportsOf(requests).some(
        ({ input }) => input.type === (state === 'triggered' ? 'ALARM_TRIGGERED' : 'ALARM_RESOLVED')
      );
    const firing = await waitFor('the firing notifications', ALARM_TIMEOUT_MS, async () => {
      const requests = await readRequests();
      return delivered(requests, 'triggered') ? requests : undefined;
    });
    report.firingSecondsAfterErrors = Math.round((Date.now() - firedAt) / 1000);
    // `notBreaching` missing data: the minute after the errors has none, so the alarm recovers by itself.
    const recovery = await waitFor('the recovery notifications', ALARM_TIMEOUT_MS, async () => {
      const requests = await readRequests();
      return delivered(requests, 'resolved') ? requests : undefined;
    });
    report.recoverySecondsAfterFiring = recovery.seconds;

    // Replay the firing event to the service Lambda exactly as EventBridge built it: no channel may hear it twice.
    const webhookFiring = firing.value.find(
      (request) => channelOf(request) === 'webhook' && announcedState(request) === 'triggered'
    )!;
    const firingBody = JSON.parse(webhookFiring.body) as {
      id: string;
      details: { time: string; description: string; alarmName: string };
    };
    const { Targets } = await clients.eventBridge.send(new ListTargetsByRuleCommand({ Rule: ruleName }));
    const template = Targets?.[0]?.InputTransformer?.InputTemplate;
    assert(template, `The rule ${ruleName} has no input template.`);
    const replayed = await clients.lambda.send(
      new InvokeCommand({
        FunctionName: serviceLambda,
        Payload: Buffer.from(
          fillInputTemplate(template, {
            sourceEventId: firingBody.id,
            alarmName,
            description: firingBody.details.description,
            time: firingBody.details.time,
            stateValue: 'ALARM',
            previousStateValue: 'OK'
          })
        )
      })
    );
    assert(!replayed.FunctionError, `The replayed alarm event failed: ${replayed.FunctionError}.`);
    await sleep(15_000);
    const requests = await readRequests();

    // Exactly one firing and one recovery per channel, including after the replay.
    const counts: Record<string, Record<string, number>> = {};
    for (const request of requests) {
      const channel = channelOf(request);
      const announced =
        channel === 'console' || channel === 'issue' ? 'report' : (announcedState(request) ?? 'unknown');
      counts[channel] = { ...counts[channel], [announced]: (counts[channel]?.[announced] ?? 0) + 1 };
    }
    report.requestCounts = counts;
    await writeReport();
    for (const channel of expectedChannels) {
      assert(
        counts[channel]?.triggered === 1 &&
          counts[channel]?.resolved === 1 &&
          Object.keys(counts[channel]!).length === 2,
        `${channel} did not receive exactly one firing and one recovery: ${JSON.stringify(counts[channel])}.`
      );
    }
    // The function URL is public, so the internet can reach it too. Anything signed or carrying the stack's AWS identity
    // came from the service Lambda, and must be one of the requests above.
    const strays = requests.filter((request) => channelOf(request) === 'other');
    report.strayRequests = strays.map((request) => ({
      path: request.path.slice(0, 40),
      signed: Boolean(request.headers['x-stacktape-signature']),
      awsIdentity: request.headers['has-aws-identity'] === true
    }));
    assert(
      strays.every(
        (request) => !request.headers['x-stacktape-signature'] && request.headers['has-aws-identity'] !== true
      ),
      `The service Lambda sent an unexpected request: ${JSON.stringify(report.strayRequests)}.`
    );

    // The webhook is signed with the `$Secret` value the service Lambda read in the account, and carries its header.
    for (const request of requests.filter((candidate) => channelOf(candidate) === 'webhook')) {
      assert(
        request.headers['x-stacktape-signature'] ===
          createHmac('sha256', signingSecret).update(request.body).digest('hex'),
        'A webhook request is not signed with the secret value.'
      );
      assert(request.headers['x-canary-key'] === state.channelKeys.header, 'A webhook request lacks its header.');
    }

    // The Console reports: both events, signed with the stack's AWS identity, with no channel and no credential.
    const reports = consoleReportsOf(requests);
    const credentials = [
      signingSecret,
      state.channelKeys.teams,
      state.channelKeys.discord,
      state.channelKeys.webhook,
      state.channelKeys.header,
      'secretsmanager',
      'stp-sec'
    ];
    for (const { request, input } of reports) {
      assert(request.headers['has-aws-identity'] === true, 'A Console report has no AWS identity header.');
      assert(Array.isArray(input.channels) && input.channels.length === 0, 'A Console report names channels.');
      const leaked = credentials.filter((credential) => request.body.includes(credential));
      assert(leaked.length === 0, `A Console report carries ${leaked.length} channel credential(s).`);
    }
    for (const request of requests.filter((candidate) => channelOf(candidate) === 'issue')) {
      const leaked = credentials.filter((credential) => request.body.includes(credential));
      assert(leaked.length === 0, `An issue report carries ${leaked.length} channel credential(s).`);
    }
    const reportTypes = reports.map(({ input }) => input.type);
    assert(
      reportTypes.filter((type) => type === 'ALARM_TRIGGERED').length >= 2 && reportTypes.includes('ALARM_RESOLVED'),
      `The Console reports were ${JSON.stringify(reportTypes)}.`
    );
    report.consoleReports = reports.map(({ input }) => ({
      type: input.type,
      channels: input.channels,
      fields: Object.keys(input).sort(),
      detailFields: Object.keys((input.details as object) ?? {}).sort()
    }));

    // The service Lambda's delivery markers: one "sent" per channel and event, and no credential in them.
    const markers = await clients.s3.send(
      new ListObjectsV2Command({ Bucket: state.deploymentBucket, Prefix: ALARM_DELIVERY_MARKER_PREFIX })
    );
    const markerBodies = await Promise.all(
      (markers.Contents ?? []).map(async ({ Key }) =>
        (await clients.s3.send(new GetObjectCommand({ Bucket: state.deploymentBucket, Key }))).Body!.transformToString()
      )
    );
    report.deliveryMarkers = markerBodies.length;
    assert(markerBodies.length === 6, `Expected 6 delivery markers, found ${markerBodies.length}.`);
    assert(
      markerBodies.every(
        (body) => JSON.parse(body).status === 'sent' && !credentials.some((value) => body.includes(value))
      ),
      'A delivery marker is not "sent" or carries a credential.'
    );
    await writeReport();
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
    throw new AggregateError([bodyError, cleanupError], 'The canary and its cleanup failed.');
  }
  if (bodyError) throw bodyError;
  if (cleanupError) throw cleanupError;
  console.info(`Alarm notifications canary passed for ${stackName}, and its deletion was verified.`);
};

if (import.meta.main) {
  runAlarmNotificationsCanary({ cleanupOnly: process.argv.includes('--cleanup-only') }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
