import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, unlinkSync } from 'node:fs';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import * as net from 'node:net';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { localStatePaths } from 'src/config/local-state-paths';

/** How a bind probe ended: the port is free there, in use, or the address family does not exist on this machine. */
type BindProbe = 'free' | 'in-use' | 'unavailable';

/** Errors of an address this machine does not have, such as `::1` where IPv6 is switched off. */
const ADDRESS_UNAVAILABLE_CODES = new Set(['EADDRNOTAVAIL', 'EAFNOSUPPORT', 'EPROTONOSUPPORT']);

const probeBind = (port: number, host: string): Promise<BindProbe> =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (error: NodeJS.ErrnoException) =>
      resolve(error.code && ADDRESS_UNAVAILABLE_CODES.has(error.code) ? 'unavailable' : 'in-use')
    );
    // Release the probe before checking another host or starting a tunnel.
    server.listen(port, host, () => server.close(() => resolve('free')));
  });

/**
 * The addresses a port must be free on. A program listening on only one loopback address takes the requests that a
 * client resolving `localhost` to that address sends: on Windows, WSL's port forwarding and other dev servers listen on
 * `127.0.0.1` and `::1` separately, and a frontend Stacktape started on a port held on `::1` shared it with them
 * (r2bd2). The wildcard addresses cover a workload that listens on every interface. Windows lets a later program bind a
 * specific address over a wildcard listener and the reverse, so every address is probed on its own.
 */
const PORT_PROBE_HOSTS = ['127.0.0.1', '0.0.0.0', '::1', '::'];

/**
 * Check if port is in use: whether any program listens on it on an IPv4 or IPv6 loopback or wildcard address. An
 * address family this machine lacks is skipped. The probes run one after another, because these binds overlap on
 * Linux and parallel probes can mistake each other for an existing listener.
 */
export const isPortInUse = async (port: number, host?: string): Promise<boolean> => {
  for (const probeHost of host ? [host] : PORT_PROBE_HOSTS) {
    if ((await probeBind(port, probeHost)) === 'in-use') return true;
  }
  return false;
};

/**
 * A local port that this process holds for a listener another program opens, such as the Session Manager plugin.
 * Probing a free port and handing it to that program leaves a gap: two `stacktape dev` sessions that started together
 * probed the same port, both plugins asked for it and only one listened. A reservation is a file per port, created
 * exclusively and naming its process, so other Stacktape processes on this machine skip the port until it is released
 * or its process has exited.
 */
export type LocalPortReservation = {
  readonly port: number;
  /** Deletes the reservation; calling it again does nothing. */
  release: () => Promise<void>;
};

type ReservationOwner = {
  pid: number;
  hostname: string;
  token: string;
  reservedAt: number;
  /** When the owner process started (`getProcessStart`); tells it from a later process that got its id. */
  processStart?: string;
};

/** A writer creates and fills its file in one call; an empty file older than this was left by a crash in between. */
const UNREADABLE_RESERVATION_STALE_MS = 10_000;

/** `ps` reports a start to the second: readings of one process that a second boundary separates still match. */
const START_TIME_TOLERANCE_MS = 1000;

const execFileAsync = promisify(execFile);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Milliseconds since the epoch of a `ps -o lstart` start read in the C locale and UTC (`Sat Oct 31 14:05:09 2026`),
 * or `undefined` for anything else.
 */
