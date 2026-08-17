import {
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  waitUntilStackDeleteComplete,
  type Stack
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, DeleteLogGroupCommand, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import {
  DeleteSecretCommand,
  DescribeSecretCommand,
  SecretsManagerClient,
  type DescribeSecretCommandOutput
} from '@aws-sdk/client-secrets-manager';
import { fromEnv, fromIni } from '@aws-sdk/credential-providers';
import {
  AbortMultipartUploadCommand,
  DeleteObjectsCommand,
  ListMultipartUploadsCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  S3Client,
  type ObjectIdentifier
} from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { randomBytes } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { access, chmod, cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { WizardState, WizardVerification } from '../../src/init/server/wizard-server';
import { generatedSecretNames, isGeneratedSecretNameForProject } from '../../src/init/deploy/generated-secrets';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import { connectToInitWizard, extractWizardUrl, type InitWizardClient } from './init-canary-client';
import {
  evaluateFixtureComposition,
  healthResourceName,
  INIT_CANARY_FIXTURES,
  type InitCanaryFixture,
  type InitCanaryFixtureId
} from './init-canary-fixtures';
import {
  assertCliVersionOutput,
  buildCanaryEnvironment,
  resolveCanaryOptions,
  type CanaryOptions
} from './packaging-canary';

const FIXTURE = 'STP_INIT_CANARY_FIXTURE';
const CODING_AGENT = 'STP_INIT_CANARY_CODING_AGENT';
const MODEL_ID = 'STP_INIT_CANARY_MODEL_ID';
const AWS_ACCOUNT = 'STP_INIT_CANARY_AWS_ACCOUNT';
const stage = 'dev';
const cliDirectory = join(import.meta.dir, '..', '..');
const wizardStartTimeoutMs = 2 * 60_000;
const analysisTimeoutMs = 8 * 60_000;
const verificationTimeoutMs = 12 * 60_000;
const commandTimeoutMs = 45 * 60_000;
const deploymentTimeoutMs = 50 * 60_000;
const deletionTimeoutSeconds = 45 * 60;
const terminationGraceMs = 5_000;
const stateKind = 'stacktape-init-canary';
const stateVersion = 1;

type Environment = Record<string, string | undefined>;
type CodingAgent = 'none' | 'claude-code' | 'codex';

export type InitCanaryOptions = CanaryOptions & {
  stateFile: string;
  fixtureId: InitCanaryFixtureId;
  codingAgent: CodingAgent;
  modelId: string;
  awsAccount: string;
};

type RecordedSecret = {
  name: string;
  arn?: string;
  createdAt?: string;
};

type OwnedLogGroup = { name: string; createdAt: number };

export type InitCanaryState = {
  kind: typeof stateKind;
  version: typeof stateVersion;
  accountId: string;
  owner: string;
  fixtureId: InitCanaryFixtureId;
  projectName: string;
  stackName: string;
  region: string;
  stage: typeof stage;
  invocationId: string;
  startedAt: string;
  configPath?: string;
  configText?: string;
  stackId?: string;
  generatedSecrets: RecordedSecret[];
  logGroupsAbsentBefore: true;
  outcome?: {
    deployment: 'not-started' | 'failed' | 'succeeded';
    repairs: number;
    health: 'not-run' | 'failed' | 'passed';
  };
  cleanedAt?: string;
  deletedLogGroups?: string[];
};

type AwsClients = {
  cloudFormation: CloudFormationClient;
  logs: CloudWatchLogsClient;
  s3: S3Client;
  secrets: SecretsManagerClient;
  sts: STSClient;
};

type RunningWizard = {
  client: InitWizardClient;
  process: ChildProcess;
  outputTail: () => string;
};

const activeChildren = new Set<ChildProcess>();

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const sleep = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const outputTail = (value: string) =>
  value
    .replace(/http:\/\/127\.0\.0\.1:\d+\/#token=[A-Za-z0-9_-]+/g, 'http://127.0.0.1:<port>/#token=<redacted>')
    .trim()
    .slice(-4_000);

export const resolveInitCanaryOptions = ({
  platform = process.platform,
  env = process.env,
  makeProjectName
}: {
  platform?: NodeJS.Platform;
  env?: Environment;
  makeProjectName?: () => string;
} = {}): InitCanaryOptions => {
  const base = resolveCanaryOptions({ platform, env, ...(makeProjectName === undefined ? {} : { makeProjectName }) });
  assert(base.stateFile, 'STP_AWS_CANARY_STATE_FILE is required for the init canary and must be an absolute path.');

  const fixtureId = env[FIXTURE]?.trim();
  assert(
    fixtureId !== undefined && fixtureId in INIT_CANARY_FIXTURES,
    `${FIXTURE} must be one of ${Object.keys(INIT_CANARY_FIXTURES).join(', ')}.`
  );

  const codingAgent = env[CODING_AGENT]?.trim() || 'none';
  assert(
    codingAgent === 'none' || codingAgent === 'claude-code' || codingAgent === 'codex',
    `${CODING_AGENT} must be none, claude-code, or codex.`
  );
  const modelId = env[MODEL_ID]?.trim() || 'default';
  assert(/^[a-zA-Z0-9._-]{1,64}$/.test(modelId), `${MODEL_ID} contains an invalid model id.`);
  assert(codingAgent !== 'none' || modelId === 'default', `${MODEL_ID} must be default in files-only mode.`);

  const awsAccount = env[AWS_ACCOUNT]?.trim();
  assert(
    awsAccount !== undefined && /^[^\r\n]{1,128}$/.test(awsAccount),
    `${AWS_ACCOUNT} must name the exact Stacktape-connected disposable AWS account.`
  );

  return {
    ...base,
    stateFile: base.stateFile,
    fixtureId: fixtureId as InitCanaryFixtureId,
    codingAgent,
    modelId,
    awsAccount
  };
};

/**
 * The canary must enter the browser presentation even in CI, but it never opens a browser: it uses
 * `--noBrowser` and drives the loopback API. Removing CI markers only in this child keeps the public
 * CLI's normal "CI means terminal" behavior intact.
 */
export const buildWizardEnvironment = (env: Environment, platform: NodeJS.Platform = process.platform): Environment => {
  const result = { ...env };
  delete result.CI;
  delete result.GITHUB_ACTIONS;
  delete result.BUILDKITE;
  if (platform === 'linux' && result.DISPLAY === undefined && result.WAYLAND_DISPLAY === undefined) {
    result.DISPLAY = 'stacktape-init-canary';
  }
  return result;
};

const credentialProvider = (options: CanaryOptions): AwsCredentialIdentityProvider =>
  options.credentials.mode === 'profile' ? fromIni({ profile: options.credentials.profile }) : fromEnv();

const createAwsClients = (options: CanaryOptions): AwsClients => {
  const credentials = credentialProvider(options);
  const config = { credentials, maxAttempts: 6, region: options.region };
  return {
    cloudFormation: new CloudFormationClient(config),
    logs: new CloudWatchLogsClient(config),
    s3: new S3Client(config),
    secrets: new SecretsManagerClient(config),
    sts: new STSClient(config)
  };
};

const closeClients = (clients: AwsClients) => {
  clients.cloudFormation.destroy();
  clients.logs.destroy();
  clients.s3.destroy();
  clients.secrets.destroy();
  clients.sts.destroy();
};

const isMissingStackError = (error: unknown) =>
  error instanceof Error && error.name === 'ValidationError' && /does not exist/i.test(error.message);

const isMissingSecretError = (error: unknown) =>
  error instanceof Error &&
  (error.name === 'ResourceNotFoundException' || /can't find the specified secret/i.test(error.message));

const describeStack = async (client: CloudFormationClient, stackNameOrId: string): Promise<Stack | undefined> => {
  try {
    return (await client.send(new DescribeStacksCommand({ StackName: stackNameOrId }))).Stacks?.[0];
  } catch (error) {
    if (isMissingStackError(error)) return undefined;
    throw error;
  }
};

const describeSecret = async (
  client: SecretsManagerClient,
  nameOrArn: string
): Promise<DescribeSecretCommandOutput | undefined> => {
  try {
    return await client.send(new DescribeSecretCommand({ SecretId: nameOrArn }));
  } catch (error) {
    if (isMissingSecretError(error)) return undefined;
    throw error;
  }
};

const verifyIdentity = async (clients: AwsClients, options: InitCanaryOptions) => {
  const identity = await clients.sts.send(new GetCallerIdentityCommand({}));
  assert(identity.Account, 'STS did not return an AWS account id.');
  assert(
    identity.Account === options.expectedAccountId,
    `AWS credentials resolved to account ${identity.Account}, not explicitly allowed account ${options.expectedAccountId}.`
  );
};

const requiredString = (value: unknown, label: string): string => {
  assert(typeof value === 'string' && value.length > 0, `${label} is missing.`);
  return value;
};

const assertFixtureId: (value: unknown) => asserts value is InitCanaryFixtureId = (value) => {
  assert(typeof value === 'string' && value in INIT_CANARY_FIXTURES, 'Init canary state has an invalid fixture id.');
};

export const parseInitCanaryState = (value: unknown, options: InitCanaryOptions): InitCanaryState => {
  assert(isRecord(value), 'Init canary state file is not an object.');
  assert(
    value.kind === stateKind && value.version === stateVersion,
    'Init canary state file has an unsupported kind or version.'
  );
  assert(value.accountId === options.expectedAccountId, 'Init canary state file belongs to another AWS account.');
  assert(value.owner === options.owner, 'Init canary state file belongs to another canary run.');
  assert(value.projectName === options.projectName, 'Init canary state file belongs to another project.');
  assert(value.stackName === `${options.projectName}-${stage}`, 'Init canary state file belongs to another stack.');
  assert(
    value.region === options.region && value.stage === stage,
    'Init canary state file targets another region or stage.'
  );
  assertFixtureId(value.fixtureId);
  assert(value.fixtureId === options.fixtureId, 'Init canary state file belongs to another fixture.');
  assert(
    typeof value.invocationId === 'string' && /^init-canary-[a-z0-9-]+$/.test(value.invocationId),
    'Init canary state has no valid invocation id.'
  );
  assert(
    typeof value.startedAt === 'string' && !Number.isNaN(Date.parse(value.startedAt)),
    'Init canary state has no valid start time.'
  );
  assert(
    value.stackId === undefined || typeof value.stackId === 'string',
    'Init canary state has an invalid stack id.'
  );
  assert(
    value.configPath === undefined || typeof value.configPath === 'string',
    'Init canary state has an invalid config path.'
  );
  assert(
    value.configText === undefined || typeof value.configText === 'string',
    'Init canary state has invalid config text.'
  );
  assert(Array.isArray(value.generatedSecrets), 'Init canary state has no generated-secret ownership list.');
  for (const secret of value.generatedSecrets) {
    assert(isRecord(secret) && typeof secret.name === 'string', 'Init canary state has an invalid secret record.');
    assert(secret.arn === undefined || typeof secret.arn === 'string', 'Init canary state has an invalid secret ARN.');
  }
  assert(value.logGroupsAbsentBefore === true, 'Init canary state has no log-group reservation proof.');
  return value as InitCanaryState;
};

const writeState = async (path: string, state: InitCanaryState) => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomBytes(3).toString('hex')}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, path);
  await chmod(path, 0o600).catch(() => undefined);
};

const readState = async (options: InitCanaryOptions): Promise<InitCanaryState> =>
  parseInitCanaryState(JSON.parse(await readFile(options.stateFile, 'utf8')) as unknown, options);

const assertStateFileAbsent = async (path: string) => {
  try {
    await access(path);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }
  throw new Error(`Refusing to overwrite existing init canary state file ${path}.`);
};

const cliPrefix = (options: CanaryOptions): { command: string; args: string[] } =>
  options.cli.mode === 'binary'
    ? { command: options.cli.path, args: [] }
    : { command: process.execPath, args: ['run', 'dev'] };

const signalChild = (child: ChildProcess, signal: NodeJS.Signals) => {
  try {
    process.kill(-child.pid!, signal);
    return;
  } catch {}
  try {
    child.kill(signal);
  } catch {}
};

const terminateChild = async (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  signalChild(child, 'SIGTERM');
  await Promise.race([
    new Promise<void>((resolve) => child.once('close', () => resolve())),
    sleep(terminationGraceMs).then(() => signalChild(child, 'SIGKILL'))
  ]);
};

const terminateAllChildren = () => {
  for (const child of activeChildren) signalChild(child, 'SIGTERM');
};

const spawnCli = (options: CanaryOptions, args: string[], env: Environment): ChildProcess => {
  const prefix = cliPrefix(options);
  const child = spawn(prefix.command, [...prefix.args, ...args], {
    cwd: cliDirectory,
    detached: true,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  activeChildren.add(child);
  child.once('close', () => activeChildren.delete(child));
  return child;
};

const waitForChild = (child: ChildProcess, timeoutMs: number): Promise<number> =>
  new Promise((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    let forceKillTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(() => {
      if (settled) return;
      timedOut = true;
      signalChild(child, 'SIGTERM');
      forceKillTimer = setTimeout(() => {
        signalChild(child, 'SIGKILL');
        forceKillTimer = setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error(`Stacktape child exceeded ${timeoutMs / 60_000} minutes and did not stop.`));
        }, 1_000);
      }, terminationGraceMs);
    }, timeoutMs);
    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      reject(error);
    });
    child.once('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      if (timedOut) {
        reject(new Error(`Stacktape child exceeded ${timeoutMs / 60_000} minutes.`));
      } else {
        resolve(code ?? 1);
      }
    });
  });

