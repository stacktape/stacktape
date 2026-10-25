import { afterEach, expect, test } from 'bun:test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEV_BOX_PROFILE_WATCH_SCRIPT, getDevBoxUserData } from './boot-script';

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

test('the user data installs the watcher as it is and is valid bash', () => {
  const userData = getDevBoxUserData();
  expect(userData).toContain(DEV_BOX_PROFILE_WATCH_SCRIPT);
  const script = userData.slice(userData.indexOf('#!/bin/bash'), userData.indexOf('--==STACKTAPE==--'));
  expect(spawnSync('bash', ['-n'], { input: script }).status).toBe(0);
});
