import { buildOperationsCli } from '../../scripts/operations/cli-process';
import {
  developerIdentity,
  LOOPBACK_API_KEY,
  LOOPBACK_DEVICE_CODE,
  LOOPBACK_SESSION_TOKEN,
  LOOPBACK_USER_CODE,
  LOOPBACK_VERIFICATION_URI,
  scriptDeviceAuthorization,
  startLoopbackConsole,
  type DevicePollAnswer
} from '../../scripts/operations/loopback-console';
import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdir, mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import stripAnsi from 'strip-ansi';

/**
 * `stacktape login` signs in with the OAuth device authorization flow served by Better Auth in the Stacktape API: it
 * prints an address and a code, polls until the person approves on the Console's `/device` page, exchanges the
 * short-lived session for a CLI session key and stores the key. The source CLI runs as a process against a loopback
 * stand-in for the API (Better Auth's `/auth/device/*` routes and the tRPC endpoint). The key lives in the temporary
 * home's state file (`STACKTAPE_CREDENTIAL_STORE=file`), so the machine's credential store is never touched, and
 * `--noBrowser` keeps the CLI from opening a browser on the machine running the tests.
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

const emptyHome = async () => {
  const home = await mkdtemp(join(tmpdir(), 'stacktape-login-'));
  cleanups.push(() => rm(home, { recursive: true, force: true }));
  await mkdir(join(home, '__stacktape-dist/dev/helper-lambdas'), { recursive: true });
  return home;
};

const startConsole = async ({ answers, interval }: { answers: DevicePollAnswer[]; interval?: number }) => {
  const api = await startLoopbackConsole({ identity: developerIdentity({ projectName: 'login' }) });
  cleanups.push(() => api.close());
  const device = scriptDeviceAuthorization(api, { answers, ...(interval === undefined ? {} : { interval }) });
  return { api, device };
};

/** The Console's exchange: a list of organizations first, then a CLI session key for the chosen one. */
const exchangeFor = (organizations: Array<{ id: string; name: string }>) => (input: unknown) => {
  const { sessionToken, idToken, organizationId, listOrganizationsOnly } = input as Record<string, unknown>;
  if (sessionToken !== LOOPBACK_SESSION_TOKEN || idToken !== undefined) {
    return { success: false, error: 'Invalid session.' };
  }
  if (listOrganizationsOnly === true) return { success: true, apiKeys: [], organizations };
  const organization = organizations.find(({ id }) => id === organizationId);
  if (!organization) return { success: false, error: 'Not a member of that organization.' };
  return {
    success: true,
    apiKeys: [
      {
        id: LOOPBACK_API_KEY,
        createdAt: '2026-10-28T00:00:00.000Z',
        updatedAt: '2026-10-28T00:00:00.000Z',
        lastUsed: null,
        name: 'CLI login',
        userId: 'user_operations',
        organizationId: organization.id,
        organizationName: organization.name
      }
    ]
  };
};

const environment = (home: string, endpoint: string) => ({
  PATH: process.env.PATH,
  HOME: home,
  USERPROFILE: home,
  NO_COLOR: '1',
  SKIP_LOADING_ENV: '1',
  STP_DISABLE_TELEMETRY: '1',
  STP_DEV_MODE: 'true',
  AWS_EC2_METADATA_DISABLED: 'true',
  STACKTAPE_CREDENTIAL_STORE: 'file',
  STP_CUSTOM_TRPC_API_ENDPOINT: endpoint
});

const commandLine = () => [
  process.execPath,
  '--preload',
  join(cliDirectory, 'scripts/network-guard-preload.ts'),
  cli.path,
  'login',
  '--noBrowser'
];

/** `stacktape login` without a terminal, as an agent or a script runs it. */
const loginWithoutTerminal = (home: string, endpoint: string) => {
  const child = Bun.spawn(commandLine(), {
    cwd: home,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
    env: { ...environment(home, endpoint), CI: '1' }
  });
  const result = Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]).then(
    ([stdout, stderr, exitCode]) => ({ output: stdout + stderr, exitCode })
  );
  return { child, result };
};

