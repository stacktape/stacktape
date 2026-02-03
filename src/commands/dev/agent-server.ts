import type { Server } from 'node:http';
import { createServer } from 'node:http';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { executeAwsSdkCommand, getSupportedServices } from '@domain-services/debug-services/aws-sdk-executor';
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
  opensearchCount
} from '@domain-services/debug-services/db-client';
import { agentLog, getAgentLogFilePath, initAgentLogger, stopAgentLogger } from './agent-logger';
import { getLambdaEnvVars } from './lambda-env-manager';
import { getRunningLocalInstances, type LocalResourceInstance } from './local-resources';
import { getHealthStatus, triggerHealthCheck } from './local-resources/health-monitor';
import { getWorkloadEnvVars } from './parallel-runner';

export type WorkloadStatus = {
  name: string;
  type: string;
  status: 'pending' | 'starting' | 'running' | 'error' | 'stopped';
  url?: string;
  port?: number;
  error?: string;
  size?: string;
};

export type LocalResourceStatus = {
  name: string;
  type: string;
  status: 'pending' | 'starting' | 'running' | 'error' | 'stopped';
  port?: number;
  error?: string;
};

export type AgentPhase = 'starting' | 'ready' | 'rebuilding' | 'stopping' | 'stopped';

export type AgentStatus = {
  phase: AgentPhase;
  workloads: WorkloadStatus[];
  localResources: LocalResourceStatus[];
  logFile: string | null;
};

// State management for agent mode
let agentState: AgentStatus = {
  phase: 'starting',
  workloads: [],
  localResources: [],
  logFile: null
};

let httpServer: Server | null = null;
let agentPort: number | null = null;
let startTime: number | null = null;

// Import rebuild functions lazily to avoid circular deps
let rebuildWorkload: (name: string) => Promise<boolean>;
let rebuildAllWorkloads: () => Promise<void>;

export const setRebuildFunctions = (
  rebuildOne: (name: string) => Promise<boolean>,
  rebuildAll: () => Promise<void>
) => {
  rebuildWorkload = rebuildOne;
  rebuildAllWorkloads = rebuildAll;
};

export const updateAgentState = (updates: Partial<AgentStatus>) => {
  agentState = { ...agentState, ...updates };
};

export const updateAgentWorkloadStatus = (name: string, updates: Partial<Omit<WorkloadStatus, 'name'>>) => {
  const workload = agentState.workloads.find((w) => w.name === name);
  if (workload) Object.assign(workload, updates);
};

export const addAgentWorkload = (workload: WorkloadStatus) => {
  const existing = agentState.workloads.find((w) => w.name === workload.name);
  if (!existing) agentState.workloads.push(workload);
};

export const updateAgentLocalResourceStatus = (name: string, updates: Partial<Omit<LocalResourceStatus, 'name'>>) => {
  const resource = agentState.localResources.find((r) => r.name === name);
  if (resource) Object.assign(resource, updates);
};

export const addAgentLocalResource = (resource: LocalResourceStatus) => {
  const existing = agentState.localResources.find((r) => r.name === resource.name);
  if (!existing) agentState.localResources.push(resource);
};

