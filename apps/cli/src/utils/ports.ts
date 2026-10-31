import { randomUUID } from 'node:crypto';
import { readFileSync, unlinkSync } from 'node:fs';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import * as net from 'node:net';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { localStatePaths } from 'src/config/local-state-paths';

const checkPortOnHost = (port: number, host: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.listen(port, host, () => {
      server.close(() => resolve(false)); // Release the probe before checking another host or starting a tunnel.
    });

    server.on('error', () => {
      resolve(true); // Port is in use
    });
  });
};

/**
 * Check if port is in use. Checks both 0.0.0.0 and 127.0.0.1 to handle
 * Docker containers that bind to 0.0.0.0 (which may not conflict with 127.0.0.1 on some OSes).
 */
export const isPortInUse = async (port: number, host?: string): Promise<boolean> => {
  // If specific host provided, check only that host
  if (host) {
    return checkPortOnHost(port, host);
  }

  // These binds overlap on Linux. Parallel probes can mistake each other for an existing listener.
  if (await checkPortOnHost(port, '0.0.0.0')) return true;
  return checkPortOnHost(port, '127.0.0.1');
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

type ReservationOwner = { pid: number; hostname: string; token: string; reservedAt: number };

/** A writer creates and fills its file in one call; an empty file older than this was left by a crash in between. */
const UNREADABLE_RESERVATION_STALE_MS = 10_000;

const isProcessAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to another user.
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
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
    reservedAt: Date.now()
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

/** Deletes a reservation whose process has exited on this machine; reports whether the port may be reserved again. */
const removeStaleReservation = async (directory: string, port: number) => {
  const path = join(directory, `${port}.json`);
  const owner = await readReservationOwner(path);
  if (owner) {
    // A process id means something only on the machine that wrote it; a shared home directory can hold others'.
    if (owner.hostname !== hostname() || isProcessAlive(owner.pid)) return false;
  } else {
    const written = await stat(path).catch(() => null);
    if (written && Date.now() - written.mtimeMs < UNREADABLE_RESERVATION_STALE_MS) return false;
  }
  // Another process may have reclaimed the file meanwhile: delete it only if it is still the stale one.
  const current = await readReservationOwner(path);
  if (current?.token !== owner?.token) return false;
  await unlink(path).catch(() => {});
  return true;
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
