import { expect, test } from 'bun:test';
import { createServer, type Server } from 'node:net';
import { isPortInUse } from './ports';

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
