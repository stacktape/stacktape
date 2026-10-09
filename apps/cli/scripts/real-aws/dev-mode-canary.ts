/**
 * Real-AWS journey for `stacktape dev`: the local development loop a developer runs many times a day.
 *
 * `dev` always runs against a dev stack in AWS (IAM roles the local containers assume, the deployment bucket), so this
 * deploys one through the source CLI on the first session and reuses it for the rest. Every session runs the sample
 * app in `_test-stacks/dev-mode` (a container API, a local PostgreSQL database and a hosting-bucket dev server with a
 * detached watcher) from a fresh copy and, after it ends, requires that none of the processes, containers or ports it
 * started remain.
 *
 * 1. `first-run-agent`: `dev --agent` deploys the dev stack (tagged like a deployed stack) and starts everything; the API
 *    answers and reaches the local database; an edit plus `POST /rebuild/api` changes the answer; the agent's database
 *    endpoint answers; `dev:stop --agentPort` returns only after the agent is gone.
 * 2. `interactive-watch-ctrl-c`: in a terminal (PTY), a warm start reuses the stack without updating it, `--watch`
 *    rebuilds the API after an edit, and Ctrl+C ends the session with status 0.
 * 3. `terminal-sigterm`: `dev:stop --cleanupContainers` keeps a running terminal session's containers, and SIGTERM to the
 *    session (what closing the terminal or a process manager sends) ends it.
 * 4. `occupied-ports-sigterm`: with the default container and dev-server ports held by other processes, `dev --agent`
 *    still serves both workloads elsewhere and leaves the other listeners alone; SIGTERM ends the agent.
 * 5. `failed-startup`: an API that crashes on start is reported as failed; an unknown `--resources` name fails before
 *    anything starts.
 *
 * Guardrails (docs/testing/live-aws.md): explicit opt-in; STS must resolve the profile to the expected account and the
 * CLI uses the single active Stacktape connection to it; a new `v4devcanary-` project with the run's owner tag; recovery
 * state written before the first deploy; cleanup in `finally`, verified with AWS; one exact `--cleanup-only` command
 * when cleanup does not finish. Linux only: leftover processes are found through `/proc`. Docker must be running.
 *
 *   STP_AWS_DEV_CANARY_DEPLOY=1 STP_AWS_DEV_CANARY_EXPECTED_ACCOUNT_ID=<12 digits> STP_AWS_DEV_CANARY_PROFILE=<name>
 *   STP_AWS_DEV_CANARY_OWNER=<run id> STP_AWS_DEV_CANARY_STATE_FILE=<absolute path>
 *   [STP_AWS_DEV_CANARY_REPORT=<absolute path>] [STP_AWS_DEV_CANARY_REGION=eu-west-1]
 *   [STP_AWS_DEV_CANARY_SCENARIOS=first-run-agent,…]
 *   pnpm --filter @stacktape/cli run test:real-aws-dev-canary [-- --cleanup-only]
 */
