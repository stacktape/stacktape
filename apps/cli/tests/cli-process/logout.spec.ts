import { buildOperationsCli } from '../../scripts/operations/cli-process';
import {
  ConsoleProcedureError,
  developerIdentity,
  LOOPBACK_API_KEY,
  startLoopbackConsole
} from '../../scripts/operations/loopback-console';
import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * `stacktape logout` revokes the CLI session on the Stacktape API, then removes it from this machine. The source CLI
 * runs as a process against a loopback stand-in for the API's tRPC endpoint; the key lives in the temporary home's
 * state file (`STACKTAPE_CREDENTIAL_STORE=file`), so the machine's credential store is never touched.
 */

const cliDirectory = resolve(import.meta.dir, '../..');
let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
beforeAll(async () => {
  cli = await buildOperationsCli();
}, 60_000);
afterAll(async () => {
  await cli?.close();
});
const cleanups: Array<() => Promise<unknown>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

const homeWithKey = async (endpoint: string, apiKey: string) => {
  const home = await mkdtemp(join(tmpdir(), 'stacktape-logout-'));
  cleanups.push(() => rm(home, { recursive: true, force: true }));
  await mkdir(join(home, '.stacktape'));
  await mkdir(join(home, '__stacktape-dist/dev/helper-lambdas'), { recursive: true });
  await writeFile(
    join(home, '.stacktape/persisted-state.json'),
    JSON.stringify({
      systemId: 'logout-test',
      cliArgsDefaults: { region: 'eu-west-1' },
      otherDefaults: {},
      authentication: { apiKeysByEndpoint: { [endpoint]: apiKey, 'http://127.0.0.1:1': 'other-endpoint-key' } }
    }),
    { mode: 0o644 }
  );
  return home;
};

const stateOf = async (home: string) =>
  JSON.parse(await readFile(join(home, '.stacktape/persisted-state.json'), 'utf8')) as {
    cliArgsDefaults: Record<string, string>;
    authentication: { apiKeysByEndpoint: Record<string, string> };
  };

const logout = async (home: string, endpoint: string) => {
  const child = Bun.spawn(
    [process.execPath, '--preload', join(cliDirectory, 'scripts/network-guard-preload.ts'), cli.path, 'logout'],
    {
      cwd: home,
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: 'ignore',
      env: {
        PATH: process.env.PATH,
        HOME: home,
        USERPROFILE: home,
        CI: '1',
        NO_COLOR: '1',
        SKIP_LOADING_ENV: '1',
        STP_DISABLE_TELEMETRY: '1',
        STP_DEV_MODE: 'true',
        AWS_EC2_METADATA_DISABLED: 'true',
        STACKTAPE_CREDENTIAL_STORE: 'file',
        STP_CUSTOM_TRPC_API_ENDPOINT: endpoint
      }
    }
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);
  return { output: stdout + stderr, exitCode };
};

const startConsole = async () => {
  const api = await startLoopbackConsole({ identity: developerIdentity({ projectName: 'logout' }) });
  cleanups.push(() => api.close());
  return api;
};

const expectRemovedLocally = async (home: string, endpoint: string) => {
  const state = await stateOf(home);
  expect(state.authentication.apiKeysByEndpoint[endpoint]).toBeUndefined();
  // Only this endpoint's login goes; other endpoints' logins and the defaults stay.
  expect(state.authentication.apiKeysByEndpoint['http://127.0.0.1:1']).toBe('other-endpoint-key');
  expect(state.cliArgsDefaults.region).toBe('eu-west-1');
  if (process.platform !== 'win32') {
    expect((await stat(join(home, '.stacktape/persisted-state.json'))).mode & 0o777).toBe(0o600);
  }
};