const readStream = (stream: NodeJS.ReadableStream | null): Promise<string> =>
  new Promise((resolve, reject) => {
    if (stream === null) {
      resolve('');
      return;
    }
    let value = '';
    stream.on('data', (chunk: Buffer) => {
      value += chunk.toString('utf8');
    });
    stream.once('end', () => resolve(value));
    stream.once('error', reject);
  });

const runPlainCli = async (options: CanaryOptions, args: string[], env: Environment) => {
  const child = spawnCli(options, args, env);
  const stdoutPromise = readStream(child.stdout);
  const stderrPromise = readStream(child.stderr);
  const [exitCode, stdout, stderr] = await Promise.all([
    waitForChild(child, commandTimeoutMs),
    stdoutPromise,
    stderrPromise
  ]);
  assert(exitCode === 0, `Stacktape ${args[0]} exited with ${exitCode}: ${outputTail(stderr)}`);
  return { stdout, stderr };
};

const runJsonlCli = async (options: CanaryOptions, args: string[], env: Environment) => {
  const { stdout, stderr } = await runPlainCli(options, args, env);
  let parsed: ReturnType<typeof parseCliJsonl>;
  try {
    parsed = parseCliJsonl(stdout, args[0]!);
  } catch (error) {
    throw new Error(`Could not verify Stacktape ${args[0]} output.\nStderr:\n${outputTail(stderr)}`, { cause: error });
  }
  assert(parsed.result.ok, `Stacktape ${args[0]} failed: ${parsed.result.code}: ${parsed.result.message}`);
  return parsed;
};

