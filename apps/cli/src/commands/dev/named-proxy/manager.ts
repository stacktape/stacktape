import type { Socket } from 'node:net';
import type { ProxyServer } from './proxy';
import { mkdirp, readFile } from 'fs-extra';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { createCleanupHook } from '../cleanup-utils';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { clearPortCache, findAvailablePort, isPortAvailable } from '../port-utils';
import { ensureCerts, isCATrusted, trustCA, createSNICallback } from './certs';
import { createProxyServer, PROXY_IDENTITY_HEADER } from './proxy';
import { formatUrl, parseHostname } from './utils';
import { localStatePaths } from 'src/config/local-state-paths';

type RouteMapping = {
  hostname: string;
  port: number;
  /** The loopback address the app listens on (`RouteInfo.host`). */
  host?: string;
  pid: number;
};

const state: {
  server: ProxyServer | null;
  /** The listener on `::1`, next to `server` on `127.0.0.1`. */
  ipv6Server: ProxyServer | null;
  proxyPort: number | null;
  tlsEnabled: boolean;
  startupPromise: Promise<{ proxyPort: number; tlsEnabled: boolean }> | null;
  routes: Map<string, RouteMapping>;
  resourceToHostname: Map<string, string>;
  sockets: Set<Socket>;
} = {
  server: null,
  ipv6Server: null,
  proxyPort: null,
  tlsEnabled: false,
  startupPromise: null,
  routes: new Map(),
  resourceToHostname: new Map(),
  sockets: new Set()
};

const getStagePortOffset = (): number => {
  const stage = globalStateManager.stage || '';
  if (!stage) return 0;

  let hash = 5381;
  for (let i = 0; i < stage.length; i++) {
    hash = (hash * 33) ^ stage.charCodeAt(i);
  }
  return Math.abs(hash) % 100;
};

const sanitizePart = (input: string): string => {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
  return normalized || 'app';
};

const buildHostname = (resourceName: string): string => {
  const stage = sanitizePart(globalStateManager.stage || 'dev');
  const resource = sanitizePart(resourceName || 'app');
  return parseHostname(`${resource}.${stage}`);
};

const isTlsRequested = (): boolean => {
  const env = process.env.STACKTAPE_DEV_HTTPS || process.env.PORTLESS_HTTPS;
  return env === '1' || env === 'true';
};

const getProxyStateDir = (): string => {
  return localStatePaths.devProxyDirectory();
};

const ensureTlsOptions = async (): Promise<
  | {
      enabled: false;
    }
  | {
      enabled: true;
      cert: Buffer;
      key: Buffer;
      SNICallback: (
        servername: string,
        cb: (err: Error | null, ctx?: import('node:tls').SecureContext) => void
      ) => void;
    }
> => {
  if (!isTlsRequested()) {
    return { enabled: false };
  }

  const stateDir = getProxyStateDir();
  await mkdirp(stateDir);

  const { certPath, keyPath, caGenerated } = ensureCerts(stateDir);
  const [cert, key] = await Promise.all([readFile(certPath), readFile(keyPath)]);
  const trusted = isCATrusted(stateDir);

  if (!trusted) {
    const trustResult = trustCA(stateDir);
    if (!trustResult.trusted) {
      tuiManager.warn(`[dev-proxy] HTTPS enabled but local CA trust failed: ${trustResult.error || 'unknown error'}`);
      tuiManager.warn('[dev-proxy] Browser may show certificate warnings.');
    } else if (caGenerated) {
      tuiManager.info('[dev-proxy] Trusted local CA for HTTPS dev proxy.');
    }
  }

  return {
    enabled: true,
    cert,
    key,
    SNICallback: createSNICallback(stateDir, cert, key)
  };
};

/** The project and stage whose workloads a proxy serves; their URLs embed its port. */
const getProxyIdentity = () => `${globalStateManager.targetStack?.projectName ?? ''}/${globalStateManager.stage || ''}`;

/**
 * The identity a proxy on `port` reports, or `undefined` when no Stacktape dev proxy answers there. A proxy of the same
 * stage uses the same protocol: HTTPS with its local certificate when `STACKTAPE_DEV_HTTPS` is set.
 */
const readProxyIdentity = (port: number, tls: boolean): Promise<string | undefined> =>
  new Promise((resolve) => {
    // A new connection: a pooled one can still reach a proxy that stopped listening.
    const options = { host: '127.0.0.1', port, path: '/', timeout: 1000, agent: false } as const;
    const onResponse = (response: IncomingMessage) => {
      response.resume();
      const identity = response.headers[PROXY_IDENTITY_HEADER.toLowerCase()];
      resolve(typeof identity === 'string' ? identity : undefined);
    };
    const request = tls
      ? httpsRequest({ ...options, servername: 'localhost', rejectUnauthorized: false }, onResponse)
      : httpRequest(options, onResponse);
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve(undefined));
    request.end();
  });

/**
 * Waits until the proxy of the session this one replaces releases this stage's port. On a take-over in the same
 * directory, the replaced session stops only once the new one holds the stage, and its proxy still held the port when
 * the new proxy started: the new one took the next port, and every stored URL of the stage stopped working.
 */
const waitForReplacedSessionProxy = async ({
  port,
  identity,
  timeoutMs = REPLACED_PROXY_WAIT_MS
}: {
  port: number;
  identity: string;
  timeoutMs?: number;
}) => {
  clearPortCache(port);
  if (await isPortAvailable(port)) return;
  if ((await readProxyIdentity(port, isTlsRequested())) !== identity) return;
  tuiManager.info(`[dev-proxy] Waiting for the replaced dev session of this stage to release port ${port}...`);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    clearPortCache(port);
    if (await isPortAvailable(port)) return;
  }
  tuiManager.warn(
    `[dev-proxy] Another dev session of this stage still holds port ${port}, so URLs of this session use another port.`
  );
};