export const logAgentMessage = (source: string, message: string, level: 'info' | 'warn' | 'error' = 'info') => {
  agentLog(source, message, level);
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.info(`[${timestamp}] [${source}] [${level}] ${message}`);
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

const areAllWorkloadsReady = (): boolean => {
  if (agentState.workloads.length === 0) return false;
  return agentState.workloads.every((w) => w.status === 'running' || w.status === 'error');
};

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

const routes: Route[] = [];

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

addRoute('GET', '/status', async ({ query }) => {
  const verbose = query.get('verbose') === 'true';
  const ready = areAllWorkloadsReady();

  if (agentState.phase === 'starting' && ready) {
    agentState.phase = 'ready';
  }

  if (verbose) {
    return {
      phase: agentState.phase,
      ready,
      uptime: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
      workloads: agentState.workloads,
      localResources: agentState.localResources,
      logFile: getAgentLogFilePath()
    };
  }

  const workloadMap: Record<string, string> = {};
  for (const w of agentState.workloads) {
    if (w.status === 'running' && w.url) workloadMap[w.name] = w.url;
    else if (w.status === 'error' && w.error) workloadMap[w.name] = `error: ${w.error}`;
    else workloadMap[w.name] = w.status;
  }

  return { phase: agentState.phase, ready, workloads: workloadMap, pid: process.pid };
});

addRoute('GET', '/logs', async () => {
  const logFile = getAgentLogFilePath();
  return {
    logFile,
    format: 'jsonl',
    hint: 'Use standard tools: tail -n 50 <logFile> | jq ., grep \'"level":"error"\' <logFile>, etc.'
  };
});

addRoute('POST', '/rebuild/:workload', async ({ pathParams }) => {
  const workloadName = pathParams.workload;

  if (workloadName === 'all') {
    const rebuilding = agentState.workloads.filter((w) => w.status === 'starting');
    if (rebuilding.length > 0) {
      return { ok: false, error: `Some workloads are already rebuilding: ${rebuilding.map((w) => w.name).join(', ')}` };
    }
    await rebuildAllWorkloads();
    return { ok: true };
  }

  const workload = agentState.workloads.find((w) => w.name === workloadName);
  if (!workload) {
    return {
      ok: false,
      error: `Workload "${workloadName}" not found`,
      available: agentState.workloads.map((w) => w.name),
      hint: 'Use /rebuild/all to rebuild all workloads'
    };
  }

  if (workload.status === 'starting') {
    return { ok: false, error: `Workload "${workloadName}" is already rebuilding` };
  }

  const found = await rebuildWorkload(workloadName);
  return { ok: found };
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
        envVars: lambdaEnvVars,
        count: Object.keys(lambdaEnvVars).length
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
  const envVars = getWorkloadEnvVars(workloadName);
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
    envVars,
    count: Object.keys(envVars).length
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
      password: instance.credentials?.password || 'localdevpassword',
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
      password: instance.credentials?.password || 'localdevpassword',
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
  return { ok: true, data: getSupportedServices() };
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Server
// ─────────────────────────────────────────────────────────────────────────────

const handleRequest = async (req: any, res: any) => {
  const url = new URL(req.url || '', `http://localhost:${agentPort}`);
  const pathname = url.pathname;

  // CORS: Block browser-based requests to prevent malicious websites from accessing the agent.
  // 'null' origin blocks all cross-origin requests while allowing curl/scripts/local tools.
  res.setHeader('Access-Control-Allow-Origin', 'null');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    // Reject CORS preflight - browsers won't proceed with the actual request
    res.statusCode = 403;
    res.end(JSON.stringify({ ok: false, error: 'CORS requests not allowed' }));
    return;
  }

  // Root path - return available endpoints
  if (pathname === '/' || pathname === '') {
    res.statusCode = 200;
    const compact = url.searchParams.get('compact') === 'true';
    res.end(JSON.stringify(compact ? buildCompactDocumentation() : buildEndpointDocumentation()));
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
        req.on('data', (chunk: any) => {
          data += chunk;
        });
        req.on('end', () => resolve(data));
      });

      if (bodyStr && bodyStr.trim()) {
        body = safeJsonParse(bodyStr);
        if (body === undefined) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: 'Invalid JSON in request body' }));
          return;
        }
      }
    }

    try {
      const result = await route.handler({ pathParams, query: url.searchParams, body });
      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (err: unknown) {
      res.statusCode = 500;
      const message = err instanceof Error ? err.message : 'Internal error';
      res.end(JSON.stringify({ ok: false, error: message }));
    }
    return;
  }

  // No route matched
  res.statusCode = 404;
  res.end(JSON.stringify({ ok: false, error: 'Not found', hint: 'GET / for available endpoints' }));
};

