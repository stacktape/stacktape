import { afterEach, expect, test } from 'bun:test';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:net';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getProcessStart,
  isPortInUse,
  isSameProcessStart,
  parsePsStartTime,
  reserveFreeLocalPort,
  reserveLocalPort
} from './ports';

const listen = (server: Server, port: number, host: string) =>
  new Promise<number>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      if (!address || typeof address === 'string') return reject(new Error('Expected a TCP address.'));
      resolve(address.port);
    });
  });

const close = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()));

// The probe must release the port it checks: a local database or SSM tunnel binds it right after the check.
test('a listener makes its port busy and the probe leaves a free port bindable', async () => {
  const server = createServer();
  const port = await listen(server, 0, '0.0.0.0');
  try {
    expect(await isPortInUse(port)).toBe(true);
  } finally {
    await close(server);
  }
  expect(await isPortInUse(port)).toBe(false);
  await listen(server, port, '127.0.0.1');
  await close(server);
});

const hasIpv6Loopback = () =>
  new Promise<boolean>((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(0, '::1', () => server.close(() => resolve(true)));
  });

// r2bd2: on Windows another program listened on 127.0.0.1 and ::1 of the port Stacktape chose for a frontend, and the
// frontend's URL reached that program. A port held on any one loopback or wildcard address is in use.
test.each(['127.0.0.1', '::1', '0.0.0.0', '::'])('a port held only on %s is in use', async (host) => {
  if (host.includes(':') && !(await hasIpv6Loopback())) return;
  const server = createServer();
  const port = await listen(server, 0, host);
  try {
    expect(await isPortInUse(port)).toBe(true);
  } finally {
    await close(server);
  }
  expect(await isPortInUse(port)).toBe(false);
});

const directories: string[] = [];
const reservationDirectory = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-port-reservations-'));
  directories.push(directory);
  return directory;
};
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

/** Free ports proposed in the same order to every caller, like the old scan that made concurrent sessions collide. */
const freePorts = async (count: number) => {
  const servers = Array.from({ length: count }, () => createServer());
  const ports = await Promise.all(servers.map((server) => listen(server, 0, '127.0.0.1')));
  await Promise.all(servers.map(close));
  return ports;
};
const sameCandidates = (ports: number[]) => {
  let next = 0;
  return async () => ports[next++ % ports.length];
};

/**
 * Runs a separate process that reserves a port from `candidates`, prints it, and holds the reservation for `holdMs`
 * without listening on it, like a session before its plugin listens. It starts at `startAt` so processes race.
 */
const startReservingProcess = async ({
  directory,
  candidates,
  startAt = 0,
  holdMs = 0
}: {
  directory: string;
  candidates: number[];
  startAt?: number;
  holdMs?: number;
}) => {
  const script = join(directory, 'reserve.ts');
  await writeFile(
    script,
    `const { reserveFreeLocalPort } = await import(process.argv[2]);
const [directory, startAt, holdMs] = [process.argv[3], Number(process.argv[4]), Number(process.argv[5])];
const candidates = process.argv[6].split(',').map(Number);
while (Date.now() < startAt) await new Promise((resolve) => setTimeout(resolve, 1));
let next = 0;
const reservation = await reserveFreeLocalPort({ directory, nextCandidate: async () => candidates[next++] });
console.log(reservation.port);
await new Promise((resolve) => setTimeout(resolve, holdMs));
`
  );
  const child = spawn(
    process.execPath,
    [
      script,
      join(import.meta.dir, 'ports.ts'),
      join(directory, 'reservations'),
      String(startAt),
      String(holdMs),
      candidates.join(',')
    ],
    { cwd: join(import.meta.dir, '../..'), stdio: ['ignore', 'pipe', 'inherit'] }
  );
  const exited = new Promise<void>((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`The reserving process exited with ${code}.`))
    );
  });
  const port = new Promise<number>((resolve, reject) => {
    child.stdout.once('data', (chunk) => resolve(Number(String(chunk).trim())));
    exited.then(() => reject(new Error('The reserving process printed no port.')), reject);
  });
  exited.catch(() => {});
  return { port, exited, kill: () => child.kill() };
};

// r2an: two `stacktape dev` processes that started at the same moment chose the same laptop port for their SSM plugins.
test('processes that start together and propose the same ports reserve distinct ones', async () => {
  const directory = await reservationDirectory();
  const candidates = await freePorts(3);
  const startAt = Date.now() + 1500;
  const processes = await Promise.all(
    [1, 2].map(() => startReservingProcess({ directory, candidates, startAt, holdMs: 500 }))
  );
  const reserved = await Promise.all(processes.map(({ port }) => port));
  await Promise.all(processes.map(({ exited }) => exited));
  expect(new Set(reserved).size).toBe(2);
  expect(reserved.every((port) => candidates.includes(port))).toBe(true);
});