import {
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStackResourcesCommand,
  DescribeStacksCommand,
  waitUntilStackDeleteComplete,
  type Stack
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, DeleteLogGroupCommand, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DescribeRepositoriesCommand, ECRClient } from '@aws-sdk/client-ecr';
import { GetRoleCommand, IAMClient } from '@aws-sdk/client-iam';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { tagNames } from '@stacktape/naming/tag-names';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cp, mkdir, readdir, readFile, readlink, rm, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { createConnection, createServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import stripAnsi from 'strip-ansi';

type Environment = Record<string, string | undefined>;
type ScenarioName =
  | 'first-run-agent'
  | 'interactive-watch-ctrl-c'
  | 'terminal-sigterm'
  | 'occupied-ports-sigterm'
  | 'failed-startup';
export type Options = {
  expectedAccountId: string;
  profile: string;
  region: string;
  projectName: string;
  stage: string;
  owner: string;
  stateFile: string;
  reportFile?: string;
  scenarios: ScenarioName[];
};
type State = {
  accountId: string;
  region: string;
  projectName: string;
  stage: string;
  stackName: string;
  owner: string;
  awsAccountName: string;
  workDirectory: string;
  stackId?: string;
  deploymentBucket?: string;
  repositoryNames?: string[];
  roleNames?: string[];
  logGroupNames?: string[];
  cleanupVerifiedAt?: string;
};
type Clients = {
  cloudFormation: CloudFormationClient;
  ecr: ECRClient;
  iam: IAMClient;
  logs: CloudWatchLogsClient;
  s3: S3Client;
  sts: STSClient;
};
type AgentRecord = Record<string, unknown> & { type: string };
type Check = { scenario: ScenarioName | 'setup'; check: string; ok: boolean; detail?: string };

const PREFIX = 'STP_AWS_DEV_CANARY_';
const SCENARIOS: ScenarioName[] = [
  'first-run-agent',
  'interactive-watch-ctrl-c',
  'terminal-sigterm',
  'occupied-ports-sigterm',
  'failed-startup'
];
const OWNER_TAG = 'stacktape-canary-owner';
const CLI_DIRECTORY = join(import.meta.dir, '..', '..');
const FIXTURE_DIRECTORY = join(CLI_DIRECTORY, '_test-stacks', 'dev-mode');
const COMMAND_TIMEOUT_MS = 20 * 60 * 1000;
const READY_TIMEOUT_MS = 4 * 60 * 1000;
const STOP_TIMEOUT_MS = 45_000;

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const resolveOptions = (env: Environment = process.env): Options => {
  assert(env[`${PREFIX}DEPLOY`] === '1', `Refusing to mutate AWS without explicit opt-in. Set ${PREFIX}DEPLOY=1.`);
  assert(
    !Object.keys(env).some((name) => name === 'AWS_ENDPOINT_URL' || name.startsWith('AWS_ENDPOINT_URL_')),
    'Refusing to run while an AWS endpoint override is set.'
  );
  assert(process.platform === 'linux', 'The dev-mode canary inspects /proc and runs on Linux only.');
  const expectedAccountId = env[`${PREFIX}EXPECTED_ACCOUNT_ID`]?.trim() ?? '';
  assert(/^\d{12}$/.test(expectedAccountId), `${PREFIX}EXPECTED_ACCOUNT_ID must be the exact 12-digit account id.`);
  const profile = env[`${PREFIX}PROFILE`]?.trim() ?? '';
  assert(/^[\w.-]{1,64}$/.test(profile), `${PREFIX}PROFILE must name the exact local AWS profile.`);
  const region = env[`${PREFIX}REGION`]?.trim() || 'eu-west-1';
  assert(/^[a-z]{2}(?:-[a-z0-9]+)+-\d+$/.test(region), `${PREFIX}REGION must be an AWS region.`);
  const owner = env[`${PREFIX}OWNER`]?.trim() ?? '';
  assert(/^[\w.:-]{1,128}$/.test(owner), `${PREFIX}OWNER must identify this run.`);
  const projectName =
    env[`${PREFIX}PROJECT_NAME`]?.trim() || `v4devcanary-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`;
  assert(
    projectName.length <= 32 && /^v4devcanary-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(projectName),
    `${PREFIX}PROJECT_NAME must start with v4devcanary- and contain only lowercase letters, digits and dashes.`
  );
  const stateFile = env[`${PREFIX}STATE_FILE`]?.trim() ?? '';
  assert(isAbsolute(stateFile), `${PREFIX}STATE_FILE must be an absolute path.`);
  const reportFile = env[`${PREFIX}REPORT`]?.trim();
  assert(!reportFile || isAbsolute(reportFile), `${PREFIX}REPORT must be an absolute path.`);
  const requested = env[`${PREFIX}SCENARIOS`]?.trim();
  const scenarios = requested
    ? requested.split(',').map((name) => {
        const scenario = name.trim() as ScenarioName;
        assert(SCENARIOS.includes(scenario), `${PREFIX}SCENARIOS names an unknown scenario: ${name}.`);
        return scenario;
      })
    : SCENARIOS;
  // The stage is derived from the project, so the local container names (`stp-<stage>-<resource>`) are this run's own.
  const stage = `c${projectName.slice(-4)}`;
  return {
    expectedAccountId,
    profile,
    region,
    projectName,
    stage,
    owner,
    stateFile,
    scenarios,
    ...(reportFile && { reportFile })
  };
};

const createClients = ({ profile, region }: Options): Clients => {
  const config = { credentials: fromIni({ profile }), region, maxAttempts: 6, ignoreConfiguredEndpointUrls: true };
  return {
    cloudFormation: new CloudFormationClient(config),
    ecr: new ECRClient(config),
    iam: new IAMClient({ ...config, region: 'us-east-1' }),
    logs: new CloudWatchLogsClient(config),
    s3: new S3Client(config),
    sts: new STSClient(config)
  };
};

/** Whether `apps/cli/.env.local` sets a non-empty API key. Only the answer leaves this function, never the value. */
const hasDevApiKey = async () => {
  const content = await readFile(join(CLI_DIRECTORY, '.env.local'), 'utf8').catch(() => '');
  const value = content
    .match(/^\s*STACKTAPE_API_KEY\s*=\s*(.*)$/m)?.[1]
    ?.trim()
    .replace(/^(["'])(.*)\1$/, '$2');
  return Boolean(value);
};

const describeStack = async (client: CloudFormationClient, stackName: string): Promise<Stack | undefined> => {
  try {
    return (await client.send(new DescribeStacksCommand({ StackName: stackName }))).Stacks?.[0];
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError' && /does not exist/i.test(error.message)) {
      return undefined;
    }
    throw error;
  }
};

const stackOwner = (stack: Stack) => stack.Tags?.find(({ Key }) => Key === OWNER_TAG)?.Value;

const writeState = (options: Options, state: State) =>
  writeFile(options.stateFile, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });

const readState = async (options: Options): Promise<State> => {
  const state = JSON.parse(await readFile(options.stateFile, 'utf8')) as State;
  assert(state.accountId === options.expectedAccountId, 'The state file belongs to another AWS account.');
  assert(state.owner === options.owner, 'The state file belongs to another run.');
  return state;
};

// ─── CLI processes ──────────────────────────────────────────────────────────────────────────────────────────────

/** Every process this run started, so `finally` can end what a failed assertion left behind. */
const startedProcesses = new Set<ChildProcess | ReturnType<typeof Bun.spawn>>();

const cliEnvironment = (options: Options, state: State): Environment => {
  const env: Environment = {
    ...process.env,
    AWS_PROFILE: options.profile,
    AWS_DEFAULT_PROFILE: options.profile,
    AWS_SDK_LOAD_CONFIG: '1',
    AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'true',
    STP_DISABLE_TELEMETRY: '1',
    STP_DEV_FIXTURE_PID_FILE: join(state.workDirectory, 'fixture-pids.jsonl'),
    TERM: 'xterm-256color'
  };
  // The key comes from apps/cli/.env.local, which the dev runner loads; nothing inherited may replace or suppress it.
  for (const name of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'STACKTAPE_API_KEY']) {
    delete env[name];
  }
  delete env.SKIP_LOADING_ENV;
  return env;
};

const projectDirectory = (state: Pick<State, 'workDirectory'>) => join(state.workDirectory, 'project');

const stackArgs = (options: Options, state: State) => [
  '--currentWorkingDirectory',
  projectDirectory(state),
  '--configPath',
  'stacktape.yml',
  '--projectName',
  options.projectName,
  '--stage',
  options.stage,
  '--region',
  options.region,
  '--profile',
  options.profile,
  '--awsAccount',
  state.awsAccountName
];

/** One source-built CLI command (`bun scripts/dev.ts …`) that runs to completion. */
const runCli = async ({ options, state, args }: { options: Options; state: State; args: string[] }) => {
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
  const timer = setTimeout(() => child.kill('SIGKILL'), COMMAND_TIMEOUT_MS);
  const exitCode = await new Promise<number | null>((resolve) => child.once('exit', (code) => resolve(code)));
  clearTimeout(timer);
  startedProcesses.delete(child);
  const records = stdout.split(/\r?\n/).flatMap((line): AgentRecord[] => {
    if (!line.trim().startsWith('{')) return [];
    try {
      const value: unknown = JSON.parse(line);
      return isRecord(value) && typeof value.type === 'string' ? [value as AgentRecord] : [];
    } catch {
      return [];
    }
  });
  const result = records.find(({ type }) => type === 'result') as
    | (AgentRecord & { ok?: unknown; code?: unknown; message?: unknown; data?: unknown })
    | undefined;
  return { exitCode, records, result, output: `${stdout}\n${stderr}` };
};

const resolveAwsAccountName = async (options: Options, state: State) => {
  const { result } = await runCli({ options, state, args: ['info:whoami', '--agent'] });
  // The agent result record carries the command's return value as `data.result`.
  const whoami = isRecord(result?.data) && isRecord(result.data.result) ? result.data.result : {};
  const connections = Array.isArray(whoami.connectedAwsAccounts) ? whoami.connectedAwsAccounts.filter(isRecord) : [];
  const matching = connections.filter(
    ({ awsAccountId, state: connectionState }) =>
      awsAccountId === options.expectedAccountId && connectionState === 'ACTIVE'
  );
  const name = matching[0]?.name;
  assert(
    matching.length === 1 && typeof name === 'string',
    `Expected one active Stacktape connection to account ${options.expectedAccountId}, found ${matching.length}.`
  );
  return name;
};

type AgentReady = {
  port: number;
  workloads: { name: string; type: string; url?: string }[];
  databases: { name: string; type: string; port?: number }[];
};

/** `dev --agent`: the launcher returns once the daemon printed AGENT_READY, and the daemon keeps running. */
const startAgent = async ({
  options,
  state,
  agentPort,
  extraArgs = []
}: {
  options: Options;
  state: State;
  agentPort: number;
  extraArgs?: string[];
}) => {
  const run = await runCli({
    options,
    state,
    args: [
      'dev',
      ...stackArgs(options, state),
      '--resources',
      'all',
      '--agent',
      '--agentPort',
      String(agentPort),
      ...extraArgs
    ]
  });
  const ready =
    run.result?.ok === true && isRecord(run.result.data) && isRecord(run.result.data.result)
      ? (run.result.data.result as unknown as AgentReady)
      : undefined;
  return { ...run, ready };
};

const agentRequest = async (port: number, path: string, init?: { method?: string; body?: unknown }) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: init?.method ?? 'GET',
    ...(init?.body !== undefined && {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(init.body)
    }),
    signal: AbortSignal.timeout(120_000)
  });
  return (await response.json()) as { ok: boolean; code: string; message?: string; data?: Record<string, unknown> };
};