const storedKey = async (home: string, endpoint: string) => {
  const file = join(home, '.stacktape/persisted-state.json');
  const exists = await stat(file).then(
    () => true,
    () => false
  );
  if (!exists) return undefined;
  const state = JSON.parse(await readFile(file, 'utf8')) as {
    authentication?: { apiKeysByEndpoint?: Record<string, string> };
  };
  return state.authentication?.apiKeysByEndpoint?.[endpoint];
};

/** Every file the CLI wrote under the temporary home, so a token written anywhere is found. */
const everythingWritten = async (home: string): Promise<string> => {
  const contents: string[] = [];
  const walk = async (directory: string) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) contents.push(await readFile(path, 'utf8'));
    }
  };
  await walk(home);
  return contents.join('\n');
};

const exchangeCalls = (api: Awaited<ReturnType<typeof startConsole>>['api']) =>
  api.calls.filter(({ procedure }) => procedure === 'exchangeTokenForApiKey').map(({ input }) => input);

test('login prints the address and code, waits for approval, and stores a CLI session for the only organization', async () => {
  const { api, device } = await startConsole({
    // A 503 in the middle is retried like a lost connection; the code is still valid.
    answers: ['authorization_pending', 'unavailable', 'authorization_pending', 'approve']
  });
  api.on('exchangeTokenForApiKey', exchangeFor([{ id: 'org_operations', name: 'Operations Org' }]));
  const home = await emptyHome();

  const { output, exitCode } = await loginWithoutTerminal(home, api.endpoint).result;

  expect(exitCode, output).toBe(0);
  expect(output).toContain(`To sign in, open ${LOOPBACK_VERIFICATION_URI}?user_code=${LOOPBACK_USER_CODE}`);
  expect(output).toContain(
    `Your code is ${LOOPBACK_USER_CODE}. Approve only if the Stacktape Console shows the same code.`
  );
  expect(output).toContain('Organization: Operations Org');
  expect(output).toContain('Login successful!');
  expect(device.polls).toHaveLength(4);
  expect(exchangeCalls(api)).toEqual([
    { sessionToken: LOOPBACK_SESSION_TOKEN, listOrganizationsOnly: true },
    { sessionToken: LOOPBACK_SESSION_TOKEN, organizationId: 'org_operations' }
  ]);
  expect(await storedKey(home, api.endpoint)).toBe(LOOPBACK_API_KEY);
  if (process.platform !== 'win32') {
    expect((await stat(join(home, '.stacktape/persisted-state.json'))).mode & 0o777).toBe(0o600);
  }

  // The session token and the device code exist only in memory and on the wire to the API.
  for (const secret of [LOOPBACK_SESSION_TOKEN, LOOPBACK_DEVICE_CODE, LOOPBACK_API_KEY]) {
    expect(output).not.toContain(secret);
  }
  const written = await everythingWritten(home);
  expect(written).toContain(LOOPBACK_API_KEY);
  expect(written).not.toContain(LOOPBACK_SESSION_TOKEN);
  expect(written).not.toContain(LOOPBACK_DEVICE_CODE);
  expect(api.unexpected).toEqual([]);
}, 120_000);

test('a user in several organizations chooses one in the terminal', async () => {
  const { api } = await startConsole({ answers: ['authorization_pending', 'approve'] });
  api.on(
    'exchangeTokenForApiKey',
    exchangeFor([
      { id: 'org_personal', name: 'dev-personal-org' },
      { id: 'org_operations', name: 'Operations Org' }
    ])
  );
  const home = await emptyHome();

  let screen = '';
  const decoder = new TextDecoder();
  const child = Bun.spawn(commandLine(), {
    cwd: home,
    env: { ...environment(home, api.endpoint), TERM: 'xterm-256color' },
    terminal: {
      cols: 120,
      rows: 40,
      data: (_terminal, data) => {
        screen += decoder.decode(data, { stream: true });
      }
    }
  });
  cleanups.push(async () => {
    child.kill('SIGKILL');
    await child.exited;
  });
  const waitFor = async (text: string, from = 0) => {
    const deadline = Date.now() + 30_000;
    while (!stripAnsi(screen.slice(from)).includes(text)) {
      if (child.exitCode !== null || Date.now() > deadline) {
        throw new Error(`login did not show "${text}" (exit ${child.exitCode}):\n${stripAnsi(screen).slice(-2000)}`);
      }
      await Bun.sleep(20);
    }
  };

  // The browser is the default answer to the first question.
  await waitFor('How would you like to sign in?');
  child.terminal!.write('\r');
  await waitFor('Select the organization you want to use.');
  // The generated personal organization reads as "Personal", as it does once signed in.
  await waitFor('Personal');
  child.terminal!.write('\x1b[B');
  await Bun.sleep(100);
  child.terminal!.write('\r');

  expect(await child.exited, stripAnsi(screen)).toBe(0);
  expect(stripAnsi(screen)).toContain('Login successful!');
  expect(exchangeCalls(api).at(-1)).toEqual({ sessionToken: LOOPBACK_SESSION_TOKEN, organizationId: 'org_operations' });
  expect(await storedKey(home, api.endpoint)).toBe(LOOPBACK_API_KEY);
  expect(screen).not.toContain(LOOPBACK_SESSION_TOKEN);
}, 120_000);

