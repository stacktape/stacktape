import type { DevNetwork, DevNetworkAws } from '@domain-services/dev-network';
import type { RelayEndpoint, RelayOwner } from '../tunnel-manager';
import { setTimeout as delay } from 'node:timers/promises';
import { DEV_BOX_RELAY_CONTROL_PORT } from '@domain-services/dev-network/boot-script';
import { wakeDevBox, waitForDevBoxOnline } from '@domain-services/dev-network';
import { SsmPortForwardingTunnel } from '@utils/ssm-session';
import findFreePorts from 'find-free-ports';
import { pingRelay } from '../tunnel-manager';

/** One SSM port-forwarding session from this machine to the relay's control port on the box. */
export type RelaySession = {
  readonly sessionId: string | undefined;
  waitForExit: () => Promise<void>;
  /** Stops the plugin and ends the server-side session. */
  kill: () => Promise<unknown>;
};

export type DevBoxStatus =
  | { phase: 'starting-box' }
  | { phase: 'connecting' }
  | { phase: 'ready'; relay: RelayEndpoint }
  | { phase: 'reconnecting'; reason: string };

export type DevBoxDependencies = {
  aws: DevNetworkAws;
  openSession: (input: { instanceId: string; localPort: number; remotePort: number }) => Promise<RelaySession>;
  findFreePort: () => Promise<number>;
  pingRelay: (relay: Pick<RelayEndpoint, 'controlHost' | 'controlPort'>) => Promise<number>;
  holdPresence: (input: {
    relay: Pick<RelayEndpoint, 'controlHost' | 'controlPort'>;
    owner: RelayOwner;
    stack?: string;
    signal: AbortSignal;
  }) => Promise<void>;
  /** Lists the relay's sessions of a stack; `stop` waits with it until the relay has let go of this session. */
  listSessions?: (
    relay: Pick<RelayEndpoint, 'controlHost' | 'controlPort'>,
    stack: string
  ) => Promise<Array<{ session: string }>>;
  /** How long `stop` waits for the relay to let go of this session before it ends the SSM session anyway. */
  releaseTimeoutMs?: number;
  /** Called with every new server-side session, so a later start can end one a killed CLI left open. */
  onSession?: (sessionId: string | undefined) => void;
  /** How long the relay may take to answer after the session opens: a first boot installs it. */
  relayTimeoutMs?: number;
  pollMs?: number;
};

/** Opens an SSM port-forwarding session from `localPort` on this machine to the relay's control port on the box. */
export const openDevBoxRelaySession = async ({
  instanceId,
  localPort,
  remotePort
}: {
  instanceId: string;
  localPort: number;
  remotePort: number;
}): Promise<RelaySession> => {
  const tunnel = new SsmPortForwardingTunnel({
    localPort,
    targetInfo: {
      bastionInstanceId: instanceId,
      remoteHost: '127.0.0.1',
      remotePort,
      label: 'dev box relay',
      targetStpName: 'devBox'
    }
  });
  try {
    await tunnel.connect();
  } catch (error) {
    await tunnel.kill().catch(() => {});
    throw error;
  }
  return tunnel;
};

/**
 * Runs one request against the relay of a box that runs or starts, through a short SSM session that holds no presence,
 * so the request does not keep the box awake. Does not start a stopped box.
 */
export const queryDevBoxRelay = async <T>({
  aws,
  network,
  request,
  timeoutMs = 90_000
}: {
  aws: DevNetworkAws;
  network: DevNetwork;
  request: (relay: Pick<RelayEndpoint, 'controlHost' | 'controlPort'>) => Promise<T>;
  timeoutMs?: number;
}): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  await waitForDevBoxOnline({
    aws,
    instanceId: network.boxInstanceId,
    timeoutMs,
    onStart: () => {
      throw new Error('the dev box stopped');
    }
  });
  const localPort = (await findFreePorts(1))[0];
  const session = await openDevBoxRelaySession({
    instanceId: network.boxInstanceId,
    localPort,
    remotePort: DEV_BOX_RELAY_CONTROL_PORT
  });
  const relay = { controlHost: '127.0.0.1', controlPort: localPort };
  try {
    for (;;) {
      try {
        await pingRelay(relay);
        break;
      } catch (error) {
        if (Date.now() > deadline) throw new Error(`the dev box relay did not answer: ${(error as Error).message}`);
        await delay(1000);
      }
    }
    return await request(relay);
  } finally {
    await session.kill().catch(() => {});
  }
};

/**
 * The connection of one `stacktape dev` session to the dev box. `connect` starts as early as possible: it starts a
 * stopped box, waits for it, opens the SSM session to the relay and keeps a presence connection, so the box does not
 * stop itself while this session deploys and runs. Every attempt, the first one included, runs in one supervised loop:
 * after any failure or loss (network drop, killed plugin, a box that stopped) it ends the old server-side session,
 * starts the box again if it stopped, and reopens the session on the same local port, where the tunnels reconnect on
 * their own. It retries until the session stops; the status reports each failure as `reconnecting`.
 */
export class DevBoxConnection {
  readonly #deps: DevBoxDependencies;
  readonly #network: DevNetwork;
  readonly #owner: RelayOwner;
  readonly #stackName: string | undefined;
  readonly #stopped = new AbortController();
  #ready: Promise<RelayEndpoint> | undefined;
  #session: RelaySession | undefined;
  #presence: AbortController | undefined;
  #localPort: number | undefined;
  #status: DevBoxStatus | undefined;
  #onStatus: ((status: DevBoxStatus) => void) | undefined;

