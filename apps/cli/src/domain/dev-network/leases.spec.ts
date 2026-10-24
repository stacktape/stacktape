import { describe, expect, test } from 'bun:test';
import { ensureLeases, LEASE_PORT_RANGE, preferredLeasePort, releaseStackLeases, type LeaseStore } from './leases';

/** SSM Parameter Store semantics the leases rely on: atomic create-if-absent and path listing. */
const memoryStore = (initial: Record<string, string> = {}) => {
  const parameters = new Map(Object.entries(initial));
  const store: LeaseStore & { parameters: Map<string, string> } = {
    parameters,
    list: async (prefix) =>
      [...parameters].filter(([name]) => name.startsWith(`${prefix}/`)).map(([name, value]) => ({ name, value })),
    create: async (name, value) => {
      if (!parameters.has(name)) parameters.set(name, value);
    },
    delete: async (names) => {
      for (const name of names) parameters.delete(name);
    }
  };
  return store;
};

const prefix = '/stacktape/dev-network/stacktape-dev-network/leases';
const lease = (stackName: string, resourceName: string) => `${prefix}/${stackName}/${resourceName}`;

describe('dev network leases', () => {
  test('a stage keeps its ports across sessions and two stages never share one', async () => {
    const store = memoryStore();
    const first = await ensureLeases({
      store,
      networkName: 'stacktape-dev-network',
      stackName: 'shop-alice',
      resourceNames: ['db', 'cache']
    });
    const again = await ensureLeases({
      store,
      networkName: 'stacktape-dev-network',
      stackName: 'shop-alice',
      resourceNames: ['db', 'cache']
    });
    expect(again).toEqual(first);
    const other = await ensureLeases({
      store,
      networkName: 'stacktape-dev-network',
      stackName: 'shop-bob',
      resourceNames: ['db']
    });
    const ports = [...first.values(), ...other.values()];
    expect(new Set(ports).size).toBe(3);
    for (const port of ports) {
      expect(port).toBeGreaterThanOrEqual(LEASE_PORT_RANGE.from);
      expect(port).toBeLessThanOrEqual(LEASE_PORT_RANGE.to);
    }
  });

  test('a taken preferred port moves the new lease to the next free one, wrapping at the range end', async () => {
    const name = lease('shop-alice', 'db');
    const preferred = preferredLeasePort(name);
    const store = memoryStore({ [lease('other', 'db')]: String(preferred) });
    const leases = await ensureLeases({
      store,
      networkName: 'stacktape-dev-network',
      stackName: 'shop-alice',
      resourceNames: ['db']
    });
    expect(leases.get('db')).toBe(preferred === LEASE_PORT_RANGE.to ? LEASE_PORT_RANGE.from : preferred + 1);
  });

  test('two sessions that created leases with the same port at once end with different ports', async () => {
    const store = memoryStore();
    // The other session's new lease landed on the port this one picks, between this session's read and its write.
    const name = lease('shop-alice', 'db');
    const racer = lease('shop-aaa', 'db');
    const originalCreate = store.create;
    store.create = async (parameterName, value) => {
      if (parameterName === name && !store.parameters.has(racer)) store.parameters.set(racer, value);
      await originalCreate(parameterName, value);
    };
    const leases = await ensureLeases({
      store,
      networkName: 'stacktape-dev-network',
      stackName: 'shop-alice',
      resourceNames: ['db']
    });
    // The lease whose name sorts first keeps the port; this stage's lease moved and is stored that way.
    expect(leases.get('db')).not.toBe(Number(store.parameters.get(racer)));
    expect(store.parameters.get(name)).toBe(String(leases.get('db')));
  });

  test('deleting a stage releases its leases only', async () => {
    const store = memoryStore({
      [lease('shop-alice', 'db')]: '20001',
      [lease('shop-alice', 'cache')]: '20002',
      [lease('shop-alice2', 'db')]: '20003'
    });
    const released = await releaseStackLeases({ store, networkName: 'stacktape-dev-network', stackName: 'shop-alice' });
    expect(released).toBe(2);
    expect([...store.parameters.keys()]).toEqual([lease('shop-alice2', 'db')]);
  });
});
