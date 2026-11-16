/**
 * Real-AWS check that stacks deployed with the released Stacktape 3.7.1 upgrade to the current CLI the way the v3
 * upgrade guide promises. Static baselines compare templates; only a real update shows what CloudFormation replaces,
 * whether the applications keep serving and whether the data in the databases survives.
 *
 * It runs two fixtures from `_test-stacks/v3-upgrade`, shaped like the stacks of Stacktape's paying customers, in
 * parallel:
 * - `agency` (YAML, eu-central-1, stage `production`): a PHP site on EC2 behind a CDN with a firewall and an edge
 *   function, a MySQL database, a Nixpacks site, a DynamoDB table, a scheduled function with an alarm and an
 *   afterDeploy migration. 3.7.1 runs as the released standalone binary.
 * - `saas` (TypeScript, us-east-1, stage `staging`): a container workload with a sidecar behind a load balancer with
 *   custom listeners, a single-page app whose CDN routes to it, functions with alarms that notify a webhook, an Aurora
 *   cluster in raw CloudFormation and an afterDeploy migration against it. 3.7.1 runs from the project's `stacktape`
 *   npm package, as `npx stacktape`. The migrated config adds two batch jobs, which 3.7.1 can no longer create.
 *
 * For each fixture it:
 * 1. deploys `stacktape.v3.*` with 3.7.1 against the dev Stacktape API, then a code-only change (with `--hotSwap` for
 *    `agency`, as its CI does), and checks that it serves;
 * 2. records every resource's physical id, applies the documented migration (the fixture's `stacktape.yml`/`.ts`, and
 *    for `saas` the `stacktape` package built from this checkout) and deploys with the source-built CLI;
 * 3. fails if a stateful resource was replaced or deleted, or if the application stopped serving, lost a database row
 *    an earlier deploy wrote, or a function, batch job or alarm notification stopped working;
 * 4. deploys a code-only change, which must take the fast path;
 * 5. deletes the stack with the current CLI and verifies with AWS that the stack and its secret are gone. Lambda@Edge
 *    replicas that AWS has not released yet are deferred to `--cleanup-only`.
 *
 * The guardrails are those of `source-cli-canary.ts` and docs/testing/live-aws.md. The run writes its timings, the
 * resources the first v4 deploy replaced, deleted and added, and every CLI error to the report.
 *
 *   STP_AWS_V3_UPGRADE_DEPLOY=1 STP_AWS_V3_UPGRADE_EXPECTED_ACCOUNT_ID=<12 digits>
 *   STP_AWS_V3_UPGRADE_PROFILE=<name> STP_AWS_V3_UPGRADE_OWNER=<1-12 lowercase letters or digits>
 *   STP_AWS_V3_UPGRADE_STATE_FILE=<absolute path> [STP_AWS_V3_UPGRADE_REPORT=<absolute path>]
 *   [STP_AWS_V3_UPGRADE_FIXTURES=agency,saas]
 *   pnpm --filter @stacktape/cli run test:real-aws-v3-upgrade [-- --cleanup-only]
 */
import {
  CloudFormationClient,
  ListStackResourcesCommand,
  waitUntilStackDeleteComplete,
  type Output,
  type StackResourceSummary
} from '@aws-sdk/client-cloudformation';
import { CloudWatchClient, SetAlarmStateCommand } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { IAMClient } from '@aws-sdk/client-iam';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { DeleteDBClusterSnapshotCommand, DescribeDBClusterSnapshotsCommand, RDSClient } from '@aws-sdk/client-rds';
import { S3Client } from '@aws-sdk/client-s3';
import {
  CreateSecretCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
  SecretsManagerClient
} from '@aws-sdk/client-secrets-manager';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { randomBytes } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION } from '../../src/config/constants';
import {
  assert,
  type CanaryOptions,
  CLI_DIRECTORY,
  createSourceCliRunner,
  describeStack,
  gone,
  hasDevApiKey,
  isRecord,
  sleep
} from './source-cli-canary';
import { cleanupEdgeFunctions, type EdgeFunction, readEdgeFunctions } from './static-site-canary';

const PREFIX = 'STP_AWS_V3_UPGRADE_';
const SCRIPT = 'test:real-aws-v3-upgrade';
const V3_VERSION = '3.7.1';
const DEV_API = 'https://dev-api.stacktape.com';
const FIXTURE_ROOT = join(CLI_DIRECTORY, '_test-stacks', 'v3-upgrade');
const COMMAND_TIMEOUT_MS = 60 * 60 * 1000;
const OWNER_TAG = 'stacktape-canary-owner';

type FixtureName = 'agency' | 'saas';
type FixtureSpec = {
  region: string;
  stage: string;
  v3Config: string;
  v4Config: string;
  /** The keys of the fixture's JSON secret; each gets a random value that is never written or printed. */
  secretKeys: string[];
  /** 3.7.1 runs from the project's `stacktape` npm package instead of the released binary. */
  npmPackage: boolean;
  /** The file a code-only change edits, and its content for a given mark. */
  codeChange: { file: string; content: (mark: string) => string };
  /** The variables `scripts/marks.mjs` reads, from the stack's database endpoint and the secret. */
  marksEnvironment: (
    secret: Record<string, string>,
    resources: StackResourceSummary[],
    infoMap: InfoMap,
    outputs: Output[]
  ) => Promise<Env>;
};
type Env = Record<string, string | undefined>;
type InfoMap = { resources?: Record<string, { referencableParams?: Record<string, { value?: unknown }> }> };

