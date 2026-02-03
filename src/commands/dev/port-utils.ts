/**
 * Port management utilities for dev servers.
 * Handles port conflicts, process cleanup, and port allocation.
 */

import { exec } from 'node:child_process';
import { createServer } from 'node:net';
import { DEV_CONFIG } from './dev-config';

/** Cache for port availability checks to avoid repeated socket operations */
type PortCacheEntry = { available: boolean; timestamp: number };
const portAvailabilityCache = new Map<number, PortCacheEntry>();

/** How long to cache port availability results (ms) */
const PORT_CACHE_TTL_MS = DEV_CONFIG.devServer?.portCacheTtlMs ?? 1000;

/**
 * Find the process ID using a specific port.
 * Returns null if no process is found or on error.
 */
export const findProcessByPort = async (port: number): Promise<number | null> => {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      // Windows: use netstat
      exec(`netstat -ano | findstr :${port} | findstr LISTENING`, { timeout: 5000 }, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null);
          return;
        }
        // Parse: "  TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345"
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(pid) && pid > 0) {
            resolve(pid);
            return;
          }
        }
        resolve(null);
      });
    } else {
      // Unix: use lsof
      exec(`lsof -ti:${port} -sTCP:LISTEN 2>/dev/null`, { timeout: 5000 }, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null);
          return;
        }
        const pid = parseInt(stdout.trim().split('\n')[0], 10);
        resolve(isNaN(pid) ? null : pid);
      });
    }
  });
};

/**
 * Kill a process by PID. On Windows, also kills child processes.
 */
export const killProcess = async (pid: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';

    try {
      if (isWindows) {
        // Windows: /T kills child processes, /F forces termination
        exec(`taskkill /PID ${pid} /T /F`, { timeout: 5000 }, (error) => {
          resolve(!error);
        });
      } else {
        // Unix: kill the process group to include children
        exec(`kill -9 -${pid} 2>/dev/null || kill -9 ${pid}`, { timeout: 5000 }, (error) => {
          resolve(!error);
        });
      }
    } catch {
      resolve(false);
    }
  });
};

/**
 * Kill any process using a specific port.
 * Returns true if a process was found and killed.
 * Automatically clears the port cache after killing.
 */
export const killProcessOnPort = async (port: number): Promise<boolean> => {
  const pid = await findProcessByPort(port);
  if (pid) {
    const result = await killProcess(pid);
    // Clear cache for this port since its status has changed
    clearPortCache(port);
    return result;
  }
  return false;
};

/**
 * Check if a port is available (with caching).
 * Uses a short-lived cache to avoid repeated socket operations during rapid checks.
 */
export const isPortAvailable = async (port: number): Promise<boolean> => {
  // Check cache first
  const cached = portAvailabilityCache.get(port);
  if (cached && Date.now() - cached.timestamp < PORT_CACHE_TTL_MS) {
    return cached.available;
  }

  const available = await checkPortAvailability(port);

  // Cache the result
  portAvailabilityCache.set(port, { available, timestamp: Date.now() });

  return available;
};

/**
 * Internal function to actually check port availability via socket.
 */
const checkPortAvailability = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, '127.0.0.1');
  });
};

/**
 * Clear the port availability cache.
 * Call this after killing a process to ensure fresh checks.
 */
export const clearPortCache = (port?: number): void => {
  if (port !== undefined) {
    portAvailabilityCache.delete(port);
  } else {
    portAvailabilityCache.clear();
  }
};

/**
 * Find an available port starting from the given port.
 * Tries up to maxAttempts ports.
 */
export const findAvailablePort = async (startPort: number, maxAttempts = 100): Promise<number | null> => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return null;
};

/**
 * Parse EADDRINUSE error to extract the port number.
 */
export const parsePortFromError = (errorOutput: string): number | null => {
  // Match patterns like:
  // "EADDRINUSE: address already in use :::3001"
  // "listen EADDRINUSE: address already in use 0.0.0.0:3000"
  // "port: 3001"
  const patterns = [/EADDRINUSE.*?:(\d+)/i, /address already in use.*?:(\d+)/i, /port[:\s]+(\d+)/i];

  for (const pattern of patterns) {
    const match = errorOutput.match(pattern);
    if (match) {
      const port = parseInt(match[1], 10);
      if (!isNaN(port) && port > 0 && port < 65536) {
        return port;
      }
    }
  }

  return null;
};

/**
 * Extract port from a dev command if specified.
 * Looks for common patterns like --port, -p, etc.
 */
export const extractPortFromCommand = (command: string): number | null => {
  // Match patterns like:
  // --port 3000, --port=3000, -p 3000, -p=3000
  const patterns = [/(?:--port[=\s]+|-p[=\s]+)(\d+)/i, /\s-p\s+(\d+)/];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match) {
      const port = parseInt(match[1], 10);
      if (!isNaN(port) && port > 0 && port < 65536) {
        return port;
      }
    }
  }

  return null;
};

/**
 * Get the default port for a framework.
 */
export const getDefaultPort = (framework: string): number => {
  const defaults: Record<string, number> = {
    next: 3000,
    vite: 5173,
    astro: 4321,
    nuxt: 3000,
    remix: 3000,
    sveltekit: 5173,
    angular: 4200,
    gatsby: 8000,
    cra: 3000,
    webpack: 8080,
    parcel: 1234,
    rspack: 8080,
    turbopack: 3000,
    unknown: 3000
  };
  return defaults[framework] || 3000;
};

/**
 * Ensure a port is available, killing existing process if needed.
 * Returns the port that's now available (same port after killing, or a new one).
 */
export const ensurePortAvailable = async (
  port: number,
  options: { killExisting?: boolean; findAlternative?: boolean } = {}
): Promise<{ port: number; killedPid?: number }> => {
  const { killExisting = true, findAlternative = true } = options;

  // Check if port is available
  if (await isPortAvailable(port)) {
    return { port };
  }

  // Try to kill the existing process
  if (killExisting) {
    const pid = await findProcessByPort(port);
    if (pid) {
      const killed = await killProcess(pid);
      if (killed) {
        // Wait a bit for the port to be released
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check again
        if (await isPortAvailable(port)) {
          return { port, killedPid: pid };
        }
      }
    }
  }

  // Find an alternative port
  if (findAlternative) {
    const alternativePort = await findAvailablePort(port + 1);
    if (alternativePort) {
      return { port: alternativePort };
    }
  }

  // Return the original port even if not available (will fail with clear error)
  return { port };
};
