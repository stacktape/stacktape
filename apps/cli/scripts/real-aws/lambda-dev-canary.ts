/**
 * Deployed Lambda functions → dev box → local databases, through the real `stacktape dev` (source CLI).
 *
 * One run owns an isolated dev network (`STACKTAPE_DEV_NETWORK_SUFFIX`) and one dev stage, and goes through:
 * 1. first creation: `dev --agent` creates the dev network and the dev stack;
 * 2. arm64 and x86_64 functions query local PostgreSQL (initial and edited rows), one pings local Redis, and a VPC
 *    function queries PostgreSQL and reaches the internet through the box; with `--watch`, a syntax error in the
 *    shared entry file fails the rebuild and keeps the old code, and a configuration edit asks for a restart;
 * 3. laptop reconnect: the SSM plugin is killed and the functions reach the database again;
 * 4. one stage, two machines: a copy of the project in another directory stands for the same developer's second
 *    machine. Its `dev --agent` of the running stage is refused before it deploys anything, `dev network delete` is
 *    refused while the session runs, and `--takeOver` moves the stage once, without the two sessions taking the
 *    relay ports from each other in turn (the relay's log on the box is read through SSM Run Command);
 * 5. box stop and wake: the box is stopped as its idle stop would, and the next `dev --agent` starts it;
 * 6. deletion: `delete` of the dev stage and `dev network delete`, then AWS is queried for every owned resource.
 *
 * Timings go to the report file. Recovery state is written before anything is created; `--cleanup-only` resumes it.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { Client } from 'pg';
import { fromIni } from '@aws-sdk/credential-providers';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import {
  DescribeAddressesCommand,
  DescribeInstancesCommand,
  DescribeNetworkInterfacesCommand,
  EC2Client,
  StopInstancesCommand
} from '@aws-sdk/client-ec2';
import {
  GetFunctionConfigurationCommand,
  InvokeCommand,
  LambdaClient,
  ListFunctionsCommand
} from '@aws-sdk/client-lambda';
import { CloudWatchLogsClient, DeleteLogGroupCommand, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import {
  DeleteParametersCommand,
  DescribeSessionsCommand,
  GetCommandInvocationCommand,
  GetParametersByPathCommand,
  SendCommandCommand,
  SSMClient,
  TerminateSessionCommand
} from '@aws-sdk/client-ssm';
import { getDevNetworkLeaseParameterPrefix, getDevNetworkStackName } from '@stacktape/naming/shared-stacks';
import { localStatePaths } from '../../src/config/local-state-paths';

const check: (value: unknown, message: string) => asserts value = (value, message) => {
  if (!value) throw new Error(message);
};
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const PREFIX = 'STP_AWS_LAMBDA_DEV_';
const CLI_DIRECTORY = join(import.meta.dir, '..', '..');

export const resolveLambdaDevOptions = (env: Record<string, string | undefined> = process.env) => {
  check(env[`${PREFIX}DEPLOY`] === '1', 'Explicit Lambda dev canary opt-in is required.');
  check(
    env[`${PREFIX}CONFIRM_DISPOSABLE`] === 'this-is-a-disposable-test-account',
    'Disposable account confirmation is required.'
  );
  check(env[`${PREFIX}PROFILE`] === 'stacktape-e2e', 'Only the stacktape-e2e profile is accepted.');
  const accountId = env[`${PREFIX}EXPECTED_ACCOUNT_ID`];
  check(accountId && /^\d{12}$/.test(accountId), 'An exact 12-digit expected account is required.');
  const stateFile = env[`${PREFIX}STATE_FILE`];
  check(stateFile && isAbsolute(stateFile), 'An absolute recovery state file is required.');
  const owner = env[`${PREFIX}OWNER`];
  check(owner && /^[a-z0-9-]{1,40}$/.test(owner), 'A safe unique owner is required.');
  const reportFile = env[`${PREFIX}REPORT`];
  check(!reportFile || isAbsolute(reportFile), 'The report file must be an absolute path.');
  check(
    !Object.keys(env).some((key) => key === 'AWS_ENDPOINT_URL' || key.startsWith('AWS_ENDPOINT_URL_')),
    'Endpoint overrides are forbidden.'
  );
  check(process.platform === 'linux', 'This canary currently qualifies Linux only.');
  const region = env[`${PREFIX}REGION`] ?? 'eu-west-1';
  check(/^[a-z]{2}(-[a-z]+)+-\d$/.test(region), 'The region must be an AWS region name.');
  // A task can name its dev network; the run checks that the name is free before creating anything.
  const networkSuffix = env[`${PREFIX}NETWORK_SUFFIX`];
  check(
    !networkSuffix || /^[a-z0-9]{1,16}$/.test(networkSuffix),
    'The network suffix must be 1-16 lowercase letters or digits.'
  );
  return {
    accountId,
    stateFile,
    networkSuffix,
    owner,
    reportFile,
    region,
    profile: 'stacktape-e2e'
  };
};
type Options = ReturnType<typeof resolveLambdaDevOptions>;

type State = {
  accountId: string;
  owner: string;
  region: string;
  /** Project `v4lambdadev-<8 hex>`; its stage is `dev`, and its network suffix the same 8 hex digits. */
  projectName: string;
  networkSuffix: string;
  directory: string;
  awsAccountName?: string;
  /** The dev network's box, once the network exists: its SSM sessions are ended in cleanup. */
  boxInstanceId?: string;
  /** Ports of the dev agents the run started, so a recovery stops those a crashed run left running. */
  agentPorts?: number[];
  createAttempted: boolean;
  cleanupVerified?: boolean;
};