const FIXTURES: Record<FixtureName, FixtureSpec> = {
  agency: {
    region: 'eu-central-1',
    stage: 'production',
    v3Config: 'stacktape.v3.yml',
    v4Config: 'stacktape.yml',
    secretKeys: ['ORIGIN_VERIFY_KEY', 'db_password'],
    npmPackage: false,
    codeChange: { file: 'site/build-mark.txt', content: (mark) => `${mark}\n` },
    marksEnvironment: async (secret, _resources, infoMap) => ({
      DATABASE_HOST: param(infoMap, 'mainDatabase', 'host'),
      DATABASE_PORT: param(infoMap, 'mainDatabase', 'port'),
      DATABASE_PASSWORD: secret.db_password
    })
  },
  saas: {
    region: 'us-east-1',
    stage: 'staging',
    v3Config: 'stacktape.v3.ts',
    v4Config: 'stacktape.ts',
    secretKeys: ['dbPassword', 'partnerApiKey'],
    npmPackage: true,
    codeChange: { file: 'src/api/build-mark.ts', content: (mark) => `export const BUILD_MARK = '${mark}';\n` },
    marksEnvironment: async (secret, _resources, _infoMap, outputs) => ({
      // The config's `$CfResourceParam` of the cluster endpoint makes the stack output it.
      DATABASE_HOST: outputs.find(({ OutputKey }) => OutputKey?.endsWith('EndpointAddress'))?.OutputValue,
      DATABASE_PASSWORD: secret.dbPassword
    })
  }
};

type Options = {
  expectedAccountId: string;
  profile: string;
  owner: string;
  stateFile: string;
  reportFile?: string;
  fixtures: FixtureName[];
  workDir: string;
};
type FixtureState = {
  projectName: string;
  stackName: string;
  region: string;
  stage: string;
  secretName: string;
  secretCreated?: boolean;
  deployAttempted?: boolean;
  stackId?: string;
  edgeFunctions?: EdgeFunction[];
  pendingEdgeFunctions?: string[];
  cleanupVerifiedAt?: string;
};
type State = {
  accountId: string;
  owner: string;
  awsAccountName?: string;
  fixtures: Partial<Record<FixtureName, FixtureState>>;
};

const param = (infoMap: InfoMap, resource: string, name: string) => {
  const value = infoMap.resources?.[resource]?.referencableParams?.[name]?.value;
  return value === undefined ? undefined : String(value);
};

export const resolveOptions = (env: Env = process.env): Options => {
  assert(env[`${PREFIX}DEPLOY`] === '1', `Refusing to mutate AWS without explicit opt-in. Set ${PREFIX}DEPLOY=1.`);
  assert(
    !Object.keys(env).some((name) => name === 'AWS_ENDPOINT_URL' || name.startsWith('AWS_ENDPOINT_URL_')),
    'Refusing to run while an AWS endpoint override is set.'
  );
  const expectedAccountId = env[`${PREFIX}EXPECTED_ACCOUNT_ID`]?.trim() ?? '';
  assert(/^\d{12}$/.test(expectedAccountId), `${PREFIX}EXPECTED_ACCOUNT_ID must be the exact 12-digit account id.`);
  const profile = env[`${PREFIX}PROFILE`]?.trim() ?? '';
  assert(/^[\w.-]{1,64}$/.test(profile), `${PREFIX}PROFILE must name the exact local AWS profile.`);
  const owner = env[`${PREFIX}OWNER`]?.trim() ?? '';
  assert(/^[a-z0-9]{1,12}$/.test(owner), `${PREFIX}OWNER must be 1-12 lowercase letters or digits, unique per run.`);
  const stateFile = env[`${PREFIX}STATE_FILE`]?.trim() ?? '';
  assert(isAbsolute(stateFile), `${PREFIX}STATE_FILE must be an absolute path.`);
  const reportFile = env[`${PREFIX}REPORT`]?.trim();
  assert(!reportFile || isAbsolute(reportFile), `${PREFIX}REPORT must be an absolute path.`);
  const fixtures = (env[`${PREFIX}FIXTURES`]?.trim() || 'agency,saas').split(',').map((name) => name.trim());
  assert(
    fixtures.length > 0 && fixtures.every((name): name is FixtureName => name in FIXTURES),
    `${PREFIX}FIXTURES must list agency and/or saas.`
  );
  return {
    expectedAccountId,
    profile,
    owner,
    stateFile,
    ...(reportFile && { reportFile }),
    fixtures: fixtures as FixtureName[],
    workDir: join(dirname(stateFile), `v3-upgrade-${owner}`)
  };
};

const fixtureIdentity = (options: Options, name: FixtureName): FixtureState => {
  const { region, stage } = FIXTURES[name];
  const projectName = `v3up-${options.owner}-${name}`;
  return {
    projectName,
    stackName: `${projectName}-${stage}`,
    region,
    stage,
    secretName: `v3up-${options.owner}-${name}`
  };
};

const createClients = (profile: string, region: string) => {
  const config = { credentials: fromIni({ profile }), region, maxAttempts: 6, ignoreConfiguredEndpointUrls: true };
  return {
    cloudFormation: new CloudFormationClient(config),
    cloudWatch: new CloudWatchClient(config),
    logs: new CloudWatchLogsClient(config),
    lambda: new LambdaClient(config),
    secrets: new SecretsManagerClient(config),
    sqs: new SQSClient(config),
    sts: new STSClient(config),
    iam: new IAMClient(config),
    edgeLambda: new LambdaClient({ ...config, region: 'us-east-1' }),
    edgeS3: new S3Client({ ...config, region: 'us-east-1' }),
    edgeLogs: REGIONS_WITH_REGIONAL_CDN_EDGE_LOCATION.map(
      (edgeRegion) => new CloudWatchLogsClient({ ...config, region: edgeRegion })
    )
  };
};
type Clients = ReturnType<typeof createClients>;

/** The edge functions seen so far, each once: a later deploy can add one or keep the same. */
const mergeEdgeFunctions = (known: EdgeFunction[] = [], found: EdgeFunction[]) => [
  ...new Map([...known, ...found].map((edgeFunction) => [edgeFunction.functionName, edgeFunction])).values()
];

const writeJson = (path: string, value: unknown) =>
  writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });

