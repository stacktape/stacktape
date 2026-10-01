/**
 * Port management utilities for dev servers.
 * Handles port conflicts, process cleanup, and port allocation.
 */
import { createServer } from 'node:net';
import { DEV_CONFIG } from './dev-config';

/** Cache for port availability checks to avoid repeated socket operations */
type PortCacheEntry = { available: boolean; timestamp: number };
const portAvailabilityCache = new Map<number, PortCacheEntry>();

/**
 * Global set of ports reserved by container workloads (populated by allocateContainerPortBindings).
 * Dev servers consult this to avoid grabbing a port that Docker will bind momentarily.
 */
const globalReservedPorts = new Set<number>();

/** Mark port(s) as reserved so dev servers avoid them. */
export const reservePorts = (ports: Iterable<number>): void => {
  for (const port of ports) globalReservedPorts.add(port);
};

/** Release previously reserved port(s). */
export const releasePorts = (ports: Iterable<number>): void => {
  for (const port of ports) globalReservedPorts.delete(port);
};

/** Check if a port is in the global reserved set. */
export const isPortReserved = (port: number): boolean => globalReservedPorts.has(port);

/** How long to cache port availability results (ms) */
const PORT_CACHE_TTL_MS = DEV_CONFIG.devServer?.portCacheTtlMs ?? 1000;

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
    if (globalReservedPorts.has(port)) continue;
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
