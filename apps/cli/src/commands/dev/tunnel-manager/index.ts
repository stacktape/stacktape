import { EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { connect as connectSocket } from 'node:net';
import type { Socket } from 'node:net';
import { applicationManager } from '@application-services/application-manager';
import { tuiManager } from '@application-services/tui-manager';
import { createCleanupHook } from '../cleanup-utils';
import { DEV_CONFIG } from '../dev-config';
import { formatTimeWithZone } from '@utils/formatting';

const { startupTimeoutMs: TUNNEL_STARTUP_TIMEOUT_MS, maxReconnectDelayMs: MAX_RECONNECT_DELAY_MS } = DEV_CONFIG.tunnels;

const NETWORK_TIMEOUT_MS = 3000;
/** How often a lease held by another developer is asked for again. */
const REFUSED_RETRY_MS = 30_000;

/**
 * The dev box relay as this session reaches it: the control port through the SSM port forward on this machine, and
 * the tunnel ports at the box's private IP, where deployed dev functions connect.
 */
export type RelayEndpoint = { controlHost: string; controlPort: number; relayHost: string };

/**
 * Who holds a lease. `session` identifies one `stacktape dev` process: it takes its own port over after a lost
 * connection, while another session, of the same developer on another machine too, is refused and told this label.
 */
export type RelayOwner = { id: string; label: string; session: string };

/** A `stacktape dev` session the relay knows: one that holds a tunnel or a presence connection. */
export type RelaySessionInfo = { stack: string; session: string; owner: string; label: string; since: number };

type ClientMessage =
  | { type: 'Lease'; port: number; key: string; owner: RelayOwner; takeOver: boolean }
  | { type: 'Presence'; owner: RelayOwner; stack?: string; held: boolean; takeOver: boolean }
  | { type: 'Sessions'; stack?: string }
  | { type: 'Ping' }
  | { type: 'Accept'; connectionId: string };

type ServerMessage =
  | { type: 'Hello'; port: number }
  | { type: 'Heartbeat' }
  | { type: 'Connection'; connectionId: string }
  | { type: 'Pong'; version: number }
  | { type: 'Refused'; port: number; key: string; label: string; since: number; owner: string; session: string }
  | { type: 'TakenOver'; label: string }
  | { type: 'Sessions'; sessions: RelaySessionInfo[] }
  | { type: 'Error'; message: string };

type TunnelProcess = {
  kill: () => void;
  killed: boolean;
  exitCode: number | null;
  /** Set when another session took the port over with `--take-over`: the tunnel must not ask for it again. */
  takenOverBy?: string;
  /** The database connections the tunnel carries now. */
  readonly connections: ReadonlySet<Socket>;
  on: (event: 'exit', listener: (code: number | null, signal: NodeJS.Signals | null) => void) => TunnelProcess;
};

export type TunnelInfo = {
  resourceName: string;
  localPort: number;
  relayHost: string;
  relayPort: number;
  process: TunnelProcess;
};

type TunnelRequest = {
  resourceName: string;
  localPort: number;
  /** The leased relay port and the lease's key, `<stack>/<resource>`. */
  lease: { port: number; key: string };
  owner: RelayOwner;
  relay: RelayEndpoint;
  /** Replaces a tunnel another session holds (`--take-over`) instead of waiting for it to end. */
  takeOver?: boolean;
};

/** A held lease of another developer: the tunnel is not open, and is asked for again later. */
export class LeaseRefusedError extends Error {
  constructor(readonly holder: { label: string; since: number; key: string }) {
    super(`held by ${holder.label}`);
  }
}

type PendingMessage = {
  resolve: (message: ServerMessage | null) => void;
  reject: (error: Error) => void;
  timeout?: ReturnType<typeof setTimeout>;
};

const activeTunnels: TunnelInfo[] = [];
const reconnectingTunnels = new Set<string>();
const activeConnections = new Set<Socket>();
let tunnelSession = new AbortController();

const sleep = (ms: number, signal?: AbortSignal) => delay(ms, undefined, { signal });

const serializeClientMessage = (message: ClientMessage): string => {
  switch (message.type) {
    case 'Lease':
      return JSON.stringify({
        Lease: {
          port: message.port,
          key: message.key,
          owner: message.owner.id,
          label: message.owner.label,
          session: message.owner.session,
          takeOver: message.takeOver
        }
      });
    case 'Presence':
      return JSON.stringify({
        Presence: {
          owner: message.owner.id,
          label: message.owner.label,
          session: message.owner.session,
          stack: message.stack,
          // Relay version 4 holds the stage with it; older relays ignore both fields.
          exclusive: true,
          held: message.held,
          takeOver: message.takeOver
        }
      });
    case 'Sessions':
      return JSON.stringify({ Sessions: { stack: message.stack } });
    case 'Ping':
      return JSON.stringify({ Ping: null });
    case 'Accept':
      return JSON.stringify({ Accept: message.connectionId });
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

  if ('Pong' in parsed && typeof parsed.Pong === 'object' && parsed.Pong !== null) {
    const { version } = parsed.Pong as { version?: unknown };
    return { type: 'Pong', version: typeof version === 'number' ? version : 0 };
  }

  if ('Refused' in parsed && typeof parsed.Refused === 'object' && parsed.Refused !== null) {
    const { port, key, label, since, owner, session } = parsed.Refused as Record<string, unknown>;
    return {
      type: 'Refused',
      port: Number(port),
      key: String(key ?? ''),
      label: String(label || 'another developer'),
      since: Number(since),
      // Sent by relay version 4 and later.
      owner: String(owner ?? ''),
      session: String(session ?? '')
    };
  }

  if ('TakenOver' in parsed && typeof parsed.TakenOver === 'object' && parsed.TakenOver !== null) {
    const { label } = parsed.TakenOver as Record<string, unknown>;
    return { type: 'TakenOver', label: String(label || 'another developer') };
  }

  if ('Sessions' in parsed && Array.isArray(parsed.Sessions)) {
    return {
      type: 'Sessions',
      sessions: parsed.Sessions.map((entry: Record<string, unknown>) => ({
        stack: String(entry.stack ?? ''),
        session: String(entry.session ?? ''),
        owner: String(entry.owner ?? ''),
        label: String(entry.label || 'another developer'),
        since: Number(entry.since)
      }))
    };
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
  public takenOverBy: string | undefined;
  /** The database connections this tunnel carries; they end with a take-over, not only with the session. */
  readonly connections = new Set<Socket>();

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

  dropConnections(): void {
    for (const socket of this.connections) socket.destroy();
    this.connections.clear();
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
  relay,
  signal,
  connections
}: {
  connectionId: string;
  localPort: number;
  relay: RelayEndpoint;
  signal: AbortSignal;
  /** The tunnel's connections, which a take-over ends. */
  connections: Set<Socket>;
}): Promise<void> => {
  const acceptConnection = await DelimitedSocket.connect({ host: relay.controlHost, port: relay.controlPort });
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
      connections.delete(remoteConnection);
      if (localConnection) connections.delete(localConnection);
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
    connections.add(localConnection);
    connections.add(remoteConnection);
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
  request,
  signal
}: {
  process: TunnelClientProcess;
  request: TunnelRequest;
  signal: AbortSignal;
}) => {
  const listen = async () => {
    try {
      while (true) {
        const message = await process.recv();
        if (!message) break;
        if (message.type === 'Connection') {
          void proxyRemoteConnection({
            connectionId: message.connectionId,
            localPort: request.localPort,
            relay: request.relay,
            signal,
            connections: process.connections
          }).catch((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            tuiManager.warn(`Tunnel connection failed for ${request.resourceName}: ${errorMessage}`);
          });
          continue;
        }
        if (message.type === 'TakenOver') {
          // Pooled connections of warm functions must reach the new holder, not this session.
          process.takenOverBy = message.label;
          process.dropConnections();
          continue;
        }
        if (message.type === 'Error') throw new Error(message.message);
      }
      process.markExited(process.killed ? 0 : 1);
    } catch (error) {
      if (!process.killed) {
        tuiManager.debug(
          `Tunnel for ${request.resourceName} closed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      process.markExited(process.killed ? 0 : 1);
    }
  };

  void listen();
};

const startTunnelAttempt = async (request: TunnelRequest, signal: AbortSignal): Promise<TunnelInfo> => {
  const { relay, lease, owner, resourceName, localPort, takeOver = false } = request;
  const controlSocket = await DelimitedSocket.connect({ host: relay.controlHost, port: relay.controlPort });
  const abort = () => controlSocket.destroy();
  signal.addEventListener('abort', abort, { once: true });
  try {
    signal.throwIfAborted();
    await controlSocket.send({ type: 'Lease', port: lease.port, key: lease.key, owner, takeOver });
    const response = await controlSocket.recv({ timeoutMs: TUNNEL_STARTUP_TIMEOUT_MS });
    if (!response) throw new Error('The dev box relay closed the connection before the tunnel was open.');
    if (response.type === 'Refused') throw new LeaseRefusedError(response);
    if (response.type === 'Error') throw new Error(`The dev box relay refused the tunnel: ${response.message}`);
    if (response.type !== 'Hello') throw new Error(`Unexpected dev box relay response: ${response.type}`);
    const process = new TunnelClientProcess(controlSocket);
    const tunnelInfo: TunnelInfo = {
      resourceName,
      localPort,
      relayHost: relay.relayHost,
      relayPort: response.port,
      process
    };
    signal.throwIfAborted();
    listenForTunnelConnections({ process, request, signal });
    return tunnelInfo;
  } catch (error) {
    controlSocket.destroy();
    throw error;
  } finally {
    signal.removeEventListener('abort', abort);
  }
};

const refusalMessage = (resourceName: string, { label, since }: LeaseRefusedError['holder']) =>
  `${label} has been running dev mode for this stage since ${formatTimeWithZone(new Date(since * 1000))}, so deployed ` +
  `functions reach their local ${resourceName}, not yours. Yours takes over when that session stops; to take over now, ` +
  'run `stacktape dev` again with `--take-over`.';

/** What happens when another session holds the stage this session held: by default a warning; a dev session ends. */
export type StageLostHandler = (input: { label: string; resourceName: string }) => void;

let onStageLost: StageLostHandler = ({ label, resourceName }) =>
  tuiManager.warn(
    `${label} took over dev mode for this stage, so deployed functions now reach their local ${resourceName}, not yours.`
  );

/** Replaces the handler of a lost stage; `stacktape dev` ends its session there. */
export const setStageLostHandler = (handler: StageLostHandler) => {
  onStageLost = handler;
};

/**
 * Keeps asking for the tunnel until it is open again or dev mode stops. The relay and the SSM session come back on
 * their own after a network drop or a box restart, so there is no attempt limit. A tunnel this session `held` before
 * never takes the stage over: if another session holds it now, for example after this machine slept through a
 * take-over, the stage is lost.
 */
const reconnect = async (
  request: TunnelRequest,
  signal: AbortSignal,
  { warned: warnedAlready = false, held = false }: { warned?: boolean; held?: boolean } = {}
): Promise<void> => {
  const { resourceName } = request;
  if (reconnectingTunnels.has(resourceName)) return;
  reconnectingTunnels.add(resourceName);
  let warned = warnedAlready;
  try {
    for (let attempt = 1; !applicationManager.isInterrupted && !signal.aborted; attempt++) {
      try {
        const tunnel = await startTunnelAttempt(request, signal);
        if (signal.aborted) {
          tunnel.process.kill();
          return;
        }
        activeTunnels.push(tunnel);
        setupTunnelExitHandler(tunnel, request, signal);
        if (warned) tuiManager.success(`Tunnel for ${resourceName} is open again.`);
        return;
      } catch (error) {
        if (signal.aborted) return;
        if (error instanceof LeaseRefusedError) {
          if (held) {
            onStageLost({ label: error.holder.label, resourceName });
            return;
          }
          if (!warned) tuiManager.warn(refusalMessage(resourceName, error.holder));
          warned = true;
          await sleep(REFUSED_RETRY_MS, signal);
          continue;
        }
        if (!warned) {
          tuiManager.warn(`Tunnel for ${resourceName} is reconnecting: ${(error as Error).message}`);
          warned = true;
        }
        await sleep(Math.min(1000 * attempt, MAX_RECONNECT_DELAY_MS), signal);
      }
    }
  } catch (error) {
    if (!signal.aborted) throw error;
  } finally {
    reconnectingTunnels.delete(resourceName);
  }
};

const setupTunnelExitHandler = (tunnel: TunnelInfo, request: TunnelRequest, sessionSignal: AbortSignal): void => {
  tunnel.process.on('exit', (code) => {
    const index = activeTunnels.indexOf(tunnel);
    if (index !== -1) activeTunnels.splice(index, 1);
    if (applicationManager.isInterrupted || sessionSignal.aborted) return;
    if (tunnel.process.takenOverBy) {
      onStageLost({ label: tunnel.process.takenOverBy, resourceName: request.resourceName });
      return;
    }
    // `--take-over` applies to the first acquisition only: a later reconnect must not take the stage back.
    if (code !== 0 && code !== null) {
      void reconnect({ ...request, takeOver: false }, sessionSignal, { held: true }).catch(() => {});
    }
  });
};

/**
 * Opens the tunnel of one local resource at its leased relay port. A lease another session holds is not an error: the
 * tunnel is returned as `refused`, and this session takes the port over once that one stops. A tunnel that cannot open
 * rejects, and is asked for again in the background until dev mode stops.
 */
export const startTunnel = async (
  request: TunnelRequest
): Promise<{ tunnel: TunnelInfo } | { refused: LeaseRefusedError['holder'] }> => {
  if (tunnelSession.signal.aborted) tunnelSession = new AbortController();
  const signal = tunnelSession.signal;
  for (let attempt = 1; ; attempt++) {
    try {
      const tunnel = await startTunnelAttempt(request, signal);
      if (signal.aborted) {
        tunnel.process.kill();
        signal.throwIfAborted();
      }
      activeTunnels.push(tunnel);
      setupTunnelExitHandler(tunnel, request, signal);
      return { tunnel };
    } catch (error) {
      signal.throwIfAborted();
      if (error instanceof LeaseRefusedError) {
        tuiManager.warn(refusalMessage(request.resourceName, error.holder));
        void reconnect(request, signal, { warned: true }).catch(() => {});
        return { refused: error.holder };
      }
      if (attempt >= 3) {
        // The box or its SSM session may be on its way back, for example a box that stopped while this session started:
        // keep asking in the background, as for any lost tunnel.
        void reconnect(request, signal, { warned: true }).catch(() => {});
        throw new Error(`${(error as Error).message}. Stacktape keeps retrying in the background.`);
      }
      await sleep(1000 * attempt, signal);
    }
  }
};

/** Resolves with the relay's version once it answers through the forwarded control port. */
export const pingRelay = async (relay: Pick<RelayEndpoint, 'controlHost' | 'controlPort'>): Promise<number> => {
  const socket = await DelimitedSocket.connect({ host: relay.controlHost, port: relay.controlPort });
  try {
    await socket.send({ type: 'Ping' });
    const response = await socket.recv({ timeoutMs: NETWORK_TIMEOUT_MS * 2 });
    if (response?.type !== 'Pong') throw new Error('The dev box relay did not answer.');
    return response.version;
  } finally {
    socket.destroy();
  }
};

/**
 * The live sessions the relay knows, of one stack or of all. A relay older than version 2 does not know the message
 * and closes the connection, which rejects.
 */
export const listRelaySessions = async (
  relay: Pick<RelayEndpoint, 'controlHost' | 'controlPort'>,
  stack?: string
): Promise<RelaySessionInfo[]> => {
  const socket = await DelimitedSocket.connect({ host: relay.controlHost, port: relay.controlPort });
  try {
    await socket.send({ type: 'Sessions', stack });
    const response = await socket.recv({ timeoutMs: NETWORK_TIMEOUT_MS * 2 });
    if (response?.type !== 'Sessions') throw new Error('The dev box relay does not list its sessions.');
    return response.sessions;
  } finally {
    socket.destroy();
  }
};

/** The session that holds a stage, as the relay names it when it refuses a presence. */
export type RelayStageHolder = Pick<RelaySessionInfo, 'label' | 'since' | 'owner' | 'session'>;

/** How a presence connection ended, when the relay ended it: the stage is another session's. */
export type RelayPresenceOutcome = { takenOverBy: string } | { refusedBy: RelayStageHolder };

/**
 * Holds a presence connection: the box stays awake while it is open, also for a session without tunnels whose VPC
 * functions only need the box as NAT. With a stack, it holds that stage like a tunnel does (relay version 4): another
 * session's presence or tunnel of the stack refuses it, or with `takeOver` is replaced. `held` says this session held
 * the stage before, so a presence of an older CLI does not refuse its reconnect. `onHeld` runs once the relay accepted
 * it. Resolves when the connection ends, with the reason when the relay refused it or another session took
 * the stage over.
 */
export const holdRelayPresence = async ({
  relay,
  owner,
  stack,
  held = false,
  takeOver = false,
  signal,
  onHeld
}: {
  relay: Pick<RelayEndpoint, 'controlHost' | 'controlPort'>;
  owner: RelayOwner;
  stack?: string;
  held?: boolean;
  takeOver?: boolean;
  signal: AbortSignal;
  onHeld?: () => void;
}): Promise<RelayPresenceOutcome | undefined> => {
  const socket = await DelimitedSocket.connect({ host: relay.controlHost, port: relay.controlPort });
  const abort = () => socket.destroy();
  signal.addEventListener('abort', abort, { once: true });
  try {
    await socket.send({ type: 'Presence', owner, stack, held, takeOver });
    while (!signal.aborted) {
      const message = await socket.recv();
      if (!message) return undefined;
      if (message.type === 'Pong') onHeld?.();
      if (message.type === 'TakenOver') return { takenOverBy: message.label };
      if (message.type === 'Refused') {
        const { label, since, owner: holderOwner, session } = message;
        return { refusedBy: { label, since, owner: holderOwner, session } };
      }
    }
    return undefined;
  } finally {
    signal.removeEventListener('abort', abort);
    socket.destroy();
  }
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
