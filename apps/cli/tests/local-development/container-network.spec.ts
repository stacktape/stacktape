import { afterAll, expect, test } from 'bun:test';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer, type AddressInfo } from 'node:net';
import {
  ensureLoopbackRelays,
  resolveDevContainerNetwork,
  stopLoopbackRelays
} from '../../src/commands/dev/container/network';
import { findAvailablePort } from '../../src/commands/dev/port-utils';

// r2w: Linux dev containers ran on the host network, so a second stage of the same app collided on its fixed admin
// port 9090. On a bridge network every container has its own ports, and a relay keeps loopback-only services (local
// databases, SSM tunnels) reachable as host.docker.internal. Real Docker; the containers are owned by this test.
const owner = randomUUID().slice(0, 8);
const names = ['first', 'second'].map((stage) => `stp-r2z-${owner}-${stage}`);
// Asynchronous: the relays run in this process and must answer while a container connects.
const docker = (args: string[]) =>
  new Promise<{ status: number; stdout: string; stderr: string }>((resolve) =>
    execFile('docker', args, { encoding: 'utf8', timeout: 60_000 }, (error, stdout, stderr) =>
      resolve({ status: error ? Number(error.code ?? 1) : 0, stdout, stderr })
    )
  );

afterAll(async () => {
  for (const name of names) await docker(['rm', '-f', name]);
  await stopLoopbackRelays();
});

test('two dev containers listen on the same fixed port and reach a loopback-only service of this machine', async () => {
  expect(Bun.which('docker'), 'Docker is required for this explicit change lane').toBeTruthy();
  const network = await resolveDevContainerNetwork();
  if (process.platform !== 'linux') return;
  expect(network.mode).toBe('bridge');

  // A local database stand-in: published on loopback only, as dev mode publishes databases.
  const database = createServer((socket) => socket.end('database'));
  await new Promise<void>((resolve) => database.listen(0, '127.0.0.1', resolve));
  const databasePort = (database.address() as AddressInfo).port;
  try {
    await ensureLoopbackRelays(network, [databasePort]);
    const firstHostPort = (await findAvailablePort(18_080))!;
    const secondHostPort = (await findAvailablePort(firstHostPort + 1))!;
    for (const [index, name] of names.entries()) {
      // Each container serves 8080 (its declared port, published with the stage's offset) and an undeclared admin port
      // 9090, which collided on the host network.
      const started = await docker([
        'run',
        '-d',
        '--name',
        name,
        ...network.dockerArgs.flatMap((arg) => arg.split(' ')),
        '-p',
        `${index === 0 ? firstHostPort : secondHostPort}:8080`,
        'alpine:3',
        'sh',
        '-c',
        `nc -lk -p 9090 -e echo admin-${index} & nc -lk -p 8080 -e echo app-${index}`
      ]);
      expect(started.status, started.stderr).toBe(0);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    for (const [index, name] of names.entries()) {
      expect((await docker(['inspect', '--format', '{{.State.Running}}', name])).stdout.trim()).toBe('true');
      const admin = await docker(['exec', name, 'sh', '-c', 'nc -w 2 127.0.0.1 9090 </dev/null']);
      expect(admin.stdout.trim()).toBe(`admin-${index}`);
      const reached = await docker([
        'exec',
        name,
        'sh',
        '-c',
        `nc -w 2 host.docker.internal ${databasePort} </dev/null`
      ]);
      expect(reached.stdout.trim(), reached.stderr).toBe('database');
    }
    // One container reaches the other at its published port through this machine, as STP_*_URL variables point.
    const across = await docker([
      'exec',
      names[0],
      'sh',
      '-c',
      `nc -w 2 host.docker.internal ${secondHostPort} </dev/null`
    ]);
    expect(across.stdout.trim(), across.stderr).toBe('app-1');
  } finally {
    database.close();
  }
}, 120_000);
