import { afterEach, expect, test } from 'bun:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { globalStateManager } from '@application-services/global-state-manager';
import { ensureNamedProxyRoute, removeNamedProxyRoute, stopNamedProxy } from '../manager';

// Exercise the real manager and proxy together. Distinct bodies make a stale route observable.
const backend = async (body: string, port = 0) => {
  const server = createServer((_request, response) => response.end(body));
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return { server, port: (server.address() as AddressInfo).port };
};
const close = (server: Server) =>
  new Promise<void>((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });
const request = (route: { hostname: string; proxyPort: number }) =>
  fetch(`http://127.0.0.1:${route.proxyPort}`, { headers: { Host: route.hostname } });

afterEach(async () => {
  await stopNamedProxy();
});

test('stable workload URLs follow port changes, restart, removal and a new proxy session', async () => {
  globalStateManager.rawArgs = { stage: 'test1' };
  const first = await backend('first');
  let original = first;
  const replacement = await backend('replacement');
  try {
    const route = await ensureNamedProxyRoute({ resourceName: 'My_web_service', targetPort: original.port });
    expect(route.hostname).toBe('my-web-service.test1.localhost');
    expect(route.url).toBe(`http://${route.hostname}:${route.proxyPort}`);
    expect(await (await request(route)).text()).toBe('first');
    const updated = await ensureNamedProxyRoute({ resourceName: 'My_web_service', targetPort: replacement.port });
    expect(updated).toEqual(route);
    expect(await (await request(route)).text()).toBe('replacement');
    await close(replacement.server);
    expect((await request(route)).status).toBe(502);
    original = await backend('rebuilt', replacement.port);
    expect(await (await request(route)).text()).toBe('rebuilt');
    const kept = await ensureNamedProxyRoute({ resourceName: 'kept', targetPort: original.port });
    removeNamedProxyRoute('My_web_service');
    expect((await request(route)).status).toBe(404);
    expect(await (await request(kept)).text()).toBe('rebuilt');
    await stopNamedProxy();
    await expect(request(kept)).rejects.toThrow();
    await stopNamedProxy();
    const restarted = await ensureNamedProxyRoute({ resourceName: 'kept', targetPort: original.port });
    expect(await (await request(restarted)).text()).toBe('rebuilt');
  } finally {
    await close(first.server);
    await close(original.server);
    await close(replacement.server);
  }
});

test('concurrent registration shares one proxy and routes to distinct backends', async () => {
  const servers = await Promise.all(['one', 'two', 'three'].map((body) => backend(body)));
  try {
    const routes = await Promise.all(
      servers.map(({ port }, index) => ensureNamedProxyRoute({ resourceName: `concurrent${index}`, targetPort: port }))
    );
    expect(new Set(routes.map(({ proxyPort }) => proxyPort)).size).toBe(1);
    expect(await Promise.all(routes.map(async (route) => (await request(route)).text()))).toEqual([
      'one',
      'two',
      'three'
    ]);
  } finally {
    await Promise.all(servers.map(({ server }) => close(server)));
  }
});
