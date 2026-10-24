import { pathExists, readFile } from 'fs-extra';
import { randomUUID } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';
import { localStatePaths } from 'src/config/local-state-paths';
import { findStacktapePackageScript, normalizeCliInvocation } from './cli-command-tools';
import { readPlannedProjectSettings, summarizeMatchedScriptForPlan, summarizeScanForPlan } from './cli-planning';
import { runStacktapeCommandJsonl } from './cli-jsonl-runner';
import { scanStacktapeProject } from './project-scan';
import { toToolText, type ToolOutput } from './tool-output';
import { type DiscoveredDevAgent, discoverDevAgents, isSameDirectory } from '../dev/agent-daemon';

type DevSession = {
  devSessionId: string;
  /** Known once the CLI reports the agent it starts, before the start finishes. */
  agentPort?: number;
  startedAt: string;
  cwd: string;
  stage?: string;
};

type DevApiRequest = (input: {
  port: number;
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
}) => Promise<Record<string, unknown>>;

type DevToolDependencies = {
  runCli?: typeof runStacktapeCommandJsonl;
  requestDevApi?: DevApiRequest;
  /** Running agents of this user; a restarted MCP server finds its sessions again through them. */
  discoverAgents?: () => Promise<DiscoveredDevAgent[]>;
  createId?: () => string;
  now?: () => Date;
};

type StartupProgressEntry = { ts: string; eventType: string; status: string; message: string; instanceId?: string };

/** A `start` that is still running in the background after its tool call returned. */
type DevStartup = {
  state: 'starting' | 'finished';
  progress: StartupProgressEntry[];
  /** Ends the CLI process that starts the session. */
  abort: AbortController;
  done: Promise<void>;
  /** The result `start` would have returned, once the start finished. */
  output?: ToolOutput;
};

const MAX_STARTUP_PROGRESS = 30;
/** How long the error of a start that failed in the background waits for a call to read it. */
const FAILED_START_RETENTION_MS = 60 * 60 * 1000;
/**
 * How long `start` and `status` wait for a start to finish before they return. Below the common 60-second per-call
 * timeout of MCP clients, so a cold start that creates the dev network and the dev stack (several minutes) continues in
 * the background instead of failing with the client's timeout.
 */
const DEFAULT_WAIT_SECONDS = 50;
/** The CLI process gets this long in total; the daemon parent itself stops a daemon that stays silent for 10 minutes. */
const START_TIMEOUT_MS = 30 * 60 * 1000;

const getWaitMs = (value: unknown) => {
  const seconds = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Math.max(0, Math.min(Number.isFinite(seconds) ? seconds : DEFAULT_WAIT_SECONDS, 30 * 60)) * 1000;
};

const normalizeToolArgs = (args?: Record<string, unknown>): Record<string, unknown> => {
  const { cwd, ...cliArgs } = args ?? {};
  return { ...normalizeCliInvocation('dev', cliArgs).args, ...(cwd !== undefined ? { cwd } : {}) };
};

// Every agent stores its session token in the user's state directory under its port. The token is read for each
// request and never returned to the client.
const devApiRequest: DevApiRequest = async ({ port, method, path, body }) => {
  const token = (await readFile(localStatePaths.devAgentTokenFile({ port }), 'utf-8').catch(() => '')).trim();
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, code: 'INTERNAL_ERROR', message: text };
    }

    const envelope = parsed as Record<string, unknown>;
    if (typeof envelope.ok === 'boolean' && typeof envelope.code === 'string') {
      const data = envelope.data && typeof envelope.data === 'object' ? (envelope.data as Record<string, unknown>) : {};
      return {
        ok: envelope.ok,
        code: envelope.code,
        message: typeof envelope.message === 'string' ? envelope.message : undefined,
        ...data
      };
    }

    return envelope;
  } catch {
    return { ok: false, code: 'INTERNAL_ERROR', message: text || `HTTP ${response.status}` };
  }
};

/**
 * The agent's answer as tool output: its own ok, code and message, with the session. A rebuild answers after the build
 * and deployment finished, so a failed build or a changed configuration comes back as `ok: false` with its code, error
 * and log file.
 */
const toAgentOutput = (
  response: Record<string, unknown>,
  session: DevSession,
  messages: { ok: string; failed: string }
): ToolOutput => {
  const { ok, code, message, ...data } = response;
  const succeeded = ok === true;
  return {
    ok: succeeded,
    code: typeof code === 'string' ? code : succeeded ? 'OK' : 'INTERNAL_ERROR',
    message: typeof message === 'string' && message !== 'OK' ? message : succeeded ? messages.ok : messages.failed,
    data: { session, ...data }
  };
};

export const DEV_TOOL_ACTIONS = [
  'plan',
  'start',
  'status',
  'logs',
  'rebuild',
  'rebuild_all',
  'query',
  'tables',
  'env',
  'aws',
  'reset_db',
  'seed',
  'stop'
] as const;
export type DevToolAction = (typeof DEV_TOOL_ACTIONS)[number];

type LocalDatabase = { name: string; type: string };

/** The agent's database routes by local resource type; MariaDB uses the MySQL routes. */
const DATABASE_ROUTE: Record<string, string> = {
  postgres: 'postgres',
  mysql: 'mysql',
  mariadb: 'mysql',
  redis: 'redis',
  dynamodb: 'dynamodb',
  opensearch: 'opensearch'
};

