import { afterEach, expect, test } from 'bun:test';
import { createServer as createHttpServer } from 'node:http';
import { createServer, type AddressInfo, type Server, type Socket } from 'node:net';
import { startCommandMayChangeData, waitUntilRunServes } from './run-readiness';

const servers: Server[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) server.close();
});

const listen = async (server: Server) => {
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return (server.address() as AddressInfo).port;
};

/**
 * A container whose process manager accepts connections at once and never answers, then exits after `exitAfterMs`,
 * as gunicorn does when its worker cannot import the app.
 */
const processManagerThatExits = async (exitAfterMs: number) => {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => sockets.add(socket));
  const port = await listen(server);
  let exited = false;
  setTimeout(() => {
    exited = true;
    for (const socket of sockets) socket.destroy();
    server.close();
  }, exitAfterMs);
  return { port, shouldStop: () => exited };
};

// #367 review: under gunicorn, nginx, supervisord or a Node cluster primary, a rebuilt container accepted connections
// before its app failed, took the stable port over and stopped the previous container; then it exited.
test.each([
  ['an HTTP workload', true],
  ['a TCP workload', false]
])('a rebuilt run that accepts connections and then exits is not ready (%s)', async (_, servesHttp) => {
  const run = await processManagerThatExits(600);
  expect(await waitUntilRunServes({ ...run, servesHttp, confirm: true, timeoutMs: 10_000, settleMs: 1500 })).toBe(
    'stopped'
  );
});

test('a rebuilt HTTP run is ready once it answers without a proxy error and keeps running', async () => {
  let appLoaded = false;
  setTimeout(() => (appLoaded = true), 500);
  // An nginx in front of the app answers 502 until the app behind it listens.
  const port = await listen(
    createHttpServer((_request, response) => {
      response.statusCode = appLoaded ? 404 : 502;
      response.end();
    })
  );
  const started = Date.now();
  const result = await waitUntilRunServes({
    port,
    servesHttp: true,
    confirm: true,
    timeoutMs: 10_000,
    settleMs: 300,
    shouldStop: () => false
  });
  expect(result).toBe('ready');
  expect(Date.now() - started).toBeGreaterThanOrEqual(800);
});

test('a first start counts as ready once the port accepts connections; a worker without a port at once', async () => {
  const run = await processManagerThatExits(5000);
  expect(await waitUntilRunServes({ ...run, servesHttp: true, confirm: false, timeoutMs: 2000 })).toBe('ready');
  expect(
    await waitUntilRunServes({
      port: undefined,
      servesHttp: false,
      confirm: false,
      timeoutMs: 2000,
      shouldStop: () => false
    })
  ).toBe('ready');
  // A rebuilt worker must keep running for the settle time.
  let exited = false;
  setTimeout(() => (exited = true), 200);
  expect(
    await waitUntilRunServes({
      port: undefined,
      servesHttp: false,
      confirm: true,
      timeoutMs: 2000,
      settleMs: 600,
      shouldStop: () => exited
    })
  ).toBe('stopped');
});

test.each([
  ['alembic upgrade head && uvicorn main:app --port $PORT', true],
  ['npx prisma migrate deploy && node dist/index.js', true],
  ['python manage.py migrate; gunicorn app.wsgi', true],
  ['uvicorn main:app --port $PORT', false],
  ['npm run build && node dist/index.js', false],
  ['node migrate-users.js', false]
])('the start command %p may change data: %p', (command, changes) => {
  expect(startCommandMayChangeData(command)).toBe(changes);
});
