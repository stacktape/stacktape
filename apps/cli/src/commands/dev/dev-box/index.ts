import type { DevNetwork, DevNetworkAws } from '@domain-services/dev-network';
import type { RelayEndpoint, RelayOwner, RelayPresenceOutcome, RelayStageHolder } from '../tunnel-manager';
import { setTimeout as delay } from 'node:timers/promises';
import { DEV_BOX_RELAY_CONTROL_PORT } from '@domain-services/dev-network/boot-script';
import { updateDevBoxRelay, wakeDevBox, waitForDevBoxOnline } from '@domain-services/dev-network';
import { DEV_BOX_RELAY_VERSION } from '@domain-services/dev-network/relay-source';
import { type LocalPortReservation, reserveFreeLocalPort } from '@utils/ports';
import { SSM_TUNNEL_START_FAILURE_CODES, SsmPortForwardingTunnel } from '@utils/ssm-session';
import { pingRelay } from '../tunnel-manager';

const isPluginStartFailure = (error: unknown) =>
  SSM_TUNNEL_START_FAILURE_CODES.some((code) => code === (error as { code?: unknown } | undefined)?.code);

/** How many times one session tries to update a relay older than this CLI's before it runs on the older relay. */
const MAX_RELAY_UPDATE_ATTEMPTS = 3;

/** One SSM port-forwarding session from this machine to the relay's control port on the box. */
export type RelaySession = {
  readonly sessionId: string | undefined;
  waitForExit: () => Promise<void>;
  /** Stops the plugin and ends the server-side session. */
  kill: () => Promise<unknown>;
};

export type DevBoxStatus =
  | { phase: 'starting-box' }
  | { phase: 'network-update'; status: string }
  | { phase: 'connecting' }
  | {
      phase: 'ready';
      relay: RelayEndpoint;
      /** The box runs a relay older than this CLI's, because updating it failed (see `MAX_RELAY_UPDATE_ATTEMPTS`). */
      outdatedRelay?: { version: number; reason: string };
    }
  | { phase: 'reconnecting'; reason: string };

export type DevBoxDependencies = {
  aws: DevNetworkAws;
  openSession: (input: { instanceId: string; localPort: number; remotePort: number }) => Promise<RelaySession>;
  /**
   * Reserves the local port of the SSM session; the connection keeps it through reconnects and releases it when the
   * plugin cannot listen on it, and on `stop`.
   */
  reservePort: () => Promise<LocalPortReservation>;
  pingRelay: (relay: Pick<RelayEndpoint, 'controlHost' | 'controlPort'>) => Promise<number>;
  holdPresence: (input: {
    relay: Pick<RelayEndpoint, 'controlHost' | 'controlPort'>;
    owner: RelayOwner;
    stack?: string;
    held?: boolean;
    takeOver?: boolean;
    signal: AbortSignal;
    onHeld?: () => void;
  }) => Promise<RelayPresenceOutcome | undefined | void>;
  /**
   * Asked when the relay refuses this session's first presence because another session holds the stage: resolves true
   * to take the stage over (`--take-over`, or a holder whose process has exited), false to give up.
   */
  mayTakeOverStage?: (holder: RelayStageHolder) => Promise<boolean>;
  /**
   * Called once when this session loses its stage: another session took it over, or held it when this session's
   * presence was refused. The connection then holds no presence any more and waits for `stop`.
   */
  onStageLost?: (input: { label: string; since?: number; refused: boolean }) => void;
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
  /**
   * Called before this session restarts a relay older than this CLI's to install the network's relay (see
   * `updateDevBoxRelay`), with the running relay's version.
   */
  onRelayUpdate?: (version: number) => void;
  /** Installs the network's relay on the box; `updateDevBoxRelay` unless a test replaces it. */
  updateRelay?: () => Promise<void>;
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
  const reservation = await reserveFreeLocalPort();
  const session = await openDevBoxRelaySession({
    instanceId: network.boxInstanceId,
    localPort: reservation.port,
    remotePort: DEV_BOX_RELAY_CONTROL_PORT
  }).catch(async (error) => {
    await reservation.release();
    throw error;
  });
  const relay = { controlHost: '127.0.0.1', controlPort: reservation.port };
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
    await reservation.release();
  }
};

