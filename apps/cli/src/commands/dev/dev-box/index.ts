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
 * The connection of one `stacktape dev` session to the dev box. `wake` starts a stopped box as early as possible;
 * `connect` waits for it, opens the SSM session to the relay and keeps a presence connection, so the box does not stop
 * itself while this session runs. After any loss (network drop, killed plugin, box restart) the supervisor ends the old
 * server-side session, starts the box again if it stopped, and reopens the session on the same local port, where the
 * tunnels reconnect on their own.
 */
export class DevBoxConnection {
  readonly #deps: DevBoxDependencies;
  readonly #network: DevNetwork;
  readonly #owner: RelayOwner;
  readonly #stopped = new AbortController();
  #wake: Promise<{ started: boolean }> | undefined;
  #session: RelaySession | undefined;
  #localPort: number | undefined;
  #status: DevBoxStatus | undefined;
  #onStatus: ((status: DevBoxStatus) => void) | undefined;

  constructor({ deps, network, owner }: { deps: DevBoxDependencies; network: DevNetwork; owner: RelayOwner }) {
    this.#deps = deps;
    this.#network = network;
    this.#owner = owner;
  }

  /** Starts the box if it is stopped. Safe to call early and more than once; `connect` awaits the same wake. */
  wake = () => {
    this.#wake ??= wakeDevBox({
      aws: this.#deps.aws,
      instanceId: this.#network.boxInstanceId,
      pollMs: this.#deps.pollMs,
      onStart: () => this.#setStatus({ phase: 'starting-box' })
    });
    // A failed wake is reported by `connect`; an unawaited early wake must not crash the process.
    this.#wake.catch(() => {});
    return this.#wake;
  };

  connect = async (): Promise<RelayEndpoint> => {
    await this.wake();
    this.#localPort = await this.#deps.findFreePort();
    const relay = await this.#open();
    void this.#supervise();
    return relay;
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
    this.#setStatus({ phase: 'connecting' });
    await waitForDevBoxOnline({ aws, instanceId, pollMs });
    this.#stopped.signal.throwIfAborted();
    this.#session = await openSession({
      instanceId,
      localPort: this.#localPort!,
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
        if (Date.now() > deadline) {
          await this.#session.kill().catch(() => {});
          throw new Error(`The dev box relay did not answer: ${(error as Error).message}`);
        }
        await delay(pollMs);
      }
    }
    this.#setStatus({ phase: 'ready', relay });
    return relay;
  };

  #supervise = async () => {
    const { signal } = this.#stopped;
    while (!signal.aborted && this.#session) {
      const session = this.#session;
      const presence = new AbortController();
      const presenceEnded = this.#deps
        .holdPresence({ relay: this.#endpoint(), owner: this.#owner, signal: presence.signal })
        .catch(() => {});
      await Promise.race([session.waitForExit(), presenceEnded]);
      presence.abort();
      if (signal.aborted) return;
      this.#setStatus({ phase: 'reconnecting', reason: 'the connection to the dev box was lost' });
      // A killed plugin leaves its server-side session open, and its agent keeps the old relay sockets: end it first.
      await session.kill().catch(() => {});
      this.#session = undefined;
      for (let attempt = 1; !signal.aborted; attempt++) {
        try {
          this.#wake = undefined;
          await this.wake();
          await this.#open();
          break;
        } catch (error) {
          if (signal.aborted) return;
          this.#setStatus({ phase: 'reconnecting', reason: (error as Error).message });
          await delay(Math.min(1000 * attempt, 5000));
        }
      }
    }
  };
}