export const validateLambdaDevRecoveryState = (value: unknown, options: Options): State => {
  check(typeof value === 'object' && value !== null, 'Recovery state must be an object.');
  const candidate = value as Record<string, unknown>;
  check(
    candidate.accountId === options.accountId &&
      candidate.owner === options.owner &&
      candidate.region === options.region,
    'Recovery state identity differs from this run.'
  );
  check(
    typeof candidate.projectName === 'string' &&
      /^v4lambdadev-[a-f0-9]{8}$/.test(candidate.projectName) &&
      // The network is the run's own suffix, or the project's id when the run named none.
      candidate.networkSuffix === (options.networkSuffix ?? candidate.projectName.slice('v4lambdadev-'.length)),
    'Recovery resource names differ from this run.'
  );
  check(
    typeof candidate.directory === 'string' &&
      dirname(candidate.directory) === tmpdir() &&
      /^stacktape-lambda-dev-[a-zA-Z0-9]{6}$/.test(basename(candidate.directory)),
    'Recovery directory is not an owned temporary directory.'
  );
  check(typeof candidate.createAttempted === 'boolean', 'Recovery creation flag is invalid.');
  check(
    candidate.boxInstanceId === undefined ||
      (typeof candidate.boxInstanceId === 'string' && /^i-[a-f0-9]{8,17}$/.test(candidate.boxInstanceId)),
    'Recovery instance id is invalid.'
  );
  check(
    candidate.agentPorts === undefined ||
      (Array.isArray(candidate.agentPorts) &&
        candidate.agentPorts.every((port) => Number.isInteger(port) && port >= 1024 && port <= 65535)),
    'Recovery agent ports are invalid.'
  );
  return {
    accountId: options.accountId,
    owner: options.owner,
    region: options.region,
    projectName: candidate.projectName,
    networkSuffix: candidate.networkSuffix,
    directory: candidate.directory,
    awsAccountName: typeof candidate.awsAccountName === 'string' ? candidate.awsAccountName : undefined,
    boxInstanceId: candidate.boxInstanceId as string | undefined,
    createAttempted: candidate.createAttempted,
    agentPorts: candidate.agentPorts as number[] | undefined,
    cleanupVerified: candidate.cleanupVerified === true
  };
};

const STAGE = 'dev';
/** A second developer's stage, run at the same time on the same box: a second SSM session to it. */
const SECOND_STAGE = 'dev2';
const STAGES = [STAGE, SECOND_STAGE];
const stackName = (state: State, stage = STAGE) => `${state.projectName}-${stage}`;
const networkName = (state: State) => getDevNetworkStackName(state.networkSuffix);
const functionName = (state: State, name: string, stage = STAGE) => `${stackName(state, stage)}-${name}`;
const FUNCTIONS = ['queryArm', 'queryX86', 'vpcEgress'] as const;
/** The fixture's local PostgreSQL password; the local database runs only on this machine, behind the dev box. */
const DATABASE_PASSWORD = 'lambda-dev-canary-db-password';
const projectDirectory = (state: State) => join(state.directory, 'project');
/** The same project on the developer's second machine: its own containers, databases and agent registry. */
const secondMachineDirectory = (state: State) => join(state.directory, 'second-machine');

/** The fixture: the canary writes it per run, with `pg` imported from this checkout, so it needs no install. */
const writeFixture = async (state: State, directory = projectDirectory(state)) => {
  await mkdir(join(directory, 'src'), { recursive: true });
  const pg = join(CLI_DIRECTORY, 'node_modules/pg/lib/index.js');
  await writeFile(
    join(directory, 'stacktape.yml'),
    `# Lambda dev canary fixture (${state.owner}).
resources:
  db:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: ${DATABASE_PASSWORD}
      engine:
        type: postgres
        properties:
          version: '16.4'
          primaryInstance:
            instanceSize: db.t3.micro
  cache:
    type: redis-cluster
    properties:
      defaultUserPassword: lambda-dev-canary-cache-password
      instanceSize: cache.t3.micro
      engineVersion: '7.1'
  queryArm:
    type: function
    properties:
      packaging: { type: js-bundle, properties: { entryfilePath: ./src/query.ts } }
      architecture: arm64
      timeout: 30
      connectTo: [db, cache]
  queryX86:
    type: function
    properties:
      packaging: { type: js-bundle, properties: { entryfilePath: ./src/query.ts } }
      architecture: x86_64
      timeout: 30
      connectTo: [db]
  vpcEgress:
    type: function
    properties:
      packaging: { type: js-bundle, properties: { entryfilePath: ./src/query.ts } }
      architecture: arm64
      timeout: 30
      joinDefaultVpc: true
      connectTo: [db]
`
  );
  await writeFile(
    join(directory, 'src/query.ts'),
    `import { connect } from 'node:net';
import { Client } from ${JSON.stringify(pg)};

const redisPing = (url: string) =>
  new Promise<string>((resolve, reject) => {
    const { hostname, port, password } = new URL(url);
    const socket = connect({ host: hostname, port: Number(port) }, () =>
      socket.write('AUTH default ' + decodeURIComponent(password) + '\\r\\nPING\\r\\n')
    );
    let reply = '';
    socket.setTimeout(8000, () => socket.destroy(new Error('redis timeout')));
    socket.on('data', (chunk) => {
      reply += chunk;
      if (reply.includes('PONG')) {
        socket.destroy();
        resolve('PONG');
      }
    });
    socket.once('error', reject);
  });

// A connection kept across invocations, like a pool: it must end when another session takes the stage over.
const environmentId = Math.random().toString(36).slice(2);
let pooled: Client | undefined;
let pooledBroken = false;
const pooledValue = async () => {
  let reconnected = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (pooled && pooledBroken) {
      pooled.end().catch(() => {});
      pooled = undefined;
      reconnected = true;
    }
    if (!pooled) {
      const client = new Client({ connectionString: process.env.STP_DB_CONNECTION_STRING, connectionTimeoutMillis: 8000 });
      client.on('error', () => (pooledBroken = true));
      await client.connect();
      pooled = client;
      pooledBroken = false;
    }
    try {
      const { rows } = await pooled.query('select value from dev_values');
      return { value: rows[0].value, reconnected, environmentId };
    } catch (error) {
      pooledBroken = true;
      if (attempt) throw error;
    }
  }
};

export const handler = async (event: { op: 'db' | 'ping' | 'cache' | 'egress' | 'pooled' }) => {
  if (event.op === 'pooled') return pooledValue();
  if (event.op === 'cache') return { reply: await redisPing(process.env.STP_CACHE_CONNECTION_STRING!) };
  if (event.op === 'ping') {
    const db = new Client({ connectionString: process.env.STP_DB_CONNECTION_STRING, connectionTimeoutMillis: 8000 });
    await db.connect();
    try {
      return { ping: (await db.query('select 1 as one')).rows[0].one };
    } finally {
      await db.end();
    }
  }
  if (event.op === 'egress') {
    const response = await fetch('https://checkip.amazonaws.com', { signal: AbortSignal.timeout(8000) });
    return { ip: (await response.text()).trim() };
  }
  const started = Date.now();
  const db = new Client({ connectionString: process.env.STP_DB_CONNECTION_STRING, connectionTimeoutMillis: 8000 });
  await db.connect();
  const connectMs = Date.now() - started;
  try {
    const samples: number[] = [];
    for (let i = 0; i < 20; i++) {
      const at = performance.now();
      await db.query('select 1');
      samples.push(performance.now() - at);
    }
    samples.sort((a, b) => a - b);
    const { rows } = await db.query('select value from dev_values');
    console.info('DEV_DATABASE_VALUE=' + rows[0].value);
    return { value: rows[0].value, connectMs, selectP50Ms: samples[10], host: process.env.STP_DB_HOST };
  } finally {
    await db.end();
  }
};
`
  );
};

