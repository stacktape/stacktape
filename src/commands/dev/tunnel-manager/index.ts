import { spawn, type ChildProcess } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { applicationManager } from '@application-services/application-manager';
import { tuiManager } from '@application-services/tui-manager';
import { fsPaths } from '@shared/naming/fs-paths';
import { createCleanupHook } from '../cleanup-utils';
import { DEV_CONFIG } from '../dev-config';

const {
  server: BORE_SERVER,
  startupTimeoutMs: TUNNEL_STARTUP_TIMEOUT_MS,
  retryAttempts: TUNNEL_RETRY_ATTEMPTS,
  retryDelayMs: TUNNEL_RETRY_DELAY_MS,
  reconnectAttempts: TUNNEL_RECONNECT_ATTEMPTS = 3,
  reconnectDelayMs: TUNNEL_RECONNECT_DELAY_MS = 5000
} = DEV_CONFIG.tunnels;

export type TunnelInfo = {
  resourceName: string;
  localPort: number;
  publicHost: string;
  publicPort: number;
  process: ChildProcess;
};

const activeTunnels: TunnelInfo[] = [];
/** Track tunnels that are being reconnected to prevent duplicate attempts */
const reconnectingTunnels = new Set<string>();
/** Callback to notify when a tunnel reconnects (for Lambda env var updates) */
let onTunnelReconnect: ((tunnel: TunnelInfo) => void) | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const verifyBoreBinaryExists = async (): Promise<string> => {
  const borePath = fsPaths.borePath();
  try {
    await stat(borePath);
    return borePath;
  } catch {
    throw new Error(
      `Bore tunnel binary not found at ${borePath}. This is required for Lambda tunneling. ` +
        `Please ensure the Stacktape installation is complete.`
    );
  }
};

const startTunnelAttempt = async (borePath: string, resourceName: string, localPort: number): Promise<TunnelInfo> => {
  return new Promise((resolve, reject) => {
    const boreProcess = spawn(borePath, ['local', String(localPort), '--to', BORE_SERVER], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    let resolved = false;
    let outputBuffer = '';

    const cleanup = () => {
      boreProcess.stdout?.removeAllListeners();
      boreProcess.stderr?.removeAllListeners();
      boreProcess.removeAllListeners();
    };

    const handleOutput = (data: Buffer) => {
      const text = data.toString();
      outputBuffer += text;

      // bore outputs: "listening at bore.pub:XXXXX"
      const match = outputBuffer.match(/listening at ([^:]+):(\d+)/);
      if (match && !resolved) {
        resolved = true;
        cleanup();
        const tunnelInfo: TunnelInfo = {
          resourceName,
          localPort,
          publicHost: match[1],
          publicPort: parseInt(match[2], 10),
          process: boreProcess
        };
        resolve(tunnelInfo);
      }

      // Check for common error patterns
      if (outputBuffer.includes('Connection refused') || outputBuffer.includes('error')) {
        if (!resolved) {
          resolved = true;
          cleanup();
          boreProcess.kill();
          reject(new Error(`Tunnel connection failed: ${outputBuffer.trim()}`));
        }
      }
    };

    boreProcess.stdout?.on('data', handleOutput);
    boreProcess.stderr?.on('data', handleOutput);

    boreProcess.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error(`Failed to start bore process: ${err.message}`));
      }
    });

    boreProcess.on('exit', (code, signal) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        const reason = signal ? `killed by signal ${signal}` : `exited with code ${code}`;
        reject(new Error(`Bore ${reason} before tunnel was established. Output: ${outputBuffer.trim() || 'none'}`));
      }
      // Note: Removal from activeTunnels and reconnection is handled by setupTunnelExitHandler
    });

    // Timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        boreProcess.kill();
        reject(
          new Error(
            `Tunnel startup timed out after ${TUNNEL_STARTUP_TIMEOUT_MS / 1000}s for ${resourceName}. ` +
              `This may indicate bore.pub is unavailable or your network is blocking the connection. ` +
              `Output: ${outputBuffer.trim() || 'none'}`
          )
        );
      }
    }, TUNNEL_STARTUP_TIMEOUT_MS);
  });
};

/**
 * Attempt to reconnect a tunnel that died unexpectedly.
 * Uses exponential backoff and limited retries.
 */