const verifyCliSelection = async (options: InitCanaryOptions, env: Environment) => {
  if (options.cli.mode !== 'binary') return;
  await access(options.cli.path, constants.X_OK);
  const { stdout } = await runPlainCli(options, ['--version'], env);
  assertCliVersionOutput(stdout, options.cli.expectedVersion);
};

const stackArgs = (options: InitCanaryOptions, configPath?: string) => [
  ...(configPath === undefined ? [] : ['--configPath', configPath, '--currentWorkingDirectory', dirname(configPath)]),
  '--projectName',
  options.projectName,
  '--stage',
  stage,
  '--region',
  options.region,
  ...(options.credentials.mode === 'profile' ? ['--profile', options.credentials.profile] : [])
];

const startWizard = async ({
  options,
  workspace,
  env,
  signal
}: {
  options: InitCanaryOptions;
  workspace: string;
  env: Environment;
  signal: AbortSignal;
}): Promise<RunningWizard> => {
  const child = spawnCli(
    options,
    [
      'init',
      '--noBrowser',
      '--codingAgent',
      options.codingAgent,
      '--infrastructureType',
      'low-cost',
      '--configFormat',
      'yaml',
      '--projectDirectory',
      workspace,
      '--awsAccount',
      options.awsAccount
    ],
    buildWizardEnvironment(env)
  );

  let combined = '';
  let foundUrl: string | undefined;
  let resolveUrl: (value: string) => void = () => {};
  let rejectUrl: (error: Error) => void = () => {};
  const urlPromise = new Promise<string>((resolve, reject) => {
    resolveUrl = resolve;
    rejectUrl = reject;
  });
  const consume = (stream: NodeJS.ReadableStream | null) => {
    stream?.on('data', (chunk: Buffer) => {
      combined = `${combined}${chunk.toString('utf8')}`.slice(-16_000);
      if (foundUrl !== undefined) return;
      const candidate = extractWizardUrl(combined);
      if (candidate !== undefined) {
        foundUrl = candidate;
        resolveUrl(candidate);
      }
    });
  };
  consume(child.stdout);
  consume(child.stderr);
  child.once('error', (error) => {
    if (foundUrl === undefined) rejectUrl(new Error(`Could not start Stacktape init: ${error.message}`));
  });
  child.once('close', (code) => {
    if (foundUrl === undefined) {
      rejectUrl(
        new Error(`Stacktape init exited with ${code ?? 1} before starting the wizard: ${outputTail(combined)}`)
      );
    }
  });

  const wizardUrl = await Promise.race([
    urlPromise,
    sleep(wizardStartTimeoutMs).then(() => {
      throw new Error(`Timed out waiting for the init wizard to start: ${outputTail(combined)}`);
    })
  ]);
  return {
    client: await connectToInitWizard(wizardUrl, { signal }),
    process: child,
    outputTail: () => outputTail(combined)
  };
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    sleep(timeoutMs).then(() => {
      throw new Error(`Timed out waiting for ${label}.`);
    })
  ]);

