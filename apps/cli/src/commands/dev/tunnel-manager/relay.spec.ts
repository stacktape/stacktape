import { afterAll, beforeAll, expect, test } from 'bun:test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection, createServer, type AddressInfo, type Server, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applicationManager } from '@application-services/application-manager';
import type { DevNetworkAws } from '@domain-services/dev-network';
import { DEV_BOX_RELAY_SOURCE } from '@domain-services/dev-network/relay-source';
import { DevBoxConnection } from '../dev-box';
import {
  getActiveTunnels,
  holdRelayPresence,
  listRelaySessions,
  pingRelay,
  registerTunnelCleanupHook,
  setStageLostHandler,
  startTunnel
} from './index';

// The relay the dev box runs, under the Python 3 of this machine (the box has 3.9), driven by the CLI's own client.
// Tunnel ports listen on loopback here instead of the box's private IP.

const waitFor = async (description: string, ready: () => boolean | Promise<boolean>, timeout = 10_000) => {
  const deadline = Date.now() + timeout;
  while (!(await ready())) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${description}.`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

const freePort = async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
};

let directory: string;
let relayProcess: ChildProcess | undefined;
let relayOutput = '';
let controlPort: number;
let database: Server;
const databaseSockets = new Set<Socket>();
const stoppedFile = () => join(directory, 'stopped');

const startRelay = async ({ idleSeconds, env = {} }: { idleSeconds: number; env?: Record<string, string> }) => {
  relayProcess = spawn('python3', [join(directory, 'relay.py'), '127.0.0.1'], {
    env: {
      ...env,
      PATH: process.env.PATH,
      STACKTAPE_RELAY_CONTROL_PORT: String(controlPort),
      STACKTAPE_RELAY_IDLE_SECONDS: String(idleSeconds),
      STACKTAPE_RELAY_HEARTBEAT_SECONDS: '0.2',
      STACKTAPE_RELAY_SHUTDOWN_COMMAND: `touch ${stoppedFile()}`
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  relayProcess.stdout!.on('data', (chunk) => (relayOutput += String(chunk)));
  relayProcess.stderr!.on('data', (chunk) => (relayOutput += String(chunk)));
  await waitFor('the relay to answer', () =>
    pingRelay({ controlHost: '127.0.0.1', controlPort }).then(
      () => true,
      () => false
    )
  );
};

const stopRelay = async () => {
  if (!relayProcess || relayProcess.exitCode !== null || relayProcess.signalCode !== null) return;
  const exited = new Promise((resolve) => relayProcess!.once('exit', resolve));
  relayProcess.kill('SIGKILL');
  await exited;
};

const relay = () => ({ controlHost: '127.0.0.1', controlPort, relayHost: '127.0.0.1' });
const alice = { id: 'user-alice', label: 'Alice (alice-laptop)', session: 'alice-laptop-session' };
const bob = { id: 'user-bob', label: 'Bob (bob-laptop)', session: 'bob-laptop-session' };

/** One request through a tunnel port: the local database echoes it with a prefix, binary bytes included. */
const query = (port: number, payload: Buffer) =>
  new Promise<Buffer>((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port }, () => socket.write(payload));
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`no answer through relay port ${port}`));
    }, 3000);
    socket.once('data', (data: Buffer) => {
      clearTimeout(timer);
      socket.destroy();
      resolve(data);
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

/** A connection a warm function keeps open, like a database pool: the answers it receives, and whether it closed. */
const pooledConnection = async (port: number) => {
  const socket = createConnection({ host: '127.0.0.1', port });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });
  const state = { answers: [] as string[], closed: false };
  socket.on('data', (data) => state.answers.push(String(data)));
  socket.on('close', () => (state.closed = true));
  socket.on('error', () => {});
  return { socket, state };
};

/**
 * A client of relay version 1, which knows nothing of `TakenOver`: it pipes every connection to the database and
 * never closes one itself, so only the relay can end them.
 */
const versionOneClient = async ({ port, key, owner }: { port: number; key: string; owner: string }) => {
  const control = createConnection({ host: '127.0.0.1', port: controlPort });
  control.on('error', () => {});
  control.write(`${JSON.stringify({ Lease: { port, key, owner, label: owner } })}\0`);
  let buffer = '';
  const hello = new Promise<void>((resolve) => {
    control.on('data', (chunk) => {
      buffer += String(chunk);
      let end: number;
      while ((end = buffer.indexOf('\0')) !== -1) {
        const message = JSON.parse(buffer.slice(0, end));
        buffer = buffer.slice(end + 1);
        if (message?.Hello) resolve();
        if (message?.Connection) {
          const accept = createConnection({ host: '127.0.0.1', port: controlPort }, () => {
            accept.write(`${JSON.stringify({ Accept: message.Connection })}\0`);
            const local = createConnection({ host: '127.0.0.1', port: (database.address() as AddressInfo).port });
            local.on('error', () => {});
            accept.on('error', () => {});
            accept.pipe(local).pipe(accept);
          });
        }
      }
    });
  });
  await hello;
  return control;
};

beforeAll(async () => {
  const python = spawnSync('python3', ['-c', 'import sys; assert sys.version_info >= (3, 9)']);
  if (python.status !== 0) throw new Error('These tests need Python 3.9 or newer as `python3`.');
  directory = await mkdtemp(join(tmpdir(), 'stacktape-relay-'));
  await writeFile(join(directory, 'relay.py'), DEV_BOX_RELAY_SOURCE);
  controlPort = await freePort();
  database = createServer((socket) => {
    databaseSockets.add(socket);
    socket.once('close', () => databaseSockets.delete(socket));
    socket.on('data', (data: Buffer) => socket.write(Buffer.concat([Buffer.from('db:'), data])));
  });
  await new Promise<void>((resolve) => database.listen(0, '127.0.0.1', resolve));
  registerTunnelCleanupHook();
});

afterAll(async () => {
  await Promise.all(applicationManager.cleanUpHooks.map((hook) => hook({ success: true, interrupted: false })));
  await stopRelay();
  for (const socket of databaseSockets) socket.destroy();
  await new Promise<void>((resolve) => database.close(() => resolve()));
  await rm(directory, { recursive: true, force: true });
});

const cleanUpTunnels = () =>
  Promise.all(applicationManager.cleanUpHooks.map((hook) => hook({ success: true, interrupted: false })));

test('a leased tunnel carries binary database traffic, refuses another developer and is taken over by its owner', async () => {
  await startRelay({ idleSeconds: 3600 });
  const leasePort = await freePort();
  const localPort = (database.address() as AddressInfo).port;
  const lease = { port: leasePort, key: 'shop-dev/db' };
  const opened = await startTunnel({ resourceName: 'db', localPort, lease, owner: alice, relay: relay() });
  expect('tunnel' in opened && opened.tunnel.relayPort).toBe(leasePort);
  // A zero byte is the relay's frame delimiter: database bytes must pass through untouched after Accept.
  expect(String(await query(leasePort, Buffer.from([113, 0, 117, 101, 114, 121])))).toBe('db:q\0uery');

  // Another developer on the same stage is refused and told who holds the port.
  const refused = await startTunnel({ resourceName: 'db', localPort, lease, owner: bob, relay: relay() });
  expect(refused).toMatchObject({ refused: { label: alice.label, key: lease.key } });

  // The same developer, back after a lost session, takes the port over at once.
  const tookOver = await startTunnel({ resourceName: 'db', localPort, lease, owner: alice, relay: relay() });
  expect('tunnel' in tookOver).toBe(true);
  expect(String(await query(leasePort, Buffer.from('select 1')))).toBe('db:select 1');
  await cleanUpTunnels();
  expect(getActiveTunnels()).toHaveLength(0);
  await stopRelay();
}, 30_000);

test('a second session of the stage is refused for every port, and --take-over moves all of them at once', async () => {
  // The same Stacktape user in two worktrees, or on a laptop and a desktop: one owner, two `stacktape dev` processes.
  const laptop = alice;
  const desktop = { ...alice, label: 'Alice (alice-laptop, ~/shop-wt2)', session: 'alice-worktree-2' };
  await startRelay({ idleSeconds: 3600 });
  relayOutput = '';
  const [dbPort, cachePort, searchPort] = [await freePort(), await freePort(), await freePort()];
  const localPort = (database.address() as AddressInfo).port;
  const lease = (port: number, resource: string) => ({ port, key: `shop-dev/${resource}` });
  const presence = new AbortController();
  const held = holdRelayPresence({ relay: relay(), owner: laptop, stack: 'shop-dev', signal: presence.signal });
  for (const [port, resource] of [
    [dbPort, 'db'],
    [cachePort, 'cache']
  ] as const) {
    const opened = await startTunnel({
      resourceName: resource,
      localPort,
      lease: lease(port, resource),
      owner: laptop,
      relay: relay()
    });
    expect('tunnel' in opened).toBe(true);
  }

  // The stage check of `stacktape dev` finds the laptop's session, once, from its tunnels and its presence.
  await waitFor('the presence to register', async () => (await listRelaySessions(relay(), 'shop-dev')).length > 0);
  expect(await listRelaySessions(relay(), 'shop-dev')).toEqual([
    { stack: 'shop-dev', session: laptop.session, owner: laptop.id, label: laptop.label, since: expect.any(Number) }
  ]);
  expect(await listRelaySessions(relay(), 'other-dev')).toEqual([]);

  // Refused for a held port, and for a port of the stage nobody holds yet: the stage's databases are never split.
  for (const [port, resource] of [
    [dbPort, 'db'],
    [searchPort, 'search']
  ] as const) {
    const refused = await startTunnel({
      resourceName: resource,
      localPort,
      lease: lease(port, resource),
      owner: desktop,
      relay: relay()
    });
    expect(refused).toMatchObject({ refused: { label: laptop.label } });
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));
  expect(relayOutput).not.toContain('taken over');
  expect(getActiveTunnels()).toHaveLength(2);

  // One take-over lease replaces every tunnel of the stage; the laptop is told and does not ask for the ports again.
  const laptopTunnels = getActiveTunnels();
  const tookOver = await startTunnel({
    resourceName: 'db',
    localPort,
    lease: lease(dbPort, 'db'),
    owner: desktop,
    relay: relay(),
    takeOver: true
  });
  expect('tunnel' in tookOver).toBe(true);
  await waitFor('the laptop to learn about the take-over', () =>
    laptopTunnels.every(({ process }) => process.takenOverBy === desktop.label)
  );
  await new Promise((resolve) => setTimeout(resolve, 1500));
  // Both ports and the laptop's presence.
  expect(relayOutput.match(/taken over by/g)).toHaveLength(3);
  expect(await held).toEqual({ takenOverBy: desktop.label });
  expect(getActiveTunnels()).toEqual([('tunnel' in tookOver && tookOver.tunnel) as never]);
  expect(String(await query(dbPort, Buffer.from('select 2')))).toBe('db:select 2');

  presence.abort();
  await cleanUpTunnels();
  await stopRelay();
}, 30_000);

test('a take-over closes the connections the old holder carries, also for a client that ignores TakenOver', async () => {
  await startRelay({ idleSeconds: 3600 });
  const leasePort = await freePort();
  const localPort = (database.address() as AddressInfo).port;
  const oldClient = await versionOneClient({ port: leasePort, key: 'shop-dev/db', owner: 'user-old' });
  const pool = await pooledConnection(leasePort);
  pool.socket.write('first');
  await waitFor('the pooled answer', () => pool.state.answers.includes('db:first'));

  const tookOver = await startTunnel({
    resourceName: 'db',
    localPort,
    lease: { port: leasePort, key: 'shop-dev/db' },
    owner: bob,
    relay: relay(),
    takeOver: true
  });
  expect('tunnel' in tookOver).toBe(true);
  // The pooled connection ends, so the function's pool reconnects, and reaches the new holder.
  await waitFor('the pooled connection to close', () => pool.state.closed, 5000);
  expect(String(await query(leasePort, Buffer.from('second')))).toBe('db:second');
  oldClient.destroy();
  await cleanUpTunnels();
  await stopRelay();
}, 30_000);

test('the replaced session drops its connections and ends; concurrent leases of two sessions never split a stage', async () => {
  await startRelay({ idleSeconds: 3600 });
  const localPort = (database.address() as AddressInfo).port;
  const lost: string[] = [];
  setStageLostHandler(({ label }) => lost.push(label));
  try {
    const leasePort = await freePort();
    const opened = await startTunnel({
      resourceName: 'db',
      localPort,
      lease: { port: leasePort, key: 'shop-dev/db' },
      owner: alice,
      relay: relay()
    });
    expect('tunnel' in opened).toBe(true);
    const pool = await pooledConnection(leasePort);
    pool.socket.write('first');
    await waitFor('the pooled answer', () => pool.state.answers.includes('db:first'));
    const [aliceTunnel] = getActiveTunnels();
    await startTunnel({
      resourceName: 'db',
      localPort,
      lease: { port: leasePort, key: 'shop-dev/db' },
      owner: bob,
      relay: relay(),
      takeOver: true
    });
    await waitFor('the pooled connection to close', () => pool.state.closed, 5000);
    await waitFor('the session to learn it lost the stage', () => lost.includes(bob.label));
    expect(aliceTunnel.process.connections.size).toBe(0);
    await cleanUpTunnels();

    // Two sessions lease different ports of one stage at the same moment: one gets the stage, the other is refused.
    for (let round = 0; round < 10; round++) {
      const stack = `race-${round}`;
      const results = await Promise.all(
        [alice, bob].map(async (owner) =>
          startTunnel({
            resourceName: owner === alice ? 'db' : 'cache',
            localPort,
            lease: { port: await freePort(), key: `${stack}/${owner === alice ? 'db' : 'cache'}` },
            owner,
            relay: relay()
          })
        )
      );
      expect(results.filter((result) => 'tunnel' in result)).toHaveLength(1);
      expect(results.filter((result) => 'refused' in result)).toHaveLength(1);
      await cleanUpTunnels();
    }
  } finally {
    setStageLostHandler(() => {});
    await cleanUpTunnels();
    await stopRelay();
  }
}, 60_000);

test('a session that took the stage over does not take it back when it reconnects', async () => {
  // Bob took the stage over, then his machine slept: his tunnel is gone, and Alice holds the stage when he wakes.
  await startRelay({ idleSeconds: 3600 });
  const localPort = (database.address() as AddressInfo).port;
  const lost: string[] = [];
  setStageLostHandler(({ label }) => lost.push(label));
  try {
    const leasePort = await freePort();
    const lease = { port: leasePort, key: 'shop-dev/db' };
    expect(
      'tunnel' in
        (await startTunnel({ resourceName: 'db', localPort, lease, owner: bob, relay: relay(), takeOver: true }))
    ).toBe(true);
    await stopRelay();
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await startRelay({ idleSeconds: 3600 });
    relayOutput = '';
    expect(
      'tunnel' in (await startTunnel({ resourceName: 'db', localPort, lease, owner: alice, relay: relay() }))
    ).toBe(true);
    await waitFor('Bob to learn he lost the stage', () => lost.includes(alice.label), 15_000);
    expect(relayOutput).not.toContain('taken over');
    expect(String(await query(leasePort, Buffer.from('still alice')))).toBe('db:still alice');
  } finally {
    setStageLostHandler(() => {});
    await cleanUpTunnels();
    await stopRelay();
  }
}, 40_000);

// r2rr bug hunt, finding 8: a stage whose functions only use the box as NAT has a presence and no tunnel, and a
// take-over left the replaced session running, where it could redeploy functions over the new holder's.
test('a presence holds its stage: another session is refused, and a take-over ends the old presence', async () => {
  await startRelay({ idleSeconds: 3600 });
  try {
    const aliceStop = new AbortController();
    let aliceHeld = false;
    const alicePresence = holdRelayPresence({
      relay: relay(),
      owner: alice,
      stack: 'vpc-dev',
      signal: aliceStop.signal,
      onHeld: () => (aliceHeld = true)
    });
    await waitFor('the first presence to be held', () => aliceHeld);

    // Refused, and told who holds the stage, so a start can tell an exited holder from a live one.
    const refused = await holdRelayPresence({
      relay: relay(),
      owner: bob,
      stack: 'vpc-dev',
      signal: new AbortController().signal
    });
    expect(refused).toEqual({
      refusedBy: { label: alice.label, since: expect.any(Number), owner: alice.id, session: alice.session }
    });
    // Another stack, and the same session reconnecting, are not affected.
    const other = new AbortController();
    let otherHeld = false;
    const otherPresence = holdRelayPresence({
      relay: relay(),
      owner: bob,
      stack: 'other-dev',
      signal: other.signal,
      onHeld: () => (otherHeld = true)
    });
    await waitFor('the other stack to be held', () => otherHeld);

    const bobStop = new AbortController();
    let bobHeld = false;
    const bobPresence = holdRelayPresence({
      relay: relay(),
      owner: bob,
      stack: 'vpc-dev',
      takeOver: true,
      signal: bobStop.signal,
      onHeld: () => (bobHeld = true)
    });
    expect(await alicePresence).toEqual({ takenOverBy: bob.label });
    await waitFor('the take-over to be held', () => bobHeld);
    expect((await listRelaySessions(relay(), 'vpc-dev')).map(({ session }) => session)).toEqual([bob.session]);

    // A lease of another session is refused by the presence too, and a lease take-over ends it.
    const localPort = (database.address() as AddressInfo).port;
    const lease = { port: await freePort(), key: 'vpc-dev/db' };
    expect(await startTunnel({ resourceName: 'db', localPort, lease, owner: alice, relay: relay() })).toMatchObject({
      refused: { label: bob.label }
    });
    expect(
      'tunnel' in
        (await startTunnel({ resourceName: 'db', localPort, lease, owner: alice, relay: relay(), takeOver: true }))
    ).toBe(true);
    expect(await bobPresence).toEqual({ takenOverBy: alice.label });
    other.abort();
    await otherPresence;
  } finally {
    await cleanUpTunnels();
    await stopRelay();
  }
}, 30_000);

/** A presence of a CLI before relay version 4: not exclusive, and it ignores every message. */
const legacyPresence = async (owner: typeof alice, stack: string) => {
  const socket = createConnection({ host: '127.0.0.1', port: controlPort });
  socket.on('error', () => {});
  const state = { closed: false };
  socket.on('close', () => (state.closed = true));
  // Heartbeats are read and dropped, so the end of the connection is seen.
  socket.resume();
  socket.write(
    `${JSON.stringify({ Presence: { owner: owner.id, label: owner.label, session: owner.session, stack } })}\0`
  );
  await waitFor('the older presence to be listed', async () =>
    (await listRelaySessions(relay(), stack)).some(({ session }) => session === owner.session)
  );
  return { socket, state };
};

// Review of #388: an older CLI that held a VPC-only stage stayed after a take-over, next to the new holder.
test('a presence of an older CLI refuses a first claim, a take-over closes it, and it never costs the holder its stage', async () => {
  await startRelay({ idleSeconds: 3600 });
  const stops: AbortController[] = [];
  const presence = (owner: typeof alice, options: { held?: boolean; takeOver?: boolean } = {}) => {
    const stop = new AbortController();
    stops.push(stop);
    const state = { held: false };
    const ended = holdRelayPresence({
      relay: relay(),
      owner,
      stack: 'vpc-dev',
      signal: stop.signal,
      onHeld: () => (state.held = true),
      ...options
    });
    return { state, ended };
  };
  try {
    const old = await legacyPresence(alice, 'vpc-dev');
    expect(await presence(bob).ended).toMatchObject({ refusedBy: { label: alice.label, session: alice.session } });

    const holder = presence(bob, { takeOver: true });
    await waitFor('the take-over to be held', () => holder.state.held);
    await waitFor('the older presence to be closed', () => old.state.closed);

    // The older CLI reconnects; the holder's own reconnect after a lost SSM session keeps the stage.
    const reconnected = await legacyPresence(alice, 'vpc-dev');
    const holderAgain = presence(bob, { held: true });
    await waitFor('the holder to be held again', () => holderAgain.state.held);
    reconnected.socket.destroy();
  } finally {
    for (const stop of stops) stop.abort();
    await stopRelay();
  }
}, 30_000);

/** A dev session's connection to the relay, as `stacktape dev` holds it, with its SSM session substituted. */
const devBoxConnection = (
  owner: typeof alice,
  deps: Pick<ConstructorParameters<typeof DevBoxConnection>[0]['deps'], 'mayTakeOverStage' | 'onStageLost'>
) =>
  new DevBoxConnection({
    network: {
      stackName: 'stacktape-dev-network',
      vpcId: 'vpc-1',
      privateSubnetIds: ['subnet-a'],
      lambdaSecurityGroupId: 'sg-1',
      boxInstanceId: 'i-box',
      boxPrivateIp: '127.0.0.1',
      keeperFunctionName: 'keeper'
    },
    owner,
    stackName: 'vpc-dev',
    deps: {
      aws: {
        describeBox: async () => ({ state: 'running' }),
        isBoxOnline: async () => true
      } as unknown as DevNetworkAws,
      pollMs: 20,
      findFreePort: async () => controlPort,
      openSession: async () => {
        let exit!: () => void;
        const exited = new Promise<void>((resolve) => (exit = resolve));
        return { sessionId: `session-${owner.session}`, waitForExit: () => exited, kill: async () => exit() };
      },
      pingRelay,
      holdPresence: holdRelayPresence,
      listSessions: listRelaySessions,
      releaseTimeoutMs: 1000,
      ...deps
    }
  });

test('a session that takes over a presence-only stage ends the old one; a refused start ends itself', async () => {
  await startRelay({ idleSeconds: 3600 });
  const lost: Record<string, { label: string; since?: number; refused: boolean }[]> = { alice: [], bob: [], carol: [] };
  const carol = { id: 'user-carol', label: 'Carol (carol-laptop)', session: 'carol-laptop-session' };
  const connections: DevBoxConnection[] = [];
  try {
    const first = devBoxConnection(alice, { onStageLost: (input) => lost.alice.push(input) });
    connections.push(first);
    await first.connect();
    await waitFor('the first session to hold the stage', async () =>
      (await listRelaySessions(relay(), 'vpc-dev')).some(({ session }) => session === alice.session)
    );

    // Started without --take-over, and the stage check allows no take-over: the start ends itself.
    const refusedStart = devBoxConnection(carol, {
      mayTakeOverStage: async () => false,
      onStageLost: (input) => lost.carol.push(input)
    });
    connections.push(refusedStart);
    await refusedStart.connect();
    await waitFor('the refused start to give up', () => lost.carol.length > 0);
    expect(lost.carol).toEqual([{ label: alice.label, since: expect.any(Number), refused: true }]);

    // --take-over: the relay ends the first session's presence, and that session learns it lost the stage.
    const asked: string[] = [];
    const takeOver = devBoxConnection(bob, {
      mayTakeOverStage: async (holder) => (asked.push(holder.session), true),
      onStageLost: (input) => lost.bob.push(input)
    });
    connections.push(takeOver);
    await takeOver.connect();
    await waitFor('the first session to learn it lost the stage', () => lost.alice.length > 0);
    expect(asked).toEqual([alice.session]);
    expect(lost.alice).toEqual([{ label: bob.label, refused: false }]);
    expect(lost.bob).toEqual([]);
    await waitFor(
      'the relay to list only the new holder',
      async () => (await listRelaySessions(relay(), 'vpc-dev')).map(({ session }) => session).join() === bob.session
    );
  } finally {
    await Promise.all(connections.map((connection) => connection.stop()));
    await stopRelay();
  }
}, 30_000);

/** A function's connection that sends one request and resolves with the answer, or with how the connection ended. */
const requestThrough = (port: number, payload: string) =>
  new Promise<string>((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port }, () => socket.write(payload));
    socket.once('data', (data) => {
      socket.destroy();
      resolve(String(data));
    });
    socket.once('error', (error: NodeJS.ErrnoException) => resolve(error.code ?? error.message));
    socket.once('close', () => resolve('closed'));
  });

// r2w dogfood: a scheduled function ran while `stacktape dev` restarted and got `Connection refused` from the relay.
test('a function that connects while its session restarts reaches the database once the session is back', async () => {
  await startRelay({
    idleSeconds: 3600,
    env: { STACKTAPE_RELAY_WAIT_SECONDS: '3', STACKTAPE_RELAY_PARK_SECONDS: '5' }
  });
  const leasePort = await freePort();
  const localPort = (database.address() as AddressInfo).port;
  const lease = { port: leasePort, key: 'shop-dev/db' };
  await startTunnel({ resourceName: 'db', localPort, lease, owner: alice, relay: relay() });
  await cleanUpTunnels();

  // The session is gone; the next one leases the same port a second later and gets the waiting connection.
  const during = requestThrough(leasePort, 'during restart');
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const restarted = { ...alice, session: 'alice-laptop-session-2' };
  await startTunnel({ resourceName: 'db', localPort, lease, owner: restarted, relay: relay() });
  expect(await during).toBe('db:during restart');
  await cleanUpTunnels();

  // A port leased under another key never gets the connections waiting for this lease.
  const otherStack = requestThrough(leasePort, 'other stack');
  await startTunnel({
    resourceName: 'db',
    localPort,
    lease: { port: leasePort, key: 'other-dev/db' },
    owner: bob,
    relay: relay()
  });
  expect(await otherStack).toBe('closed');
  expect(await requestThrough(leasePort, 'other')).toBe('db:other');
  await cleanUpTunnels();

  // Without a session, a connection is closed after the wait, and the port closes after the park time.
  const started = Date.now();
  expect(await requestThrough(leasePort, 'nobody')).toBe('closed');
  expect(Date.now() - started).toBeGreaterThanOrEqual(2500);
  await waitFor(
    'the parked port to close',
    async () => (await requestThrough(leasePort, 'late')) === 'ECONNREFUSED',
    10_000
  );
  expect(relayOutput).toContain(`port ${leasePort} closed: no session leased it again within 5 s`);
  await stopRelay();
}, 40_000);

test('a tunnel reconnects without an attempt limit after the relay restarts', async () => {
  await startRelay({ idleSeconds: 3600 });
  const leasePort = await freePort();
  const localPort = (database.address() as AddressInfo).port;
  await startTunnel({
    resourceName: 'db',
    localPort,
    lease: { port: leasePort, key: 'shop-dev/db' },
    owner: alice,
    relay: relay()
  });
  await stopRelay();
  // Longer than the old fixed limit of three attempts: the client keeps trying while dev mode runs.
  await new Promise((resolve) => setTimeout(resolve, 7000));
  await startRelay({ idleSeconds: 3600 });
  await waitFor(
    'the tunnel to reopen',
    () =>
      query(leasePort, Buffer.from('again')).then(
        (answer) => String(answer) === 'db:again',
        () => false
      ),
    15_000
  );
  await cleanUpTunnels();
  await stopRelay();
}, 40_000);

test('a tunnel that cannot open at the start keeps trying until the relay answers', async () => {
  // A box that stops while the session starts: the first tunnel attempts find no relay.
  await stopRelay();
  const leasePort = await freePort();
  const localPort = (database.address() as AddressInfo).port;
  const request = { resourceName: 'db', localPort, lease: { port: leasePort, key: 'shop-dev/db' }, owner: alice };
  await expect(startTunnel({ ...request, relay: relay() })).rejects.toThrow('keeps retrying');
  await startRelay({ idleSeconds: 3600 });
  await waitFor(
    'the tunnel to open',
    () =>
      query(leasePort, Buffer.from('late')).then(
        (answer) => String(answer) === 'db:late',
        () => false
      ),
    15_000
  );
  await cleanUpTunnels();
  await stopRelay();
}, 40_000);

test('the relay stops the box only after the idle time without a session', async () => {
  await rm(stoppedFile(), { force: true });
  await startRelay({ idleSeconds: 2 });
  const presence = new AbortController();
  const held = holdRelayPresence({ relay: relay(), owner: alice, signal: presence.signal });
  // A presence connection alone keeps the box awake, also for a session without tunnels.
  await new Promise((resolve) => setTimeout(resolve, 4000));
  expect(existsSync(stoppedFile()), relayOutput).toBe(false);
  presence.abort();
  await held;
  await waitFor('the idle stop', () => existsSync(stoppedFile()), 8000);
  await stopRelay();
}, 30_000);

test('a Ping restarts the idle time, so a starting session keeps the box awake', async () => {
  await rm(stoppedFile(), { force: true });
  await startRelay({ idleSeconds: 2 });
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await pingRelay({ controlHost: '127.0.0.1', controlPort });
  }
  expect(existsSync(stoppedFile()), relayOutput).toBe(false);
  await waitFor('the idle stop', () => existsSync(stoppedFile()), 8000);
  await stopRelay();
}, 30_000);

test('a box that stops itself before the first connection is started again and the tunnels open', async () => {
  // The box ran when the session began, then reached its idle time while the dev stack deployed: it stops right after
  // SSM still reported it online, so the first session is refused. Starting the box starts the relay again.
  const box = { state: 'running', starts: 0 };
  let onlineChecks = 0;
  await startRelay({ idleSeconds: 3600 });
  const aws = {
    stacks: { get: async () => ({ StackStatus: 'UPDATE_COMPLETE' }) },
    describeBox: async () => ({ state: box.state }),
    startBox: async () => {
      box.starts++;
      box.state = 'pending';
      void startRelay({ idleSeconds: 3600 }).then(() => (box.state = 'running'));
    },
    isBoxOnline: async () => {
      if (++onlineChecks === 1) {
        box.state = 'stopped';
        await stopRelay();
      }
      return true;
    }
  } as unknown as DevNetworkAws;
  const connection = new DevBoxConnection({
    network: {
      stackName: 'stacktape-dev-network',
      vpcId: 'vpc-1',
      privateSubnetIds: ['subnet-a'],
      lambdaSecurityGroupId: 'sg-1',
      boxInstanceId: 'i-box',
      boxPrivateIp: '127.0.0.1',
      keeperFunctionName: 'keeper'
    },
    owner: alice,
    deps: {
      aws,
      pollMs: 20,
      // The SSM session forwards this port to the relay's control port; here the relay listens on it directly.
      findFreePort: async () => controlPort,
      openSession: async () => {
        if (box.state !== 'running') throw new Error('TargetNotConnected: the dev box is not connected');
        let exit!: () => void;
        const exited = new Promise<void>((resolve) => (exit = resolve));
        return { sessionId: `session-${box.starts}`, waitForExit: () => exited, kill: async () => exit() };
      },
      pingRelay,
      holdPresence: holdRelayPresence
    }
  });
  const leasePort = await freePort();
  const localPort = (database.address() as AddressInfo).port;
  const relayEndpoint = await connection.connect();
  expect(box.starts).toBe(1);
  const opened = await startTunnel({
    resourceName: 'db',
    localPort,
    lease: { port: leasePort, key: 'shop-dev/db' },
    owner: alice,
    relay: relayEndpoint
  });
  expect('tunnel' in opened).toBe(true);
  expect(String(await query(leasePort, Buffer.from('select 1')))).toBe('db:select 1');
  await connection.stop();
  await cleanUpTunnels();
  await stopRelay();
}, 30_000);

/** A raw protocol client: sends one message to the control port and collects every frame it receives. */
const rawClient = async (message: unknown) => {
  const socket = createConnection({ host: '127.0.0.1', port: controlPort });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });
  socket.on('error', () => {});
  const frames: Array<Record<string, unknown>> = [];
  let buffer = '';
  const state = { closed: false };
  socket.on('data', (chunk) => {
    buffer += String(chunk);
    let end: number;
    while ((end = buffer.indexOf('\0')) !== -1) {
      const parsed = JSON.parse(buffer.slice(0, end));
      if (parsed && typeof parsed === 'object') frames.push(parsed);
      buffer = buffer.slice(end + 1);
    }
  });
  socket.on('close', () => (state.closed = true));
  socket.write(`${JSON.stringify(message)}\0`);
  const next = async (kind: string) => {
    await waitFor(`a ${kind} frame`, () => frames.some((frame) => kind in frame) || state.closed, 3000);
    return frames.find((frame) => kind in frame)?.[kind];
  };
  return { socket, frames, state, next };
};

// r2af review, finding 4: two stages that leased one port (an allocation race of older CLIs) were refused as if one held
// the other's stage, and the take-over the refusal suggested evicted the other stage.
test('a take-over of one stage never moves another stage that holds the same port', async () => {
  await startRelay({ idleSeconds: 3600 });
  const port = await freePort();
  const first = await rawClient({ Lease: { port, key: 'shop-alice/db', owner: 'a', session: 'a', label: 'stage A' } });
  expect(await first.next('Hello')).toBe(port);
  const second = await rawClient({
    Lease: { port, key: 'shop-bob/db', owner: 'b', session: 'b', label: 'stage B', takeOver: true }
  });
  expect(String(await second.next('Error'))).toContain(
    `port ${port} is held by the dev session of another stage (shop-alice`
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(first.frames.some((frame) => 'TakenOver' in frame)).toBeFalse();
  expect(first.state.closed).toBeFalse();
  first.socket.destroy();
  second.socket.destroy();
  await stopRelay();
});

// r2af review: a tunnel whose control connection was lost kept its data connections, and one of them still reached the
// lost session's database after another session leased the port.
test("a lost tunnel's data connections end with it, before another session leases the port", async () => {
  await startRelay({ idleSeconds: 3600 });
  const port = await freePort();
  const first = await rawClient({ Lease: { port, key: 'shop-carol/db', owner: 'a', session: 'a', label: 'A' } });
  expect(await first.next('Hello')).toBe(port);
  const application = await pooledConnection(port);
  const connectionId = await first.next('Connection');
  const accept = await rawClient({ Accept: connectionId });
  const received: string[] = [];
  accept.socket.on('data', (data) => received.push(String(data)));
  application.socket.write('before');
  await waitFor('the first database to receive the query', () => received.join('') === 'before');
  // Only the control connection is lost.
  first.socket.destroy();
  await waitFor('the data connection to close', () => application.state.closed && accept.state.closed);
  const second = await rawClient({
    Lease: { port, key: 'shop-carol/db', owner: 'b', session: 'b', label: 'B', takeOver: true }
  });
  expect(await second.next('Hello')).toBe(port);
  second.socket.destroy();
  await stopRelay();
});