// ─────────────────────────────────────────────────────────────────────────────
// Endpoint Documentation
// ─────────────────────────────────────────────────────────────────────────────

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
    workloads,
    resources,
    actions: {
      rebuild: 'POST /rebuild/{name} or /rebuild/all',
      logs: 'GET /logs (returns file path for tail/grep)',
      env: 'GET /env/{workload}',
      aws: 'POST /aws/sdk {"service": "lambda", "command": "ListFunctions", "input": {}}',
      stop: 'POST /stop'
    },
    fullDocs: 'GET / (without ?compact=true)'
  };
};

const buildEndpointDocumentation = () => {
  const instances = getRunningLocalInstances();
  const docs: Record<string, Record<string, string>> = {};

  // Core endpoints
  docs['core'] = {
    'GET  /status': '?verbose=true (optional)',
    'GET  /logs': 'Returns JSONL log file path (use tail/grep/jq)',
    'GET  /env/:workload': '',
    'GET  /health/:resource': 'Check health of local resource',
    'POST /rebuild/:workload': '{} or use /rebuild/all',
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
    'POST /sdk': '{service: "lambda", command: "ListFunctions", input?: {...}, region?}',
    'GET  /sdk/services': 'List supported services and example commands'
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
  const lines: string[] = [];

  // Header
  lines.push(`--- DEV MODE: ${projectName} -> ${stage} (${region}) ---`);
  lines.push('');

  // Agent info
  lines.push(`Agent: http://localhost:${port}`);
  lines.push(`Data:  .stacktape/dev-data/${stage}/ (persists between runs, use --freshDb to reset)`);
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
  lines.push('  GET  /env/{workload}      Environment variables');
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
    lines.push(
      '  Note: Destructive operations (DROP, TRUNCATE, DELETE/UPDATE without WHERE) require {"confirm": true}'
    );
    lines.push('');
  }

  // AWS SDK
  lines.push('AWS SDK (direct SDK access):');
  lines.push('  POST /aws/sdk                {"service": "...", "command": "...", "input": {...}}');
  lines.push('  GET  /aws/sdk/services       List supported services and example commands');
  lines.push('');
  lines.push('  Services: lambda, dynamodb, s3, logs, cloudformation, cloudwatch, sqs, sns, sfn,');
  lines.push('            eventbridge, secretsmanager, ssm, sts, iam, ec2, ecs, ecr, rds, ses,');
  lines.push('            cognito, apigatewayv2, xray, kinesis, firehose, ...');
  lines.push('  Scoped to stack resources via IAM role.');
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
    '    {"service": "lambda", "command": "Invoke", "input": {"FunctionName": "my-func", "Payload": "{\\"key\\":\\"value\\"}"}}'
  );
  lines.push('');

  // Footer
  lines.push('Full endpoint documentation: GET /');

  return lines.join('\n');
};

export const startAgentServer = async (port: number, logDir: string): Promise<void> => {
  agentPort = port;
  startTime = Date.now();

  const logFile = `${logDir}/${port}-logs.txt`;
  initAgentLogger(logFile);
  agentState.logFile = logFile;

  return new Promise((resolve, reject) => {
    httpServer = createServer(handleRequest);

    httpServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use. Choose a different --agentPort.`));
      } else {
        reject(err);
      }
    });

    httpServer.listen(port, () => {
      resolve();
    });
  });
};

export const stopAgentServer = () => {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
  }
  agentPort = null;
  startTime = null;
  stopAgentLogger();
  agentState = { phase: 'stopped', workloads: [], localResources: [], logFile: null };
};

export const isAgentMode = (): boolean => httpServer !== null;

export const getAgentPort = (): number | null => agentPort;

let agentCleanupHookRegistered = false;

export const registerAgentCleanupHook = () => {
  if (agentCleanupHookRegistered) return;
  agentCleanupHookRegistered = true;
  applicationManager.registerCleanUpHook(async () => {
    stopAgentServer();
  });
};