const compositionResources = (state: WizardState): Record<string, { properties: Record<string, unknown> }> => {
  assert(isRecord(state.composition), 'Wizard produced no composition.');
  assert(isRecord(state.composition.resources), 'Wizard composition produced no resources.');
  const resources: Record<string, { properties: Record<string, unknown> }> = {};
  for (const [name, resource] of Object.entries(state.composition.resources)) {
    assert(isRecord(resource) && isRecord(resource.properties), `Composed resource ${name} has invalid properties.`);
    resources[name] = { properties: resource.properties };
  }
  return resources;
};

export const evaluateFixturePreflight = ({
  fixture,
  verification
}: {
  fixture: InitCanaryFixture;
  verification: WizardVerification | undefined;
}): string[] => {
  if (verification === undefined) return ['Wizard produced no preflight result.'];
  if (verification.status !== 'completed') return [`Preflight status is ${verification.status}, expected completed.`];
  const services = verification.services ?? [];
  if (fixture.preflight === 'unsupported-resource-type') {
    return services.every((service) => service.status === 'skipped')
      ? []
      : ['Unsupported-resource fixture unexpectedly reported a runnable service.'];
  }
  if (services.length === 0) return ['Required preflight exercised no services.'];
  return services
    .filter((service) => service.status !== 'passed')
    .map((service) => `${service.resourceName} preflight was ${service.status}: ${service.reason}`);
};

const deploymentIsTerminal = (state: WizardState): boolean =>
  state.deployment !== undefined && state.deployment.status !== 'running' && state.deployment.status !== 'repairing';

/** The deploy POST is an acknowledgement. Completion arrives later through wizard state. */
export const waitForWizardDeployment = async ({
  client,
  started,
  timeoutMs
}: {
  client: InitWizardClient;
  started: WizardState;
  timeoutMs: number;
}): Promise<WizardState> => {
  assert(started.deployment !== undefined, 'Wizard did not start the deployment.');
  return deploymentIsTerminal(started)
    ? started
    : client.waitForState({ accept: deploymentIsTerminal, label: 'finish deployment and repair', timeoutMs });
};

const assertWizardIdentity = (state: WizardState, options: InitCanaryOptions) => {
  assert(state.awsIdentity?.available === true, 'Wizard could not resolve AWS credentials before deployment.');
  assert(
    state.awsIdentity.accountId === options.expectedAccountId,
    `Wizard resolved AWS account ${state.awsIdentity.accountId}, expected ${options.expectedAccountId}.`
  );
  assert(state.stacktapeAccount?.signedIn === true, 'Wizard is not signed in to Stacktape before deployment.');
};

const assertGeneratedSecretsAbsent = async (
  clients: AwsClients,
  options: InitCanaryOptions,
  names: readonly string[]
) => {
  for (const name of names) {
    assertGeneratedSecretName(options.projectName, name);
    assert(!(await describeSecret(clients.secrets, name)), `Refusing to replace existing secret ${name}.`);
  }
};

const assertGeneratedSecretName = (projectName: string, name: string) => {
  assert(
    isGeneratedSecretNameForProject(projectName, name),
    `Refusing generated secret outside this canary project's namespace: ${name}.`
  );
};

const recordCreatedSecrets = async (clients: AwsClients, state: InitCanaryState): Promise<RecordedSecret[]> => {
  const recorded: RecordedSecret[] = [];
  for (const expected of state.generatedSecrets) {
    const secret = await describeSecret(clients.secrets, expected.name);
    if (secret === undefined) {
      recorded.push(expected);
      continue;
    }
    assert(
      secret.Description === 'Generated by stacktape init',
      `Secret ${expected.name} has unexpected ownership metadata.`
    );
    const arn = requiredString(secret.ARN, `${expected.name} ARN`);
    assert(arn.includes(`:${state.region}:${state.accountId}:secret:`), `Secret ${expected.name} belongs elsewhere.`);
    const createdAt = secret.CreatedDate?.toISOString();
    assert(
      createdAt && Date.parse(createdAt) >= Date.parse(state.startedAt) - 60_000,
      `Secret ${expected.name} predates this run.`
    );
    recorded.push({ name: expected.name, arn, createdAt });
  }
  return recorded;
};

const assertStackBelongsToState = (stack: Stack, state: InitCanaryState): string => {
  assert(stack.StackName === state.stackName, `AWS returned unexpected stack ${stack.StackName ?? '<unnamed>'}.`);
  const stackId = requiredString(stack.StackId, `${state.stackName} stack id`);
  if (state.stackId !== undefined) {
    assert(stackId === state.stackId, `Refusing to mutate ${state.stackName}: its stack id changed.`);
  } else {
    const createdAt = stack.CreationTime?.getTime();
    assert(createdAt !== undefined, `${state.stackName} has no creation time.`);
    assert(
      createdAt >= Date.parse(state.startedAt) - 60_000,
      `Refusing to adopt ${state.stackName}: it predates this canary run.`
    );
  }
  return stackId;
};

