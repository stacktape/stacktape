/**
 * Port management utilities for dev servers.
 * Handles port conflicts, process cleanup, and port allocation.
 */
import { connect, createServer } from 'node:net';
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

/**
 * The port a container workload listens on, which dev mode passes as `PORT`. Docker maps the allocated host port to the
 * container port, so the workload keeps its configured port. The host network (native Linux) has no mapping: there the
 * workload must listen on the allocated host port itself, or a moved port is never served and the container collides
 * with whatever holds the default one.
 */
export const getContainerListenPort = ({
  containerPort,
  hostPort,
  hostNetwork
}: {
  containerPort?: number;
  hostPort?: number;
  hostNetwork: boolean;
}): number | undefined => (hostNetwork ? hostPort || containerPort : containerPort || hostPort);

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
 * Whether a program accepts TCP connections on a local port. Docker's port proxy accepts a connection on a published
 * port before the program in the container listens, then closes it at once, so a connection that is closed within
 * `holdMs` without data does not count.
 */
export const acceptsTcpConnection = ({
  port,
  host = '127.0.0.1',
  holdMs = 150,
  connectTimeoutMs = 1000
}: {
  port: number;
  host?: string;
  holdMs?: number;
  connectTimeoutMs?: number;
}): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = connect({ host, port });
    const finish = (accepted: boolean) => {
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.on('error', () => {});
      socket.destroy();
      resolve(accepted);
    };
    let timer = setTimeout(() => finish(false), connectTimeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      timer = setTimeout(() => finish(true), holdMs);
    });
    socket.once('data', () => finish(true));
    socket.once('close', () => finish(false));
    socket.once('error', () => finish(false));
  });

/**
 * The loopback addresses a local app may listen on. With Linux host networking a container's app binds the host's
 * loopback itself, and an app that listens on `localhost` may bind only `::1`.
 */
const LOOPBACK_HOSTS = ['127.0.0.1', '::1'];

/**
 * Waits until a local port accepts TCP connections on either loopback address (see `acceptsTcpConnection`). Gives up
 * after `timeoutMs`, or when `shouldStop` says the program it waits for is gone.
 */
export const waitForTcpPort = async ({
  port,
  timeoutMs,
  shouldStop = () => false,
  pollIntervalMs = 200
}: {
  port: number;
  timeoutMs: number;
  shouldStop?: () => boolean;
  pollIntervalMs?: number;
}): Promise<'ready' | 'timeout' | 'stopped'> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (shouldStop()) return 'stopped';
    const accepted = await Promise.all(LOOPBACK_HOSTS.map((host) => acceptsTcpConnection({ port, host })));
    if (accepted.includes(true)) return shouldStop() ? 'stopped' : 'ready';
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return shouldStop() ? 'stopped' : 'timeout';
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
