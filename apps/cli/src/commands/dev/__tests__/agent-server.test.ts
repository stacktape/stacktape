import { expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { request } from 'node:http';
import { createConnection, createServer, type AddressInfo } from 'node:net';
import { networkInterfaces, tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  describeBatchFailureCause,
  getAgentTokenFile,
  getDeployedResources,
  getNotReadyReasons,
  startAgentServer,
  stopAgentServer,
  updateAgentState,
  type WorkloadStatus
} from '../agent-server';

// The dev agent runs SQL, rebuilds and stops dev mode, and reads workload environments. These scenarios run the real
// agent server and call it the way a web page, a DNS-rebinding page, another program on the network and the
// developer's own tools would.
const CLI_DIRECTORY = join(import.meta.dir, '..', '..', '..', '..');

const SECRETS = ['hunter2-db-password', 'sk_live_51HxExampleSecretKey00', 'whsec-plain-webhook-value', 'IQoJb3JpZ2lu'];

const startRealAgent = async (directory: string) => {
  const driver = join(directory, 'agent.ts');
  await writeFile(
    driver,
    `
import { createServer } from 'node:net';
import { applicationManager } from ${JSON.stringify(join(CLI_DIRECTORY, 'src/app/application-manager/index.ts'))};
import { startAgentServer, updateAgentState, getAgentTokenFile, registerAgentCleanupHook } from ${JSON.stringify(join(CLI_DIRECTORY, 'src/commands/dev/agent-server.ts'))};
await applicationManager.init();
registerAgentCleanupHook();
const probe = createServer();
await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const environment = {
  STP_DB_CONNECTION_STRING: 'postgresql://postgres:${SECRETS[0]}@localhost:5432/app',
  STRIPE_KEY: '${SECRETS[1]}',
  PAYMENT_WEBHOOK: '${SECRETS[2]}',
  AWS_SESSION_TOKEN: '${SECRETS[3]}',
  STP_DB_HOST: 'localhost',
  PORT: '3000'
};
await startAgentServer(port, ${JSON.stringify(directory)}, {
  getEnvVars: (name) => (name === 'api' ? environment : null),
  getSecretEnvNames: () => new Set(['PAYMENT_WEBHOOK'])
});
updateAgentState({
  phase: 'ready',
  workloads: [
    { name: 'api', type: 'container', status: 'running' },
    { name: 'worker', type: 'container', status: 'error', error: 'Stack update failed: MainTableGlobalTable' }
  ]
});
console.log(JSON.stringify({ port, tokenFile: getAgentTokenFile() }));
`
  );
  const agent = spawn(
    process.execPath,
    ['--no-env-file', '--preload', join(CLI_DIRECTORY, 'scripts/test-preload.ts'), driver],
    {
      cwd: CLI_DIRECTORY,
      env: { PATH: process.env.PATH, HOME: directory, SKIP_LOADING_ENV: '1', STP_DISABLE_TELEMETRY: '1' }
    }
  );
  let output = '';
  const started = new Promise<{ port: number; tokenFile: string }>((resolve, reject) => {
    agent.stdout.on('data', (data) => {
      output += data;
      const line = output.split('\n').find((candidate) => candidate.startsWith('{"port"'));
      if (line) resolve(JSON.parse(line));
    });
    agent.stderr.on('data', (data) => (output += data));
    agent.once('exit', (code) => reject(new Error(`agent exited early (${code}): ${output}`)));
  });
  return { agent, ...(await started) };
};

type RawResponse = { status: number; body: { ok?: boolean; code?: string; message?: string; data?: any } };

/** A raw HTTP request, so the test controls the Host, Origin and content-type headers a browser or attacker sends. */
const send = (
  port: number,
  {
    method = 'GET',
    path,
    headers = {},
    body
  }: { method?: string; path: string; headers?: Record<string, string>; body?: string }
) =>
  new Promise<RawResponse>((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers }, (response) => {
      let text = '';
      response.on('data', (chunk) => (text += chunk));
      response.on('end', () => resolve({ status: response.statusCode!, body: JSON.parse(text) }));
    });
    req.once('error', reject);
    req.end(body);
  });

const reachable = (host: string, port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = createConnection({ host, port, timeout: 2000 });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });

const isRunning = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