export const parsePsStartTime = (lstart: string): number | undefined => {
  const match = /^\w{3}\s+(\w{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d{4})$/.exec(lstart.trim());
  const month = match ? MONTHS.indexOf(match[1]!) : -1;
  if (!match || month < 0) return undefined;
  const [, , day, hours, minutes, seconds, year] = match.map(Number);
  return Date.UTC(year!, month, day, hours, minutes, seconds);
};

/**
 * When process `pid` started, or `undefined` where the system does not say cheaply (Windows) or the process is gone.
 * Linux: the boot and the clock ticks after it (`/proc/<pid>/stat`, field 22), exact and unaffected by clock changes.
 * Elsewhere: the start `ps` reports, to the second and the same on every reading (the elapsed time would add the
 * milliseconds of the moment of reading).
 */
export const getProcessStart = async (pid: number): Promise<string | undefined> => {
  try {
    if (process.platform === 'linux') {
      const [stat, bootId] = await Promise.all([
        readFile(`/proc/${pid}/stat`, 'utf8'),
        readFile('/proc/sys/kernel/random/boot_id', 'utf8')
      ]);
      // The command name in parentheses can hold spaces, so fields are counted after its last `)`; it is field 2.
      const startTicks = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
      return startTicks && /^\d+$/.test(startTicks) ? `linux:${bootId.trim()}:${startTicks}` : undefined;
    }
    if (process.platform === 'win32') return undefined;
    const { stdout } = await execFileAsync('ps', ['-o', 'lstart=', '-p', String(pid)], {
      timeout: 5000,
      env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' }
    });
    const startedAt = parsePsStartTime(stdout);
    return startedAt === undefined ? undefined : `epoch:${startedAt}`;
  } catch {
    return undefined;
  }
};

/**
 * Whether two `getProcessStart` readings may name one process start. Readings of different forms cannot tell, so they
 * match: a process is taken for another only when the system says so.
 */
export const isSameProcessStart = (left: string, right: string) => {
  const [leftForm, rightForm] = [left.split(':')[0], right.split(':')[0]];
  if (leftForm !== rightForm) return true;
  if (leftForm === 'epoch') return Math.abs(Number(left.slice(6)) - Number(right.slice(6))) <= START_TIME_TOLERANCE_MS;
  return left === right;
};

/** This process's start, read once the way another process reads it. */
let ownProcessStart: Promise<string | undefined> | undefined;
const getOwnProcessStart = () => (ownProcessStart ??= getProcessStart(process.pid));

const isProcessAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to another user.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
};

/**
 * Whether the process that wrote a reservation on this machine still runs. A process id is reused once its process
 * exits, after a restart too, so a live process with the id counts only if it started when the owner did. A file
 * without a start, from an older CLI, and a system that does not report one fall back to the id alone.
 */
const isOwnerAlive = async (owner: ReservationOwner) => {
  if (!isProcessAlive(owner.pid)) return false;
  if (typeof owner.processStart !== 'string') return true;
  const processStart = await getProcessStart(owner.pid);
  return processStart === undefined || isSameProcessStart(processStart, owner.processStart);
};

const readReservationOwner = async (path: string): Promise<ReservationOwner | null> => {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as ReservationOwner;
  } catch {
    return null;
  }
};

/** Reservations this process holds, by file, with their tokens; deleted when the process exits. */
const heldReservations = new Map<string, string>();
let exitHandlerInstalled = false;

/**
 * Deletes this process's reservations however it exits, except a kill that runs no handler: a session can end before
 * its cleanup reaches `release`. Other processes reclaim what a killed process leaves.
 */
const releaseHeldReservationsOnExit = () => {
  if (exitHandlerInstalled) return;
  exitHandlerInstalled = true;
  process.once('exit', () => {
    for (const [path, token] of heldReservations) deleteOwnReservation(path, token);
  });
};

/** Deletes a reservation file unless another process reclaimed it as stale meanwhile. */
const deleteOwnReservation = (path: string, token: string) => {
  try {
    if ((JSON.parse(readFileSync(path, 'utf8')) as ReservationOwner).token === token) unlinkSync(path);
  } catch {
    // Already deleted.
  }
};

