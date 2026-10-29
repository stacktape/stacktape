import { afterEach, expect, test } from 'bun:test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  DEV_BOX_PROFILE_WATCH_SCRIPT,
  DEV_BOX_RELAY_PARAMETER_LIMIT_BYTES,
  DEV_BOX_RELAY_STARTER_SCRIPT,
  EC2_USER_DATA_LIMIT_BYTES,
  encodeRelayForParameter,
  getDevBoxRelayUpdateScript,
  getDevBoxUserData
} from './boot-script';
import { DEV_BOX_RELAY_SOURCE } from './relay-source';

// The profile watcher of the dev box, run by real bash and curl against a scripted instance metadata server. A fake
// `systemctl` records the SSM agent restarts, which end every developer's session to the box.

type Answer = 'credentials' | 'none' | 'error' | 'no-token';

let server: ReturnType<typeof Bun.serve> | undefined;
let watcher: ChildProcess | undefined;
let directory: string | undefined;

afterEach(() => {
  watcher?.kill('SIGKILL');
  server?.stop(true);
  if (directory) rmSync(directory, { recursive: true, force: true });
  watcher = server = directory = undefined;
});

/** Runs the watcher for one round per answer (a round starts with its token request); returns the recorded restarts. */
const runWatcher = async (answers: Answer[]) => {
  let round = 0;
  let current: Answer = answers[0];
  const done = Promise.withResolvers<void>();
  server = Bun.serve({
    port: 0,
    fetch: (request) => {
      const path = new URL(request.url).pathname;
      if (path === '/latest/api/token') {
        current = answers[Math.min(round, answers.length - 1)];
        round++;
        if (round > answers.length) done.resolve();
        return current === 'no-token' ? new Response('', { status: 500 }) : new Response('token');
      }
      if (path === '/latest/meta-data/iam/security-credentials/') {
        if (current === 'credentials') return new Response('stacktape-dev-network-box');
        return new Response('', { status: current === 'none' ? 404 : 500 });
      }
      return new Response('', { status: 404 });
    }
  });
  directory = mkdtempSync(join(tmpdir(), 'stacktape-profile-watch-'));
  const restarts = join(directory, 'restarts');
  writeFileSync(restarts, '');
  writeFileSync(join(directory, 'systemctl'), `#!/bin/bash\necho "$*" >> ${JSON.stringify(restarts)}\n`);
  chmodSync(join(directory, 'systemctl'), 0o755);
  writeFileSync(join(directory, 'watch.sh'), DEV_BOX_PROFILE_WATCH_SCRIPT);
  watcher = spawn('bash', [join(directory, 'watch.sh')], {
    env: {
      ...process.env,
      PATH: `${directory}:${process.env.PATH}`,
      STACKTAPE_IMDS_URL: `http://127.0.0.1:${server.port}`,
      STACKTAPE_WATCH_INTERVAL: '0.05'
    },
    stdio: 'ignore'
  });
  // The round after the last answer has started, so the last answer's restart, if any, is recorded.
  await Promise.race([done.promise, Bun.sleep(10_000)]);
  return readFileSync(restarts, 'utf8').split('\n').filter(Boolean);
};

test('restarts the SSM agent when the profile is attached after the box started without it', async () => {
  expect(await runWatcher(['none', 'none', 'credentials', 'credentials'])).toEqual(['restart amazon-ssm-agent']);
});

test('restarts it again when an update detaches and reattaches the profile while the box runs', async () => {
  expect(await runWatcher(['credentials', 'none', 'credentials'])).toEqual(['restart amazon-ssm-agent']);
});

test('a failed or unanswered metadata request is not "no credentials" and restarts nothing', async () => {
  expect(await runWatcher(['credentials', 'error', 'credentials', 'no-token', 'credentials'])).toEqual([]);
});

const relayParameterName = '/stacktape/dev-network/stacktape-dev-network/relay';

test('the user data installs the watcher as it is and is valid bash', () => {
  const userData = getDevBoxUserData({ relayParameterName });
  expect(userData).toContain(DEV_BOX_PROFILE_WATCH_SCRIPT);
  const script = userData.slice(userData.indexOf('#!/bin/bash'), userData.indexOf('--==STACKTAPE==--'));
  expect(spawnSync('bash', ['-n'], { input: script }).status).toBe(0);
  expect(spawnSync('bash', ['-n'], { input: getDevBoxRelayUpdateScript(relayParameterName) }).status).toBe(0);
});

// r2bb: a relay that grew by 3 KB pushed the user data past EC2's limit, and creating a dev network failed with "User data
// is limited to 16384 bytes". The relay is in an SSM parameter now, which has its own limit.
test('the user data fits EC2 and the relay fits its parameter', () => {
  expect(Buffer.byteLength(getDevBoxUserData({ relayParameterName }))).toBeLessThanOrEqual(EC2_USER_DATA_LIMIT_BYTES);
  expect(Buffer.byteLength(encodeRelayForParameter(DEV_BOX_RELAY_SOURCE))).toBeLessThanOrEqual(
    DEV_BOX_RELAY_PARAMETER_LIMIT_BYTES
  );
});

