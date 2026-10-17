import { afterEach, expect, test } from 'bun:test';
import { createServer, type AddressInfo } from 'node:net';
import { clearPortCache, extractPortFromCommand, findAvailablePort, releasePorts, reservePorts } from '../port-utils';

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
