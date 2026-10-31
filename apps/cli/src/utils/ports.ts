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
 * The only addresses Stacktape binds to probe a port. A program listening on only one loopback address takes the
 * requests that a client resolving `localhost` to that address sends: on Windows, WSL's port forwarding and other dev
 * servers listen on `127.0.0.1` and `::1` separately, and a frontend Stacktape started on a port held on `::1` shared it
 * with them (r2bd2). A probe never binds a wildcard address: listening on `0.0.0.0` or `::` makes Windows Defender
 * Firewall ask the user, with administrator rights, to let the program onto the network (r2bj).
 */
const LOOPBACK_PROBE_HOSTS = ['127.0.0.1', '::1'];

/** `127.0.0.1`, `0.0.0.0`, `::1` and `::` in one spelling; an IPv4 address mapped into IPv6 is its IPv4 address. */
export const normalizeAddress = (address: string): string => {
  const bare = address.replace(/^\[|\]$/g, '').replace(/%.*$/, '');
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(bare);
  if (mapped) return mapped[1]!;
  if (bare === '*') return bare;
  if (/^[0:]+$/.test(bare)) return '::';
  if (/^[0:]+:0*1$/.test(bare)) return '::1';
  return bare.toLowerCase();
};

/** An address of `/proc/net/tcp` or `tcp6`: hexadecimal, each 32-bit word in the machine's byte order (little-endian). */
export const decodeProcNetAddress = (hex: string): string => {
  const words = hex.match(/.{8}/g) ?? [];
  const bytes = words.flatMap((word) => (word.match(/../g) ?? []).reverse().map((byte) => Number.parseInt(byte, 16)));
  if (bytes.length === 4) return bytes.join('.');
  // An IPv4 address mapped into IPv6 (`::ffff:127.0.0.1`) is that IPv4 address.
  if (bytes.slice(0, 10).every((byte) => byte === 0) && bytes[10] === 255 && bytes[11] === 255) {
    return bytes.slice(12).join('.');
  }
  const groups = Array.from({ length: 8 }, (_, index) =>
    ((bytes[index * 2]! << 8) | bytes[index * 2 + 1]!).toString(16)
  );
  return normalizeAddress(groups.join(':'));
};

/** A listening TCP socket from the system's table: its address as `normalizeAddress` writes it, and its port. */
type TableListener = { address: string; port: number };

/** The listening sockets in `/proc/net/tcp`-format text, with their socket inodes. */
export const parseProcNetListeners = (text: string): (TableListener & { inode: string })[] =>
  text
    .split('\n')
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((fields) => fields[3] === '0A' && fields[1]?.includes(':'))
    .map((fields) => {
      const [address, port] = fields[1]!.split(':');
      return { address: decodeProcNetAddress(address!), port: Number.parseInt(port!, 16), inode: fields[9]! };
    });

/**
 * Listening sockets in `netstat -an` output on Windows (`TCP  [::]:3000  [::]:0  LISTENING`) or macOS
 * (`tcp46  0  0  *.3000  *.*  LISTEN`). The state column is translated on Windows, so a listener is told by its foreign
 * address, which is unset (`0.0.0.0:0`, `[::]:0`, `*.*`) only for a socket that accepts connections.
 */
export const parseNetstatListeners = (text: string): TableListener[] => {
  const listeners: TableListener[] = [];
  for (const line of text.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    const windows = fields[0] === 'TCP';
    const macos = /^tcp(4|6|46)?$/.test(fields[0] ?? '');
    const [local, foreign] = windows ? [fields[1], fields[2]] : macos ? [fields[3], fields[4]] : [];
    if (!local || !foreign) continue;
    const separator = windows ? ':' : '.';
    const unset = windows ? /:0$/.test(foreign) : foreign === '*.*';
    const port = Number(local.slice(local.lastIndexOf(separator) + 1));
    if (!unset || !Number.isInteger(port) || port <= 0) continue;
    const address = normalizeAddress(local.slice(0, local.lastIndexOf(separator)));
    // macOS writes an unspecified address as `*` and says the family only in the protocol column.
    listeners.push({ address: address === '*' ? (fields[0] === 'tcp4' ? '0.0.0.0' : '::') : address, port });
  }
  return listeners;
};

const execFileAsync = promisify(execFile);

/** The system's listening TCP sockets; none where it does not say (a restricted `/proc`, no `netstat`). */
const readListenerTable = async (): Promise<TableListener[]> => {
  try {
    if (process.platform === 'linux') {
      // `tcp6` is missing where IPv6 is switched off.
      const tables = await Promise.all(
        ['/proc/net/tcp', '/proc/net/tcp6'].map((path) => readFile(path, 'utf8').catch(() => ''))
      );
      return tables.flatMap((text) => parseProcNetListeners(text));
    }
    if (process.platform === 'win32' || process.platform === 'darwin') {
      // Windows lists both address families of every protocol; macOS both families under `tcp`.
      const args = process.platform === 'win32' ? ['-an'] : ['-an', '-p', 'tcp'];
      const { stdout } = await execFileAsync('netstat', args, { timeout: 10_000, windowsHide: true });
      return parseNetstatListeners(stdout);
    }
  } catch {
    // Unknown: only the loopback probes decide.
  }
  return [];
};

/** The ports a program listens on at `0.0.0.0` or `::`, from one read of the system's table. */
export type WildcardListenerPorts = (options?: { fresh?: boolean }) => Promise<ReadonlySet<number>>;

/** How long one read of the listener table serves the checks of a port scan. */
const LISTENER_TABLE_TTL_MS = 500;
let listenerTableRead: { readAt: number; ports: Promise<ReadonlySet<number>> } | undefined;

export const readWildcardListenerPorts: WildcardListenerPorts = ({ fresh = false } = {}) => {
  if (!fresh && listenerTableRead && Date.now() - listenerTableRead.readAt < LISTENER_TABLE_TTL_MS) {
    return listenerTableRead.ports;
  }
  const ports = readListenerTable().then(
    (listeners) =>
      new Set(listeners.filter(({ address }) => address === '0.0.0.0' || address === '::').map(({ port }) => port))
  );
  listenerTableRead = { readAt: Date.now(), ports };
  return ports;
};

/**
 * Check if port is in use: whether any program listens on it on an IPv4 or IPv6 loopback or wildcard address.
 * Loopback addresses are probed by binding them: that also finds ports the system reserves, such as Windows' excluded
 * port ranges. Windows and macOS let a program bind a loopback address over another program's wildcard listener, so
 * wildcard listeners come from the system's listener table instead (`readWildcardListenerPorts`); where the system does
 * not say, only the loopback probes decide. An address family this machine lacks is skipped. The probes run one after
 * another so that they never mistake each other for an existing listener.
 */
export const isPortInUse = async (
  port: number,
  { wildcardListenerPorts = readWildcardListenerPorts }: { wildcardListenerPorts?: WildcardListenerPorts } = {}
): Promise<boolean> => {
  for (const probeHost of LOOPBACK_PROBE_HOSTS) {
    if ((await probeBind(port, probeHost)) === 'in-use') return true;
  }
  if (!(await wildcardListenerPorts()).has(port)) return false;
  // A table read for an earlier port of the scan can list a listener that has closed since.
  return (await wildcardListenerPorts({ fresh: true })).has(port);
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
