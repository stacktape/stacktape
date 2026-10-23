import { EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { connect as connectSocket } from 'node:net';
import type { Socket } from 'node:net';
import { applicationManager } from '@application-services/application-manager';
import { tuiManager } from '@application-services/tui-manager';
import { createCleanupHook } from '../cleanup-utils';
import { DEV_CONFIG, getConfiguredTunnelServer } from '../dev-config';

const {
  startupTimeoutMs: TUNNEL_STARTUP_TIMEOUT_MS,
  retryAttempts: TUNNEL_RETRY_ATTEMPTS,
  retryDelayMs: TUNNEL_RETRY_DELAY_MS,
  reconnectAttempts: TUNNEL_RECONNECT_ATTEMPTS = 3,
  reconnectDelayMs: TUNNEL_RECONNECT_DELAY_MS = 5000
} = DEV_CONFIG.tunnels;

const BORE_CONTROL_PORT = 7835;
const NETWORK_TIMEOUT_MS = 3000;

type ClientMessage =
  | { type: 'Hello'; port: number }
  | { type: 'Accept'; connectionId: string }
  | { type: 'Authenticate'; response: string };

type ServerMessage =
  | { type: 'Hello'; port: number }
  | { type: 'Heartbeat' }
  | { type: 'Connection'; connectionId: string }
  | { type: 'Challenge'; challengeId: string }
  | { type: 'Error'; message: string };

type TunnelProcess = {
  kill: () => void;
  killed: boolean;
  exitCode: number | null;
  on: (event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void) => TunnelProcess;
};

export type TunnelInfo = {
  resourceName: string;
  localPort: number;
  publicHost: string;
  publicPort: number;
  process: TunnelProcess;
};

type PendingMessage = {
  resolve: (message: ServerMessage | null) => void;
  reject: (error: Error) => void;
  timeout?: ReturnType<typeof setTimeout>;
};

type ParsedTunnelServer = {
  controlHost: string;
  controlPort: number;
  publicHost: string;
};

const activeTunnels: TunnelInfo[] = [];
const reconnectingTunnels = new Set<string>();
const activeConnections = new Set<Socket>();
let tunnelSession = new AbortController();

const sleep = (ms: number, signal?: AbortSignal) => delay(ms, undefined, { signal });

const parseTunnelServer = (server: string): ParsedTunnelServer => {
  const normalizedServer = server.trim();

  if (!normalizedServer) {
    throw new Error('Tunnel server is not configured.');
  }

  const parts = normalizedServer.split(':');

  if (parts.length === 1) {
    return {
      controlHost: parts[0],
      controlPort: BORE_CONTROL_PORT,
      publicHost: parts[0]
    };
  }

  const maybePort = Number(parts.at(-1));

  if (parts.length >= 2 && Number.isInteger(maybePort) && maybePort > 0 && maybePort <= 65535) {
    return {
      controlHost: parts.slice(0, -1).join(':'),
      controlPort: maybePort,
      publicHost: parts.slice(0, -1).join(':')
    };
  }

  return {
    controlHost: normalizedServer,
    controlPort: BORE_CONTROL_PORT,
    publicHost: normalizedServer
  };
};

const serializeClientMessage = (message: ClientMessage): string => {
  switch (message.type) {
    case 'Hello':
      return JSON.stringify({ Hello: message.port });
    case 'Accept':
      return JSON.stringify({ Accept: message.connectionId });
    case 'Authenticate':
      return JSON.stringify({ Authenticate: message.response });
  }
};

const parseServerMessage = (message: string): ServerMessage => {
  const parsed: unknown = JSON.parse(message);
  if (parsed === 'Heartbeat') return { type: 'Heartbeat' };
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Unknown tunnel server message: ${message}`);
  }

  if ('Hello' in parsed && typeof parsed.Hello === 'number') {
    return { type: 'Hello', port: parsed.Hello };
  }

  if ('Heartbeat' in parsed) {
    return { type: 'Heartbeat' };
  }

  if ('Connection' in parsed && typeof parsed.Connection === 'string') {
    return { type: 'Connection', connectionId: parsed.Connection };
  }

  if ('Challenge' in parsed && typeof parsed.Challenge === 'string') {
    return { type: 'Challenge', challengeId: parsed.Challenge };
  }

  if ('Error' in parsed && typeof parsed.Error === 'string') {
    return { type: 'Error', message: parsed.Error };
  }

  throw new Error(`Unknown tunnel server message: ${message}`);
};

class DelimitedSocket {
  private buffer = Buffer.alloc(0);
  private messageQueue: ServerMessage[] = [];
  private pendingMessages: PendingMessage[] = [];
  private closed = false;
  private closeError: Error | null = null;

  private readonly onData = (chunk: Buffer) => {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      const delimiterIndex = this.buffer.indexOf(0);
      if (delimiterIndex === -1) {
        return;
      }

      const frame = this.buffer.subarray(0, delimiterIndex);
      this.buffer = this.buffer.subarray(delimiterIndex + 1);

      if (frame.length === 0) {
        continue;
      }

      try {
        this.enqueueMessage(parseServerMessage(frame.toString('utf8')));
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        this.closeWithError(normalizedError);
        return;
      }
    }
  };

  private readonly onClose = () => {
    this.closed = true;
    this.flushPendingMessages();
  };

  private readonly onError = (error: Error) => {
    this.closeWithError(error);
  };

  constructor(private readonly socket: Socket) {
    this.socket.on('data', this.onData);
    this.socket.on('close', this.onClose);
    this.socket.on('error', this.onError);
  }

  static async connect({ host, port }: { host: string; port: number }): Promise<DelimitedSocket> {
    const socket = await new Promise<Socket>((resolve, reject) => {
      const connection = connectSocket({ host, port });

      const timeout = setTimeout(() => {
        connection.destroy(new Error(`Timed out connecting to ${host}:${port}`));
      }, NETWORK_TIMEOUT_MS);

      connection.once('connect', () => {
        clearTimeout(timeout);
        resolve(connection);
      });

      connection.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    socket.setNoDelay(true);
    return new DelimitedSocket(socket);
  }

  async send(message: ClientMessage): Promise<void> {
    const payload = `${serializeClientMessage(message)}\0`;

    await new Promise<void>((resolve, reject) => {
      this.socket.write(payload, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  async recv({ timeoutMs }: { timeoutMs?: number } = {}): Promise<ServerMessage | null> {
    if (this.messageQueue.length > 0) {
      return this.messageQueue.shift() || null;
    }

    if (this.closeError) {
      throw this.closeError;
    }

    if (this.closed) {
      return null;
    }

    return await new Promise<ServerMessage | null>((resolve, reject) => {
      const pendingMessage: PendingMessage = { resolve, reject };

      if (timeoutMs) {
        pendingMessage.timeout = setTimeout(() => {
          this.pendingMessages = this.pendingMessages.filter((entry) => entry !== pendingMessage);
          reject(new Error(`Timed out waiting for tunnel server response after ${timeoutMs}ms`));
        }, timeoutMs);
      }

      this.pendingMessages.push(pendingMessage);
    });
  }

  intoSocket(): { socket: Socket; bufferedData: Buffer } {
    // Removing a data listener does not pause a flowing socket. Hold raw bytes until pipe() attaches.
    this.socket.pause();
    this.socket.off('data', this.onData);
    this.socket.off('close', this.onClose);
    this.socket.off('error', this.onError);

    for (const pendingMessage of this.pendingMessages) {
      if (pendingMessage.timeout) {
        clearTimeout(pendingMessage.timeout);
      }
      pendingMessage.resolve(null);
    }

    this.pendingMessages = [];

    return {
      socket: this.socket,
      bufferedData: this.buffer
    };
  }

  destroy(): void {
    this.socket.destroy();
  }

  private enqueueMessage(message: ServerMessage): void {
    const pendingMessage = this.pendingMessages.shift();

    if (!pendingMessage) {
      this.messageQueue.push(message);
      return;
    }

    if (pendingMessage.timeout) {
      clearTimeout(pendingMessage.timeout);
    }

    pendingMessage.resolve(message);
  }

  private flushPendingMessages(): void {
    for (const pendingMessage of this.pendingMessages) {
      if (pendingMessage.timeout) {
        clearTimeout(pendingMessage.timeout);
      }

      if (this.closeError) {
        pendingMessage.reject(this.closeError);
      } else {
        pendingMessage.resolve(null);
      }
    }

    this.pendingMessages = [];
  }

  private closeWithError(error: Error): void {
    this.closeError = this.closeError || error;
    this.socket.destroy(error);
  }
}

class TunnelClientProcess extends EventEmitter implements TunnelProcess {
  public killed = false;
  public exitCode: number | null = null;

  private hasExited = false;

  constructor(private readonly controlSocket: DelimitedSocket) {
    super();
  }

  kill(): void {
    if (this.hasExited) {
      return;
    }

    this.killed = true;
    this.exitCode = 0;
    this.controlSocket.destroy();
  }

  async recv(): Promise<ServerMessage | null> {
    return await this.controlSocket.recv();
  }

  markExited(code: number | null, signal: NodeJS.Signals | null = null): void {
    if (this.hasExited) {
      return;
    }

    this.hasExited = true;
    this.exitCode = code;
    this.emit('exit', code, signal);
  }
}

const connectToLocalResource = async (localPort: number): Promise<Socket> => {
  return await new Promise<Socket>((resolve, reject) => {
    const socket = connectSocket({ host: '127.0.0.1', port: localPort });

    const timeout = setTimeout(() => {
      socket.destroy(new Error(`Timed out connecting to local resource on port ${localPort}`));
    }, NETWORK_TIMEOUT_MS);

    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
};

const closeSocketPair = (socketA: Socket, socketB: Socket): void => {
  activeConnections.delete(socketA);
  activeConnections.delete(socketB);
  if (!socketA.destroyed) {
    socketA.destroy();
  }

  if (!socketB.destroyed) {
    socketB.destroy();
  }
};

const proxyRemoteConnection = async ({
  connectionId,
  localPort,
  server,
  signal
}: {
  connectionId: string;
  localPort: number;
  server: ParsedTunnelServer;
  signal: AbortSignal;
}): Promise<void> => {
  const acceptConnection = await DelimitedSocket.connect({ host: server.controlHost, port: server.controlPort });
  let localConnection: Socket | undefined;
  const abort = () => {
    acceptConnection.destroy();
    localConnection?.destroy();
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    signal.throwIfAborted();
    // Accept switches this stream to raw database bytes. Detach and pause before sending it:
    // the relay can immediately send binary data containing the JSON frame delimiter.
    const { socket: remoteConnection, bufferedData } = acceptConnection.intoSocket();
    const close = () => {
      if (localConnection) closeSocketPair(localConnection, remoteConnection);
      else remoteConnection.destroy();
    };
    // Keep error handling continuous while the local connection is still opening.
    remoteConnection.once('error', close);
    remoteConnection.once('close', close);
    await acceptConnection.send({ type: 'Accept', connectionId });
    localConnection = await connectToLocalResource(localPort);
    signal.throwIfAborted();
    if (remoteConnection.destroyed) throw new Error('Relay connection closed while opening the local resource.');
    activeConnections.add(localConnection);
    activeConnections.add(remoteConnection);
    localConnection.once('error', close);
    localConnection.once('close', close);
    if (bufferedData.length > 0) localConnection.write(bufferedData);
    localConnection.pipe(remoteConnection);
    remoteConnection.pipe(localConnection);
  } catch (error) {
    abort();
    throw error;
  } finally {
    signal.removeEventListener('abort', abort);
  }
};

const listenForTunnelConnections = ({
  process,
  localPort,
  resourceName,
  server,
  signal
}: {
  process: TunnelClientProcess;
  localPort: number;
  resourceName: string;
  server: ParsedTunnelServer;
  signal: AbortSignal;
}) => {
  const listen = async () => {
    try {
      while (true) {
        const message = await process.recv();

        if (!message) {
          break;
        }

        if (message.type === 'Heartbeat') {
          continue;
        }

        if (message.type === 'Connection') {
          void proxyRemoteConnection({ connectionId: message.connectionId, localPort, server, signal }).catch(
            (error) => {
              const errorMessage = error instanceof Error ? error.message : String(error);
              tuiManager.warn(`Tunnel connection failed for ${resourceName}: ${errorMessage}`);
            }
          );
          continue;
        }

        if (message.type === 'Error') {
          throw new Error(message.message);
        }

        if (message.type === 'Challenge') {
          throw new Error(
            'Tunnel server requested authentication, but Stacktape only supports unauthenticated bore-compatible servers.'
          );
        }
      }

      process.markExited(process.killed ? 0 : 1);
    } catch (error) {
      if (!process.killed) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        tuiManager.warn(`Tunnel for ${resourceName} closed: ${errorMessage}`);
      }

      process.markExited(process.killed ? 0 : 1);
    }
  };

  void listen();
};

const startTunnelAttempt = async (
  resourceName: string,
  localPort: number,
  signal: AbortSignal
): Promise<TunnelInfo> => {
  const server = parseTunnelServer(getConfiguredTunnelServer() ?? '');
  const controlSocket = await DelimitedSocket.connect({
    host: server.controlHost,
    port: server.controlPort
  });

  const abort = () => controlSocket.destroy();
  signal.addEventListener('abort', abort, { once: true });
  try {
    signal.throwIfAborted();
    await controlSocket.send({ type: 'Hello', port: 0 });

    const response = await controlSocket.recv({ timeoutMs: TUNNEL_STARTUP_TIMEOUT_MS });

    if (!response) {
      throw new Error(
        `Tunnel server ${server.controlHost}:${server.controlPort} closed the connection before the tunnel was established.`
      );
    }

    if (response.type === 'Error') {
      throw new Error(`Tunnel server error: ${response.message}`);
    }

    if (response.type === 'Challenge') {
      throw new Error('Tunnel server requires authentication, which is not supported by Stacktape dev tunnels.');
    }

    if (response.type !== 'Hello') {
      throw new Error(`Unexpected tunnel server response while opening tunnel: ${response.type}`);
    }

    const process = new TunnelClientProcess(controlSocket);

    const tunnelInfo: TunnelInfo = {
      resourceName,
      localPort,
      publicHost: server.publicHost,
      publicPort: response.port,
      process
    };

    signal.throwIfAborted();
    listenForTunnelConnections({ process, localPort, resourceName, server, signal });

    return tunnelInfo;
  } catch (error) {
    controlSocket.destroy();
    throw error;
  } finally {
    signal.removeEventListener('abort', abort);
  }
};

const attemptReconnect = async (resourceName: string, localPort: number, signal: AbortSignal): Promise<void> => {
  if (reconnectingTunnels.has(resourceName)) {
    return;
  }

  reconnectingTunnels.add(resourceName);

  try {
    for (let attempt = 1; attempt <= TUNNEL_RECONNECT_ATTEMPTS; attempt++) {
      if (applicationManager.isInterrupted || signal.aborted) {
        return;
      }

      tuiManager.info(`Reconnecting tunnel for ${resourceName} (attempt ${attempt}/${TUNNEL_RECONNECT_ATTEMPTS})...`);

      try {
        const tunnel = await startTunnelAttempt(resourceName, localPort, signal);
        if (signal.aborted) {
          tunnel.process.kill();
          return;
        }
        activeTunnels.push(tunnel);
        setupTunnelExitHandler(tunnel, signal);

        tuiManager.success(`Tunnel for ${resourceName} reconnected at ${tunnel.publicHost}:${tunnel.publicPort}`);

        return;
      } catch {
        if (attempt < TUNNEL_RECONNECT_ATTEMPTS) {
          const delay = TUNNEL_RECONNECT_DELAY_MS * attempt;
          tuiManager.warn(
            `Tunnel reconnection attempt ${attempt} failed for ${resourceName}, retrying in ${delay / 1000}s...`
          );
          await sleep(delay, signal);
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

const setupTunnelExitHandler = (tunnel: TunnelInfo, sessionSignal: AbortSignal): void => {
  tunnel.process.on('exit', (code, signal) => {
    const index = activeTunnels.findIndex((activeTunnel) => activeTunnel.resourceName === tunnel.resourceName);
    if (index !== -1) {
      activeTunnels.splice(index, 1);
    }

    if (code !== 0 && code !== null && !applicationManager.isInterrupted && !sessionSignal.aborted) {
      tuiManager.warn(
        `Tunnel for ${tunnel.resourceName} died unexpectedly (code: ${code}, signal: ${signal}). Attempting reconnect...`
      );

      void attemptReconnect(tunnel.resourceName, tunnel.localPort, sessionSignal).catch(() => {
        // Errors are already reported inside attemptReconnect.
      });
    }
  });
};

export const startTunnel = async (resourceName: string, localPort: number): Promise<TunnelInfo> => {
  if (tunnelSession.signal.aborted) tunnelSession = new AbortController();
  const signal = tunnelSession.signal;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= TUNNEL_RETRY_ATTEMPTS; attempt++) {
    try {
      const tunnel = await startTunnelAttempt(resourceName, localPort, signal);
      if (signal.aborted) {
        tunnel.process.kill();
        signal.throwIfAborted();
      }
      activeTunnels.push(tunnel);
      setupTunnelExitHandler(tunnel, signal);
      return tunnel;
    } catch (error) {
      signal.throwIfAborted();
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < TUNNEL_RETRY_ATTEMPTS) {
        tuiManager.warn(
          `Tunnel attempt ${attempt} failed for ${resourceName}, retrying in ${TUNNEL_RETRY_DELAY_MS / 1000}s...`
        );
        await sleep(TUNNEL_RETRY_DELAY_MS, signal);
      }
    }
  }

  throw lastError || new Error(`Failed to start tunnel for ${resourceName} after ${TUNNEL_RETRY_ATTEMPTS} attempts`);
};

const stopAllTunnels = async (): Promise<void> => {
  tunnelSession.abort();
  for (const socket of activeConnections) socket.destroy();
  activeConnections.clear();
  const tunnelsToStop = [...activeTunnels];
  for (const tunnel of tunnelsToStop) {
    tunnel.process.kill();
  }
  activeTunnels.length = 0;
};

export const getActiveTunnels = (): TunnelInfo[] => {
  return [...activeTunnels];
};

export const registerTunnelCleanupHook = createCleanupHook('tunnels', async () => {
  // Cleanup must cancel a pending reconnect even when its old tunnel has already exited.
  await stopAllTunnels();
});
