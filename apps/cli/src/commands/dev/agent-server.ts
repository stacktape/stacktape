import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { formatCommandHeaderLine } from '@application-services/tui-manager/format/blocks';
import { AWS_READ_ONLY_OPERATIONS } from '@stacktape/aws-read-only/operations';
import { executeAwsSdkCommand } from '@stacktape/aws-read-only/executor';
import { localStatePaths } from 'src/config/local-state-paths';
import type { DevTuiState } from 'src/app/tui-manager/dev/types';
import { getDevAgentCredentials } from './dev-agent-credentials';
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
  dynamoDbReset
} from '@domain-services/debug-services/db-client';
import { agentLog, getAgentLogFilePath, initAgentLogger, stopAgentLogger } from './agent-logger';
import { maskAgentEnvironment } from './agent-env-masking';
import { getLambdaEnvVars } from './deployed-function-environment';
import { getDevNetworkSession } from './dev-network-session';
import { getRunningLocalInstances, type LocalResourceInstance } from './local-resources';
import { getHealthStatus, triggerHealthCheck } from './local-resources/health-monitor';
import { runSeedScript } from './seed-script';

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
  size?: string;
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

export type RebuildResult =
  | { ok: true; rebuilt: string[] }
  | { ok: false; code: 'CONFIG_CHANGED_RESTART_REQUIRED'; message: string }
  | { ok: false; code: 'REBUILD_FAILED'; message: string; failedWorkloads: FailedWorkload[] };

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
      size: workload.size
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

export type FailedWorkload = { name: string; error: string };

export const getFailedWorkloads = (workloads: WorkloadStatus[] = agentState.workloads): FailedWorkload[] =>
  workloads
    .filter((workload) => workload.status === 'error')
    .map(({ name, error }) => ({ name, error: error || 'unknown error' }));

/**
 * Ready means dev mode finished starting, every selected workload is running and the configuration file still matches
 * the session. A failed workload or a pending restart makes the session not ready: an assistant that waits for
 * readiness must not start testing against a workload that is down or runs outdated code or configuration.
 */
