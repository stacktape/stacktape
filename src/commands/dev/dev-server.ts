import type { ChildProcess } from 'node:child_process';
import { execSync, spawn } from 'node:child_process';
import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { serialize } from '@shared/utils/misc';
import { createCleanupHook } from './cleanup-utils';
import { DEV_CONFIG } from './dev-config';
import { createFrameworkParser, detectFramework, type FrameworkType } from './framework-parsers';
import { ensureNamedProxyRoute, removeNamedProxyRoute } from './named-proxy/manager';
import { injectFrameworkFlags } from './named-proxy/utils';
import { extractPortFromCommand, findAvailablePort, getDefaultPort, isPortAvailable } from './port-utils';

const { readyTimeoutMs: DEV_SERVER_READY_TIMEOUT_MS, readyDelayMs: DEV_SERVER_READY_DELAY_MS } = DEV_CONFIG.devServer;

// Re-export for convenience
export { detectFramework, type FrameworkType };

type DevServerConfig = {
  command: string;
  workingDirectory?: string;
  /** Override auto-detected framework for parsing output */
  framework?: FrameworkType;
  /** Port to use (will be passed via PORT env var) */
  port?: number;
};

export type DevServerState = {
  status: 'starting' | 'ready' | 'compiling' | 'error';
  url?: string;
  lastCompileTime?: string;
  error?: string;
};

type DevServerCallbacks = {
  onStateChange?: (state: DevServerState) => void;
  onOutput?: (line: string) => void;
};

const runningDevServers: Map<string, ChildProcess> = new Map();
const runningDevServerFrameworks: Map<string, FrameworkType> = new Map();

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

const waitForProcessExit = async (proc: ChildProcess, timeoutMs: number): Promise<boolean> => {
  if (proc.exitCode !== null || proc.signalCode !== null) {
    return true;
  }

  return new Promise<boolean>((resolve) => {
    let done = false;
    const finish = (exited: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      proc.removeListener('exit', onExit);
      resolve(exited);
    };
    const onExit = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);

    proc.once('exit', onExit);
  });
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

/**
 * Stop a dev server by name.
 * Kills the process and its children, with fallback to force kill.
 */
export const stopDevServer = async (name: string): Promise<void> => {
  const proc = runningDevServers.get(name);
  if (!proc) {
    return;
  }

  const pid = proc.pid;

  // Try graceful shutdown first
  try {
    proc.kill('SIGTERM');
  } catch {
    // Process may already be dead
  }

  const exitedGracefully = await waitForProcessExit(proc, 1200);

  // If still running, force kill the process tree
  if (!exitedGracefully && pid) {
    try {
      if (process.platform === 'win32') {
        // Windows: kill process tree
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      } else {
        // Unix: kill process group
        process.kill(-pid, 'SIGKILL');
      }
    } catch {
      // Process might already be dead
    }

    await waitForProcessExit(proc, 1200);
  }

  runningDevServers.delete(name);
  runningDevServerFrameworks.delete(name);
  removeNamedProxyRoute(name);
};

/**
 * Synchronous version for cleanup hooks where async isn't ideal.
 */
export const stopDevServerSync = (name: string): void => {
  const proc = runningDevServers.get(name);
  if (!proc) {
    return;
  }

  const pid = proc.pid;
  try {
    proc.kill('SIGTERM');
  } catch {
    // Process may already be dead
  }

  // Cleanup hook should be deterministic - always hard kill tree when we can.
  if (pid) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      } else {
        process.kill(-pid, 'SIGKILL');
      }
    } catch {
      // Process might already be dead
    }
  }

  runningDevServers.delete(name);
  runningDevServerFrameworks.delete(name);
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
  runningDevServerFrameworks.set(name, framework);

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
    FORCE_COLOR: '1'
  };

  env.PORT = String(targetPort);
  env.HOST = '127.0.0.1';

  let currentState: DevServerState = { status: 'starting' };
  callbacks?.onStateChange?.(currentState);

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

      let readyTimeout: ReturnType<typeof setTimeout> | null = null;

      const processLine = (line: string) => {
        callbacks?.onOutput?.(line);

        // Use framework-aware parser
        const parsed = parseOutput(line);

        // Build new state from parsed output
        const newState = { ...currentState };
        if (parsed.status) {
          newState.status = parsed.status;
        }
        if (parsed.url) newState.url = parsed.url;
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
        if (parsed.error) {
          newState.error = parsed.error;
        }

        const stateChanged =
          newState.status !== currentState.status ||
          newState.url !== currentState.url ||
          newState.lastCompileTime !== currentState.lastCompileTime;

        if (stateChanged) {
          if (newState.status === 'ready') {
            newState.url = proxyRoute.url;
          }

          currentState = newState;
          callbacks?.onStateChange?.(currentState);

          // When ready, start a timer to allow additional info (URL, compile time) to arrive
          if (currentState.status === 'ready' && !readyTimeout) {
            readyTimeout = setTimeout(() => {
              resolveOnce(currentState);
            }, DEV_SERVER_READY_DELAY_MS);
          }

          // If we have ready + URL + compile time, resolve immediately
          if (currentState.status === 'ready' && currentState.url && currentState.lastCompileTime) {
            if (readyTimeout) {
              clearTimeout(readyTimeout);
              readyTimeout = null;
            }
            resolveOnce(currentState);
          }
        }
      };

      proc.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n').filter(Boolean);
        lines.forEach(processLine);
      });

      proc.stderr?.on('data', (data) => {
        const lines = data.toString().split('\n').filter(Boolean);
        lines.forEach(processLine);
      });

      proc.on('error', (err) => {
        currentState = { status: 'error', error: err.message };
        callbacks?.onStateChange?.(currentState);
        runningDevServers.delete(name);
        runningDevServerFrameworks.delete(name);
        removeNamedProxyRoute(name);
        resolveOnce(currentState);
      });

      proc.on('exit', (code) => {
        if (code !== 0 && code !== null && currentState.status !== 'ready') {
          currentState = { status: 'error', error: `Process exited with code ${code}` };
          callbacks?.onStateChange?.(currentState);
        }
        runningDevServers.delete(name);
        runningDevServerFrameworks.delete(name);
        removeNamedProxyRoute(name);
        resolveOnce(currentState);
      });

      // Resolve after timeout if no ready signal detected (server might be silent)
      setTimeout(() => {
        if (!resolved) {
          // If we got a URL but no ready signal, consider it ready
          if (currentState.url) {
            currentState = { ...currentState, status: 'ready' };
            currentState.url = proxyRoute.url;
            callbacks?.onStateChange?.(currentState);
          }
          resolveOnce(currentState);
        }
      }, DEV_SERVER_READY_TIMEOUT_MS);
    });
  };

  return spawnDevServer();
};

/** Get the detected framework for a running dev server */
export const getDevServerFramework = (name: string): FrameworkType | undefined => {
  return runningDevServerFrameworks.get(name);
};

export const isDevServerRunning = (name: string): boolean => {
  const proc = runningDevServers.get(name);
  return proc !== undefined && !proc.killed;
};

/**
 * Register cleanup hook for dev servers.
 * Must be called explicitly when dev command starts.
 */
export const registerDevServerCleanupHook = createCleanupHook('dev-server', async () => {
  for (const [name] of runningDevServers) {
    stopDevServerSync(name);
  }
});