/**
 * Picks the local database a database action addresses: the named one, or the only one the session runs. The agent
 * reports only databases it runs on this machine, so a resource connected to AWS with remoteResources is never chosen.
 */
const selectLocalDatabase = (
  databases: LocalDatabase[],
  requested: string | undefined
): { ok: true; database: LocalDatabase } | { ok: false; output: ToolOutput } => {
  const available = databases.map(({ name, type }) => ({ name, type }));
  const database = requested
    ? databases.find(({ name }) => name === requested)
    : databases.length === 1
      ? databases[0]
      : undefined;
  if (database) return { ok: true, database };
  return {
    ok: false,
    output: requested
      ? {
          ok: false,
          code: 'NOT_LOCAL_RESOURCE',
          message: `"${requested}" is not a database this dev session runs locally. Database actions reach local databases only, never deployed ones.`,
          data: { localDatabases: available }
        }
      : {
          ok: false,
          code: databases.length ? 'VALIDATION_ERROR' : 'NOT_FOUND',
          message: databases.length
            ? `Specify args.resource: this dev session runs ${databases.map(({ name }) => name).join(', ')} locally.`
            : 'This dev session runs no local databases.',
          data: { localDatabases: available }
        }
  };
};

/** What `query` sends to the agent for a database of each type. */
const buildDatabaseQuery = (
  database: LocalDatabase,
  args: Record<string, unknown>
): { ok: true; method: 'POST'; path: string; body: Record<string, unknown> } | { ok: false; message: string } => {
  const route = DATABASE_ROUTE[database.type];
  const base = `/${route}/${encodeURIComponent(database.name)}`;
  const limit = typeof args.limit === 'number' ? args.limit : undefined;
  const confirm = args.confirm === true ? true : undefined;
  if (route === 'postgres' || route === 'mysql') {
    if (typeof args.sql !== 'string' || !args.sql.trim()) {
      return { ok: false, message: `args.sql is required to query ${database.type} database "${database.name}".` };
    }
    return { ok: true, method: 'POST', path: `${base}/query`, body: { sql: args.sql, limit, confirm } };
  }
  if (route === 'redis') {
    if (typeof args.command !== 'string' || !args.command.trim()) {
      return {
        ok: false,
        message: `args.command (for example "GET key") is required to query Redis "${database.name}".`
      };
    }
    return { ok: true, method: 'POST', path: `${base}/command`, body: { cmd: args.command, confirm } };
  }
  if (route === 'dynamodb') {
    return args.pk === undefined
      ? { ok: true, method: 'POST', path: `${base}/scan`, body: { filter: args.filter, limit } }
      : {
          ok: true,
          method: 'POST',
          path: `${base}/query`,
          body: { pk: args.pk, sk: args.sk, index: args.index, limit }
        };
  }
  return {
    ok: false,
    message: `query supports PostgreSQL, MySQL, Redis and DynamoDB; "${database.name}" is ${database.type}.`
  };
};

/** Where `tables` reads what a database of each type holds: tables, keys, the table's schema or the indices. */
const TABLES_PATH: Record<string, string> = {
  postgres: '/tables',
  mysql: '/tables',
  redis: '/keys?pattern=*&limit=100',
  dynamodb: '/schema',
  opensearch: '/indices'
};

const forgetDevSession = (activeDevSessions: Map<string, DevSession>, session: DevSession) => {
  for (const [id, candidate] of activeDevSessions) if (candidate === session) activeDevSessions.delete(id);
};

/**
 * Adds the running agents this MCP server does not know yet, for example after a client restarted it. Only agents that
 * report their session ID and project directory are adopted; their session ID is the `devSessionId` the earlier MCP
 * server returned, because it passed that ID to the agent.
 */
const rediscoverDevSessions = async ({
  activeDevSessions,
  discoverAgents
}: {
  activeDevSessions: Map<string, DevSession>;
  discoverAgents: () => Promise<DiscoveredDevAgent[]>;
}) => {
  const knownPorts = new Set([...activeDevSessions.values()].map(({ agentPort }) => agentPort));
  for (const agent of await discoverAgents().catch(() => [])) {
    if (!agent.sessionId || !agent.projectDirectory || knownPorts.has(agent.port)) continue;
    activeDevSessions.set(agent.sessionId, {
      devSessionId: agent.sessionId,
      agentPort: agent.port,
      startedAt: '',
      cwd: agent.projectDirectory,
      ...(agent.stage ? { stage: agent.stage } : {})
    });
  }
};