const areAllWorkloadsReady = (): boolean =>
  agentState.phase === 'ready' &&
  !agentState.restartRequired &&
  agentState.workloads.every((workload) => workload.status === 'running');

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
  const ready = areAllWorkloadsReady();
  const failedWorkloads = getFailedWorkloads();

  if (verbose) {
    return {
      phase: agentState.phase,
      ready,
      failedWorkloads,
      uptime: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
      workloads: agentState.workloads,
      localResources: agentState.localResources,
      ...(agentState.restartRequired ? { restartRequired: agentState.restartRequired } : {}),
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
    failedWorkloads,
    ...(agentState.restartRequired ? { restartRequired: agentState.restartRequired } : {}),
    workloads: workloadMap,
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
export const toRebuildResponse = (result: RebuildResult, logFile = getAgentLogFilePath()) => {
  if ('rebuilt' in result)
    return { ok: true, message: `Rebuilt ${result.rebuilt.join(', ')}.`, rebuilt: result.rebuilt };
  if (!('failedWorkloads' in result)) {
    return {
      ok: false,
      code: result.code,
      error: result.message,
      hint: 'Stop dev mode and start it again; the start updates the dev stack.'
    };
  }
  return {
    ok: false,
    code: result.code,
    error: `Rebuild failed. ${result.message}`,
    failedWorkloads: result.failedWorkloads,
    logFile,
    hint: 'The failed workloads keep the status error, and their previous code may still serve requests. Fix the error and rebuild again.'
  };
};

addRoute('POST', '/rebuild/:workload', async ({ pathParams }) => {
  const workloadName = pathParams.workload;

  // A workload that is rebuilding finishes first; the request then builds the current files.
  if (workloadName === 'all') return toRebuildResponse(await rebuildAllWorkloads());

  const workload = agentState.workloads.find((w) => w.name === workloadName);
  if (!workload) {
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

addRoute('GET', '/env/:workload', async ({ pathParams }) => {
  const workloadName = pathParams.workload;

  // Check if workload exists in agent state
  const workloadState = agentState.workloads.find((w) => w.name === workloadName);
  if (!workloadState) {
    return {
      ok: false,
      error: `Workload "${workloadName}" not found`,
      available: agentState.workloads.map((w) => w.name),
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

  // For other workloads, get env vars from parallel-runner state
  const envVars = workloadEnvironment.getEnvVars(workloadName);
  if (!envVars) {
    return {
      ok: false,
      error: `Environment variables not available for "${workloadName}"`,
      hint: 'Env vars are only tracked for container, hosting-bucket, and nextjs-web workloads'
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

  const { sql, limit, timeout, confirm } = body as {
    sql?: string;
    limit?: number;
    timeout?: number;
    confirm?: boolean;
  };
  if (!sql)
    return {
      ok: false,
      error: 'Missing required field "sql"',
      hint: 'Expected: {sql: string, limit?: number, timeout?: number, confirm?: boolean}'
    };

  return postgresQuery(conn!, { sql, limit, timeout, confirm });
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

  const { sql, limit, timeout, confirm } = body as {
    sql?: string;
    limit?: number;
    timeout?: number;
    confirm?: boolean;
  };
  if (!sql)
    return {
      ok: false,
      error: 'Missing required field "sql"',
      hint: 'Expected: {sql: string, limit?: number, timeout?: number, confirm?: boolean}'
    };

  return mysqlQuery(conn!, { sql, limit, timeout, confirm });
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

  const { cmd, confirm } = body as { cmd?: string; confirm?: boolean };
  if (!cmd)
    return {
      ok: false,
      error: 'Missing required field "cmd"',
      hint: 'Expected: {cmd: "GET key", confirm?: true (for destructive commands)}'
    };

  return redisCommand(conn!, { cmd, confirm });
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

addRoute('POST', '/dynamodb/:resource/query', async ({ pathParams, body }) => {
  const { conn, error, available } = getDynamoConn(pathParams.resource);
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

  return dynamoDbQuery(conn!, { pk, sk, index, limit });
});

addRoute('POST', '/dynamodb/:resource/scan', async ({ pathParams, body }) => {
  const { conn, error, available } = getDynamoConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const { filter, limit } = body as { filter?: string; limit?: number };
  return dynamoDbScan(conn!, { filter, limit });
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
  const { conn, error, available } = getDynamoConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  return dynamoDbSchema(conn!);
});

addRoute('GET', '/dynamodb/:resource/sample', async ({ pathParams, query }) => {
  const { conn, error, available } = getDynamoConn(pathParams.resource);
  if (error) return { ok: false, error, available };

  const limit = query.get('limit') ? Number(query.get('limit')) : 5;
  return dynamoDbSample(conn!, { limit });
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

addRoute('POST', '/scripts/:script/run', async ({ pathParams }) => runSeedScript(pathParams.script));

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

  const awsRegion = region || globalStateManager.region;

  // Use dev agent role credentials (scoped to stack) or fall back to user credentials
  const credentials = await getDevAgentCredentials();
  if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
    return { ok: false, error: 'AWS credentials not available' };
  }

  return executeAwsSdkCommand(service, command, input || {}, {
    region: awsRegion,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken
    }
  });
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

    // Extract path params
    const pathParams: Record<string, string> = {};
    route.paramNames.forEach((name, i) => {
      pathParams[name] = decodeURIComponent(match[i + 1]);
    });

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
      seed: 'POST /scripts/{script}/run (a local-script from the config, against the local databases)',
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
    'POST /scripts/:script/run': '{} runs a local-script from the config against the local databases',
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
    lines.push('  Examples:');
    lines.push('    tail -n 50 <logFile>                     # last 50 lines');
    lines.push('    grep \'"level":"error"\' <logFile>         # errors only');
    lines.push('    grep \'"source":"apiLambda"\' <logFile>    # specific workload');
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

export const startAgentServer = async (
  port: number,
  logDir: string,
  environment?: AgentWorkloadEnvironment,
  session?: AgentSessionIdentity
): Promise<void> => {
  if (environment) workloadEnvironment = environment;
  agentPort = port;
  agentSession = session ?? null;
  startTime = Date.now();

  const logFile = `${logDir}/${port}-logs.txt`;
  initAgentLogger(logFile, { ...session, port, pid: process.pid });
  agentState.logFile = logFile;

  await new Promise<void>((resolve, reject) => {
    httpServer = createServer(handleRequest);

    httpServer.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Choose a different --agent-port.`));
      } else {
        reject(err);
      }
    });

    httpServer.listen(port, AGENT_HOST, () => {
      resolve();
    });
  });

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