test('the dev agent refuses web pages, foreign hosts and callers without its token, and masks secret values', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-agent-security-'));
  const { agent, port, tokenFile } = await startRealAgent(directory);
  try {
    const token = await readFile(tokenFile, 'utf8');
    expect(token.length).toBeGreaterThanOrEqual(40);
    // Every client finds it by port in the user's state directory, which only that user can read.
    expect(tokenFile).toBe(join(directory, '.stacktape', 'dev-agent-tokens', `${port}.token`));
    if (process.platform !== 'win32') {
      expect(statSync(tokenFile).mode & 0o777).toBe(0o600);
      expect(statSync(join(directory, '.stacktape', 'dev-agent-tokens')).mode & 0o777).toBe(0o700);
    }
    const host = `127.0.0.1:${port}`;
    const auth = { authorization: `Bearer ${token}` };

    // Programs on the network: the agent listens on loopback only.
    const lanAddress = Object.values(networkInterfaces())
      .flat()
      .find((address) => address?.family === 'IPv4' && !address.internal)?.address;
    if (lanAddress) expect(await reachable(lanAddress, port)).toBeFalse();

    const refusals: Array<[string, Parameters<typeof send>[1], number, string]> = [
      ['no token', { path: '/status', headers: { host } }, 401, 'UNAUTHORIZED'],
      [
        'a wrong token',
        { path: '/status', headers: { host, authorization: `Bearer ${'x'.repeat(token.length)}` } },
        401,
        'UNAUTHORIZED'
      ],
      ['no token on the documentation route', { path: '/?compact=true', headers: { host } }, 401, 'UNAUTHORIZED'],
      // DNS rebinding: a page on evil.example resolves its own name to 127.0.0.1; the browser sends its Host.
      [
        'a rebound host name',
        { path: '/env/api', headers: { ...auth, host: `evil.example:${port}` } },
        403,
        'FORBIDDEN'
      ],
      [
        'a browser Origin',
        { path: '/env/api', headers: { ...auth, host, origin: 'https://evil.example' } },
        403,
        'FORBIDDEN'
      ],
      // A "simple" cross-site POST needs no preflight: text/plain with a JSON-looking body.
      [
        'a text/plain stop request',
        { method: 'POST', path: '/stop', headers: { ...auth, host, 'content-type': 'text/plain' }, body: '{}' },
        415,
        'UNSUPPORTED_MEDIA_TYPE'
      ],
      [
        'an unauthenticated JSON stop request',
        { method: 'POST', path: '/stop', headers: { host, 'content-type': 'application/json' }, body: '{}' },
        401,
        'UNAUTHORIZED'
      ]
    ];
    for (const [name, requestOptions, status, code] of refusals) {
      const response = await send(port, requestOptions);
      expect({ name, status: response.status, code: response.body.code, data: response.body.data }).toEqual({
        name,
        status,
        code,
        data: undefined
      });
    }
    // The refusal tells a local tool where the token is, never the token itself.
    const unauthorized = await send(port, { path: '/status', headers: { host } });
    expect(unauthorized.body.message).toContain(tokenFile);
    expect(JSON.stringify(unauthorized.body)).not.toContain(token);

    // None of the refused stop requests stopped the agent.
    expect(isRunning(agent.pid!)).toBeTrue();
    const status = await send(port, { path: '/status', headers: { ...auth, host: `localhost:${port}` } });
    expect(status.status).toBe(200);
    expect(status.body.data).toMatchObject({
      phase: 'ready',
      ready: false,
      failedWorkloads: [{ name: 'worker', error: 'Stack update failed: MainTableGlobalTable' }]
    });

    const environment = await send(port, { path: '/env/api', headers: { ...auth, host } });
    expect(environment.status).toBe(200);
    const serialized = JSON.stringify(environment.body);
    for (const secret of SECRETS) expect(serialized).not.toContain(secret);
    expect(environment.body.data.envVars).toMatchObject({
      STP_DB_CONNECTION_STRING: 'postgresql://[redacted:credentials]@localhost:5432/app',
      STRIPE_KEY: '[redacted]',
      PAYMENT_WEBHOOK: '[redacted]',
      AWS_SESSION_TOKEN: '[redacted]',
      STP_DB_HOST: 'localhost',
      PORT: '3000'
    });

    // r2ll: a workload that failed before dev mode prepared its environment answered INTERNAL_ERROR, with a hint that
    // named workload types whose environments are tracked.
    const notStarted = await send(port, { path: '/env/worker', headers: { ...auth, host } });
    expect(notStarted.body).toMatchObject({ ok: false, code: 'WORKLOAD_NOT_STARTED' });
    expect(notStarted.body.message).toContain('Stack update failed: MainTableGlobalTable');

    // The developer's own tool, with the token and a JSON body, stops the agent; the token goes with it.
    const stop = await send(port, {
      method: 'POST',
      path: '/stop',
      headers: { ...auth, host, 'content-type': 'application/json' },
      body: '{}'
    });
    expect(stop.status).toBe(200);
    const deadline = Date.now() + 15_000;
    while (isRunning(agent.pid!) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100));
    expect(isRunning(agent.pid!)).toBeFalse();
    expect(existsSync(tokenFile)).toBeFalse();
  } finally {
    if (agent.exitCode === null && agent.signalCode === null) agent.kill('SIGKILL');
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);

