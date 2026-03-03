/**
 * Integration tests for the named proxy system.
 * Tests the full lifecycle: proxy startup, route registration,
 * HTTP request routing, inter-service communication, and cleanup.
 */
import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import type { Server } from 'node:http';
import { createServer as createHttpServer } from 'node:http';

mock.module('@application-services/global-state-manager', () => ({
  globalStateManager: {
    stage: 'integ',
    workingDir: '/tmp/test'
  }
}));

mock.module('@application-services/tui-manager', () => ({
  tuiManager: {
    info: () => {},
    warn: () => {}
  },
  UserCancelledError: class UserCancelledError extends Error {}
}));

mock.module('@application-services/application-manager', () => ({
  applicationManager: {
    registerCleanUpHook: () => {}
  }
}));

type BackendServer = {
  server: Server;
  port: number;
  requests: Array<{
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
  }>;
};

const startBackend = (port: number, responseBody: string): Promise<BackendServer> =>
  new Promise((resolve) => {
    const requests: BackendServer['requests'] = [];
    const server = createHttpServer((req, res) => {
      requests.push({ method: req.method!, url: req.url!, headers: req.headers as Record<string, string> });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ service: responseBody, url: req.url, method: req.method }));
    });
    server.listen(port, '127.0.0.1', () => resolve({ server, port, requests }));
  });

const closeServer = (s: Server): Promise<void> =>
  new Promise((resolve) => {
    s.close(() => resolve());
  });