/** Runs a process with a timeout and returns its exit code and output; never throws for a non-zero exit. */
const runProcess = async ({ cmd, cwd, env }: { cmd: string[]; cwd: string; env: Env }) => {
  const startedAt = Date.now();
  const child = Bun.spawn({ cmd, cwd, env, stdout: 'pipe', stderr: 'pipe' });
  const timer = setTimeout(() => child.kill('SIGKILL'), COMMAND_TIMEOUT_MS);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]).finally(() => clearTimeout(timer));
  return { exitCode, stdout, stderr, durationMs: Date.now() - startedAt };
};

/** The single agent-mode result record of a CLI run, if it printed one. */
const agentResult = (stdout: string) =>
  stdout
    .split(/\r?\n/)
    .flatMap((line) => {
      if (!line.trim().startsWith('{')) return [];
      try {
        const value: unknown = JSON.parse(line);
        return isRecord(value) && value.type === 'result' ? [value] : [];
      } catch {
        return [];
      }
    })
    .at(-1);

const devApiKey = async () => {
  const content = await readFile(join(CLI_DIRECTORY, '.env.local'), 'utf8');
  const value = content
    .match(/^\s*STACKTAPE_API_KEY\s*=\s*(.*)$/m)?.[1]
    ?.trim()
    .replace(/^(["'])(.*)\1$/, '$2');
  assert(value, 'apps/cli/.env.local sets no STACKTAPE_API_KEY.');
  return value;
};

/** Downloads and extracts the released 3.7.1 CLI for this platform once per run. */
const ensureV3Release = async (options: Options) => {
  const directory = join(options.workDir, 'v3-release');
  const binary = join(directory, 'stacktape');
  if (await Bun.file(binary).exists()) return binary;
  const asset = { linux: 'linux.tar.gz', darwin: process.arch === 'arm64' ? 'macos-arm.tar.gz' : 'macos.tar.gz' }[
    process.platform as 'linux' | 'darwin'
  ];
  assert(asset, `The ${V3_VERSION} release canary runs on Linux or macOS, not ${process.platform}.`);
  await mkdir(directory, { recursive: true });
  const response = await fetch(`https://github.com/stacktape/stacktape/releases/download/${V3_VERSION}/${asset}`);
  assert(response.ok, `Downloading the ${V3_VERSION} release failed with ${response.status}.`);
  const archive = join(directory, asset);
  await Bun.write(archive, response);
  const extracted = await runProcess({
    cmd: ['tar', '-xzf', archive, '-C', directory],
    cwd: directory,
    env: process.env
  });
  assert(extracted.exitCode === 0, `Extracting the ${V3_VERSION} release failed: ${extracted.stderr.slice(-500)}`);
  await rm(archive);
  return binary;
};

/**
 * Runs 3.7.1 in agent mode against the dev Stacktape API with the profile's credentials only and its own HOME, so no
 * saved v3 defaults (such as a production API key) apply. `CI=true` reproduces how the customers' pipelines run it, except
 * for the npm package: with `CI=true`, 3.7.1 installs the project's dependencies with `npm ci`, which deletes the release
 * its npm launcher extracted into `node_modules/stacktape/bin`, so the deploy fails reading its helper Lambdas. That is
 * a 3.7.1 defect the upgrade does not change, so the npm fixture runs 3.7.1 without it.
 */
const runV3 = async ({
  options,
  name,
  args,
  mark,
  apiKey
}: {
  options: Options;
  name: FixtureName;
  args: string[];
  mark: string;
  apiKey: string;
}) => {
  const projectDirectory = join(options.workDir, name);
  const binary = FIXTURES[name].npmPackage
    ? join(projectDirectory, 'node_modules', '.bin', 'stacktape')
    : await ensureV3Release(options);
  const home = join(options.workDir, 'home-v3');
  await mkdir(home, { recursive: true });
  const env: Env = {
    PATH: process.env.PATH,
    HOME: home,
    LANG: 'C.UTF-8',
    ...(FIXTURES[name].npmPackage ? {} : { CI: 'true' }),
    AWS_PROFILE: options.profile,
    AWS_SDK_LOAD_CONFIG: '1',
    AWS_CONFIG_FILE: process.env.AWS_CONFIG_FILE ?? join(homedir(), '.aws', 'config'),
    AWS_SHARED_CREDENTIALS_FILE: process.env.AWS_SHARED_CREDENTIALS_FILE ?? join(homedir(), '.aws', 'credentials'),
    STACKTAPE_API_KEY: apiKey,
    STP_CUSTOM_TRPC_API_ENDPOINT: DEV_API,
    STP_DISABLE_TELEMETRY: '1',
    DEPLOY_MARK: mark
  };
  const result = await runProcess({ cmd: [binary, ...args, '--agent'], cwd: projectDirectory, env });
  const record = agentResult(result.stdout);
  return {
    ok: result.exitCode === 0 && record?.ok === true,
    code: record?.code,
    message: typeof record?.message === 'string' ? record.message.slice(0, 2000) : result.stderr.slice(-2000),
    durationMs: result.durationMs
  };
};

/** Every resource of the stack. DescribeStackResources returns at most 100, and the saas stack has more. */
const listStackResources = async (clients: Clients, stackName: string) => {
  const resources: StackResourceSummary[] = [];
  let NextToken: string | undefined;
  do {
    const page = await clients.cloudFormation.send(new ListStackResourcesCommand({ StackName: stackName, NextToken }));
    resources.push(...(page.StackResourceSummaries ?? []));
    NextToken = page.NextToken;
  } while (NextToken);
  return resources;
};

const stackInfoMap = async (clients: Clients, stackName: string): Promise<InfoMap> => {
  const stack = await describeStack(clients.cloudFormation, stackName);
  const raw = stack?.Outputs?.find(({ OutputKey }) => OutputKey === 'StpStackInfoMap')?.OutputValue;
  assert(raw, `${stackName} has no StpStackInfoMap output.`);
  return JSON.parse(raw) as InfoMap;
};

const snapshot = async (clients: Clients, stackName: string) =>
  Object.fromEntries(
    (await listStackResources(clients, stackName)).map((resource) => [
      resource.LogicalResourceId!,
      { type: resource.ResourceType!, physicalId: resource.PhysicalResourceId! }
    ])
  );
type Snapshot = Awaited<ReturnType<typeof snapshot>>;

/** Resource types that hold data, or whose replacement drops traffic or a public name. */
const STATEFUL_TYPES = new Set([
  'AWS::RDS::DBInstance',
  'AWS::RDS::DBCluster',
  'AWS::DynamoDB::Table',
  'AWS::S3::Bucket',
  'AWS::SQS::Queue',
  'AWS::EC2::VPC',
  'AWS::ElasticLoadBalancingV2::LoadBalancer',
  'AWS::CloudFront::Distribution',
  'AWS::Batch::ComputeEnvironment',
  'AWS::Logs::LogGroup',
  'AWS::ECR::Repository'
]);

const compareSnapshots = (before: Snapshot, after: Snapshot) => {
  const replaced = Object.entries(before)
    .filter(([id, { physicalId }]) => after[id] && after[id].physicalId !== physicalId)
    .map(([id, { type }]) => `${id} ${type}`);
  const deleted = Object.entries(before)
    .filter(([id]) => !after[id])
    .map(([id, { type }]) => `${id} ${type}`);
  const added = Object.entries(after)
    .filter(([id]) => !before[id])
    .map(([id, { type }]) => `${id} ${type}`);
  const statefulLosses = [...replaced, ...deleted].filter((entry) => STATEFUL_TYPES.has(entry.split(' ')[1]!));
  return {
    replaced,
    deleted,
    added,
    statefulLosses,
    before: Object.keys(before).length,
    after: Object.keys(after).length
  };
};

const fetchText = async (url: string, init?: RequestInit) => {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
    return { status: response.status, body: (await response.text()).slice(0, 2000) };
  } catch (error) {
    return { status: 0, body: String(error).slice(0, 300) };
  }
};

/** Requests a URL until it answers with `expect`, for up to five minutes. */
const awaitResponse = async (url: string, expect: (status: number, body: string) => boolean, init?: RequestInit) => {
  const startedAt = Date.now();
  let last = await fetchText(url, init);
  while (!expect(last.status, last.body) && Date.now() - startedAt < 5 * 60 * 1000) {
    await sleep(5000);
    last = await fetchText(url, init);
  }
  assert(expect(last.status, last.body), `${url} answered ${last.status}: ${last.body.slice(0, 300)}`);
  return last;
};

const invoke = async (clients: Clients, functionName: string, payload: unknown = {}) => {
  const result = await clients.lambda.send(
    new InvokeCommand({ FunctionName: functionName, Payload: Buffer.from(JSON.stringify(payload)) })
  );
  const body = result.Payload ? Buffer.from(result.Payload).toString('utf8') : '';
  assert(!result.FunctionError, `${functionName} failed: ${body.slice(0, 300)}`);
  return body;
};

const physicalIdOf = (resources: StackResourceSummary[], logicalId: string) => {
  const id = resources.find(({ LogicalResourceId }) => LogicalResourceId === logicalId)?.PhysicalResourceId;
  assert(id, `The stack has no ${logicalId}.`);
  return id;
};

/** The rows the afterDeploy migrations wrote, read by the fixture's own script through the database's endpoint. */
const readMarks = async ({
  options,
  name,
  clients,
  stackName,
  secret
}: {
  options: Options;
  name: FixtureName;
  clients: Clients;
  stackName: string;
  secret: Record<string, string>;
}) => {
  const resources = await listStackResources(clients, stackName);
  const outputs = (await describeStack(clients.cloudFormation, stackName))?.Outputs ?? [];
  const env = await FIXTURES[name].marksEnvironment(secret, resources, await stackInfoMap(clients, stackName), outputs);
  const result = await runProcess({
    cmd: ['node', 'scripts/marks.mjs'],
    cwd: join(options.workDir, name),
    env: { PATH: process.env.PATH, ...env }
  });
  assert(result.exitCode === 0, `Reading the database rows failed: ${result.stderr.slice(-500)}`);
  return JSON.parse(result.stdout.trim().split('\n').at(-1)!) as string[];
};

/** Checks that the stack serves and that its functions work; returns what each check saw. */
const probe = async ({
  name,
  clients,
  stackName,
  build
}: {
  name: FixtureName;
  clients: Clients;
  stackName: string;
  build: string;
}) => {
  const infoMap = await stackInfoMap(clients, stackName);
  const resources = await listStackResources(clients, stackName);
  const results: Record<string, unknown> = {};
  if (name === 'agency') {
    const site = param(infoMap, 'webService', 'cdnUrl');
    assert(site, 'webService has no CDN URL.');
    // Only the CDN adds the origin-verify header from the secret, so a JSON answer proves the whole chain.
    const page = await awaitResponse(site, (status, body) => status === 200 && body.includes(`"build":"${build}"`));
    results.site = JSON.parse(page.body);
    const legacy = param(infoMap, 'legacySite', 'url');
    assert(legacy, 'legacySite has no URL.');
    results.legacySite = (
      await awaitResponse(legacy, (status, body) => status === 200 && body.includes('"legacy"'))
    ).body;
    results.flowSync = await invoke(clients, physicalIdOf(resources, 'FlowSyncFunction'), {
      id: `probe-${Date.now()}`
    });
  } else {
    const loadBalancer = param(infoMap, 'mainLoadBalancer', 'url')?.replace(/^https:/, 'http:');
    const app = param(infoMap, 'appUi', 'cdnUrl') ?? param(infoMap, 'appUi', 'url');
    assert(loadBalancer && app, 'The load balancer or the app has no URL.');
    const serves = (status: number, body: string) => status === 200 && body.includes(`"build":"${build}"`);
    results.loadBalancerApi = (await awaitResponse(`${loadBalancer}/graphql`, serves)).body;
    results.cdnApi = (await awaitResponse(`${app}/graphql`, serves)).body;
    results.app = (await awaitResponse(`${app}/`, (status, body) => status === 200 && body.includes('app-ui'))).status;
    for (const fn of [
      'CardPull',
      'WebhookWorker',
      'CodeMinter',
      'TokenRefreshWorker',
      'ReportExporter',
      'InviteSender'
    ]) {
      const body = await invoke(clients, physicalIdOf(resources, `${fn}Function`));
      assert(body.includes('"apiKeyConfigured":true'), `${fn} did not get its secret: ${body}`);
      results[fn] = 'ok';
    }
  }
  return results;
};

/**
 * Sends a message to the jobs queue and waits until the notifier batch job it triggers logs it. The job prints its
 * trigger event, so the message id in its log proves the queue, the trigger function, the state machine and the job.
 */
const runBatchJob = async (clients: Clients, stackName: string) => {
  const resources = await listStackResources(clients, stackName);
  const queue = physicalIdOf(resources, 'JobsQueueQueue');
  const logGroupName = physicalIdOf(resources, 'NotifierJobLogGroup');
  const startedAt = Date.now();
  const { MessageId } = await clients.sqs.send(
    new SendMessageCommand({ QueueUrl: queue, MessageBody: `canary-${startedAt}` })
  );
  assert(MessageId, 'SQS did not accept the jobs queue message.');
  for (;;) {
    const { events = [] } = await clients.logs
      .send(
        new FilterLogEventsCommand({ logGroupName, startTime: startedAt - 60_000, filterPattern: `"${MessageId}"` })
      )
      .catch(() => ({ events: [] }));
    if (events.length) return { secondsToRun: Math.round((Date.now() - startedAt) / 1000) };
    assert(Date.now() - startedAt < 20 * 60 * 1000, 'The notifier batch job did not run within 20 minutes.');
    await sleep(15_000);
  }
};

/** Forces one function's error-rate alarm into ALARM and waits until the webhook sink logs the notification. */
const awaitAlarmNotification = async (clients: Clients, stackName: string) => {
  const resources = await listStackResources(clients, stackName);
  const alarm = resources.find(
    ({ LogicalResourceId, ResourceType }) =>
      ResourceType === 'AWS::CloudWatch::Alarm' && /CardPull/.test(LogicalResourceId ?? '')
  );
  assert(alarm?.PhysicalResourceId, 'The cardPull function has no alarm.');
  const sink = physicalIdOf(resources, 'AlarmSinkFunction');
  const startedAt = Date.now();
  await clients.cloudWatch.send(
    new SetAlarmStateCommand({ AlarmName: alarm.PhysicalResourceId, StateValue: 'OK', StateReason: 'canary reset' })
  );
  await clients.cloudWatch.send(
    new SetAlarmStateCommand({ AlarmName: alarm.PhysicalResourceId, StateValue: 'ALARM', StateReason: 'canary' })
  );
  for (;;) {
    const { events = [] } = await clients.logs
      .send(
        new FilterLogEventsCommand({
          logGroupName: `/aws/lambda/${sink}`,
          startTime: startedAt - 60_000,
          filterPattern: '"ALARM_NOTIFICATION"'
        })
      )
      .catch(() => ({ events: [] }));
    if (events.length) return { secondsToNotify: Math.round((Date.now() - startedAt) / 1000) };
    assert(Date.now() - startedAt < 5 * 60 * 1000, 'The alarm webhook received no notification within 5 minutes.');
    await sleep(10_000);
  }
};

const prepareFixture = async (options: Options, name: FixtureName, secretName: string, runnerIp: string) => {
  const directory = join(options.workDir, name);
  await rm(directory, { recursive: true, force: true });
  await cp(join(FIXTURE_ROOT, name), directory, { recursive: true });
  for (const config of [FIXTURES[name].v3Config, FIXTURES[name].v4Config]) {
    const path = join(directory, config);
    const content = (await readFile(path, 'utf8'))
      .replaceAll('__OWNER__', options.owner)
      .replaceAll('__RUNNER_IP__', runnerIp)
      .replaceAll('__SECRET_NAME__', secretName);
    await writeFile(path, content);
  }
  const install = FIXTURES[name].npmPackage
    ? ['npm', 'install', '--no-audit', '--no-fund', '--save-exact', `stacktape@${V3_VERSION}`]
    : ['npm', 'install', '--no-audit', '--no-fund'];
  const installed = await runProcess({ cmd: install, cwd: directory, env: process.env });
  assert(installed.exitCode === 0, `npm install in ${name} failed: ${installed.stderr.slice(-800)}`);
  return directory;
};

/** The `stacktape` package built from this checkout, packed once per run. */
const buildV4Package = async (options: Options) => {
  const built = await runProcess({ cmd: ['bun', 'run', 'build:npm'], cwd: CLI_DIRECTORY, env: process.env });
  assert(built.exitCode === 0, `Building the npm package failed: ${built.stderr.slice(-800)}`);
  const packed = await runProcess({
    cmd: ['npm', 'pack', '--pack-destination', options.workDir],
    cwd: join(CLI_DIRECTORY, '__release-npm'),
    env: process.env
  });
  assert(packed.exitCode === 0, `Packing the npm package failed: ${packed.stderr.slice(-800)}`);
  return join(options.workDir, packed.stdout.trim().split('\n').at(-1)!);
};

const runFixture = async ({
  options,
  name,
  state,
  persist,
  report,
  apiKey,
  v4Package
}: {
  options: Options;
  name: FixtureName;
  state: State;
  persist: () => Promise<void>;
  report: Record<string, unknown>;
  apiKey: string;
  v4Package: Promise<string>;
}) => {
  const spec = FIXTURES[name];
  const fixture = state.fixtures[name]!;
  const clients = createClients(options.profile, fixture.region);
  const result: Record<string, unknown> = {};
  report[name] = result;
  const run = options.owner;
  const v3Args = (config: string, ...extra: string[]) => [
    'deploy',
    '--stage',
    fixture.stage,
    '--region',
    fixture.region,
    '--projectName',
    fixture.projectName,
    '--configPath',
    config,
    '--awsAccount',
    state.awsAccountName!,
    ...extra
  ];

  assert(!(await describeStack(clients.cloudFormation, fixture.stackName)), `${fixture.stackName} already exists.`);
  assert(
    await gone(
      () => clients.secrets.send(new DescribeSecretCommand({ SecretId: fixture.secretName })),
      ['ResourceNotFoundException']
    ),
    `The secret ${fixture.secretName} already exists.`
  );
  const runnerIp = (await (await fetch('https://checkip.amazonaws.com')).text()).trim();
  assert(/^\d+\.\d+\.\d+\.\d+$/.test(runnerIp), "Could not determine this runner's public IPv4 address.");
  const directory = await prepareFixture(options, name, fixture.secretName, runnerIp);
  const secret = Object.fromEntries(spec.secretKeys.map((key) => [key, randomBytes(18).toString('hex')]));
  fixture.secretCreated = true;
  await persist();
  await clients.secrets.send(
    new CreateSecretCommand({
      Name: fixture.secretName,
      SecretString: JSON.stringify(secret),
      Tags: [{ Key: OWNER_TAG, Value: options.owner }]
    })
  );

  // 1. Two v3 deploys: the stack as 3.7.1 creates it, then a code-only change as the customer's CI deploys one.
  fixture.deployAttempted = true;
  await persist();
  const marks = ['v3-initial', 'v3-code'];
  const v3First = await runV3({ options, name, args: v3Args(spec.v3Config), mark: marks[0]!, apiKey });
  result.v3FirstDeploy = v3First;
  assert(v3First.ok, `The first 3.7.1 deploy failed: ${v3First.code}: ${v3First.message}`);
  const stack = await describeStack(clients.cloudFormation, fixture.stackName);
  assert(
    stack?.Tags?.some(({ Key, Value }) => Key === OWNER_TAG && Value === options.owner),
    'Owner tag missing.'
  );
  fixture.stackId = stack.StackId;
  fixture.edgeFunctions = await readEdgeFunctions(clients, fixture.stackName);
  await persist();
  await writeFile(join(directory, spec.codeChange.file), spec.codeChange.content(marks[1]!));
  const v3Second = await runV3({
    options,
    name,
    args: v3Args(spec.v3Config, ...(name === 'agency' ? ['--hotSwap'] : [])),
    mark: marks[1]!,
    apiKey
  });
  result.v3CodeDeploy = v3Second;
  assert(v3Second.ok, `The 3.7.1 code-only deploy failed: ${v3Second.code}: ${v3Second.message}`);
  result.v3Probe = await probe({ name, clients, stackName: fixture.stackName, build: marks[1]! });
  const v3Marks = await readMarks({ options, name, clients, stackName: fixture.stackName, secret });
  assert(
    marks.every((mark) => v3Marks.includes(mark)),
    `The 3.7.1 afterDeploy migrations did not record ${marks.join(', ')}: ${JSON.stringify(v3Marks)}.`
  );
  const before = await snapshot(clients, fixture.stackName);

  // 2. The documented migration, then the first deploy with the current CLI.
  if (spec.npmPackage) {
    const installed = await runProcess({
      cmd: ['npm', 'install', '--no-audit', '--no-fund', '--save-exact', await v4Package],
      cwd: directory,
      env: process.env
    });
    assert(installed.exitCode === 0, `Installing the v4 package failed: ${installed.stderr.slice(-800)}`);
  }
  const canaryOptions: CanaryOptions = {
    expectedAccountId: options.expectedAccountId,
    profile: options.profile,
    region: fixture.region,
    projectName: fixture.projectName,
    owner: options.owner,
    stateFile: options.stateFile
  };
  const runner = createSourceCliRunner(canaryOptions, `${PREFIX}OWNER`);
  try {
    // The command lines the customers' CI runs, in their v3 spellings: the agency passes `--hotSwap` and lets the
    // profile choose the AWS account, the backend names its account.
    const v4Deploy = (mark: string, invocation: string) =>
      runner.run({
        args: [
          'deploy',
          '--stage',
          fixture.stage,
          '--region',
          fixture.region,
          '--projectName',
          fixture.projectName,
          '--configPath',
          join(directory, spec.v4Config),
          '--profile',
          options.profile,
          ...(name === 'agency' ? ['--hotSwap'] : ['--awsAccount', state.awsAccountName!]),
          '--autoConfirmOperation'
        ],
        fixture: { DEPLOY_MARK: mark },
        invocationId: `v3up-${run}-${name}-${invocation}`
      });
    marks.push('v4-first');
    const first = await v4Deploy('v4-first', 'v4-1');
    const firstOutput = first.records.map((record) => JSON.stringify(record)).join('\n');
    if (name === 'agency') {
      assert(
        firstOutput.includes('--hotSwap') && firstOutput.includes('ignored'),
        'v4 did not report --hotSwap as ignored.'
      );
    }
    const firstResult =
      isRecord(first.result.data) && isRecord(first.result.data.result) ? first.result.data.result : {};
    const changePlan = isRecord(firstResult.changePlan) ? firstResult.changePlan : undefined;
    const deployedAt = Date.now();
    result.v4FirstDeploy = {
      durationMs: first.durationMs,
      changePlanSummary: changePlan?.summary,
      changePlanRisks: changePlan?.risks
    };
    const after = await snapshot(clients, fixture.stackName);
    const changes = compareSnapshots(before, after);
    result.v4FirstDeployChanges = changes;
    await writeJson(options.reportFile ?? `${options.stateFile}.report.json`, report);
    assert(
      changes.statefulLosses.length === 0,
      `The upgrade replaced or deleted: ${changes.statefulLosses.join(', ')}.`
    );
    fixture.edgeFunctions = mergeEdgeFunctions(
      fixture.edgeFunctions,
      await readEdgeFunctions(clients, fixture.stackName)
    );
    await persist();

    // 3. Everything still works, including what only v4 adds and the data the v3 deploys wrote.
    result.v4Probe = await probe({ name, clients, stackName: fixture.stackName, build: marks[1]! });
    const v4Marks = await readMarks({ options, name, clients, stackName: fixture.stackName, secret });
    assert(
      marks.every((mark) => v4Marks.includes(mark)),
      `After the upgrade the database rows are ${JSON.stringify(v4Marks)}, not ${marks.join(', ')}.`
    );
    if (name === 'saas') {
      result.batchJob = await runBatchJob(clients, fixture.stackName);
      // The Console holds the pages of incidents that open during a deploy or within 5 minutes after it.
      await sleep(Math.max(0, deployedAt + 6 * 60 * 1000 - Date.now()));
      result.alarmNotification = await awaitAlarmNotification(clients, fixture.stackName);
    }

    // 4. A code-only change takes the fast path.
    marks.push('v4-code');
    await writeFile(join(directory, spec.codeChange.file), spec.codeChange.content('v4-code'));
    const second = await v4Deploy('v4-code', 'v4-2');
    const records = second.records.map((record) => JSON.stringify(record)).join('\n');
    const fastPath = records.includes('Updating code directly') || records.includes('Fast deployment');
    result.v4CodeDeploy = { durationMs: second.durationMs, fastPath };
    assert(fastPath, 'The code-only v4 deploy did not take the fast path.');
    result.v4CodeProbe = await probe({ name, clients, stackName: fixture.stackName, build: 'v4-code' });
  } finally {
    await runner.dispose();
  }
};

const cleanupFixture = async (options: Options, state: State, name: FixtureName, persist: () => Promise<void>) => {
  const fixture = state.fixtures[name]!;
  const clients = createClients(options.profile, fixture.region);
  const verification: Record<string, unknown> = {};
  const stack = await describeStack(clients.cloudFormation, fixture.stackName);
  if (stack) {
    assert(
      stack.Tags?.some(({ Key, Value }) => Key === OWNER_TAG && Value === options.owner) &&
        (!fixture.stackId || fixture.stackId === stack.StackId),
      `Refusing to delete ${fixture.stackName}: it is not this run's stack.`
    );
    fixture.edgeFunctions = mergeEdgeFunctions(
      fixture.edgeFunctions,
      await readEdgeFunctions(clients, fixture.stackName)
    );
    await persist();
    const runner = createSourceCliRunner(
      {
        expectedAccountId: options.expectedAccountId,
        profile: options.profile,
        region: fixture.region,
        projectName: fixture.projectName,
        owner: options.owner,
        stateFile: options.stateFile
      },
      `${PREFIX}OWNER`
    );
    try {
      // Without a config: the delete then works whatever state the run stopped in, also with the v3 package installed.
      const deletion = await runner.run({
        args: [
          'delete',
          '--projectName',
          fixture.projectName,
          '--stage',
          fixture.stage,
          '--region',
          fixture.region,
          '--profile',
          options.profile,
          '--awsAccount',
          state.awsAccountName!,
          '--autoConfirmOperation'
        ],
        invocationId: `v3up-${options.owner}-${name}-delete`
      });
      verification.deleteDurationMs = deletion.durationMs;
    } finally {
      await runner.dispose();
    }
  }
  // `delete` can return while CloudFormation still removes resources that cost nothing; the run waits for the end.
  const stackId = stack?.StackId ?? fixture.stackId;
  if (stackId) {
    const waited = await waitUntilStackDeleteComplete(
      { client: clients.cloudFormation, maxWaitTime: 40 * 60, minDelay: 10, maxDelay: 30 },
      { StackName: stackId }
    );
    assert(waited.state === 'SUCCESS', `CloudFormation did not finish deleting ${fixture.stackName}: ${waited.state}.`);
  }
  assert(!(await describeStack(clients.cloudFormation, fixture.stackName)), `${fixture.stackName} still exists.`);
  verification.stack = 'absent';
  if (fixture.secretCreated) {
    await clients.secrets
      .send(new DeleteSecretCommand({ SecretId: fixture.secretName, ForceDeleteWithoutRecovery: true }))
      .catch((error: unknown) => {
        if (!(error instanceof Error && error.name === 'ResourceNotFoundException')) throw error;
      });
    verification.secret = 'deleted';
  }
  // CloudFormation keeps a final snapshot of a raw `AWS::RDS::DBCluster` without a DeletionPolicy, named after the stack.
  const rds = new RDSClient({ credentials: fromIni({ profile: options.profile }), region: fixture.region });
  const { DBClusterSnapshots = [] } = await rds.send(new DescribeDBClusterSnapshotsCommand({ SnapshotType: 'manual' }));
  const snapshots = DBClusterSnapshots.flatMap(({ DBClusterSnapshotIdentifier: id }) =>
    id?.startsWith(`${fixture.stackName}-snapshot-`) ? [id] : []
  );
  for (const id of snapshots) {
    await rds.send(new DeleteDBClusterSnapshotCommand({ DBClusterSnapshotIdentifier: id }));
  }
  verification.clusterSnapshotsDeleted = snapshots;
  // The CLI deploys created a Console project, which only the CLI can delete once its stages are gone.
  const runner = createSourceCliRunner(
    {
      expectedAccountId: options.expectedAccountId,
      profile: options.profile,
      region: fixture.region,
      projectName: fixture.projectName,
      owner: options.owner,
      stateFile: options.stateFile
    },
    `${PREFIX}OWNER`
  );
  try {
    await runner.run({
      args: ['project', 'delete', fixture.projectName, '--yes'],
      invocationId: `v3up-${options.owner}-${name}-project-delete`
    });
    verification.consoleProject = 'deleted';
  } catch (error) {
    if (!/not found|does not exist/i.test(String(error))) throw error;
    verification.consoleProject = 'absent';
  } finally {
    await runner.dispose();
  }
  const edge = await cleanupEdgeFunctions(clients, fixture.edgeFunctions ?? [], []);
  fixture.pendingEdgeFunctions = edge.pendingFunctions;
  verification.edgeLeftByStack = edge.leftByStack;
  verification.pendingEdgeFunctions = edge.pendingFunctions;
  if (!edge.pendingFunctions.length) fixture.cleanupVerifiedAt = new Date().toISOString();
  await persist();
  return verification;
};

const cleanupCommand = (options: Options) =>
  [
    `${PREFIX}DEPLOY=1`,
    `${PREFIX}EXPECTED_ACCOUNT_ID=${options.expectedAccountId}`,
    `${PREFIX}PROFILE=${options.profile}`,
    `${PREFIX}OWNER=${options.owner}`,
    `${PREFIX}STATE_FILE=${options.stateFile}`,
    `${PREFIX}FIXTURES=${options.fixtures.join(',')}`,
    `pnpm --filter @stacktape/cli run ${SCRIPT} -- --cleanup-only`
  ].join(' ');

export const runV3UpgradeCanary = async ({ cleanupOnly = false }: { cleanupOnly?: boolean } = {}) => {
  const options = resolveOptions();
  const sts = createClients(options.profile, 'us-east-1').sts;
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  assert(
    identity.Account === options.expectedAccountId,
    `AWS credentials resolved to account ${identity.Account}, not the expected ${options.expectedAccountId}.`
  );
  await mkdir(options.workDir, { recursive: true, mode: 0o700 });
  // A resumed cleanup adds to the report of the run it finishes instead of replacing it.
  const earlierReport =
    cleanupOnly && options.reportFile
      ? await readFile(options.reportFile, 'utf8').then(
          (text) => JSON.parse(text) as Record<string, unknown>,
          () => ({})
        )
      : {};
  const report: Record<string, unknown> = {
    kind: 'stacktape-v3-upgrade-canary',
    ...earlierReport,
    [cleanupOnly ? 'cleanupStartedAt' : 'startedAt']: new Date().toISOString()
  };
  let state: State;
  if (cleanupOnly) {
    state = JSON.parse(await readFile(options.stateFile, 'utf8')) as State;
    assert(
      state.accountId === options.expectedAccountId && state.owner === options.owner,
      'The state file belongs to another run.'
    );
  } else {
    assert(await hasDevApiKey(), 'apps/cli/.env.local sets no STACKTAPE_API_KEY.');
    state = {
      accountId: options.expectedAccountId,
      owner: options.owner,
      fixtures: Object.fromEntries(options.fixtures.map((name) => [name, fixtureIdentity(options, name)]))
    };
  }
  const persist = () => writeJson(options.stateFile, state);
  const writeReport = () => (options.reportFile ? writeJson(options.reportFile, report) : Promise.resolve());

  let bodyError: unknown;
  const cleanupErrors: unknown[] = [];
  try {
    if (!cleanupOnly) {
      // The Stacktape connection 3.7.1 and the current CLI deploy through: the single active one to the account.
      const probeOptions: CanaryOptions = {
        expectedAccountId: options.expectedAccountId,
        profile: options.profile,
        region: 'us-east-1',
        projectName: `v3up-${options.owner}`,
        owner: options.owner,
        stateFile: options.stateFile
      };
      const whoami = createSourceCliRunner(probeOptions, `${PREFIX}OWNER`);
      state.awsAccountName = await whoami
        .resolveAwsAccountName(`v3up-${options.owner}-whoami`)
        .finally(() => whoami.dispose());
      await persist();
      const apiKey = await devApiKey();
      const v4Package = options.fixtures.some((name) => FIXTURES[name].npmPackage)
        ? buildV4Package(options)
        : Promise.resolve('');
      const outcomes = await Promise.allSettled(
        options.fixtures.map((name) => runFixture({ options, name, state, persist, report, apiKey, v4Package }))
      );
      const failures = outcomes.flatMap((outcome, index) =>
        outcome.status === 'rejected' ? [`${options.fixtures[index]}: ${String(outcome.reason).slice(0, 1500)}`] : []
      );
      if (failures.length) throw new Error(failures.join('\n'));
    }
  } catch (error) {
    bodyError = error;
    report.error = String(error).slice(0, 4000);
  } finally {
    await writeReport().catch(() => undefined);
    for (const name of Object.keys(state.fixtures) as FixtureName[]) {
      if (!state.fixtures[name]?.secretCreated && !state.fixtures[name]?.deployAttempted && !cleanupOnly) continue;
      try {
        report[`${name}Cleanup`] = await cleanupFixture(options, state, name, persist);
      } catch (error) {
        cleanupErrors.push(error);
        report[`${name}CleanupError`] = String(error).slice(0, 2000);
      }
    }
    report.finishedAt = new Date().toISOString();
    await writeReport().catch(() => undefined);
  }
  const pending = Object.values(state.fixtures).flatMap((fixture) => fixture?.pendingEdgeFunctions ?? []);
  if (cleanupErrors.length || pending.length) {
    console.error(
      `${cleanupErrors.length ? 'Cleanup did not finish' : `AWS still holds edge replicas of ${pending.join(', ')}`}. ` +
        `Keep ${options.stateFile} and run later:\n${cleanupCommand(options)}`
    );
  }
  if (bodyError) throw bodyError;
  if (cleanupErrors.length) throw new Error(`Cleanup failed: ${cleanupErrors.map(String).join('\n')}`);
  if (!cleanupOnly) await rm(options.workDir, { recursive: true, force: true });
};

if (import.meta.main) {
  runV3UpgradeCanary({ cleanupOnly: process.argv.includes('--cleanup-only') }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