const observeStackIdentity = async ({
  clients,
  state,
  persist,
  finished
}: {
  clients: AwsClients;
  state: InitCanaryState;
  persist: (patch: Partial<InitCanaryState>) => Promise<void>;
  finished: () => boolean;
}) => {
  do {
    const stack = await describeStack(clients.cloudFormation, state.stackName);
    if (stack !== undefined) {
      const stackId = assertStackBelongsToState(stack, state);
      await persist({ stackId });
      return;
    }
    await sleep(1_000);
  } while (!finished());
};

const commandResult = (state: ReturnType<typeof parseCliJsonl>['result']): unknown => {
  assert(isRecord(state.data) && 'result' in state.data, 'CLI result event has no command result payload.');
  return state.data.result;
};

export const assertCanaryHealthUrl = (value: string): URL => {
  const parsed = new URL(value);
  assert(parsed.protocol === 'https:', 'Canary health URL must use HTTPS.');
  assert(parsed.username === '' && parsed.password === '', 'Canary health URL must not contain credentials.');
  assert(parsed.port === '' || parsed.port === '443', 'Canary health URL must use the default HTTPS port.');
  const hostname = parsed.hostname.toLowerCase();
  const trusted =
    hostname.endsWith('.stacktape-app.com') ||
    hostname.endsWith('.cloudfront.net') ||
    hostname.endsWith('.amazonaws.com') ||
    hostname.endsWith('.on.aws');
  assert(trusted, `Refusing to call unexpected canary URL host ${hostname}.`);
  return parsed;
};

const verifyHealth = async ({
  options,
  fixture,
  state,
  env
}: {
  options: InitCanaryOptions;
  fixture: InitCanaryFixture;
  state: WizardState;
  env: Environment;
}) => {
  if (fixture.health.kind === 'none') return;
  const resourceName = healthResourceName({ fixture, state });
  assert(resourceName, `Could not find ${fixture.health.resourceType} resource for the health check.`);
  const configPath = requiredString(state.configFile?.path, 'Written config path');
  const result = await runJsonlCli(
    options,
    ['param:get', ...stackArgs(options, configPath), '--resourceName', resourceName, '--paramName', 'url', '--agent'],
    env
  );
  const value = commandResult(result.result);
  assert(typeof value === 'string', `param:get returned a non-string URL for ${resourceName}.`);
  const healthUrl = assertCanaryHealthUrl(value);
  healthUrl.pathname = fixture.health.path;
  healthUrl.search = '';
  healthUrl.hash = '';

  let lastError: unknown;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const response = await fetch(healthUrl, { redirect: 'manual', signal: AbortSignal.timeout(12_000) });
      const body = await response.text();
      assert(response.status === fixture.health.expectedStatus, `Health URL returned HTTP ${response.status}.`);
      assert(body.includes(fixture.health.bodyIncludes), 'Health URL returned the wrong body.');
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 12) await sleep(Math.min(1_000 * 2 ** (attempt - 1), 8_000));
    }
  }
  throw new Error(`The deployed ${resourceName} URL did not become healthy.`, { cause: lastError });
};

const waitForStackAbsence = async (
  client: CloudFormationClient,
  stackId: string,
  stackName: string,
  abortSignal?: AbortSignal
) => {
  const result = await waitUntilStackDeleteComplete(
    { client, maxWaitTime: deletionTimeoutSeconds, minDelay: 5, maxDelay: 20, abortSignal },
    { StackName: stackId }
  );
  assert(result.state === 'SUCCESS', `CloudFormation did not confirm deletion of ${stackName}: ${result.state}.`);
  assert(!(await describeStack(client, stackId)), `CloudFormation stack ${stackName} still exists after deletion.`);
};

const deleteBucketObjects = async (client: S3Client, bucket: string, objects: ObjectIdentifier[]) => {
  if (objects.length === 0) return;
  await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }));
};

const emptyBucket = async (client: S3Client, bucket: string) => {
  let keyMarker: string | undefined;
  let versionIdMarker: string | undefined;
  let versionsRemain = true;
  do {
    const page = await client.send(
      new ListObjectVersionsCommand({ Bucket: bucket, KeyMarker: keyMarker, VersionIdMarker: versionIdMarker })
    );
    await deleteBucketObjects(client, bucket, [
      ...(page.Versions ?? []).flatMap(({ Key, VersionId }) =>
        Key === undefined ? [] : [{ Key, ...(VersionId === undefined ? {} : { VersionId }) }]
      ),
      ...(page.DeleteMarkers ?? []).flatMap(({ Key, VersionId }) =>
        Key === undefined ? [] : [{ Key, ...(VersionId === undefined ? {} : { VersionId }) }]
      )
    ]);
    versionsRemain = page.IsTruncated === true;
    keyMarker = versionsRemain ? page.NextKeyMarker : undefined;
    versionIdMarker = versionsRemain ? page.NextVersionIdMarker : undefined;
    assert(!versionsRemain || keyMarker !== undefined, `Version listing for ${bucket} was truncated without a marker.`);
  } while (versionsRemain);

  let continuationToken: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }));
    await deleteBucketObjects(
      client,
      bucket,
      (page.Contents ?? []).flatMap(({ Key }) => (Key === undefined ? [] : [{ Key }]))
    );
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken !== undefined);

  let uploadKeyMarker: string | undefined;
  let uploadIdMarker: string | undefined;
  let uploadsRemain = true;
  do {
    const page = await client.send(
      new ListMultipartUploadsCommand({
        Bucket: bucket,
        KeyMarker: uploadKeyMarker,
        UploadIdMarker: uploadIdMarker
      })
    );
    for (const upload of page.Uploads ?? []) {
      if (upload.Key !== undefined && upload.UploadId !== undefined) {
        await client.send(
          new AbortMultipartUploadCommand({ Bucket: bucket, Key: upload.Key, UploadId: upload.UploadId })
        );
      }
    }
    uploadsRemain = page.IsTruncated === true;
    uploadKeyMarker = uploadsRemain ? page.NextKeyMarker : undefined;
    uploadIdMarker = uploadsRemain ? page.NextUploadIdMarker : undefined;
    assert(
      !uploadsRemain || uploadKeyMarker !== undefined,
      `Upload listing for ${bucket} was truncated without a marker.`
    );
  } while (uploadsRemain);
};