describe('named proxy - full lifecycle integration', () => {
  const backends: BackendServer[] = [];

  const WEB_SERVICE_PORT = 19400;
  const SPA_FRONTEND_PORT = 19401;
  const API_SERVICE_PORT = 19402;
  const PRIVATE_SERVICE_PORT = 19403;

  beforeAll(async () => {
    backends.push(
      await startBackend(WEB_SERVICE_PORT, 'web-service'),
      await startBackend(SPA_FRONTEND_PORT, 'spa-frontend'),
      await startBackend(API_SERVICE_PORT, 'api-service'),
      await startBackend(PRIVATE_SERVICE_PORT, 'private-service')
    );
  });

  afterAll(async () => {
    await Promise.all(backends.map((b) => closeServer(b.server)));
  });

  afterEach(async () => {
    const { stopNamedProxy } = await import('../manager');
    await stopNamedProxy();
  });

  test('register and access multiple services through proxy', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');

    const webRoute = await ensureNamedProxyRoute({ resourceName: 'webService', targetPort: WEB_SERVICE_PORT });
    const spaRoute = await ensureNamedProxyRoute({ resourceName: 'spaFrontend', targetPort: SPA_FRONTEND_PORT });
    const apiRoute = await ensureNamedProxyRoute({ resourceName: 'apiService', targetPort: API_SERVICE_PORT });
    const privateRoute = await ensureNamedProxyRoute({
      resourceName: 'privateService',
      targetPort: PRIVATE_SERVICE_PORT
    });

    // All routes share same proxy port
    expect(new Set([webRoute.proxyPort, spaRoute.proxyPort, apiRoute.proxyPort, privateRoute.proxyPort]).size).toBe(1);

    // Each route has unique hostname
    const hostnames = [webRoute.hostname, spaRoute.hostname, apiRoute.hostname, privateRoute.hostname];
    expect(new Set(hostnames).size).toBe(4);

    // All hostnames follow pattern: resource.stage.localhost
    for (const hn of hostnames) {
      expect(hn).toEndWith('.integ.localhost');
    }

    // Verify routing to each backend
    const webRes = await fetch(`${webRoute.url}/api/health`, { headers: { Host: webRoute.hostname } });
    const webBody = (await webRes.json()) as { service: string; url: string };
    expect(webBody.service).toBe('web-service');
    expect(webBody.url).toBe('/api/health');

    const spaRes = await fetch(`${spaRoute.url}/`, { headers: { Host: spaRoute.hostname } });
    const spaBody = (await spaRes.json()) as { service: string };
    expect(spaBody.service).toBe('spa-frontend');

    const apiRes = await fetch(`${apiRoute.url}/v2/data`, { headers: { Host: apiRoute.hostname } });
    const apiBody = (await apiRes.json()) as { service: string };
    expect(apiBody.service).toBe('api-service');

    const privateRes = await fetch(`${privateRoute.url}/internal`, { headers: { Host: privateRoute.hostname } });
    const privateBody = (await privateRes.json()) as { service: string };
    expect(privateBody.service).toBe('private-service');
  });

  test('route update redirects traffic to new backend', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');

    // First registration - points to web-service
    const route = await ensureNamedProxyRoute({ resourceName: 'swappable', targetPort: WEB_SERVICE_PORT });

    const res1 = await fetch(route.url, { headers: { Host: route.hostname } });
    const body1 = (await res1.json()) as { service: string };
    expect(body1.service).toBe('web-service');

    // Re-register to point to api-service
    await ensureNamedProxyRoute({ resourceName: 'swappable', targetPort: API_SERVICE_PORT });

    const res2 = await fetch(route.url, { headers: { Host: route.hostname } });
    const body2 = (await res2.json()) as { service: string };
    expect(body2.service).toBe('api-service');
  });

  test('removing one route does not affect others', async () => {
    const { ensureNamedProxyRoute, removeNamedProxyRoute } = await import('../manager');

    const routeA = await ensureNamedProxyRoute({ resourceName: 'serviceA', targetPort: WEB_SERVICE_PORT });
    const routeB = await ensureNamedProxyRoute({ resourceName: 'serviceB', targetPort: SPA_FRONTEND_PORT });

    // Remove A
    removeNamedProxyRoute('serviceA');

    // A should be 404
    const resA = await fetch(routeA.url, { headers: { Host: routeA.hostname } });
    expect(resA.status).toBe(404);

    // B should still work
    const resB = await fetch(routeB.url, { headers: { Host: routeB.hostname } });
    expect(resB.status).toBe(200);
    const bodyB = (await resB.json()) as { service: string };
    expect(bodyB.service).toBe('spa-frontend');
  });

  test('proxy forwards all HTTP methods correctly', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const route = await ensureNamedProxyRoute({ resourceName: 'methodTest', targetPort: WEB_SERVICE_PORT });

    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    for (const method of methods) {
      const res = await fetch(`${route.url}/test`, { method, headers: { Host: route.hostname } });
      const body = (await res.json()) as { method: string };
      expect(body.method).toBe(method);
    }
  });

  test('proxy preserves query parameters', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const route = await ensureNamedProxyRoute({ resourceName: 'queryTest', targetPort: WEB_SERVICE_PORT });

    const res = await fetch(`${route.url}/search?q=hello&page=2&filter=active`, {
      headers: { Host: route.hostname }
    });
    const body = (await res.json()) as { url: string };
    expect(body.url).toBe('/search?q=hello&page=2&filter=active');
  });

  test('X-Forwarded headers are set on all proxied requests', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const route = await ensureNamedProxyRoute({ resourceName: 'headerCheck', targetPort: WEB_SERVICE_PORT });

    // Clear request log
    backends[0].requests.length = 0;

    await fetch(route.url, { headers: { Host: route.hostname } });

    expect(backends[0].requests.length).toBeGreaterThan(0);
    const lastReq = backends[0].requests[backends[0].requests.length - 1];
    expect(lastReq.headers['x-forwarded-for']).toBeDefined();
    expect(lastReq.headers['x-forwarded-proto']).toBe('http');
    expect(lastReq.headers['x-forwarded-host']).toBe(route.hostname);
  });

  test('X-Portless response header is present', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const route = await ensureNamedProxyRoute({ resourceName: 'portlessCheck', targetPort: WEB_SERVICE_PORT });

    const res = await fetch(route.url, { headers: { Host: route.hostname } });
    expect(res.headers.get('x-portless')).toBe('1');
  });

  test('simultaneous requests to different routes are isolated', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');

    const routes = await Promise.all([
      ensureNamedProxyRoute({ resourceName: 'iso1', targetPort: WEB_SERVICE_PORT }),
      ensureNamedProxyRoute({ resourceName: 'iso2', targetPort: SPA_FRONTEND_PORT }),
      ensureNamedProxyRoute({ resourceName: 'iso3', targetPort: API_SERVICE_PORT })
    ]);

    // Send all requests concurrently
    const responses = await Promise.all(
      routes.map(async (route) => {
        const res = await fetch(route.url, { headers: { Host: route.hostname } });
        return (await res.json()) as { service: string };
      })
    );

    expect(responses[0].service).toBe('web-service');
    expect(responses[1].service).toBe('spa-frontend');
    expect(responses[2].service).toBe('api-service');
  });

  test('large number of routes can be registered', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');

    const routes = [];
    for (let i = 0; i < 20; i++) {
      routes.push(
        await ensureNamedProxyRoute({
          resourceName: `service${i}`,
          targetPort: WEB_SERVICE_PORT
        })
      );
    }

    expect(routes).toHaveLength(20);
    const uniqueHostnames = new Set(routes.map((r) => r.hostname));
    expect(uniqueHostnames.size).toBe(20);

    // Verify last route is reachable
    const res = await fetch(routes[19].url, { headers: { Host: routes[19].hostname } });
    expect(res.status).toBe(200);
  });
});

describe('named proxy - error resilience', () => {
  afterEach(async () => {
    const { stopNamedProxy } = await import('../manager');
    await stopNamedProxy();
  });

  test('502 when backend goes down after route registration', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');

    // Start a backend, register route, then kill the backend
    const backend = await startBackend(19410, 'ephemeral');
    const route = await ensureNamedProxyRoute({ resourceName: 'ephemeral', targetPort: 19410 });

    // Verify it works
    const res1 = await fetch(route.url, { headers: { Host: route.hostname } });
    expect(res1.status).toBe(200);

    // Kill backend
    await closeServer(backend.server);

    // Should get 502
    const res2 = await fetch(route.url, { headers: { Host: route.hostname } });
    expect(res2.status).toBe(502);
  });

  test('service recovers after backend restarts', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');

    const port = 19411;
    let backend = await startBackend(port, 'recoverable');
    const route = await ensureNamedProxyRoute({ resourceName: 'recoverable', targetPort: port });

    // Kill and restart
    await closeServer(backend.server);
    backend = await startBackend(port, 'recovered');

    const res = await fetch(route.url, { headers: { Host: route.hostname } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { service: string };
    expect(body.service).toBe('recovered');

    await closeServer(backend.server);
  });
});
