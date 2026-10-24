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
    sessions: [] as Array<RelaySession & { exit: () => void; killed: boolean }>,
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
        exit,
        waitForExit: () => exited,
        kill: async () => {
          session.killed = true;
          exit();
        }
      };
      world.sessions.push(session);
      return session;
    },
    pingRelay: async () => {
      if (!world.relayUp) throw new Error('connection refused');
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
  const connection = new DevBoxConnection({ deps, network, owner: { id: 'u', label: 'U' } });
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
  const connection = new DevBoxConnection({ deps, network, owner: { id: 'u', label: 'U' } });
  await connection.connect();
  // The plugin dies (laptop sleep, network drop). The old server-side session still holds the relay ports.
  world.sessions[0].exit();
  await waitFor('a second session', () => world.sessions.length === 2);
  expect(world.sessions[0].killed).toBe(true);
  expect(connection.sessionId).toBe('session-2');
  await connection.stop();
});

test('a box that stopped itself under a running session is started again', async () => {
  const { world, deps } = fakeWorld({ boxState: 'running' });
  world.relayUp = true;
  const connection = new DevBoxConnection({ deps, network, owner: { id: 'u', label: 'U' } });
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
  const connection = new DevBoxConnection({ deps, network, owner: { id: 'u', label: 'U' } });
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
  const connection = new DevBoxConnection({ deps, network, owner: { id: 'u', label: 'U' } });
  const connected = connection.connect();
  await waitFor('a reconnecting status', () => connection.status?.phase === 'reconnecting');
  expect(connection.status).toEqual({ phase: 'reconnecting', reason: 'SessionManagerPlugin is not found' });
  await connection.stop();
  await expect(connected).rejects.toThrow('The dev session stopped.');
});
