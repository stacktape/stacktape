import type { ChildProcess } from 'node:child_process';
import { execSync, spawn } from 'node:child_process';
import { isAbsolute, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { serialize } from '@shared/utils/misc';
import { createCleanupHook } from './cleanup-utils';
import { DEV_CONFIG } from './dev-config';
import { createFrameworkParser, detectFramework, type FrameworkType } from './framework-parsers';
import {
  extractPortFromCommand,
  getDefaultPort,
  isPortAvailable,
  killProcessOnPort,
  parsePortFromError
} from './port-utils';

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
  if (proc && !proc.killed) {
    const pid = proc.pid;

    // Try graceful shutdown first
    proc.kill('SIGTERM');

    // Wait a bit for graceful shutdown
    await new Promise((resolve) => setTimeout(resolve, 100));

    // If still running, force kill the process tree
    if (pid && !proc.killed) {
      try {
        if (process.platform === 'win32') {
          // Windows: kill process tree (execSync already imported at top of file)
          execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
        } else {
          // Unix: kill process group
          process.kill(-pid, 'SIGKILL');
        }
      } catch {
        // Process might already be dead
      }
    }

    runningDevServers.delete(name);
    runningDevServerFrameworks.delete(name);
  }
};

/**
 * Synchronous version for cleanup hooks where async isn't ideal.
 */
export const stopDevServerSync = (name: string): void => {
  const proc = runningDevServers.get(name);
  if (proc && !proc.killed) {
    const pid = proc.pid;
    proc.kill('SIGTERM');

    // Force kill if needed
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
  }
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

  // Create stateful parser for this framework
  const parseOutput = createFrameworkParser(framework);

  // Parse command
  const commandParts = config.command.match(/(?:[^\s"]+|"[^"]*")+/g) || [config.command];
  const [command, ...args] = commandParts.map((part) => part.replace(/^"|"$/g, ''));

  // Determine port - from config, command, or framework default
  const commandPort = extractPortFromCommand(config.command);
  const targetPort = config.port || commandPort || getDefaultPort(framework);

  const ensureTargetPortAvailable = async (): Promise<boolean> => {
    if (await isPortAvailable(targetPort)) return true;

    await killProcessOnPort(targetPort);

    const startTime = Date.now();
    while (Date.now() - startTime < 5000) {
      if (await isPortAvailable(targetPort)) return true;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return false;
  };

  // Build environment with PORT for frameworks that support it
  const env: Record<string, string> = {
    ...serialize(process.env),
    FORCE_COLOR: '1'
  };

  // Set PORT env var (most frameworks respect this)
  // Only set if not already specified in command to avoid conflicts
  if (!commandPort) {
    env.PORT = String(targetPort);
  }

  let currentState: DevServerState = { status: 'starting' };
  callbacks?.onStateChange?.(currentState);

  const portReady = await ensureTargetPortAvailable();
  if (!portReady) {
    currentState = { status: 'error', error: `Port ${targetPort} is still in use` };
    callbacks?.onStateChange?.(currentState);
    return currentState;
  }

  // Track if we've already retried after port conflict
  let portConflictRetried = false;
  // Buffer to collect error output for EADDRINUSE detection
  let errorBuffer = '';

  const spawnDevServer = (): Promise<DevServerState> => {
    return new Promise((resolve) => {
      const proc = spawn(command, args, {
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

        // Collect error output for EADDRINUSE detection
        errorBuffer += `${line}\n`;

        // Use framework-aware parser
        const parsed = parseOutput(line);

        // Build new state from parsed output
        const newState = { ...currentState };
        if (parsed.status) {
          newState.status = parsed.status;
        }
        if (parsed.url) {
          newState.url = parsed.url;
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
        resolveOnce(currentState);
      });

      proc.on('exit', (code) => {
        if (code !== 0 && code !== null && currentState.status !== 'ready') {
          currentState = { status: 'error', error: `Process exited with code ${code}` };
          callbacks?.onStateChange?.(currentState);
        }
        runningDevServers.delete(name);
        runningDevServerFrameworks.delete(name);
        resolveOnce(currentState);
      });

      // Resolve after timeout if no ready signal detected (server might be silent)
      setTimeout(() => {
        if (!resolved) {
          // If we got a URL but no ready signal, consider it ready
          if (currentState.url) {
            currentState = { ...currentState, status: 'ready' };
            callbacks?.onStateChange?.(currentState);
          }
          resolveOnce(currentState);
        }
      }, DEV_SERVER_READY_TIMEOUT_MS);
    });
  };

  // First attempt
  let result = await spawnDevServer();

  // Check for EADDRINUSE error and retry after killing the port holder
  if (result.status === 'error' && !portConflictRetried) {
    const conflictPort = parsePortFromError(errorBuffer);
    if (conflictPort) {
      portConflictRetried = true;

      // Try to kill the process using the port
      const killed = await killProcessOnPort(conflictPort);
      if (killed) {
        // Wait for port to be released
        await new Promise((r) => setTimeout(r, 500));

        // Reset state and retry
        currentState = { status: 'starting' };
        callbacks?.onStateChange?.(currentState);
        errorBuffer = '';

        result = await spawnDevServer();
      }
    }
  }

  return result;
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
