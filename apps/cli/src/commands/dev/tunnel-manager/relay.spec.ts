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

const startRelay = async ({ idleSeconds }: { idleSeconds: number }) => {
  relayProcess = spawn('python3', [join(directory, 'relay.py'), '127.0.0.1'], {
    env: {
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
  expect(relayOutput.match(/taken over by/g)).toHaveLength(2);
  expect(getActiveTunnels()).toEqual([('tunnel' in tookOver && tookOver.tunnel) as never]);
  expect(String(await query(dbPort, Buffer.from('select 2')))).toBe('db:select 2');

  presence.abort();
  await held;
  await cleanUpTunnels();
  await stopRelay();
}, 30_000);

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