const createReservation = async (directory: string, port: number): Promise<LocalPortReservation | undefined> => {
  const path = join(directory, `${port}.json`);
  const owner: ReservationOwner = {
    pid: process.pid,
    hostname: hostname(),
    token: randomUUID(),
    reservedAt: Date.now(),
    processStart: await getOwnProcessStart()
  };
  try {
    await writeFile(path, JSON.stringify(owner), { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return undefined;
    throw error;
  }
  heldReservations.set(path, owner.token);
  releaseHeldReservationsOnExit();
  return {
    port,
    // Synchronous, so a process that exits while a cleanup awaits something else never stops halfway.
    release: async () => {
      if (!heldReservations.has(path)) return;
      deleteOwnReservation(path, owner.token);
      heldReservations.delete(path);
    }
  };
};

/**
 * The reservation file at `path` as one value that never names a later file: its owner's token, or for a file left
 * empty or unreadable its inode and modification time. `undefined` when there is no file.
 */
const readReservation = async (path: string) => {
  const owner = await readReservationOwner(path);
  if (owner && typeof owner.token === 'string' && /^[\w-]{1,64}$/.test(owner.token)) {
    return { identity: `token-${owner.token}`, owner };
  }
  const written = await stat(path).catch(() => null);
  if (!written) return undefined;
  return {
    identity: `file-${written.ino}-${Math.trunc(written.mtimeMs)}`,
    owner: undefined,
    writtenAt: written.mtimeMs
  };
};

/** A process that crashed between taking a claim and dropping it, which takes milliseconds, left a claim this old. */
const RECLAIM_CLAIM_ABANDONED_MS = 10_000;
const reclaimClaimPath = (path: string, identity: string, generation: number) =>
  `${path}.${identity}.reclaim${generation}`;

/**
 * Makes this process the only one that deletes the reservation `identity` names, and returns the generation of its
 * claim, or `undefined` when another process reclaims it. The claim is a file created exclusively and named by the
 * reservation, never by the port, so a claim cannot outlive its reservation into the next one.
 *
 * A claim that a crashed process left expires: the next claimer takes the next generation. Removing the expired claim
 * instead would let two processes that both found it expired remove each other's new claim; each generation has one
 * winner, and the generations have no limit, so crashes never leave a port reserved for good.
 */
const claimReclaim = async (path: string, identity: string): Promise<number | undefined> => {
  for (let generation = 1; ; generation++) {
    const claim = reclaimClaimPath(path, identity, generation);
    try {
      await writeFile(claim, '', { flag: 'wx', mode: 0o600 });
      return generation;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const claimed = await stat(claim).catch(() => null);
      // Another process reclaims it now, or did and dropped its claim.
      if (!claimed || Date.now() - claimed.mtimeMs < RECLAIM_CLAIM_ABANDONED_MS) return undefined;
    }
  }
};

/**
 * Deletes a reservation whose process has exited on this machine; reports whether the port may be reserved again.
 * Reading the owner and deleting its file are two steps, so two processes could both find it stale and the second
 * delete the reservation the first made meanwhile. Only the process that claims the stale reservation deletes it,
 * after it reads that the file is still that reservation.
 */
const removeStaleReservation = async (directory: string, port: number) => {
  const path = join(directory, `${port}.json`);
  const found = await readReservation(path);
  if (!found) return true;
  if (found.owner) {
    // A process id means something only on the machine that wrote it; a shared home directory can hold others'.
    if (found.owner.hostname !== hostname() || (await isOwnerAlive(found.owner))) return false;
  } else if (Date.now() - found.writtenAt < UNREADABLE_RESERVATION_STALE_MS) {
    return false;
  }
  const generation = await claimReclaim(path, found.identity);
  if (generation === undefined) return false;
  try {
    // Nobody else deletes this reservation now, and no other file can take its identity.
    const current = await readReservation(path);
    if (current?.identity !== found.identity) return !current;
    await unlink(path).catch(() => {});
    return true;
  } finally {
    // The reservation is gone, so its claims, abandoned ones too, guard nothing any more.
    for (let held = 1; held <= generation; held++) {
      await unlink(reclaimClaimPath(path, found.identity, held)).catch(() => {});
    }
  }
};

/**
 * Reserves `port` for this process. Resolves undefined when another live Stacktape process holds it or another
 * program listens on it; a user-chosen port is then refused, never replaced.
 */
export const reserveLocalPort = async (
  port: number,
  { directory = localStatePaths.localPortReservationDirectory() }: { directory?: string } = {}
): Promise<LocalPortReservation | undefined> => {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  let reservation = await createReservation(directory, port);
  if (!reservation && (await removeStaleReservation(directory, port))) {
    reservation = await createReservation(directory, port);
  }
  if (!reservation) return undefined;
  if (await isPortInUse(port)) {
    await reservation.release();
    return undefined;
  }
  return reservation;
};

/** A port the operating system considers free; it picks one at random from its ephemeral range. */
const getSystemAssignedPort = () =>
  new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });

/** Reserves a free local port that no other Stacktape process on this machine has reserved. */
export const reserveFreeLocalPort = async ({
  directory,
  nextCandidate = getSystemAssignedPort,
  attempts = 50
}: {
  directory?: string;
  /** Proposes the next port to try; tests replace it to make processes propose the same ports. */
  nextCandidate?: () => Promise<number>;
  attempts?: number;
} = {}): Promise<LocalPortReservation> => {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const reservation = await reserveLocalPort(await nextCandidate(), { directory });
    if (reservation) return reservation;
  }
  throw new Error(`Could not reserve a free local port in ${attempts} attempts.`);
};