/** GET through the dev proxy URL (`http://<name>.<stage>.localhost:<port>`), which routes by Host header. */
const getThroughUrl = (url: string) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const { hostname, port, pathname } = new URL(url);
    const outgoing = httpRequest(
      { host: '127.0.0.1', port, path: pathname, headers: { host: `${hostname}:${port}` }, timeout: 5_000 },
      (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body }));
      }
    );
    outgoing.on('timeout', () => outgoing.destroy(new Error('timeout')));
    outgoing.on('error', reject);
    outgoing.end();
  });

/** Thrown by a probe when waiting longer cannot help, such as when the process it waits for has exited. */
class WaitAborted extends Error {}

const waitFor = async <T>(description: string, probe: () => Promise<T | undefined>, timeoutMs = 60_000) => {
  let lastError = '';
  for (const deadline = Date.now() + timeoutMs; Date.now() < deadline; await sleep(500)) {
    try {
      const value = await probe();
      if (value !== undefined) return value;
    } catch (error) {
      if (error instanceof WaitAborted) throw error;
      lastError = String(error);
    }
  }
  throw new Error(`Timed out waiting for ${description}.${lastError ? ` Last error: ${lastError}` : ''}`);
};

type ApiAnswer = { release: string; databaseReachable: boolean; cacheReachable: boolean };
const waitForApiRelease = (url: string, release: string, timeoutMs = 90_000) =>
  waitFor(
    `the API to answer with release "${release}"`,
    async () => {
      const { status, body } = await getThroughUrl(url);
      if (status !== 200) return undefined;
      const answer = JSON.parse(body) as ApiAnswer;
      return answer.release === release ? answer : undefined;
    },
    timeoutMs
  );

/** The port the fixture's dev server listens on, which it records next to its pid. */
const fixtureDevServerPort = async (state: State) => {
  const lines = (await readFile(join(state.workDirectory, 'fixture-pids.jsonl'), 'utf8').catch(() => '')).split('\n');
  const record = lines
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { role: string; port?: number })
    .findLast(({ role }) => role === 'dev-server');
  return record?.port;
};

