import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { relative } from 'node:path';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { formatCommandHeaderLine } from '@application-services/tui-manager/format/blocks';
import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { isResourceTypeExcludedInDevMode } from '@domain-services/config-manager/dev-mode';
import { AWS_READ_ONLY_OPERATIONS, resolveAwsServiceName } from '@stacktape/aws-read-only/operations';
import { executeAwsSdkCommand } from '@stacktape/aws-read-only/executor';
import { localStatePaths } from 'src/config/local-state-paths';
import { markOwnAgentLockStopping } from './agent-daemon';
import type { DevTuiState } from 'src/app/tui-manager/dev/types';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { templateManager } from '@domain-services/template-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getDevAgentCredentials } from './dev-agent-credentials';
import { findAvailablePort } from './port-utils';
import {
  postgresQuery,
  postgresSchema,
  postgresTables,
  postgresExplain,
  postgresIndexes,
  postgresStats,
  postgresSample,
  mysqlQuery,
  mysqlSchema,
  mysqlTables,
  mysqlExplain,
  mysqlIndexes,
  mysqlStats,
  mysqlSample,
  redisCommand,
  redisKeys,
  redisGet,
  redisTtl,
  redisInfo,
  redisType,
  dynamoDbQuery,
  dynamoDbScan,
  dynamoDbGet,
  dynamoDbPut,
  dynamoDbDelete,
  dynamoDbSchema,
  dynamoDbSample,
  opensearchSearch,
  opensearchGet,
  opensearchPut,
  opensearchDelete,
  opensearchIndices,
  opensearchMapping,
  opensearchAnalyze,
  opensearchCount,
  postgresReset,
  mysqlReset,
  dynamoDbReset,
  type DynamoDbConnectionOpts
} from '@domain-services/debug-services/db-client';
import { agentLog, getAgentLogFilePath, initAgentLogger, setAgentLogMasker, stopAgentLogger } from './agent-logger';
import { createEnvironmentMasker, getSecretSourcedEnvNames, maskAgentEnvironment } from './agent-env-masking';
import {
  describeBatchJob,
  findSubmittedBatchJobId,
  getBatchJobEnvVars,
  getBatchScope,
  scopeBatchCall,
  type BatchJobDetails
} from './deployed-batch-job';
import { getLambdaEnvVars } from './deployed-function-environment';
import { getDevNetworkSession } from './dev-network-session';
import type { DevBoxStatus } from './dev-box';
import { getRunningLocalInstances, type LocalResourceInstance } from './local-resources';
import { getHealthStatus, triggerHealthCheck } from './local-resources/health-monitor';
import { runSeedScript } from './seed-script';
import type { FunctionNotInSession } from './functions-not-in-session';

/** What the dev command tells the agent about workload environments; injected to avoid an import cycle. */
export type AgentWorkloadEnvironment = {
  /** The environment a locally running workload received, or null when it is not tracked. */
  getEnvVars: (name: string) => Record<string, string> | null;
  /** Names of the workload's variables whose configured value reads a secret (`$Secret`, `$SsmParam`). */
  getSecretEnvNames: (name: string) => ReadonlySet<string>;
};

let workloadEnvironment: AgentWorkloadEnvironment = {
  getEnvVars: () => null,
  getSecretEnvNames: () => new Set()
};

export type WorkloadStatus = {
  name: string;
  type: string;
  status: 'pending' | 'starting' | 'running' | 'error' | 'stopped';
  url?: string;
  port?: number;
  error?: string;
  /** How to fix `error`: a packaging failure's hint, for example. */
  hints?: string[];
  size?: string;
  /** What a starting or rebuilding workload waits for. */
  statusMessage?: string;
};

type LocalResourceStatus = {
  name: string;
  type: string;
  status: 'pending' | 'starting' | 'running' | 'error' | 'stopped';
  port?: number;
  error?: string;
};

type AgentPhase = 'starting' | 'ready' | 'rebuilding' | 'stopping' | 'stopped';

/** The agent only listens on loopback; every request must name it as one of these hosts. */
export const AGENT_HOST = '127.0.0.1';

export type AgentStatus = {
  phase: AgentPhase;
  workloads: WorkloadStatus[];
  localResources: LocalResourceStatus[];
  logFile: string | null;
  /** Why the session no longer matches the configuration file and has to restart before it is ready again. */
  restartRequired?: string;
};

/** A workload that runs older code of files another workload's rebuild just picked up. */
export type StaleWorkload = { name: string; changedFiles: string[] };

export type RebuildResult =
  | { ok: true; rebuilt: string[]; staleWorkloads?: StaleWorkload[] }
  | { ok: false; code: 'CONFIG_CHANGED_RESTART_REQUIRED'; message: string }
  | {
      ok: false;
      code: 'REBUILD_FAILED';
      message: string;
      failedWorkloads: FailedWorkload[];
      staleWorkloads?: StaleWorkload[];
    };

// State management for agent mode
let agentState: AgentStatus = {
  phase: 'starting',
  workloads: [],
  localResources: [],
  logFile: null
};

/** Who this agent is, so a client that only knows its port (dev stop, a restarted MCP server) can match it to a project. */
export type AgentSessionIdentity = {
  /** Stable for the session; MCP passes its own ID through `STACKTAPE_DEV_SESSION_ID`, so it survives an MCP restart. */
  sessionId: string;
  projectDirectory: string;
  projectName: string;
  stage: string;
  region: string;
};

/** What dev mode decided on its own while it started, such as deploying a table that a stream trigger reads. */
let agentNotices: string[] = [];
export const setAgentNotices = (notices: string[]) => {
  agentNotices = [...notices];
};

/** Deployed functions the session leaves out, with the code they run; see `FunctionNotInSession`. */
let functionsNotInSession: FunctionNotInSession[] = [];
export const setFunctionsNotInSession = (functions: FunctionNotInSession[]) => {
  functionsNotInSession = [...functions];
};

let httpServer: Server | null = null;
let agentPort: number | null = null;
let agentSession: AgentSessionIdentity | null = null;
let startTime: number | null = null;
let agentToken: string | null = null;
let agentTokenFile: string | null = null;

// Import rebuild functions lazily to avoid circular deps
let rebuildWorkload: (name: string) => Promise<RebuildResult | undefined>;
let rebuildAllWorkloads: () => Promise<RebuildResult>;

export const setRebuildFunctions = (
  rebuildOne: (name: string) => Promise<RebuildResult | undefined>,
  rebuildAll: () => Promise<RebuildResult>
) => {
  rebuildWorkload = rebuildOne;
  rebuildAllWorkloads = rebuildAll;
};

export const updateAgentState = (updates: Partial<AgentStatus>) => {
  agentState = { ...agentState, ...updates };
};

/** The agent reports what the dev TUI state holds; the dev command calls this on every change of that state. */
export const mirrorDevTuiState = (state: DevTuiState) => {
  updateAgentState({
    phase: state.phase === 'running' ? 'ready' : 'starting',
    workloads: state.workloads.map((workload) => ({
      name: workload.name,
      type: workload.type,
      status: workload.status,
      url: workload.url,
      port: workload.port,
      error: workload.error,
      ...(workload.status === 'error' && workload.hints?.length ? { hints: workload.hints } : {}),
      size: workload.size,
      ...(workload.status === 'starting' && workload.statusMessage ? { statusMessage: workload.statusMessage } : {})
    })),
    localResources: state.localResources.map((resource) => ({
      name: resource.name,
      type: resource.type,
      status: resource.status,
      port: resource.port,
      error: resource.error
    }))
  });
};

