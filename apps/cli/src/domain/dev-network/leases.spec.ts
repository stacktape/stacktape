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

  // r2af review, finding 4: two stages created their own lease on one port, and the session that had already returned
  // was never told. Run with the stage pair and timing the review found: the earlier stage reads the leases, waits,
  // and creates its lease after the later stage returned.
  test('two stages that pick the same port at once never both get it', async () => {
    const networkName = 'r2af-network';
    const leasePrefix = '/stacktape/dev-network/r2af-network/leases';
    const seen = new Map<number, string>();
    let pair: [string, string] | undefined;
    for (let n = 0; !pair; n++) {
      const stack = `r2af-${String(n).padStart(5, '0')}`;
      const port = preferredLeasePort(`${leasePrefix}/${stack}/db`);
      if (seen.has(port)) pair = [seen.get(port)!, stack];
      seen.set(port, stack);
    }
    const [earlier, later] = pair;
    const store = memoryStore();
    let releaseEarlier!: () => void;
    const earlierWaits = new Promise<void>((resolve) => (releaseEarlier = resolve));
    let earlierRead!: () => void;
    const earlierHasRead = new Promise<void>((resolve) => (earlierRead = resolve));
    let firstRead = true;
    const delayedStore: LeaseStore = {
      ...store,
      list: async (prefix) => {
        const snapshot = await store.list(prefix);
        if (firstRead && prefix.endsWith('/ports')) {
          firstRead = false;
          earlierRead();
          await earlierWaits;
        }
        return snapshot;
      }
    };
    const pending = ensureLeases({ store: delayedStore, networkName, stackName: earlier, resourceNames: ['db'] });
    await earlierHasRead;
    const laterPorts = await ensureLeases({ store, networkName, stackName: later, resourceNames: ['db'] });
    releaseEarlier();
    const earlierPorts = await pending;
    expect(earlierPorts.get('db')).not.toBe(laterPorts.get('db'));
    // Each port is reserved by the lease that holds it.
    for (const [stack, ports] of [
      [earlier, earlierPorts],
      [later, laterPorts]
    ] as const) {
      expect(store.parameters.get(`/stacktape/dev-network/r2af-network/ports/${ports.get('db')}`)).toBe(
        `${leasePrefix}/${stack}/db`
      );
    }
  });

  test('a lease from before port reservations reserves its port, and moves when another lease reserved it', async () => {
    const kept = memoryStore({ [lease('shop-alice', 'db')]: '20001' });
    const leases = await ensureLeases({
      store: kept,
      networkName: 'stacktape-dev-network',
      stackName: 'shop-alice',
      resourceNames: ['db']
    });
    expect(leases.get('db')).toBe(20001);
    expect(kept.parameters.get('/stacktape/dev-network/stacktape-dev-network/ports/20001')).toBe(
      lease('shop-alice', 'db')
    );

    const moved = memoryStore({
      [lease('shop-alice', 'db')]: '20001',
      [lease('shop-bob', 'db')]: '20001',
      '/stacktape/dev-network/stacktape-dev-network/ports/20001': lease('shop-bob', 'db')
    });
    const alice = await ensureLeases({
      store: moved,
      networkName: 'stacktape-dev-network',
      stackName: 'shop-alice',
      resourceNames: ['db']
    });
    expect(alice.get('db')).not.toBe(20001);
    expect(moved.parameters.get(lease('shop-alice', 'db'))).toBe(String(alice.get('db')));
  });

  test('deleting a stage releases its leases and their ports only', async () => {
    const ports = '/stacktape/dev-network/stacktape-dev-network/ports';
    const store = memoryStore({
      [lease('shop-alice', 'db')]: '20001',
      [lease('shop-alice', 'cache')]: '20002',
      [lease('shop-alice2', 'db')]: '20003',
      [`${ports}/20001`]: lease('shop-alice', 'db'),
      [`${ports}/20002`]: lease('shop-alice', 'cache'),
      [`${ports}/20003`]: lease('shop-alice2', 'db')
    });
    const released = await releaseStackLeases({ store, networkName: 'stacktape-dev-network', stackName: 'shop-alice' });
    expect(released).toBe(2);
    expect([...store.parameters.keys()]).toEqual([lease('shop-alice2', 'db'), `${ports}/20003`]);
  });
});