/**
 * Runs the relay starter as systemd does, by real bash, base64 and gunzip, against a scripted instance metadata server.
 * A fake `aws` answers the parameter's value or fails; a fake Python records what it was asked to run.
 */
const runStarter = async ({ parameter, installed }: { parameter?: string; installed?: string }) => {
  server = Bun.serve({
    port: 0,
    fetch: (request) => {
      const path = new URL(request.url).pathname;
      if (path === '/latest/api/token') return new Response('token');
      if (path === '/latest/meta-data/placement/region') return new Response('eu-west-3');
      if (path === '/latest/meta-data/local-ipv4') return new Response('10.230.1.71');
      return new Response('', { status: 404 });
    }
  });
  directory = mkdtempSync(join(tmpdir(), 'stacktape-relay-starter-'));
  const relay = join(directory, 'opt', 'relay.py');
  if (installed !== undefined) {
    mkdirSync(dirname(relay), { recursive: true });
    writeFileSync(relay, installed);
  }
  const calls = join(directory, 'calls');
  const value = join(directory, 'value');
  if (parameter !== undefined) writeFileSync(value, `${parameter}\n`);
  writeFileSync(
    join(directory, 'aws'),
    `#!/bin/bash\necho "aws $*" >> ${JSON.stringify(calls)}\n[ -f ${JSON.stringify(value)} ] || { echo 'Unable to locate credentials' >&2; exit 253; }\ncat ${JSON.stringify(value)}\n`
  );
  writeFileSync(join(directory, 'python'), `#!/bin/bash\necho "python $*" >> ${JSON.stringify(calls)}\n`);
  for (const name of ['aws', 'python']) chmodSync(join(directory, name), 0o755);
  writeFileSync(join(directory, 'starter.sh'), DEV_BOX_RELAY_STARTER_SCRIPT);
  // Asynchronous: the metadata server answers in this process.
  const child = Bun.spawn(['bash', join(directory, 'starter.sh'), relayParameterName], {
    env: {
      ...process.env,
      PATH: `${directory}:${process.env.PATH}`,
      STACKTAPE_IMDS_URL: `http://127.0.0.1:${server.port}`,
      STACKTAPE_RELAY_PATH: relay,
      STACKTAPE_PYTHON: join(directory, 'python')
    },
    stdout: 'ignore',
    stderr: 'ignore'
  });
  return {
    exitCode: await child.exited,
    calls: existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n') : [],
    relay: existsSync(relay) ? readFileSync(relay, 'utf8') : undefined,
    relayPath: relay
  };
};

test("the relay service installs the relay parameter's relay exactly as the CLI has it, then runs it", async () => {
  const run = await runStarter({ parameter: encodeRelayForParameter(DEV_BOX_RELAY_SOURCE), installed: 'old relay' });
  expect(run.exitCode).toBe(0);
  expect(run.relay).toBe(DEV_BOX_RELAY_SOURCE);
  expect(run.calls).toEqual([
    `aws ssm get-parameter --region eu-west-3 --name ${relayParameterName} --query Parameter.Value --output text --cli-connect-timeout 5 --cli-read-timeout 10`,
    `python ${run.relayPath} 10.230.1.71`
  ]);
});

// The box starts without its instance profile, and SSM may not answer; the relay installed before still serves.
test('without the parameter it runs the relay installed before, and without one it fails so systemd retries', async () => {
  const kept = await runStarter({ installed: 'installed relay' });
  expect({ exitCode: kept.exitCode, relay: kept.relay, ran: kept.calls.at(-1) }).toEqual({
    exitCode: 0,
    relay: 'installed relay',
    ran: `python ${kept.relayPath} 10.230.1.71`
  });
  server?.stop(true);
  rmSync(directory!, { recursive: true, force: true });
  const corrupt = await runStarter({ parameter: 'not base64 gzip' });
  expect({
    exitCode: corrupt.exitCode,
    relay: corrupt.relay,
    ran: corrupt.calls.some((call) => call.startsWith('python'))
  }).toEqual({
    exitCode: 1,
    relay: undefined,
    ran: false
  });
});

test('a relay update makes the relay service of a box of any age start the relay starter, and restarts it', () => {
  const script = getDevBoxRelayUpdateScript(relayParameterName);
  // A box created before contract 6 writes its own service file at every boot; the drop-in replaces its start command.
  expect(script).toContain('stacktape-relay.service.d/');
  expect(script).toContain(`ExecStart=\nExecStart=/usr/local/bin/stacktape-relay ${relayParameterName}\n`);
  expect(script).toContain(DEV_BOX_RELAY_STARTER_SCRIPT);
  expect(script.trim().split('\n').slice(-2)[0]).toBe('systemctl restart stacktape-relay');
  // The user data of a new box starts the same starter.
  expect(getDevBoxUserData({ relayParameterName })).toContain(
    `ExecStart=/usr/local/bin/stacktape-relay ${relayParameterName}\n`
  );
});