const ensureDevSessionAvailable = async ({
  devSessionId,
  cwd,
  requireExplicit,
  activeDevSessions,
  requestDevApi,
  discoverAgents,
  isStarting
}: {
  devSessionId?: string;
  /** Narrows the sessions an omitted `devSessionId` is inferred from to one project directory. */
  cwd?: string;
  requireExplicit: boolean;
  activeDevSessions: Map<string, DevSession>;
  requestDevApi: DevApiRequest;
  discoverAgents: () => Promise<DiscoveredDevAgent[]>;
  /** A starting session reports its port before its agent listens, so it is not health-checked. */
  isStarting: (session: DevSession) => boolean;
}): Promise<{ ok: true; session: DevSession } | { ok: false; output: ToolOutput }> => {
  // A session can be registered under two IDs (see `start`), so the sessions are deduplicated.
  const candidates = () =>
    [...new Set(activeDevSessions.values())].filter((candidate) => !cwd || isSameDirectory(candidate.cwd, cwd));
  const find = () => {
    const matching = candidates();
    return devSessionId
      ? activeDevSessions.get(devSessionId)
      : !requireExplicit && matching.length === 1
        ? matching[0]
        : undefined;
  };
  if (!find() && (devSessionId || candidates().length === 0)) {
    await rediscoverDevSessions({ activeDevSessions, discoverAgents });
  }
  const session = find();

  if (!session) {
    const ambiguous = !devSessionId && candidates().length > 1;
    const noActiveSessions = candidates().length === 0;
    return {
      ok: false,
      output: {
        ok: false,
        code: ambiguous
          ? 'AMBIGUOUS_DEV_SESSION'
          : noActiveSessions || devSessionId
            ? 'NOT_FOUND'
            : 'DEV_SESSION_ID_REQUIRED',
        message: noActiveSessions
          ? 'No active Stacktape dev session found.'
          : ambiguous
            ? 'Multiple Stacktape dev sessions are active. Specify args.devSessionId.'
            : devSessionId
              ? `No active dev session matches devSessionId ${devSessionId}.`
              : 'Specify args.devSessionId for this dev operation.',
        data: {
          activeDevSessionIds: candidates().map(({ devSessionId: id }) => id)
        },
        nextActions: [
          activeDevSessions.size === 0
            ? 'Call stacktape_dev with action=start first.'
            : 'Use a devSessionId returned by stacktape_dev action=start.'
        ]
      }
    };
  }

  if (session.agentPort === undefined || isStarting(session)) return { ok: true, session };

  // An agent that has exited refuses the connection; that is the unreachable case below, not an error.
  const health = await requestDevApi({
    port: session.agentPort,
    method: 'GET',
    path: '/health'
  }).catch((error: unknown) => ({ ok: false, code: 'UNREACHABLE', message: String(error) }));
  if (health.ok === false) {
    forgetDevSession(activeDevSessions, session);
    const stopped = await readStopReason(session.agentPort, session.startedAt);
    if (stopped) {
      return {
        ok: false,
        output: {
          ok: false,
          code: stopped.code,
          message: `Dev session ${session.devSessionId} stopped itself: ${stopped.message}`,
          nextActions: ['Call stacktape_dev with action=start and take_over=true to move the stage back here']
        }
      };
    }
    return {
      ok: false,
      output: {
        ok: false,
        code: 'NOT_FOUND',
        message:
          health.code === 'UNAUTHORIZED'
            ? `The process on port ${session.agentPort} refused the session token in ${localStatePaths.devAgentTokenFile({ port: session.agentPort })}; dev session ${session.devSessionId} has ended.`
            : `Dev session ${session.devSessionId} on port ${session.agentPort} is no longer reachable.`,
        nextActions: ['Call stacktape_dev with action=start to create a new dev session']
      }
    };
  }

  return { ok: true, session };
};

/** Why the session's agent ended itself, when it recorded a reason after this session started. */
const readStopReason = async (
  port: number,
  startedAt: string
): Promise<{ code: string; message: string } | undefined> => {
  try {
    const recorded = JSON.parse(await readFile(localStatePaths.devAgentStopReasonFile({ port }), 'utf-8')) as {
      code?: unknown;
      message?: unknown;
      at?: unknown;
    };
    if (typeof recorded.message !== 'string' || typeof recorded.at !== 'string') return undefined;
    // A session found running has no start time, so no reason can be told apart from an older one.
    if (!startedAt || recorded.at < startedAt) return undefined;
    return {
      code: typeof recorded.code === 'string' ? recorded.code : 'DEV_SESSION_STOPPED',
      message: recorded.message
    };
  } catch {
    return undefined;
  }
};

const LOG_LEVEL_RANK: Record<string, number> = { info: 0, warn: 1, error: 2 };

/** `since` as an ISO time or a duration back from now (`30s`, `10m`, `2h`, `1d`). */
export const parseLogsSince = (since: unknown, now: Date): number | undefined => {
  if (typeof since !== 'string' || !since.trim()) return undefined;
  const relative = /^(\d+(?:\.\d+)?)\s*(s|m|h|d)$/i.exec(since.trim());
  if (relative) {
    const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
      relative[2].toLowerCase() as 's' | 'm' | 'h' | 'd'
    ];
    return now.getTime() - Number(relative[1]) * unitMs;
  }
  const time = Date.parse(since);
  return Number.isFinite(time) ? time : undefined;
};

/**
 * Reads the session's JSONL log. Without a cursor it returns the newest matching lines, oldest first; with the
 * `nextCursor` of an earlier call it returns the matching lines written since. `level` is a minimum level.
 */
