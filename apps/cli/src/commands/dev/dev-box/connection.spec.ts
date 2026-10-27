import { expect, test } from 'bun:test';
import type { DevNetworkAws } from '@domain-services/dev-network';
import { DevBoxConnection, type DevBoxStatus, type RelaySession } from './index';

// EC2 stop/start and SSM sessions cannot be emulated; these fakes keep their observable behavior: a box goes from
// stopped through pending to running, SSM sees it online once it runs, and a session ends when its plugin dies.

const waitFor = async (description: string, ready: () => boolean, timeout = 5000) => {
  const deadline = Date.now() + timeout;
  while (!ready()) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${description}.`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

const network = {
  stackName: 'stacktape-dev-network',
  vpcId: 'vpc-1',
  privateSubnetIds: ['subnet-a', 'subnet-b'],
  lambdaSecurityGroupId: 'sg-1',
  boxInstanceId: 'i-box',
  boxPrivateIp: '10.230.0.10',
  keeperFunctionName: 'stacktape-dev-network-keeper'
};

const fakeWorld = ({ boxState }: { boxState: string }) => {
  const world = {
    boxState,
    starts: 0,
    relayUp: false,
    sessions: [] as Array<RelaySession & { exit: () => void; killed: boolean; ended: boolean }>,
    presences: [] as Array<{ end: () => void }>
  };
  const aws = {
    describeBox: async () => ({ state: world.boxState }),
    startBox: async () => {
      world.starts++;
      world.boxState = 'pending';
      setTimeout(() => {
        world.boxState = 'running';
        // The relay of a fresh boot answers a little after SSM connects.
        setTimeout(() => (world.relayUp = true), 20);
      }, 20);
    },
    isBoxOnline: async () => world.boxState === 'running'
  } as unknown as DevNetworkAws;
  const deps = {
    aws,
    pollMs: 5,
    findFreePort: async () => 40001,
    openSession: async ({ localPort }: { localPort: number }) => {
      expect(localPort).toBe(40001);
      let exit!: () => void;
      const exited = new Promise<void>((resolve) => (exit = resolve));
      const session = {
        sessionId: `session-${world.sessions.length + 1}`,
        killed: false,
        ended: false,
        exit,
        waitForExit: () => exited,
        kill: async () => {
          session.killed = true;
          exit();
        }
      };
      void exited.then(() => (session.ended = true));
      world.sessions.push(session);
      return session;
    },
    // The relay is reached through the latest session; a session that ended carries nothing.
    pingRelay: async () => {
      if (!world.relayUp || world.sessions.at(-1)?.ended) throw new Error('connection refused');
      return 1;
    },
    holdPresence: ({ signal }: { signal: AbortSignal }) =>
      new Promise<void>((resolve) => {
        world.presences.push({ end: resolve });
        signal.addEventListener('abort', () => resolve(), { once: true });
      })
  };
  return { world, deps };
};

test('a session starts a stopped box, waits for the relay and holds its presence', async () => {
  const { world, deps } = fakeWorld({ boxState: 'stopped' });
  const connection = new DevBoxConnection({ deps, network, owner: { id: 'u', label: 'U', session: 's' } });
  const statuses: DevBoxStatus['phase'][] = [];
  connection.onStatus = (status) => statuses.push(status.phase);
  const relay = await connection.connect();
  expect(relay).toEqual({ controlHost: '127.0.0.1', controlPort: 40001, relayHost: '10.230.0.10' });
  expect(world.starts).toBe(1);
  expect(statuses).toEqual(['starting-box', 'connecting', 'ready']);
  await waitFor('the presence connection', () => world.presences.length === 1);
  await connection.stop();
  expect(world.sessions.every(({ killed }) => killed)).toBe(true);
});

test('a lost session is ended on the server and reopened on the same local port', async () => {
  const { world, deps } = fakeWorld({ boxState: 'running' });
  world.relayUp = true;
  const connection = new DevBoxConnection({ deps, network, owner: { id: 'u', label: 'U', session: 's' } });
  await connection.connect();
  // The plugin dies (laptop sleep, network drop). The old server-side session still holds the relay ports.
  world.sessions[0].exit();
  await waitFor('a second session', () => world.sessions.length === 2);
  expect(world.sessions[0].killed).toBe(true);
  expect(connection.sessionId).toBe('session-2');
  await connection.stop();
});

// The box's profile watcher restarts the SSM agent when the instance profile appears, which ends a session opened just
// before. The relay never answers through that session; a new one must be opened at once, not after the 5 minutes the
// relay may take on a first boot.
test('a session that ends before the relay answers is replaced at once', async () => {
  const { world, deps } = fakeWorld({ boxState: 'running' });
  const connection = new DevBoxConnection({
    deps: { ...deps, relayTimeoutMs: 60_000 },
    network,
    owner: { id: 'u', label: 'U', session: 's' }
  });
  const statuses: string[] = [];
  connection.onStatus = (status) => statuses.push(status.phase === 'reconnecting' ? status.reason : status.phase);
  const ready = connection.connect();
  await waitFor('the first session', () => world.sessions.length === 1);
  // The agent restarts: the first session dies, and the relay answers only through a new one.
  world.sessions[0].exit();
  world.relayUp = true;
  const started = Date.now();
  await ready;
  expect(Date.now() - started).toBeLessThan(3000);
  expect(world.sessions.map(({ sessionId, killed }) => ({ sessionId, killed }))).toEqual([
    { sessionId: 'session-1', killed: true },
    { sessionId: 'session-2', killed: false }
  ]);
  expect(statuses).toContain('The SSM session to the dev box ended before its relay answered.');
  await connection.stop();
});

test('a box that stopped itself under a running session is started again', async () => {
  const { world, deps } = fakeWorld({ boxState: 'running' });
  world.relayUp = true;
  const connection = new DevBoxConnection({ deps, network, owner: { id: 'u', label: 'U', session: 's' } });
  await connection.connect();
  world.boxState = 'stopped';
  world.relayUp = false;
  world.sessions[0].exit();
  await waitFor('the box to start again', () => world.starts === 1);
  await waitFor(
    'a session to the restarted box',
    () => world.sessions.length === 2 && connection.status?.phase === 'ready'
  );
  await connection.stop();
});

test('a first connection that fails keeps retrying and starts a box that stopped meanwhile', async () => {
  const { world, deps } = fakeWorld({ boxState: 'running' });
  world.relayUp = true;
  // The box reaches its idle time while the session waits for SSM: SSM stops answering and the box stops.
  let checks = 0;
  deps.aws.isBoxOnline = async () => {
    if (++checks === 1) {
      world.boxState = 'stopped';
      world.relayUp = false;
      return false;
    }
    return world.boxState === 'running';
  };
  const failing = deps.openSession;
  let opens = 0;
  // The first session is refused once more after the restart, as SSM does while the agent registers again.
  deps.openSession = async (input) => {
    if (++opens === 1) throw new Error('TargetNotConnected');
    return failing(input);
  };
  const connection = new DevBoxConnection({ deps, network, owner: { id: 'u', label: 'U', session: 's' } });
  const statuses: DevBoxStatus['phase'][] = [];
  connection.onStatus = (status) => statuses.push(status.phase);
  const relay = await connection.connect();
  expect(relay.controlPort).toBe(40001);
  expect(world.starts).toBe(1);
  expect(statuses).toContain('reconnecting');
  expect(statuses.at(-1)).toBe('ready');
  await waitFor('the presence connection', () => world.presences.length === 1);
  await connection.stop();
});

test('a connection that never succeeds rejects only when the session stops', async () => {
  const { deps } = fakeWorld({ boxState: 'running' });
  deps.openSession = async () => {
    throw new Error('SessionManagerPlugin is not found');
  };
  const connection = new DevBoxConnection({ deps, network, owner: { id: 'u', label: 'U', session: 's' } });
  const connected = connection.connect();
  await waitFor('a reconnecting status', () => connection.status?.phase === 'reconnecting');
  expect(connection.status).toEqual({ phase: 'reconnecting', reason: 'SessionManagerPlugin is not found' });
  await connection.stop();
  await expect(connected).rejects.toThrow('The dev session stopped.');
});

// r2p dogfood, finding 10: the SSM session was ended first, so the relay kept listing the stopped session as the stage's
// holder until SSM noticed, and a start 3 s after the stop was refused.
test('stop ends the presence, waits until the relay no longer lists the session, then ends the SSM session', async () => {
  const { world, deps } = fakeWorld({ boxState: 'running' });
  world.relayUp = true;
  const events: string[] = [];
  let listedAfterPresenceEnds = 2;
  let presenceOpen = false;
  const owner = { id: 'u', label: 'U', session: '4242.s' };
  const connection = new DevBoxConnection({
    deps: {
      ...deps,
      holdPresence: ({ signal }) =>
        new Promise<void>((resolve) => {
          presenceOpen = true;
          signal.addEventListener(
            'abort',
            () => {
              presenceOpen = false;
              events.push('presence closed');
              resolve();
            },
            { once: true }
          );
        }),
      // The relay notices the closed connection after a couple of listings.
      listSessions: async (_relay, stack) => {
        expect(stack).toBe('shop-dev');
        const listed = presenceOpen || listedAfterPresenceEnds-- > 0;
        events.push(listed ? 'listed' : 'released');
        return listed ? [{ session: owner.session }] : [];
      }
    },
    network,
    owner,
    stackName: 'shop-dev'
  });
  await connection.connect();
  await waitFor('the presence connection', () => presenceOpen);
  const session = world.sessions[0];
  const kill = session.kill;
  session.kill = async () => {
    events.push('ssm session ended');
    await kill();
  };
  await connection.stop();
  expect(events).toEqual(['presence closed', 'listed', 'listed', 'released', 'ssm session ended']);
});

test('stop ends the SSM session after the release timeout when the relay keeps listing the session', async () => {
  const { world, deps } = fakeWorld({ boxState: 'running' });
  world.relayUp = true;
  const connection = new DevBoxConnection({
    deps: { ...deps, releaseTimeoutMs: 100, listSessions: async () => [{ session: 's' }] },
    network,
    owner: { id: 'u', label: 'U', session: 's' },
    stackName: 'shop-dev'
  });
  await connection.connect();
  const startedAt = Date.now();
  await connection.stop();
  expect(Date.now() - startedAt).toBeLessThan(1000);
  expect(world.sessions.every(({ killed }) => killed)).toBe(true);
});