const emptyStackBuckets = async (clients: AwsClients, state: InitCanaryState, stackId: string) => {
  const buckets = new Set<string>();
  let nextToken: string | undefined;
  do {
    const page = await clients.cloudFormation.send(
      new ListStackResourcesCommand({ StackName: stackId, NextToken: nextToken })
    );
    for (const resource of page.StackResourceSummaries ?? []) {
      if (resource.ResourceType === 'AWS::S3::Bucket' && resource.PhysicalResourceId !== undefined) {
        buckets.add(resource.PhysicalResourceId);
      }
    }
    nextToken = page.NextToken;
  } while (nextToken !== undefined);

  for (const bucket of buckets) {
    assert(bucket.startsWith(`${state.stackName}-`), `Refusing to empty unexpected bucket ${bucket}.`);
    await emptyBucket(clients.s3, bucket);
  }
};

const ownedLogGroupPrefixes = (stackName: string) => [
  `/aws/lambda/${stackName}-`,
  `/ecs/${stackName}-`,
  `/stp/${stackName}/`,
  `/aws/rds/instance/${stackName}-`,
  `/aws/rds/cluster/${stackName}-`,
  `${stackName}-`
];

const listOwnedLogGroups = async (clients: AwsClients, stackName: string): Promise<OwnedLogGroup[]> => {
  const found = new Map<string, OwnedLogGroup>();
  for (const prefix of ownedLogGroupPrefixes(stackName)) {
    let nextToken: string | undefined;
    do {
      const page = await clients.logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: prefix, nextToken }));
      for (const group of page.logGroups ?? []) {
        const name = group.logGroupName;
        if (name === undefined || !name.startsWith(prefix)) continue;
        assert(group.creationTime !== undefined, `Log group ${name} has no creation time.`);
        found.set(name, { name, createdAt: group.creationTime });
      }
      nextToken = page.nextToken;
    } while (nextToken !== undefined);
  }
  return [...found.values()].sort((left, right) => left.name.localeCompare(right.name));
};

const removeOwnedLogGroups = async (clients: AwsClients, state: InitCanaryState): Promise<string[]> => {
  assert(state.logGroupsAbsentBefore, 'Canary state does not prove the log-group prefixes were initially unused.');
  const groups = await listOwnedLogGroups(clients, state.stackName);
  for (const group of groups) {
    assert(
      group.createdAt >= Date.parse(state.startedAt) - 60_000,
      `Refusing to delete ${group.name}: it predates this canary run.`
    );
    await clients.logs.send(new DeleteLogGroupCommand({ logGroupName: group.name }));
  }
  return groups.map((group) => group.name);
};

const deleteRecordedSecrets = async (clients: AwsClients, state: InitCanaryState) => {
  for (const recorded of state.generatedSecrets) {
    assert(
      isGeneratedSecretNameForProject(state.projectName, recorded.name),
      `Refusing to delete secret outside ${state.projectName}-.`
    );
    const secret = await describeSecret(clients.secrets, recorded.arn ?? recorded.name);
    if (secret === undefined) continue;
    assert(
      secret.Name === recorded.name,
      `Secret ARN now identifies ${secret.Name ?? '<unnamed>'}, not ${recorded.name}.`
    );
    assert(
      secret.Description === 'Generated by stacktape init',
      `Refusing to delete ${recorded.name}: ownership metadata changed.`
    );
    const arn = requiredString(secret.ARN, `${recorded.name} ARN`);
    if (recorded.arn !== undefined)
      assert(arn === recorded.arn, `Refusing to delete ${recorded.name}: its ARN changed.`);
    const createdAt = secret.CreatedDate?.getTime();
    assert(
      createdAt !== undefined && createdAt >= Date.parse(state.startedAt) - 60_000,
      `Refusing to delete ${recorded.name}: it predates this run.`
    );
    await clients.secrets.send(new DeleteSecretCommand({ SecretId: arn, ForceDeleteWithoutRecovery: true }));
  }
};

const cleanup = async (
  clients: AwsClients,
  options: InitCanaryOptions,
  env: Environment,
  abortSignal?: AbortSignal
): Promise<InitCanaryState> => {
  let state = await readState(options);
  const stack = await describeStack(clients.cloudFormation, state.stackId ?? state.stackName);
  if (stack !== undefined) {
    const stackId = assertStackBelongsToState(stack, state);
    state = { ...state, stackId };
    await writeState(options.stateFile, state);

    let cleanupDirectory: string | undefined;
    let configPath: string | undefined;
    if (state.configText !== undefined) {
      cleanupDirectory = await mkdtemp(join(tmpdir(), 'stacktape-init-canary-cleanup-'));
      configPath = join(cleanupDirectory, 'stacktape.yml');
      await writeFile(configPath, state.configText, { mode: 0o600 });
    }

    let cliDeleteError: unknown;
    try {
      assert(configPath !== undefined, 'No generated config is available for Stacktape cleanup.');
      await runJsonlCli(options, ['delete', ...stackArgs(options, configPath), '--agent'], env);
      await waitForStackAbsence(clients.cloudFormation, stackId, state.stackName, abortSignal);
    } catch (error) {
      cliDeleteError = error;
    } finally {
      if (cleanupDirectory !== undefined) await rm(cleanupDirectory, { recursive: true, force: true });
    }

    if (cliDeleteError !== undefined) {
      const remaining = await describeStack(clients.cloudFormation, stackId);
      if (remaining !== undefined) {
        try {
          assertStackBelongsToState(remaining, state);
          await emptyStackBuckets(clients, state, stackId);
          await clients.cloudFormation.send(new DeleteStackCommand({ StackName: stackId }));
          await waitForStackAbsence(clients.cloudFormation, stackId, state.stackName, abortSignal);
        } catch (fallbackError) {
          throw new AggregateError(
            [cliDeleteError, fallbackError],
            `Both Stacktape and direct CloudFormation cleanup failed for ${state.stackName}.`
          );
        }
        console.warn(`Stacktape cleanup failed for ${state.stackName}; direct CloudFormation deletion succeeded.`);
      }
    }
  }
  await deleteRecordedSecrets(clients, state);
  const deletedLogGroups = await removeOwnedLogGroups(clients, state);
  state = { ...state, deletedLogGroups, cleanedAt: new Date().toISOString() };
  await writeState(options.stateFile, state);
  await rm(join(cliDirectory, '.stacktape', state.invocationId), { recursive: true, force: true });
  return state;
};

