import { afterEach, expect, test } from 'bun:test';
import { createServer, type AddressInfo } from 'node:net';
import {
  clearPortCache,
  extractPortFromCommand,
  findAvailablePort,
  getContainerListenPort,
  releasePorts,
  reservePorts
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
