import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { isMcpInvocation } from '@application-services/operation-invocation-context';
import { serialize } from '@utils/misc';
import { createCleanupHook } from './cleanup-utils';
import { terminateDevServerProcess } from './dev-server-process';
import { DEV_CONFIG } from './dev-config';
import { createFrameworkParser, detectFramework, stripAnsi, type FrameworkType } from './framework-parsers';
import { ensureNamedProxyRoute, removeNamedProxyRoute } from './named-proxy/manager';
import { injectFrameworkFlags } from './named-proxy/utils';
import { findOtherDevSessions } from './agent-daemon';
import { getAgentLogFilePath, type LogLevel } from './agent-logger';
import {
  createLogLineGrouper,
  isAccessLogLine,
  isFrontendServerFailure,
  isSuccessfulRequestLine
} from './log-grouping';
import { createEnvironmentMasker } from './agent-env-masking';
import {
  extractPortFromCommand,
  findAvailablePort,
  getDefaultPort,
  isPortAvailable,
  waitForTcpPort
} from './port-utils';

const { serveTimeoutMs: DEV_SERVER_SERVE_TIMEOUT_MS } = DEV_CONFIG.devServer;

type DevServerConfig = {
  command: string;
  workingDirectory?: string;
  /** Override auto-detected framework for parsing output */
  framework?: FrameworkType;
  /** Port to use (will be passed via PORT env var) */
  port?: number;
  /**
   * Injected variables handed to the dev-server process as real environment variables. A written
   * `.env.local` is not enough: mode-specific env files (Vite's `.env.<mode>`) outrank it, while
   * actual process environment outranks every file in all the supported frameworks.
   */
  environment?: Record<string, string>;
  /**
   * Variables of `environment` read from secrets. The server's output can quote them, so the errors made from its
   * output mask them, and every other value that the dev agent's `/env` masks, as container crash summaries do.
   */
  secretEnvNames?: ReadonlySet<string>;
  /**
   * Variables of this process that the dev server must not inherit: those of local databases and services the
   * frontend does not connect to. Dev mode sets them on its own process for hooks and other workloads.
   */
  withheldEnvNames?: string[];
};

export type DevServerState = {
  status: 'starting' | 'ready' | 'compiling' | 'error';
  url?: string;
  /** Backend listener behind the named proxy. */
  port?: number;
  lastCompileTime?: string;
  /** Why the server does not run: it failed to start or exited. */
  error?: string;
  /**
   * The last error the running server printed (a failed request, a failed compile), already in the log. The server
   * still serves; the next successful compile, code update or request clears it.
   */
  requestError?: string;
};

type DevServerCallbacks = {
  onStateChange?: (state: DevServerState) => void;
  /** One log entry: the lines of one message (a stack trace, a printed object) with the level its text shows. */
  onOutput?: (message: string, level: LogLevel) => void;
};

const runningDevServers: Map<string, ChildProcess> = new Map();
/** Servers dev mode stops itself (a restart, the end of the session), whose exit is no error. */
const stoppingDevServers = new WeakSet<ChildProcess>();

const overrideCommandPortArgs = (args: string[], port: number): string[] => {
  const output: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--port' || arg === '-p') {
      output.push(arg, String(port));
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        i++;
      }
      continue;
    }

    if (arg.startsWith('--port=')) {
      output.push(`--port=${port}`);
      continue;
    }

    if (arg.startsWith('-p=')) {
      output.push(`-p=${port}`);
      continue;
    }

    output.push(arg);
  }

  return output;
};

const injectPackageScriptFlags = ({
  commandWithArgs,
  port,
  framework
}: {
  commandWithArgs: string[];
  port: number;
  framework: FrameworkType;
}): void => {
  const [cmd, ...rest] = commandWithArgs;
  if (cmd !== 'bun' && cmd !== 'npm' && cmd !== 'pnpm' && cmd !== 'yarn') return;

  const isRunCommand = (cmd === 'bun' || cmd === 'npm' || cmd === 'pnpm') && rest.length >= 2 && rest[0] === 'run';
  const isYarnScriptCommand = cmd === 'yarn' && rest.length >= 1 && rest[0] !== 'run';
  if (!isRunCommand && !isYarnScriptCommand) return;

  if (commandWithArgs.includes('--port') || commandWithArgs.some((arg) => arg.startsWith('--port='))) return;

  const needsStrictPort = framework === 'vite' || framework === 'sveltekit' || framework === 'turbopack';
  const addHostFlag = framework !== 'next';

  if (cmd === 'yarn') {
    commandWithArgs.push('--port', String(port));
    if (addHostFlag) {
      commandWithArgs.push('--host', '127.0.0.1');
    }
    if (needsStrictPort) {
      commandWithArgs.push('--strictPort');
    }
    return;
  }

  commandWithArgs.push('--', '--port', String(port));
  if (addHostFlag) {
    commandWithArgs.push('--host', '127.0.0.1');
  }
  if (needsStrictPort) {
    commandWithArgs.push('--strictPort');
  }
};

