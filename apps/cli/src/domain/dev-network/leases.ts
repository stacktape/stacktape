import { createHash } from 'node:crypto';
import { getDevNetworkLeaseParameterPrefix } from '@stacktape/naming/shared-stacks';

/** Relay ports leases are taken from. The box's own outgoing connections use the kernel range above 32768. */
export const LEASE_PORT_RANGE = { from: 20000, to: 29999 } as const;
const RANGE_SIZE = LEASE_PORT_RANGE.to - LEASE_PORT_RANGE.from + 1;

/** The SSM parameters that hold the leases; one parameter per lease, its value the port. */
export type LeaseStore = {
  list: (prefix: string) => Promise<Array<{ name: string; value: string }>>;
  /** Creates the parameter unless it exists; a parameter another session created first is left as it is. */
  create: (name: string, value: string) => Promise<void>;
  delete: (names: string[]) => Promise<void>;
};

const leaseParameterName = ({
  networkName,
  stackName,
  resourceName
}: {
  networkName: string;
  stackName: string;
  resourceName: string;
}) => `${getDevNetworkLeaseParameterPrefix(networkName)}/${stackName}/${resourceName}`;

/** The first port tried for a lease: spread by the lease's name, so concurrent new leases rarely probe the same ports. */
export const preferredLeasePort = (leaseKey: string) =>
  LEASE_PORT_RANGE.from + (createHash('sha256').update(leaseKey).digest().readUInt32BE(0) % RANGE_SIZE);

const parsePort = (value: string | undefined) => {
  const port = Number(value);
  return Number.isInteger(port) && port >= LEASE_PORT_RANGE.from && port <= LEASE_PORT_RANGE.to ? port : undefined;
};

/**
 * Gives every (stack, resource) a relay port that stays the same in every session, so the dev stack is deployed with
 * the relay address of each local database. A lease is created once and kept until the stack or the dev network is
 * deleted.
 *
 * Creating a lease is atomic, but two sessions creating different leases at the same moment may pick the same free
 * port. Each round therefore first resolves shared ports: the lease whose name sorts first keeps the port, a later one
 * of this stack is deleted and taken again. The result is returned from a round that found every lease and no conflict.
 */
export const ensureLeases = async ({
  store,
  networkName,
  stackName,
  resourceNames
}: {
  store: LeaseStore;
  networkName: string;
  stackName: string;
  resourceNames: string[];
}): Promise<Map<string, number>> => {
  const prefix = getDevNetworkLeaseParameterPrefix(networkName);
  const names = new Map(
    resourceNames.map((resourceName) => [resourceName, leaseParameterName({ networkName, stackName, resourceName })])
  );
  for (let round = 0; round < 5; round++) {
    const ports = new Map<string, number>();
    for (const { name, value } of await store.list(prefix)) {
      const port = parsePort(value);
      if (port !== undefined) ports.set(name, port);
    }
    const holders = new Map<number, string>();
    for (const [name, port] of [...ports].sort(([left], [right]) => left.localeCompare(right))) {
      if (!holders.has(port)) holders.set(port, name);
    }
    const ours = new Set(names.values());
    const losers = [...ports].filter(([name, port]) => ours.has(name) && holders.get(port) !== name);
    if (losers.length) {
      await store.delete(losers.map(([name]) => name));
      for (const [name] of losers) ports.delete(name);
    }
    const missing = [...names].filter(([, name]) => !ports.has(name));
    if (!missing.length && !losers.length) {
      return new Map([...names].map(([resourceName, name]) => [resourceName, ports.get(name)!]));
    }
    const used = new Set(ports.values());
    for (const [, name] of missing) {
      let port = preferredLeasePort(name);
      for (let probe = 0; used.has(port); probe++) {
        if (probe >= RANGE_SIZE) throw new Error('The dev network has no free relay port left.');
        port = port === LEASE_PORT_RANGE.to ? LEASE_PORT_RANGE.from : port + 1;
      }
      used.add(port);
      // A lease another session created first is read in the next round.
      await store.create(name, String(port));
    }
  }
  throw new Error('Could not lease relay ports in the dev network: other sessions kept taking the same ports.');
};

/** Deletes the leases of one stack, after the stack itself was deleted. */
export const releaseStackLeases = async ({
  store,
  networkName,
  stackName
}: {
  store: LeaseStore;
  networkName: string;
  stackName: string;
}) => {
  const names = (await store.list(`${getDevNetworkLeaseParameterPrefix(networkName)}/${stackName}`)).map(
    ({ name }) => name
  );
  if (names.length) await store.delete(names);
  return names.length;
};