const readDevLogs = async ({
  logFile,
  cursor,
  limit,
  sinceMs,
  minLevel,
  source,
  currentSessionOnly
}: {
  logFile: string;
  cursor?: number;
  limit?: number;
  sinceMs?: number;
  minLevel?: string;
  source?: string;
  /** Starts at the last session marker: the lines of the session that writes the file now. */
  currentSessionOnly?: boolean;
}): Promise<{ entries: unknown[]; nextCursor: number; totalLines: number; omitted: number }> => {
  if (!(await pathExists(logFile))) {
    return { entries: [], nextCursor: 0, totalLines: 0, omitted: 0 };
  }

  const content = await readFile(logFile, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const maxItems = Math.max(1, Math.min(limit ?? 100, 1000));
  const minRank = minLevel ? (LOG_LEVEL_RANK[minLevel] ?? 0) : 0;
  const parse = (line: string): Record<string, unknown> => {
    try {
      return JSON.parse(line);
    } catch {
      return { message: line };
    }
  };
  let start = cursor === undefined ? 0 : Math.max(0, cursor);
  if (currentSessionOnly) {
    for (let index = lines.length - 1; index >= start; index--) {
      const entry = parse(lines[index]);
      if (entry.source === 'dev' && entry.session && entry.msg === 'Dev session started') {
        start = index;
        break;
      }
    }
  }

  const matching: Array<{ index: number; entry: Record<string, unknown> }> = [];
  for (let index = start; index < lines.length; index++) {
    const entry = parse(lines[index]);
    if (source && entry.source !== source) continue;
    if (minRank && (LOG_LEVEL_RANK[String(entry.level)] ?? 0) < minRank) continue;
    if (sinceMs !== undefined) {
      const ts = typeof entry.ts === 'string' ? Date.parse(entry.ts) : Number.NaN;
      if (!Number.isFinite(ts) || ts < sinceMs) continue;
    }
    matching.push({ index, entry });
  }

  const page = cursor === undefined ? matching.slice(-maxItems) : matching.slice(0, maxItems);
  const nextCursor =
    cursor !== undefined && page.length < matching.length ? page[page.length - 1].index + 1 : lines.length;
  return {
    entries: page.map(({ entry }) => entry),
    nextCursor,
    totalLines: lines.length,
    omitted: matching.length - page.length
  };
};

const buildDevPlan = async (args?: Record<string, unknown>): Promise<ToolOutput> => {
  const toolArgs = normalizeToolArgs(args);
  const scan = await scanStacktapeProject({
    cwd: typeof toolArgs.cwd === 'string' ? toolArgs.cwd : undefined,
    maxFiles: 10
  });
  const projectName = typeof toolArgs.projectName === 'string' ? toolArgs.projectName : undefined;
  const matchedDeployScript = findStacktapePackageScript({
    packageJsonFiles: scan.packageJsonFiles,
    command: 'deploy',
    projectName
  });
  const deployContext = matchedDeployScript?.parsedArgs || {};
  const startArgs = {
    ...deployContext,
    stage: typeof toolArgs.stage === 'string' ? toolArgs.stage : 'dev',
    ...(typeof toolArgs.region === 'string'
      ? { region: toolArgs.region }
      : typeof deployContext.region === 'string'
        ? { region: deployContext.region }
        : {}),
    ...(projectName
      ? { projectName }
      : typeof deployContext.projectName === 'string'
        ? { projectName: deployContext.projectName }
        : {}),
    ...(typeof toolArgs.awsAccount === 'string'
      ? { awsAccount: toolArgs.awsAccount }
      : typeof deployContext.awsAccount === 'string'
        ? { awsAccount: deployContext.awsAccount }
        : {}),
    currentWorkingDirectory:
      typeof toolArgs.currentWorkingDirectory === 'string'
        ? toolArgs.currentWorkingDirectory
        : scan.suggestedDefaults.currentWorkingDirectory,
    configPath: typeof toolArgs.configPath === 'string' ? toolArgs.configPath : scan.suggestedDefaults.configPath,
    ...(typeof toolArgs.agentPort === 'number' ? { agentPort: toolArgs.agentPort } : {}),
    ...(toolArgs.resources !== undefined ? { resources: toolArgs.resources } : {}),
    ...(toolArgs.skipResources !== undefined ? { skipResources: toolArgs.skipResources } : {}),
    ...(toolArgs.watch !== undefined ? { watch: toolArgs.watch } : {}),
    ...(toolArgs.remoteResources !== undefined ? { remoteResources: toolArgs.remoteResources } : {}),
    ...(toolArgs.freshDb !== undefined ? { freshDb: toolArgs.freshDb } : {})
  };
  if (typeof startArgs.currentWorkingDirectory === 'string' && !isAbsolute(startArgs.currentWorkingDirectory)) {
    startArgs.currentWorkingDirectory = resolve(scan.cwd, startArgs.currentWorkingDirectory);
  }
  delete (startArgs as Record<string, unknown>).fullDeploy;

  // Values the config declares are read by the CLI itself. A deploy script's guess must not override them.
  const projectSettings = await readPlannedProjectSettings({ command: 'dev', cwd: scan.cwd, args: startArgs });
  if (projectSettings.error) return projectSettings.error;
  const startArgsRecord = startArgs as Record<string, unknown>;
  for (const name of ['projectName', 'region'] as const) {
    if (projectSettings.settings[name] !== undefined && typeof toolArgs[name] !== 'string')
      delete startArgsRecord[name];
  }

  const missingArgs = ['stage', 'region', 'configPath'].filter(
    (argName) =>
      !startArgsRecord[argName] && !projectSettings.settings[argName as keyof typeof projectSettings.settings]
  );
  return {
    ok: missingArgs.length === 0,
    code: missingArgs.length === 0 ? 'OK' : 'MISSING_ARGS',
    message:
      missingArgs.length === 0
        ? 'Prepared a read-only Stacktape dev-mode plan.'
        : `Dev-mode plan is missing required argument(s): ${missingArgs.join(', ')}.`,
    data: {
      action: 'start',
      args: { ...startArgs, cwd: scan.cwd },
      // Exactly what `start` accepts: the project directory is an argument like the others.
      stacktapeDevStart: {
        tool: 'stacktape_dev',
        arguments: {
          action: 'start',
          args: { ...startArgs, cwd: scan.cwd }
        }
      },
      resolvedContext: {
        cwd: scan.cwd,
        currentWorkingDirectory: startArgs.currentWorkingDirectory,
        ...(Object.keys(projectSettings.settings).length
          ? { projectSettings: { configPath: projectSettings.configPath, ...projectSettings.settings } }
          : {})
      },
      scan: summarizeScanForPlan(scan),
      matchedPackageScript: summarizeMatchedScriptForPlan(
        matchedDeployScript
          ? {
              ...matchedDeployScript,
              matchKind: 'deploy-context',
              usedParsedArgs: Object.fromEntries(
                Object.entries(deployContext).filter(([argName]) => argName !== 'fullDeploy')
              ),
              droppedParsedArgs: deployContext.fullDeploy === undefined ? [] : ['fullDeploy']
            }
          : undefined
      )
    },
    nextActions:
      missingArgs.length === 0
        ? ['Call stacktape_dev with action=start only if the user wants to start dev mode now.']
        : ['Provide the missing stage/region/configPath, then plan again.']
  };
};

export const createDevToolHandler = (dependencies: DevToolDependencies = {}) => {
  const activeDevSessions = new Map<string, DevSession>();
  const startups = new Map<string, DevStartup>();
  // A start that failed after its tool call returned DEV_STARTING keeps its error here until a call reads it.
  const failedStarts = new Map<string, { output: ToolOutput; finishedAt: number }>();
  const runCli = dependencies.runCli || runStacktapeCommandJsonl;
  const requestDevApi = dependencies.requestDevApi || devApiRequest;
  const discoverAgents = dependencies.discoverAgents || discoverDevAgents;
  const createId = dependencies.createId || randomUUID;
  const now = dependencies.now || (() => new Date());

  /** What a session's start reports while it still runs: the latest steps and, once known, the agent's port. */
  const describeStartup = (session: DevSession, startup: DevStartup): ToolOutput => {
    // Heartbeats already say "Still starting: <step> (<seconds>)".
    const latest = startup.progress.at(-1)?.message.replace(/^Still starting:?\s*/, '');
    return {
      ok: true,
      code: 'DEV_STARTING',
      message: `Dev mode is still starting${latest ? `: ${latest}.` : '.'} A first start creates the dev network and the dev stack, which takes several minutes.`,
      data: { session, startup: { state: 'starting', progress: startup.progress.slice(-10) } },
      nextActions: [
        `Call stacktape_dev with action=status and args.devSessionId=${session.devSessionId}; it waits up to ${DEFAULT_WAIT_SECONDS} s for the start to finish.`
      ]
    };
  };

  /** Waits up to `waitMs` for a background start; returns its output if it finished. */
  const waitForStartup = async (startup: DevStartup, waitMs: number, signal?: AbortSignal) => {
    let timer: NodeJS.Timeout | undefined;
    let onAbort = () => {};
    await Promise.race([
      startup.done,
      new Promise<void>((resolveWait) => {
        timer = setTimeout(resolveWait, waitMs);
        onAbort = () => resolveWait();
        signal?.addEventListener('abort', onAbort, { once: true });
      })
    ]);
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
    return startup.state === 'finished' ? startup.output : undefined;
  };

  return async ({
    action,
    args,
    signal,
    clientName,
    onProgress
  }: {
    action: DevToolAction;
    args?: Record<string, unknown>;
    signal?: AbortSignal;
    clientName?: string;
    onProgress?: (event: { message: string }) => void | Promise<void>;
  }): Promise<ReturnType<typeof toToolText>> => {
    const toolArgs = normalizeToolArgs(args);

    if (action === 'plan') {
      return toToolText(await buildDevPlan(toolArgs));
    }

    if (action === 'start') {
      const requestedPort =
        typeof toolArgs.agentPort === 'number'
          ? toolArgs.agentPort
          : typeof toolArgs.agentPort === 'string'
            ? Number(toolArgs.agentPort)
            : undefined;
      const {
        cwd: requestedCwd,
        devSessionId: _ignoredSessionId,
        waitSeconds,
        agentPort: _requestedPortArg,
        ...devCliArgs
      } = toolArgs;

      // The agent adopts this ID, reports it in its status, and a restarted MCP server finds the session by it again.
      const devSessionId = createId();
      const session: DevSession = {
        devSessionId,
        startedAt: now().toISOString(),
        cwd: typeof requestedCwd === 'string' ? requestedCwd : process.cwd()
      };
      let clientWaiting = true;
      const startup: DevStartup = {
        state: 'starting',
        progress: [],
        abort: new AbortController(),
        done: Promise.resolve()
      };
      const forwardCancellation = () => startup.abort.abort();
      const finishStartup = (output: ToolOutput) => {
        startup.output = output;
        startup.state = 'finished';
        startups.delete(devSessionId);
        if (!output.ok) failedStarts.set(devSessionId, { output, finishedAt: Date.now() });
      };
      signal?.addEventListener('abort', forwardCancellation, { once: true });

      const run = runCli({
        command: 'dev',
        args: {
          ...devCliArgs,
          // Without a requested port the CLI takes the first free one from 7331 and reports it.
          ...(requestedPort !== undefined && Number.isFinite(requestedPort) ? { agentPort: requestedPort } : {})
        },
        cwd: typeof requestedCwd === 'string' ? requestedCwd : undefined,
        timeoutMs: START_TIMEOUT_MS,
        signal: startup.abort.signal,
        tool: 'stacktape_dev',
        clientName,
        env: { STACKTAPE_DEV_SESSION_ID: devSessionId },
        onProgress: async (event) => {
          startup.progress.push({
            ts: event.ts,
            eventType: event.eventType,
            status: event.status,
            message: event.message,
            ...(event.instanceId ? { instanceId: event.instanceId } : {})
          });
          if (startup.progress.length > MAX_STARTUP_PROGRESS) startup.progress.shift();
          if (event.detail?.kind === 'dev-agent') session.agentPort = event.detail.agentPort;
          if (clientWaiting) await onProgress?.({ message: event.message });
        }
      });

      startup.done = run.then(
        (result) => {
          // The CLI reports the port of the agent it started or found running, which may differ from the requested one.
          const payload = (result.data?.result || result.data) as Record<string, unknown> | undefined;
          const agentPort = [payload?.port, payload?.agentPort].find(
            (port): port is number => typeof port === 'number'
          );
          const missingPort = result.ok && agentPort === undefined;
          session.cwd = result.resolvedContext.currentWorkingDirectory || result.resolvedContext.cwd;
          if (result.ok && agentPort !== undefined) {
            session.agentPort = agentPort;
            if (typeof payload?.stage === 'string') session.stage = payload.stage;
            activeDevSessions.set(devSessionId, session);
            // An agent that was already running keeps its own session ID; it is the one a restarted server finds.
            if (typeof payload?.sessionId === 'string' && payload.sessionId !== devSessionId) {
              activeDevSessions.set(payload.sessionId, session);
            }
          } else {
            activeDevSessions.delete(devSessionId);
          }
          const output: ToolOutput = {
            ok: result.ok && !missingPort,
            code: missingPort ? 'INTERNAL_ERROR' : result.code,
            message: missingPort ? 'Dev mode started, but the CLI did not report the dev agent port.' : result.message,
            data: {
              ...(result.ok && !missingPort ? { session } : {}),
              resolvedContext: result.resolvedContext,
              ...(result.data ? { cli: result.data } : {})
            },
            ...(result.rawTail ? { rawTail: result.rawTail } : {})
          };
          finishStartup(output);
        },
        (error: unknown) => {
          activeDevSessions.delete(devSessionId);
          finishStartup({
            ok: false,
            code: 'INTERNAL_ERROR',
            message: `Dev mode failed to start: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      );
      startups.set(devSessionId, startup);
      // Follow-up calls (status, logs, stop) can address the session while it starts.
      activeDevSessions.set(devSessionId, session);

      const output = await waitForStartup(startup, getWaitMs(waitSeconds), signal);
      clientWaiting = false;
      signal?.removeEventListener('abort', forwardCancellation);
      // This call reports the outcome itself, so nothing is kept for a later status call.
      if (output) failedStarts.delete(devSessionId);
      return toToolText(output ?? describeStartup(session, startup));
    }

    const devSessionId = typeof toolArgs.devSessionId === 'string' ? toolArgs.devSessionId : undefined;
    for (const [id, { finishedAt }] of failedStarts) {
      if (Date.now() - finishedAt > FAILED_START_RETENTION_MS) failedStarts.delete(id);
    }
    // A start that failed in the background: the next call about it gets the start's own error, code and hints. Without
    // an ID, a status call gets it when it is the only thing this server knows about.
    const failedStartId =
      devSessionId ??
      (action === 'status' && activeDevSessions.size === 0 && failedStarts.size === 1
        ? [...failedStarts.keys()][0]
        : undefined);
    const failedStart = failedStartId === undefined ? undefined : failedStarts.get(failedStartId);
    if (failedStartId !== undefined && failedStart) {
      failedStarts.delete(failedStartId);
      return toToolText(
        action === 'stop'
          ? {
              ok: true,
              code: 'OK',
              message: 'The dev session failed to start, so nothing runs.',
              data: { startError: failedStart.output }
            }
          : failedStart.output
      );
    }
    const sessionResult = await ensureDevSessionAvailable({
      devSessionId,
      cwd: typeof toolArgs.cwd === 'string' ? toolArgs.cwd : undefined,
      requireExplicit: action === 'stop',
      activeDevSessions,
      requestDevApi,
      discoverAgents,
      isStarting: (session) => startups.has(session.devSessionId)
    });
    if (sessionResult.ok === false) {
      return toToolText(sessionResult.output);
    }

    let startup = startups.get(sessionResult.session.devSessionId);
    if (startup && action === 'status') {
      const output = await waitForStartup(startup, getWaitMs(toolArgs.waitSeconds), signal);
      if (output) failedStarts.delete(sessionResult.session.devSessionId);
      if (output && !output.ok) return toToolText(output);
      if (!output) return toToolText(describeStartup(sessionResult.session, startup));
      // The start finished while this call waited: report the ready session's status.
      startup = undefined;
    }
    if (startup && action === 'stop') {
      // The agent stops through its stop route once it listens, which runs its cleanup; before that, ending the CLI
      // process that starts it stops the start.
      if (sessionResult.session.agentPort !== undefined) {
        await requestDevApi({ port: sessionResult.session.agentPort, method: 'POST', path: '/stop', body: {} }).catch(
          () => ({})
        );
      }
      startup.abort.abort();
      await startup.done;
      forgetDevSession(activeDevSessions, sessionResult.session);
      return toToolText({
        ok: true,
        code: 'OK',
        message: 'Dev session start stopped.',
        data: { session: sessionResult.session }
      });
    }
    const port = sessionResult.session.agentPort;
    if (port === undefined || (startup && action !== 'logs')) {
      return toToolText(
        startup
          ? { ...describeStartup(sessionResult.session, startup), ok: false }
          : { ok: false, code: 'NOT_FOUND', message: 'The dev session has no agent port.' }
      );
    }

    if (action === 'status') {
      const response = await requestDevApi({ port, method: 'GET', path: '/status?verbose=true' });
      return toToolText({
        ok: (response.ok as boolean | undefined) ?? true,
        code: ((response.ok as boolean | undefined) ?? true) ? 'OK' : 'INTERNAL_ERROR',
        message: 'Fetched dev status.',
        data: {
          session: sessionResult.session,
          status: response
        }
      });
    }

    if (action === 'logs') {
      const logsMeta = await requestDevApi({ port, method: 'GET', path: '/logs' }).catch(
        (error: unknown): Record<string, unknown> => ({ ok: false, code: 'UNREACHABLE', message: String(error) })
      );
      // A starting session's agent may not listen yet.
      if (startup && logsMeta.ok === false) {
        return toToolText({ ...describeStartup(sessionResult.session, startup), ok: false });
      }
      const logFile = logsMeta.logFile as string | undefined;
      if (!logFile) {
        return toToolText({
          ok: false,
          code: 'NOT_FOUND',
          message: 'Dev log file path not available.',
          data: logsMeta
        });
      }

      const numberArg = (value: unknown) => {
        const number = typeof value === 'number' ? value : Number(value);
        return value === undefined || value === '' || !Number.isFinite(number) ? undefined : number;
      };
      const requestedWorkload = typeof toolArgs.workload === 'string' ? toolArgs.workload.trim() : undefined;
      const requestedLevel = typeof toolArgs.level === 'string' ? toolArgs.level.trim().toLowerCase() : undefined;
      if (requestedLevel && !(requestedLevel in LOG_LEVEL_RANK)) {
        return toToolText({
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'args.level must be info, warn or error.'
        });
      }
      const sinceMs = parseLogsSince(toolArgs.since, now());
      if (toolArgs.since !== undefined && sinceMs === undefined) {
        return toToolText({
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'args.since must be an ISO time or a duration such as 30s, 10m, 2h or 1d.'
        });
      }
      const cursor = numberArg(toolArgs.cursor);
      const page = await readDevLogs({
        logFile,
        cursor,
        limit: numberArg(toolArgs.limit),
        sinceMs,
        minLevel: requestedLevel,
        source: requestedWorkload || undefined,
        // A level filter without a time or cursor looks for this session's problems, not an earlier session's.
        currentSessionOnly: Boolean(requestedLevel) && sinceMs === undefined && cursor === undefined
      });

      return toToolText({
        ok: true,
        code: 'OK',
        message: requestedWorkload
          ? `Fetched ${page.entries.length} log entries for workload '${requestedWorkload}'.`
          : `Fetched ${page.entries.length} log entries.`,
        data: {
          session: sessionResult.session,
          logFile,
          entries: page.entries,
          nextCursor: page.nextCursor,
          totalLines: page.totalLines,
          ...(page.omitted ? { omittedOlderEntries: page.omitted } : {})
        },
        nextActions: [
          `Pass args.cursor=${page.nextCursor} to read only the lines written after these; filter with args.level (info, warn, error), args.since (ISO time or 10m) and args.workload.`
        ]
      });
    }

    if (action === 'rebuild') {
      const workload = typeof toolArgs.workload === 'string' ? toolArgs.workload : undefined;
      if (!workload) {
        return toToolText({
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'Missing required args.workload for rebuild operation.'
        });
      }

      const response = await requestDevApi({
        port,
        method: 'POST',
        path: `/rebuild/${encodeURIComponent(workload)}`,
        body: {}
      });
      return toToolText(toAgentOutput(response, sessionResult.session, { ok: 'Rebuilt.', failed: 'Rebuild failed.' }));
    }

    if (action === 'rebuild_all') {
      const response = await requestDevApi({
        port,
        method: 'POST',
        path: '/rebuild/all',
        body: {}
      });
      return toToolText(toAgentOutput(response, sessionResult.session, { ok: 'Rebuilt.', failed: 'Rebuild failed.' }));
    }

    if (action === 'query' || action === 'tables') {
      const status = await requestDevApi({ port, method: 'GET', path: '/status?verbose=true' });
      const databases = (
        (Array.isArray(status.localResources) ? status.localResources : []) as Record<string, unknown>[]
      ).filter(
        (resource): resource is LocalDatabase =>
          typeof resource?.name === 'string' && typeof resource?.type === 'string' && resource.type in DATABASE_ROUTE
      );
      const requested = typeof toolArgs.resource === 'string' ? toolArgs.resource : undefined;

      if (action === 'tables' && !requested) {
        const results = await Promise.all(
          databases.map(async (database) => {
            const {
              ok,
              code: _code,
              message,
              ...data
            } = await requestDevApi({
              port,
              method: 'GET',
              path: `/${DATABASE_ROUTE[database.type]}/${encodeURIComponent(database.name)}${TABLES_PATH[DATABASE_ROUTE[database.type]]}`
            });
            return { resource: database.name, type: database.type, ok, ...(ok ? {} : { message }), ...data };
          })
        );
        return toToolText({
          ok: results.every(({ ok }) => ok === true),
          code: results.every(({ ok }) => ok === true) ? 'OK' : 'PARTIAL_FAILURE',
          message: results.length
            ? `Listed the contents of ${results.length} local database(s).`
            : 'This dev session runs no local databases.',
          data: { session: sessionResult.session, databases: results }
        });
      }

      const selected = selectLocalDatabase(databases, requested);
      if (selected.ok === false)
        return toToolText({ ...selected.output, data: { session: sessionResult.session, ...selected.output.data } });
      const { database } = selected;
      const base = `/${DATABASE_ROUTE[database.type]}/${encodeURIComponent(database.name)}`;

      if (action === 'tables') {
        const response = await requestDevApi({
          port,
          method: 'GET',
          path: `${base}${TABLES_PATH[DATABASE_ROUTE[database.type]]}`
        });
        return toToolText(
          toAgentOutput({ ...response, resource: database.name, type: database.type }, sessionResult.session, {
            ok: `Listed the contents of ${database.name}.`,
            failed: `Failed to list the contents of ${database.name}.`
          })
        );
      }

      const request = buildDatabaseQuery(database, toolArgs);
      if (request.ok === false) {
        return toToolText({ ok: false, code: 'VALIDATION_ERROR', message: request.message });
      }
      const response = await requestDevApi({ port, method: request.method, path: request.path, body: request.body });
      const output = toAgentOutput(
        { ...response, resource: database.name, type: database.type },
        sessionResult.session,
        {
          ok: `Queried ${database.name}.`,
          failed: `Query on ${database.name} failed.`
        }
      );
      return toToolText(
        output.code === 'DESTRUCTIVE_OPERATION'
          ? {
              ...output,
              nextActions: [
                'The statement deletes or changes data in bulk. Repeat it with args.confirm=true only if that is intended.'
              ]
            }
          : output
      );
    }

    if (action === 'env') {
      const workload = typeof toolArgs.workload === 'string' ? toolArgs.workload : undefined;
      if (!workload) {
        return toToolText({ ok: false, code: 'VALIDATION_ERROR', message: 'Missing required args.workload for env.' });
      }
      const response = await requestDevApi({ port, method: 'GET', path: `/env/${encodeURIComponent(workload)}` });
      return toToolText(
        toAgentOutput(response, sessionResult.session, {
          ok: `Fetched the environment of ${workload}; secret values are masked.`,
          failed: `Failed to fetch the environment of ${workload}.`
        })
      );
    }

    if (action === 'aws') {
      const { service, command, input, region } = toolArgs;
      if (typeof service !== 'string' || typeof command !== 'string') {
        return toToolText({
          ok: false,
          code: 'VALIDATION_ERROR',
          message:
            'args.service and args.command are required for aws, for example service "logs" and command "FilterLogEvents".'
        });
      }
      const response = await requestDevApi({
        port,
        method: 'POST',
        path: '/aws/sdk',
        body: { service, command, input, region }
      });
      return toToolText(
        toAgentOutput(response, sessionResult.session, {
          ok: `Called ${service} ${command}.`,
          failed: `${service} ${command} failed.`
        })
      );
    }

    if (action === 'reset_db') {
      const resource = typeof toolArgs.resource === 'string' ? toolArgs.resource : 'all';
      const response = await requestDevApi({
        port,
        method: 'POST',
        path: `/reset/${encodeURIComponent(resource)}`,
        body: { confirm: toolArgs.confirm === true, keepTables: toolArgs.keepTables }
      });
      const output = toAgentOutput(response, sessionResult.session, {
        ok: 'Reset the local databases.',
        failed: 'Reset failed.'
      });
      return toToolText(
        output.code === 'DESTRUCTIVE_OPERATION'
          ? {
              ...output,
              nextActions: [
                `reset_db deletes every row of ${resource === 'all' ? 'all local databases' : resource} and keeps the schema and migration history. Repeat with args.confirm=true.`
              ]
            }
          : output
      );
    }

    if (action === 'seed') {
      const script = typeof toolArgs.script === 'string' ? toolArgs.script : 'seed';
      const response = await requestDevApi({
        port,
        method: 'POST',
        path: `/scripts/${encodeURIComponent(script)}/run`,
        body: typeof toolArgs.timeoutSeconds === 'number' ? { timeoutSeconds: toolArgs.timeoutSeconds } : {}
      });
      return toToolText(
        toAgentOutput(response, sessionResult.session, {
          ok: `Ran script ${script} against the local databases.`,
          failed: `Script ${script} failed.`
        })
      );
    }

    if (action === 'stop') {
      const response = await requestDevApi({
        port,
        method: 'POST',
        path: '/stop',
        body: {}
      });
      const ok = (response.ok as boolean | undefined) ?? false;
      if (ok) {
        forgetDevSession(activeDevSessions, sessionResult.session);
      }
      return toToolText({
        ok,
        code: ok ? 'OK' : 'INTERNAL_ERROR',
        message: ok ? 'Dev session stop requested.' : 'Failed to stop dev session.',
        data: {
          session: sessionResult.session,
          response
        }
      });
    }

    return toToolText({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `Unsupported dev action: ${action}`
    });
  };
};

export const handleDevToolAction = createDevToolHandler();
