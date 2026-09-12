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

test('a free port is available and the probes release it for the tunnel', async () => {
  const server = createServer();
  const port = await listen(server, 0, '127.0.0.1');
  await close(server);
  try {
    expect(await isPortInUse(port)).toBe(false);
    await listen(server, port, '127.0.0.1');
  } finally {
    await close(server);
  }
});

test.each(['127.0.0.1', '0.0.0.0'])('detects an existing listener on %s', async (host) => {
  const server = createServer();
  const port = await listen(server, 0, host);
  try {
    expect(await isPortInUse(port)).toBe(true);
    expect(await isPortInUse(port, host)).toBe(true);
  } finally {
    await close(server);
  }
  expect(await isPortInUse(port)).toBe(false);
});
