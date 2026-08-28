import {
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStacksCommand,
  waitUntilStackDeleteComplete,
  type Stack
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, DeleteLogGroupCommand } from '@aws-sdk/client-cloudwatch-logs';
import { GetFunctionConfigurationCommand, GetFunctionUrlConfigCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { fromEnv, fromIni } from '@aws-sdk/credential-providers';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { randomBytes } from 'node:crypto';
import { access, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import stripAnsi from 'strip-ansi';
import { catalogIdentity } from '../../_test-stacks/packaging-smoke/src/status-catalog';
import { assertPackagingStages, parseCliJsonl } from '../verify-source-cli-aws-readonly';

const OPT_IN = 'STP_AWS_CANARY_DEPLOY';
const DISPOSABLE_CONFIRMATION = 'STP_AWS_CANARY_CONFIRM_DISPOSABLE';
const EXPECTED_ACCOUNT_ID = 'STP_AWS_CANARY_EXPECTED_ACCOUNT_ID';
const CREDENTIAL_MODE = 'STP_AWS_CANARY_CREDENTIAL_MODE';
const AWS_PROFILE = 'STP_AWS_CANARY_PROFILE';
const PROJECT_NAME = 'STP_AWS_CANARY_PROJECT_NAME';
const REGION = 'STP_AWS_CANARY_REGION';
const CLI_PATH = 'STP_AWS_CANARY_CLI_PATH';
const EXPECTED_CLI_VERSION = 'STP_AWS_CANARY_EXPECTED_CLI_VERSION';
const OWNER = 'STP_AWS_CANARY_OWNER';
const STATE_FILE = 'STP_AWS_CANARY_STATE_FILE';
const DISPOSABLE_CONFIRMATION_VALUE = 'this-is-a-disposable-test-account';
const fixtureConfigPath = '_test-stacks/packaging-smoke/stacktape.ts';
const cliDirectory = join(import.meta.dir, '..', '..');
const stage = 'dev';
const workloads = ['catalogReport', 'retryAdvisor'] as const;
const commandTimeoutMs = 45 * 60 * 1000;
const deletionTimeoutSeconds = 20 * 60;
const terminationGraceMs = 5_000;
const canaryOwnerTagName = 'stacktape-canary-owner';

type Environment = Record<string, string | undefined>;
type CredentialSelection = { mode: 'profile'; profile: string } | { mode: 'environment' };
type CliSelection = { mode: 'source' } | { mode: 'binary'; path: string; expectedVersion: string };

export type CanaryOptions = {
  credentials: CredentialSelection;
  cli: CliSelection;
  expectedAccountId: string;
  owner: string;
  projectName: string;
  region: string;
  stateFile?: string;
};

type CanaryStateFile = {
  accountId: string;
  owner: string;
  stackName: string;
  stackId?: string;
};

type FunctionSnapshot = {
  arn: string;
  codeSha256: string;
  lastModified: string;
  revisionId: string;
  url: string;
  layerArn: string;
  canaryRevision: string;
};

type AwsSnapshot = {
  stackId: string;
  lastUpdatedTime: string | null;
  functions: Record<(typeof workloads)[number], FunctionSnapshot>;
};

type AwsClients = {
  cloudFormation: CloudFormationClient;
  lambda: LambdaClient;
  logs: CloudWatchLogsClient;
  sts: STSClient;
};

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const defaultProjectName = () => `v4canary-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;

const assertSafeProjectName = (projectName: string) => {
  assert(projectName.length <= 40, `${PROJECT_NAME} must not exceed 40 characters.`);
  assert(
    /^v4canary-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(projectName),
    `${PROJECT_NAME} must start with v4canary- and contain only lowercase letters, numbers, and internal dashes.`
  );
};

const hasAwsEndpointOverride = (env: Environment) =>
  Object.keys(env).some((name) => name === 'AWS_ENDPOINT_URL' || name.startsWith('AWS_ENDPOINT_URL_'));

export const resolveCanaryOptions = ({
  env = process.env,
  makeProjectName = defaultProjectName
}: {
  /** Retained for callers that simulate a host platform; canaries are supported on every CLI platform. */
  platform?: NodeJS.Platform;
  env?: Environment;
  makeProjectName?: () => string;
} = {}): CanaryOptions => {
  assert(env[OPT_IN] === '1', `Refusing to mutate AWS without explicit opt-in. Set ${OPT_IN}=1.`);
  assert(
    env[DISPOSABLE_CONFIRMATION] === DISPOSABLE_CONFIRMATION_VALUE,
    `${DISPOSABLE_CONFIRMATION} must equal ${DISPOSABLE_CONFIRMATION_VALUE}.`
  );
  assert(!hasAwsEndpointOverride(env), 'Refusing real-AWS canary execution while an AWS endpoint override is set.');
  assert(
    typeof env.STACKTAPE_API_KEY === 'string' && env.STACKTAPE_API_KEY.length > 0,
    'STACKTAPE_API_KEY is required for the deployment canary.'
  );

  const expectedAccountId = env[EXPECTED_ACCOUNT_ID]?.trim();
  assert(
    expectedAccountId && /^\d{12}$/.test(expectedAccountId),
    `${EXPECTED_ACCOUNT_ID} must be the exact 12-digit disposable account id.`
  );

  const credentialMode = env[CREDENTIAL_MODE];
  assert(
    credentialMode === 'profile' || credentialMode === 'environment',
    `${CREDENTIAL_MODE} must be explicitly set to profile or environment.`
  );
  let credentials: CredentialSelection;
  if (credentialMode === 'profile') {
    const profile = env[AWS_PROFILE]?.trim();
    assert(profile, `${AWS_PROFILE} must name the exact local AWS profile to use.`);
    assert(
      ![...profile].some((character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return codePoint < 32 || codePoint === 127;
      }),
      `${AWS_PROFILE} must not contain control characters.`
    );
    credentials = { mode: 'profile', profile };
  } else {
    assert(
      env.GITHUB_ACTIONS === 'true' && typeof env.ACTIONS_ID_TOKEN_REQUEST_URL === 'string',
      'Environment credential mode is restricted to GitHub Actions OIDC jobs.'
    );
    assert(
      env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY,
      'GitHub OIDC did not provide AWS environment credentials.'
    );
    credentials = { mode: 'environment' };
  }

  const projectName = env[PROJECT_NAME]?.trim() || makeProjectName();
  assertSafeProjectName(projectName);
  const owner = env[OWNER]?.trim();
  assert(owner && /^[a-zA-Z0-9._:-]{1,128}$/.test(owner), `${OWNER} must identify this exact canary run.`);
  const region = env[REGION]?.trim() || 'eu-west-1';
  assert(/^[a-z]{2}(?:-[a-z0-9]+)+-\d+$/.test(region), `${REGION} must be an explicit AWS region.`);

  const cliPath = env[CLI_PATH]?.trim();
  let cli: CliSelection = { mode: 'source' };
  if (cliPath) {
    assert(isAbsolute(cliPath), `${CLI_PATH} must be an absolute path.`);
    const expectedVersion = env[EXPECTED_CLI_VERSION]?.trim();
    assert(expectedVersion, `${EXPECTED_CLI_VERSION} is required when ${CLI_PATH} is set.`);
    cli = { mode: 'binary', path: cliPath, expectedVersion };
  }

  const stateFile = env[STATE_FILE]?.trim();
  assert(!stateFile || isAbsolute(stateFile), `${STATE_FILE} must be an absolute path when set.`);
  return { credentials, cli, expectedAccountId, owner, projectName, region, ...(stateFile ? { stateFile } : {}) };
};

export const buildCanaryEnvironment = ({
  options,
  revision,
  invocationId,
  inheritedEnvironment = process.env
}: {
  options: CanaryOptions;
  revision: string;
  invocationId: string;
  inheritedEnvironment?: Environment;
}): Environment => {
  const env: Environment = {
    ...inheritedEnvironment,
    AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'true',
    AWS_SDK_LOAD_CONFIG: '1',
    SKIP_LOADING_ENV: '1',
    STP_AWS_CANARY_OWNER: options.owner,
    STP_AWS_CANARY_REVISION: revision,
    STP_DISABLE_TELEMETRY: '1',
    STP_INVOCATION_ID: invocationId
  };
  for (const name of Object.keys(env)) {
    if (name === 'AWS_ENDPOINT_URL' || name.startsWith('AWS_ENDPOINT_URL_')) delete env[name];
  }

  if (options.credentials.mode === 'profile') {
    env.AWS_PROFILE = options.credentials.profile;
    env.AWS_DEFAULT_PROFILE = options.credentials.profile;
    for (const name of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_SECURITY_TOKEN']) {
      delete env[name];
    }
  } else {
    delete env.AWS_PROFILE;
    delete env.AWS_DEFAULT_PROFILE;
    env.AWS_EC2_METADATA_DISABLED = 'true';
  }
  return env;
};

const credentialProvider = (selection: CredentialSelection): AwsCredentialIdentityProvider =>
  selection.mode === 'profile' ? fromIni({ profile: selection.profile }) : fromEnv();

const createAwsClients = (options: CanaryOptions): AwsClients => {
  const credentials = credentialProvider(options.credentials);
  const clientConfig = { credentials, maxAttempts: 6, region: options.region };
  return {
    cloudFormation: new CloudFormationClient(clientConfig),
    lambda: new LambdaClient(clientConfig),
    logs: new CloudWatchLogsClient(clientConfig),
    sts: new STSClient(clientConfig)
  };
};

const outputTail = (value: string) => value.trim().slice(-4_000);
let activeChild: ReturnType<typeof Bun.spawn> | undefined;

const terminateActiveChild = (force = false) => {
  if (!activeChild) return;
  if (process.platform === 'win32') {
    const killer = Bun.spawn({
      cmd: ['taskkill.exe', '/pid', String(activeChild.pid), '/t', ...(force ? ['/f'] : [])],
      stdout: 'ignore',
      stderr: 'ignore',
      windowsHide: true
    });
    void killer.exited;
    return;
  }
  try {
    process.kill(-activeChild.pid, force ? 'SIGKILL' : 'SIGTERM');
  } catch {
    try {
      activeChild.kill(force ? 'SIGKILL' : 'SIGTERM');
    } catch {}
  }
};

const cliPrefix = (options: CanaryOptions) =>
  options.cli.mode === 'binary' ? [options.cli.path] : [process.execPath, 'run', 'dev'];

const runCliProcessOutput = async ({
  options,
  args,
  env,
  parseJsonl
}: {
  options: CanaryOptions;
  args: string[];
  env: Environment;
  parseJsonl: boolean;
}) => {
  const child = Bun.spawn({
    cmd: [...cliPrefix(options), ...args],
    cwd: cliDirectory,
    detached: process.platform !== 'win32',
    env,
    stdout: 'pipe',
    stderr: 'pipe'
  });
  activeChild = child;
  const stdoutPromise = new Response(child.stdout).text();
  const stderrPromise = new Response(child.stderr).text();
  let timedOut = false;
  let forceKillTimer: ReturnType<typeof setTimeout> | undefined;
  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    terminateActiveChild();
    forceKillTimer = setTimeout(() => {
      try {
        terminateActiveChild(true);
      } catch {}
    }, terminationGraceMs);
  }, commandTimeoutMs);

  const [exitCode, stdout, stderr] = await Promise.all([child.exited, stdoutPromise, stderrPromise]).finally(() => {
    clearTimeout(timeoutTimer);
    if (forceKillTimer) clearTimeout(forceKillTimer);
    if (activeChild === child) activeChild = undefined;
  });
  assert(!timedOut, `Stacktape ${args[0]} exceeded ${commandTimeoutMs / 60_000} minutes.`);
  if (!parseJsonl) {
    assert(exitCode === 0, `Stacktape ${args.join(' ')} exited with ${exitCode}: ${outputTail(stderr)}`);
    return { stdout, stderr };
  }

  let parsed: ReturnType<typeof parseCliJsonl>;
  try {
    parsed = parseCliJsonl(stdout, args[0]);
  } catch (error) {
    throw new Error(`Could not verify Stacktape ${args[0]} output.\nStderr:\n${outputTail(stderr)}`, { cause: error });
  }
  assert(
    exitCode === 0 && parsed.result.ok,
    `Stacktape ${args[0]} failed with ${exitCode}: ${parsed.result.code}: ${parsed.result.message}\n${outputTail(stderr)}`
  );
  return parsed;
};

const runCliProcess = async (params: { options: CanaryOptions; args: string[]; env: Environment }) => {
  const result = await runCliProcessOutput({ ...params, parseJsonl: true });
  assert('events' in result, 'Stacktape command did not return JSONL events.');
  return result;
};

const runPlainCliProcess = async (params: { options: CanaryOptions; args: string[]; env: Environment }) => {
  const result = await runCliProcessOutput({ ...params, parseJsonl: false });
  assert('stdout' in result, 'Plain Stacktape command unexpectedly returned JSONL events.');
  return result;
};

const commonCliArgs = (options: CanaryOptions) => [
  '--configPath',
  fixtureConfigPath,
  '--projectName',
  options.projectName,
  '--stage',
  stage,
  '--region',
  options.region,
  ...(options.credentials.mode === 'profile' ? ['--profile', options.credentials.profile] : []),
  '--agent'
];

const verifyCliBinary = async (options: CanaryOptions, env: Environment) => {
  if (options.cli.mode !== 'binary') return;
  await access(options.cli.path, constants.X_OK);
  const { stdout } = await runPlainCliProcess({ options, args: ['--version'], env });
  assertCliVersionOutput(stdout, options.cli.expectedVersion);
};

export const assertCliVersionOutput = (output: string, expectedVersion: string) => {
  const actual = stripAnsi(output).trim();
  assert(
    actual === `Stacktape version: ${expectedVersion}.`,
    `Canary binary reported ${actual || '<empty>'}, expected Stacktape version: ${expectedVersion}.`
  );
};

const isMissingStackError = (error: unknown) =>
  error instanceof Error && error.name === 'ValidationError' && /does not exist/i.test(error.message);

const describeStack = async (client: CloudFormationClient, stackName: string): Promise<Stack | undefined> => {
  try {
    const response = await client.send(new DescribeStacksCommand({ StackName: stackName }));
    return response.Stacks?.[0];
  } catch (error) {
    if (isMissingStackError(error)) return undefined;
    throw error;
  }
};

export const assertOwnedStack = (stack: Pick<Stack, 'Tags'>, options: Pick<CanaryOptions, 'owner' | 'projectName'>) => {
  const actualOwner = stack.Tags?.find((tag) => tag.Key === canaryOwnerTagName)?.Value;
  assert(
    actualOwner === options.owner,
    `Refusing to mutate ${options.projectName}-${stage}: owner tag is ${actualOwner || '<missing>'}, expected ${options.owner}.`
  );
};

const verifyIdentity = async (clients: AwsClients, options: CanaryOptions) => {
  const identity = await clients.sts.send(new GetCallerIdentityCommand({}));
  assert(identity.Account, 'STS did not return an AWS account id.');
  assert(
    identity.Account === options.expectedAccountId,
    `AWS credentials resolved to account ${identity.Account}, not explicitly allowed account ${options.expectedAccountId}.`
  );
};

const functionName = (options: CanaryOptions, workload: (typeof workloads)[number]) =>
  `${options.projectName}-${stage}-${workload}`;

const requiredString = (value: string | undefined, label: string) => {
  assert(value, `${label} is missing.`);
  return value;
};

const getFunctionSnapshot = async (
  client: LambdaClient,
  options: CanaryOptions,
  workload: (typeof workloads)[number]
): Promise<FunctionSnapshot> => {
  const name = functionName(options, workload);
  const [configuration, urlConfig] = await Promise.all([
    client.send(new GetFunctionConfigurationCommand({ FunctionName: name })),
    client.send(new GetFunctionUrlConfigCommand({ FunctionName: name }))
  ]);
  assert(configuration.Layers?.length === 1, `${name} must use exactly one Lambda layer.`);
  return {
    arn: requiredString(configuration.FunctionArn, `${name} ARN`),
    codeSha256: requiredString(configuration.CodeSha256, `${name} code hash`),
    lastModified: requiredString(configuration.LastModified, `${name} last-modified value`),
    revisionId: requiredString(configuration.RevisionId, `${name} revision id`),
    url: requiredString(urlConfig.FunctionUrl, `${name} function URL`),
    layerArn: requiredString(configuration.Layers[0].Arn, `${name} layer ARN`),
    canaryRevision: requiredString(configuration.Environment?.Variables?.CANARY_REVISION, `${name} canary revision`)
  };
};

const getAwsSnapshot = async (clients: AwsClients, options: CanaryOptions): Promise<AwsSnapshot> => {
  const stackName = `${options.projectName}-${stage}`;
  const stack = await describeStack(clients.cloudFormation, stackName);
  assert(stack, `AWS stack ${stackName} does not exist after deploy.`);
  const [catalogReport, retryAdvisor] = await Promise.all(
    workloads.map((workload) => getFunctionSnapshot(clients.lambda, options, workload))
  );
  assert(
    catalogReport.layerArn === retryAdvisor.layerArn,
    `Canary functions use different Lambda layer versions: ${catalogReport.layerArn} and ${retryAdvisor.layerArn}.`
  );
  return {
    stackId: requiredString(stack.StackId, `${stackName} stack id`),
    lastUpdatedTime: stack.LastUpdatedTime?.toISOString() ?? null,
    functions: { catalogReport, retryAdvisor }
  };
};

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const assertFunctionUrl = (value: string, region: string) => {
  const parsed = new URL(value);
  const escapedRegion = region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert(parsed.protocol === 'https:', `Canary function URL must use HTTPS: ${value}`);
  assert(
    new RegExp(`^[a-z0-9]+\\.lambda-url\\.${escapedRegion}\\.on\\.aws$`).test(parsed.hostname),
    `Refusing to call unexpected canary URL host ${parsed.hostname}.`
  );
};

const fetchJsonWithRetry = async (
  url: string,
  region: string,
  expectedRevision: string
): Promise<Record<string, unknown>> => {
  assertFunctionUrl(url, region);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
      assert(response.status === 200, `Function URL returned HTTP ${response.status}.`);
      const payload: unknown = await response.json();
      assert(isRecord(payload), 'Function URL returned a non-object JSON payload.');
      assert(
        payload.revision === expectedRevision,
        `Function URL returned stale revision ${String(payload.revision)}.`
      );
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < 12) await sleep(Math.min(1_000 * 2 ** (attempt - 1), 8_000));
    }
  }
  throw new Error(`Function URL did not become healthy: ${url}`, { cause: lastError });
};

const assertDataPlane = async (snapshot: AwsSnapshot, options: CanaryOptions, expectedRevision: string) => {
  const advisorUrl = new URL(snapshot.functions.retryAdvisor.url);
  advisorUrl.searchParams.set('status', '503');
  const [advisor, report] = await Promise.all([
    fetchJsonWithRetry(advisorUrl.toString(), options.region, expectedRevision),
    fetchJsonWithRetry(snapshot.functions.catalogReport.url, options.region, expectedRevision)
  ]);
  const expectedCatalog = catalogIdentity();
  assert(advisor.handler === 'retryAdvisor', 'retryAdvisor URL returned the wrong handler payload.');
  assert(report.handler === 'catalogReport', 'catalogReport URL returned the wrong handler payload.');
  assert(advisor.revision === expectedRevision, `retryAdvisor returned revision ${String(advisor.revision)}.`);
  assert(report.revision === expectedRevision, `catalogReport returned revision ${String(report.revision)}.`);
  assert(JSON.stringify(advisor.catalog) === JSON.stringify(expectedCatalog), 'retryAdvisor catalog identity drifted.');
  assert(JSON.stringify(report.catalog) === JSON.stringify(expectedCatalog), 'catalogReport catalog identity drifted.');
  assert(advisor.advice === 'retry-with-backoff', 'retryAdvisor did not exercise the expected 503 behavior.');
  assert(
    isRecord(advisor.status) && advisor.status.code === 503,
    'retryAdvisor did not return the 503 catalog record.'
  );
  assert(isRecord(report.countsByClass), 'catalogReport did not return countsByClass.');
  assert(Array.isArray(report.retryableCodes), 'catalogReport did not return retryableCodes.');
};

const waitForRevision = async (
  clients: AwsClients,
  options: CanaryOptions,
  expectedRevision: string
): Promise<AwsSnapshot> => {
  let lastSnapshot: AwsSnapshot | undefined;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 18; attempt += 1) {
    try {
      lastSnapshot = await getAwsSnapshot(clients, options);
      lastError = undefined;
      if (workloads.every((workload) => lastSnapshot?.functions[workload].canaryRevision === expectedRevision)) {
        return lastSnapshot;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(Math.min(1_000 * attempt, 5_000));
  }
  throw new Error(
    `Lambda configuration did not converge to revision ${expectedRevision}; last snapshot: ${JSON.stringify(lastSnapshot)}`,
    { cause: lastError }
  );
};

export const assertNoOpSnapshot = (before: AwsSnapshot, after: AwsSnapshot) => {
  assert(
    JSON.stringify(after) === JSON.stringify(before),
    'An unchanged redeploy changed the AWS resource fingerprint.'
  );
};

export const assertUpdatedSnapshot = (before: AwsSnapshot, after: AwsSnapshot, expectedRevision: string) => {
  assert(after.stackId === before.stackId, 'Config-only update replaced the CloudFormation stack.');
  assert(after.lastUpdatedTime !== before.lastUpdatedTime, 'Config-only update did not update CloudFormation.');
  for (const workload of workloads) {
    const previousFunction = before.functions[workload];
    const updatedFunction = after.functions[workload];
    assert(updatedFunction.arn === previousFunction.arn, `${workload} ARN changed during a config-only update.`);
    assert(
      updatedFunction.codeSha256 === previousFunction.codeSha256,
      `${workload} code changed during a config-only update.`
    );
    assert(
      updatedFunction.layerArn === previousFunction.layerArn,
      `${workload} layer changed during a config-only update.`
    );
    assert(
      updatedFunction.url === previousFunction.url,
      `${workload} function URL changed during a config-only update.`
    );
    assert(updatedFunction.canaryRevision === expectedRevision, `${workload} did not receive the updated revision.`);
  }
};

const assertCliReportedNoUpdate = (events: ReturnType<typeof parseCliJsonl>['events']) => {
  const updateEvent = events.find(
    (event) =>
      event.type === 'event' &&
      event.eventType === 'UPDATE_STACK' &&
      event.status === 'completed' &&
      event.message === 'No updates needed.'
  );
  assert(updateEvent, 'The unchanged redeploy did not report a CloudFormation no-op.');
};

const writeCanaryState = async (options: CanaryOptions, state: CanaryStateFile) => {
  if (!options.stateFile) return;
  await writeFile(options.stateFile, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
};

const readCanaryState = async (options: CanaryOptions): Promise<CanaryStateFile | undefined> => {
  if (!options.stateFile) return undefined;
  try {
    const parsed: unknown = JSON.parse(await readFile(options.stateFile, 'utf8'));
    assert(isRecord(parsed), 'Canary state file is not an object.');
    assert(parsed.accountId === options.expectedAccountId, 'Canary state file belongs to another AWS account.');
    assert(parsed.owner === options.owner, 'Canary state file belongs to another canary run.');
    assert(parsed.stackName === `${options.projectName}-${stage}`, 'Canary state file belongs to another stack.');
    assert(
      parsed.stackId === undefined || typeof parsed.stackId === 'string',
      'Canary state file has an invalid stack id.'
    );
    return parsed as CanaryStateFile;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
};

const removeAutomaticLogGroups = async (clients: AwsClients, options: CanaryOptions) => {
  await Promise.all(
    workloads.map(async (workload) => {
      try {
        await clients.logs.send(
          new DeleteLogGroupCommand({ logGroupName: `/aws/lambda/${functionName(options, workload)}` })
        );
      } catch (error) {
        if (!(error instanceof Error && error.name === 'ResourceNotFoundException')) throw error;
      }
    })
  );
};

const waitForStackAbsence = async (client: CloudFormationClient, stackName: string) => {
  const result = await waitUntilStackDeleteComplete(
    { client, maxWaitTime: deletionTimeoutSeconds, minDelay: 5, maxDelay: 20 },
    { StackName: stackName }
  );
  assert(result.state === 'SUCCESS', `CloudFormation did not confirm deletion of ${stackName}: ${result.state}`);
  assert(!(await describeStack(client, stackName)), `CloudFormation stack ${stackName} still exists after deletion.`);
};

const directDeleteStack = async (clients: AwsClients, options: CanaryOptions, recordedState?: CanaryStateFile) => {
  const stackName = `${options.projectName}-${stage}`;
  assert(/^v4canary-[a-z0-9-]+-dev$/.test(stackName), `Refusing direct deletion of unexpected stack ${stackName}.`);
  const stack = await describeStack(clients.cloudFormation, stackName);
  if (!stack) return;
  assertOwnedStack(stack, options);
  if (recordedState?.stackId) {
    assert(stack.StackId === recordedState.stackId, `Refusing to delete ${stackName}: its stack id changed.`);
  }
  await clients.cloudFormation.send(new DeleteStackCommand({ StackName: stackName }));
  await waitForStackAbsence(clients.cloudFormation, stackName);
};

const cleanup = async (clients: AwsClients, options: CanaryOptions, env: Environment) => {
  const stackName = `${options.projectName}-${stage}`;
  const existing = await describeStack(clients.cloudFormation, stackName);
  if (!existing) {
    await removeAutomaticLogGroups(clients, options);
    return;
  }
  assertOwnedStack(existing, options);
  const recordedState = await readCanaryState(options);
  if (recordedState?.stackId) {
    assert(existing.StackId === recordedState.stackId, `Refusing to clean up ${stackName}: its stack id changed.`);
  }

  try {
    await runCliProcess({ options, args: ['delete', ...commonCliArgs(options)], env });
    await waitForStackAbsence(clients.cloudFormation, stackName);
  } catch (cliError) {
    try {
      await directDeleteStack(clients, options, recordedState);
    } catch (fallbackError) {
      throw new AggregateError(
        [cliError, fallbackError],
        `Both Stacktape and CloudFormation cleanup failed for ${stackName}.`
      );
    }
    console.warn(`Stacktape cleanup failed for ${stackName}; direct CloudFormation deletion succeeded.`);
  }
  await removeAutomaticLogGroups(clients, options);
};

const closeClients = (clients: AwsClients) => {
  clients.cloudFormation.destroy();
  clients.lambda.destroy();
  clients.logs.destroy();
  clients.sts.destroy();
};

export const runPackagingCanary = async ({ cleanupOnly = false }: { cleanupOnly?: boolean } = {}) => {
  const options = resolveCanaryOptions();
  const clients = createAwsClients(options);
  const stackName = `${options.projectName}-${stage}`;
  const invocationId = `aws-canary-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
  const initialRevision = `initial-${invocationId}`;
  const updatedRevision = `updated-${invocationId}`;
  const initialEnv = buildCanaryEnvironment({ options, revision: initialRevision, invocationId });
  let bodyError: unknown;
  let cleanupError: unknown;
  let interruptedSignal: NodeJS.Signals | undefined;
  const handleSignal = (signal: NodeJS.Signals) => {
    interruptedSignal ??= signal;
    terminateActiveChild();
  };
  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  try {
    await verifyIdentity(clients, options);
    if (cleanupOnly) {
      await cleanup(clients, options, initialEnv);
      console.info(`Cleanup verified for ${stackName}.`);
      return;
    }

    assert(
      !(await describeStack(clients.cloudFormation, stackName)),
      `Refusing to mutate existing stack ${stackName}.`
    );
    await writeCanaryState(options, { accountId: options.expectedAccountId, owner: options.owner, stackName });
    await verifyCliBinary(options, initialEnv);

    const initialDeploy = await runCliProcess({
      options,
      args: ['deploy', ...commonCliArgs(options)],
      env: initialEnv
    });
    assertPackagingStages(initialDeploy.events);
    const initialSnapshot = await waitForRevision(clients, options, initialRevision);
    await writeCanaryState(options, {
      accountId: options.expectedAccountId,
      owner: options.owner,
      stackName,
      stackId: initialSnapshot.stackId
    });
    await assertDataPlane(initialSnapshot, options, initialRevision);

    const noOpDeploy = await runCliProcess({ options, args: ['deploy', ...commonCliArgs(options)], env: initialEnv });
    assertCliReportedNoUpdate(noOpDeploy.events);
    const noOpSnapshot = await getAwsSnapshot(clients, options);
    assertNoOpSnapshot(initialSnapshot, noOpSnapshot);
    await assertDataPlane(noOpSnapshot, options, initialRevision);

    const updatedEnv = buildCanaryEnvironment({ options, revision: updatedRevision, invocationId });
    await runCliProcess({ options, args: ['deploy', ...commonCliArgs(options)], env: updatedEnv });
    const updatedSnapshot = await waitForRevision(clients, options, updatedRevision);
    assertUpdatedSnapshot(initialSnapshot, updatedSnapshot, updatedRevision);
    await assertDataPlane(updatedSnapshot, options, updatedRevision);

    if (interruptedSignal) throw new Error(`Canary interrupted by ${interruptedSignal}.`);
    console.info(`Verified deploy, live invocation, no-op, update, and cleanup readiness for ${stackName}.`);
  } catch (error) {
    bodyError = error;
  } finally {
    if (!cleanupOnly) {
      try {
        await cleanup(clients, options, initialEnv);
      } catch (error) {
        cleanupError = error;
      }
    }
    await rm(join(cliDirectory, '.stacktape', invocationId), { recursive: true, force: true });
    process.off('SIGINT', handleSignal);
    process.off('SIGTERM', handleSignal);
    closeClients(clients);
  }

  if (bodyError && cleanupError) {
    throw new AggregateError([bodyError, cleanupError], `Canary failed and cleanup also failed for ${stackName}.`);
  }
  if (bodyError) throw bodyError;
  if (cleanupError) throw cleanupError;
  console.info(`Real-AWS packaging canary passed and ${stackName} was deleted.`);
};

if (import.meta.main) {
  runPackagingCanary({ cleanupOnly: process.argv.includes('--cleanup-only') }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
