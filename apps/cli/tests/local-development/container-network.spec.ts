import { afterAll, expect, test } from 'bun:test';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { connect, createServer, type AddressInfo } from 'node:net';
import {
  DOCKER_HOST_NAME,
  ensureLoopbackRelays,
  findSpareLoopbackPort,
  resolveDevContainerNetwork,
  startPortSwitch,
  stopLoopbackRelays
} from '../../src/commands/dev/container/network';
import { findAvailablePort } from '../../src/commands/dev/port-utils';
import { pointLoopbackAtHost } from '../../src/commands/dev/utils';

// r2w: Linux dev containers ran on the host network, so a second stage of the same app collided on its fixed admin
// port 9090. On a bridge network every container has its own ports, and a relay keeps loopback-only services (local
// databases, SSM tunnels) reachable as host.docker.internal. Real Docker; the containers are owned by this test.
const owner = randomUUID().slice(0, 8);
const names = ['first', 'second', 'rebuilt'].map((stage) => `stp-r2z-${owner}-${stage}`);
const switches: Awaited<ReturnType<typeof startPortSwitch>>[] = [];
// Asynchronous: the relays run in this process and must answer while a container connects.
const docker = (args: string[]) =>
  new Promise<{ status: number; stdout: string; stderr: string }>((resolve) =>
    execFile('docker', args, { encoding: 'utf8', timeout: 60_000 }, (error, stdout, stderr) =>
      resolve({ status: error ? Number(error.code ?? 1) : 0, stdout, stderr })
    )
  );

const read = (host: string, port: number) =>
  new Promise<string>((resolve) => {
    let data = '';
    const socket = connect({ host, port });
    socket.on('data', (chunk) => (data += chunk));
    socket.on('close', () => resolve(data.trim()));
    socket.on('error', () => resolve(''));
  });

afterAll(async () => {
  for (const name of names) await docker(['rm', '-f', name]);
  await Promise.all(switches.map((portSwitch) => portSwitch.close()));
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
  // Each run publishes its port on a spare loopback port; a port switch holds the stage's stable port, as dev mode does.
  const runContainer = async (name: string, reply: string) => {
    const publishedPort = await findSpareLoopbackPort();
    const started = await docker([
      'run',
      '-d',
      '--name',
      name,
      ...network.dockerArgs.flatMap((arg) => arg.split(' ')),
      '-p',
      `127.0.0.1:${publishedPort}:8080`,
      'alpine:3',
      'sh',
      '-c',
      // Each container serves 8080 (its declared port) and an undeclared admin port 9090, which collided on the host
      // network.
      `nc -lk -p 9090 -e echo admin-${reply} & nc -lk -p 8080 -e echo ${reply}`
    ]);
    expect(started.status, started.stderr).toBe(0);
    return publishedPort;
  };
  try {
    await ensureLoopbackRelays(network, [databasePort]);
    const stablePorts: number[] = [];
    for (const [index, name] of names.slice(0, 2).entries()) {
      const stablePort = (await findAvailablePort(18_080 + index * 10))!;
      const portSwitch = await startPortSwitch({
        port: stablePort,
        targetPort: await runContainer(name, `app-${index}`)
      });
      switches.push(portSwitch);
      stablePorts.push(stablePort);
    }
    await ensureLoopbackRelays(network, stablePorts);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    for (const [index, name] of names.slice(0, 2).entries()) {
      expect((await docker(['inspect', '--format', '{{.State.Running}}', name])).stdout.trim()).toBe('true');
      const admin = await docker(['exec', name, 'sh', '-c', 'nc -w 2 127.0.0.1 9090 </dev/null']);
      expect(admin.stdout.trim()).toBe(`admin-app-${index}`);
      const reached = await docker([
        'exec',
        name,
        'sh',
        '-c',
        `nc -w 2 host.docker.internal ${databasePort} </dev/null`
      ]);
      expect(reached.stdout.trim(), reached.stderr).toBe('database');
      // The way a client reads STP_<DB>_HOST and STP_<DB>_PORT: a bare host, which dev mode points at this machine.
      const split = await docker([
        'exec',
        '-e',
        `DB_HOST=${pointLoopbackAtHost('localhost', DOCKER_HOST_NAME)}`,
        '-e',
        `DB_PORT=${databasePort}`,
        name,
        'sh',
        '-c',
        'nc -w 2 "$DB_HOST" "$DB_PORT" </dev/null'
      ]);
      expect(split.stdout.trim(), split.stderr).toBe('database');
      // This machine reaches it at the stable port on loopback; the local network does not (r2cc: 0.0.0.0:8080).
      expect(await read('127.0.0.1', stablePorts[index]!)).toBe(`app-${index}`);
    }
    const published = await docker(['port', names[0]!, '8080']);
    expect(published.stdout.trim()).toMatch(/^127\.0\.0\.1:\d+$/);
    // One container reaches the other at its stable port through this machine, as STP_*_URL variables point.
    const across = () =>
      docker(['exec', names[0]!, 'sh', '-c', `nc -w 2 host.docker.internal ${stablePorts[1]} </dev/null`]);
    const reachedAcross = await across();
    expect(reachedAcross.stdout.trim(), reachedAcross.stderr).toBe('app-1');

    // A rebuild: the new container runs next to the old one, and the stable port switches to it once it serves.
    const rebuiltPort = await runContainer(names[2]!, 'app-1-rebuilt');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(await read('127.0.0.1', stablePorts[1]!)).toBe('app-1');
    switches[1]!.setTarget(rebuiltPort);
    expect(await read('127.0.0.1', stablePorts[1]!)).toBe('app-1-rebuilt');
    expect((await across()).stdout.trim()).toBe('app-1-rebuilt');
  } finally {
    database.close();
  }
}, 120_000);
