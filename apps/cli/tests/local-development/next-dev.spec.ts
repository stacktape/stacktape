import { expect, test } from 'bun:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { connect, type AddressInfo } from 'node:net';
import { networkInterfaces, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { applicationManager } from '@application-services/application-manager';
import { configManager } from '@domain-services/config-manager';
import { runProcess } from '../../scripts/qualification/process';
import { registerDevServerCleanupHook } from '../../src/commands/dev/dev-server';
import { stopNamedProxy } from '../../src/commands/dev/named-proxy/manager';
import { startNextjsWebDevServer } from '../../src/commands/dev/nextjs-web';

const hasIpv6Loopback = () =>
  new Promise<boolean>((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(0, '::1', () => server.close(() => resolve(true)));
  });

/** Copies the pinned Next fixture into `directory` and installs it. */
const installNextFixture = async (directory: string) => {
  await cp(join(import.meta.dir, 'fixtures/next'), directory, { recursive: true });
  const install = await runProcess({
    command: 'pnpm',
    args: ['install', '--frozen-lockfile', '--ignore-scripts'],
    cwd: directory,
    env: { PATH: process.env.PATH, HOME: directory, CI: 'true', NEXT_TELEMETRY_DISABLED: '1' },
    timeoutMs: 120_000
  });
  expect(install.exitCode, install.stderr.slice(-2000)).toBe(0);
};

const listening = (port: number, timeout = 500) =>
  fetch(`http://127.0.0.1:${port}`, { headers: { Connection: 'close' }, signal: AbortSignal.timeout(timeout) });

test('a real Next dev server uses its connected local parameters, serves edits at its stable URL and releases its ports', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-next-dev-'));
  const foreign = createServer((_request, response) => response.end('foreign'));
  await new Promise<void>((resolve) => foreign.listen(0, '127.0.0.1', resolve));
  const port = (foreign.address() as AddressInfo).port;
  const originalEnv = {
    STP_CACHE_CONNECTION_STRING: process.env.STP_CACHE_CONNECTION_STRING,
    NODE_ENV: process.env.NODE_ENV,
    NODE_OPTIONS: process.env.NODE_OPTIONS,
    NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED
  };
  let proxyPort: number | undefined;
  try {
    await installNextFixture(directory);
    await writeFile(join(directory, '.env.development.local'), 'STP_DB_CONNECTION_STRING=foreign-file-value\n');
    await writeFile(join(directory, '.env.local'), '# my settings\nMY_FLAG=kept\n');
    // Dev mode sets every local database's variables on its own process; a frontend without `connectTo` to the cache
    // must not inherit them.
    process.env.STP_CACHE_CONNECTION_STRING = 'redis://default:cache-password@localhost:6379';
    process.env.NODE_OPTIONS = `--import=${resolve(import.meta.dir, '../../scripts/network-guard-preload.ts')}`;
    process.env.NEXT_TELEMETRY_DISABLED = '1';
    process.env.NODE_ENV = 'development';
    globalStateManager.rawArgs = { stage: 'next-test', currentWorkingDirectory: directory };
    configManager.setStackContext({
      accountId: '123456789012',
      command: 'dev',
      globallyUniqueStackHash: 'test',
      invocationId: 'test',
      projectName: 'localdev',
      region: 'eu-west-1',
      stackName: 'localdev-test',
      stage: 'test',
      workingDir: directory
    });
    configManager.config = {
      resources: {
        web: {
          type: 'nextjs-web',
          properties: {
            appDirectory: directory,
            dev: { command: `node node_modules/next/dist/bin/next dev --port ${port}` }
          }
        }
      }
    };
    registerDevServerCleanupHook();
    const state = await startNextjsWebDevServer({
      name: 'web',
      connectedEnvVars: { STP_DB_CONNECTION_STRING: 'local-database-value' },
      withheldEnvNames: ['STP_CACHE_CONNECTION_STRING']
    });
    expect(state.status).toBe('ready');
    expect(state.url).toBeDefined();
    expect(state.port).toBeGreaterThan(port);
    const backendPort = state.port!;
    expect(await (await listening(backendPort, 15_000)).text()).toContain(
      'first-render: <!-- -->local-database-value<!-- --> cache: <!-- -->not-connected'
    );
    // Next listens on 127.0.0.1 only. On `::` (its default) another program could take the port's loopback addresses
    // on Windows and receive the requests meant for it (r2bd2).
    if (await hasIpv6Loopback()) {
      await expect(
        fetch(`http://[::1]:${backendPort}`, { headers: { Connection: 'close' }, signal: AbortSignal.timeout(2000) })
      ).rejects.toThrow();
    }
    const url = new URL(state.url!);
    proxyPort = Number(url.port);
    const request = () =>
      fetch(`http://127.0.0.1:${proxyPort}`, { headers: { Host: url.hostname }, signal: AbortSignal.timeout(15_000) });
    const first = await request();
    expect(first.status).toBe(200);
    expect(await first.text()).toContain('first-render: <!-- -->local-database-value');
    const envFile = await readFile(join(directory, '.env.local'), 'utf8');
    expect(envFile).toStartWith('# my settings\nMY_FLAG=kept\n');
    expect(envFile).toContain('STP_DB_CONNECTION_STRING=local-database-value');
    expect(envFile).not.toContain('cache-password');
    const page = join(directory, 'pages/index.js');
    await writeFile(page, (await readFile(page, 'utf8')).replace('first-render', 'edited-render'));
    let rendered = '';
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      rendered = await (await request()).text();
      if (rendered.includes('edited-render:')) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(rendered).toContain('edited-render: <!-- -->local-database-value');
    await Promise.all(applicationManager.cleanUpHooks.map((hook) => hook({ success: true, interrupted: false })));
    await expect(listening(backendPort)).rejects.toThrow();
    expect((await request()).status).toBe(404);
    expect(await (await listening(port)).text()).toBe('foreign');
  } finally {
    const cleanup = await Promise.allSettled(
      applicationManager.cleanUpHooks.map((hook) => hook({ success: true, interrupted: false }))
    );
    try {
      await stopNamedProxy();
    } finally {
      foreign.closeAllConnections();
      await new Promise<void>((resolve) => foreign.close(() => resolve()));
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      await rm(directory, { recursive: true, force: true });
    }
    expect(cleanup.every(({ status }) => status === 'fulfilled')).toBeTrue();
    if (proxyPort) await expect(listening(proxyPort)).rejects.toThrow();
  }
}, 180_000);