export const updateAgentWorkloadStatus = (name: string, updates: Partial<Omit<WorkloadStatus, 'name'>>) => {
  const workload = agentState.workloads.find((w) => w.name === name);
  if (workload) Object.assign(workload, updates);
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────

const findLocalResource = (name: string): LocalResourceInstance | undefined => {
  return getRunningLocalInstances().find((r) => r.name === name);
};

const getLocalResourceNames = (): string[] => {
  return getRunningLocalInstances().map((r) => r.name);
};

export type FailedWorkload = { name: string; error: string; hints?: string[] };

export const getFailedWorkloads = (workloads: WorkloadStatus[] = agentState.workloads): FailedWorkload[] =>
  workloads
    .filter((workload) => workload.status === 'error')
    .map(({ name, error, hints }) => ({ name, error: error || 'unknown error', ...(hints?.length ? { hints } : {}) }));

/**
 * Why the session is not ready, or none when it is. Ready means dev mode finished starting, every selected workload and
 * local database runs, deployed functions reach the local databases through the dev box, and the configuration file
 * still matches the session. An assistant that waits for readiness must not start testing against a workload or
 * database that is down, or one that runs outdated code or configuration.
 */
export const getNotReadyReasons = ({
  phase,
  restartRequired,
  workloads,
  localResources,
  devBox
}: Pick<AgentStatus, 'phase' | 'restartRequired' | 'workloads' | 'localResources'> & {
  /** The dev box connection, when deployed functions reach local databases through it. */
  devBox?: DevBoxStatus;
}): string[] => {
  if (phase !== 'ready') return [`dev mode is ${phase}`];
  return [
    ...(restartRequired ? [restartRequired] : []),
    ...workloads
      .filter(({ status }) => status !== 'running')
      .map(({ name, status }) => `workload ${name} is ${status}`),
    // A database that is still `pending` once dev mode started is one this session does not run.
    ...localResources
      .filter(({ status }) => status !== 'running' && status !== 'pending')
      .map(({ name, status, error }) => `local database ${name} is ${status}${error ? `: ${error}` : ''}`),
    ...(devBox && devBox.phase !== 'ready'
      ? [
          `deployed functions cannot reach the local databases yet: the dev box connection is ${
            devBox.phase === 'reconnecting' ? `reconnecting (${devBox.reason})` : devBox.phase
          }`
        ]
      : [])
  ];
};

const getSessionNotReadyReasons = () =>
  getNotReadyReasons({ ...agentState, devBox: getDevNetworkSession()?.connection.status });

const safeJsonParse = (str: string): unknown => {
  try {
    return JSON.parse(str);
  } catch {
    return undefined;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Route handlers
// ─────────────────────────────────────────────────────────────────────────────

type RouteHandler = (params: {
  pathParams: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
}) => Promise<unknown>;

type Route = {
  method: 'GET' | 'POST';
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
};

type DevAgentEnvelope = {
  v: '1.0';
  ok: boolean;
  code: string;
  message?: string;
  data?: Record<string, unknown>;
};

const routes: Route[] = [];

const inferErrorCode = (message?: string): string => {
  const msg = (message || '').toLowerCase();
  if (msg.includes('not found')) return 'NOT_FOUND';
  if (msg.includes('missing required') || msg.includes('invalid')) return 'VALIDATION_ERROR';
  if (msg.includes('already')) return 'ALREADY_EXISTS';
  if (msg.includes('credentials')) return 'AUTH_ERROR';
  return 'INTERNAL_ERROR';
};

const toDevAgentEnvelope = (result: unknown): DevAgentEnvelope => {
  if (!result || typeof result !== 'object') {
    return {
      v: '1.0',
      ok: true,
      code: 'OK',
      message: 'OK',
      data: { value: result as unknown }
    };
  }

  const obj = result as Record<string, unknown>;
  if (typeof obj.v === 'string' && typeof obj.ok === 'boolean' && typeof obj.code === 'string') {
    return obj as DevAgentEnvelope;
  }

  if (typeof obj.ok === 'boolean') {
    const { ok, code, message, error, hint, available, ...rest } = obj as {
      ok: boolean;
      code?: string;
      message?: string;
      error?: string;
      hint?: unknown;
      available?: unknown;
      [key: string]: unknown;
    };

    if (!ok) {
      return {
        v: '1.0',
        ok: false,
        code: code || inferErrorCode(error || message),
        message: error || message || 'Request failed',
        data: {
          ...(hint !== undefined ? { hint } : {}),
          ...(available !== undefined ? { available } : {}),
          ...rest
        }
      };
    }

    return {
      v: '1.0',
      ok: true,
      code: code || 'OK',
      message: message || 'OK',
      data: {
        ...(hint !== undefined ? { hint } : {}),
        ...(available !== undefined ? { available } : {}),
        ...rest
      }
    };
  }

  return {
    v: '1.0',
    ok: true,
    code: 'OK',
    message: 'OK',
    data: obj
  };
};

const addRoute = (method: 'GET' | 'POST', path: string, handler: RouteHandler) => {
  // Convert path like /postgres/:resource/query to regex
  const paramNames: string[] = [];
  const pattern = path.replace(/:(\w+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  routes.push({ method, pattern: new RegExp(`^${pattern}$`), paramNames, handler });
};

// ─────────────────────────────────────────────────────────────────────────────
// Core endpoints
// ─────────────────────────────────────────────────────────────────────────────

/** The dev box connection, for an agent that has to know why deployed functions can't reach local databases yet. */
const getDevBoxStatus = () => {
  const status = getDevNetworkSession()?.connection.status;
  if (!status) return {};
  return { devBox: status.phase === 'reconnecting' ? `reconnecting: ${status.reason}` : status.phase };
};

addRoute('GET', '/status', async ({ query }) => {
  const verbose = query.get('verbose') === 'true';
  const notReadyReasons = getSessionNotReadyReasons();
  const ready = !notReadyReasons.length;
  const failedWorkloads = getFailedWorkloads();

  if (verbose) {
    return {
      phase: agentState.phase,
      ready,
      ...(ready ? {} : { notReadyReasons }),
      failedWorkloads,
      uptime: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
      workloads: agentState.workloads,
      localResources: agentState.localResources,
      deployedDatabases: getDeployedDynamoTables(),
      deployedResources: getDeployedResources(),
      ...(getConfiguredBatchJobs().length ? { batchJobs: await getDeployedBatchJobs() } : {}),
      ...(agentState.restartRequired ? { restartRequired: agentState.restartRequired } : {}),
      ...(agentNotices.length ? { notices: agentNotices } : {}),
      ...(functionsNotInSession.length ? { functionsNotInSession } : {}),
      ...getDevBoxStatus(),
      logFile: getAgentLogFilePath(),
      ...agentSession,
      pid: process.pid
    };
  }

  const workloadMap: Record<string, string> = {};
  for (const w of agentState.workloads) {
    if (w.status === 'running' && w.url) workloadMap[w.name] = w.url;
    else if (w.status === 'error' && w.error) workloadMap[w.name] = `error: ${w.error}`;
    else workloadMap[w.name] = w.status;
  }

  return {
    phase: agentState.phase,
    ready,
    ...(ready ? {} : { notReadyReasons }),
    failedWorkloads,
    ...(agentState.restartRequired ? { restartRequired: agentState.restartRequired } : {}),
    ...(agentNotices.length ? { notices: agentNotices } : {}),
    workloads: workloadMap,
    ...(functionsNotInSession.length
      ? { functionsNotInSession: Object.fromEntries(functionsNotInSession.map(({ name, message }) => [name, message])) }
      : {}),
    ...getDevBoxStatus(),
    ...agentSession,
    pid: process.pid
  };
});

addRoute('GET', '/logs', async () => {
  const logFile = getAgentLogFilePath();
  return {
    logFile,
    format: 'jsonl',
    hint: 'Use standard tools: tail -n 50 <logFile> | jq ., grep \'"level":"error"\' <logFile>, etc.'
  };
});

/** What a rebuild returns: the outcome, and where a failed build's output and the workloads' logs are. */
export const toRebuildResponse = (
  result: RebuildResult,
  logFile = getAgentLogFilePath(),
  workingDirectory = agentSession?.projectDirectory ?? globalStateManager.workingDir
) => {
  const stale = 'staleWorkloads' in result && result.staleWorkloads?.length ? result.staleWorkloads : undefined;
  const staleNote = stale && describeStaleWorkloads(stale, workingDirectory);
  const staleFields = stale ? { staleWorkloads: stale } : {};
  if ('rebuilt' in result) {
    return {
      ok: true,
      message: `Rebuilt ${result.rebuilt.join(', ')}.${staleNote ? ` ${staleNote}` : ''}`,
      rebuilt: result.rebuilt,
      ...staleFields
    };
  }
  if (!('failedWorkloads' in result)) {
    return {
      ok: false,
      code: result.code,
      error: result.message,
      hint: 'Stop dev mode and start it again; the start updates the dev stack.'
    };
  }
  // Each workload's error is in `failedWorkloads`, and the message repeats only one-line errors: a build error of
  // several lines would come back twice.
  const describe = ({ name, error }: FailedWorkload) =>
    error.includes('\n') ? `${name}: ${error.split('\n').length} lines in failedWorkloads` : `${name}: ${error}`;
  return {
    ok: false,
    code: result.code,
    error: `Rebuild failed. ${result.failedWorkloads.map(describe).join('\n')}`,
    failedWorkloads: result.failedWorkloads,
    ...staleFields,
    logFile,
    hint: `The failed workloads keep the status error. A failed function keeps its deployed code, and a container's error says whether its previous build still serves requests. Fix the error and rebuild again.${staleNote ? ` ${staleNote}` : ''}`
  };
};

/** At most this many changed files are named; `staleWorkloads` has them all. */
const MAX_NAMED_STALE_FILES = 3;

/** `quote, report also use changed files (packages/shared/src/index.ts); rebuild them or rebuild all.` */
const describeStaleWorkloads = (stale: StaleWorkload[], workingDirectory: string) => {
  const files = [...new Set(stale.flatMap(({ changedFiles }) => changedFiles))].map((file) =>
    relative(workingDirectory, file).replaceAll('\\', '/')
  );
  const named = files.slice(0, MAX_NAMED_STALE_FILES).join(', ');
  const more = files.length > MAX_NAMED_STALE_FILES ? ` and ${files.length - MAX_NAMED_STALE_FILES} more` : '';
  const names = stale.map(({ name }) => name).join(', ');
  return `${names} also ${stale.length === 1 ? 'uses' : 'use'} changed files (${named}${more}) and still ${stale.length === 1 ? 'runs' : 'run'} the previous build; rebuild ${stale.length === 1 ? 'it' : 'them'} or rebuild all.`;
};

addRoute('POST', '/rebuild/:workload', async ({ pathParams }) => {
  const workloadName = pathParams.workload;

  // A workload that is rebuilding finishes first; the request then builds the current files.
  if (workloadName === 'all') return toRebuildResponse(await rebuildAllWorkloads());

  const workload = agentState.workloads.find((w) => w.name === workloadName);
  if (!workload && getConfiguredBatchJobs().some(({ name }) => name === workloadName)) {
    return {
      ok: false,
      code: 'DEV_BATCH_JOB_NEEDS_RESTART',
      error: `"${workloadName}" is a batch job. It runs in AWS Batch, not on this machine, so a rebuild does not deploy its code; watch mode does not either.`,
      hint: 'Stop dev mode and start it again: the start builds the job image, pushes it when it changed and points the job definition at it. status lists the job and its last run.'
    };
  }
  if (!workload) {
    // A workload added to the configuration after the start: the result says to restart.
    const result = await rebuildWorkload(workloadName);
    if (result) return toRebuildResponse(result);
    return {
      ok: false,
      error: `Workload "${workloadName}" not found`,
      available: agentState.workloads.map((w) => w.name),
      hint: 'Use /rebuild/all to rebuild all workloads'
    };
  }

  const result = await rebuildWorkload(workloadName);
  if (!result) return { ok: false, error: `Workload "${workloadName}" not found` };
  return toRebuildResponse(result);
});

addRoute('POST', '/stop', async () => {
  if (agentState.phase === 'stopping' || agentState.phase === 'stopped') {
    return { ok: true, message: 'Already stopping' };
  }

  agentState.phase = 'stopping';
  // Before the response, so a start that follows it waits for this session.
  markOwnAgentLockStopping();
  // On Windows, process.kill(pid, 'SIGINT') doesn't emit the SIGINT event properly
  // Use process.emit('SIGINT') instead to trigger registered handlers
  setTimeout(() => {
    process.emit('SIGINT');
  }, 100);
  return { ok: true };
});

addRoute('GET', '/health', async () => {
  return { ok: true, phase: agentState.phase };
});

// ─────────────────────────────────────────────────────────────────────────────
// Local resource health endpoint
// ─────────────────────────────────────────────────────────────────────────────

addRoute('GET', '/health/:resource', async ({ pathParams }) => {
  const resourceName = pathParams.resource;
  const instance = findLocalResource(resourceName);

  if (!instance) {
    return {
      ok: false,
      error: `Resource "${resourceName}" not found`,
      available: getLocalResourceNames()
    };
  }

  // Trigger immediate health check and return result
  await triggerHealthCheck(resourceName);
  const status = getHealthStatus().get(resourceName);

  return {
    ok: true,
    name: resourceName,
    type: instance.type,
    status,
    port: instance.actualPort,
    host: instance.host
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Environment variables endpoint
// ─────────────────────────────────────────────────────────────────────────────

const ENV_MASKING_NOTE =
  'Secret values are masked: variables read from $Secret/$SsmParam, variables with secret names (password, token, key, ...) and passwords inside connection strings.';

/**
 * A batch job runs in AWS Batch, so its environment is its deployed job definition's. Secret-sourced values are masked
 * as for every other workload; the variables Batch reads from `secrets` are not in the definition's environment.
 */
const getBatchJobEnvironment = async (batchJob: ReturnType<typeof getConfiguredBatchJobs>[number]) => {
  const { name } = batchJob;
  const jobDefinitionArn =
    deployedStackOverviewManager.stackInfoMap?.resources?.[name]?.referencableParams?.jobDefinitionArn?.value;
  if (typeof jobDefinitionArn !== 'string') {
    return {
      ok: false,
      code: 'NOT_FOUND',
      error: `Batch job "${name}" is not deployed in the dev stack yet.`,
      hint: 'Start dev mode again to deploy it.'
    };
  }
  const credentials = await getDevAgentCredentials();
  if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
    return { ok: false, error: 'AWS credentials not available' };
  }
  try {
    const envVars = await getBatchJobEnvVars({ jobDefinitionArn, region: globalStateManager.region, credentials });
    if (!envVars) {
      return { ok: false, code: 'NOT_FOUND', error: `The job definition of batch job "${name}" was not found in AWS.` };
    }
    const { environment, secrets } = batchJob.container as { environment?: unknown; secrets?: unknown };
    return {
      ok: true,
      workload: name,
      type: 'batch-job',
      source: 'aws',
      jobDefinitionArn,
      envVars: maskAgentEnvironment(envVars, getSecretSourcedEnvNames({ environment })),
      count: Object.keys(envVars).length,
      ...(Array.isArray(secrets) && secrets.length
        ? { secretEnvNames: secrets.map((secret: { name?: string }) => secret.name).filter(Boolean) }
        : {}),
      note: `${ENV_MASKING_NOTE} Variables listed in secretEnvNames come from Secrets Manager or SSM when the job starts.`
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: `Failed to read the job definition of batch job "${name}": ${err instanceof Error ? err.message : 'Unknown error'}`,
      hint: 'Check AWS credentials and permissions'
    };
  }
};

addRoute('GET', '/env/:workload', async ({ pathParams }) => {
  const workloadName = pathParams.workload;

  // Check if workload exists in agent state
  const workloadState = agentState.workloads.find((w) => w.name === workloadName);
  const batchJob = workloadState ? undefined : getConfiguredBatchJobs().find(({ name }) => name === workloadName);
  if (batchJob) return getBatchJobEnvironment(batchJob);
  if (!workloadState) {
    return {
      ok: false,
      error: `Workload "${workloadName}" not found`,
      available: [...agentState.workloads.map((w) => w.name), ...getConfiguredBatchJobs().map(({ name }) => name)],
      hint: 'Use /status to see available workloads'
    };
  }

  // For Lambda functions, fetch env vars from AWS
  if (workloadState.type === 'function') {
    try {
      const lambdaEnvVars = await getLambdaEnvVars(workloadName);
      if (!lambdaEnvVars) {
        return {
          ok: false,
          error: `Lambda function "${workloadName}" not found or not deployed`,
          hint: 'Ensure the function is deployed to AWS'
        };
      }

      return {
        ok: true,
        workload: workloadName,
        type: 'function',
        source: 'aws',
        envVars: maskAgentEnvironment(lambdaEnvVars, workloadEnvironment.getSecretEnvNames(workloadName)),
        count: Object.keys(lambdaEnvVars).length,
        note: ENV_MASKING_NOTE
      };
    } catch (err: unknown) {
      return {
        ok: false,
        error: `Failed to fetch Lambda env vars: ${err instanceof Error ? err.message : 'Unknown error'}`,
        hint: 'Check AWS credentials and permissions'
      };
    }
  }

  // Other workloads get their environment from the local runner once dev mode prepared it, which for a container needs
  // the dev stack and the workload's role.
  const envVars = workloadEnvironment.getEnvVars(workloadName);
  if (!envVars) {
    const failed = workloadState.status === 'error';
    return {
      ok: false,
      code: 'WORKLOAD_NOT_STARTED',
      error: failed
        ? `"${workloadName}" failed before dev mode prepared its environment: ${workloadState.error || 'unknown error'}`
        : `"${workloadName}" is ${workloadState.status}; dev mode has not prepared its environment yet.`,
      hint: failed
        ? 'Fix the error and rebuild the workload; its environment is available once the rebuild prepares it.'
        : 'Read its environment again once the workload is running.'
    };
  }

  return {
    ok: true,
    workload: workloadName,
    type: workloadState.type,
    source: 'local',
    envVars: maskAgentEnvironment(envVars, workloadEnvironment.getSecretEnvNames(workloadName)),
    count: Object.keys(envVars).length,
    note: ENV_MASKING_NOTE
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL endpoints
// ─────────────────────────────────────────────────────────────────────────────

const getPostgresConn = (resource: string) => {
  const instance = findLocalResource(resource);
  if (!instance) return { error: `Resource "${resource}" not found`, available: getLocalResourceNames() };
  if (instance.type !== 'postgres')
    return { error: `Resource "${resource}" is not PostgreSQL (type: ${instance.type})` };

  return {
    conn: {
      host: instance.host,
      port: instance.actualPort,
      user: instance.credentials?.username || 'postgres',
      password: instance.credentials?.password ?? '',
      database: instance.dbName || 'postgres'
    }
  };
};

addRoute('POST', '/postgres/:resource/query', async ({ pathParams, body }) => {
  const { conn, error, available } = getPostgresConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { sql, limit, timeout, confirm, readOnly } = body as {
    sql?: string;
    limit?: number;
    timeout?: number;
    confirm?: boolean;
    readOnly?: boolean;
  };
  if (!sql)
    return {
      ok: false,
      error: 'Missing required field "sql"',
      hint: 'Expected: {sql: string, limit?: number, timeout?: number, confirm?: boolean, readOnly?: boolean}'
    };

  return postgresQuery(conn!, { sql, limit, timeout, confirm, readOnly: readOnly === true });
});

addRoute('GET', '/postgres/:resource/schema', async ({ pathParams, query }) => {
  const { conn, error, available } = getPostgresConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const tablesParam = query.get('tables');
  const tables = tablesParam ? tablesParam.split(',').map((t) => t.trim()) : undefined;

  return postgresSchema(conn!, { tables });
});

addRoute('GET', '/postgres/:resource/tables', async ({ pathParams }) => {
  const { conn, error, available } = getPostgresConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  return postgresTables(conn!);
});

addRoute('POST', '/postgres/:resource/explain', async ({ pathParams, body }) => {
  const { conn, error, available } = getPostgresConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { sql, analyze } = body as { sql?: string; analyze?: boolean };
  if (!sql)
    return { ok: false, error: 'Missing required field "sql"', hint: 'Expected: {sql: string, analyze?: boolean}' };

  return postgresExplain(conn!, { sql, analyze });
});

addRoute('GET', '/postgres/:resource/indexes', async ({ pathParams, query }) => {
  const { conn, error, available } = getPostgresConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const table = query.get('table') || undefined;
  return postgresIndexes(conn!, { table });
});

addRoute('GET', '/postgres/:resource/stats', async ({ pathParams, query }) => {
  const { conn, error, available } = getPostgresConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const table = query.get('table') || undefined;
  return postgresStats(conn!, { table });
});

addRoute('GET', '/postgres/:resource/sample', async ({ pathParams, query }) => {
  const { conn, error, available } = getPostgresConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const table = query.get('table');
  if (!table)
    return { ok: false, error: 'Missing required query param "table"', hint: 'Expected: ?table=tableName&limit=5' };

  const limit = query.get('limit') ? Number(query.get('limit')) : 5;
  return postgresSample(conn!, { table, limit });
});

// ─────────────────────────────────────────────────────────────────────────────
// MySQL endpoints
// ─────────────────────────────────────────────────────────────────────────────

const getMysqlConn = (resource: string) => {
  const instance = findLocalResource(resource);
  if (!instance) return { error: `Resource "${resource}" not found`, available: getLocalResourceNames() };
  if (instance.type !== 'mysql' && instance.type !== 'mariadb') {
    return { error: `Resource "${resource}" is not MySQL/MariaDB (type: ${instance.type})` };
  }

  return {
    conn: {
      host: instance.host,
      port: instance.actualPort,
      user: instance.credentials?.username || 'root',
      password: instance.credentials?.password ?? '',
      database: instance.dbName || 'mysql'
    }
  };
};

addRoute('POST', '/mysql/:resource/query', async ({ pathParams, body }) => {
  const { conn, error, available } = getMysqlConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { sql, limit, timeout, confirm, readOnly } = body as {
    sql?: string;
    limit?: number;
    timeout?: number;
    confirm?: boolean;
    readOnly?: boolean;
  };
  if (!sql)
    return {
      ok: false,
      error: 'Missing required field "sql"',
      hint: 'Expected: {sql: string, limit?: number, timeout?: number, confirm?: boolean, readOnly?: boolean}'
    };

  return mysqlQuery(conn!, { sql, limit, timeout, confirm, readOnly: readOnly === true });
});

addRoute('GET', '/mysql/:resource/schema', async ({ pathParams, query }) => {
  const { conn, error, available } = getMysqlConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const tablesParam = query.get('tables');
  const tables = tablesParam ? tablesParam.split(',').map((t) => t.trim()) : undefined;

  return mysqlSchema(conn!, { tables });
});

addRoute('GET', '/mysql/:resource/tables', async ({ pathParams }) => {
  const { conn, error, available } = getMysqlConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  return mysqlTables(conn!);
});

addRoute('POST', '/mysql/:resource/explain', async ({ pathParams, body }) => {
  const { conn, error, available } = getMysqlConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { sql, format } = body as { sql?: string; format?: 'traditional' | 'json' | 'tree' };
  if (!sql)
    return {
      ok: false,
      error: 'Missing required field "sql"',
      hint: 'Expected: {sql: string, format?: "traditional"|"json"|"tree"}'
    };

  return mysqlExplain(conn!, { sql, format });
});

addRoute('GET', '/mysql/:resource/indexes', async ({ pathParams, query }) => {
  const { conn, error, available } = getMysqlConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const table = query.get('table') || undefined;
  return mysqlIndexes(conn!, { table });
});

addRoute('GET', '/mysql/:resource/stats', async ({ pathParams, query }) => {
  const { conn, error, available } = getMysqlConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const table = query.get('table') || undefined;
  return mysqlStats(conn!, { table });
});

addRoute('GET', '/mysql/:resource/sample', async ({ pathParams, query }) => {
  const { conn, error, available } = getMysqlConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const table = query.get('table');
  if (!table)
    return { ok: false, error: 'Missing required query param "table"', hint: 'Expected: ?table=tableName&limit=5' };

  const limit = query.get('limit') ? Number(query.get('limit')) : 5;
  return mysqlSample(conn!, { table, limit });
});

// ─────────────────────────────────────────────────────────────────────────────
// Redis endpoints
// ─────────────────────────────────────────────────────────────────────────────

const getRedisConn = (resource: string) => {
  const instance = findLocalResource(resource);
  if (!instance) return { error: `Resource "${resource}" not found`, available: getLocalResourceNames() };
  if (instance.type !== 'redis') return { error: `Resource "${resource}" is not Redis (type: ${instance.type})` };

  return {
    conn: {
      host: instance.host,
      port: instance.actualPort,
      password: instance.credentials?.password
    }
  };
};

addRoute('POST', '/redis/:resource/command', async ({ pathParams, body }) => {
  const { conn, error, available } = getRedisConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { cmd, confirm, readOnly } = body as { cmd?: string; confirm?: boolean; readOnly?: boolean };
  if (!cmd)
    return {
      ok: false,
      error: 'Missing required field "cmd"',
      hint: 'Expected: {cmd: "GET key", confirm?: true (for destructive commands)}'
    };

  return redisCommand(conn!, { cmd, confirm, readOnly: readOnly === true });
});

addRoute('GET', '/redis/:resource/keys', async ({ pathParams, query }) => {
  const { conn, error, available } = getRedisConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const pattern = query.get('pattern') || '*';
  const limit = query.get('limit') ? Number(query.get('limit')) : 100;

  return redisKeys(conn!, { pattern, limit });
});

addRoute('GET', '/redis/:resource/get', async ({ pathParams, query }) => {
  const { conn, error, available } = getRedisConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const key = query.get('key');
  if (!key) return { ok: false, error: 'Missing required query param "key"', hint: 'Expected: ?key=mykey' };

  return redisGet(conn!, { key });
});

addRoute('GET', '/redis/:resource/ttl', async ({ pathParams, query }) => {
  const { conn, error, available } = getRedisConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const key = query.get('key');
  if (!key) return { ok: false, error: 'Missing required query param "key"', hint: 'Expected: ?key=mykey' };

  return redisTtl(conn!, { key });
});

addRoute('GET', '/redis/:resource/info', async ({ pathParams, query }) => {
  const { conn, error, available } = getRedisConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const section = query.get('section') || undefined;
  return redisInfo(conn!, { section });
});

addRoute('GET', '/redis/:resource/type', async ({ pathParams, query }) => {
  const { conn, error, available } = getRedisConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const key = query.get('key');
  if (!key) return { ok: false, error: 'Missing required query param "key"', hint: 'Expected: ?key=mykey' };

  return redisType(conn!, { key });
});

// ─────────────────────────────────────────────────────────────────────────────
// DynamoDB endpoints
// ─────────────────────────────────────────────────────────────────────────────

const getDynamoConn = (resource: string) => {
  const instance = findLocalResource(resource);
  const deployed = instance ? undefined : getDeployedDynamoTables().find(({ name }) => name === resource);
  if (deployed) {
    return {
      error: `"${resource}" is the deployed table ${deployed.tableName} in AWS. Dev mode reads it (query, scan, schema) and writes only to local databases.`
    };
  }
  if (!instance) return { error: `Resource "${resource}" not found`, available: getLocalResourceNames() };
  if (instance.type !== 'dynamodb') return { error: `Resource "${resource}" is not DynamoDB (type: ${instance.type})` };

  return {
    conn: {
      mode: 'local' as const,
      port: instance.actualPort,
      tableName: instance.name
    }
  };
};

/**
 * The DynamoDB tables the dev stack deploys instead of running them locally: remote resources, and tables a deployed
 * function's stream trigger reads. Dev mode reads them in AWS (scan, query, schema) and never writes to them.
 */
export const getDeployedDynamoTables = (): { name: string; type: 'dynamodb'; tableName: string }[] =>
  Object.entries(deployedStackOverviewManager.stackInfoMap?.resources ?? {}).flatMap(([name, resource]) => {
    const tableName = (resource?.referencableParams as Record<string, { value?: unknown } | undefined>)?.name?.value;
    return resource?.resourceType === 'dynamo-db-table' && typeof tableName === 'string' && !findLocalResource(name)
      ? [{ name, type: 'dynamodb' as const, tableName }]
      : [];
  });

/**
 * What the dev stack deploys, with the AWS name, ARN and URL of each resource: an agent finds a queue it wants to
 * inspect with `aws` (a dead-letter queue, for example) without guessing its name. Only these parameters are listed; a
 * connection string or a password never leaves through status. Workloads and databases that run on this machine are
 * in `workloads` and `localResources` instead.
 */
export const getDeployedResources = (
  resources: Record<
    string,
    { resourceType?: string; referencableParams?: Record<string, { value?: unknown } | undefined> } | undefined
  > = deployedStackOverviewManager.stackInfoMap?.resources ?? {}
): { name: string; type: string; awsName?: string; arn?: string; url?: string }[] =>
  Object.entries(resources).flatMap(([name, resource]) => {
    const type = resource?.resourceType;
    if (!type || findLocalResource(name) || isResourceTypeExcludedInDevMode(type as StpResourceType)) return [];
    const param = (key: string) => {
      const value = resource.referencableParams?.[key]?.value;
      return typeof value === 'string' ? value : undefined;
    };
    const address = { awsName: param('name'), arn: param('arn'), url: param('url') };
    if (!address.awsName && !address.arn && !address.url) return [];
    return [{ name, type, ...Object.fromEntries(Object.entries(address).filter(([, value]) => value !== undefined)) }];
  });

/** The batch jobs of the session's configuration; none before the configuration is loaded. */
const getConfiguredBatchJobs = () => (configManager.config?.resources ? configManager.batchJobs : []);

/** How long status waits for the last run of a batch job; status must answer even when AWS is slow. */
const BATCH_JOB_LOOKUP_TIMEOUT_MS = 8000;

type BatchJobRun = {
  status?: string;
  startedAt?: string;
  stoppedAt?: string;
  error?: string;
  cause?: string;
  /** The AWS Batch job the run submitted: whether it waits for capacity, starts or runs, and its log stream. */
  job?: BatchJobDetails | { jobId?: string; lookupError: string };
};

/** The Batch job an execution submitted last; `undefined` before it submitted one. */
const getSubmittedBatchJob = async (
  executionArn: string,
  context: Parameters<typeof executeAwsSdkCommand>[3]
): Promise<BatchJobRun['job'] | undefined> => {
  const history = await executeAwsSdkCommand(
    'sfn',
    'GetExecutionHistory',
    { executionArn, reverseOrder: true, maxResults: 50 },
    context
  );
  if (history.ok === false) return { lookupError: history.error };
  const jobId = findSubmittedBatchJobId((history.data as { events?: [] })?.events ?? []);
  if (!jobId) return undefined;
  const described = await executeAwsSdkCommand('batch', 'DescribeJobs', { jobs: [jobId] }, context);
  if (described.ok === false) return { jobId, lookupError: described.error };
  const [job] = (described.data as { jobs?: Record<string, unknown>[] })?.jobs ?? [];
  return job ? describeBatchJob(job) : undefined;
};

/** The latest execution of the job's state machine, which submits the job to AWS Batch and waits for it. */
const getLastBatchJobRun = async (stateMachineArn: string): Promise<BatchJobRun | { lookupError: string } | null> => {
  const credentials = await getDevAgentCredentials();
  if (!credentials?.accessKeyId || !credentials?.secretAccessKey)
    return { lookupError: 'AWS credentials not available' };
  const context = {
    region: globalStateManager.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken
    }
  };
  const listed = await executeAwsSdkCommand('sfn', 'ListExecutions', { stateMachineArn, maxResults: 1 }, context);
  if (listed.ok === false) return { lookupError: listed.error };
  const [execution] = ((listed.data as { executions?: Record<string, unknown>[] })?.executions ?? []) as {
    executionArn: string;
    status?: string;
    startDate?: Date | string;
    stopDate?: Date | string;
  }[];
  if (!execution) return null;
  const time = (value: Date | string | undefined) => (value ? new Date(value).toISOString() : undefined);
  const job = await getSubmittedBatchJob(execution.executionArn, context);
  const run: BatchJobRun = {
    status: execution.status,
    startedAt: time(execution.startDate),
    stoppedAt: time(execution.stopDate),
    ...(job ? { job } : {})
  };
  if (execution.status !== 'FAILED') return run;
  const described = await executeAwsSdkCommand(
    'sfn',
    'DescribeExecution',
    { executionArn: execution.executionArn },
    context
  );
  if (!described.ok) return run;
  const { error, cause } = described.data as { error?: string; cause?: string };
  return { ...run, error, cause: cause && describeBatchFailureCause(cause) };
};

/** The reason AWS Batch gives in a failed execution's cause, which is the job description as JSON. */
export const describeBatchFailureCause = (cause: string) => {
  try {
    const job = JSON.parse(cause) as { StatusReason?: string; Container?: { Reason?: string; ExitCode?: number } };
    const reasons = [job.StatusReason, job.Container?.Reason].filter(Boolean);
    if (job.Container?.ExitCode !== undefined) reasons.push(`exit code ${job.Container.ExitCode}`);
    if (reasons.length) return [...new Set(reasons)].join('; ');
  } catch {
    // Not the job description.
  }
  return cause.slice(0, 500);
};

/**
 * The batch jobs of the dev stack. They run in AWS Batch, not on this machine: a message on their queue or a schedule
 * submits them. Each entry names the job definition, queue and log group an agent reads with `aws` and `logs`, and how
 * the last run went. The image is the one the session's start built and pushed.
 */
export const getDeployedBatchJobs = async () => {
  const { stackName } = globalStateManager.targetStack;
  const deployed = deployedStackOverviewManager.stackInfoMap?.resources ?? {};
  return Promise.all(
    getConfiguredBatchJobs().map(async ({ name, useSpotInstances, resources }) => {
      const params = (deployed[name]?.referencableParams ?? {}) as Record<string, { value?: unknown } | undefined>;
      const param = (key: string) =>
        typeof params[key]?.value === 'string' ? (params[key]!.value as string) : undefined;
      const stateMachineArn = param('stateMachineArn');
      const jobDefinition = templateManager.oldTemplate?.Resources?.[cfLogicalNames.batchJobDefinition(name)] as
        | { Properties?: { ContainerProperties?: { Image?: unknown } } }
        | undefined;
      const image = jobDefinition?.Properties?.ContainerProperties?.Image;
      const lastRun = stateMachineArn
        ? await Promise.race([
            getLastBatchJobRun(stateMachineArn).catch((error: Error) => ({ lookupError: error.message })),
            new Promise<{ lookupError: string }>((resolve) =>
              setTimeout(
                () => resolve({ lookupError: `AWS did not answer within ${BATCH_JOB_LOOKUP_TIMEOUT_MS / 1000} s` }),
                BATCH_JOB_LOOKUP_TIMEOUT_MS
              ).unref()
            )
          ])
        : undefined;
      return {
        name,
        runsIn: 'AWS Batch',
        jobDefinitionArn: param('jobDefinitionArn'),
        jobQueue: awsResourceNames.batchJobQueue(stackName, Boolean(useSpotInstances), Boolean(resources.gpu)),
        stateMachineArn,
        logGroup: awsResourceNames.batchJobLogGroup({ stackName, stpResourceName: name }),
        ...(typeof image === 'string' ? { image } : {}),
        // `lastRun.status` is the state machine's; `lastRun.job` is the AWS Batch job it submitted.
        lastRun: lastRun ?? 'not run yet',
        codeChanges: 'deployed by the next start of dev mode; rebuild and watch do not deploy batch jobs'
      };
    })
  );
};

/** A local table, or a deployed one for reading. */
const getReadableDynamoConn = async (
  resource: string
): Promise<{ conn?: DynamoDbConnectionOpts; deployed?: true; error?: string; available?: string[] }> => {
  const deployed = findLocalResource(resource)
    ? undefined
    : getDeployedDynamoTables().find(({ name }) => name === resource);
  if (!deployed) return getDynamoConn(resource);
  const { accessKeyId, secretAccessKey, sessionToken } = await getDevAgentCredentials();
  return {
    deployed: true,
    conn: {
      mode: 'deployed',
      tableName: deployed.tableName,
      region: globalStateManager.region,
      credentials: { accessKeyId, secretAccessKey, sessionToken }
    }
  };
};

/** Marks a read of a deployed table, so a caller never mistakes AWS data for the local database. */
const fromDeployedTable = <T extends object>(result: T, conn: DynamoDbConnectionOpts, deployed?: true) =>
  deployed ? { ...result, deployed: true, table: conn.tableName, region: globalStateManager.region } : result;

addRoute('POST', '/dynamodb/:resource/query', async ({ pathParams, body }) => {
  const { conn, deployed, error, available } = await getReadableDynamoConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { pk, sk, index, limit } = body as {
    pk?: Record<string, unknown>;
    sk?: Record<string, unknown>;
    index?: string;
    limit?: number;
  };
  if (!pk)
    return {
      ok: false,
      error: 'Missing required field "pk"',
      hint: 'Expected: {pk: {userId: "123"}, sk?: {orderId: "456"}, index?: "gsi-name", limit?: 100}'
    };

  return fromDeployedTable(await dynamoDbQuery(conn!, { pk, sk, index, limit }), conn!, deployed);
});

addRoute('POST', '/dynamodb/:resource/scan', async ({ pathParams, body }) => {
  const { conn, deployed, error, available } = await getReadableDynamoConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { filter, limit } = body as { filter?: string; limit?: number };
  return fromDeployedTable(await dynamoDbScan(conn!, { filter, limit }), conn!, deployed);
});

addRoute('POST', '/dynamodb/:resource/get', async ({ pathParams, body }) => {
  const { conn, error, available } = getDynamoConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { pk, sk } = body as { pk?: Record<string, unknown>; sk?: Record<string, unknown> };
  if (!pk)
    return {
      ok: false,
      error: 'Missing required field "pk"',
      hint: 'Expected: {pk: {userId: "123"}, sk?: {orderId: "456"}}'
    };

  return dynamoDbGet(conn!, { pk, sk });
});

addRoute('POST', '/dynamodb/:resource/put', async ({ pathParams, body }) => {
  const { conn, error, available } = getDynamoConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { item } = body as { item?: Record<string, unknown> };
  if (!item)
    return {
      ok: false,
      error: 'Missing required field "item"',
      hint: 'Expected: {item: {pk: "123", sk: "456", data: "value"}}'
    };

  return dynamoDbPut(conn!, { item });
});

addRoute('POST', '/dynamodb/:resource/delete', async ({ pathParams, body }) => {
  const { conn, error, available } = getDynamoConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { pk, sk } = body as { pk?: Record<string, unknown>; sk?: Record<string, unknown> };
  if (!pk)
    return {
      ok: false,
      error: 'Missing required field "pk"',
      hint: 'Expected: {pk: {userId: "123"}, sk?: {orderId: "456"}}'
    };

  return dynamoDbDelete(conn!, { pk, sk });
});

addRoute('GET', '/dynamodb/:resource/schema', async ({ pathParams }) => {
  const { conn, deployed, error, available } = await getReadableDynamoConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  return fromDeployedTable(await dynamoDbSchema(conn!), conn!, deployed);
});

addRoute('GET', '/dynamodb/:resource/sample', async ({ pathParams, query }) => {
  const { conn, deployed, error, available } = await getReadableDynamoConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const limit = query.get('limit') ? Number(query.get('limit')) : 5;
  return fromDeployedTable(await dynamoDbSample(conn!, { limit }), conn!, deployed);
});

// ─────────────────────────────────────────────────────────────────────────────
// OpenSearch endpoints
// ─────────────────────────────────────────────────────────────────────────────

const getOpenSearchConn = (resource: string) => {
  const instance = findLocalResource(resource);
  if (!instance) return { error: `Resource "${resource}" not found`, available: getLocalResourceNames() };
  if (instance.type !== 'opensearch')
    return { error: `Resource "${resource}" is not OpenSearch (type: ${instance.type})` };

  return { conn: { mode: 'local' as const, port: instance.actualPort } };
};

addRoute('POST', '/opensearch/:resource/search', async ({ pathParams, body }) => {
  const { conn, error, available } = getOpenSearchConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { query, index, limit } = body as { query?: Record<string, unknown>; index?: string; limit?: number };
  if (!query)
    return {
      ok: false,
      error: 'Missing required field "query"',
      hint: 'Expected: {query: {match: {field: "value"}}, index?: "idx", limit?: 10}'
    };

  return opensearchSearch(conn!, { query, index, limit });
});

addRoute('GET', '/opensearch/:resource/get', async ({ pathParams, query }) => {
  const { conn, error, available } = getOpenSearchConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const index = query.get('index');
  const id = query.get('id');
  if (!index || !id)
    return { ok: false, error: 'Missing required query params', hint: 'Expected: ?index=myindex&id=docid' };

  return opensearchGet(conn!, { index, id });
});

addRoute('POST', '/opensearch/:resource/put', async ({ pathParams, body }) => {
  const { conn, error, available } = getOpenSearchConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { index, id, doc } = body as { index?: string; id?: string; doc?: Record<string, unknown> };
  if (!index || !doc)
    return {
      ok: false,
      error: 'Missing required fields',
      hint: 'Expected: {index: "myindex", id?: "docid", doc: {...}}'
    };

  return opensearchPut(conn!, { index, id, doc });
});

addRoute('POST', '/opensearch/:resource/delete', async ({ pathParams, body }) => {
  const { conn, error, available } = getOpenSearchConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { index, id } = body as { index?: string; id?: string };
  if (!index || !id)
    return { ok: false, error: 'Missing required fields', hint: 'Expected: {index: "myindex", id: "docid"}' };

  return opensearchDelete(conn!, { index, id });
});

addRoute('GET', '/opensearch/:resource/indices', async ({ pathParams }) => {
  const { conn, error, available } = getOpenSearchConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  return opensearchIndices(conn!);
});

addRoute('GET', '/opensearch/:resource/mapping', async ({ pathParams, query }) => {
  const { conn, error, available } = getOpenSearchConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const index = query.get('index');
  if (!index) return { ok: false, error: 'Missing required query param "index"', hint: 'Expected: ?index=myindex' };

  return opensearchMapping(conn!, { index });
});

addRoute('POST', '/opensearch/:resource/analyze', async ({ pathParams, body }) => {
  const { conn, error, available } = getOpenSearchConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { text, analyzer, index } = body as { text?: string; analyzer?: string; index?: string };
  if (!text)
    return {
      ok: false,
      error: 'Missing required field "text"',
      hint: 'Expected: {text: "analyze this", analyzer?: "standard", index?: "myindex"}'
    };

  return opensearchAnalyze(conn!, { text, analyzer, index });
});

addRoute('GET', '/opensearch/:resource/count', async ({ pathParams, query }) => {
  const { conn, error, available } = getOpenSearchConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const index = query.get('index') || undefined;
  return opensearchCount(conn!, { index });
});

// ─────────────────────────────────────────────────────────────────────────────
// Reset and seed local databases
// ─────────────────────────────────────────────────────────────────────────────

/** Deletes a local database's data and keeps its schema; only instances this session runs on this machine get here. */
const resetLocalDatabase = async (
  instance: LocalResourceInstance,
  keepTables?: string[]
): Promise<{ ok: boolean; error?: string } & Record<string, unknown>> => {
  if (instance.type === 'postgres') return postgresReset(getPostgresConn(instance.name).conn!, { keepTables });
  if (instance.type === 'mysql' || instance.type === 'mariadb') {
    return mysqlReset(getMysqlConn(instance.name).conn!, { keepTables });
  }
  if (instance.type === 'redis') {
    const result = await redisCommand(getRedisConn(instance.name).conn!, { cmd: 'FLUSHALL', confirm: true });
    return result.ok ? { ok: true, flushedAllKeys: true } : result;
  }
  if (instance.type === 'dynamodb') return dynamoDbReset(getDynamoConn(instance.name).conn!);
  return {
    ok: false,
    error: `Reset does not support ${instance.type}.`,
    hint: 'Restart dev mode with --fresh-db to delete its data.'
  };
};

const RESETTABLE_TYPES = new Set(['postgres', 'mysql', 'mariadb', 'redis', 'dynamodb']);

addRoute('POST', '/reset/:resource', async ({ pathParams, body }) => {
  const { confirm, keepTables } = (body ?? {}) as { confirm?: boolean; keepTables?: string[] };
  if (confirm !== true) {
    return {
      ok: false,
      code: 'DESTRUCTIVE_OPERATION',
      error: 'Resetting deletes all data of the local database and requires confirmation',
      hint: 'To proceed, set confirm: true in the request body.'
    };
  }
  if (keepTables !== undefined && (!Array.isArray(keepTables) || keepTables.some((name) => typeof name !== 'string'))) {
    return { ok: false, code: 'VALIDATION_ERROR', error: 'keepTables must be an array of table names' };
  }

  const all = pathParams.resource === 'all';
  const instance = all ? undefined : findLocalResource(pathParams.resource);
  const deployedTable =
    all || instance ? undefined : getDeployedDynamoTables().find(({ name }) => name === pathParams.resource);
  if (deployedTable) {
    return {
      ok: false,
      code: 'NOT_LOCAL_RESOURCE',
      error: `"${deployedTable.name}" is the deployed DynamoDB table ${deployedTable.tableName} in ${globalStateManager.region}, not a local database. Reset deletes data of local databases only and never in AWS.`,
      hint: `Read it with query (resource "${deployedTable.name}"). To delete its items, use the AWS console or \`aws dynamodb delete-item --table-name ${deployedTable.tableName} --region ${globalStateManager.region}\`.`
    };
  }
  if (!all && !instance) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      error: `"${pathParams.resource}" is not a database that this dev session runs locally. Reset changes local databases only.`,
      available: getLocalResourceNames()
    };
  }
  const instances = instance ? [instance] : getRunningLocalInstances().filter(({ type }) => RESETTABLE_TYPES.has(type));
  const skipped = all
    ? getRunningLocalInstances()
        .filter(({ type }) => !RESETTABLE_TYPES.has(type))
        .map(({ name }) => name)
    : [];

  const results: Record<string, unknown>[] = [];
  for (const target of instances) {
    const { ok, ...result } = await resetLocalDatabase(target, keepTables);
    agentLog('dev', `${ok ? 'Reset' : 'Reset failed:'} local database ${target.name}`, ok ? 'info' : 'error');
    results.push({ resource: target.name, type: target.type, ok, ...result });
  }
  const failed = results.filter(({ ok }) => !ok);
  return {
    ok: failed.length === 0,
    ...(failed.length
      ? { code: 'RESET_FAILED', error: `Reset failed for ${failed.map(({ resource }) => resource).join(', ')}` }
      : {
          message: results.length
            ? `Reset ${results.map(({ resource }) => resource).join(', ')}.`
            : 'No local databases.'
        }),
    results,
    ...(skipped.length
      ? {
          skipped,
          hint: 'Reset does not support these resources; restart dev mode with --fresh-db to delete their data.'
        }
      : {})
  };
});

addRoute('POST', '/scripts/:script/run', async ({ pathParams, body }) => {
  const { timeoutSeconds } = (body ?? {}) as { timeoutSeconds?: unknown };
  if (timeoutSeconds !== undefined && typeof timeoutSeconds !== 'number') {
    return { ok: false, code: 'VALIDATION_ERROR', error: 'timeoutSeconds must be a number' };
  }
  if (typeof timeoutSeconds === 'number') return runSeedScript(pathParams.script, { timeoutSeconds });
  return runSeedScript(pathParams.script);
});

// ─────────────────────────────────────────────────────────────────────────────
// AWS SDK endpoint
// ─────────────────────────────────────────────────────────────────────────────

addRoute('POST', '/aws/sdk', async ({ body }) => {
  const { service, command, input, region } = body as {
    service?: string;
    command?: string;
    input?: Record<string, unknown>;
    region?: string;
  };

  if (!service || !command) {
    return {
      ok: false,
      error: 'Missing required fields "service" and "command"',
      hint: 'Expected: {service: "lambda", command: "ListFunctions", input?: {MaxItems: 10}, region?: "us-east-1"}'
    };
  }

  // The dev agent reads the session's stack. Its role allows resources by the stack's name in any region, so a stack of
  // the same name elsewhere, or a resource another region gives the same name, is outside the session.
  const awsRegion = globalStateManager.region;
  if (region && region !== awsRegion) {
    return {
      ok: false,
      code: 'OPERATION_NOT_ALLOWED',
      error: `This dev session reads its stack in ${awsRegion}, not ${region}.`,
      hint: 'Leave out region. For another region, use `stacktape aws:call` with that stage and region.'
    };
  }

  // Use dev agent role credentials (scoped to stack) or fall back to user credentials
  const credentials = await getDevAgentCredentials();
  if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
    return { ok: false, error: 'AWS credentials not available' };
  }

  // Batch reads are scoped by the stack's own resources, which IAM cannot do for them; the scope also fixes the region.
  const batchScope =
    resolveAwsServiceName(service) === 'batch'
      ? scopeBatchCall({
          command,
          input: input || {},
          region: awsRegion,
          scope: getBatchScope(stackManager.existingStackResources)
        })
      : { input: input || {} };
  if ('refusal' in batchScope) {
    return { ok: false, code: 'OPERATION_NOT_ALLOWED', error: batchScope.refusal };
  }

  const result = await executeAwsSdkCommand(service, command, batchScope.input, {
    region: awsRegion,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken
    }
  });
  return result.ok && batchScope.filterResponse ? { ...result, data: batchScope.filterResponse(result.data) } : result;
});

addRoute('GET', '/aws/sdk/services', async () => {
  return { ok: true, data: AWS_READ_ONLY_OPERATIONS };
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Server
// ─────────────────────────────────────────────────────────────────────────────

const isValidToken = (authorization: string | undefined): boolean => {
  if (!agentToken || !authorization?.startsWith('Bearer ')) return false;
  const presented = Buffer.from(authorization.slice('Bearer '.length).trim());
  const expected = Buffer.from(agentToken);
  return presented.length === expected.length && timingSafeEqual(presented, expected);
};

/**
 * The agent runs SQL, rebuilds workloads, stops dev mode and reads environments, so only local programs that can read
 * the session token may call it. A web page could otherwise reach it: browsers send "simple" cross-origin POSTs
 * without a preflight, and DNS rebinding lets a page address 127.0.0.1 under its own host name. Requests that name
 * another host, come from a browser (any Origin header), lack the token, or post something other than JSON are refused
 * before any route runs.
 */
const rejectUntrustedRequest = (req: IncomingMessage): { status: number; code: string; message: string } | null => {
  const host = req.headers.host;
  if (host !== `${AGENT_HOST}:${agentPort}` && host !== `localhost:${agentPort}`) {
    return {
      status: 403,
      code: 'FORBIDDEN',
      message: `Host "${host ?? ''}" is not accepted. Call the dev agent at http://${AGENT_HOST}:${agentPort}.`
    };
  }
  if (req.headers.origin !== undefined) {
    return { status: 403, code: 'FORBIDDEN', message: 'The dev agent does not accept requests from web pages.' };
  }
  if (!isValidToken(req.headers.authorization)) {
    return {
      status: 401,
      code: 'UNAUTHORIZED',
      message: `Send the dev agent session token as "Authorization: Bearer <token>". Read it from ${agentTokenFile}.`
    };
  }
  const contentType = req.headers['content-type']?.split(';')[0].trim().toLowerCase();
  if (req.method === 'POST' && contentType !== 'application/json') {
    return {
      status: 415,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'POST requests to the dev agent must send "content-type: application/json".'
    };
  }
  return null;
};

const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || '', `http://${AGENT_HOST}:${agentPort}`);
  const pathname = url.pathname;

  res.setHeader('Content-Type', 'application/json');

  const rejection = rejectUntrustedRequest(req);
  if (rejection) {
    res.statusCode = rejection.status;
    res.end(
      JSON.stringify({ v: '1.0', ok: false, code: rejection.code, message: rejection.message } as DevAgentEnvelope)
    );
    req.resume();
    return;
  }

  if (req.method === 'OPTIONS') {
    // Reject CORS preflight - browsers won't proceed with the actual request
    res.statusCode = 403;
    res.end(
      JSON.stringify({
        v: '1.0',
        ok: false,
        code: 'READ_ONLY_VIOLATION',
        message: 'CORS requests not allowed'
      } as DevAgentEnvelope)
    );
    return;
  }

  // Root path - return available endpoints
  if (pathname === '/' || pathname === '') {
    res.statusCode = 200;
    const compact = url.searchParams.get('compact') === 'true';
    res.end(
      JSON.stringify({
        v: '1.0',
        ok: true,
        code: 'OK',
        message: 'Endpoint documentation',
        data: compact ? buildCompactDocumentation() : buildEndpointDocumentation()
      } as DevAgentEnvelope)
    );
    return;
  }

  // Find matching route
  for (const route of routes) {
    if (req.method !== route.method) continue;

    const match = pathname.match(route.pattern);
    if (!match) continue;

    // Extract path params. A malformed escape (`%ZZ`) is the request's mistake, not an error of the agent.
    const pathParams: Record<string, string> = {};
    try {
      route.paramNames.forEach((name, i) => {
        pathParams[name] = decodeURIComponent(match[i + 1]);
      });
    } catch {
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          v: '1.0',
          ok: false,
          code: 'VALIDATION_ERROR',
          message: `The path ${pathname} has a malformed percent-encoded character.`
        } as DevAgentEnvelope)
      );
      return;
    }

    // Parse body for POST
    let body: unknown = {};
    if (req.method === 'POST') {
      const bodyStr = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', (chunk: Buffer) => {
          data += chunk;
        });
        req.on('end', () => resolve(data));
      });

      if (bodyStr && bodyStr.trim()) {
        body = safeJsonParse(bodyStr);
        if (body === undefined) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              v: '1.0',
              ok: false,
              code: 'VALIDATION_ERROR',
              message: 'Invalid JSON in request body'
            } as DevAgentEnvelope)
          );
          return;
        }
      }
    }

    try {
      const result = await route.handler({ pathParams, query: url.searchParams, body });
      res.statusCode = 200;
      res.end(JSON.stringify(toDevAgentEnvelope(result)));
    } catch (err: unknown) {
      res.statusCode = 500;
      const message = err instanceof Error ? err.message : 'Internal error';
      res.end(
        JSON.stringify({
          v: '1.0',
          ok: false,
          code: 'INTERNAL_ERROR',
          message
        } as DevAgentEnvelope)
      );
    }
    return;
  }

  // No route matched
  res.statusCode = 404;
  res.end(
    JSON.stringify({
      v: '1.0',
      ok: false,
      code: 'NOT_FOUND',
      message: 'Not found',
      data: { hint: 'GET / for available endpoints' }
    } as DevAgentEnvelope)
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Endpoint Documentation
// ─────────────────────────────────────────────────────────────────────────────

const AUTH_HINT =
  'Header "Authorization: Bearer <token>" with the token read from tokenFile; POST requests also need "content-type: application/json".';

/**
 * Compact documentation for LLMs - minimal tokens, action-oriented.
 * Use GET /?compact=true
 */
const buildCompactDocumentation = () => {
  const instances = getRunningLocalInstances();
  const workloads = agentState.workloads.map((w) => w.name);

  // Build resource list with primary action
  const resources: Record<string, { type: string; query: string; schema: string }> = {};
  for (const instance of instances) {
    const { name, type } = instance;
    if (type === 'postgres' || type === 'mysql' || type === 'mariadb') {
      const dbType = type === 'mariadb' ? 'mysql' : type;
      resources[name] = {
        type,
        query: `POST /${dbType}/${name}/query {"sql": "SELECT ..."}`,
        schema: `GET /${dbType}/${name}/schema`
      };
    } else if (type === 'redis') {
      resources[name] = {
        type,
        query: `POST /redis/${name}/command {"cmd": "GET key"}`,
        schema: `GET /redis/${name}/keys`
      };
    } else if (type === 'dynamodb') {
      resources[name] = {
        type,
        query: `POST /dynamodb/${name}/scan {"limit": 10}`,
        schema: `GET /dynamodb/${name}/schema`
      };
    } else if (type === 'opensearch') {
      resources[name] = {
        type,
        query: `POST /opensearch/${name}/search {"query": {"match_all": {}}}`,
        schema: `GET /opensearch/${name}/indices`
      };
    }
  }

  return {
    phase: agentState.phase,
    auth: AUTH_HINT,
    tokenFile: agentTokenFile,
    workloads,
    resources,
    actions: {
      rebuild: 'POST /rebuild/{name} or /rebuild/all',
      logs: 'GET /logs (returns file path for tail/grep)',
      env: 'GET /env/{workload}',
      reset: 'POST /reset/{database} or /reset/all {"confirm": true, "keepTables"?: [...]}',
      seed: 'POST /scripts/{script}/run {"timeoutSeconds"?: 50} (a local-script from the config, against the local databases)',
      aws: 'POST /aws/sdk {"service": "lambda", "command": "ListFunctions", "input": {}}',
      stop: 'POST /stop'
    },
    fullDocs: 'GET / (without ?compact=true)'
  };
};

const buildEndpointDocumentation = () => {
  const instances = getRunningLocalInstances();
  const docs: Record<string, Record<string, string>> = {};

  docs['auth'] = { 'Every request': AUTH_HINT, tokenFile: agentTokenFile ?? '' };

  // Core endpoints
  docs['core'] = {
    'GET  /status': '?verbose=true (optional)',
    'GET  /logs': 'Returns JSONL log file path (use tail/grep/jq)',
    'GET  /env/:workload': '',
    'GET  /health/:resource': 'Check health of local resource',
    'POST /rebuild/:workload': '{} or use /rebuild/all',
    'POST /reset/:database': '{confirm: true, keepTables?} or use /reset/all; deletes local data, keeps schema',
    'POST /scripts/:script/run': '{timeoutSeconds?=50} runs a local-script from the config against the local databases',
    'POST /stop': '{}'
  };

  // Group by type
  for (const instance of instances) {
    const name = instance.name;
    const type = instance.type;

    if (type === 'postgres') {
      docs[`postgres/${name}`] = {
        'POST /query': '{sql, limit?=1000, timeout?=30}',
        'GET  /schema': '?tables=t1,t2 (optional)',
        'GET  /tables': '',
        'POST /explain': '{sql, analyze?=false}',
        'GET  /indexes': '?table=name (optional)',
        'GET  /stats': '?table=name (optional)',
        'GET  /sample': '?table=name&limit=5'
      };
    } else if (type === 'mysql' || type === 'mariadb') {
      docs[`mysql/${name}`] = {
        'POST /query': '{sql, limit?=1000, timeout?=30}',
        'GET  /schema': '?tables=t1,t2 (optional)',
        'GET  /tables': '',
        'POST /explain': '{sql, format?="json"|"tree"|"traditional"}',
        'GET  /indexes': '?table=name (optional)',
        'GET  /stats': '?table=name (optional)',
        'GET  /sample': '?table=name&limit=5'
      };
    } else if (type === 'redis') {
      docs[`redis/${name}`] = {
        'POST /command': '{cmd: "GET key"}',
        'GET  /keys': '?pattern=*&limit=100',
        'GET  /get': '?key=name',
        'GET  /ttl': '?key=name',
        'GET  /info': '?section=memory (optional)',
        'GET  /type': '?key=name'
      };
    } else if (type === 'dynamodb') {
      docs[`dynamodb/${name}`] = {
        'POST /query': '{pk: {key: val}, sk?, index?, limit?=100}',
        'POST /scan': '{filter?, limit?=100}',
        'POST /get': '{pk: {key: val}, sk?}',
        'POST /put': '{item: {...}}',
        'POST /delete': '{pk: {key: val}, sk?}',
        'GET  /schema': '',
        'GET  /sample': '?limit=5'
      };
    } else if (type === 'opensearch') {
      docs[`opensearch/${name}`] = {
        'POST /search': '{query: {...}, index?, limit?=10}',
        'GET  /get': '?index=idx&id=docid',
        'POST /put': '{index, id?, doc: {...}}',
        'POST /delete': '{index, id}',
        'GET  /indices': '',
        'GET  /mapping': '?index=idx',
        'POST /analyze': '{text, analyzer?, index?}',
        'GET  /count': '?index=idx (optional)'
      };
    }
  }

  // AWS SDK
  docs['aws'] = {
    'POST /sdk':
      '{service: "lambda", command: "ListFunctions", input?: {...}, region?} (reviewed read-only operations only)',
    'GET  /sdk/services': 'List the accepted read-only operations per service'
  };

  return docs;
};

type ResourceInfo = {
  name: string;
  type: string;
};

export const buildStartupMessage = (params: {
  projectName: string;
  stage: string;
  region: string;
  workloads: ResourceInfo[];
  databases: ResourceInfo[];
  port?: number;
  logFile?: string;
}): string => {
  const { projectName, stage, region, workloads, databases } = params;
  const port = params.port ?? agentPort;
  const logFile = params.logFile ?? agentState.logFile;
  const tokenFile = port ? localStatePaths.devAgentTokenFile({ port }) : agentTokenFile;
  const baseUrl = `http://${AGENT_HOST}:${port}`;
  const lines: string[] = [];

  // Header
  lines.push(formatCommandHeaderLine({ action: 'DEV MODE', projectName, stageName: stage, region }));
  lines.push('');

  // Agent info
  lines.push(`Agent: ${baseUrl} (loopback only)`);
  lines.push(`Data:  .stacktape/dev-data/${stage}/ (persists between runs, use --fresh-db to reset)`);
  lines.push('');
  lines.push("Authentication: every request needs this session's token, stored in");
  lines.push(`  ${tokenFile}`);
  lines.push('  POST requests also need "content-type: application/json". Requests from web pages are refused.');
  lines.push('  Examples:');
  lines.push(`    TOKEN=$(cat '${tokenFile}')`);
  lines.push(`    curl -H "Authorization: Bearer $TOKEN" ${baseUrl}/status`);
  lines.push(
    `    curl -X POST -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{}' ${baseUrl}/rebuild/all`
  );
  lines.push('');

  // Resources
  const allResources = [
    ...workloads.map((w) => `${w.name} (${w.type})`),
    ...databases.map((d) => `${d.name} (${d.type})`)
  ];
  if (allResources.length > 0) {
    lines.push('Resources (from stacktape config):');
    lines.push(`  ${allResources.join(', ')}`);
    lines.push('');
  }

  // Workflow
  lines.push('Endpoints:');
  lines.push('  GET  /status              Current state');
  lines.push('  GET  /env/{workload}      Environment variables (secret values masked)');
  lines.push('  POST /rebuild/{name}      Rebuild workload (or /rebuild/all)');
  lines.push('  POST /stop                Stop dev mode');
  lines.push('');

  // Logs
  if (logFile) {
    lines.push(`Logs: ${logFile}`);
    lines.push('  Format: JSONL (one JSON object per line)');
    lines.push(
      '  Fields: {"ts": "ISO timestamp", "source": "workload name", "level": "info|warn|error", "msg": "..."}'
    );
    // The examples name this session's log file and its first workload, so they run as printed.
    const example = workloads[0]?.name ?? databases[0]?.name;
    lines.push('  Examples:');
    lines.push(`    tail -n 50 '${logFile}'`);
    lines.push(`    grep '"level":"error"' '${logFile}'`);
    if (example) lines.push(`    grep '"source":"${example}"' '${logFile}'`);
    lines.push('');
  }

  // Database endpoints (only if there are databases)
  if (databases.length > 0) {
    const dbTypes = [...new Set(databases.map((d) => d.type))];
    lines.push(`Database endpoints (types: ${dbTypes.join(', ')}):`);
    lines.push('  GET  /health/{name}          Check resource health (auto-monitored every 30s)');
    lines.push('  POST /{type}/{name}/query    Execute query (SQL: {sql}, DynamoDB: {pk, sk?}, Redis: {cmd})');
    lines.push('  GET  /{type}/{name}/schema   Table/index schema');
    lines.push('  GET  /{type}/{name}/tables   List tables');
    lines.push('  GET  /{type}/{name}/sample   ?table={name}&limit=5');
    lines.push('  POST /reset/{name}           Delete local data, keep schema ({"confirm": true}; or /reset/all)');
    lines.push('  POST /scripts/{script}/run   Run a local-script from the config against the local databases');
    lines.push(
      '  Note: Destructive operations (DROP, TRUNCATE, DELETE/UPDATE without WHERE) require {"confirm": true}'
    );
    lines.push('');
  }

  // AWS SDK
  lines.push('AWS SDK (reviewed read-only operations only):');
  lines.push('  POST /aws/sdk                {"service": "...", "command": "...", "input": {...}}');
  lines.push('  GET  /aws/sdk/services       List services and the read-only operations aws call accepts');
  lines.push('');
  lines.push('  Services: lambda, dynamodb, s3, logs, cloudformation, cloudwatch, sqs, sns, sfn,');
  lines.push('            eventbridge, secretsmanager, ssm, sts, iam, ec2, ecs, ecr, rds, ses,');
  lines.push('            cognito, apigatewayv2, xray, kinesis, firehose, ...');
  lines.push('  Scoped to stack resources via IAM role. Writes and Secrets Manager/SSM value reads are rejected;');
  lines.push('  Lambda/ECS environment values are redacted. Logs, objects and items return application data as is.');
  lines.push('');
  lines.push('  Examples:');
  lines.push(
    '    {"service": "logs", "command": "FilterLogEvents", "input": {"logGroupName": "/aws/lambda/my-func", "filterPattern": "ERROR"}}'
  );
  lines.push('    {"service": "dynamodb", "command": "Scan", "input": {"TableName": "my-table", "Limit": 10}}');
  lines.push(
    '    {"service": "s3", "command": "ListObjectsV2", "input": {"Bucket": "my-bucket", "Prefix": "prefix/"}}'
  );
  lines.push(
    '    {"service": "sqs", "command": "GetQueueAttributes", "input": {"QueueUrl": "https://...", "AttributeNames": ["All"]}}'
  );
  lines.push('');

  // Footer
  lines.push('Full endpoint documentation: GET /');

  return lines.join('\n');
};

/**
 * Masks what dev mode writes to its log, which MCP returns to agents: the values `/env` masks in any workload's
 * environment, then the shared scrubber. A workload can print another one's secret (a shared database password), so
 * every environment counts. The masking is rebuilt only when an environment changes.
 */
const createSessionLogMasker = (): ((text: string) => string) => {
  let environments: Array<Record<string, string> | null> = [];
  let mask = createEnvironmentMasker({});
  return (text) => {
    const names = agentState.workloads.map(({ name }) => name);
    const current = names.map((name) => workloadEnvironment.getEnvVars(name));
    if (current.length !== environments.length || current.some((env, index) => env !== environments[index])) {
      environments = current;
      const merged: Record<string, string> = {};
      const secretNames = new Set<string>();
      names.forEach((name, index) => {
        const secret = workloadEnvironment.getSecretEnvNames(name);
        for (const [variable, value] of Object.entries(current[index] ?? {})) {
          // Two workloads can set one name to different values; a suffix keeps both and keeps the name's meaning.
          let key = variable;
          for (let copy = 2; key in merged && merged[key] !== value; copy++) key = `${variable}_${copy}`;
          merged[key] = value;
          if (secret.has(variable)) secretNames.add(key);
        }
      });
      mask = createEnvironmentMasker(merged, secretNames);
    }
    return mask(text);
  };
};

/** Binds the agent's HTTP server to the port; rejects with the listener's error, `EADDRINUSE` included. */
const listenOnAgentPort = (port: number) =>
  new Promise<Server>((resolve, reject) => {
    const server = createServer(handleRequest);
    server.once('error', reject);
    server.listen(port, AGENT_HOST, () => {
      server.removeListener('error', reject);
      resolve(server);
    });
  });

/** How many other ports an automatically chosen agent port tries after the one chosen was taken meanwhile. */
const AUTOMATIC_PORT_ATTEMPTS = 20;

/**
 * Starts the agent's HTTP server and resolves with its port. An automatically chosen port (no `--agent-port`) can be
 * taken between the check that chose it and this bind: two dev sessions that start at the same time, through MCP for
 * example, check the same free port before either listens (r2ab). Such a port is replaced with the next free one; an
 * explicit port fails.
 */
export const startAgentServer = async (
  port: number,
  logDir: string,
  environment?: AgentWorkloadEnvironment,
  session?: AgentSessionIdentity,
  {
    automaticPort = false,
    findFreePort = findAvailablePort
  }: { automaticPort?: boolean; findFreePort?: typeof findAvailablePort } = {}
): Promise<number> => {
  const requested = port;
  for (let attempt = 0; ; attempt++) {
    try {
      httpServer = await listenOnAgentPort(port);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw error;
      const next = automaticPort && attempt < AUTOMATIC_PORT_ATTEMPTS ? await findFreePort(port + 1) : null;
      if (!next) {
        throw new Error(
          automaticPort
            ? `Ports ${requested} to ${port} were taken while the dev agent started. Choose a port with --agent-port.`
            : `Port ${port} is already in use. Choose a different --agent-port.`
        );
      }
      port = next;
    }
  }
  if (environment) workloadEnvironment = environment;
  setAgentLogMasker(createSessionLogMasker());
  agentPort = port;
  agentSession = session ?? null;
  startTime = Date.now();

  // The log file is named by the port, so it is opened only once this process owns the port.
  const logFile = `${logDir}/${port}-logs.txt`;
  initAgentLogger(logFile, { ...session, port, pid: process.pid });
  agentState.logFile = logFile;

  // Written only once this process owns the port, so it replaces the file of an earlier agent that died on this port
  // and no live agent's token is overwritten. Only the user who started dev mode can read the directory and file.
  const tokenDirectory = localStatePaths.devAgentTokenDirectory();
  mkdirSync(tokenDirectory, { recursive: true, mode: 0o700 });
  chmodSync(tokenDirectory, 0o700);
  agentToken = randomBytes(32).toString('base64url');
  agentTokenFile = localStatePaths.devAgentTokenFile({ port });
  writeFileSync(agentTokenFile, agentToken, { mode: 0o600 });
  chmodSync(agentTokenFile, 0o600);
  await removeTokenFilesOfDeadAgents(port);
  return port;
};

const isListening = (port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: AGENT_HOST, port, timeout: 1000 });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });

/**
 * Removes the token files of agents that were killed before they could remove their own. Nothing listens on such a
 * file's port. A file written after the check started belongs to an agent that bound the port meanwhile and is kept.
 */
const removeTokenFilesOfDeadAgents = async (ownPort: number) => {
  const tokenDirectory = localStatePaths.devAgentTokenDirectory();
  const checkedAt = Date.now();
  const ports = readdirSync(tokenDirectory)
    .map((file) => /^(\d+)\.token$/.exec(file)?.[1])
    .filter((port): port is string => port !== undefined)
    .map(Number)
    .filter((port) => port !== ownPort);
  await Promise.all(
    ports.map(async (port) => {
      if (await isListening(port)) return;
      const file = localStatePaths.devAgentTokenFile({ port });
      try {
        if (statSync(file).mtimeMs < checkedAt) rmSync(file, { force: true });
      } catch {
        // Another agent removed it first.
      }
    })
  );
};

/** Removes the token file unless a later agent on the same port has already replaced it. */
const removeOwnTokenFile = (tokenFile: string) => {
  try {
    if (readFileSync(tokenFile, 'utf-8').trim() === agentToken) rmSync(tokenFile, { force: true });
  } catch {
    // Already removed.
  }
};

export const stopAgentServer = () => {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
  if (agentTokenFile) removeOwnTokenFile(agentTokenFile);
  agentToken = null;
  agentTokenFile = null;
  agentPort = null;
  agentSession = null;
  startTime = null;
  stopAgentLogger();
  agentState = { phase: 'stopped', workloads: [], localResources: [], logFile: null };
};

export const getAgentPort = (): number | null => agentPort;

export const getAgentSessionId = (): string | undefined => agentSession?.sessionId;

/** File holding the session token every request must send; the token itself is never printed. */
export const getAgentTokenFile = (): string | null => agentTokenFile;

let agentCleanupHookRegistered = false;

export const registerAgentCleanupHook = () => {
  if (agentCleanupHookRegistered) return;
  agentCleanupHookRegistered = true;
  applicationManager.registerCleanUpHook(async () => {
    stopAgentServer();
  });
};
