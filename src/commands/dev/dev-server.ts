import { spawn, type ChildProcess } from 'node:child_process';
import { join, isAbsolute } from 'node:path';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { serialize } from '@shared/utils/misc';

type DevServerConfig = {
  command: string;
  workingDirectory?: string;
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

/**
 * Strips ANSI escape codes from a string.
 */
const stripAnsi = (str: string): string => {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
};

/**
 * Parses dev server output to extract state information.
 * Supports Vite, Next.js, Webpack, and other common dev servers.
 */
const parseDevServerOutput = (line: string, currentState: DevServerState): DevServerState => {
  const cleanLine = stripAnsi(line).toLowerCase();

  // Ready/started patterns
  if (
    cleanLine.includes('ready in') ||
    cleanLine.includes('compiled successfully') ||
    cleanLine.includes('compiled client and server') ||
    cleanLine.includes('server started') ||
    cleanLine.includes('listening on') ||
    cleanLine.includes('local:') ||
    cleanLine.includes('started server on')
  ) {
    const state: DevServerState = { ...currentState, status: 'ready' };

    // Extract compile time
    const timeMatch =
      line.match(/ready in\s*([\d.]+)\s*(ms|s)/i) ||
      line.match(/compiled.*in\s*([\d.]+)\s*(ms|s)/i) ||
      line.match(/in\s*([\d.]+)\s*(ms|s)/i);
    if (timeMatch) {
      const time = parseFloat(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();
      state.lastCompileTime = unit === 's' ? `${time}s` : `${time}ms`;
    }

    // Extract URL
    const urlMatch =
      line.match(/https?:\/\/[^\s]+/i) || line.match(/localhost:\d+/i) || line.match(/127\.0\.0\.1:\d+/i);
    if (urlMatch) {
      let url = urlMatch[0];
      if (!url.startsWith('http')) {
        url = `http://${url}`;
      }
      state.url = url;
    }

    return state;
  }

  // Compiling patterns
  if (
    cleanLine.includes('compiling') ||
    cleanLine.includes('building') ||
    cleanLine.includes('bundling') ||
    cleanLine.includes('rebuilding') ||
    cleanLine.includes('hmr update')
  ) {
    return { ...currentState, status: 'compiling' };
  }

  // Error patterns
  if (cleanLine.includes('error') || cleanLine.includes('failed to compile') || cleanLine.includes('build failed')) {
    return { ...currentState, status: 'error', error: stripAnsi(line) };
  }

  return currentState;
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

export const stopDevServer = (name: string): void => {
  const proc = runningDevServers.get(name);
  if (proc && !proc.killed) {
    proc.kill('SIGTERM');
    runningDevServers.delete(name);
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
  stopDevServer(name);

  const workingDir = config.workingDirectory
    ? isAbsolute(config.workingDirectory)
      ? config.workingDirectory
      : join(globalStateManager.workingDir, config.workingDirectory)
    : defaultWorkingDirectory
      ? isAbsolute(defaultWorkingDirectory)
        ? defaultWorkingDirectory
        : join(globalStateManager.workingDir, defaultWorkingDirectory)
      : globalStateManager.workingDir;

  // Parse command
  const commandParts = config.command.match(/(?:[^\s"]+|"[^"]*")+/g) || [config.command];
  const [command, ...args] = commandParts.map((part) => part.replace(/^"|"$/g, ''));

  let currentState: DevServerState = { status: 'starting' };
  callbacks?.onStateChange?.(currentState);

  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd: workingDir,
      env: { ...serialize(process.env), FORCE_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    runningDevServers.set(name, proc);

    let resolved = false;
    const resolveOnce = (state: DevServerState) => {
      if (!resolved) {
        resolved = true;
        resolve(state);
      }
    };

    const processLine = (line: string) => {
      callbacks?.onOutput?.(line);

      const newState = parseDevServerOutput(line, currentState);
      if (newState.status !== currentState.status || newState.url !== currentState.url) {
        currentState = newState;
        callbacks?.onStateChange?.(currentState);

        // Resolve when ready
        if (currentState.status === 'ready') {
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
      resolveOnce(currentState);
    });

    proc.on('exit', (code) => {
      if (code !== 0 && code !== null && currentState.status !== 'ready') {
        currentState = { status: 'error', error: `Process exited with code ${code}` };
        callbacks?.onStateChange?.(currentState);
      }
      runningDevServers.delete(name);
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
    }, 10000);
  });
};

export const isDevServerRunning = (name: string): boolean => {
  const proc = runningDevServers.get(name);
  return proc !== undefined && !proc.killed;
};

// Cleanup on exit
applicationManager.registerCleanUpHook(async () => {
  for (const [name] of runningDevServers) {
    stopDevServer(name);
  }
});
