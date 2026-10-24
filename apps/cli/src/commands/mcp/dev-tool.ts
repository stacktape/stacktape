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
 * A rebuild's own outcome: the agent answers after the build and deployment finished, so a failed build or a changed
 * configuration comes back as `ok: false` with its code, error and log file.
 */
const toRebuildOutput = (response: Record<string, unknown>, session: DevSession): ToolOutput => {
  const { ok, code, message, ...data } = response;
  const succeeded = ok === true;
  return {
    ok: succeeded,
    code: typeof code === 'string' ? code : succeeded ? 'OK' : 'INTERNAL_ERROR',
    message: typeof message === 'string' ? message : succeeded ? 'Rebuilt.' : 'Rebuild failed.',
    data: { session, ...data }
  };
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
  discoverAgents
}: {
  devSessionId?: string;
  /** Narrows the sessions an omitted `devSessionId` is inferred from to one project directory. */
  cwd?: string;
  requireExplicit: boolean;
  activeDevSessions: Map<string, DevSession>;
  requestDevApi: DevApiRequest;
  discoverAgents: () => Promise<DiscoveredDevAgent[]>;
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

  if (session.agentPort === undefined) return { ok: true, session };

  const health = await requestDevApi({
    port: session.agentPort,
    method: 'GET',
    path: '/health'
  });
  if (health.ok === false) {
    forgetDevSession(activeDevSessions, session);
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
  source
}: {
  logFile: string;
  cursor?: number;
  limit?: number;
  sinceMs?: number;
  minLevel?: string;
  source?: string;
}): Promise<{ entries: unknown[]; nextCursor: number; totalLines: number; omitted: number }> => {
  if (!(await pathExists(logFile))) {
    return { entries: [], nextCursor: 0, totalLines: 0, omitted: 0 };
  }

  const content = await readFile(logFile, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const maxItems = Math.max(1, Math.min(limit ?? 100, 1000));
  const minRank = minLevel ? (LOG_LEVEL_RANK[minLevel] ?? 0) : 0;
  const start = cursor === undefined ? 0 : Math.max(0, cursor);

  const matching: Array<{ index: number; entry: Record<string, unknown> }> = [];
  for (let index = start; index < lines.length; index++) {
    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(lines[index]);
    } catch {
      entry = { message: lines[index] };
    }
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
      args: startArgs,
      stacktapeDevStart: {
        tool: 'stacktape_dev',
        arguments: {
          action: 'start',
          cwd: scan.cwd,
          args: startArgs
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
  const runCli = dependencies.runCli || runStacktapeCommandJsonl;
  const requestDevApi = dependencies.requestDevApi || devApiRequest;
  const discoverAgents = dependencies.discoverAgents || discoverDevAgents;
  const createId = dependencies.createId || randomUUID;
  const now = dependencies.now || (() => new Date());

  /** What a session's start reports while it still runs: the latest steps and, once known, the agent's port. */
  const describeStartup = (session: DevSession, startup: DevStartup): ToolOutput => ({
    ok: true,
    code: 'DEV_STARTING',
    message: `Dev mode is still starting${startup.progress.length ? `: ${startup.progress[startup.progress.length - 1].message}` : '.'} A first start creates the dev network and the dev stack, which takes several minutes.`,
    data: { session, startup: { state: 'starting', progress: startup.progress.slice(-10) } },
    nextActions: [
      `Call stacktape_dev with action=status and args.devSessionId=${session.devSessionId}; it waits up to ${DEFAULT_WAIT_SECONDS} s for the start to finish.`
    ]
  });

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
    action: 'plan' | 'start' | 'status' | 'logs' | 'rebuild' | 'rebuild_all' | 'stop';
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
          startup.output = {
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
          startup.state = 'finished';
          startups.delete(devSessionId);
        },
        (error: unknown) => {
          startup.output = {
            ok: false,
            code: 'INTERNAL_ERROR',
            message: `Dev mode failed to start: ${error instanceof Error ? error.message : String(error)}`
          };
          startup.state = 'finished';
          startups.delete(devSessionId);
          activeDevSessions.delete(devSessionId);
        }
      );
      startups.set(devSessionId, startup);
      // Follow-up calls (status, logs, stop) can address the session while it starts.
      activeDevSessions.set(devSessionId, session);

      const output = await waitForStartup(startup, getWaitMs(waitSeconds), signal);
      clientWaiting = false;
      signal?.removeEventListener('abort', forwardCancellation);
      return toToolText(output ?? describeStartup(session, startup));
    }

    const devSessionId = typeof toolArgs.devSessionId === 'string' ? toolArgs.devSessionId : undefined;
    const sessionResult = await ensureDevSessionAvailable({
      devSessionId,
      cwd: typeof toolArgs.cwd === 'string' ? toolArgs.cwd : undefined,
      requireExplicit: action === 'stop',
      activeDevSessions,
      requestDevApi,
      discoverAgents
    });
    if (sessionResult.ok === false) {
      return toToolText(sessionResult.output);
    }

    const startup = startups.get(sessionResult.session.devSessionId);
    if (startup && action === 'status') {
      const output = await waitForStartup(startup, getWaitMs(toolArgs.waitSeconds), signal);
      if (output && !output.ok) return toToolText(output);
      if (!output) return toToolText(describeStartup(sessionResult.session, startup));
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
      const logsMeta = await requestDevApi({ port, method: 'GET', path: '/logs' });
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
      const page = await readDevLogs({
        logFile,
        cursor: numberArg(toolArgs.cursor),
        limit: numberArg(toolArgs.limit),
        sinceMs,
        minLevel: requestedLevel,
        source: requestedWorkload || undefined
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
      return toToolText(toRebuildOutput(response, sessionResult.session));
    }

    if (action === 'rebuild_all') {
      const response = await requestDevApi({
        port,
        method: 'POST',
        path: '/rebuild/all',
        body: {}
      });
      return toToolText(toRebuildOutput(response, sessionResult.session));
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