const REPLACED_PROXY_WAIT_MS = 30_000;

/** Listens on one address: `true` once listening, `false` when the port is taken there, `unavailable` without it. */
const listenOn = (server: ProxyServer, port: number, host: string) =>
  new Promise<boolean | 'unavailable'>((resolve) => {
    const onError = (error: NodeJS.ErrnoException) =>
      resolve(error.code === 'EADDRNOTAVAIL' || error.code === 'EAFNOSUPPORT' ? 'unavailable' : false);
    server.once('error', onError);
    server.listen(port, host, () => {
      server.removeListener('error', onError);
      resolve(true);
    });
  });

const closeServer = (server: ProxyServer) => new Promise<void>((resolve) => server.close(() => resolve()));

const ensureProxyStarted = async (): Promise<{ proxyPort: number; tlsEnabled: boolean }> => {
  if (state.server && state.proxyPort) {
    return { proxyPort: state.proxyPort, tlsEnabled: state.tlsEnabled };
  }

  if (state.startupPromise) {
    return state.startupPromise;
  }

  state.startupPromise = (async () => {
    const preferredPort = 1355 + getStagePortOffset();
    const identity = getProxyIdentity();
    await waitForReplacedSessionProxy({ port: preferredPort, identity });
    const tlsOptions = await ensureTlsOptions();
    const createServer = () => {
      const server = createProxyServer({
        getRoutes: () =>
          Array.from(state.routes.values()).map((r) => ({ hostname: r.hostname, port: r.port, host: r.host })),
        proxyPort,
        onError: (message) => tuiManager.warn(`[dev-proxy] ${message}`),
        identity,
        ...(tlsOptions.enabled
          ? {
              tls: {
                cert: tlsOptions.cert,
                key: tlsOptions.key,
                SNICallback: tlsOptions.SNICallback
              }
            }
          : {})
      });
      server.on('connection', (socket) => {
        state.sockets.add(socket);
        socket.once('close', () => state.sockets.delete(socket));
      });
      return server;
    };

    // Browsers resolve `<name>.localhost` to `::1` as well as `127.0.0.1` and may try `::1` first, so the proxy listens
    // on both: a program that held only `::1` of the port would receive the browser's requests (r2bd2). The port was
    // free on both when it was chosen; one taken since then moves the proxy to the next port.
    let proxyPort = 0;
    let server: ProxyServer | undefined;
    let ipv6Server: ProxyServer | null = null;
    for (let start = preferredPort; start < preferredPort + 200; start = proxyPort + 1) {
      proxyPort = (await findAvailablePort(start, preferredPort + 200 - start)) ?? 0;
      if (!proxyPort) break;
      server = createServer();
      if ((await listenOn(server, proxyPort, '127.0.0.1')) !== true) {
        server = undefined;
        continue;
      }
      ipv6Server = createServer();
      const ipv6 = await listenOn(ipv6Server, proxyPort, '::1');
      if (ipv6 !== false) {
        if (ipv6 === 'unavailable') ipv6Server = null;
        break;
      }
      await closeServer(server);
      server = undefined;
    }
    if (!server || !proxyPort) {
      throw new Error(`Failed to find available proxy port (tried ${preferredPort}-${preferredPort + 199})`);
    }

    state.server = server;
    state.ipv6Server = ipv6Server;
    state.proxyPort = proxyPort;
    state.tlsEnabled = tlsOptions.enabled;

    const baseUrl = formatUrl('localhost', proxyPort, tlsOptions.enabled);
    tuiManager.info(`[dev-proxy] Running on ${baseUrl}`);

    return { proxyPort, tlsEnabled: tlsOptions.enabled };
  })();

  try {
    return await state.startupPromise;
  } finally {
    state.startupPromise = null;
  }
};

export const ensureNamedProxyRoute = async ({
  resourceName,
  targetPort,
  targetHost
}: {
  resourceName: string;
  targetPort: number;
  /** The loopback address the app listens on; `127.0.0.1` when omitted. */
  targetHost?: string;
}): Promise<{ hostname: string; url: string; proxyPort: number }> => {
  const { proxyPort, tlsEnabled } = await ensureProxyStarted();
  const hostname = buildHostname(resourceName);

  state.routes.set(hostname, { hostname, port: targetPort, host: targetHost, pid: process.pid });
  state.resourceToHostname.set(resourceName, hostname);

  return { hostname, proxyPort, url: formatUrl(hostname, proxyPort, tlsEnabled) };
};

export const removeNamedProxyRoute = (resourceName: string): void => {
  const hostname = state.resourceToHostname.get(resourceName);
  if (!hostname) return;
  state.resourceToHostname.delete(resourceName);
  state.routes.delete(hostname);
};

export const stopNamedProxy = async (): Promise<void> => {
  state.routes.clear();
  state.resourceToHostname.clear();

  if (!state.server) {
    state.proxyPort = null;
    state.tlsEnabled = false;
    return;
  }

  const servers = [state.server, state.ipv6Server].filter((server) => server !== null);
  const closed = Promise.all(servers.map(closeServer));
  for (const socket of state.sockets) socket.destroy();
  state.sockets.clear();
  await closed;
  state.server = null;
  state.ipv6Server = null;
  state.proxyPort = null;
  state.tlsEnabled = false;
};

export const registerNamedProxyCleanupHook = createCleanupHook('named-proxy', async () => {
  await stopNamedProxy();
});
