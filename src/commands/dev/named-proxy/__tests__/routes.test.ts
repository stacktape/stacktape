import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { RouteStore } from '../routes';

let testDir: string;
let store: RouteStore;

beforeEach(() => {
  testDir = join(tmpdir(), `route-store-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testDir, { recursive: true });
  store = new RouteStore(testDir);
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('RouteStore', () => {
  describe('ensureDir', () => {
    test('creates directory if it does not exist', () => {
      const nested = join(testDir, 'nested', 'subdir');
      const nestedStore = new RouteStore(nested);
      nestedStore.ensureDir();
      expect(existsSync(nested)).toBe(true);
    });

    test('no-op if directory already exists', () => {
      store.ensureDir();
      store.ensureDir(); // Should not throw
    });
  });

  describe('addRoute', () => {
    test('adds a route to the store', () => {
      store.addRoute('myapp.dev.localhost', 3000, process.pid);
      const routes = store.loadRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].hostname).toBe('myapp.dev.localhost');
      expect(routes[0].port).toBe(3000);
      expect(routes[0].pid).toBe(process.pid);
    });

    test('replaces existing route with same hostname', () => {
      store.addRoute('myapp.dev.localhost', 3000, process.pid);
      store.addRoute('myapp.dev.localhost', 4000, process.pid);
      const routes = store.loadRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].port).toBe(4000);
    });

    test('stores multiple routes', () => {
      store.addRoute('app1.dev.localhost', 3001, process.pid);
      store.addRoute('app2.dev.localhost', 3002, process.pid);
      store.addRoute('app3.dev.localhost', 3003, process.pid);
      const routes = store.loadRoutes();
      expect(routes).toHaveLength(3);
    });

    test('persists routes to JSON file', () => {
      store.addRoute('persisted.localhost', 5000, process.pid);
      const raw = readFileSync(store.getRoutesPath(), 'utf-8');
      const data = JSON.parse(raw);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].hostname).toBe('persisted.localhost');
    });
  });

  describe('removeRoute', () => {
    test('removes a route by hostname', () => {
      store.addRoute('to-remove.localhost', 3000, process.pid);
      store.addRoute('to-keep.localhost', 3001, process.pid);
      store.removeRoute('to-remove.localhost');
      const routes = store.loadRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].hostname).toBe('to-keep.localhost');
    });

    test('no-op when hostname does not exist', () => {
      store.addRoute('existing.localhost', 3000, process.pid);
      store.removeRoute('nonexistent.localhost');
      const routes = store.loadRoutes();
      expect(routes).toHaveLength(1);
    });
  });

  describe('loadRoutes', () => {
    test('returns empty array when no routes file exists', () => {
      const routes = store.loadRoutes();
      expect(routes).toEqual([]);
    });

    test('returns empty array for corrupted JSON', () => {
      store.ensureDir();
      writeFileSync(store.getRoutesPath(), 'not valid json');
      const routes = store.loadRoutes();
      expect(routes).toEqual([]);
    });

    test('returns empty array for non-array JSON', () => {
      store.ensureDir();
      writeFileSync(store.getRoutesPath(), JSON.stringify({ not: 'an array' }));
      const routes = store.loadRoutes();
      expect(routes).toEqual([]);
    });

    test('filters out entries with invalid schema', () => {
      store.ensureDir();
      writeFileSync(
        store.getRoutesPath(),
        JSON.stringify([
          { hostname: 'valid.localhost', port: 3000, pid: process.pid },
          { hostname: 'missing-port.localhost', pid: process.pid },
          { port: 3001, pid: process.pid },
          { hostname: 'missing-pid.localhost', port: 3002 },
          'not-an-object',
          null
        ])
      );
      const routes = store.loadRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].hostname).toBe('valid.localhost');
    });

    test('filters out routes with dead PIDs', () => {
      store.ensureDir();
      // PID 99999999 should not be alive
      writeFileSync(
        store.getRoutesPath(),
        JSON.stringify([
          { hostname: 'alive.localhost', port: 3000, pid: process.pid },
          { hostname: 'dead.localhost', port: 3001, pid: 99999999 }
        ])
      );
      const routes = store.loadRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].hostname).toBe('alive.localhost');
    });

    test('persistCleanup writes cleaned routes back to file', () => {
      store.ensureDir();
      writeFileSync(
        store.getRoutesPath(),
        JSON.stringify([
          { hostname: 'alive.localhost', port: 3000, pid: process.pid },
          { hostname: 'dead.localhost', port: 3001, pid: 99999999 }
        ])
      );

      store.loadRoutes(true);

      const raw = readFileSync(store.getRoutesPath(), 'utf-8');
      const data = JSON.parse(raw);
      expect(data).toHaveLength(1);
      expect(data[0].hostname).toBe('alive.localhost');
    });
  });

  describe('locking', () => {
    test('addRoute cleans up lock after success', () => {
      store.addRoute('app.localhost', 3000, process.pid);
      const lockPath = join(testDir, 'routes.lock');
      expect(existsSync(lockPath)).toBe(false);
    });

    test('removeRoute cleans up lock after success', () => {
      store.addRoute('app.localhost', 3000, process.pid);
      store.removeRoute('app.localhost');
      const lockPath = join(testDir, 'routes.lock');
      expect(existsSync(lockPath)).toBe(false);
    });

    test('stale lock is cleaned up', () => {
      store.ensureDir();
      const lockPath = join(testDir, 'routes.lock');
      mkdirSync(lockPath);
      // Set the lock's mtime to 15 seconds ago (beyond the 10s threshold)
      const staleTime = new Date(Date.now() - 15000);
      utimesSync(lockPath, staleTime, staleTime);

      // Should succeed because the stale lock gets cleaned up
      store.addRoute('after-stale.localhost', 3000, process.pid);
      const routes = store.loadRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].hostname).toBe('after-stale.localhost');
    });
  });

  describe('file paths', () => {
    test('pidPath is in the store directory', () => {
      expect(store.pidPath).toBe(join(testDir, 'proxy.pid'));
    });

    test('portFilePath is in the store directory', () => {
      expect(store.portFilePath).toBe(join(testDir, 'proxy.port'));
    });

    test('routesPath is in the store directory', () => {
      expect(store.getRoutesPath()).toBe(join(testDir, 'routes.json'));
    });
  });
});