const freePort = async () => {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as AddressInfo).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
};

test('the dev agent is ready only when dev mode started and every selected workload runs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-agent-ready-'));
  const originalTokenDirectory = process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
  process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = join(directory, 'tokens');
  // Token files left by agents that were killed: one whose port is free again, one whose port another program uses.
  const deadAgentPort = await freePort();
  const busy = createServer();
  await new Promise<void>((resolve) => busy.listen(0, '127.0.0.1', resolve));
  const busyPort = (busy.address() as AddressInfo).port;
  await mkdir(join(directory, 'tokens'), { recursive: true });
  const earlier = new Date(Date.now() - 60_000);
  for (const stalePort of [deadAgentPort, busyPort]) {
    await writeFile(join(directory, 'tokens', `${stalePort}.token`), 'stale');
    await utimes(join(directory, 'tokens', `${stalePort}.token`), earlier, earlier);
  }
  const port = await freePort();
  await startAgentServer(port, directory);
  try {
    // A starting agent removes the token files of dead agents, but cannot tell a live agent from another program.
    expect(existsSync(join(directory, 'tokens', `${deadAgentPort}.token`))).toBeFalse();
    expect(existsSync(join(directory, 'tokens', `${busyPort}.token`))).toBeTrue();

    const token = await readFile(getAgentTokenFile()!, 'utf8');
    const status = async () =>
      (
        (await (
          await fetch(`http://127.0.0.1:${port}/status`, { headers: { authorization: `Bearer ${token}` } })
        ).json()) as { data: { ready: boolean; failedWorkloads: unknown[]; workloads: Record<string, string> } }
      ).data;
    const api: WorkloadStatus = { name: 'api', type: 'container', status: 'running', url: 'http://localhost:3000' };
    const crashed: WorkloadStatus = {
      name: 'worker',
      type: 'container',
      status: 'error',
      error: 'Container stopped unexpectedly: Error: Cannot find module dist/index.js'
    };

    updateAgentState({ phase: 'ready', workloads: [api, crashed] });
    expect(await status()).toMatchObject({
      ready: false,
      failedWorkloads: [{ name: 'worker', error: crashed.error }],
      workloads: { api: 'http://localhost:3000', worker: `error: ${crashed.error}` }
    });

    updateAgentState({ phase: 'starting', workloads: [api, { ...crashed, status: 'starting', error: undefined }] });
    expect(await status()).toMatchObject({ ready: false, failedWorkloads: [] });

    updateAgentState({ phase: 'ready', workloads: [api, { ...crashed, status: 'running', error: undefined }] });
    expect(await status()).toMatchObject({ ready: true, failedWorkloads: [] });

    // A session that runs only local databases has no workloads and is ready once dev mode started.
    updateAgentState({ phase: 'ready', workloads: [] });
    expect((await status()).ready).toBeTrue();
  } finally {
    stopAgentServer();
    busy.close();
    if (originalTokenDirectory === undefined) delete process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
    else process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = originalTokenDirectory;
    await rm(directory, { recursive: true, force: true });
  }
});

