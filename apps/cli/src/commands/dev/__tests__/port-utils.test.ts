import { afterEach, describe, expect, test } from 'bun:test';
import type { Server } from 'node:net';
import { createServer } from 'node:net';
import {
  clearPortCache,
  extractPortFromCommand,
  findAvailablePort,
  getDefaultPort,
  isPortAvailable,
  isPortReserved,
  parsePortFromError,
  releasePorts,
  reservePorts
} from '../port-utils';

const occupyPort = (port: number): Promise<Server> =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });

const closeServer = (server: Server): Promise<void> =>
  new Promise((resolve) => {
    server.close(() => resolve());
  });

describe('isPortAvailable', () => {
  afterEach(() => {
    clearPortCache();
  });

  test('returns true for unused port', async () => {
    expect(await isPortAvailable(19300)).toBe(true);
  });

  test('returns false for occupied port', async () => {
    const server = await occupyPort(19301);
    try {
      clearPortCache(19301);
      expect(await isPortAvailable(19301)).toBe(false);
    } finally {
      await closeServer(server);
    }
  });

  test('returns true after port is released', async () => {
    const server = await occupyPort(19302);
    clearPortCache(19302);
    expect(await isPortAvailable(19302)).toBe(false);
    await closeServer(server);
    clearPortCache(19302);
    expect(await isPortAvailable(19302)).toBe(true);
  });
});

describe('findAvailablePort', () => {
  afterEach(() => {
    clearPortCache();
  });

  test('returns the start port if available', async () => {
    const port = await findAvailablePort(19310);
    expect(port).toBe(19310);
  });

  test('skips occupied ports', async () => {
    const server = await occupyPort(19320);
    try {
      clearPortCache();
      const port = await findAvailablePort(19320);
      expect(port).toBeDefined();
      expect(port).not.toBe(19320);
      expect(port).toBeGreaterThan(19320);
    } finally {
      await closeServer(server);
    }
  });

  test('returns null if all ports are exhausted', async () => {
    // Occupy a small range and search within it
    const servers: Server[] = [];
    try {
      for (let i = 0; i < 3; i++) {
        servers.push(await occupyPort(19330 + i));
      }
      clearPortCache();
      const port = await findAvailablePort(19330, 3);
      expect(port).toBeNull();
    } finally {
      await Promise.all(servers.map(closeServer));
    }
  });

  test('respects maxAttempts parameter', async () => {
    const port = await findAvailablePort(19340, 1);
    expect(port).toBe(19340);
  });
});

describe('parsePortFromError', () => {
  test('parses EADDRINUSE error with ::: prefix', () => {
    expect(parsePortFromError('EADDRINUSE: address already in use :::3001')).toBe(3001);
  });

  test('parses EADDRINUSE error with IP prefix', () => {
    expect(parsePortFromError('listen EADDRINUSE: address already in use 0.0.0.0:3000')).toBe(3000);
  });

  test('parses port: pattern', () => {
    expect(parsePortFromError('port: 3001')).toBe(3001);
  });

  test('parses port with spaces', () => {
    expect(parsePortFromError('port 8080')).toBe(8080);
  });

  test('returns null for unrelated error', () => {
    expect(parsePortFromError('Some random error')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(parsePortFromError('')).toBeNull();
  });

  test('returns null for invalid port number', () => {
    expect(parsePortFromError('EADDRINUSE: address already in use :::0')).toBeNull();
  });

  test('returns null for port out of range', () => {
    expect(parsePortFromError('EADDRINUSE: address already in use :::99999')).toBeNull();
  });
});

describe('extractPortFromCommand', () => {
  test('extracts --port with space', () => {
    expect(extractPortFromCommand('vite dev --port 3000')).toBe(3000);
  });

  test('extracts --port with equals', () => {
    expect(extractPortFromCommand('vite dev --port=5173')).toBe(5173);
  });

  test('extracts -p with space', () => {
    expect(extractPortFromCommand('next dev -p 3001')).toBe(3001);
  });

  test('extracts -p with equals', () => {
    expect(extractPortFromCommand('next dev -p=4000')).toBe(4000);
  });

  test('returns null when no port flag', () => {
    expect(extractPortFromCommand('vite dev')).toBeNull();
  });

  test('returns null for empty command', () => {
    expect(extractPortFromCommand('')).toBeNull();
  });

  test('extracts port from complex command', () => {
    expect(extractPortFromCommand('bun run dev -- --port 8080 --host 0.0.0.0')).toBe(8080);
  });
});

describe('getDefaultPort', () => {
  test('returns 3000 for next', () => {
    expect(getDefaultPort('next')).toBe(3000);
  });

  test('returns 5173 for vite', () => {
    expect(getDefaultPort('vite')).toBe(5173);
  });

  test('returns 4321 for astro', () => {
    expect(getDefaultPort('astro')).toBe(4321);
  });

  test('returns 4200 for angular', () => {
    expect(getDefaultPort('angular')).toBe(4200);
  });

  test('returns 3000 for unknown framework', () => {
    expect(getDefaultPort('some-unknown-framework')).toBe(3000);
  });

  test('returns 5173 for sveltekit', () => {
    expect(getDefaultPort('sveltekit')).toBe(5173);
  });

  test('returns 3000 for nuxt', () => {
    expect(getDefaultPort('nuxt')).toBe(3000);
  });
});

describe('reservePorts / releasePorts / isPortReserved', () => {
  afterEach(() => {
    releasePorts([19400, 19401, 19402, 19403, 19404, 19405]);
  });

  test('reservePorts marks ports as reserved', () => {
    reservePorts([19400, 19401]);
    expect(isPortReserved(19400)).toBe(true);
    expect(isPortReserved(19401)).toBe(true);
    expect(isPortReserved(19402)).toBe(false);
  });

  test('releasePorts unmarks reserved ports', () => {
    reservePorts([19400]);
    expect(isPortReserved(19400)).toBe(true);
    releasePorts([19400]);
    expect(isPortReserved(19400)).toBe(false);
  });

  test('findAvailablePort skips reserved ports', async () => {
    reservePorts([19403]);
    clearPortCache();
    const port = await findAvailablePort(19403, 10);
    expect(port).not.toBe(19403);
    expect(port).toBe(19404);
  });

  test('findAvailablePort skips reserved range', async () => {
    reservePorts([19403, 19404, 19405]);
    clearPortCache();
    const port = await findAvailablePort(19403, 10);
    expect(port).toBeDefined();
    expect(port).toBeGreaterThan(19405);
  });

  test('findAvailablePort returns null when all ports are reserved', async () => {
    reservePorts([19403, 19404, 19405]);
    clearPortCache();
    const port = await findAvailablePort(19403, 3);
    expect(port).toBeNull();
  });
});
