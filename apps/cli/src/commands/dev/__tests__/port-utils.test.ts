import { afterEach, expect, test } from 'bun:test';
import { createServer, type AddressInfo } from 'node:net';
import {
  clearPortCache,
  extractPortFromCommand,
  findAvailablePort,
  getContainerListenPort,
  releasePorts,
  reservePorts,
  waitForTcpPort
} from '../port-utils';

afterEach(() => clearPortCache());

test('allocation skips a foreign listener and a pending Docker reservation, then reuses released ports', async () => {
  const foreign = createServer();
  await new Promise<void>((resolve) => foreign.listen(0, '127.0.0.1', resolve));
  const port = (foreign.address() as AddressInfo).port;
  reservePorts([port + 1]);
  try {
    expect(await findAvailablePort(port, 2)).toBeNull();
    const selected = await findAvailablePort(port, 20);
    expect(selected).toBeGreaterThan(port + 1);
    // Actually bind the selected port; the probe must have released it.
    const workload = createServer();
    await new Promise<void>((resolve, reject) => {
      workload.once('error', reject);
      workload.listen(selected!, '127.0.0.1', resolve);
    });
    await new Promise<void>((resolve) => workload.close(() => resolve()));
    releasePorts([port + 1]);
    clearPortCache();
    expect(await findAvailablePort(port + 1, 1)).toBe(port + 1);
  } finally {
    releasePorts([port + 1]);
    await new Promise<void>((resolve) => foreign.close(() => resolve()));
  }
  clearPortCache();
  expect(await findAvailablePort(port, 1)).toBe(port);
});

// A port the customer wrote into their dev command is the one their dev server is started on.
test.each([
  ['vite dev --port 3000', 3000],
  ['vite dev --port=5173', 5173],
  ['next dev -p 3001', 3001],
  ['next dev -p=4000', 4000],
  ['vite dev', null],
  ['', null],
  ['bun run dev -- --port 8080 --host 0.0.0.0', 8080]
])('parses an explicit command port in %s', (input, port) => expect(extractPortFromCommand(input)).toBe(port));

// Docker Desktop publishes the allocated host port onto the configured container port; the host network of native Linux
// Docker cannot, so there the container itself must listen on the allocated host port.
test.each([
  ['a published default port', { containerPort: 3000, hostPort: 3000, hostNetwork: false }, 3000],
  ['a published moved port', { containerPort: 3000, hostPort: 3001, hostNetwork: false }, 3000],
  ['the host network on the default port', { containerPort: 3000, hostPort: 3000, hostNetwork: true }, 3000],
  ['the host network on a moved port', { containerPort: 3000, hostPort: 3001, hostNetwork: true }, 3001],
  ['no configured port', { hostNetwork: true }, undefined]
])('a container on %s listens on the right port', (_name, ports, expected) => {
  expect(getContainerListenPort(ports)).toBe(expected);
});

// A container counts as running once its port serves. Docker's port proxy accepts a connection on a published port
// before the app in the container listens and closes it at once; that must not count, or `ready` comes before the app
// listens and a test gets 502.
test('a port counts as serving only when a program keeps the connection, not when a proxy closes it at once', async () => {
  const listen = async (onConnection: (socket: import('node:net').Socket) => void) => {
    const server = createServer(onConnection);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return { server, port: (server.address() as AddressInfo).port };
  };
  const proxyWithoutApp = await listen((socket) => socket.destroy());
  const app = await listen(() => {});
  const greetingApp = await listen((socket) => socket.end('hello'));
  try {
    expect(await waitForTcpPort({ port: proxyWithoutApp.port, timeoutMs: 800 })).toBe('timeout');
    expect(await waitForTcpPort({ port: app.port, timeoutMs: 800 })).toBe('ready');
    // A server that greets first (MySQL, Redis) serves even when it closes afterwards.
    expect(await waitForTcpPort({ port: greetingApp.port, timeoutMs: 800 })).toBe('ready');

    // An app that starts listening a moment later is found by the next attempt.
    const free = await findAvailablePort(proxyWithoutApp.port + 1);
    const late = createServer(() => {});
    setTimeout(() => late.listen(free!, '127.0.0.1'), 500);
    const startedAt = Date.now();
    expect(await waitForTcpPort({ port: free!, timeoutMs: 5000 })).toBe('ready');
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(500);
    late.close();

    // A container that exits while dev mode waits ends the wait at once.
    expect(await waitForTcpPort({ port: free!, timeoutMs: 5000, shouldStop: () => true })).toBe('stopped');
  } finally {
    for (const { server } of [proxyWithoutApp, app, greetingApp]) server.close();
  }
});

// With Linux host networking an app that listens on `localhost` may bind only ::1; it serves, and dev mode must see it.
test('a port counts as serving when the app listens only on the IPv6 loopback', async () => {
  const app = createServer(() => {});
  const listening = await new Promise<boolean>((resolve) => {
    app.once('error', () => resolve(false));
    app.listen(0, '::1', () => resolve(true));
  });
  if (!listening) return; // This machine has no IPv6 loopback.
  try {
    expect(await waitForTcpPort({ port: (app.address() as AddressInfo).port, timeoutMs: 800 })).toBe('ready');
  } finally {
    app.close();
  }
});