const setRelease = async (state: State, release: string) => {
  const path = join(projectDirectory(state), 'src', 'api.ts');
  const source = await readFile(path, 'utf8');
  await writeFile(path, source.replace(/const RELEASE = '[^']*';/, `const RELEASE = '${release}';`));
};

// ─── Leftover detection ─────────────────────────────────────────────────────────────────────────────────────────

const isPortListening = (port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(1_000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });

const isRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** Processes whose working directory or command line points at this run's project, plus the fixture's own pids. */
const findOwnedProcesses = async (state: State) => {
  const directory = projectDirectory(state);
  const found = new Map<number, string>();
  for (const entry of await readdir('/proc')) {
    const pid = Number(entry);
    if (!Number.isInteger(pid) || pid === process.pid) continue;
    const [cwd, cmdline] = await Promise.all([
      readlink(`/proc/${pid}/cwd`).catch(() => ''),
      readFile(`/proc/${pid}/cmdline`, 'utf8').catch(() => '')
    ]);
    const command = cmdline.replaceAll('\0', ' ').trim();
    if (cwd.startsWith(directory) || command.includes(directory)) found.set(pid, command.slice(0, 200));
  }
  const pidFile = await readFile(join(state.workDirectory, 'fixture-pids.jsonl'), 'utf8').catch(() => '');
  for (const line of pidFile.split('\n').filter(Boolean)) {
    const { role, pid } = JSON.parse(line) as { role: string; pid: number };
    if (isRunning(pid) && !found.has(pid)) found.set(pid, `fixture ${role}`);
  }
  return found;
};

type DockerRunner = (args: string[]) => { exitCode: number; stdout: string };
const docker: DockerRunner = (args) => {
  const result = Bun.spawnSync({ cmd: ['docker', ...args], stdout: 'pipe', stderr: 'pipe' });
  return { exitCode: result.exitCode, stdout: result.stdout.toString().trim() };
};

/** The names dev mode gives this run's containers: project and stage keep them apart from any other session's. */
const apiContainerName = (options: Pick<Options, 'projectName' | 'stage'>) =>
  `stp-${options.projectName}-${options.stage}-api-service-container`;
const databaseContainerName = (options: Pick<Options, 'projectName' | 'stage'>) =>
  `stp-${options.projectName}-${options.stage}-db`;
const cacheContainerName = (options: Pick<Options, 'projectName' | 'stage'>) =>
  `stp-${options.projectName}-${options.stage}-cache`;

const containerState = (name: string): string | undefined => {
  const { exitCode, stdout } = docker(['inspect', '--format', '{{.State.Status}}', name]);
  return exitCode === 0 ? stdout : undefined;
};

/**
 * Containers whose name is one of this run's or whose bind mounts come from its project. A Docker command that fails
 * throws: an unknown container state must never read as "no containers remain".
 */
export const findOwnedContainers = (
  options: Pick<Options, 'projectName' | 'stage'>,
  state: Pick<State, 'workDirectory'>,
  run: DockerRunner = docker
) => {
  const names = new Set([apiContainerName(options), databaseContainerName(options), cacheContainerName(options)]);
  const listed = run(['ps', '-aq']);
  assert(listed.exitCode === 0, `docker ps failed (${listed.exitCode}); the container state is unknown.`);
  const ids = listed.stdout.split('\n').filter(Boolean);
  if (!ids.length) return [];
  // A container removed between the two commands makes inspect fail; list again rather than trust a partial answer.
  let inspection = run(['inspect', ...ids]);
  if (inspection.exitCode !== 0) {
    const relisted = run(['ps', '-aq']);
    assert(relisted.exitCode === 0, `docker ps failed (${relisted.exitCode}); the container state is unknown.`);
    const remaining = relisted.stdout.split('\n').filter(Boolean);
    if (!remaining.length) return [];
    inspection = run(['inspect', ...remaining]);
  }
  assert(inspection.exitCode === 0, `docker inspect failed (${inspection.exitCode}); the container state is unknown.`);
  const inspected = JSON.parse(inspection.stdout) as {
    Name: string;
    State: { Status: string };
    Mounts?: { Source?: string }[];
  }[];
  // Docker reports mount sources with `/`; the project directory is compared in the same spelling on every host.
  const projectRoot = projectDirectory(state).replace(/\\/g, '/');
  return inspected
    .filter(
      ({ Name, Mounts }) =>
        names.has(Name.replace(/^\//, '')) ||
        Mounts?.some(({ Source }) => Source?.replace(/\\/g, '/').startsWith(projectRoot))
    )
    .map(({ Name, State }) => ({ name: Name.replace(/^\//, ''), status: State.Status }));
};

const describeLeftovers = async ({ options, state, ports }: { options: Options; state: State; ports: number[] }) => {
  const processes = [...(await findOwnedProcesses(state))].map(([pid, command]) => `process ${pid}: ${command}`);
  const containers = findOwnedContainers(options, state)
    .filter(({ status }) => status === 'running' || status === 'restarting' || status === 'created')
    .map(({ name, status }) => `container ${name} (${status})`);
  const listening: string[] = [];
  for (const port of ports) if (await isPortListening(port)) listening.push(`port ${port} is still listening`);
  return [...processes, ...containers, ...listening];
};

/** The ports a session's workloads, database, proxy and agent used, read from the agent's verbose status. */
const sessionPorts = async (agentPort: number) => {
  const status = await agentRequest(agentPort, '/status?verbose=true');
  const ports = new Set<number>([agentPort]);
  for (const workload of (status.data?.workloads as { url?: string; port?: number }[]) ?? []) {
    if (workload.url) ports.add(Number(new URL(workload.url).port));
    if (workload.port) ports.add(workload.port);
  }
  for (const resource of (status.data?.localResources as { port?: number }[]) ?? []) {
    if (resource.port) ports.add(resource.port);
  }
  return [...ports].filter((port) => port > 0);
};

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(typeof address === 'object' && address ? address.port : 0));
    });
  });

/**
 * A foreign listener that answers every connection with a marker, holding a port dev mode would otherwise pick. A port
 * that cannot be held fails the scenario: the test would otherwise prove nothing about occupied ports.
 */
const holdPort = (port: number) =>
  new Promise<Server>((resolve, reject) => {
    const server = createServer((socket) => socket.end('HTTP/1.1 200 OK\r\ncontent-length: 7\r\n\r\nforeign'));
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => resolve(server));
  });

// ─── Scenarios ──────────────────────────────────────────────────────────────────────────────────────────────────

type ScenarioContext = {
  options: Options;
  state: State;
  clients: Clients;
  check: (check: string, assertion: () => Promise<string | void> | string | void) => Promise<void>;
};

/** A fresh copy of the sample app, tagged with this run's owner, so earlier edits never leak into a session. */
const resetProject = async (state: State) => {
  const directory = projectDirectory(state);
  // Overwritten rather than removed: the database container owns its data directory under `.stacktape/dev-data`.
  await cp(FIXTURE_DIRECTORY, directory, { recursive: true, force: true });
  const configPath = join(directory, 'stacktape.yml');
  const config = await readFile(configPath, 'utf8');
  await writeFile(configPath, config.replace(/(name: stacktape-canary-owner\n\s+value: )local/, `$1${state.owner}`));
  // Database data persists between sessions on purpose; the fixture never relies on it.
  await rm(join(state.workDirectory, 'fixture-pids.jsonl'), { force: true });
};

const expectNoLeftovers = async (context: ScenarioContext, ports: number[]) => {
  await context.check('nothing the session started is left running', async () => {
    let leftovers: string[] = [];
    for (const deadline = Date.now() + 15_000; Date.now() < deadline; await sleep(1_000)) {
      leftovers = await describeLeftovers({ options: context.options, state: context.state, ports });
      if (!leftovers.length) return `checked ports ${ports.join(', ')}`;
    }
    throw new Error(leftovers.join('\n'));
  });
};

const firstRunAgent = async (context: ScenarioContext) => {
  const { options, state, clients, check } = context;
  await resetProject(state);
  const agentPort = await freePort();
  const run = await startAgent({ options, state, agentPort });
  const stack = await describeStack(clients.cloudFormation, `${options.projectName}-${options.stage}`);
  if (stack?.StackId) {
    await writeState(options, { ...state, stackId: stack.StackId });
    state.stackId = stack.StackId;
  }
  await check('first `dev --agent` deploys the dev stack and reports ready', () => {
    assert(
      run.ready,
      `dev --agent failed (${run.exitCode}): ${String(run.result?.message ?? run.output.slice(-3000))}`
    );
    assert(stack?.StackStatus?.endsWith('_COMPLETE'), `The dev stack is ${stack?.StackStatus ?? 'missing'}.`);
  });
  if (!run.ready) return;
  await check('the dev stack carries the configured and Stacktape tags', () => {
    assert(stackOwner(stack!) === state.owner, `The owner tag is ${stackOwner(stack!) ?? 'missing'}.`);
    const projectTag = stack?.Tags?.find(({ Key }) => Key === tagNames.projectName())?.Value;
    assert(projectTag === options.projectName, `The ${tagNames.projectName()} tag is ${projectTag ?? 'missing'}.`);
  });
  const ports = await sessionPorts(agentPort);
  const apiUrl = run.ready.workloads.find(({ name }) => name === 'api')?.url;
  const webUrl = run.ready.workloads.find(({ name }) => name === 'web')?.url;
  await check(
    'the API, PostgreSQL and Redis run in containers named for this project, and the API reaches both',
    async () => {
      assert(apiUrl, 'AGENT_READY lists no URL for api.');
      const answer = await waitForApiRelease(apiUrl, 'first');
      assert(answer.databaseReachable, 'The API cannot reach the database address dev mode injected.');
      assert(answer.cacheReachable, 'The API cannot reach the Redis address dev mode injected.');
      for (const name of [apiContainerName(options), databaseContainerName(options), cacheContainerName(options)]) {
        assert(containerState(name) === 'running', `The project's container ${name} is not running.`);
      }
    }
  );
  await check('the hosting-bucket dev server serves the page', async () => {
    assert(webUrl, 'AGENT_READY lists no URL for web.');
    const { status, body } = await getThroughUrl(webUrl);
    assert(status === 200 && body.includes('first page'), `web answered ${status}: ${body.slice(0, 200)}`);
  });
  await check('the agent queries the local database', async () => {
    const response = await agentRequest(agentPort, '/postgres/db/query', {
      method: 'POST',
      body: { sql: 'select 41 + 1 as answer' }
    });
    assert(response.ok && JSON.stringify(response.data).includes('42'), `Query failed: ${JSON.stringify(response)}`);
  });
  await check('the agent runs a command against the local Redis', async () => {
    const response = await agentRequest(agentPort, '/redis/cache/command', { method: 'POST', body: { cmd: 'PING' } });
    assert(response.ok && JSON.stringify(response.data).includes('PONG'), `PING failed: ${JSON.stringify(response)}`);
  });
  await check('an edit followed by POST /rebuild/api changes what the API answers', async () => {
    await setRelease(state, 'second');
    const response = await agentRequest(agentPort, '/rebuild/api', { method: 'POST' });
    assert(response.ok, `Rebuild failed: ${JSON.stringify(response)}`);
    await waitForApiRelease(apiUrl!, 'second');
  });
  const agentPid = (await agentRequest(agentPort, '/status')).data?.pid;
  await check('`dev:stop --agentPort` returns only after the agent has exited', async () => {
    const stop = await runCli({ options, state, args: ['dev:stop', '--agentPort', String(agentPort), '--agent'] });
    assert(stop.exitCode === 0, `dev:stop failed (${stop.exitCode}): ${stop.output.slice(-1500)}`);
    assert(
      typeof agentPid === 'number' && !isRunning(agentPid),
      `Agent ${String(agentPid)} still runs after dev:stop.`
    );
  });
  await expectNoLeftovers(context, ports);
};

const interactiveWatchCtrlC = async (context: ScenarioContext) => {
  const { options, state, clients, check } = context;
  await resetProject(state);
  const stackName = `${options.projectName}-${options.stage}`;
  const before = await describeStack(clients.cloudFormation, stackName);
  assert(before, 'The interactive scenario needs the dev stack from first-run-agent.');
  let screen = '';
  const decoder = new TextDecoder();
  const terminal = Bun.spawn(
    ['bun', 'scripts/dev.ts', 'dev', ...stackArgs(options, state), '--resources', 'all', '--watch'],
    {
      cwd: CLI_DIRECTORY,
      env: cliEnvironment(options, state),
      terminal: { cols: 160, rows: 50, data: (_terminal, data) => (screen += decoder.decode(data, { stream: true })) }
    }
  );
  startedProcesses.add(terminal);
  const apiHostPort = async () => {
    // A session that already ended will never publish the port; say why instead of waiting out the deadline.
    if (terminal.exitCode !== null) {
      throw new WaitAborted(`The session exited (${terminal.exitCode}):\n${stripAnsi(screen).slice(-1500)}`);
    }
    const { exitCode, stdout } = docker(['port', apiContainerName(options), '3000/tcp']);
    return exitCode === 0 ? Number(stdout.split('\n')[0].split(':').at(-1)) : undefined;
  };
  try {
    const port = await waitFor('the API container to publish its port', apiHostPort, READY_TIMEOUT_MS);
    const apiUrl = `http://localhost:${port}/`;
    await check('a warm start in a terminal serves the API without updating the dev stack', async () => {
      await waitForApiRelease(apiUrl, 'first');
      const after = await describeStack(clients.cloudFormation, stackName);
      assert(
        String(after?.LastUpdatedTime) === String(before.LastUpdatedTime),
        `The dev stack was updated on a warm start (${String(before.LastUpdatedTime)} → ${String(after?.LastUpdatedTime)}).`
      );
    });
    await check('`--watch` rebuilds the API after its source changes', async () => {
      // Dev mode starts watching once every workload is up; the web dev server is the other one.
      const webStarted = await waitFor('the web dev server to start', async () => {
        const pids = await readFile(join(state.workDirectory, 'fixture-pids.jsonl'), 'utf8').catch(() => '');
        return pids.includes('"dev-server"') ? true : undefined;
      });
      assert(webStarted, 'The web dev server did not start.');
      await sleep(5_000);
      await setRelease(state, 'watched');
      await waitForApiRelease(`http://localhost:${(await apiHostPort()) ?? port}/`, 'watched', 120_000);
    });
    const ports = [port];
    await check('Ctrl+C ends the session with status 0', async () => {
      terminal.terminal?.write('\x03');
      const exit = await Promise.race([terminal.exited, sleep(STOP_TIMEOUT_MS).then(() => 'still running')]);
      assert(
        exit === 0,
        `The session did not exit with status 0 after Ctrl+C: ${String(exit)}\n${stripAnsi(screen).slice(-1500)}`
      );
    });
    await expectNoLeftovers(context, ports);
  } finally {
    terminal.kill('SIGKILL');
    terminal.terminal?.close();
    startedProcesses.delete(terminal);
  }
};

const terminalSigterm = async (context: ScenarioContext) => {
  const { options, state, check } = context;
  await resetProject(state);
  let screen = '';
  const decoder = new TextDecoder();
  const terminal = Bun.spawn(['bun', 'scripts/dev.ts', 'dev', ...stackArgs(options, state), '--resources', 'all'], {
    cwd: CLI_DIRECTORY,
    env: cliEnvironment(options, state),
    terminal: { cols: 160, rows: 50, data: (_terminal, data) => (screen += decoder.decode(data, { stream: true })) }
  });
  startedProcesses.add(terminal);
  try {
    const port = await waitFor(
      'the API container to publish its port',
      async () => {
        if (terminal.exitCode !== null) {
          throw new WaitAborted(`The session exited (${terminal.exitCode}):\n${stripAnsi(screen).slice(-1500)}`);
        }
        const { exitCode, stdout } = docker(['port', apiContainerName(options), '3000/tcp']);
        return exitCode === 0 ? Number(stdout.split('\n')[0].split(':').at(-1)) : undefined;
      },
      READY_TIMEOUT_MS
    );
    await waitForApiRelease(`http://localhost:${port}/`, 'first');
    await waitFor('the web dev server to start', async () => ((await fixtureDevServerPort(state)) ? true : undefined));
    const webPort = (await fixtureDevServerPort(state))!;
    await check('`dev:stop --cleanupContainers` keeps the containers of a running terminal session', async () => {
      // A terminal session has no agent, so cleanup can only know it is alive from its lock file and container labels.
      const cleanup = await runCli({ options, state, args: ['dev:stop', '--cleanupContainers', '--agent'] });
      assert(
        cleanup.exitCode === 0,
        `dev:stop --cleanupContainers failed (${cleanup.exitCode}): ${cleanup.output.slice(-1500)}`
      );
      for (const name of [databaseContainerName(options), cacheContainerName(options)]) {
        assert(containerState(name) === 'running', `Cleanup removed or stopped ${name} of the running session.`);
      }
    });
    await check('SIGTERM to a terminal session ends it with status 0', async () => {
      terminal.kill('SIGTERM');
      const exit = await Promise.race([terminal.exited, sleep(STOP_TIMEOUT_MS).then(() => 'still running')]);
      assert(
        exit === 0,
        `The session did not exit with status 0 after SIGTERM: ${String(exit)}\n${stripAnsi(screen).slice(-1500)}`
      );
    });
    await expectNoLeftovers(context, [port, webPort]);
  } finally {
    terminal.kill('SIGKILL');
    terminal.terminal?.close();
    startedProcesses.delete(terminal);
  }
};

const occupiedPortsSigterm = async (context: ScenarioContext) => {
  const { options, state, check } = context;
  await resetProject(state);
  // 3000 is both the API's container port and the default port for a dev server of an unknown framework.
  const heldPorts = [3000, 3001];
  const held = await Promise.all(
    heldPorts.map((port) =>
      holdPort(port).catch((error: unknown) => (error instanceof Error ? error : new Error(String(error))))
    )
  );
  try {
    const failedBinds = held.flatMap((server, index) =>
      server instanceof Error ? [`${heldPorts[index]}: ${server.message}`] : []
    );
    assert(
      !failedBinds.length,
      `The scenario could not hold its ports, so it proves nothing: ${failedBinds.join('; ')}`
    );
    const agentPort = await freePort();
    const run = await startAgent({ options, state, agentPort });
    await check('`dev --agent` starts while the default ports are taken', () => {
      assert(
        run.ready,
        `dev --agent failed (${run.exitCode}): ${String(run.result?.message ?? run.output.slice(-3000))}`
      );
    });
    if (!run.ready) return;
    const ports = (await sessionPorts(agentPort)).filter((port) => !heldPorts.includes(port));
    await check('both workloads answer on other ports and the foreign listeners keep theirs', async () => {
      const apiUrl = run.ready!.workloads.find(({ name }) => name === 'api')?.url;
      const webUrl = run.ready!.workloads.find(({ name }) => name === 'web')?.url;
      assert(apiUrl && webUrl, 'AGENT_READY lists no URL for api or web.');
      await waitForApiRelease(apiUrl, 'first');
      const web = await waitFor('the web dev server', async () => {
        const answer = await getThroughUrl(webUrl);
        return answer.status === 200 && answer.body.includes('first page') ? answer : undefined;
      });
      assert(web, 'web did not answer.');
      const verbose = await agentRequest(agentPort, '/status?verbose=true');
      const apiPort = (verbose.data?.workloads as { name: string; port?: number }[]).find(
        ({ name }) => name === 'api'
      )?.port;
      const webPort = await fixtureDevServerPort(state);
      for (const [name, port] of [
        ['api', apiPort],
        ['web', webPort]
      ] as const) {
        assert(port && !heldPorts.includes(port), `${name} is on port ${String(port)}, not on a free one.`);
      }
      for (const port of heldPorts) {
        const answer = await getThroughUrl(`http://localhost:${port}/`);
        assert(
          answer.body === 'foreign',
          `Port ${port} no longer belongs to its listener: ${answer.body.slice(0, 100)}`
        );
      }
    });
    const agentPid = (await agentRequest(agentPort, '/status')).data?.pid;
    await check('SIGTERM ends the agent', async () => {
      assert(typeof agentPid === 'number', 'The agent reported no pid.');
      process.kill(agentPid, 'SIGTERM');
      await waitFor('the agent to exit', async () => (isRunning(agentPid) ? undefined : true), STOP_TIMEOUT_MS);
    });
    await expectNoLeftovers(context, ports);
  } finally {
    // Not awaited: Bun can release a closed server without calling back, which would drain the event loop.
    for (const server of held) if (!(server instanceof Error)) server.close();
  }
};

const failedStartup = async (context: ScenarioContext) => {
  const { options, state, check } = context;
  await resetProject(state);
  const unknownAgentPort = await freePort();
  await check('an unknown --resources name fails before anything starts', async () => {
    const run = await runCli({
      options,
      state,
      args: [
        'dev',
        ...stackArgs(options, state),
        '--resources',
        'apii',
        '--agent',
        '--agentPort',
        String(unknownAgentPort)
      ]
    });
    assert(run.exitCode !== 0, 'dev accepted an unknown resource name.');
    assert(
      /apii/.test(String(run.result?.message)) && /api/.test(run.output),
      `Unhelpful failure: ${String(run.result?.message)}`
    );
  });
  await expectNoLeftovers(context, [unknownAgentPort]);

  const apiPath = join(projectDirectory(state), 'src', 'api.ts');
  await writeFile(apiPath, `throw new Error('api fails on start');\n${await readFile(apiPath, 'utf8')}`);
  const agentPort = await freePort();
  const run = await startAgent({ options, state, agentPort });
  const ports = [agentPort];
  await check('an API that crashes on start is reported as failed', async () => {
    if (!run.ready) {
      assert(run.exitCode !== 0, 'dev --agent neither became ready nor failed.');
      assert(/api/.test(String(run.result?.message)), `The failure does not name api: ${String(run.result?.message)}`);
      return 'dev --agent failed to start';
    }
    ports.push(...(await sessionPorts(agentPort)));
    try {
      const status = await waitFor('the API to be reported as failed', async () => {
        const verbose = await agentRequest(agentPort, '/status?verbose=true');
        const api = (verbose.data?.workloads as { name: string; status: string; error?: string }[]).find(
          ({ name }) => name === 'api'
        );
        return api?.status === 'error' ? api : undefined;
      });
      // The developer must see why, not only that it stopped.
      assert(status.error?.includes('api fails on start'), `The reported error omits the cause: ${status.error}`);
      return `reported: ${status.error}`;
    } finally {
      await runCli({ options, state, args: ['dev:stop', '--agentPort', String(agentPort), '--agent'] });
    }
  });
  await expectNoLeftovers(context, ports);
};

const SCENARIO_RUNNERS: Record<ScenarioName, (context: ScenarioContext) => Promise<void>> = {
  'first-run-agent': firstRunAgent,
  'interactive-watch-ctrl-c': interactiveWatchCtrlC,
  'terminal-sigterm': terminalSigterm,
  'occupied-ports-sigterm': occupiedPortsSigterm,
  'failed-startup': failedStartup
};

// ─── Cleanup ────────────────────────────────────────────────────────────────────────────────────────────────────

const isMissing = (error: unknown, names: string[]) =>
  error instanceof Error &&
  (names.includes(error.name) || /not ?found|does not exist|cannot be found/i.test(error.message));

const recordOwnedResources = async (clients: Clients, state: State) => {
  const resources =
    (await clients.cloudFormation.send(new DescribeStackResourcesCommand({ StackName: state.stackName })))
      .StackResources ?? [];
  const physical = (type: string) =>
    resources
      .filter(({ ResourceType }) => ResourceType === type)
      .flatMap(({ PhysicalResourceId }) => PhysicalResourceId ?? []);
  state.deploymentBucket = physical('AWS::S3::Bucket')[0] ?? state.deploymentBucket;
  state.repositoryNames = [...new Set([...(state.repositoryNames ?? []), ...physical('AWS::ECR::Repository')])];
  state.roleNames = [...new Set([...(state.roleNames ?? []), ...physical('AWS::IAM::Role')])];
  state.logGroupNames = [...new Set([...(state.logGroupNames ?? []), ...physical('AWS::Logs::LogGroup')])];
};

/** Ends this run's processes and containers. Only exact names and this run's project directory are considered. */
const cleanupLocal = async (options: Options, state: State) => {
  for (const child of startedProcesses) child.kill('SIGKILL');
  startedProcesses.clear();
  for (const pid of (await findOwnedProcesses(state)).keys()) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {}
  }
  for (const { name } of findOwnedContainers(options, state)) docker(['rm', '-f', name]);
  const remaining = findOwnedContainers(options, state);
  assert(!remaining.length, `Containers remain: ${remaining.map(({ name }) => name).join(', ')}`);
};

