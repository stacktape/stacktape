import { afterEach, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:net';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { isPortInUse, reserveFreeLocalPort, reserveLocalPort } from './ports';

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