test('logout revokes the CLI session on the API, then removes it from this machine', async () => {
  const api = await startConsole();
  let revocations = 0;
  api.on('revokeCurrentCliSession', () => {
    revocations++;
    return { revoked: true };
  });
  const home = await homeWithKey(api.endpoint, LOOPBACK_API_KEY);

  const result = await logout(home, api.endpoint);

  expect(result.exitCode, result.output).toBe(0);
  expect(revocations).toBe(1);
  expect(result.output).toContain('The CLI session was revoked and removed from this machine.');
  expect(result.output).not.toContain(LOOPBACK_API_KEY);
  await expectRemovedLocally(home, api.endpoint);
  expect(api.unexpected).toEqual([]);

  // Nothing is left to revoke: a second logout makes no request.
  const again = await logout(home, api.endpoint);
  expect(again.exitCode).toBe(0);
  expect(again.output).toContain('You are not logged in on this machine.');
  expect(revocations).toBe(1);
}, 120_000);

test('a key that is not a CLI session is removed locally and reported as still valid', async () => {
  const api = await startConsole();
  api.on('revokeCurrentCliSession', () => ({ revoked: false }));
  const home = await homeWithKey(api.endpoint, LOOPBACK_API_KEY);

  const result = await logout(home, api.endpoint);

  expect(result.exitCode, result.output).toBe(0);
  expect(result.output).toContain('it stays valid. Manage it in the Stacktape Console.');
  expect(result.output).toContain('The API key was removed from this machine.');
  await expectRemovedLocally(home, api.endpoint);
}, 120_000);

test('a session the API no longer accepts is removed without a warning', async () => {
  const api = await startConsole();
  api.on('revokeCurrentCliSession', () => {
    throw new ConsoleProcedureError('UNAUTHORIZED', 'API key has expired');
  });
  const home = await homeWithKey(api.endpoint, LOOPBACK_API_KEY);

  const result = await logout(home, api.endpoint);

  expect(result.exitCode, result.output).toBe(0);
  expect(api.calls.map(({ procedure }) => procedure)).toEqual(['revokeCurrentCliSession']);
  expect(result.output).toContain('The CLI session was removed from this machine.');
  expect(result.output).not.toContain('stays valid');
  await expectRemovedLocally(home, api.endpoint);
}, 120_000);

test('an unreachable API still removes the session locally and says it stays valid', async () => {
  // A port that was just free: nothing listens there.
  const probe = createServer();
  await new Promise<void>((done) => probe.listen(0, '127.0.0.1', done));
  const { port } = probe.address() as AddressInfo;
  await new Promise<void>((done) => probe.close(() => done()));
  const endpoint = `http://127.0.0.1:${port}/stacktape-api`;
  const home = await homeWithKey(endpoint, LOOPBACK_API_KEY);

  const result = await logout(home, endpoint);

  expect(result.exitCode, result.output).toBe(0);
  expect(result.output).toContain('It stays valid until it expires or is revoked in the Stacktape Console.');
  expect(result.output).toContain('The CLI session was removed from this machine.');
  await expectRemovedLocally(home, endpoint);
}, 120_000);

test('an API that never answers does not hold logout for longer than the request timeout', async () => {
  const sockets = new Set<import('node:net').Socket>();
  const silent: Server = createServer(() => {
    // Accept the request and never answer.
  });
  silent.on('connection', (socket) => sockets.add(socket));
  await new Promise<void>((done) => silent.listen(0, '127.0.0.1', done));
  cleanups.push(
    () =>
      new Promise<void>((done) => {
        for (const socket of sockets) socket.destroy();
        silent.close(() => done());
      })
  );
  const endpoint = `http://127.0.0.1:${(silent.address() as AddressInfo).port}/stacktape-api`;
  const home = await homeWithKey(endpoint, LOOPBACK_API_KEY);

  const startedAt = Date.now();
  const result = await logout(home, endpoint);

  expect(result.exitCode, result.output).toBe(0);
  expect(Date.now() - startedAt).toBeLessThan(25_000);
  expect(result.output).toContain('the CLI session was not revoked');
  await expectRemovedLocally(home, endpoint);
}, 120_000);