/**
 * Formats the dev server state into a status message for display.
 */
export const formatDevServerStatus = (state: DevServerState): string => {
  switch (state.status) {
    case 'starting':
      return 'Starting...';
    case 'compiling':
      return 'Compiling...';
    case 'error':
      return `Error: ${state.error || 'Build failed'}`;
    case 'ready': {
      const parts: string[] = ['Ready'];
      if (state.lastCompileTime) {
        parts.push(`(${state.lastCompileTime})`);
      }
      if (state.url) {
        parts.push(`→ ${state.url}`);
      }
      return parts.join(' ');
    }
    default:
      return '';
  }
};

/** Stop a dev server and all package-manager/framework descendants. */
const stopDevServer = async (name: string): Promise<void> => {
  const proc = runningDevServers.get(name);
  if (!proc) return;
  stoppingDevServers.add(proc);
  await terminateDevServerProcess(proc);
  runningDevServers.delete(name);
  removeNamedProxyRoute(name);
};

export const startDevServer = async ({
  name,
  config,
  defaultWorkingDirectory,
  callbacks
}: {
  name: string;
  config: DevServerConfig;
  defaultWorkingDirectory?: string;
  callbacks?: DevServerCallbacks;
}): Promise<DevServerState> => {
  // Stop existing if running
  await stopDevServer(name);

  const workingDir = config.workingDirectory
    ? isAbsolute(config.workingDirectory)
      ? config.workingDirectory
      : join(globalStateManager.workingDir, config.workingDirectory)
    : defaultWorkingDirectory
      ? isAbsolute(defaultWorkingDirectory)
        ? defaultWorkingDirectory
        : join(globalStateManager.workingDir, defaultWorkingDirectory)
      : globalStateManager.workingDir;

  // Detect framework for parsing output
  const framework = config.framework || detectFramework(workingDir);

  // Parse command
  const commandParts = config.command.match(/(?:[^\s"]+|"[^"]*")+/g) || [config.command];
  const [command, ...args] = commandParts.map((part) => part.replace(/^"|"$/g, ''));

  // Determine port preference - from config, command, or framework default
  const commandPort = extractPortFromCommand(config.command);
  const preferredPort = config.port || commandPort || getDefaultPort(framework);
  const targetPort = (await findAvailablePort(preferredPort, 300)) || preferredPort;

  const ensureTargetPortAvailable = async (): Promise<boolean> => isPortAvailable(targetPort);

  // Build environment with PORT for frameworks that support it
  const env: Record<string, string> = {
    ...serialize(process.env),
    ...(config.environment || {}),
    FORCE_COLOR: '1'
  };
  for (const name of config.withheldEnvNames ?? []) {
    if (!config.environment || !(name in config.environment)) delete env[name];
  }

  env.PORT = String(targetPort);
  env.HOST = '127.0.0.1';

  /**
   * Errors quoted from the server's output go to the agent's status and MCP results. Output is masked as it arrives,
   * before an error trims it or picks lines from it, and the error again.
   */
  const maskOutput = createEnvironmentMasker(config.environment ?? {}, config.secretEnvNames);

  let currentState: DevServerState = { status: 'starting', port: targetPort };
  callbacks?.onStateChange?.(currentState);

  // A second `next dev` in the directory prints "Ready", serves for a second and then exits: refuse it before it starts
  // when another dev session of this project runs the same app.
  if (framework === 'next') {
    const holder = findOtherDevSessions().find(({ workloads }) => workloads?.includes(name));
    if (holder) {
      currentState = { status: 'error', error: describeNextDevServerHolder(holder, workingDir) };
      callbacks?.onStateChange?.(currentState);
      return currentState;
    }
  }

  const portReady = await ensureTargetPortAvailable();
  if (!portReady) {
    currentState = { status: 'error', error: `Port ${targetPort} is still in use` };
    callbacks?.onStateChange?.(currentState);
    return currentState;
  }

  let routedTargetPort = targetPort;
  let proxyRoute = await ensureNamedProxyRoute({ resourceName: name, targetPort: routedTargetPort });

  const spawnDevServer = (): Promise<DevServerState> => {
    return new Promise((resolve) => {
      // Parser keeps per-process accumulated state (URL/compileTime across lines)
      // so create a fresh one for each spawn/retry attempt.
      const parseOutput = createFrameworkParser(framework);

      const patchedArgs = overrideCommandPortArgs(args, targetPort);
      const commandWithArgs = [command, ...patchedArgs];
      injectFrameworkFlags(commandWithArgs, targetPort);
      injectPackageScriptFlags({ commandWithArgs, port: targetPort, framework });

      const [spawnCommandName, ...spawnArgs] = commandWithArgs;

      const proc = spawn(spawnCommandName, spawnArgs, {
        cwd: workingDir,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        // Keep terminal Ctrl+C from killing the shell before cleanup can discover its watchers.
        detached: process.platform !== 'win32',
        windowsHide: true
      });

      runningDevServers.set(name, proc);

      let resolved = false;
      const resolveOnce = (state: DevServerState) => {
        if (!resolved) {
          resolved = true;
          resolve(state);
        }
      };
      const setState = (state: DevServerState) => {
        currentState = state;
        callbacks?.onStateChange?.(currentState);
      };

      // A server is running once its port accepts connections, not when it prints "Ready": Next.js prints its URL
      // also when it refuses to start because another dev server runs in the directory.
      let serving = false;
      let exited = false;
      const recentLines: string[] = [];

      // A server error printed over many lines (a stack trace, a code frame) is one entry with its level, as for a
      // container; logged line by line at `info`, an agent filtering by level never saw a frontend's server fail.
      // A request that fails prints its cause first and then the access log line (` POST / 500 in 2536ms`); the line
      // alone says nothing about the cause, so it joins the cause printed just before it.
      let requestErrorAt = 0;
      const onEntry = (message: string, level: LogLevel) => {
        callbacks?.onOutput?.(message, level);
        if (!serving) return;
        if (level === 'error') {
          const lines = maskOutput(stripAnsi(message))
            .split('\n')
            .filter((line) => line.trim())
            .slice(0, SERVER_ERROR_LINES);
          const text = lines.join('\n').trimStart();
          const joinsCause =
            isAccessLogLine(text) &&
            currentState.requestError !== undefined &&
            !isAccessLogLine(currentState.requestError) &&
            Date.now() - requestErrorAt < REQUEST_CAUSE_WINDOW_MS;
          requestErrorAt = Date.now();
          setState({ ...currentState, requestError: joinsCause ? `${currentState.requestError}\n${text}` : text });
        } else if (isSuccessfulRequestLine(stripAnsi(message))) {
          clearRequestError();
        }
      };
      const clearRequestError = () => {
        if (currentState.requestError === undefined) return;
        setState({ ...currentState, requestError: undefined });
      };
      const outputGroupers = {
        stdout: createLogLineGrouper({ stream: 'stdout', onEntry }),
        stderr: createLogLineGrouper({
          stream: 'stderr',
          onEntry: (message, level) => {
            // A failed request the page's code logs is an error in the log, but the server itself still serves.
            if (level === 'warn' && isFrontendServerFailure(message)) {
              callbacks?.onOutput?.(message, 'error');
              return;
            }
            onEntry(message, level);
          }
        })
      };

      const processLine = (line: string) => {
        recentLines.push(maskOutput(stripAnsi(line)).trimEnd());
        if (recentLines.length > RECENT_OUTPUT_LINES) recentLines.shift();

        // Use framework-aware parser
        const parsed = parseOutput(line);
        // A compile or code update after a server error: the next request runs the new code.
        if (serving && (parsed.status === 'ready' || parsed.hmrUpdate)) clearRequestError();

        // Build new state from parsed output
        const newState = { ...currentState };
        if (parsed.status && (serving || parsed.status !== 'ready')) {
          newState.status = parsed.status;
        }
        if (parsed.url) newState.url = serving ? proxyRoute.url : parsed.url;
        if (parsed.port) newState.port = parsed.port;
        if (parsed.port && parsed.port !== routedTargetPort) {
          routedTargetPort = parsed.port;
          ensureNamedProxyRoute({ resourceName: name, targetPort: routedTargetPort })
            .then((updatedRoute) => {
              proxyRoute = updatedRoute;
            })
            .catch(() => {
              // Best effort - keep existing route
            });
        }
        if (parsed.compileTime) {
          newState.lastCompileTime = parsed.compileTime;
        }

        const stateChanged =
          newState.status !== currentState.status ||
          newState.url !== currentState.url ||
          newState.lastCompileTime !== currentState.lastCompileTime;

        if (!stateChanged) return;
        if (newState.status === 'ready') newState.url = proxyRoute.url;
        if (serving) setState(newState);
        // Before it serves, the URL and compile time wait in the state until the port accepts connections.
        else currentState = newState;
      };

      for (const stream of ['stdout', 'stderr'] as const) {
        proc[stream]?.on('data', (data) => {
          for (const line of data.toString().split('\n').filter(Boolean)) {
            outputGroupers[stream].push(line);
            processLine(line);
          }
        });
      }

      proc.on('error', (err) => {
        exited = true;
        setState({ status: 'error', error: err.message });
        runningDevServers.delete(name);
        removeNamedProxyRoute(name);
        resolveOnce(currentState);
      });

      proc.on('exit', (code, signal) => {
        exited = true;
        outputGroupers.stdout.flush();
        outputGroupers.stderr.flush();
        const stoppedByDevMode = stoppingDevServers.has(proc);
        if (runningDevServers.get(name) === proc) runningDevServers.delete(name);
        removeNamedProxyRoute(name);
        // Any exit dev mode did not cause is an error, also after the server was ready: nothing serves its URL then.
        if (!stoppedByDevMode) {
          setState({
            status: 'error',
            port: currentState.port,
            error: maskOutput(
              describeDevServerExit({
                code,
                signal,
                serving,
                lines: recentLines,
                framework,
                workingDir,
                logFile: getAgentLogFilePath() ?? undefined
              })
            )
          });
        }
        resolveOnce(currentState);
      });

      const waitUntilServing = (timeoutMs: number) =>
        waitForTcpPort({ port: () => routedTargetPort, timeoutMs, shouldStop: () => exited });
      const markServing = () => {
        serving = true;
        setState({ ...currentState, status: 'ready', port: routedTargetPort, url: proxyRoute.url, error: undefined });
        resolveOnce(currentState);
      };
      void waitUntilServing(DEV_SERVER_SERVE_TIMEOUT_MS).then((result) => {
        if (result === 'ready') return markServing();
        if (result !== 'timeout') return;
        setState({
          ...currentState,
          status: 'error',
          error: `The dev server runs, but nothing accepted connections on port ${routedTargetPort} within ${
            DEV_SERVER_SERVE_TIMEOUT_MS / 1000
          } s. Dev mode keeps checking and marks it running once it serves.`
        });
        resolveOnce(currentState);
        void waitUntilServing(Number.POSITIVE_INFINITY).then((late) => late === 'ready' && markServing());
      });
    });
  };

  return spawnDevServer();
};

/** Enough output to keep a package manager's error above the stack trace it prints after it. */
const RECENT_OUTPUT_LINES = 200;
/** Lines of a server error entry that the workload's error quotes; the whole entry is in the log. */
const SERVER_ERROR_LINES = 3;
/** How soon after its cause a failed request's access log line arrives; Next.js printed both within 1 ms. */
const REQUEST_CAUSE_WINDOW_MS = 2000;
/** Lines of a dev server's last output that its error quotes. */
const EXIT_REASON_LINES = 8;
/** Stack frames quoted below the error line they belong to. */
const EXIT_REASON_FRAMES = 2;

const STACK_FRAME = /^\s*at\s/;
/**
 * An error a package manager prints with its code: pnpm `ERR_PNPM_*`, npm `npm error code` (`npm ERR! code` before
 * npm 9) and Yarn Berry's `YN0001`-style lines that report an error. It names the cause, and the lines after it usually
 * say how to fix it, such as pnpm's "Run pnpm approve-builds".
 */
const PACKAGE_MANAGER_ERROR = /\bERR_PNPM_[A-Z0-9_]+|^npm (?:error|ERR!) code\b|\bYN\d{4}:.*\b(?:error|failed)\b/i;

/**
 * The lines of a dev server's last output that explain its exit. A package manager's error code and the instruction
 * after it come first: its stack trace follows them and pushed them out of a plain tail. Otherwise the last error line
 * stays above at most a few of the stack frames that follow it.
 */
export const selectDevServerExitOutput = (lines: string[]): string[] => {
  const output = lines.map((line) => line.trimEnd()).filter((line) => line.trim());
  const errorIndex = output.findLastIndex((line) => PACKAGE_MANAGER_ERROR.test(line));
  if (errorIndex !== -1) {
    const block = [output[errorIndex]];
    for (const line of output.slice(errorIndex + 1)) {
      if (STACK_FRAME.test(line) || block.length === EXIT_REASON_LINES) break;
      block.push(line);
    }
    return block;
  }
  const tail = output.slice(-EXIT_REASON_LINES * 4);
  const selected: string[] = [];
  let frames = 0;
  for (const line of tail) {
    if (!STACK_FRAME.test(line)) {
      frames = 0;
      selected.push(line);
    } else if (frames++ < EXIT_REASON_FRAMES) {
      selected.push(line);
    }
  }
  return selected.slice(-EXIT_REASON_LINES);
};

/**
 * Why a dev server exited, from its last output. Next.js 16 runs one dev server per app directory: when another dev
 * session of this project runs it there, the error names that session.
 */
type OtherDevSession = { stage: string; port: number; pid: number; workloads?: string[]; sessionId?: string };

/**
 * Next.js runs one dev server per app directory (16 holds a lock, older versions share `.next`). Called through MCP, the
 * way to stop the holder is the `stacktape_dev` tool, not the CLI.
 */
const describeNextDevServerHolder = (
  other: OtherDevSession | undefined,
  workingDir: string,
  mcp = isMcpInvocation()
) => {
  const holder = other
    ? `the dev session of stage ${other.stage} (${other.port ? `agent port ${other.port}, ` : ''}process ${other.pid}) runs it`
    : 'another process runs it';
  const stop =
    mcp && other?.sessionId
      ? `Stop that session (stacktape_dev with action=stop and args.devSessionId=${other.sessionId})`
      : other?.port
        ? `Stop that session (\`stacktape dev stop --agent-port ${other.port}\`)`
        : `Stop ${other ? 'that session' : 'the other one'}`;
  return `Next.js runs one dev server per app directory, and ${holder} in ${workingDir}. ${stop}, or run this stage from another Git worktree.`;
};

/**
 * Why a dev server exited, from its last output. When Next.js refuses to start because another dev server runs in its
 * directory, the error names the dev session of this project that runs it.
 */
export const describeDevServerExit = ({
  code,
  signal,
  serving,
  lines,
  framework,
  workingDir,
  logFile,
  findOtherSessions = findOtherDevSessions
}: {
  code: number | null;
  signal: NodeJS.Signals | null;
  serving: boolean;
  lines: string[];
  framework: FrameworkType;
  workingDir: string;
  /** The log the dev server's whole output went to. */
  logFile?: string;
  findOtherSessions?: () => OtherDevSession[];
}): string => {
  const how = signal ? `was stopped by ${signal}` : `exited with code ${code}`;
  const when = serving ? ' after it was ready' : '';
  if (framework === 'next' && lines.some((line) => /another next dev server is already running/i.test(line))) {
    return describeNextDevServerHolder(findOtherSessions()[0], workingDir);
  }
  const output = selectDevServerExitOutput(lines);
  const logs = logFile ? `\nIts whole output is in ${logFile}.` : '';
  return `The dev server ${how}${when}.${output.length ? ` Its output:\n${output.join('\n')}` : ''}${logs}`;
};

/**
 * Register cleanup hook for dev servers.
 * Must be called explicitly when dev command starts.
 */
export const registerDevServerCleanupHook = createCleanupHook('dev-server', async () => {
  await Promise.all([...runningDevServers.keys()].map((name) => stopDevServer(name)));
});