// PR #431 review: a developer who runs `next dev --hostname 0.0.0.0` through a package script, to open the app from a
// phone on the LAN, keeps that address; dev mode adds only the port and its proxy reaches the server on 127.0.0.1.
test('a Next package script that chooses its own host keeps it, and the stable URL still reaches the server', async () => {
  const lanAddress = Object.values(networkInterfaces())
    .flat()
    .find((address) => address && address.family === 'IPv4' && !address.internal)?.address;
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-next-host-'));
  const originalEnv = {
    NODE_OPTIONS: process.env.NODE_OPTIONS,
    NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED
  };
  try {
    await installNextFixture(directory);
    const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    manifest.scripts = { dev: 'next dev --hostname 0.0.0.0' };
    await writeFile(join(directory, 'package.json'), JSON.stringify(manifest, null, 2));
    process.env.NODE_OPTIONS = `--import=${resolve(import.meta.dir, '../../scripts/network-guard-preload.ts')}`;
    process.env.NEXT_TELEMETRY_DISABLED = '1';
    globalStateManager.rawArgs = { stage: 'next-host', currentWorkingDirectory: directory };
    configManager.setStackContext({
      accountId: '123456789012',
      command: 'dev',
      globallyUniqueStackHash: 'test',
      invocationId: 'test',
      projectName: 'localdev',
      region: 'eu-west-1',
      stackName: 'localdev-test',
      stage: 'test',
      workingDir: directory
    });
    configManager.config = {
      resources: {
        web: { type: 'nextjs-web', properties: { appDirectory: directory, dev: { command: 'npm run dev' } } }
      }
    };
    registerDevServerCleanupHook();
    const state = await startNextjsWebDevServer({
      name: 'web',
      connectedEnvVars: { STP_DB_CONNECTION_STRING: 'own-host-value' },
      withheldEnvNames: []
    });
    expect(state.status).toBe('ready');
    const url = new URL(state.url!);
    const response = await fetch(`http://127.0.0.1:${url.port}`, {
      headers: { Host: url.hostname },
      signal: AbortSignal.timeout(30_000)
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('first-render: <!-- -->own-host-value');
    // Listening on 0.0.0.0, the server accepts on the machine's LAN address too, not only on loopback.
    if (lanAddress) expect(await acceptsConnection(lanAddress, state.port!)).toBeTrue();
  } finally {
    await Promise.allSettled(
      applicationManager.cleanUpHooks.map((hook) => hook({ success: true, interrupted: false }))
    );
    await stopNamedProxy();
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  }
}, 180_000);

const acceptsConnection = (host: string, port: number) =>
  new Promise<boolean>((resolveConnection) => {
    const socket = connect({ host, port });
    socket.once('connect', () => {
      socket.destroy();
      resolveConnection(true);
    });
    socket.once('error', () => resolveConnection(false));
    setTimeout(() => {
      socket.destroy();
      resolveConnection(false);
    }, 2000);
  });
