import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { Server } from 'node:http';
import { createServer as createHttpServer } from 'node:http';

mock.module('@application-services/global-state-manager', () => ({
  globalStateManager: {
    stage: 'test1',
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

const closeServer = (server: Server): Promise<void> =>
  new Promise((resolve) => {
    server.close(() => resolve());
  });

const startEchoBackend = (port: number): Promise<Server> =>
  new Promise((resolve) => {
    const server = createHttpServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('echo');
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });

describe('ensureNamedProxyRoute', () => {
  afterEach(async () => {
    const { stopNamedProxy } = await import('../manager');
    await stopNamedProxy();
  });

  test('returns hostname, url, and proxyPort', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const result = await ensureNamedProxyRoute({ resourceName: 'webService', targetPort: 19200 });
    expect(result.hostname).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.proxyPort).toBeGreaterThan(0);
  });

  test('hostname includes sanitized resource name and stage', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const result = await ensureNamedProxyRoute({ resourceName: 'webService', targetPort: 19200 });
    expect(result.hostname).toContain('webservice');
    expect(result.hostname).toContain('test1');
    expect(result.hostname).toEndWith('.localhost');
  });

  test('url matches expected format', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const result = await ensureNamedProxyRoute({ resourceName: 'myApp', targetPort: 19200 });
    expect(result.url).toMatch(/^http:\/\/myapp\.test1\.localhost:\d+$/);
  });

  test('multiple routes use the same proxy port', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const route1 = await ensureNamedProxyRoute({ resourceName: 'app1', targetPort: 19201 });
    const route2 = await ensureNamedProxyRoute({ resourceName: 'app2', targetPort: 19202 });
    expect(route1.proxyPort).toBe(route2.proxyPort);
  });

  test('proxy server actually routes to target', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const backend = await startEchoBackend(19210);
    try {
      const route = await ensureNamedProxyRoute({ resourceName: 'echo', targetPort: 19210 });
      const res = await fetch(route.url, { headers: { Host: route.hostname } });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('echo');
    } finally {
      await closeServer(backend);
    }
  });

  test('re-registering same resource updates route', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const backend1 = await startEchoBackend(19211);
    const backend2 = await startEchoBackend(19212);
    try {
      const route1 = await ensureNamedProxyRoute({ resourceName: 'updatable', targetPort: 19211 });
      const route2 = await ensureNamedProxyRoute({ resourceName: 'updatable', targetPort: 19212 });

      expect(route1.hostname).toBe(route2.hostname);
      expect(route1.proxyPort).toBe(route2.proxyPort);

      const res = await fetch(route2.url, { headers: { Host: route2.hostname } });
      expect(res.status).toBe(200);
    } finally {
      await Promise.all([closeServer(backend1), closeServer(backend2)]);
    }
  });
});

describe('removeNamedProxyRoute', () => {
  afterEach(async () => {
    const { stopNamedProxy } = await import('../manager');
    await stopNamedProxy();
  });

  test('removed route returns 404', async () => {
    const { ensureNamedProxyRoute, removeNamedProxyRoute } = await import('../manager');
    const backend = await startEchoBackend(19220);
    try {
      const route = await ensureNamedProxyRoute({ resourceName: 'removable', targetPort: 19220 });

      const before = await fetch(route.url, { headers: { Host: route.hostname } });
      expect(before.status).toBe(200);

      removeNamedProxyRoute('removable');

      const after = await fetch(route.url, { headers: { Host: route.hostname } });
      expect(after.status).toBe(404);
    } finally {
      await closeServer(backend);
    }
  });

  test('removing non-existent route is a no-op', async () => {
    const { removeNamedProxyRoute } = await import('../manager');
    expect(() => removeNamedProxyRoute('nonexistent')).not.toThrow();
  });
});

describe('stopNamedProxy', () => {
  test('stops the proxy server', async () => {
    const { ensureNamedProxyRoute, stopNamedProxy } = await import('../manager');
    const route = await ensureNamedProxyRoute({ resourceName: 'app', targetPort: 19230 });
    await stopNamedProxy();

    try {
      await fetch(route.url, { headers: { Host: route.hostname } });
    } catch {
      // Expected: connection refused
    }
  });

  test('can be called multiple times safely', async () => {
    const { ensureNamedProxyRoute, stopNamedProxy } = await import('../manager');
    await ensureNamedProxyRoute({ resourceName: 'app', targetPort: 19231 });
    await stopNamedProxy();
    await stopNamedProxy();
  });

  test('proxy can be restarted after stop', async () => {
    const { ensureNamedProxyRoute, stopNamedProxy } = await import('../manager');
    const backend = await startEchoBackend(19232);
    try {
      await ensureNamedProxyRoute({ resourceName: 'restartable', targetPort: 19232 });
      await stopNamedProxy();

      const route2 = await ensureNamedProxyRoute({ resourceName: 'restartable', targetPort: 19232 });
      const res = await fetch(route2.url, { headers: { Host: route2.hostname } });
      expect(res.status).toBe(200);
    } finally {
      await closeServer(backend);
    }
  });
});

describe('hostname sanitization', () => {
  afterEach(async () => {
    const { stopNamedProxy } = await import('../manager');
    await stopNamedProxy();
  });

  test('uppercase resource names are lowercased', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const result = await ensureNamedProxyRoute({ resourceName: 'MyWebService', targetPort: 19240 });
    expect(result.hostname).not.toMatch(/[A-Z]/);
  });

  test('special characters are replaced with hyphens', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const result = await ensureNamedProxyRoute({ resourceName: 'my_web_service', targetPort: 19241 });
    expect(result.hostname).toContain('my-web-service');
  });

  test('long resource names are truncated', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const result = await ensureNamedProxyRoute({
      resourceName: 'thisIsAnExtremelyLongResourceNameThatShouldBeTruncated',
      targetPort: 19242
    });
    const resourcePart = result.hostname.split('.')[0];
    expect(resourcePart.length).toBeLessThanOrEqual(24);
  });
});

describe('concurrent route registration', () => {
  afterEach(async () => {
    const { stopNamedProxy } = await import('../manager');
    await stopNamedProxy();
  });

  test('concurrent ensureNamedProxyRoute calls share the same proxy', async () => {
    const { ensureNamedProxyRoute } = await import('../manager');
    const results = await Promise.all([
      ensureNamedProxyRoute({ resourceName: 'concurrent1', targetPort: 19250 }),
      ensureNamedProxyRoute({ resourceName: 'concurrent2', targetPort: 19251 }),
      ensureNamedProxyRoute({ resourceName: 'concurrent3', targetPort: 19252 })
    ]);

    const ports = new Set(results.map((r) => r.proxyPort));
    expect(ports.size).toBe(1);

    const hostnames = new Set(results.map((r) => r.hostname));
    expect(hostnames.size).toBe(3);
  });
});