/** The PostgreSQL container writes its data as its own user; give the files back before removing the directory. */
const removeWorkDirectory = async (state: State) => {
  const { exitCode } = docker([
    'run',
    '--rm',
    '-v',
    `${state.workDirectory}:/work`,
    'postgres:16.4',
    'chown',
    '-R',
    `${process.getuid?.() ?? 0}:${process.getgid?.() ?? 0}`,
    '/work'
  ]);
  assert(exitCode === 0, `Could not reclaim ${state.workDirectory} from the database container user.`);
  await rm(state.workDirectory, { recursive: true, force: true });
};

const cleanup = async (clients: Clients, options: Options) => {
  const state = await readState(options);
  const verification: Record<string, unknown> = {};
  await cleanupLocal(options, state);
  verification.local = 'no processes or containers';
  const stack = await describeStack(clients.cloudFormation, state.stackName);
  if (stack) {
    // The owner tag is the dev stack's only ownership proof; a stack without it is never deleted here.
    assert(
      stackOwner(stack) === state.owner,
      `Refusing to delete ${state.stackName}: owner tag ${stackOwner(stack) ?? 'missing'}.`
    );
    assert(!state.stackId || state.stackId === stack.StackId, `Refusing to delete ${state.stackName}: its id changed.`);
    await recordOwnedResources(clients, state);
    await writeState(options, state);
    // `stacktape delete` reads the config and empties the deployment bucket, which a bare DeleteStack cannot.
    await resetProject(state);
    const deletion = await runCli({ options, state, args: ['delete', ...stackArgs(options, state), '--agent'] });
    if (deletion.exitCode === 0) {
      verification.deletedBy = 'stacktape delete';
    } else {
      console.warn(`Stacktape delete failed; deleting the owned stack directly. ${deletion.output.slice(-400)}`);
      await clients.cloudFormation.send(new DeleteStackCommand({ StackName: stack.StackId }));
      verification.deletedBy = 'CloudFormation DeleteStack after a failed stacktape delete';
    }
    const waited = await waitUntilStackDeleteComplete(
      { client: clients.cloudFormation, maxWaitTime: 20 * 60, minDelay: 5, maxDelay: 20 },
      { StackName: stack.StackId }
    );
    assert(
      waited.state === 'SUCCESS',
      `CloudFormation did not confirm deletion of ${state.stackName}: ${waited.state} (${String((await describeStack(clients.cloudFormation, stack.StackId!))?.StackStatusReason).slice(0, 300)}).`
    );
  }
  assert(!(await describeStack(clients.cloudFormation, state.stackName)), `${state.stackName} still exists.`);
  verification.stack = 'absent';
  if (state.deploymentBucket) {
    const gone = await clients.s3.send(new HeadBucketCommand({ Bucket: state.deploymentBucket })).then(
      () => false,
      (error: unknown) => isMissing(error, ['NotFound', 'NoSuchBucket'])
    );
    assert(gone, `The deployment bucket ${state.deploymentBucket} still exists.`);
  }
  for (const repositoryName of state.repositoryNames ?? []) {
    const gone = await clients.ecr.send(new DescribeRepositoriesCommand({ repositoryNames: [repositoryName] })).then(
      () => false,
      (error: unknown) => isMissing(error, ['RepositoryNotFoundException'])
    );
    assert(gone, `The ECR repository ${repositoryName} still exists.`);
  }
  for (const roleName of state.roleNames ?? []) {
    const gone = await clients.iam.send(new GetRoleCommand({ RoleName: roleName })).then(
      () => false,
      (error: unknown) => isMissing(error, ['NoSuchEntity', 'NoSuchEntityException'])
    );
    assert(gone, `The IAM role ${roleName} still exists.`);
  }
  // A function's log group can be recreated by Lambda after the stack removed it; only these exact names are owned.
  for (const logGroupName of state.logGroupNames ?? []) {
    const existing = await clients.logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName }));
    if (existing.logGroups?.some((group) => group.logGroupName === logGroupName)) {
      await clients.logs.send(new DeleteLogGroupCommand({ logGroupName }));
    }
    const after = await clients.logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName }));
    assert(!after.logGroups?.some((group) => group.logGroupName === logGroupName), `${logGroupName} still exists.`);
  }
  verification.resources = `bucket, ${state.repositoryNames?.length ?? 0} repositories, ${state.roleNames?.length ?? 0} roles, ${state.logGroupNames?.length ?? 0} log groups absent`;
  await removeWorkDirectory(state);
  await writeState(options, { ...state, cleanupVerifiedAt: new Date().toISOString() });
  return verification;
};

