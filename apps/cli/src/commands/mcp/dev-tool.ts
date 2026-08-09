import { pathExists, readFile } from 'fs-extra';
import { randomUUID } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';
import { findStacktapePackageScript } from './cli-command-tools';
import { summarizeMatchedScriptForPlan, summarizeScanForPlan } from './cli-planning';
import { runStacktapeCommandJsonl } from './cli-jsonl-runner';
import { scanStacktapeProject } from './project-scan';
import { toToolText, type ToolOutput } from './tool-output';

type DevSession = {
  devSessionId: string;
  agentPort: number;
  startedAt: string;
  cwd: string;
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
  createId?: () => string;
  now?: () => Date;
};

const ARG_ALIASES: Record<string, string> = {
  aa: 'awsAccount',
  hs: 'hotSwap',
  project_name: 'projectName',
  config_path: 'configPath',
  resource_name: 'resourceName',
  script_name: 'scriptName',
  secret_name: 'secretName',
  secret_value: 'secretValue',
  secret_file: 'secretFile',
  bastion_resource: 'bastionResource',
  out_file: 'outFile',
  out_format: 'outFormat',
  auto_confirm_operation: 'autoConfirmOperation',
  task_arn: 'taskArn',
  start_time: 'startTime',
  end_time: 'endTime'
};

const toCamelCase = (value: string): string => value.replace(/[_-]([a-z])/g, (_, char: string) => char.toUpperCase());

const normalizeToolArgs = (args?: Record<string, unknown>): Record<string, unknown> => {
  if (!args) return {};
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    const mappedKey = ARG_ALIASES[key] || toCamelCase(key);
    normalized[mappedKey] = value;
  }
  return normalized;
};

const devApiRequest: DevApiRequest = async ({
  port,
  method,
  path,
  body
}: {
  port: number;
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
}): Promise<Record<string, unknown>> => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {
      'content-type': 'application/json'
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

const ensureDevSessionAvailable = async ({
  devSessionId,
  requireExplicit,
  activeDevSessions,
  requestDevApi
}: {
  devSessionId?: string;
  requireExplicit: boolean;
  activeDevSessions: Map<string, DevSession>;
  requestDevApi: DevApiRequest;
}): Promise<{ ok: true; session: DevSession } | { ok: false; output: ToolOutput }> => {
  const inferredSession =
    !devSessionId && !requireExplicit && activeDevSessions.size === 1 ? [...activeDevSessions.values()][0] : undefined;
  const session = devSessionId ? activeDevSessions.get(devSessionId) : inferredSession;

  if (!session) {
    const ambiguous = !devSessionId && activeDevSessions.size > 1;
    const noActiveSessions = activeDevSessions.size === 0;
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
          activeDevSessionIds: [...activeDevSessions.keys()]
        },
        nextActions: [
          activeDevSessions.size === 0
            ? 'Call stacktape_dev with action=start first.'
            : 'Use a devSessionId returned by stacktape_dev action=start.'
        ]
      }
    };
  }

  const health = await requestDevApi({
    port: session.agentPort,
    method: 'GET',
    path: '/health'
  });
  if (health.ok === false) {
    activeDevSessions.delete(session.devSessionId);
    return {
      ok: false,
      output: {
        ok: false,
        code: 'NOT_FOUND',
        message: `Dev session ${session.devSessionId} on port ${session.agentPort} is no longer reachable.`,
        nextActions: ['Call stacktape_dev with action=start to create a new dev session']
      }
    };
  }

  return { ok: true, session };
};