// Nothing listens on a reserved port until the plugin starts, so a probe alone would hand it out again.
test('a port another process reserved is skipped until that process exits, which deletes its reservation', async () => {
  const directory = await reservationDirectory();
  const candidates = await freePorts(2);
  const holder = await startReservingProcess({ directory, candidates, holdMs: 60_000 });
  try {
    const held = await holder.port;
    expect(held).toBe(candidates[0]);
    expect(await isPortInUse(held)).toBe(false);
    const second = await startReservingProcess({ directory, candidates });
    expect(await second.port).toBe(candidates[1]);
    await second.exited;
    // The second process exited, which deleted its reservation: the next process gets that port.
    const third = await startReservingProcess({ directory, candidates });
    expect(await third.port).toBe(candidates[1]);
    await third.exited;
    // Neither process called release; only the live holder keeps a reservation.
    expect((await readdir(join(directory, 'reservations'))).sort()).toEqual([`${held}.json`]);
  } finally {
    holder.kill();
  }
}, 30_000);

test('concurrent reservations in one process get distinct ports and a released port can be reserved again', async () => {
  const directory = await reservationDirectory();
  const ports = await freePorts(2);
  const [first, second] = await Promise.all([
    reserveFreeLocalPort({ directory, nextCandidate: sameCandidates(ports) }),
    reserveFreeLocalPort({ directory, nextCandidate: sameCandidates(ports) })
  ]);
  expect(new Set([first.port, second.port])).toEqual(new Set(ports));
  await first.release();
  await first.release();
  expect(await readdir(directory)).toEqual([`${second.port}.json`]);
  const again = await reserveLocalPort(first.port, { directory });
  expect(again?.port).toBe(first.port);
  await Promise.all([again?.release(), second.release()]);
});

test('a port another program listens on is skipped for the next candidate', async () => {
  const directory = await reservationDirectory();
  const server = createServer();
  const taken = await listen(server, 0, '127.0.0.1');
  const [free] = await freePorts(1);
  try {
    const reservation = await reserveFreeLocalPort({ directory, nextCandidate: sameCandidates([taken, free]) });
    expect(reservation.port).toBe(free);
    // The skipped port leaves no reservation behind.
    expect(await readdir(directory)).toEqual([`${free}.json`]);
    await reservation.release();
  } finally {
    await close(server);
  }
});

// A user-chosen port is refused with an error by the caller, never replaced.
test('an explicit port held by a live process is refused and one whose process exited is reclaimed', async () => {
  const directory = await reservationDirectory();
  const [held, abandoned] = await freePorts(2);
  // This test process is alive; a process ID far above any real one has exited.
  const owner = (pid: number) => JSON.stringify({ pid, hostname: hostname(), token: `token-${pid}`, reservedAt: 0 });
  await writeFile(join(directory, `${held}.json`), owner(process.pid));
  await writeFile(join(directory, `${abandoned}.json`), owner(2 ** 31 - 2));
  expect(await reserveLocalPort(held, { directory })).toBeUndefined();
  const reclaimed = await reserveLocalPort(abandoned, { directory });
  expect(reclaimed?.port).toBe(abandoned);
  await reclaimed?.release();
  expect(await readdir(directory)).toEqual([`${held}.json`]);
});

const reservationFile = (pid: number, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ pid, hostname: hostname(), token: `token-${pid}-${randomUUID()}`, reservedAt: 0, ...extra });

// #417 review: reading a stale reservation and deleting it were two steps, so a reclaimer that paused between them
// deleted the reservation another reclaimer had made meanwhile, and both held the port.
test('of many processes reclaiming one abandoned reservation at once, exactly one gets the port', async () => {
  const directory = await reservationDirectory();
  const [port] = await freePorts(1);
  for (let round = 0; round < 20; round++) {
    await writeFile(join(directory, `${port}.json`), reservationFile(2 ** 31 - 2));
    const results = await Promise.all(Array.from({ length: 8 }, () => reserveLocalPort(port!, { directory })));
    const winners = results.filter(Boolean);
    expect(winners).toHaveLength(1);
    // The winner's reservation is the file; no claim is left behind.
    expect(await readdir(directory)).toEqual([`${port}.json`]);
    await winners[0]!.release();
  }
});

test('separate processes reclaiming one abandoned reservation at once never both hold it', async () => {
  const directory = await reservationDirectory();
  const reservations = join(directory, 'reservations');
  await mkdir(reservations);
  const [port] = await freePorts(1);
  await writeFile(join(reservations, `${port}.json`), reservationFile(2 ** 31 - 2));
  const startAt = Date.now() + 1500;
  const fallbacks = await freePorts(4);
  const processes = await Promise.all(
    fallbacks.map((fallback) =>
      startReservingProcess({ directory, candidates: [port!, fallback], startAt, holdMs: 500 })
    )
  );
  const reserved = await Promise.all(processes.map(({ port: reservedPort }) => reservedPort));
  await Promise.all(processes.map(({ exited }) => exited));
  expect(reserved.filter((reservedPort) => reservedPort === port)).toHaveLength(1);
}, 30_000);

