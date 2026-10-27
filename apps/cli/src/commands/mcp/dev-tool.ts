import { pathExists, readFile } from 'fs-extra';
import { randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, posix, resolve, win32 } from 'node:path';
import { isReadOnlyRedisCommand } from '@domain-services/debug-services/db-client';
import { isDefinitelyReadOnlySql } from '../_utils/read-only-diagnostics';
import { localStatePaths } from 'src/config/local-state-paths';
import { findStacktapePackageScript, normalizeCliInvocation } from './cli-command-tools';
import { readPlannedProjectSettings, summarizeMatchedScriptForPlan, summarizeScanForPlan } from './cli-planning';
import { runStacktapeCommandJsonl } from './cli-jsonl-runner';
import { scanStacktapeProject } from './project-scan';
import { toToolText, type ToolOutput } from './tool-output';
import { type DiscoveredDevAgent, discoverDevAgents, isSameDirectory } from '../dev/agent-daemon';

type DevSession = {
  devSessionId: string;
  /** The ID the agent reports in its status. A start that found the agent already running gets the agent's own ID. */
  agentSessionId?: string;
  /** Known once the CLI reports the agent it starts, before the start finishes. */
  agentPort?: number;
  startedAt: string;
  /** The project directory. */
  cwd: string;
  stage?: string;
  /** `started`: this MCP server started it. `found`: a running agent found through its token file. */
  origin: 'started' | 'found';
  /** Since when the session is known to run; a stop reason recorded earlier belongs to another session. */
  knownSince: string;
};

type DevApiRequest = (input: {
  port: number;
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
  /** Ends the request with a `TimeoutError`; a rebuild or a seed may take minutes, a status check must not. */
  timeoutMs?: number;
}) => Promise<Record<string, unknown>>;

/** How long a status check waits: one agent that hangs must not block every call that looks for a session. */
const STATUS_CHECK_TIMEOUT_MS = 3000;

const REBUILD_PROGRESS_INTERVAL_MS = 5000;