// ─── Source CLI ──────────────────────────────────────────────────────────────────────────────────────────────────

const startedProcesses = new Set<ChildProcess>();

const cliEnvironment = (options: Options, state: State) => {
  const env: Record<string, string | undefined> = {
    ...process.env,
    AWS_PROFILE: options.profile,
    AWS_DEFAULT_PROFILE: options.profile,
    AWS_SDK_LOAD_CONFIG: '1',
    AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'true',
    STP_DISABLE_TELEMETRY: '1',
    STACKTAPE_DEV_NETWORK_SUFFIX: state.networkSuffix
  };
  // The API key comes from apps/cli/.env.local, which the source CLI loads; nothing inherited may replace it.
  for (const name of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'STACKTAPE_API_KEY']) {
    delete env[name];
  }
  delete env.SKIP_LOADING_ENV;
  return env;
};

const runCli = async (options: Options, state: State, args: string[], timeoutMs = 25 * 60_000) => {
  const child = spawn(process.execPath, ['scripts/dev.ts', ...args], {
    cwd: CLI_DIRECTORY,
    env: cliEnvironment(options, state),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  startedProcesses.add(child);
  let stdout = '';
  let stderr = '';
  child.stdout!.on('data', (data) => (stdout += data));
  child.stderr!.on('data', (data) => (stderr += data));
  const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
  const exitCode = await new Promise<number | null>((resolve) => child.once('exit', (code) => resolve(code)));
  clearTimeout(timer);
  startedProcesses.delete(child);
  const result = stdout
    .split(/\r?\n/)
    .flatMap((line) => {
      try {
        const value = JSON.parse(line) as { type?: string };
        return value?.type === 'result'
          ? [value as { ok?: boolean; code?: string; data?: { result?: unknown }; message?: string }]
          : [];
      } catch {
        return [];
      }
    })
    .at(-1);
  return { exitCode, result, output: `${stdout}\n${stderr}` };
};

const stackArgs = (options: Options, state: State, stage = STAGE, directory = projectDirectory(state)) => [
  '--currentWorkingDirectory',
  directory,
  '--configPath',
  'stacktape.yml',
  '--projectName',
  state.projectName,
  '--stage',
  stage,
  '--region',
  options.region,
  '--profile',
  options.profile,
  '--awsAccount',
  state.awsAccountName!
];

const tail = (output: string) => output.slice(-4000);

const runAgent = (
  options: Options,
  state: State,
  agentPort: number,
  { stage = STAGE, directory, extraArgs = [] }: { stage?: string; directory?: string; extraArgs?: string[] } = {}
) =>
  runCli(options, state, [
    'dev',
    ...stackArgs(options, state, stage, directory),
    '--resources',
    'all',
    '--agent',
    '--agentPort',
    String(agentPort),
    ...extraArgs
  ]);

const startAgent = async (
  options: Options,
  state: State,
  agentPort: number,
  stage = STAGE,
  { directory, extraArgs }: { directory?: string; extraArgs?: string[] } = {}
) => {
  const started = Date.now();
  const run = await runAgent(options, state, agentPort, { stage, directory, extraArgs });
  check(run.exitCode === 0 && run.result?.ok === true, `dev --agent failed (${run.exitCode}):\n${tail(run.output)}`);
  const tokenFile = (run.result?.data?.result as { tokenFile?: string } | undefined)?.tokenFile;
  return { seconds: (Date.now() - started) / 1000, output: run.output, tokenFile };
};

type AgentResponse = { ok: boolean; code: string; message?: string; data?: Record<string, any> };

/** Calls the dev agent the way a coding agent does: loopback, its session token, JSON for POST. */
const callAgent = async (agent: { port: number; tokenFile: string }, method: 'GET' | 'POST', path: string) => {
  const token = readFileSync(agent.tokenFile, 'utf8').trim();
  const response = await fetch(`http://127.0.0.1:${agent.port}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(method === 'POST' ? { 'content-type': 'application/json' } : {})
    },
    ...(method === 'POST' ? { body: '{}' } : {}),
    signal: AbortSignal.timeout(5 * 60_000)
  });
  return (await response.json()) as AgentResponse;
};

const stopAgent = async (options: Options, state: State, agentPort: number) => {
  const run = await runCli(options, state, ['dev:stop', '--agentPort', String(agentPort), '--agent']);
  check(run.exitCode === 0, `dev:stop failed (${run.exitCode}):\n${tail(run.output)}`);
};

/** Processes whose command line contains every fragment (Linux /proc). */
const findProcesses = (...fragments: string[]) =>
  readdirSync('/proc')
    .filter((entry) => /^\d+$/.test(entry))
    .flatMap((pid) => {
      try {
        const commandLine = readFileSync(`/proc/${pid}/cmdline`, 'utf8').replaceAll('\0', ' ');
        return fragments.every((fragment) => commandLine.includes(fragment)) ? [Number(pid)] : [];
      } catch {
        return [];
      }
    });

// ─── Run ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export const runLambdaDevCanary = async (cleanupOnly = false) => {
  const options = resolveLambdaDevOptions();
  const config = {
    region: options.region,
    credentials: fromIni({ profile: options.profile }),
    ignoreConfiguredEndpointUrls: true,
    maxAttempts: 4
  };
  const sts = new STSClient(config);
  const cloudFormation = new CloudFormationClient(config);
  const ec2 = new EC2Client(config);
  const lambda = new LambdaClient(config);
  const logs = new CloudWatchLogsClient(config);
  const ssm = new SSMClient(config);
  const report: Record<string, unknown> = {};
  let state: State | undefined;
  const save = () => writeFile(options.stateFile, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  const agentPorts: number[] = [];

  const stackStatus = async (name: string) => {
    try {
      return (await cloudFormation.send(new DescribeStacksCommand({ StackName: name }))).Stacks?.[0]?.StackStatus;
    } catch (error) {
      if (error instanceof Error && /does not exist/i.test(error.message)) return undefined;
      throw error;
    }
  };
  const invoke = async (state: State, name: string, payload: unknown, stage = STAGE) => {
    const result = await lambda.send(
      new InvokeCommand({
        FunctionName: functionName(state, name, stage),
        Payload: Buffer.from(JSON.stringify(payload))
      })
    );
    const body = result.Payload ? JSON.parse(Buffer.from(result.Payload).toString()) : undefined;
    if (result.FunctionError) throw new Error(`${name} failed: ${JSON.stringify(body)}`);
    return body as Record<string, unknown>;
  };
  /** Counts the relay's port take-overs on the box since a time, from its journal, through SSM Run Command. */
  const readRelayTakeOvers = async (sinceEpochSeconds: number) => {
    const journal = `journalctl -u stacktape-relay --since @${sinceEpochSeconds} --no-pager -o cat`;
    const { Command } = await ssm.send(
      new SendCommandCommand({
        InstanceIds: [state!.boxInstanceId!],
        DocumentName: 'AWS-RunShellScript',
        Parameters: {
          commands: [
            `${journal} | grep -c 'taken over by' || true`,
            `${journal} | grep -c 'taken over by a new connection of the same session' || true`
          ]
        }
      })
    );
    const output = await waitUntil(
      'the relay journal',
      async () => {
        const invocation = await ssm.send(
          new GetCommandInvocationCommand({ CommandId: Command!.CommandId!, InstanceId: state!.boxInstanceId! })
        );
        check(invocation.Status === 'Success', `command ${invocation.Status}`);
        return invocation.StandardOutputContent ?? '';
      },
      60_000
    );
    const [all, sameSession] = output.trim().split(/\s+/).map(Number);
    return { otherSession: all - sameSession, sameSession };
  };
  const waitUntil = async <T>(description: string, probe: () => Promise<T>, timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs;
    let lastError = '';
    while (Date.now() < deadline) {
      try {
        return await probe();
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        await sleep(1000);
      }
    }
    throw new Error(`Timed out waiting for ${description}: ${lastError}`);
  };

  const cleanup = async () => {
    if (!state || state.cleanupVerified || !state.createAttempted) {
      if (state && !state.createAttempted) await rm(state.directory, { recursive: true, force: true });
      return;
    }
    for (const port of new Set([...agentPorts, ...(state.agentPorts ?? [])])) {
      await stopAgent(options, state, port).catch(() => {});
    }
    for (const child of startedProcesses) child.kill('SIGKILL');
    if (!state.awsAccountName) state.awsAccountName = await resolveAwsAccountName(options, state);
    for (const stage of STAGES) {
      if (existsSync(projectDirectory(state)) && (await stackStatus(stackName(state, stage)))) {
        const started = Date.now();
        const run = await runCli(options, state, [
          'delete',
          ...stackArgs(options, state, stage),
          '--autoConfirmOperation'
        ]);
        check(run.exitCode === 0, `delete of the dev stage ${stage} failed (${run.exitCode}):\n${tail(run.output)}`);
        report[`devStackDeleteSeconds_${stage}`] = (Date.now() - started) / 1000;
      }
      check(!(await stackStatus(stackName(state, stage))), `The dev stack of ${stage} still exists.`);
    }
    if (await stackStatus(networkName(state))) {
      const started = Date.now();
      const run = await runCli(options, state, [
        'dev:network:delete',
        '--region',
        options.region,
        '--profile',
        options.profile,
        '--awsAccount',
        state.awsAccountName,
        '--autoConfirmOperation'
      ]);
      check(run.exitCode === 0, `dev network delete failed (${run.exitCode}):\n${tail(run.output)}`);
      report.networkDeleteSeconds = (Date.now() - started) / 1000;
    }
    check(!(await stackStatus(networkName(state))), 'The dev network stack still exists.');
    // Exact names and the owned network authorize these checks; nothing is discovered from a broad prefix.
    if (state.boxInstanceId) {
      const instance = (await ec2.send(new DescribeInstancesCommand({ InstanceIds: [state.boxInstanceId] })))
        .Reservations?.[0]?.Instances?.[0];
      check(!instance || instance.State?.Name === 'terminated', 'The dev box instance remains.');
      const sessions = await ssm.send(
        new DescribeSessionsCommand({ State: 'Active', Filters: [{ key: 'Target', value: state.boxInstanceId }] })
      );
      for (const { SessionId } of sessions.Sessions ?? []) {
        if (SessionId) await ssm.send(new TerminateSessionCommand({ SessionId }));
      }
      const interfaces = await ec2.send(
        new DescribeNetworkInterfacesCommand({
          Filters: [{ Name: 'attachment.instance-id', Values: [state.boxInstanceId] }]
        })
      );
      check(!interfaces.NetworkInterfaces?.length, 'An interface of the dev box remains.');
    }
    const addresses = await ec2.send(
      new DescribeAddressesCommand({ Filters: [{ Name: 'tag:stacktape:dev-network', Values: [networkName(state)] }] })
    );
    check(!addresses.Addresses?.length, 'An Elastic IP of the dev network remains.');
    const leases = await ssm.send(
      new GetParametersByPathCommand({ Path: getDevNetworkLeaseParameterPrefix(networkName(state)), Recursive: true })
    );
    const leaseNames = (leases.Parameters ?? []).map(({ Name }) => Name!).filter(Boolean);
    if (leaseNames.length) await ssm.send(new DeleteParametersCommand({ Names: leaseNames }));
    const remainingFunctions: string[] = [];
    let marker: string | undefined;
    do {
      const page = await lambda.send(new ListFunctionsCommand({ Marker: marker }));
      for (const { FunctionName } of page.Functions ?? []) {
        if (
          STAGES.some((stage) => FunctionName?.startsWith(`${stackName(state!, stage)}-`)) ||
          FunctionName === `${networkName(state)}-keeper`
        ) {
          remainingFunctions.push(FunctionName);
        }
      }
      marker = page.NextMarker;
    } while (marker);
    check(!remainingFunctions.length, `Functions remain: ${remainingFunctions.join(', ')}.`);
    for (const groupName of [
      ...STAGES.flatMap((stage) => FUNCTIONS.map((name) => `/aws/lambda/${functionName(state!, name, stage)}`)),
      `/aws/lambda/${networkName(state)}-keeper`
    ]) {
      const exists = (await logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: groupName }))).logGroups?.some(
        ({ logGroupName }) => logGroupName === groupName
      );
      if (exists) await logs.send(new DeleteLogGroupCommand({ logGroupName: groupName }));
    }
    const containers = spawnSync('docker', ['ps', '-a', '--format', '{{.Names}}'], { encoding: 'utf8' })
      .stdout.split('\n')
      .filter((name) => name.includes(state!.projectName));
    for (const container of containers) spawnSync('docker', ['rm', '-f', '-v', container], { stdio: 'ignore' });
    check(
      !findProcesses('session-manager-plugin', state.boxInstanceId ?? state.networkSuffix).length,
      'An SSM plugin remains.'
    );
    // The database containers own the files they wrote; remove them as root from the image that wrote them.
    for (const dataDirectory of [projectDirectory(state), secondMachineDirectory(state)].map((directory) =>
      join(directory, '.stacktape', 'dev-data')
    )) {
      if (!existsSync(dataDirectory)) continue;
      spawnSync(
        'docker',
        [
          'run',
          '--rm',
          '--user',
          '0',
          '--entrypoint',
          'rm',
          '-v',
          `${dataDirectory}:/dev-data`,
          'postgres:16.4'
        ].concat(['-rf', ...STAGES.map((stage) => `/dev-data/${stage}`)]),
        { stdio: 'ignore', timeout: 120_000 }
      );
    }
    await rm(state.directory, { recursive: true, force: true });
    state.cleanupVerified = true;
    await save();
    console.info(
      'Lambda dev canary cleanup verified: dev stack, dev network, box, interfaces, leases, functions, log groups, SSM sessions and containers removed.'
    );
  };

  let failure: unknown;
  try {
    check(
      (await sts.send(new GetCallerIdentityCommand({}))).Account === options.accountId,
      'The profile account differs from the expected account.'
    );
    if (cleanupOnly) {
      state = validateLambdaDevRecoveryState(JSON.parse(await readFile(options.stateFile, 'utf8')), options);
      await cleanup();
      return;
    }
    check(!(await Bun.file(options.stateFile).exists()), 'Recovery state already exists; run --cleanup-only first.');
    const suffix = randomBytes(4).toString('hex');
    state = {
      accountId: options.accountId,
      owner: options.owner,
      region: options.region,
      projectName: `v4lambdadev-${suffix}`,
      networkSuffix: options.networkSuffix ?? suffix,
      directory: await mkdtemp(join(tmpdir(), 'stacktape-lambda-dev-')),
      createAttempted: false
    };
    await save();
    for (const stage of STAGES) {
      check(!(await stackStatus(stackName(state, stage))), `The dev stack name of ${stage} is already taken.`);
    }
    check(!(await stackStatus(networkName(state))), 'The dev network name is already taken.');
    state.awsAccountName = await resolveAwsAccountName(options, state);
    await writeFixture(state);
    state.createAttempted = true;
    await save();

    // 1. First creation of the dev network and the dev stack. The session watches the sources for step 2b.
    const agentPort = 7400 + Math.floor(Math.random() * 400);
    agentPorts.push(agentPort);
    state.agentPorts = [...new Set([...(state.agentPorts ?? []), agentPort])];
    await save();
    const first = await startAgent(options, state, agentPort, STAGE, { extraArgs: ['--watch'] });
    report.firstStartSeconds = first.seconds;
    check(first.tokenFile, 'dev --agent did not report its token file.');
    const firstAgent = { port: agentPort, tokenFile: first.tokenFile };
    const network = await cloudFormation.send(new DescribeStacksCommand({ StackName: networkName(state) }));
    const output = (key: string) =>
      network.Stacks?.[0]?.Outputs?.find(({ OutputKey }) => OutputKey === key)?.OutputValue;
    state.boxInstanceId = output('BoxInstanceId');
    check(state.boxInstanceId, 'The dev network has no box output.');
    await save();
    const boxIp = output('BoxPrivateIp');

    // 2. Every function reaches the local databases through the box; the VPC function also reaches the internet.
    const password = DATABASE_PASSWORD;
    const databasePort = await waitUntil(
      'the local database port',
      async () => {
        const line = spawnSync('docker', ['ps', '--format', '{{.Names}} {{.Ports}}'], { encoding: 'utf8' })
          .stdout.split('\n')
          .find((entry) => entry.includes(state!.projectName) && entry.includes('5432/tcp'));
        const port = Number(line?.match(/127\.0\.0\.1:(\d+)->5432/)?.[1]);
        check(port, 'not yet');
        return port;
      },
      60_000
    );
    const db = new Client({ connectionString: `postgresql://postgres:${password}@127.0.0.1:${databasePort}/postgres` });
    // The first session stops its database when the second machine takes the stage over.
    db.on('error', () => {});
    await db.connect();
    try {
      await db.query(
        "create table if not exists dev_values(value text); delete from dev_values; insert into dev_values values ('first');"
      );
      const results: Record<string, unknown> = {};
      for (const name of FUNCTIONS) {
        const answer = await waitUntil(
          `${name} to read the local database`,
          () => invoke(state!, name, { op: 'db' }),
          120_000
        );
        check(answer.value === 'first' && answer.host === boxIp, `${name} read ${JSON.stringify(answer)}.`);
        results[name] = answer;
      }
      report.firstQueries = results;
      await db.query("update dev_values set value = 'edited'");
      for (const name of FUNCTIONS) {
        check((await invoke(state, name, { op: 'db' })).value === 'edited', `${name} did not read the edited row.`);
      }
      report.redis = await invoke(state, 'queryArm', { op: 'cache' });
      check((report.redis as { reply?: string }).reply === 'PONG', 'Redis did not answer through the box.');
      const box = (await ec2.send(new DescribeInstancesCommand({ InstanceIds: [state.boxInstanceId] })))
        .Reservations?.[0]?.Instances?.[0];
      const egress = await waitUntil(
        'NAT egress through the box',
        () => invoke(state!, 'vpcEgress', { op: 'egress' }),
        180_000
      );
      check(egress.ip === box?.PublicIpAddress, `The VPC function left through ${egress.ip}, not the box.`);
      const latency: number[] = [];
      for (let i = 0; i < 5; i++) latency.push(Number((await invoke(state, 'queryArm', { op: 'db' })).selectP50Ms));
      report.selectP50Ms = latency;

      // 3. Laptop reconnect: kill the SSM plugin; the session supervisor and the tunnels recover on their own.
      const plugins = findProcesses('session-manager-plugin', state.boxInstanceId);
      check(plugins.length, 'No SSM plugin runs for the dev box.');
      const killedAt = Date.now();
      for (const pid of plugins) process.kill(pid, 'SIGKILL');
      await sleep(1000);
      await waitUntil(
        'the functions to reach the database after the reconnect',
        () => invoke(state!, 'queryArm', { op: 'db' }),
        120_000
      );
      report.reconnectSeconds = (Date.now() - killedAt) / 1000;

      // A second developer's stage on the same box at the same time: a second SSM session and its own relay ports.
      const secondPort = agentPort + 1;
      agentPorts.push(secondPort);
      state.agentPorts = [...new Set([...(state.agentPorts ?? []), secondPort])];
      await save();
      const second = await startAgent(options, state, secondPort, SECOND_STAGE);
      report.secondStageStartSeconds = second.seconds;
      const ping = await waitUntil(
        'the second stage to reach its local database',
        () => invoke(state!, 'queryArm', { op: 'ping' }, SECOND_STAGE),
        120_000
      );
      check(ping.ping === 1, `The second stage answered ${JSON.stringify(ping)}.`);
      check((await invoke(state, 'queryX86', { op: 'db' })).value === 'edited', 'The first stage lost its database.');
      const sessions = await ssm.send(
        new DescribeSessionsCommand({ State: 'Active', Filters: [{ key: 'Target', value: state.boxInstanceId }] })
      );
      report.concurrentSessions = sessions.Sessions?.length;
      check((sessions.Sessions?.length ?? 0) >= 2, 'The two stages do not hold two SSM sessions.');
      await stopAgent(options, state, secondPort);
      agentPorts.splice(agentPorts.indexOf(secondPort), 1);

      // 2b. Results an agent can trust. A syntax error in the entry file of all three functions: the watcher's
      // rebuild and an explicit one fail with the build error, the functions stay failed and keep their old code.
      report.trustworthyResults = await checkTrustworthyResults({
        agent: firstAgent,
        state,
        lambda,
        invoke: () => invoke(state!, 'queryArm', { op: 'db' }),
        waitUntil
      });

      // 4. One stage, two machines. The second machine's session of the running stage stops before it deploys.
      const secondMachine = secondMachineDirectory(state);
      await writeFixture(state, secondMachine);
      const secondMachinePort = agentPort + 2;
      agentPorts.push(secondMachinePort);
      state.agentPorts = [...new Set([...(state.agentPorts ?? []), secondMachinePort])];
      await save();
      const refusedAt = Date.now();
      const refused = await runAgent(options, state, secondMachinePort, { directory: secondMachine });
      report.secondMachineRefusedSeconds = (Date.now() - refusedAt) / 1000;
      check(
        refused.exitCode !== 0 && refused.output.includes('DEV_STAGE_RUNNING_ELSEWHERE'),
        `The second machine's session was not refused (${refused.exitCode}):\n${tail(refused.output)}`
      );
      check((await invoke(state, 'queryArm', { op: 'db' })).value === 'edited', 'The refused session took the stage.');

      // `dev network delete` refuses while a session runs, and names it.
      const deleteAt = Date.now();
      const refusedDelete = await runCli(options, state, [
        'dev:network:delete',
        '--region',
        options.region,
        '--profile',
        options.profile,
        '--awsAccount',
        state.awsAccountName,
        '--autoConfirmOperation',
        '--agent'
      ]);
      report.networkDeleteRefusedSeconds = (Date.now() - deleteAt) / 1000;
      check(
        refusedDelete.exitCode !== 0 &&
          refusedDelete.result?.code === 'DEV_NETWORK_SESSIONS_LIVE' &&
          refusedDelete.output.includes(stackName(state)),
        `dev network delete did not refuse the live session (${refusedDelete.exitCode}):\n${tail(refusedDelete.output)}`
      );
      check((await stackStatus(networkName(state)))?.endsWith('_COMPLETE'), 'The refused delete changed the network.');

      // `--takeOver` moves the stage to the second machine once: its database answers the deployed functions, a warm
      // function's pooled connection to the first machine is closed, and the first session stops itself.
      // A reason left by an earlier run on this port must not pass for this session's.
      await rm(localStatePaths.devAgentStopReasonFile({ port: agentPort }), { force: true });
      const pooledBefore = await invoke(state, 'queryArm', { op: 'pooled' });
      check(pooledBefore.value === 'edited', `The pooled connection read ${JSON.stringify(pooledBefore)}.`);
      const takeOverSince = Math.floor(Date.now() / 1000) - 120;
      const takeOver = await startAgent(options, state, secondMachinePort, STAGE, {
        directory: secondMachine,
        extraArgs: ['--takeOver']
      });
      report.takeOverStartSeconds = takeOver.seconds;
      const secondDatabasePort = await waitUntil(
        'the second machine database port',
        async () => {
          const port = spawnSync('docker', ['ps', '--format', '{{.Names}} {{.Ports}}'], { encoding: 'utf8' })
            .stdout.split('\n')
            .filter((entry) => entry.includes(state!.projectName) && entry.includes('5432/tcp'))
            .map((entry) => Number(entry.match(/127\.0\.0\.1:(\d+)->5432/)?.[1]))
            .find((candidate) => candidate && candidate !== databasePort);
          check(port, 'not yet');
          return port;
        },
        60_000
      );
      const secondDb = new Client({
        connectionString: `postgresql://postgres:${password}@127.0.0.1:${secondDatabasePort}/postgres`
      });
      await secondDb.connect();
      try {
        await secondDb.query(
          "create table if not exists dev_values(value text); delete from dev_values; insert into dev_values values ('second-machine');"
        );
      } finally {
        await secondDb.end().catch(() => {});
      }
      await waitUntil(
        'the functions to read the second machine database',
        async () => check((await invoke(state!, 'queryArm', { op: 'db' })).value === 'second-machine', 'not yet'),
        60_000
      );
      const pooledAfter = await invoke(state, 'queryArm', { op: 'pooled' });
      report.pooledAfterTakeOver = pooledAfter;
      check(
        pooledAfter.environmentId === pooledBefore.environmentId,
        `Lambda replaced the warm environment, so the pooled connection proves nothing: ${JSON.stringify(pooledAfter)}.`
      );
      check(
        pooledAfter.value === 'second-machine' && pooledAfter.reconnected === true,
        `The warm pooled connection still reached the first machine: ${JSON.stringify(pooledAfter)}.`
      );
      const firstAgentGone = await waitUntil(
        'the first session to stop itself',
        async () => {
          const stopped = JSON.parse(
            await readFile(localStatePaths.devAgentStopReasonFile({ port: agentPort }), 'utf8')
          ) as { code?: string; message?: string; pid?: number };
          check(stopped.code === 'DEV_STAGE_TAKEN_OVER', 'no reason yet');
          check(stopped.pid && !existsSync(`/proc/${stopped.pid}`), 'still running');
          return stopped;
        },
        60_000
      );
      report.firstSessionStopReason = firstAgentGone.message;
      check(
        firstAgentGone.message?.includes(secondMachine),
        `The stop reason does not name the second machine's session: ${firstAgentGone.message}`
      );
      await sleep(20_000);
      const relayTakeOvers = await readRelayTakeOvers(takeOverSince);
      report.relayTakeOversAfterTakeOver = relayTakeOvers;
      // One take-over per relayed database (db and cache); a ping-pong logs hundreds per minute.
      check(relayTakeOvers.otherSession === 2, `The relay logged ${JSON.stringify(relayTakeOvers)} take-overs.`);
      check(
        (await invoke(state, 'queryX86', { op: 'db' })).value === 'second-machine',
        'The first session took the stage back.'
      );
      await stopAgent(options, state, secondMachinePort);
      agentPorts.splice(agentPorts.indexOf(secondMachinePort), 1);
    } finally {
      await db.end().catch(() => {});
    }
    // The first session stopped itself when the second machine took the stage over.

    // 5. Box stop and wake: stop the box as its idle stop would; the next session starts it.
    await ec2.send(new StopInstancesCommand({ InstanceIds: [state.boxInstanceId] }));
    await waitUntil(
      'the box to stop',
      async () => {
        const stateName = (await ec2.send(new DescribeInstancesCommand({ InstanceIds: [state!.boxInstanceId!] })))
          .Reservations?.[0]?.Instances?.[0]?.State?.Name;
        check(stateName === 'stopped', `box is ${stateName}`);
      },
      300_000
    );
    const status = await runCli(options, state, [
      'dev:network',
      '--region',
      options.region,
      '--profile',
      options.profile,
      '--awsAccount',
      state.awsAccountName,
      '--agent'
    ]);
    const shown = status.result?.data?.result as { box?: { state?: string }; devFunctions?: string[] } | undefined;
    check(
      shown?.box?.state === 'stopped' &&
        STAGES.every((stage) =>
          FUNCTIONS.every((name) => shown.devFunctions?.includes(functionName(state!, name, stage)))
        ),
      `dev network did not show the stopped box and the dev functions: ${JSON.stringify(shown)}`
    );
    const wake = await startAgent(options, state, agentPort);
    report.wakeStartSeconds = wake.seconds;
    const queryAt = Date.now();
    await waitUntil(
      'a query after the wake',
      async () => check((await invoke(state!, 'queryX86', { op: 'db' })).value === 'edited', 'not the first database'),
      180_000
    );
    report.firstQueryAfterWakeSeconds = (Date.now() - queryAt) / 1000;
    await stopAgent(options, state, agentPort);

    // 6. The box stops while a session starts, as an idle stop that lands during the dev stack update would: once the
    // new session has its SSM session to the box, stop the box. The session must start it again and open its tunnels.
    const activeSessionIds = async () =>
      new Set(
        (
          await ssm.send(
            new DescribeSessionsCommand({ State: 'Active', Filters: [{ key: 'Target', value: state.boxInstanceId }] })
          )
        ).Sessions?.map(({ SessionId }) => SessionId!)
      );
    const earlierSessions = await activeSessionIds();
    const stopping = { done: false, stoppedAt: 0 };
    const stopper = (async () => {
      const deadline = Date.now() + 10 * 60_000;
      while (!stopping.done && Date.now() < deadline) {
        if ([...(await activeSessionIds())].some((id) => !earlierSessions.has(id))) {
          await ec2.send(new StopInstancesCommand({ InstanceIds: [state!.boxInstanceId!] }));
          stopping.stoppedAt = Date.now();
          return;
        }
        await sleep(500);
      }
    })();
    const interrupted = await startAgent(options, state, agentPort).finally(() => (stopping.done = true));
    await stopper;
    check(stopping.stoppedAt, 'The session opened no SSM session to the box, so the box was not stopped.');
    report.stopDuringStartupStartSeconds = interrupted.seconds;
    await waitUntil(
      'a query after the box stopped during startup',
      () => invoke(state!, 'queryArm', { op: 'db' }),
      480_000
    );
    report.recoveredAfterStopDuringStartupSeconds = (Date.now() - stopping.stoppedAt) / 1000;
    await stopAgent(options, state, agentPort);
    agentPorts.length = 0;
    console.info(
      'Deployed arm64, x86_64 and VPC functions read local PostgreSQL and Redis through the dev box, reconnected after a killed SSM plugin, refused and then took over a stage from a second machine once, refused a network delete during a session, woke a stopped box, and recovered from a box that stopped during session startup.'
    );
  } catch (error) {
    failure = error;
  } finally {
    try {
      await cleanup();
    } catch (error) {
      console.error('Cleanup failed:', error instanceof Error ? error.message : 'unknown error');
      failure ??= error;
    }
    if (state && state.createAttempted && !state.cleanupVerified) {
      console.error(
        `Cleanup incomplete. Recover with ${PREFIX}DEPLOY=1 ${PREFIX}CONFIRM_DISPOSABLE=this-is-a-disposable-test-account ${PREFIX}PROFILE=stacktape-e2e ${PREFIX}EXPECTED_ACCOUNT_ID=${options.accountId} ${PREFIX}OWNER=${options.owner} ${PREFIX}STATE_FILE=${options.stateFile} pnpm --filter @stacktape/cli run test:real-aws-lambda-dev -- --cleanup-only`
      );
    }
    if (options.reportFile) await writeFile(options.reportFile, JSON.stringify(report, null, 2) + '\n');
    console.info(JSON.stringify(report, null, 2));
    for (const client of [sts, cloudFormation, ec2, lambda, logs, ssm]) client.destroy();
  }
  if (failure) throw failure;
};

const agentStatus = async (agent: { port: number; tokenFile: string }) => {
  const status = await callAgent(agent, 'GET', '/status?verbose=true');
  return status.data as {
    ready: boolean;
    restartRequired?: string;
    failedWorkloads: { name: string; error: string }[];
    workloads: { name: string; status: string }[];
    logFile: string;
  };
};

const checkTrustworthyResults = async ({
  agent,
  state,
  lambda,
  invoke,
  waitUntil
}: {
  agent: { port: number; tokenFile: string };
  state: State;
  lambda: LambdaClient;
  invoke: () => Promise<Record<string, unknown>>;
  waitUntil: <T>(description: string, probe: () => Promise<T>, timeoutMs: number) => Promise<T>;
}) => {
  const results: Record<string, unknown> = {};
  const entryFile = join(projectDirectory(state), 'src/query.ts');
  const configFile = join(projectDirectory(state), 'stacktape.yml');
  const source = await readFile(entryFile, 'utf8');
  const config = await readFile(configFile, 'utf8');
  const codeSha = async (name: string) =>
    (await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: functionName(state, name) }))).CodeSha256;
  const shasBefore = await Promise.all(FUNCTIONS.map(codeSha));

  // The watcher rebuilds every function built from the file and marks each failed.
  const editedAt = Date.now();
  await writeFile(entryFile, `${source}\nexport const broken = (;\n`);
  const failedStatus = await waitUntil(
    'the watcher to report the failed build',
    async () => {
      const status = await agentStatus(agent);
      check(status.failedWorkloads.length === FUNCTIONS.length, `failed: ${JSON.stringify(status.failedWorkloads)}`);
      return status;
    },
    120_000
  );
  results.watchFailureReportedSeconds = (Date.now() - editedAt) / 1000;
  check(!failedStatus.ready, 'The session reported ready with failed builds.');
  check(
    failedStatus.failedWorkloads.every(({ error }) => /unexpected/i.test(error)),
    `The failed builds do not carry the build error: ${JSON.stringify(failedStatus.failedWorkloads)}.`
  );
  check(readFileSync(failedStatus.logFile, 'utf8').includes('Rebuild failed'), 'The log file has no rebuild failure.');

  // An explicit rebuild of the broken file fails with the error and the log path; the old code keeps serving.
  const rebuildStarted = Date.now();
  const rebuild = await callAgent(agent, 'POST', '/rebuild/queryArm');
  results.failedRebuildMs = Date.now() - rebuildStarted;
  results.failedRebuild = { ok: rebuild.ok, code: rebuild.code, message: rebuild.message };
  check(
    rebuild.ok === false && rebuild.code === 'REBUILD_FAILED' && /unexpected/i.test(rebuild.message ?? ''),
    `A rebuild of a broken file answered ${JSON.stringify(rebuild)}.`
  );
  check(rebuild.data?.logFile === failedStatus.logFile, 'The failed rebuild did not name the log file.');
  check((await agentStatus(agent)).failedWorkloads.length === FUNCTIONS.length, 'A function lost its failed status.');
  const shasAfterFailure = await Promise.all(FUNCTIONS.map(codeSha));
  check(
    shasAfterFailure.every((sha, index) => sha === shasBefore[index]),
    'A failed build changed the deployed code.'
  );
  check((await invoke()).value === 'edited', 'The function stopped serving its previous code.');

  // The fix lands through the watcher and the session is ready again.
  const fixedAt = Date.now();
  await writeFile(entryFile, source);
  await waitUntil(
    'the watcher to deploy the fixed file',
    async () => {
      const status = await agentStatus(agent);
      check(status.ready, `not ready: ${JSON.stringify(status.failedWorkloads)}`);
    },
    180_000
  );
  results.watchFixReadySeconds = (Date.now() - fixedAt) / 1000;

  // A configuration edit cannot be applied by a rebuild: readiness waits for a restart and a rebuild refuses.
  const timeoutBefore = (
    await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: functionName(state, 'queryArm') }))
  ).Timeout;
  const configEditedAt = Date.now();
  await writeFile(configFile, config.replace('timeout: 30', 'timeout: 31'));
  const restartStatus = await waitUntil(
    'the watcher to report the configuration change',
    async () => {
      const status = await agentStatus(agent);
      check(status.restartRequired, 'no restart required yet');
      return status;
    },
    60_000
  );
  results.configChangeReportedSeconds = (Date.now() - configEditedAt) / 1000;
  check(!restartStatus.ready, 'The session reported ready with a changed configuration.');
  const refused = await callAgent(agent, 'POST', '/rebuild/queryArm');
  results.configChangedRebuild = { ok: refused.ok, code: refused.code };
  check(
    refused.ok === false && refused.code === 'CONFIG_CHANGED_RESTART_REQUIRED',
    `A rebuild after a configuration change answered ${JSON.stringify(refused)}.`
  );
  const timeoutAfter = (
    await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: functionName(state, 'queryArm') }))
  ).Timeout;
  check(timeoutAfter === timeoutBefore, 'The refused rebuild changed the function configuration.');
  check(
    (await agentStatus(agent)).failedWorkloads.some(({ name }) => name === 'queryArm'),
    'The refused workload does not report that it was not rebuilt.'
  );

  // Reverting the configuration rebuilds the refused workload; the session is ready only after that.
  const restoredAt = Date.now();
  await writeFile(configFile, config);
  await waitUntil(
    'the session to be ready after the configuration was restored',
    async () => {
      const status = await agentStatus(agent);
      check(status.ready && !status.restartRequired, 'still waiting for a restart');
    },
    120_000
  );
  results.refusedRebuildDeployedAfterRestoreSeconds = (Date.now() - restoredAt) / 1000;
  const rebuilt = await callAgent(agent, 'POST', '/rebuild/queryArm');
  check(rebuilt.ok, `A rebuild after the restore answered ${JSON.stringify(rebuilt)}.`);
  check((await invoke()).value === 'edited', 'The rebuilt function does not read the database.');
  return results;
};

const resolveAwsAccountName = async (options: Options, state: State) => {
  const run = await runCli(options, state, ['info:whoami', '--agent']);
  const whoami = (run.result?.data?.result ?? {}) as {
    connectedAwsAccounts?: Array<{ awsAccountId?: string; state?: string; name?: string }>;
  };
  const matching = (whoami.connectedAwsAccounts ?? []).filter(
    ({ awsAccountId, state: connectionState }) => awsAccountId === options.accountId && connectionState === 'ACTIVE'
  );
  check(
    matching.length === 1 && matching[0].name,
    `Expected one active Stacktape connection to account ${options.accountId}, found ${matching.length}.`
  );
  return matching[0].name;
};

if (import.meta.main) {
  runLambdaDevCanary(process.argv.includes('--cleanup-only')).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Lambda dev canary failed.');
    process.exitCode = 1;
  });
}