const readDevLogs = async ({
  logFile,
  cursor,
  limit
}: {
  logFile: string;
  cursor?: number;
  limit?: number;
}): Promise<{ entries: unknown[]; nextCursor: number; totalLines: number }> => {
  if (!(await pathExists(logFile))) {
    return { entries: [], nextCursor: 0, totalLines: 0 };
  }

  const content = await readFile(logFile, 'utf-8');
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const start = Math.max(0, cursor ?? 0);
  const maxItems = Math.max(1, Math.min(limit ?? 200, 1000));
  const page = lines.slice(start, start + maxItems);

  const entries = page.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { message: line };
    }
  });

  return {
    entries,
    nextCursor: start + page.length,
    totalLines: lines.length
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
  delete (startArgs as Record<string, unknown>).hotSwap;

  const missingArgs = ['stage', 'region', 'configPath'].filter(
    (argName) => !startArgs[argName as keyof typeof startArgs]
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
        currentWorkingDirectory: startArgs.currentWorkingDirectory
      },
      scan: summarizeScanForPlan(scan),
      matchedPackageScript: summarizeMatchedScriptForPlan(
        matchedDeployScript
          ? {
              ...matchedDeployScript,
              matchKind: 'deploy-context',
              usedParsedArgs: Object.fromEntries(
                Object.entries(deployContext).filter(([argName]) => argName !== 'hotSwap')
              ),
              droppedParsedArgs: deployContext.hotSwap === undefined ? [] : ['hotSwap']
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
  const runCli = dependencies.runCli || runStacktapeCommandJsonl;
  const requestDevApi = dependencies.requestDevApi || devApiRequest;
  const createId = dependencies.createId || randomUUID;
  const now = dependencies.now || (() => new Date());

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
            : 7331;
      const { cwd: requestedCwd, devSessionId: _ignoredSessionId, ...devCliArgs } = toolArgs;

      const result = await runCli({
        command: 'dev',
        args: {
          ...devCliArgs,
          agentPort: Number.isFinite(requestedPort) ? requestedPort : 7331
        },
        cwd: typeof requestedCwd === 'string' ? requestedCwd : undefined,
        timeoutMs: 12 * 60 * 1000,
        signal,
        tool: 'stacktape_dev',
        clientName,
        onProgress
      });

      let session: DevSession | undefined;
      if (result.ok) {
        const payload = (result.data?.result || result.data) as Record<string, unknown> | undefined;
        const port =
          (payload?.port as number | undefined) ||
          (payload?.agentPort as number | undefined) ||
          (Number.isFinite(requestedPort) ? requestedPort : 7331);
        session = {
          devSessionId: createId(),
          agentPort: port,
          startedAt: now().toISOString(),
          cwd: result.resolvedContext.currentWorkingDirectory || result.resolvedContext.cwd
        };
        activeDevSessions.set(session.devSessionId, session);
      }

      return toToolText({
        ok: result.ok,
        code: result.code,
        message: result.message,
        data: {
          ...(session ? { session } : {}),
          resolvedContext: result.resolvedContext,
          ...(result.data ? { cli: result.data } : {})
        },
        ...(result.rawTail ? { rawTail: result.rawTail } : {})
      });
    }

    const devSessionId = typeof toolArgs.devSessionId === 'string' ? toolArgs.devSessionId : undefined;
    const sessionResult = await ensureDevSessionAvailable({
      devSessionId,
      requireExplicit: action === 'rebuild' || action === 'rebuild_all' || action === 'stop',
      activeDevSessions,
      requestDevApi
    });
    if (sessionResult.ok === false) {
      return toToolText(sessionResult.output);
    }

    const port = sessionResult.session.agentPort;

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

      const cursor = typeof toolArgs.cursor === 'number' ? toolArgs.cursor : Number(toolArgs.cursor || 0);
      const limit = typeof toolArgs.limit === 'number' ? toolArgs.limit : Number(toolArgs.limit || 200);
      const page = await readDevLogs({
        logFile,
        cursor: Number.isFinite(cursor) ? cursor : 0,
        limit: Number.isFinite(limit) ? limit : 200
      });

      const requestedWorkload = typeof toolArgs.workload === 'string' ? toolArgs.workload.trim() : undefined;
      const filteredEntries = requestedWorkload
        ? page.entries.filter((entry) => {
            const source = (entry as Record<string, unknown>).source;
            return typeof source === 'string' && source === requestedWorkload;
          })
        : page.entries;

      return toToolText({
        ok: true,
        code: 'OK',
        message: requestedWorkload
          ? `Fetched ${filteredEntries.length} log entries for workload '${requestedWorkload}'.`
          : `Fetched ${filteredEntries.length} log entries.`,
        data: {
          session: sessionResult.session,
          logFile,
          entries: filteredEntries,
          nextCursor: page.nextCursor,
          totalLines: page.totalLines
        }
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
      return toToolText({
        ok: (response.ok as boolean | undefined) ?? false,
        code: ((response.ok as boolean | undefined) ?? false) ? 'OK' : 'INTERNAL_ERROR',
        message:
          ((response.ok as boolean | undefined) ?? false)
            ? `Rebuild requested for workload '${workload}'.`
            : 'Failed to request workload rebuild.',
        data: {
          session: sessionResult.session,
          response
        }
      });
    }

    if (action === 'rebuild_all') {
      const response = await requestDevApi({
        port,
        method: 'POST',
        path: '/rebuild/all',
        body: {}
      });
      return toToolText({
        ok: (response.ok as boolean | undefined) ?? false,
        code: ((response.ok as boolean | undefined) ?? false) ? 'OK' : 'INTERNAL_ERROR',
        message:
          ((response.ok as boolean | undefined) ?? false)
            ? 'Rebuild requested for all workloads.'
            : 'Failed to request rebuild for all workloads.',
        data: {
          session: sessionResult.session,
          response
        }
      });
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
        activeDevSessions.delete(sessionResult.session.devSessionId);
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