// #417 review: a live process that took over a crashed owner's id kept its reservation, so an explicit port failed.
test.skipIf(process.platform === 'win32')(
  'a reservation whose process id now belongs to a process that started later is reclaimed',
  async () => {
    const directory = await reservationDirectory();
    const [reused, held, legacy] = await freePorts(3);
    const ownStart = await getProcessStart(process.pid);
    expect(ownStart).toBeDefined();
    // This test process is alive with the reservations' process id; only one of them names its start.
    const earlierStart =
      process.platform === 'linux'
        ? `${ownStart!.split(':').slice(0, 2).join(':')}:1`
        : `epoch:${Date.now() - 86_400_000}`;
    await writeFile(join(directory, `${reused}.json`), reservationFile(process.pid, { processStart: earlierStart }));
    await writeFile(join(directory, `${held}.json`), reservationFile(process.pid, { processStart: ownStart }));
    // A reservation from an older CLI has no start: the id alone keeps it.
    await writeFile(join(directory, `${legacy}.json`), reservationFile(process.pid));
    const reclaimed = await reserveLocalPort(reused!, { directory });
    expect(reclaimed?.port).toBe(reused);
    expect(await reserveLocalPort(held!, { directory })).toBeUndefined();
    expect(await reserveLocalPort(legacy!, { directory })).toBeUndefined();
    await reclaimed?.release();
  }
);

test.skipIf(process.platform === 'win32')('a process start reads the same for the process and for others', async () => {
  const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 5000)'], { stdio: 'ignore' });
  try {
    const first = await getProcessStart(child.pid!);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const second = await getProcessStart(child.pid!);
    expect(first).toBeDefined();
    // A reading a second later, past a second boundary, names the same start.
    expect(isSameProcessStart(first!, second!)).toBe(true);
    expect(await getProcessStart(2 ** 31 - 2)).toBeUndefined();
  } finally {
    child.kill();
  }
});

// #427 review: `ps` reports a start to the second; readings must match at that resolution, never by milliseconds.
test('process starts compare at the resolution the system reports', () => {
  const at = Date.UTC(2026, 9, 31, 14, 5, 9);
  expect(isSameProcessStart(`epoch:${at}`, `epoch:${at}`)).toBe(true);
  expect(isSameProcessStart(`epoch:${at}`, `epoch:${at + 1000}`)).toBe(true);
  expect(isSameProcessStart(`epoch:${at}`, `epoch:${at + 3000}`)).toBe(false);
  expect(isSameProcessStart('linux:boot-a:1200', 'linux:boot-a:1200')).toBe(true);
  expect(isSameProcessStart('linux:boot-a:1200', 'linux:boot-a:1201')).toBe(false);
  expect(isSameProcessStart('linux:boot-a:1200', 'linux:boot-b:1200')).toBe(false);
  // Readings of different forms cannot tell, so the owner counts as alive.
  expect(isSameProcessStart('linux:boot-a:1200', `epoch:${at}`)).toBe(true);
  expect(parsePsStartTime('Sat Oct 31 14:05:09 2026')).toBe(at);
  expect(parsePsStartTime('Sun Nov  1 02:00:00 2026\n')).toBe(Date.UTC(2026, 10, 1, 2, 0, 0));
  expect(parsePsStartTime('31 Oct 2026')).toBeUndefined();
});

test.skipIf(process.platform === 'win32')('ps reports this process start in UTC, to the second', () => {
  const lstart = spawnSync('ps', ['-o', 'lstart=', '-p', String(process.pid)], {
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' }
  }).stdout;
  const startedAt = parsePsStartTime(lstart);
  expect(startedAt).toBeDefined();
  expect(Math.abs(startedAt! - (Date.now() - process.uptime() * 1000))).toBeLessThan(5000);
});

// #427 review: three crashes between taking a claim and dropping it left the port reserved for good.
test('claims that crashed reclaimers left expire, so the port is reclaimed and nothing is left behind', async () => {
  const directory = await reservationDirectory();
  const [port] = await freePorts(1);
  const token = `token-crashed-${randomUUID()}`;
  await writeFile(
    join(directory, `${port}.json`),
    JSON.stringify({ pid: 2 ** 31 - 2, hostname: hostname(), token, reservedAt: 0 })
  );
  const old = new Date(Date.now() - 60_000);
  for (let generation = 1; generation <= 5; generation++) {
    const claim = join(directory, `${port}.json.token-${token}.reclaim${generation}`);
    await writeFile(claim, '');
    await utimes(claim, old, old);
  }
  const reclaimed = await reserveLocalPort(port!, { directory });
  expect(reclaimed?.port).toBe(port);
  expect(await readdir(directory)).toEqual([`${port}.json`]);
  await reclaimed?.release();
});

test('a fresh claim of another reclaimer keeps this process from reclaiming at the same time', async () => {
  const directory = await reservationDirectory();
  const [port] = await freePorts(1);
  const token = `token-claimed-${randomUUID()}`;
  await writeFile(
    join(directory, `${port}.json`),
    JSON.stringify({ pid: 2 ** 31 - 2, hostname: hostname(), token, reservedAt: 0 })
  );
  await writeFile(join(directory, `${port}.json.token-${token}.reclaim1`), '');
  expect(await reserveLocalPort(port!, { directory })).toBeUndefined();
});