const cleanupCommand = (options: Options) =>
  [
    `${PREFIX}DEPLOY=1`,
    `${PREFIX}EXPECTED_ACCOUNT_ID=${options.expectedAccountId}`,
    `${PREFIX}PROFILE=${options.profile}`,
    `${PREFIX}REGION=${options.region}`,
    `${PREFIX}PROJECT_NAME=${options.projectName}`,
    `${PREFIX}OWNER=${options.owner}`,
    `${PREFIX}STATE_FILE=${options.stateFile}`,
    'pnpm --filter @stacktape/cli run test:real-aws-dev-canary -- --cleanup-only'
  ].join(' ');

// ─── Entry ──────────────────────────────────────────────────────────────────────────────────────────────────────

export const runDevModeCanary = async ({ cleanupOnly = false }: { cleanupOnly?: boolean } = {}) => {
  const options = resolveOptions();
  const clients = createClients(options);
  const checks: Check[] = [];
  const report: Record<string, unknown> = {
    projectName: options.projectName,
    stage: options.stage,
    region: options.region,
    startedAt: new Date().toISOString(),
    checks
  };
  let bodyError: unknown;
  let cleanupError: unknown;
  let deployAttempted = false;
  const signalHandler = () => {
    for (const child of startedProcesses) child.kill('SIGKILL');
  };
  process.once('SIGINT', signalHandler);
  process.once('SIGTERM', signalHandler);
  // An await that can never settle drains Bun's event loop, and Bun then exits 0 before `finally` runs.
  const drainedHandler = () => {
    console.error(`The canary stopped before it finished. Run cleanup:\n${cleanupCommand(options)}`);
    process.exitCode = 1;
  };
  process.once('beforeExit', drainedHandler);

  try {
    const identity = await clients.sts.send(new GetCallerIdentityCommand({}));
    assert(
      identity.Account === options.expectedAccountId,
      `The profile resolves to ${identity.Account}, not the expected account.`
    );
    if (cleanupOnly) {
      report.cleanup = await cleanup(clients, options);
      return report;
    }
    assert(await hasDevApiKey(), 'apps/cli/.env.local must set STACKTAPE_API_KEY for the source CLI.');
    const stackName = `${options.projectName}-${options.stage}`;
    assert(
      !(await describeStack(clients.cloudFormation, stackName)),
      `${stackName} already exists; choose a new project.`
    );
    if (!options.scenarios.includes('first-run-agent')) {
      throw new Error('Every run starts with first-run-agent, which creates the dev stack the other scenarios use.');
    }
    const workDirectory = join(tmpdir(), `stacktape-dev-canary-${options.projectName}`);
    await rm(workDirectory, { recursive: true, force: true });
    await mkdir(workDirectory, { recursive: true });
    const state: State = {
      accountId: options.expectedAccountId,
      region: options.region,
      projectName: options.projectName,
      stage: options.stage,
      stackName,
      owner: options.owner,
      awsAccountName: '',
      workDirectory
    };
    state.awsAccountName = await resolveAwsAccountName(options, state);
    await writeState(options, state);
    // A rejected preflight above authorizes no cleanup; from here on, cleanup always runs.
    deployAttempted = true;

    for (const scenario of options.scenarios) {
      const context: ScenarioContext = {
        options,
        state,
        clients,
        check: async (check, assertion) => {
          const startedAt = Date.now();
          try {
            const detail = await assertion();
            checks.push({
              scenario,
              check,
              ok: true,
              detail: `${detail ? `${detail}; ` : ''}${Date.now() - startedAt} ms`
            });
            console.info(`✓ [${scenario}] ${check}`);
          } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            checks.push({ scenario, check, ok: false, detail });
            console.error(`✗ [${scenario}] ${check}\n  ${detail.replaceAll('\n', '\n  ')}`);
          }
        }
      };
      try {
        await SCENARIO_RUNNERS[scenario](context);
      } catch (error) {
        checks.push({ scenario, check: 'scenario completed', ok: false, detail: String(error) });
        console.error(`✗ [${scenario}] ${String(error)}`);
      }
      // A failed check may leave its session running; the next scenario starts from nothing.
      await cleanupLocal(options, state);
      if (scenario === 'first-run-agent' && !(await describeStack(clients.cloudFormation, stackName))) break;
    }
    const failed = checks.filter(({ ok }) => !ok);
    if (failed.length) bodyError = new Error(`${failed.length} dev-mode check(s) failed.`);
  } catch (error) {
    bodyError = error;
  } finally {
    if (!cleanupOnly && deployAttempted) {
      try {
        report.cleanup = await cleanup(clients, options);
      } catch (error) {
        cleanupError = error;
        report.cleanup = { failed: String(error), recoveryCommand: cleanupCommand(options) };
      }
    }
    process.off('SIGINT', signalHandler);
    process.off('SIGTERM', signalHandler);
    process.off('beforeExit', drainedHandler);
    report.result = bodyError || cleanupError ? 'failed' : 'passed';
    report.finishedAt = new Date().toISOString();
    if (options.reportFile) await writeFile(options.reportFile, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (cleanupError) {
    console.error(`Cleanup did not finish. Keep ${options.stateFile} and run:\n${cleanupCommand(options)}`);
  }
  if (bodyError && cleanupError)
    throw new AggregateError([bodyError, cleanupError], 'The canary and its cleanup failed.');
  if (bodyError) throw bodyError;
  if (cleanupError) throw cleanupError;
  return report;
};

if (import.meta.main) {
  runDevModeCanary({ cleanupOnly: process.argv.includes('--cleanup-only') })
    .then((report) => console.info(`Dev-mode canary ${String(report.result)}.`))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