export const runInitCanary = async ({ cleanupOnly = false }: { cleanupOnly?: boolean } = {}) => {
  const options = resolveInitCanaryOptions();
  const clients = createAwsClients(options);
  const fixture = INIT_CANARY_FIXTURES[options.fixtureId];
  const invocationId = `init-canary-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
  const env = buildCanaryEnvironment({ options, revision: 'init-canary', invocationId });
  const stackName = `${options.projectName}-${stage}`;
  let temporaryRoot: string | undefined;
  let wizard: RunningWizard | undefined;
  let bodyError: unknown;
  let cleanupError: unknown;
  let interruptedSignal: NodeJS.Signals | undefined;
  let state: InitCanaryState | undefined;
  let stateWrite = Promise.resolve();
  const operationAbort = new AbortController();
  const cleanupAbort = new AbortController();
  let receivedSignals = 0;

  const persist = async (patch: Partial<InitCanaryState>) => {
    assert(state !== undefined, 'Canary state was not initialized.');
    state = { ...state, ...patch };
    const snapshot = state;
    stateWrite = stateWrite.then(() => writeState(options.stateFile, snapshot));
    await stateWrite;
  };

  const handleSignal = (signal: NodeJS.Signals) => {
    receivedSignals += 1;
    interruptedSignal ??= signal;
    operationAbort.abort(new Error(`Init canary interrupted by ${signal}.`));
    if (receivedSignals > 1) cleanupAbort.abort(new Error(`Init canary cleanup interrupted by ${signal}.`));
    terminateAllChildren();
  };
  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  try {
    await verifyIdentity(clients, options);
    if (cleanupOnly) {
      const cleaned = await cleanup(clients, options, env, cleanupAbort.signal);
      console.info(`Cleanup verified for ${cleaned.stackName}.`);
      return;
    }

    assert(
      !(await describeStack(clients.cloudFormation, stackName)),
      `Refusing to mutate existing stack ${stackName}.`
    );
    assert(
      (await listOwnedLogGroups(clients, stackName)).length === 0,
      `Refusing to reuse ${stackName}: one or more canary-prefixed log groups already exist.`
    );
    await assertStateFileAbsent(options.stateFile);
    await verifyCliSelection(options, env);
    state = {
      kind: stateKind,
      version: stateVersion,
      accountId: options.expectedAccountId,
      owner: options.owner,
      fixtureId: options.fixtureId,
      projectName: options.projectName,
      stackName,
      region: options.region,
      stage,
      invocationId,
      startedAt: new Date().toISOString(),
      generatedSecrets: [],
      logGroupsAbsentBefore: true,
      outcome: { deployment: 'not-started', repairs: 0, health: 'not-run' }
    };
    await writeState(options.stateFile, state);

    temporaryRoot = await mkdtemp(join(tmpdir(), 'stacktape-init-canary-'));
    const workspace = join(temporaryRoot, options.projectName);
    await cp(fixture.sourceDirectory, workspace, { recursive: true, errorOnExist: true });

    wizard = await startWizard({ options, workspace, env, signal: operationAbort.signal });
    const ready = await wizard.client.getState();
    assert(ready.phase === 'ready', `Wizard started in ${ready.phase}, expected ready.`);
    assert(
      ready.agents?.some(
        (agent) => agent.id === options.codingAgent && agent.models.some((model) => model.id === options.modelId)
      ),
      `Wizard did not offer ${options.codingAgent}/${options.modelId}.`
    );

    await wizard.client.post('/api/start', {
      agentId: options.codingAgent,
      modelId: options.modelId,
      mode: 'low-cost'
    });
    const reviewed = await wizard.client.waitForState({
      accept: (candidate) => candidate.phase === 'reviewing' || candidate.phase === 'failed',
      label: 'finish analysing the fixture',
      timeoutMs: analysisTimeoutMs
    });
    assert(reviewed.phase === 'reviewing', `Wizard analysis failed: ${reviewed.error ?? wizard.outputTail()}`);
    const compositionProblems = evaluateFixtureComposition({ fixture, state: reviewed });
    assert(compositionProblems.length === 0, `Composition contract failed:\n- ${compositionProblems.join('\n- ')}`);

    const secretNames = generatedSecretNames(compositionResources(reviewed));
    await assertGeneratedSecretsAbsent(clients, options, secretNames);
    await persist({ generatedSecrets: secretNames.map((name) => ({ name })) });

    const written = await wizard.client.post('/api/write', { format: 'yaml' });
    const configPath = requiredString(written.configFile?.path, 'Written config path');
    assert(configPath.startsWith(workspace), 'Wizard wrote the config outside the canary workspace.');
    await persist({ configPath, configText: await readFile(configPath, 'utf8') });
    await runJsonlCli(options, ['validate', ...stackArgs(options, configPath), '--thorough', '--agent'], env);

    await wizard.client.post('/api/verify');
    const verified = await wizard.client.waitForState({
      accept: (candidate) =>
        candidate.verification !== undefined &&
        candidate.verification.status !== 'running' &&
        candidate.verification.status !== 'repairing',
      label: 'finish local preflight',
      timeoutMs: verificationTimeoutMs
    });
    const preflightProblems = evaluateFixturePreflight({ fixture, verification: verified.verification });
    assert(preflightProblems.length === 0, `Preflight contract failed:\n- ${preflightProblems.join('\n- ')}`);

    const identityState = await wizard.client.post('/api/recheck');
    assertWizardIdentity(identityState, options);

    await withTimeout(
      wizard.client.post('/api/deploy', { stage, region: options.region, expected: { kind: 'check' } }),
      60_000,
      'the wizard to check the exact deployment target'
    );
    const checkedTarget = await wizard.client.waitForState({
      accept: (candidate) => candidate.deployTarget !== undefined,
      label: 'observe the deployment target',
      timeoutMs: 10_000
    });
    assert(
      checkedTarget.deployTarget?.status === 'absent',
      `Canary target was not absent: ${checkedTarget.deployTarget?.status ?? 'missing'}.`
    );
    assert(
      checkedTarget.deployTarget.accountId === options.expectedAccountId,
      `Authoritative deploy target resolved account ${checkedTarget.deployTarget.accountId}, expected ${options.expectedAccountId}.`
    );
    assert(
      checkedTarget.deployTarget.region === options.region && checkedTarget.deployTarget.stackName === stackName,
      `Authoritative deploy target was ${checkedTarget.deployTarget.stackName} in ${checkedTarget.deployTarget.region}, expected ${stackName} in ${options.region}.`
    );
    const deploymentStarted = await withTimeout(
      wizard.client.post('/api/deploy', { stage, region: options.region, expected: { kind: 'create' } }),
      60_000,
      'the wizard to re-check and accept deployment'
    );
    let deploymentFinished = false;
    const stackObserver = observeStackIdentity({
      clients,
      state,
      persist,
      finished: () => deploymentFinished
    });
    const deployRequest = waitForWizardDeployment({
      client: wizard.client,
      started: deploymentStarted,
      timeoutMs: deploymentTimeoutMs
    }).finally(() => {
      deploymentFinished = true;
    });
    const [deployResult, observerResult] = await Promise.allSettled([deployRequest, stackObserver]);
    if (deployResult.status === 'rejected' && observerResult.status === 'rejected') {
      throw new AggregateError(
        [deployResult.reason, observerResult.reason],
        'Deployment and stack observation failed.'
      );
    }
    if (deployResult.status === 'rejected') throw deployResult.reason;
    if (observerResult.status === 'rejected') throw observerResult.reason;
    const deployed = deployResult.value;
    assert(deployed.deployment !== undefined, 'Wizard returned no deployment result.');
    const repairs = deployed.deployment.repairs?.length ?? 0;
    const succeeded = deployed.deployment.status === 'succeeded' && deployed.deployment.outcome?.ok === true;
    const finalSecretNames = generatedSecretNames(compositionResources(deployed));
    for (const name of finalSecretNames) assertGeneratedSecretName(options.projectName, name);
    const allSecretNames = [...new Set([...state.generatedSecrets.map(({ name }) => name), ...finalSecretNames])];
    const finalConfigPath = requiredString(deployed.configFile?.path, 'Final config path');
    await persist({
      configPath: finalConfigPath,
      configText: await readFile(finalConfigPath, 'utf8'),
      generatedSecrets: allSecretNames.map((name) => ({ name }))
    });
    await persist({
      generatedSecrets: await recordCreatedSecrets(clients, state),
      outcome: { deployment: succeeded ? 'succeeded' : 'failed', repairs, health: 'not-run' }
    });
    assert(
      succeeded,
      `Deployment failed: ${deployed.deployment.outcome?.code ?? 'unknown'}: ${deployed.deployment.outcome?.message ?? 'No message.'}`
    );
    assert(repairs <= 1, `Deployment needed ${repairs} repairs; the release lane permits at most one.`);

    try {
      await verifyHealth({ options, fixture, state: deployed, env });
      await persist({ outcome: { deployment: 'succeeded', repairs, health: 'passed' } });
    } catch (error) {
      await persist({ outcome: { deployment: 'succeeded', repairs, health: 'failed' } });
      throw error;
    }

    if (interruptedSignal) throw new Error(`Init canary interrupted by ${interruptedSignal}.`);
    console.info(
      `Verified ${options.fixtureId}: composition, packaged validation, preflight, deployment, ${repairs === 0 ? 'first attempt' : 'one repair'}, and live health.`
    );
  } catch (error) {
    bodyError = error;
  } finally {
    if (wizard !== undefined) await terminateChild(wizard.process).catch(() => undefined);
    if (!cleanupOnly && state !== undefined) {
      try {
        await stateWrite;
        await cleanup(clients, options, env, cleanupAbort.signal);
      } catch (error) {
        cleanupError = error;
      }
    }
    if (temporaryRoot !== undefined) await rm(temporaryRoot, { recursive: true, force: true });
    await rm(join(cliDirectory, '.stacktape', invocationId), { recursive: true, force: true });
    process.off('SIGINT', handleSignal);
    process.off('SIGTERM', handleSignal);
    closeClients(clients);
  }

  if (bodyError && cleanupError) {
    throw new AggregateError([bodyError, cleanupError], `Init canary failed and cleanup also failed for ${stackName}.`);
  }
  if (bodyError) throw bodyError;
  if (cleanupError) throw cleanupError;
  console.info(`Real-AWS init canary passed and ${stackName} was deleted.`);
};

if (import.meta.main) {
  runInitCanary({ cleanupOnly: process.argv.includes('--cleanup-only') }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