  constructor({
    deps,
    network,
    owner,
    stackName
  }: {
    deps: DevBoxDependencies;
    network: DevNetwork;
    owner: RelayOwner;
    /** The dev stack this session runs; its presence connection names it, so the stage's other sessions find it. */
    stackName?: string;
  }) {
    this.#deps = deps;
    this.#network = network;
    this.#owner = owner;
    this.#stackName = stackName;
  }

  /**
   * Starts the connection once and resolves with the relay when it is first ready. A failed attempt does not reject:
   * it is retried in the background. Rejects only when the session stops first.
   */
  connect = (): Promise<RelayEndpoint> => {
    if (!this.#ready) {
      this.#ready = new Promise((resolve, reject) => {
        void this.#run(resolve).then(() => reject(new Error('The dev session stopped.')), reject);
      });
      // A caller that starts the connection early awaits it later; an unawaited rejection must not crash the process.
      this.#ready.catch(() => {});
    }
    return this.#ready;
  };

  get sessionId() {
    return this.#session?.sessionId;
  }

  /** The latest status, for a display that starts after the connection did. */
  get status() {
    return this.#status;
  }

  /** Replaces the status listener; the new one receives the current status at once. */
  set onStatus(listener: ((status: DevBoxStatus) => void) | undefined) {
    this.#onStatus = listener;
    if (this.#status) listener?.(this.#status);
  }

  #setStatus = (status: DevBoxStatus) => {
    this.#status = status;
    this.#onStatus?.(status);
  };

  /**
   * Ends the presence connection, waits until the relay no longer lists this session, and only then ends the SSM
   * session. Killing the SSM session first left the relay holding the session's connections until SSM noticed, and a
   * start right after the stop was refused because the stopped session still seemed to hold the stage. The tunnels
   * close at the same time, in their own cleanup.
   */
  stop = async () => {
    const wasReady = this.#status?.phase === 'ready';
    this.#stopped.abort();
    this.#presence?.abort();
    if (wasReady && this.#session) await this.#waitUntilReleased();
    await this.#session?.kill().catch(() => {});
    this.#session = undefined;
  };

  #waitUntilReleased = async () => {
    const { listSessions, releaseTimeoutMs = 5000, pollMs = 1000 } = this.#deps;
    if (!listSessions || !this.#stackName || this.#localPort === undefined) return;
    const deadline = Date.now() + releaseTimeoutMs;
    while (Date.now() < deadline) {
      const sessions = await listSessions(this.#endpoint(), this.#stackName).catch(() => undefined);
      if (!sessions?.some(({ session }) => session === this.#owner.session)) return;
      await delay(Math.min(200, pollMs));
    }
  };

  #endpoint = (): RelayEndpoint => ({
    controlHost: '127.0.0.1',
    controlPort: this.#localPort!,
    relayHost: this.#network.boxPrivateIp
  });

  #open = async (): Promise<RelayEndpoint> => {
    const { aws, openSession, pingRelay, relayTimeoutMs = 5 * 60_000, pollMs = 1000 } = this.#deps;
    const instanceId = this.#network.boxInstanceId;
    const onStart = () => this.#setStatus({ phase: 'starting-box' });
    // Every attempt reads the instance state again: a box that ran a minute ago may have stopped itself since.
    await wakeDevBox({ aws, instanceId, pollMs, onStart });
    this.#setStatus({ phase: 'connecting' });
    await waitForDevBoxOnline({ aws, instanceId, pollMs, onStart });
    this.#stopped.signal.throwIfAborted();
    this.#localPort ??= await this.#deps.findFreePort();
    this.#session = await openSession({
      instanceId,
      localPort: this.#localPort,
      remotePort: DEV_BOX_RELAY_CONTROL_PORT
    });
    this.#deps.onSession?.(this.#session.sessionId);
    const relay = this.#endpoint();
    const deadline = Date.now() + relayTimeoutMs;
    for (;;) {
      this.#stopped.signal.throwIfAborted();
      try {
        await pingRelay(relay);
        break;
      } catch (error) {
        if (Date.now() > deadline) throw new Error(`The dev box relay did not answer: ${(error as Error).message}`);
        await delay(pollMs);
      }
    }
    this.#setStatus({ phase: 'ready', relay });
    return relay;
  };

  /** Holds the presence connection until the session or the presence ends. */
  #hold = async (session: RelaySession) => {
    const presence = new AbortController();
    this.#presence = presence;
    const presenceEnded = this.#deps
      .holdPresence({ relay: this.#endpoint(), owner: this.#owner, stack: this.#stackName, signal: presence.signal })
      .catch(() => {});
    await Promise.race([session.waitForExit(), presenceEnded]);
    presence.abort();
  };

  /** Ends the server-side session too: a killed plugin leaves it open, and its agent keeps the old relay sockets. */
  #endSession = async () => {
    await this.#session?.kill().catch(() => {});
    this.#session = undefined;
  };

  /** Connects, holds and reconnects until the session stops. `onReady` receives the relay of every ready connection. */
  #run = async (onReady: (relay: RelayEndpoint) => void) => {
    const { signal } = this.#stopped;
    for (let attempt = 1; !signal.aborted;) {
      try {
        const relay = await this.#open();
        attempt = 1;
        onReady(relay);
        await this.#hold(this.#session!);
        if (signal.aborted) return;
        this.#setStatus({ phase: 'reconnecting', reason: 'the connection to the dev box was lost' });
        await this.#endSession();
      } catch (error) {
        // A stop while a session was opening finds no session to end yet: end the one that opened meanwhile.
        if (signal.aborted) return this.#endSession();
        this.#setStatus({ phase: 'reconnecting', reason: (error as Error).message });
        await this.#endSession();
        await delay(Math.min(1000 * attempt++, 5000), undefined, { signal }).catch(() => {});
      }
    }
  };
}