const attemptReconnect = async (resourceName: string, localPort: number): Promise<void> => {
  if (reconnectingTunnels.has(resourceName)) {
    return; // Already reconnecting
  }

  reconnectingTunnels.add(resourceName);

  try {
    const borePath = await verifyBoreBinaryExists();

    for (let attempt = 1; attempt <= TUNNEL_RECONNECT_ATTEMPTS; attempt++) {
      // Check if we're shutting down
      if (applicationManager.isInterrupted) {
        return;
      }

      tuiManager.info(`Reconnecting tunnel for ${resourceName} (attempt ${attempt}/${TUNNEL_RECONNECT_ATTEMPTS})...`);

      try {
        const tunnel = await startTunnelAttempt(borePath, resourceName, localPort);
        activeTunnels.push(tunnel);

        // Setup exit handler for reconnection
        setupTunnelExitHandler(tunnel);

        tuiManager.success(`Tunnel for ${resourceName} reconnected at ${tunnel.publicHost}:${tunnel.publicPort}`);

        // Notify callback if registered (for Lambda env var updates)
        if (onTunnelReconnect) {
          onTunnelReconnect(tunnel);
        }

        return;
      } catch {
        if (attempt < TUNNEL_RECONNECT_ATTEMPTS) {
          const delay = TUNNEL_RECONNECT_DELAY_MS * attempt; // Exponential backoff
          tuiManager.warn(
            `Tunnel reconnection attempt ${attempt} failed for ${resourceName}, retrying in ${delay / 1000}s...`
          );
          await sleep(delay);
        }
      }
    }

    tuiManager.warn(
      `Failed to reconnect tunnel for ${resourceName} after ${TUNNEL_RECONNECT_ATTEMPTS} attempts. ` +
        `Lambda functions will lose connectivity to local ${resourceName}. ` +
        `Restart dev mode to restore connectivity.`
    );
  } finally {
    reconnectingTunnels.delete(resourceName);
  }
};

/**
 * Setup exit handler for a tunnel that triggers auto-reconnection.
 */
const setupTunnelExitHandler = (tunnel: TunnelInfo): void => {
  tunnel.process.on('exit', (code, signal) => {
    // Remove from active tunnels
    const index = activeTunnels.findIndex((t) => t.resourceName === tunnel.resourceName);
    if (index !== -1) {
      activeTunnels.splice(index, 1);
    }

    // Only attempt reconnect for unexpected exits (not manual stops or shutdown)
    if (code !== 0 && code !== null && !applicationManager.isInterrupted) {
      tuiManager.warn(
        `Tunnel for ${tunnel.resourceName} died unexpectedly (code: ${code}, signal: ${signal}). Attempting reconnect...`
      );
      // Fire and forget - reconnection happens in background
      attemptReconnect(tunnel.resourceName, tunnel.localPort).catch(() => {
        // Errors already logged in attemptReconnect
      });
    }
  });
};

export const startTunnel = async (resourceName: string, localPort: number): Promise<TunnelInfo> => {
  const borePath = await verifyBoreBinaryExists();

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= TUNNEL_RETRY_ATTEMPTS; attempt++) {
    try {
      const tunnel = await startTunnelAttempt(borePath, resourceName, localPort);
      activeTunnels.push(tunnel);

      // Setup exit handler with auto-reconnection
      setupTunnelExitHandler(tunnel);

      return tunnel;
    } catch (err) {
      lastError = err;
      if (attempt < TUNNEL_RETRY_ATTEMPTS) {
        tuiManager.warn(
          `Tunnel attempt ${attempt} failed for ${resourceName}, retrying in ${TUNNEL_RETRY_DELAY_MS / 1000}s...`
        );
        await sleep(TUNNEL_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError || new Error(`Failed to start tunnel for ${resourceName} after ${TUNNEL_RETRY_ATTEMPTS} attempts`);
};

/**
 * Set a callback to be called when a tunnel reconnects.
 * This is used to update Lambda env vars with the new tunnel URL.
 */
export const setTunnelReconnectCallback = (callback: ((tunnel: TunnelInfo) => void) | null): void => {
  onTunnelReconnect = callback;
};

export const stopTunnel = (resourceName: string): boolean => {
  const index = activeTunnels.findIndex((t) => t.resourceName === resourceName);
  if (index === -1) return false;

  const tunnel = activeTunnels[index];
  try {
    tunnel.process.kill();
  } catch {
    // Process may have already exited
  }
  activeTunnels.splice(index, 1);
  return true;
};

export const stopAllTunnels = async (): Promise<void> => {
  const tunnelsToStop = [...activeTunnels];
  for (const tunnel of tunnelsToStop) {
    try {
      tunnel.process.kill();
    } catch {
      // Process may have already exited
    }
  }
  activeTunnels.length = 0;
};

export const getActiveTunnels = (): TunnelInfo[] => {
  return [...activeTunnels];
};

export const getTunnelUrl = (tunnel: TunnelInfo): string => {
  return `${tunnel.publicHost}:${tunnel.publicPort}`;
};

export const isTunnelAlive = (tunnel: TunnelInfo): boolean => {
  return tunnel.process.exitCode === null && !tunnel.process.killed;
};

/**
 * Register cleanup hook for tunnels.
 * Must be called explicitly when dev command starts.
 */
export const registerTunnelCleanupHook = createCleanupHook('tunnels', async () => {
  if (activeTunnels.length > 0) {
    tuiManager.info('Stopping tunnels...');
    await stopAllTunnels();
    tuiManager.success('Tunnels stopped');
  }
});
