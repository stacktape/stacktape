import type { DevNetwork, DevNetworkAws } from '@domain-services/dev-network';
import type { RelayEndpoint, RelayOwner } from '../tunnel-manager';
import { setTimeout as delay } from 'node:timers/promises';
import { DEV_BOX_RELAY_CONTROL_PORT } from '@domain-services/dev-network/boot-script';
import { wakeDevBox, waitForDevBoxOnline } from '@domain-services/dev-network';

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
    signal: AbortSignal;
  }) => Promise<void>;
  /** Called with every new server-side session, so a later start can end one a killed CLI left open. */
  onSession?: (sessionId: string | undefined) => void;
  /** How long the relay may take to answer after the session opens: a first boot installs it. */
  relayTimeoutMs?: number;
  pollMs?: number;
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
  readonly #stopped = new AbortController();
  #ready: Promise<RelayEndpoint> | undefined;
  #session: RelaySession | undefined;
  #localPort: number | undefined;
  #status: DevBoxStatus | undefined;
  #onStatus: ((status: DevBoxStatus) => void) | undefined;

  constructor({ deps, network, owner }: { deps: DevBoxDependencies; network: DevNetwork; owner: RelayOwner }) {
    this.#deps = deps;
    this.#network = network;
    this.#owner = owner;
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

  stop = async () => {
    this.#stopped.abort();
    await this.#session?.kill().catch(() => {});
    this.#session = undefined;
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
    const presenceEnded = this.#deps
      .holdPresence({ relay: this.#endpoint(), owner: this.#owner, signal: presence.signal })
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
        if (signal.aborted) return;
        this.#setStatus({ phase: 'reconnecting', reason: (error as Error).message });
        await this.#endSession();
        await delay(Math.min(1000 * attempt++, 5000), undefined, { signal }).catch(() => {});
      }
    }
  };
}