/**
 * The connection of one `stacktape dev` session to the dev box. `connect` starts as early as possible: it starts a
 * stopped box, waits for it, opens the SSM session to the relay and keeps a presence connection, so the box does not
 * stop itself while this session deploys and runs. Every attempt, the first one included, runs in one supervised loop:
 * after any failure or loss (network drop, killed plugin, a box that stopped) it ends the old server-side session,
 * starts the box again if it stopped, and reopens the session on the same reserved local port, where the tunnels
 * reconnect on their own. Only a plugin that could not listen on that port gets a new one: the next attempt reserves
 * another port, and the tunnels reach it through the shared endpoint. It retries until the session stops; the status
 * reports each failure as `reconnecting`.
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
  /** The local port of the SSM session, held across reconnects so that no other Stacktape process takes it. */
  #port: LocalPortReservation | undefined;
  /**
   * The one endpoint of this session. The tunnels keep the object `connect` resolved with, so a new local port after a
   * failed plugin start reaches them on their next reconnect.
   */
  readonly #relay: RelayEndpoint;
  #status: DevBoxStatus | undefined;
  #onStatus: ((status: DevBoxStatus) => void) | undefined;
  /** The relay accepted a presence of this session once: from then on, a refusal means the stage was lost. */
  #heldStage = false;
  #lostStage = false;
  /** How often this session tried to update the box's relay, and why the last attempt failed. */
  #relayUpdateAttempts = 0;
  #relayUpdateError: string | undefined;

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
    this.#relay = { controlHost: '127.0.0.1', controlPort: 0, relayHost: network.boxPrivateIp };
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
    await this.#releasePort();
  };

  #releasePort = async () => {
    const port = this.#port;
    this.#port = undefined;
    await port?.release().catch(() => {});
  };

  #waitUntilReleased = async () => {
    const { listSessions, releaseTimeoutMs = 5000, pollMs = 1000 } = this.#deps;
    if (!listSessions || !this.#stackName || !this.#port) return;
    const deadline = Date.now() + releaseTimeoutMs;
    while (Date.now() < deadline) {
      const sessions = await listSessions(this.#endpoint(), this.#stackName).catch(() => undefined);
      if (!sessions?.some(({ session }) => session === this.#owner.session)) return;
      await delay(Math.min(200, pollMs));
    }
  };

  #endpoint = (): RelayEndpoint => this.#relay;

  #open = async (): Promise<RelayEndpoint> => {
    const { aws, openSession, pingRelay, relayTimeoutMs = 5 * 60_000, pollMs = 1000 } = this.#deps;
    const instanceId = this.#network.boxInstanceId;
    const { stackName } = this.#network;
    const onStart = () => this.#setStatus({ phase: 'starting-box' });
    const onNetworkUpdate = (status: string) => this.#setStatus({ phase: 'network-update', status });
    // Every attempt reads the instance state again: a box that ran a minute ago may have stopped itself since.
    await wakeDevBox({ aws, instanceId, stackName, pollMs, onStart, onNetworkUpdate });
    this.#setStatus({ phase: 'connecting' });
    await waitForDevBoxOnline({ aws, instanceId, stackName, pollMs, onStart, onNetworkUpdate });
    this.#stopped.signal.throwIfAborted();
    if (!this.#port) {
      const port = await this.#deps.reservePort();
      // `stop` ran meanwhile and released nothing: this reservation is the last one.
      if (this.#stopped.signal.aborted) {
        await port.release().catch(() => {});
        this.#stopped.signal.throwIfAborted();
      }
      this.#port = port;
      this.#relay.controlPort = port.port;
    }
    try {
      this.#session = await openSession({
        instanceId,
        localPort: this.#port.port,
        remotePort: DEV_BOX_RELAY_CONTROL_PORT
      });
    } catch (error) {
      // The plugin did not listen on the port: another program may hold it, and retrying the same port would fail the
      // same way. Concurrent starts that picked one port left a session reconnecting for good.
      if (isPluginStartFailure(error)) await this.#releasePort();
      throw error;
    }
    this.#deps.onSession?.(this.#session.sessionId);
    const relay = this.#endpoint();
    const deadline = Date.now() + relayTimeoutMs;
    // The relay is pinged through the session. A session that ends meanwhile cannot answer any more, for example when
    // the box's profile watcher restarts the SSM agent right after the box gets its instance profile: the attempt ends
    // at once and `#run` opens a new session, instead of pinging a dead session until `relayTimeoutMs`.
    let sessionEnded = false;
    const ended = this.#session.waitForExit().then(() => {
      sessionEnded = true;
    });
    const ping = async (minimumVersion = 0) => {
      for (;;) {
        this.#stopped.signal.throwIfAborted();
        if (sessionEnded) throw new Error('The SSM session to the dev box ended before its relay answered.');
        try {
          const version = await pingRelay(relay);
          if (version >= minimumVersion) return version;
          throw new Error(`it still runs version ${version}`);
        } catch (error) {
          if (Date.now() > deadline) throw new Error(`The dev box relay did not answer: ${(error as Error).message}`);
          await Promise.race([delay(pollMs), ended]);
        }
      }
    };
    const version = await ping();
    // The network carries the relay of this CLI or a newer one (`ensureDevNetwork`), but a box keeps running the relay
    // it started with until its relay service restarts. A failed update is retried with the next connection attempts;
    // after the last one the session runs on the older relay and says so, and the next session tries again.
    if (version < DEV_BOX_RELAY_VERSION && this.#relayUpdateAttempts < MAX_RELAY_UPDATE_ATTEMPTS) {
      this.#relayUpdateAttempts++;
      this.#deps.onRelayUpdate?.(version);
      try {
        await (this.#deps.updateRelay ?? (() => updateDevBoxRelay({ aws, network: this.#network })))();
        await ping(DEV_BOX_RELAY_VERSION);
      } catch (error) {
        this.#relayUpdateError = (error as Error).message;
        throw new Error(`Updating the dev box relay from version ${version} failed: ${this.#relayUpdateError}`);
      }
      this.#relayUpdateError = undefined;
      this.#setStatus({ phase: 'ready', relay });
      return relay;
    }
    this.#setStatus({
      phase: 'ready',
      relay,
      ...(version < DEV_BOX_RELAY_VERSION
        ? { outdatedRelay: { version, reason: this.#relayUpdateError ?? 'the update did not take effect' } }
        : {})
    });
    return relay;
  };

  /**
   * Holds the presence connection until the session or the presence ends, or until the stage is another session's.
   * Only a first presence that the relay refused may take the stage over, and only when `mayTakeOverStage` allows it: a
   * session that held the stage and finds it held by another after a lost connection never takes it back.
   */
  #hold = async (session: RelaySession) => {
    for (let takeOver = false; ; takeOver = true) {
      const presence = new AbortController();
      this.#presence = presence;
      const result: { outcome?: RelayPresenceOutcome } = {};
      const presenceEnded = this.#deps
        .holdPresence({
          relay: this.#endpoint(),
          owner: this.#owner,
          stack: this.#stackName,
          held: this.#heldStage,
          takeOver,
          signal: presence.signal,
          onHeld: () => (this.#heldStage = true)
        })
        .then(
          (outcome) => (result.outcome = outcome || undefined),
          () => {}
        );
      await Promise.race([session.waitForExit(), presenceEnded]);
      presence.abort();
      const { outcome } = result;
      if (!outcome || this.#stopped.signal.aborted) return;
      if ('refusedBy' in outcome && !this.#heldStage && !takeOver) {
        const mayTakeOver = (await this.#deps.mayTakeOverStage?.(outcome.refusedBy)) ?? false;
        if (this.#stopped.signal.aborted) return;
        if (mayTakeOver) continue;
      }
      this.#lostStage = true;
      this.#deps.onStageLost?.(
        'takenOverBy' in outcome
          ? { label: outcome.takenOverBy, refused: false }
          : { label: outcome.refusedBy.label, since: outcome.refusedBy.since, refused: !this.#heldStage }
      );
      return;
    }
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
        if (this.#lostStage) {
          // The session ends on its own (`onStageLost`); a new presence would only be refused.
          await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
          return;
        }
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