type DevToolDependencies = {
  runCli?: typeof runStacktapeCommandJsonl;
  /** The MCP server's working directory: sessions there count as this server's own. Default: the process's. */
  serverDirectory?: () => string;
  statusCheckTimeoutMs?: number;
  requestDevApi?: DevApiRequest;
  /** Running agents of this user; a restarted MCP server finds its sessions again through them. */
  discoverAgents?: () => Promise<DiscoveredDevAgent[]>;
  createId?: () => string;
  now?: () => Date;
  /** How long `stop` waits for the agent to exit. */
  stopWaitMs?: number;
  /** How often a rebuild reports progress. */
  rebuildProgressIntervalMs?: number;
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
/** An agent's cleanup stops containers and closes its tunnels; it usually exits within a few seconds. */
const STOP_WAIT_MS = 30_000;
/** The CLI process gets this long in total; the daemon parent itself stops a daemon that stays silent for 10 minutes. */
const START_TIMEOUT_MS = 30 * 60 * 1000;
/** Codes of a `dev --agent` result whose session runs but is not ready (`commands/dev/index.ts`). */
const SESSION_NOT_READY_CODES = new Set(['DEV_STARTED_WITH_FAILURES', 'DEV_SESSION_NOT_READY']);

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
const devApiRequest: DevApiRequest = async ({ port, method, path, body, timeoutMs }) => {
  const token = (await readFile(localStatePaths.devAgentTokenFile({ port }), 'utf-8').catch(() => '')).trim();
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
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
    data: { session: publicSession(session), ...data }
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
  args: Record<string, unknown>,
  /** The database refuses any write: SQL runs in a read-only transaction, Redis accepts only read commands. */
  readOnly: boolean
): { ok: true; method: 'POST'; path: string; body: Record<string, unknown> } | { ok: false; message: string } => {
  const route = DATABASE_ROUTE[database.type];
  const base = `/${route}/${encodeURIComponent(database.name)}`;
  const limit = typeof args.limit === 'number' ? args.limit : undefined;
  const confirm = args.confirm === true ? true : undefined;
  const onlyRead = readOnly ? { readOnly: true } : {};
  if (route === 'postgres' || route === 'mysql') {
    if (typeof args.sql !== 'string' || !args.sql.trim()) {
      return { ok: false, message: `args.sql is required to query ${database.type} database "${database.name}".` };
    }
    return { ok: true, method: 'POST', path: `${base}/query`, body: { sql: args.sql, limit, confirm, ...onlyRead } };
  }
  if (route === 'redis') {
    if (typeof args.command !== 'string' || !args.command.trim()) {
      return {
        ok: false,
        message: `args.command (for example "GET key") is required to query Redis "${database.name}".`
      };
    }
    return { ok: true, method: 'POST', path: `${base}/command`, body: { cmd: args.command, confirm, ...onlyRead } };
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

type PathPlatform = { platform?: NodeJS.Platform; home?: string };

/**
 * A directory as the file system names it: symbolic links followed as far as the path exists, and lower case where the
 * file system usually ignores case (Windows, macOS), so `C:\Users\me` and `c:\users\me` are one directory.
 */
const canonicalDirectory = (directory: string, platform: NodeJS.Platform): string => {
  const paths = platform === 'win32' ? win32 : posix;
  let canonical = paths.resolve(directory);
  if (platform === process.platform) {
    // The longest existing part is resolved, so a link in it counts even when the rest does not exist yet.
    let existing = canonical;
    let rest = '';
    for (;;) {
      try {
        canonical = paths.join(realpathSync.native(existing), rest);
        break;
      } catch {
        const parent = paths.dirname(existing);
        if (parent === existing) break;
        rest = paths.join(paths.basename(existing), rest);
        existing = parent;
      }
    }
  }
  const { root } = paths.parse(canonical);
  if (canonical.length > root.length) canonical = canonical.replace(/[\\/]+$/, '');
  return platform === 'win32' || platform === 'darwin' ? canonical.toLowerCase() : canonical;
};

const isWithin = (child: string, parent: string, separator: string) =>
  child === parent || child.startsWith(parent.endsWith(separator) ? parent : `${parent}${separator}`);

/**
 * Whether a session's project directory belongs to a directory whose sessions this MCP server may pick without a
 * `devSessionId`: the directory itself or a folder inside it. Clients that start the server in the home directory, a
 * directory that contains homes (`/home`, `/Users`, `C:\Users`) or a filesystem root say nothing about the project, so
 * such a directory counts only for a project in exactly that directory.
 */
export const isProjectDirectoryOf = (
  directory: string,
  scopeDirectory: string,
  { platform = process.platform, home = homedir() }: PathPlatform = {}
): boolean => {
  const separator = platform === 'win32' ? win32.sep : posix.sep;
  const project = canonicalDirectory(directory, platform);
  const scope = canonicalDirectory(scopeDirectory, platform);
  const isRoot = scope === canonicalDirectory((platform === 'win32' ? win32 : posix).parse(scope).root, platform);
  if (isRoot || isWithin(canonicalDirectory(home, platform), scope, separator)) return project === scope;
  return isWithin(project, scope, separator);
};

/**
 * Whether a query may write. Only SQL that the `query sql` command accepts as read-only and a Redis command known to
 * read count as reads; a call that passes both `sql` and `command` writes if either does. Functions can still write from
 * a SELECT, so a query on another project's session also runs read-only in the database.
 */
export const isWriteQuery = (args: Record<string, unknown>): boolean =>
  (typeof args.sql === 'string' && !isDefinitelyReadOnlySql(args.sql)) ||
  (typeof args.command === 'string' && !isReadOnlyRedisCommand(args.command));

/** Actions that change a session's code, data or state; they never act on a session they have to guess elsewhere. */
const isMutatingAction = (action: DevToolAction, args: Record<string, unknown>) =>
  action === 'rebuild' ||
  action === 'rebuild_all' ||
  action === 'reset_db' ||
  action === 'seed' ||
  action === 'stop' ||
  (action === 'query' && isWriteQuery(args));

/** What a call returns about a session; the fields used to tell sessions apart stay inside the server. */
const publicSession = ({ devSessionId, agentPort, startedAt, cwd, stage }: DevSession) => ({
  devSessionId,
  ...(agentPort !== undefined ? { agentPort } : {}),
  startedAt,
  cwd,
  ...(stage ? { stage } : {})
});

/** How a refusal lists the sessions an agent could address with `devSessionId`. */
const describeCandidates = (sessions: DevSession[]) => ({
  activeDevSessionIds: sessions.map(({ devSessionId }) => devSessionId),
  activeDevSessions: sessions.map(({ devSessionId, cwd, stage }) => ({
    devSessionId,
    projectDirectory: cwd,
    ...(stage ? { stage } : {})
  }))
});

/**
 * The chosen session, and whether the agent chose it: by its `devSessionId`, or as a session of this server's own
 * projects. A session read through `cwd` in another project is not, so its database queries run read-only.
 */
type SessionSelection = { ok: true; session: DevSession; ownProject: boolean } | { ok: false; output: ToolOutput };
type RunningCheck = { ok: true } | { ok: false; output: ToolOutput };

/**
 * What an agent that lost its stage to a take-over answers. The take-over was a deliberate act of a person or another
 * agent, so the answer names the holder and leaves taking the stage back to the user: two agents that each took it back
 * would move it between them forever, redeploying every time.
 */
const describeTakeOver = (
  session: DevSession,
  recordedMessage: string
): Pick<ToolOutput, 'message' | 'nextActions'> => {
  const takeOver = /^(.+?) took over dev mode for (\S+?),/.exec(recordedMessage);
  const holder = takeOver?.[1];
  return {
    message: holder
      ? `Dev session ${session.devSessionId} (${session.cwd}) stopped because ${holder} took over dev mode for ${takeOver[2]} on purpose. Deployed functions now reach the databases of that session, and this one stopped so that it cannot redeploy functions over theirs.`
      : `Dev session ${session.devSessionId} (${session.cwd}) stopped itself: ${recordedMessage.replace(/\s*To move the stage back[\s\S]*$/, '')}`,
    nextActions: [
      `Tell the user that ${holder ?? 'another session'} moved this stage on purpose. Do not take it back unless the user asks for it: that would stop the other session, which may be a person's or another agent's work.`
    ]
  };
};

/**
 * The dev sessions this MCP server knows and how a call picks one. A call with `devSessionId` gets that session. A call
 * without it may only pick a session this server started, or one whose project directory is the server's working
 * directory or one of the client's roots: an agent must never rebuild or reset another worktree's session because it
 * happens to be the only one running. Ended sessions are dropped before the choice, and a session another one took over
 * keeps answering with that reason instead of letting the next call reach the new holder.
 */
const createSessionRegistry = ({
  requestDevApi,
  discoverAgents,
  isStarting,
  now,
  serverDirectory,
  statusCheckTimeoutMs
}: {
  requestDevApi: DevApiRequest;
  discoverAgents: () => Promise<DiscoveredDevAgent[]>;
  /** A starting session reports its port before its agent listens, so it is not checked. */
  isStarting: (session: DevSession) => boolean;
  now: () => Date;
  serverDirectory: () => string;
  statusCheckTimeoutMs: number;
}) => {
  const active = new Map<string, DevSession>();
  /** Sessions whose agent recorded why it stopped, under each of their IDs. */
  const ended = new Map<string, { session: DevSession; output: ToolOutput }>();

  // A session can be registered under two IDs (see `start`), so lists are deduplicated.
  const sessions = () => [...new Set(active.values())];

  const forget = (session: DevSession) => {
    for (const [id, candidate] of active) if (candidate === session) active.delete(id);
  };

  /**
   * Adds the running agents this MCP server does not know yet, for example after a client restarted it. Only agents
   * that report their session ID and project directory are adopted; their session ID is the `devSessionId` the earlier
   * MCP server returned, because it passed that ID to the agent.
   */
  const rediscover = async () => {
    const knownPorts = new Set(sessions().map(({ agentPort }) => agentPort));
    for (const agent of await discoverAgents().catch(() => [])) {
      if (!agent.sessionId || !agent.projectDirectory || knownPorts.has(agent.port)) continue;
      active.set(agent.sessionId, {
        devSessionId: agent.sessionId,
        agentSessionId: agent.sessionId,
        agentPort: agent.port,
        startedAt: '',
        cwd: agent.projectDirectory,
        ...(agent.stage ? { stage: agent.stage } : {}),
        origin: 'found',
        knownSince: now().toISOString()
      });
    }
  };

  /**
   * Asks the session's agent whether it still runs. An agent that has exited refuses the connection, one whose token
   * file is gone gets no token, and an agent that took over the port reports another session ID; each ends the session
   * here, with the reason its agent recorded when there is one.
   */
  const checkRunning = async (session: DevSession): Promise<RunningCheck> => {
    if (session.agentPort === undefined || isStarting(session)) return { ok: true };
    const port = session.agentPort;
    const status = await requestDevApi({ port, method: 'GET', path: '/status', timeoutMs: statusCheckTimeoutMs }).catch(
      (error: unknown): Record<string, unknown> => ({
        ok: false,
        code: error instanceof Error && error.name === 'TimeoutError' ? 'TIMEOUT' : 'UNREACHABLE',
        message: String(error)
      })
    );
    // An agent that hangs may still run: it stays known, but this call does not wait for it.
    if (status.code === 'TIMEOUT') {
      return {
        ok: false,
        output: {
          ok: false,
          code: 'DEV_AGENT_NOT_RESPONDING',
          message: `The agent of dev session ${session.devSessionId} (${session.cwd}) on port ${port} did not answer within ${statusCheckTimeoutMs / 1000} s.`,
          data: { session: publicSession(session) },
          nextActions: [
            'Try again in a moment. If it keeps hanging, read the dev log with action=logs, or stop it with action=stop and its devSessionId.'
          ]
        }
      };
    }
    const reportedId = typeof status.sessionId === 'string' ? status.sessionId : undefined;
    const anotherSession =
      reportedId !== undefined && session.agentSessionId !== undefined && reportedId !== session.agentSessionId;
    if (status.ok !== false && !anotherSession) return { ok: true };

    forget(session);
    const stopped = await readStopReason(port, session.knownSince);
    if (stopped) {
      const output: ToolOutput = {
        ok: false,
        code: stopped.code,
        ...describeTakeOver(session, stopped.message),
        data: { session: publicSession(session) }
      };
      for (const id of new Set([session.devSessionId, session.agentSessionId]))
        if (id) ended.set(id, { session, output });
      return { ok: false, output };
    }
    return {
      ok: false,
      output: {
        ok: false,
        code: 'NOT_FOUND',
        message: anotherSession
          ? `Dev session ${session.devSessionId} has ended; port ${port} now serves another dev session.`
          : status.code === 'UNAUTHORIZED'
            ? `The process on port ${port} refused the session token in ${localStatePaths.devAgentTokenFile({ port })}; dev session ${session.devSessionId} has ended.`
            : `Dev session ${session.devSessionId} on port ${port} is no longer reachable.`,
        nextActions: ['Call stacktape_dev with action=start to create a new dev session']
      }
    };
  };

  const select = async ({
    devSessionId,
    cwd,
    stage,
    mutating,
    requireExplicit,
    getProjectRoots
  }: {
    devSessionId?: string;
    /** Narrows the sessions an omitted `devSessionId` is inferred from to one project directory. */
    cwd?: string;
    /** Narrows them to one stage, for a directory that runs several. */
    stage?: string;
    /** The call changes code, data or state, so it never picks a session outside this server's projects. */
    mutating: boolean;
    requireExplicit: boolean;
    getProjectRoots: () => Promise<string[]>;
  }): Promise<SessionSelection> => {
    if (devSessionId) {
      const stopped = ended.get(devSessionId);
      if (stopped) return { ok: false, output: stopped.output };
      if (!active.has(devSessionId)) await rediscover();
      const session = active.get(devSessionId);
      if (!session) {
        return {
          ok: false,
          output: {
            ok: false,
            code: 'NOT_FOUND',
            message: `No active dev session matches devSessionId ${devSessionId}.`,
            data: describeCandidates(sessions()),
            nextActions: ['Use a devSessionId returned by stacktape_dev action=start.']
          }
        };
      }
      const check = await checkRunning(session);
      return check.ok === false ? { ok: false, output: check.output } : { ok: true, session, ownProject: true };
    }

    // Sessions stopped elsewhere would make the choice ambiguous or pick an ended session. One that hangs still counts.
    const checks = new Map(
      await Promise.all(sessions().map(async (session) => [session, await checkRunning(session)] as const))
    );
    let roots: string[] | undefined;
    const isInScope = async (session: DevSession) => {
      if (session.origin === 'started' || isProjectDirectoryOf(session.cwd, serverDirectory())) return true;
      roots ??= await getProjectRoots().catch(() => []);
      return roots.some((root) => isProjectDirectoryOf(session.cwd, root));
    };
    const matching = async () => {
      const result: Array<{ session: DevSession; inScope: boolean }> = [];
      for (const session of sessions()) {
        if (cwd && !isSameDirectory(session.cwd, cwd)) continue;
        if (stage && session.stage !== stage) continue;
        result.push({ session, inScope: await isInScope(session) });
      }
      return result;
    };
    // An explicit cwd addresses that project for reading; changes stay with this server's own projects.
    const eligible = async () =>
      (await matching())
        .filter(({ inScope }) => inScope || (cwd !== undefined && !mutating))
        .map(({ session }) => session);

    let candidates = await eligible();
    if (candidates.length === 0) {
      await rediscover();
      candidates = await eligible();
    }

    // After a take-over the replaced session keeps answering; the next call must not reach the session that replaced it.
    // A session of the same stage this server started in the same directory after the replaced one is the one the agent
    // works with now; a session of another stage there does not replace it.
    // The replaced session's agent may be found ended only after that start, so a start alone cannot clear its answer.
    for (const entry of new Set(ended.values())) {
      const { session, output } = entry;
      if (cwd && !isSameDirectory(session.cwd, cwd)) continue;
      if (stage && session.stage !== stage) continue;
      if (!(await isInScope(session))) continue;
      const newer = candidates.some(
        (candidate) =>
          candidate.origin === 'started' &&
          candidate.stage === session.stage &&
          isSameDirectory(candidate.cwd, session.cwd) &&
          candidate.knownSince > session.knownSince
      );
      if (newer) {
        for (const [id, value] of ended) if (value === entry) ended.delete(id);
        continue;
      }
      return {
        ok: false,
        output: {
          ...output,
          data: { ...output.data, ...describeCandidates(candidates) },
          nextActions: [
            ...(output.nextActions ?? []),
            'To act on another running session, pass its devSessionId. Calls without one keep returning this until a dev session starts in this directory.'
          ]
        }
      };
    }

    if (candidates.length === 1 && !requireExplicit) {
      const [session] = candidates;
      const check = checks.get(session);
      if (check?.ok === false) return { ok: false, output: check.output };
      return { ok: true, session, ownProject: await isInScope(session) };
    }

    const elsewhere = (await matching()).filter(({ inScope }) => !inScope).map(({ session }) => session);
    if (candidates.length === 0 && elsewhere.length) {
      return {
        ok: false,
        output: {
          ok: false,
          code: 'DEV_SESSION_ID_REQUIRED',
          message: `No dev session of this MCP server's projects is running. Dev sessions run in other directories: ${elsewhere.map(({ devSessionId: id, cwd: directory }) => `${id} in ${directory}`).join(', ')}.`,
          data: describeCandidates(elsewhere),
          nextActions: [
            mutating
              ? 'Pass args.devSessionId to act on one of them, only if that is the project you mean; this call changes its code, data or state.'
              : 'Pass args.devSessionId or args.cwd to read one of them, or call stacktape_dev with action=start to start dev mode for this project.'
          ]
        }
      };
    }

    const noActiveSessions = candidates.length === 0;
    const ambiguous = candidates.length > 1;
    return {
      ok: false,
      output: {
        ok: false,
        code: ambiguous ? 'AMBIGUOUS_DEV_SESSION' : noActiveSessions ? 'NOT_FOUND' : 'DEV_SESSION_ID_REQUIRED',
        message: noActiveSessions
          ? 'No active Stacktape dev session found.'
          : ambiguous
            ? 'Multiple Stacktape dev sessions are active. Specify args.devSessionId.'
            : 'Specify args.devSessionId for this dev operation.',
        data: describeCandidates(candidates),
        nextActions: [
          noActiveSessions
            ? 'Call stacktape_dev with action=start first.'
            : 'Use a devSessionId returned by stacktape_dev action=start.'
        ]
      }
    };
  };

  return {
    active,
    forget,
    select,
    /** A start succeeded: the agent chose where it works now, so earlier take-overs no longer answer for it. */
    clearEnded: () => ended.clear()
  };
};

const isProcessRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};

/** Why the session's agent ended itself, when it recorded a reason after this session was known to run. */
const readStopReason = async (
  port: number,
  knownSince: string
): Promise<{ code: string; message: string } | undefined> => {
  try {
    const recorded = JSON.parse(await readFile(localStatePaths.devAgentStopReasonFile({ port }), 'utf-8')) as {
      code?: unknown;
      message?: unknown;
      at?: unknown;
    };
    if (typeof recorded.message !== 'string' || typeof recorded.at !== 'string') return undefined;
    if (!knownSince || recorded.at < knownSince) return undefined;
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
  const startups = new Map<string, DevStartup>();
  // A start that failed after its tool call returned DEV_STARTING keeps its error here until a call reads it.
  const failedStarts = new Map<string, { output: ToolOutput; finishedAt: number }>();
  const runCli = dependencies.runCli || runStacktapeCommandJsonl;
  const requestDevApi = dependencies.requestDevApi || devApiRequest;
  const discoverAgents = dependencies.discoverAgents || discoverDevAgents;
  const createId = dependencies.createId || randomUUID;
  const now = dependencies.now || (() => new Date());
  const registry = createSessionRegistry({
    requestDevApi,
    discoverAgents,
    isStarting: (session) => startups.has(session.devSessionId),
    now,
    serverDirectory: dependencies.serverDirectory || (() => process.cwd()),
    statusCheckTimeoutMs: dependencies.statusCheckTimeoutMs ?? STATUS_CHECK_TIMEOUT_MS
  });
  const activeDevSessions = registry.active;
  const stopWaitMs = dependencies.stopWaitMs ?? STOP_WAIT_MS;
  const rebuildProgressIntervalMs = dependencies.rebuildProgressIntervalMs ?? REBUILD_PROGRESS_INTERVAL_MS;

  /**
   * Reports what a rebuild waits for while its request runs, every `rebuildProgressIntervalMs`: a container that
   * builds and then waits for its port can take minutes, and clients reset their timeout on progress.
   */
  const withRebuildProgress = async <T>(
    port: number,
    request: Promise<T>,
    onProgress: ((event: { message: string }) => void | Promise<void>) | undefined
  ): Promise<T> => {
    if (!onProgress) return request;
    const startedAt = Date.now();
    let answered = false;
    const timer = setInterval(async () => {
      const status = await requestDevApi({ port, method: 'GET', path: '/status?verbose=true', timeoutMs: 2000 }).catch(
        () => undefined
      );
      const rebuilding = (Array.isArray(status?.workloads) ? status.workloads : [])
        .filter((workload): workload is { name: string; statusMessage?: string } => workload?.status === 'starting')
        .map(({ name, statusMessage }) => (statusMessage ? `${name}: ${statusMessage}` : name));
      // A tick that waited for the status while the rebuild answered reports nothing.
      if (answered) return;
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      await Promise.resolve(
        onProgress({ message: `Rebuilding${rebuilding.length ? ` ${rebuilding.join('; ')}` : ''} (${seconds} s)` })
      ).catch(() => {});
    }, rebuildProgressIntervalMs);
    try {
      return await request;
    } finally {
      answered = true;
      clearInterval(timer);
    }
  };

  /**
   * Whether the agent exited within `stopWaitMs`. Its HTTP server closes early in its cleanup, so with the process ID
   * from its status the process itself is awaited; without one, the agent counts as exited once it stops answering.
   */
  const waitForAgentExit = async (port: number, pid: number | undefined) => {
    const deadline = Date.now() + stopWaitMs;
    for (;;) {
      if (pid !== undefined) {
        if (!isProcessRunning(pid)) return true;
      } else {
        const status = await requestDevApi({ port, method: 'GET', path: '/status', timeoutMs: 1000 }).catch(
          () => undefined
        );
        if (!status || status.ok === false) return true;
      }
      if (Date.now() >= deadline) return false;
      await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    }
  };

  /** What a session's start reports while it still runs: the latest steps and, once known, the agent's port. */
  const describeStartup = (session: DevSession, startup: DevStartup): ToolOutput => {
    // Heartbeats already say "Still starting: <step> (<seconds>)".
    const latest = startup.progress.at(-1)?.message.replace(/^Still starting:?\s*/, '');
    return {
      ok: true,
      code: 'DEV_STARTING',
      message: `Dev mode is still starting${latest ? `: ${latest}.` : '.'} A first start creates the dev network and the dev stack, which takes several minutes.`,
      data: { session: publicSession(session), startup: { state: 'starting', progress: startup.progress.slice(-10) } },
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
    onProgress,
    getProjectRoots = async () => []
  }: {
    action: DevToolAction;
    args?: Record<string, unknown>;
    signal?: AbortSignal;
    clientName?: string;
    onProgress?: (event: { message: string }) => void | Promise<void>;
    /** The directories of the client's MCP roots; sessions in them count as this server's own. */
    getProjectRoots?: () => Promise<string[]>;
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
      const startedAt = now().toISOString();
      const session: DevSession = {
        devSessionId,
        agentSessionId: devSessionId,
        startedAt,
        cwd: typeof requestedCwd === 'string' ? requestedCwd : process.cwd(),
        ...(typeof devCliArgs.stage === 'string' ? { stage: devCliArgs.stage } : {}),
        origin: 'started',
        knownSince: startedAt
      };
      let clientWaiting = true;
      const startup: DevStartup = {
        state: 'starting',
        progress: [],
        abort: new AbortController(),
        done: Promise.resolve()
      };
      const forwardCancellation = () => startup.abort.abort();
      const finishStartup = (output: ToolOutput, { sessionRuns = output.ok }: { sessionRuns?: boolean } = {}) => {
        startup.output = output;
        startup.state = 'finished';
        startups.delete(devSessionId);
        if (!sessionRuns) failedStarts.set(devSessionId, { output, finishedAt: Date.now() });
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
          // The session runs, but a workload failed or it is still starting: it stays usable (rebuild, logs, stop), and
          // the start is not reported as a success.
          const runsNotReady = !result.ok && SESSION_NOT_READY_CODES.has(result.code) && agentPort !== undefined;
          session.cwd = result.resolvedContext.currentWorkingDirectory || result.resolvedContext.cwd;
          if ((result.ok || runsNotReady) && agentPort !== undefined) {
            session.agentPort = agentPort;
            if (typeof payload?.stage === 'string') session.stage = payload.stage;
            activeDevSessions.set(devSessionId, session);
            // An agent that was already running keeps its own session ID; it is the one a restarted server finds.
            if (typeof payload?.sessionId === 'string' && payload.sessionId !== devSessionId) {
              session.agentSessionId = payload.sessionId;
              activeDevSessions.set(payload.sessionId, session);
            }
            registry.clearEnded();
          } else {
            activeDevSessions.delete(devSessionId);
          }
          const succeeded = result.ok && !missingPort;
          if (runsNotReady) {
            const failedWorkloads = Array.isArray(result.data?.failedWorkloads) ? result.data.failedWorkloads : [];
            finishStartup(
              {
                ok: false,
                code: result.code,
                message: result.message,
                data: {
                  session: publicSession(session),
                  ready: false,
                  failedWorkloads,
                  resolvedContext: result.resolvedContext,
                  ...(result.data ? { cli: result.data } : {})
                },
                nextActions: failedWorkloads.length
                  ? [
                      'The session runs, but the failed workloads do not run your current code: requests to them reach their previous code or fail. Fix the errors in the messages above.',
                      `Then call stacktape_dev with action=rebuild, args.devSessionId=${devSessionId} and args.workload=<name> for each failed workload, and test only after it returns ok.`
                    ]
                  : [
                      `Call stacktape_dev with action=status and args.devSessionId=${devSessionId} until ready is true before testing.`
                    ]
              },
              { sessionRuns: true }
            );
            return;
          }
          const output: ToolOutput = {
            ok: succeeded,
            code: missingPort ? 'INTERNAL_ERROR' : result.code,
            message: missingPort ? 'Dev mode started, but the CLI did not report the dev agent port.' : result.message,
            data: {
              ...(succeeded ? { session: publicSession(session) } : {}),
              resolvedContext: result.resolvedContext,
              ...(result.data ? { cli: result.data } : {})
            },
            // The CLI's output explains a failure. After a successful start it is the banner for people, whose
            // instructions (curl, `stacktape dev stop`) are not the ones an assistant uses here.
            ...(!succeeded && result.rawTail ? { rawTail: result.rawTail } : {}),
            ...(result.code === 'DEV_STAGE_RUNNING_ELSEWHERE'
              ? {
                  nextActions: [
                    "Another session holds this stage. To move the stage here, call stacktape_dev with action=start, the same args and args.takeOver=true: deployed functions then reach the databases of this session, and the other session stops itself. Ask the user first if the other session may be someone else's work."
                  ]
                }
              : {})
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
    const sessionResult = await registry.select({
      devSessionId,
      cwd: typeof toolArgs.cwd === 'string' ? toolArgs.cwd : undefined,
      stage: typeof toolArgs.stage === 'string' ? toolArgs.stage : undefined,
      mutating: isMutatingAction(action, toolArgs),
      requireExplicit: action === 'stop',
      getProjectRoots
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
      registry.forget(sessionResult.session);
      return toToolText({
        ok: true,
        code: 'OK',
        message: 'Dev session start stopped.',
        data: { session: publicSession(sessionResult.session) }
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
          session: publicSession(sessionResult.session),
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
          session: publicSession(sessionResult.session),
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

      const response = await withRebuildProgress(
        port,
        requestDevApi({ port, method: 'POST', path: `/rebuild/${encodeURIComponent(workload)}`, body: {} }),
        onProgress
      );
      return toToolText(toAgentOutput(response, sessionResult.session, { ok: 'Rebuilt.', failed: 'Rebuild failed.' }));
    }

    if (action === 'rebuild_all') {
      const response = await withRebuildProgress(
        port,
        requestDevApi({ port, method: 'POST', path: '/rebuild/all', body: {} }),
        onProgress
      );
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
          data: { session: publicSession(sessionResult.session), databases: results }
        });
      }

      const selected = selectLocalDatabase(databases, requested);
      if (selected.ok === false)
        return toToolText({
          ...selected.output,
          data: { session: publicSession(sessionResult.session), ...selected.output.data }
        });
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

      // A query on another project's session, chosen through cwd, may only read, whatever the statement looks like.
      const request = buildDatabaseQuery(database, toolArgs, !sessionResult.ownProject);
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
      const agentStatus = await requestDevApi({
        port,
        method: 'GET',
        path: '/status',
        timeoutMs: STATUS_CHECK_TIMEOUT_MS
      }).catch(() => ({}) as Record<string, unknown>);
      const response = await requestDevApi({
        port,
        method: 'POST',
        path: '/stop',
        body: {}
      });
      const ok = (response.ok as boolean | undefined) ?? false;
      if (!ok) {
        return toToolText({
          ok,
          code: 'INTERNAL_ERROR',
          message: 'Failed to stop dev session.',
          data: { session: publicSession(sessionResult.session), response }
        });
      }
      registry.forget(sessionResult.session);
      // The agent answers before its cleanup runs. Until it has exited, its containers may still run and the dev box
      // may still list it as the stage's holder, so a start right after this call would be refused.
      const exited = await waitForAgentExit(port, typeof agentStatus.pid === 'number' ? agentStatus.pid : undefined);
      return toToolText({
        ok,
        code: 'OK',
        message: exited
          ? 'Dev session stopped.'
          : `Dev session stop requested; the agent on port ${port} is still stopping after ${stopWaitMs / 1000} s.`,
        data: {
          session: publicSession(sessionResult.session),
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
