import { createHash, randomBytes } from 'node:crypto';
import { getDevNetworkLeaseParameterPrefix, getDevNetworkPortParameterPrefix } from '@stacktape/naming/shared-stacks';

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
 * How long a port reservation may wait for its lease. A session writes the lease seconds after the reservation; one
 * that stopped between the two leaves a reservation that nobody returned, and it is reclaimed after this time.
 */
export const ABANDONED_RESERVATION_MS = 60 * 60_000;

/** A port reservation's value: the lease parameter that reserved it, when, and a nonce of the writing call. */
const reservationValue = (leaseName: string, createdAt: number) =>
  `${leaseName}#${createdAt}#${randomBytes(4).toString('hex')}`;

const parseReservation = (value: string) => {
  const [owner, createdAt] = value.split('#');
  return { owner, createdAt: Number(createdAt) || undefined, value };
};

/**
 * Gives every (stack, resource) a relay port that stays the same in every session, so the dev stack is deployed with
 * the relay address of each local database. A lease is created once and kept until the stack or the dev network is
 * deleted.
 *
 * A lease holds its port only once it has reserved it: the port's own parameter, created if absent, names the lease. Two
 * sessions that pick the same free port at once both try to create that parameter, and only one succeeds; the other
 * picks another port. Without the reservation, two stages each created their own lease on one port, and a session that
 * had already returned was never told (r2af). A port is returned only when its lease and its reservation name each
 * other, read in one round.
 *
 * SSM Parameter Store has no conditional write other than create-if-absent, so deletions follow two rules (review of
 * #393): a call deletes only a reservation it wrote itself, or one abandoned for `ABANDONED_RESERVATION_MS`; and it moves
 * a lease (deletes it) only when a fresh read still shows its port reserved by another lease. A lease another session
 * of the stage moves meanwhile keeps its reservation, which no other stage can take, so the lease returns to it.
 *
 * A lease created before reservations existed reserves its port the next time its stage starts, and moves when another
 * lease reserved the port first.
 */
export const ensureLeases = async ({
  store,
  networkName,
  stackName,
  resourceNames,
  now = Date.now
}: {
  store: LeaseStore;
  networkName: string;
  stackName: string;
  resourceNames: string[];
  now?: () => number;
}): Promise<Map<string, number>> => {
  const leasePrefix = getDevNetworkLeaseParameterPrefix(networkName);
  const portPrefix = getDevNetworkPortParameterPrefix(networkName);
  const reservationName = (port: number) => `${portPrefix}/${port}`;
  const names = new Map(
    resourceNames.map((resourceName) => [resourceName, leaseParameterName({ networkName, stackName, resourceName })])
  );
  /** The reservation values this call wrote: the only reservations it may delete while they are fresh. */
  const written = new Set<string>();
  const read = async () => {
    const [leaseRecords, portRecords] = await Promise.all([store.list(leasePrefix), store.list(portPrefix)]);
    const leases = new Map<string, number>();
    for (const { name, value } of leaseRecords) {
      const port = parsePort(value);
      if (port !== undefined) leases.set(name, port);
    }
    const reservations = new Map<number, ReturnType<typeof parseReservation>>();
    for (const { name, value } of portRecords) {
      const port = parsePort(name.slice(portPrefix.length + 1));
      if (port !== undefined) reservations.set(port, parseReservation(value));
    }
    return { leases, reservations };
  };
  const reserve = async (port: number, leaseName: string) => {
    const value = reservationValue(leaseName, now());
    written.add(value);
    await store.create(reservationName(port), value);
  };
  for (let round = 0; round < 10; round++) {
    const { leases, reservations } = await read();
    // Reservations their lease does not hold: those this call wrote and lost to another session of the stage, and
    // those a stopped session left. No session returned them: a returned port is its lease's.
    const unused = [...reservations].filter(
      ([port, { owner, createdAt, value }]) =>
        leases.get(owner) !== port &&
        ((written.has(value) && leases.has(owner)) ||
          createdAt === undefined ||
          now() - createdAt > ABANDONED_RESERVATION_MS)
    );
    if (unused.length) {
      await store.delete(unused.map(([port]) => reservationName(port)));
      for (const [port] of unused) reservations.delete(port);
    }
    const result = new Map<string, number>();
    const used = new Set([...leases.values(), ...reservations.keys()]);
    for (const [resourceName, name] of names) {
      const port = leases.get(name);
      const owner = port === undefined ? undefined : reservations.get(port)?.owner;
      if (port !== undefined && owner === name) {
        result.set(resourceName, port);
        continue;
      }
      if (port !== undefined && owner === undefined) {
        // A lease from before reservations: it reserves its port, unless another lease is faster.
        await reserve(port, name);
        continue;
      }
      if (port !== undefined) {
        // Another lease reserved this port first, and this lease moves, unless another session of the stage moved it
        // since this round's read.
        const fresh = await read();
        const freshOwner = fresh.reservations.get(port)?.owner;
        if (fresh.leases.get(name) === port && freshOwner !== undefined && freshOwner !== name) {
          await store.delete([name]);
        }
        continue;
      }
      const reserved = [...reservations].find(([, { owner: holder }]) => holder === name);
      if (reserved) {
        // A lease another session of this stage creates first wins; the next round reads it.
        await store.create(name, String(reserved[0]));
        continue;
      }
      let candidate = preferredLeasePort(name);
      for (let probe = 0; used.has(candidate); probe++) {
        if (probe >= RANGE_SIZE) throw new Error('The dev network has no free relay port left.');
        candidate = candidate === LEASE_PORT_RANGE.to ? LEASE_PORT_RANGE.from : candidate + 1;
      }
      used.add(candidate);
      // A port another session reserved first is read in the next round, and this lease picks another one.
      await reserve(candidate, name);
    }
    if (result.size === names.size) return result;
  }
  throw new Error('Could not lease relay ports in the dev network: other sessions kept taking the same ports.');
};

/** Deletes the leases of one stack and their port reservations, after the stack itself was deleted. */
export const releaseStackLeases = async ({
  store,
  networkName,
  stackName
}: {
  store: LeaseStore;
  networkName: string;
  stackName: string;
}) => {
  const stackPrefix = `${getDevNetworkLeaseParameterPrefix(networkName)}/${stackName}/`;
  const names = (await store.list(stackPrefix.slice(0, -1))).map(({ name }) => name);
  const reservations = (await store.list(getDevNetworkPortParameterPrefix(networkName)))
    .filter(({ value }) => parseReservation(value).owner.startsWith(stackPrefix))
    .map(({ name }) => name);
  if (names.length || reservations.length) await store.delete([...names, ...reservations]);
  return names.length;
};