test('slow_down adds five seconds to the polling interval', async () => {
  const { api, device } = await startConsole({ answers: ['slow_down', 'approve'], interval: 0.05 });
  api.on('exchangeTokenForApiKey', exchangeFor([{ id: 'org_operations', name: 'Operations Org' }]));
  const home = await emptyHome();

  const { output, exitCode } = await loginWithoutTerminal(home, api.endpoint).result;

  expect(exitCode, output).toBe(0);
  expect(device.polls).toHaveLength(2);
  expect(device.polls[1]! - device.polls[0]!).toBeGreaterThanOrEqual(5_000);
  expect(await storedKey(home, api.endpoint)).toBe(LOOPBACK_API_KEY);
}, 120_000);

for (const { answer, message } of [
  { answer: 'expired_token', message: 'The sign-in code expired before it was approved. Run stacktape login again.' },
  {
    answer: 'access_denied',
    message: 'The sign-in was denied in the Stacktape Console. Run stacktape login again to sign in.'
  }
] as const) {
  test(`${answer} stops polling, fails the login and stores nothing`, async () => {
    const { api, device } = await startConsole({ answers: ['authorization_pending', answer] });
    const home = await emptyHome();

    const { output, exitCode } = await loginWithoutTerminal(home, api.endpoint).result;

    expect(exitCode, output).not.toBe(0);
    expect(output).toContain(message);
    expect(device.polls).toHaveLength(2);
    expect(exchangeCalls(api)).toEqual([]);
    expect(await storedKey(home, api.endpoint)).toBeUndefined();
  }, 120_000);
}

test('Ctrl+C while waiting stops polling and stores nothing', async () => {
  const { api, device } = await startConsole({ answers: ['authorization_pending'] });
  const home = await emptyHome();

  const { child, result } = loginWithoutTerminal(home, api.endpoint);
  const deadline = Date.now() + 30_000;
  while (device.polls.length < 2 && Date.now() < deadline) await Bun.sleep(20);
  expect(device.polls.length).toBeGreaterThanOrEqual(2);
  child.kill('SIGINT');
  const { output } = await result;

  expect(output).toContain('Received SIGINT. Exiting.');
  const pollsAtExit = device.polls.length;
  await Bun.sleep(300);
  expect(device.polls).toHaveLength(pollsAtExit);
  expect(exchangeCalls(api)).toEqual([]);
  expect(await storedKey(home, api.endpoint)).toBeUndefined();
}, 120_000);

test('an unreachable API fails the login without a code', async () => {
  const home = await emptyHome();
  // A port that was just free: nothing listens there.
  const probe = createServer();
  await new Promise<void>((done) => probe.listen(0, '127.0.0.1', done));
  const { port } = probe.address() as AddressInfo;
  await new Promise<void>((done) => probe.close(() => done()));
  const endpoint = `http://127.0.0.1:${port}/stacktape-api`;

  const { output, exitCode } = await loginWithoutTerminal(home, endpoint).result;

  expect(exitCode, output).not.toBe(0);
  expect(output).toContain('Could not reach the Stacktape API.');
  expect(output).not.toContain('Your code is');
  expect(await storedKey(home, endpoint)).toBeUndefined();
}, 120_000);