// Fifth dogfood (r2cc): an agent had to guess the dead-letter queue's name to check it with `aws`.
test('status lists the deployed resources by AWS name, ARN and URL, and never a connection string', () => {
  const param = (value: string) => ({ value });
  expect(
    getDeployedResources({
      deadLetterQueue: {
        resourceType: 'sqs-queue',
        referencableParams: {
          name: param('shop-dev-deadLetterQueue'),
          arn: param('arn:aws:sqs:us-west-1:123456789012:shop-dev-deadLetterQueue'),
          url: param('https://sqs.us-west-1.amazonaws.com/123456789012/shop-dev-deadLetterQueue')
        }
      },
      stats: {
        resourceType: 'function',
        referencableParams: { arn: param('arn:aws:lambda:us-west-1:123456789012:function:shop-dev-stats') }
      },
      // A remote database: its address only.
      orders: {
        resourceType: 'relational-database',
        referencableParams: {
          connectionString: param('postgresql://app:hunter2-db-password@orders.example:5432/app'),
          host: param('orders.example')
        }
      },
      // A container that runs on this machine; status lists it under workloads.
      api: { resourceType: 'web-service', referencableParams: { url: param('http://127.0.0.1:8000') } }
    })
  ).toEqual([
    {
      name: 'deadLetterQueue',
      type: 'sqs-queue',
      awsName: 'shop-dev-deadLetterQueue',
      arn: 'arn:aws:sqs:us-west-1:123456789012:shop-dev-deadLetterQueue',
      url: 'https://sqs.us-west-1.amazonaws.com/123456789012/shop-dev-deadLetterQueue'
    },
    { name: 'stats', type: 'function', arn: 'arn:aws:lambda:us-west-1:123456789012:function:shop-dev-stats' }
  ]);
});

// Seventh dogfood (r2ll): the report job failed in AWS Batch before its container ran, and status said nothing about it.
// A failed run's cause is the job description as JSON; status shows the reason AWS Batch gives.
test('status explains why the last batch job run failed', () => {
  expect(
    describeBatchFailureCause(
      JSON.stringify({ JobName: 'report', StatusReason: 'Container.image contains invalid characters.', Container: {} })
    )
  ).toBe('Container.image contains invalid characters.');
  expect(
    describeBatchFailureCause(
      JSON.stringify({
        StatusReason: 'Essential container in task exited',
        Container: { Reason: 'CannotPullContainerError: pull access denied', ExitCode: 1 }
      })
    )
  ).toBe('Essential container in task exited; CannotPullContainerError: pull access denied; exit code 1');
  expect(describeBatchFailureCause('States.Timeout')).toBe('States.Timeout');
});

// r2rr: status said ready while a local database had failed, or while deployed functions could not reach the databases.
test('a failed local database or an unconnected dev box makes the session not ready, with the reason', () => {
  const running: WorkloadStatus = { name: 'api', type: 'container', status: 'running' };
  const base = { phase: 'ready' as const, workloads: [running], localResources: [] };
  expect(getNotReadyReasons(base)).toEqual([]);
  expect(
    getNotReadyReasons({
      ...base,
      localResources: [{ name: 'db', type: 'postgres', status: 'error', error: 'port 5432 is in use' }]
    })
  ).toEqual(['local database db is error: port 5432 is in use']);
  expect(
    getNotReadyReasons({ ...base, localResources: [{ name: 'db', type: 'postgres', status: 'starting' }] })
  ).toEqual(['local database db is starting']);
  expect(getNotReadyReasons({ ...base, devBox: { phase: 'reconnecting', reason: 'SSM is unavailable' } })).toEqual([
    'deployed functions cannot reach the local databases yet: the dev box connection is reconnecting (SSM is unavailable)'
  ]);
  expect(
    getNotReadyReasons({
      ...base,
      devBox: { phase: 'ready', relay: { controlHost: '127.0.0.1', controlPort: 1, relayHost: '10.0.0.5' } }
    })
  ).toEqual([]);
  expect(getNotReadyReasons({ ...base, phase: 'starting' })).toEqual(['dev mode is starting']);
});

test('a malformed percent-encoded route parameter is a validation error, not an unhandled exception', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-agent-encoding-'));
  const originalTokenDirectory = process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
  process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = join(directory, 'tokens');
  const port = await freePort();
  await startAgentServer(port, directory);
  try {
    const token = await readFile(getAgentTokenFile()!, 'utf8');
    const response = await fetch(`http://127.0.0.1:${port}/env/%ZZ`, { headers: { authorization: `Bearer ${token}` } });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    // The agent keeps answering.
    const status = await fetch(`http://127.0.0.1:${port}/status`, { headers: { authorization: `Bearer ${token}` } });
    expect(status.status).toBe(200);
  } finally {
    stopAgentServer();
    if (originalTokenDirectory === undefined) delete process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
    else process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = originalTokenDirectory;
    await rm(directory, { recursive: true, force: true });
  }
});
