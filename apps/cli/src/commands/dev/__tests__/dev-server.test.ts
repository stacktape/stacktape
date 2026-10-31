import { afterEach, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { applicationManager } from '@application-services/application-manager';
import { localStatePaths } from 'src/config/local-state-paths';
import {
  describeDevServerExit,
  registerDevServerCleanupHook,
  selectDevServerExitOutput,
  startDevServer
} from '../dev-server';
import { stopNamedProxy } from '../named-proxy/manager';

// A stand-in for a framework dev server such as Vite: it binds the host and port it is given on the command line and
// prints the usual ready line. Dev mode must keep such servers on loopback; a server on 0.0.0.0 is reachable from the
// customer's network. On Linux a loopback bind on 127.0.0.1 refuses 127.0.0.2, which makes the binding observable.
const standInScript = `#!/usr/bin/env node
const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const host = option('--host', 'localhost');
const port = Number(option('--port', 5173));
require('node:http')
  .createServer((_request, response) => response.end(JSON.stringify({ host, args })))
  .listen(port, host, () => console.log('  ➜  Local:   http://' + host + ':' + port + '/\\n  ready in 12 ms'));
`;

const connects = (host: string, port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = createConnection({ host, port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });

const runCleanupHooks = () =>
  Promise.all(applicationManager.cleanUpHooks.map((hook) => hook({ success: true, interrupted: false })));

afterEach(async () => {
  await runCleanupHooks();
  await stopNamedProxy();
});

test('a framework dev server is started on loopback with the allocated port and is reachable through its stable URL', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-dev-server-'));
  try {
    const vite = join(directory, 'vite');
    await writeFile(vite, standInScript);
    await chmod(vite, 0o755);
    globalStateManager.rawArgs = { stage: 'flags', currentWorkingDirectory: directory };
    registerDevServerCleanupHook();
    const state = await startDevServer({
      name: 'web',
      config: { command: './vite dev', workingDirectory: directory, framework: 'vite' }
    });
    expect(state.status).toBe('ready');
    expect(state.port).toBeDefined();
    const url = new URL(state.url!);
    const response = await fetch(`http://127.0.0.1:${url.port}`, { headers: { Host: url.hostname } });
    const served = (await response.json()) as { host: string; args: string[] };
    expect(served.host).toBe('127.0.0.1');
    expect(served.args).toEqual(['dev', '--port', String(state.port), '--strictPort', '--host', '127.0.0.1']);
    expect(await connects('127.0.0.1', state.port!)).toBeTrue();
    expect(await connects('127.0.0.2', state.port!)).toBeFalse();
    await runCleanupHooks();
    expect(await connects('127.0.0.1', state.port!)).toBeFalse();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

const writeExecutable = async (path: string, script: string) => {
  await writeFile(path, script);
  await chmod(path, 0o755);
};

test('a dev server that exits after it was ready becomes an error with its last output', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-dev-server-'));
  try {
    // Serves, says so, and dies shortly after, as a server whose app crashes on its first compile does.
    await writeExecutable(
      join(directory, 'vite'),
      `#!/usr/bin/env node
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]);
require('node:http').createServer((_q, r) => r.end('ok')).listen(port, '127.0.0.1', () => {
  console.log('  ready in 5 ms');
  setTimeout(() => { console.error('Error: the app crashed'); process.exit(3); }, 400);
});
`
    );
    globalStateManager.rawArgs = { stage: 'exits', currentWorkingDirectory: directory };
    registerDevServerCleanupHook();
    const states: string[] = [];
    let failed!: (error: string) => void;
    const failure = new Promise<string>((resolve) => (failed = resolve));
    const ready = await startDevServer({
      name: 'web',
      config: { command: './vite dev', workingDirectory: directory, framework: 'vite' },
      callbacks: {
        onStateChange: (state) => {
          states.push(state.status);
          // The framework parser reports the error line itself first; the exit follows.
          if (state.status === 'error' && state.error?.includes('exited')) failed(state.error);
        }
      }
    });
    expect(ready.status).toBe('ready');
    const error = await failure;
    expect(error).toContain('The dev server exited with code 3 after it was ready.');
    expect(error).toContain('Error: the app crashed');
    expect(states.slice(0, 2)).toEqual(['starting', 'ready']);
    // Nothing serves the stable URL any more.
    const url = new URL(ready.url!);
    expect((await fetch(`http://127.0.0.1:${url.port}`, { headers: { Host: url.hostname } })).status).toBe(404);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

// r2cc finding 4: each line of a frontend's server error was its own `info` entry. The output of each stream is grouped
// into entries with the level their text shows, as a container's is.
test("a dev server's multi-line server error on standard error is one error entry", async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-dev-server-'));
  try {
    await writeExecutable(
      join(directory, 'vite'),
      `#!/usr/bin/env node
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]);
require('node:http').createServer((_q, r) => r.end('ok')).listen(port, '127.0.0.1', () => {
  console.log('  ready in 5 ms');
  console.error(['stats unavailable: TypeError: fetch failed', '    at load (src/routes/+page.server.js:9:5) {', "  code: 'ECONNREFUSED'", '}'].join('\\n'));
  // Later than the error: lines of two streams that arrive within a millisecond have no order.
  setTimeout(() => console.log('7:08:55 PM [vite] page reload src/routes/+page.svelte'), 100);
});
`
    );
    globalStateManager.rawArgs = { stage: 'grouped', currentWorkingDirectory: directory };
    registerDevServerCleanupHook();
    const entries: { message: string; level: string }[] = [];
    const ready = await startDevServer({
      name: 'web',
      config: { command: './vite dev', workingDirectory: directory, framework: 'vite' },
      callbacks: { onOutput: (message, level) => entries.push({ message, level }) }
    });
    expect(ready.status).toBe('ready');
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(entries).toEqual([
      { message: '  ready in 5 ms', level: 'info' },
      {
        message: [
          'stats unavailable: TypeError: fetch failed',
          '    at load (src/routes/+page.server.js:9:5) {',
          "  code: 'ECONNREFUSED'",
          '}'
        ].join('\n'),
        level: 'error'
      },
      { message: '7:08:55 PM [vite] page reload src/routes/+page.svelte', level: 'info' }
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

// #367 review: the framework parsers marked a frontend failed on any line with the word "error" (Remix, Nuxt, Next's
// `⨯ Error`), and it stayed failed. The status follows the level of the server's grouped entries instead, and the next
// code update or successful request clears it.
// r2an: a handled SDK timeout in a frontend's server code made the workload an error and the session not ready, although
// the server kept serving, and the error kept only the access log line ` POST / 500 in 2536ms`, not the timeout.
test("a frontend's request errors stay apart from its running server, keep their cause and clear on the next update or successful request", async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-dev-server-'));
  try {
    await writeExecutable(
      join(directory, 'vite'),
      `#!/usr/bin/env node
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]);
const steps = [
  () => console.log('errorHandler registered, 0 errors'),
  () => console.error(['Error: orders service is down', '    at load (src/routes/+page.server.js:7:19)'].join('\\n')),
  () => console.log('7:08:55 PM [vite] hmr update /src/routes/+page.svelte'),
  () => console.error(['[500] GET /orders', 'TypeError: fetch failed'].join('\\n')),
  () => console.log(' GET /orders 200 in 12ms'),
  () => {
    console.error([" ⨯ [Error [TimeoutError]: ] {", "  code: 'ETIMEDOUT',", "  '$metadata': [Object],", "  digest: '243062729'", '}'].join('\\n'));
    setTimeout(() => console.log(' POST / 500 in 2536ms'), 60);
  },
  () => console.log(' GET / 200 in 17ms'),
  () => console.log(' POST / 500 in 31ms')
];
require('node:http').createServer((_q, r) => r.end('ok')).listen(port, '127.0.0.1', () => {
  console.log('  ready in 5 ms');
  steps.forEach((step, index) => setTimeout(step, 300 * (index + 1)));
});
`
    );
    globalStateManager.rawArgs = { stage: 'status', currentWorkingDirectory: directory };
    registerDevServerCleanupHook();
    const states: { status: string; requestError?: string }[] = [];
    let serving = false;
    const ready = await startDevServer({
      name: 'web',
      config: { command: './vite dev', workingDirectory: directory, framework: 'vite' },
      callbacks: {
        onStateChange: ({ status, requestError }) => {
          if (serving) states.push({ status, requestError });
        }
      }
    });
    serving = true;
    expect(ready.status).toBe('ready');
    await new Promise((resolve) => setTimeout(resolve, 3200));
    expect(states).toEqual([
      { status: 'ready', requestError: 'Error: orders service is down\n    at load (src/routes/+page.server.js:7:19)' },
      { status: 'ready', requestError: undefined },
      { status: 'ready', requestError: '[500] GET /orders\nTypeError: fetch failed' },
      { status: 'ready', requestError: undefined },
      { status: 'ready', requestError: "⨯ [Error [TimeoutError]: ] {\n  code: 'ETIMEDOUT',\n  '$metadata': [Object]," },
      {
        status: 'ready',
        requestError:
          "⨯ [Error [TimeoutError]: ] {\n  code: 'ETIMEDOUT',\n  '$metadata': [Object],\nPOST / 500 in 2536ms"
      },
      { status: 'ready', requestError: undefined },
      // Without a cause printed just before it, the access log line is all there is.
      { status: 'ready', requestError: 'POST / 500 in 31ms' }
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

// Review of #422: a frontend whose process stayed alive after it closed its listener still counted as ready.
test('a frontend that stops accepting connections becomes an error while its process runs, and ready once it serves again', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-dev-server-'));
  try {
    await writeExecutable(
      join(directory, 'vite'),
      `#!/usr/bin/env node
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]);
const http = require('node:http');
const listen = (then) => {
  const server = http.createServer((_q, r) => r.end('ok'));
  server.listen(port, '127.0.0.1', () => then(server));
};
listen((server) => {
  console.log('  ready in 5 ms');
  setTimeout(() => server.close(() => setTimeout(() => listen(() => {}), 1500)), 500);
});
setInterval(() => {}, 1000);
`
    );
    globalStateManager.rawArgs = { stage: 'listener', currentWorkingDirectory: directory };
    registerDevServerCleanupHook();
    const states: { status: string; error?: string }[] = [];
    let serving = false;
    const ready = await startDevServer({
      name: 'web',
      config: { command: './vite dev', workingDirectory: directory, framework: 'vite', listenerCheckIntervalMs: 200 },
      callbacks: {
        onStateChange: ({ status, error }) => {
          if (serving) states.push({ status, error });
        }
      }
    });
    serving = true;
    expect(ready.status).toBe('ready');
    await new Promise((resolve) => setTimeout(resolve, 3500));
    expect(states).toEqual([
      {
        status: 'error',
        error: `The dev server process still runs, but nothing accepts connections on port ${ready.port} anymore. Rebuild the workload to restart it.`
      },
      { status: 'ready', error: undefined }
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

test('a second next dev in the directory fails with the session that runs the first, not as ready', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-dev-server-'));
  try {
    // What Next.js 16 prints when another dev server holds the directory's lock: the other server's URL, which looks
    // like a ready line, then the exit. Nothing listens on the port this one was given.
    await writeExecutable(
      join(directory, 'next'),
      `#!/usr/bin/env node
console.log('⨯ Another next dev server is already running.');
console.log('- Local:        http://localhost:3001');
console.log('- PID:          4242');
console.log('You can access the existing server at http://localhost:3001,');
console.log('or run kill 4242 to stop it and start a new one.');
setTimeout(() => process.exit(1), 100);
`
    );
    globalStateManager.rawArgs = { stage: 'second', currentWorkingDirectory: directory };
    // The other session's record: a live process (this test's parent) of stage `first` with its agent on port 7399.
    const registry = localStatePaths.devAgentRegistryDirectory({ workingDirectory: directory });
    await mkdir(registry, { recursive: true });
    const other = {
      pid: process.ppid,
      port: 7399,
      phase: 'ready',
      projectName: 'shop',
      stage: 'first',
      region: 'eu-west-1',
      startedAt: '',
      workloads: ['web'],
      databases: []
    };
    await writeFile(join(registry, 'shop-first.json'), JSON.stringify(other));
    registerDevServerCleanupHook();
    const expected = `Next.js runs one dev server per app directory, and the dev session of stage first (agent port 7399, process ${process.ppid}) runs it in ${directory}. Stop that session (\`stacktape dev stop --agent-port 7399\`), or run this stage from another Git worktree.`;
    const start = () =>
      startDevServer({
        name: 'web',
        config: { command: './next dev', workingDirectory: directory, framework: 'next' }
      });
    // The other session's record lists the app: refused before it starts.
    const refused = await start();
    expect(refused).toEqual({ status: 'error', error: expected });
    // Started through MCP, the way out is the tool call that stops that session.
    await writeFile(join(registry, 'shop-first.json'), JSON.stringify({ ...other, sessionId: 'first-session' }));
    Object.assign(process.env, { STP_OPERATION_INITIATOR: 'ai-agent', STP_OPERATION_INTERFACE: 'mcp' });
    try {
      expect((await start()).error).toContain(
        'Stop that session (stacktape_dev with action=stop and args.devSessionId=first-session), or run this stage'
      );
    } finally {
      delete process.env.STP_OPERATION_INITIATOR;
      delete process.env.STP_OPERATION_INTERFACE;
    }
    // A record without the app (an older session, a renamed workload): Next.js's own refusal names it instead.
    await writeFile(join(registry, 'shop-first.json'), JSON.stringify({ ...other, workloads: [] }));
    const state = await start();
    expect(state.status).toBe('error');
    expect(state.error).toBe(expected);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

// r2qq finding 9: pnpm's install error and its instruction came before its stack trace, and the summary quoted only frames.
test("a package manager's error code and instruction explain a dev server's exit instead of its stack frames", () => {
  const pnpm = '/home/dev/.local/share/stacktape-toolchain/node_modules/pnpm/dist/pnpm.mjs';
  const lines = [
    '✓ Lockfile passes supply-chain policies (verified 9m ago)',
    'Lockfile is up to date, resolution step is skipped',
    'Already up to date',
    '[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.25.12',
    'Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.',
    '[ERROR] Command failed with exit code 1: pnpm install',
    'pnpm: Command failed with exit code 1: pnpm install',
    ...['getFinalError', 'makeError', 'getSyncResult', 'spawnSubprocessSync', 'execaCoreSync', 'callBoundExeca'].map(
      (frame, index) => `    at ${frame} (file://${pnpm}:${88203 + index}:14)`
    ),
    `    at runDepsStatusCheck (file://${pnpm}:251287:7)`
  ];
  const error = describeDevServerExit({
    code: 1,
    signal: null,
    serving: false,
    lines,
    framework: 'vite',
    workingDir: '/work/web',
    logFile: '/work/.stacktape/dev-agent/7332-logs.txt'
  });
  expect(error).toBe(
    'The dev server exited with code 1. Its output:\n' +
      '[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@0.25.12\n' +
      'Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.\n' +
      '[ERROR] Command failed with exit code 1: pnpm install\n' +
      'pnpm: Command failed with exit code 1: pnpm install\n' +
      'Its whole output is in /work/.stacktape/dev-agent/7332-logs.txt.'
  );
});

test("a framework error keeps its message above the first frames of the loader's trailing stack", () => {
  const frames = Array.from(
    { length: 12 },
    (_, index) => `    at ModuleLoader.load (node:internal/modules/esm/loader:${400 + index}:9)`
  );
  expect(
    selectDevServerExitOutput([
      'VITE v6.2.0  ready in 120 ms',
      'failed to load config from /work/web/vite.config.ts',
      'error when starting dev server:',
      "Error: Cannot find module '@vitejs/plugin-react'",
      ...frames
    ])
  ).toEqual([
    'VITE v6.2.0  ready in 120 ms',
    'failed to load config from /work/web/vite.config.ts',
    'error when starting dev server:',
    "Error: Cannot find module '@vitejs/plugin-react'",
    frames[0],
    frames[1]
  ]);
  expect(
    selectDevServerExitOutput([
      'npm error code ENOENT',
      'npm error syscall open',
      '',
      'npm error path /work/package.json'
    ])
  ).toEqual(['npm error code ENOENT', 'npm error syscall open', 'npm error path /work/package.json']);
});

// r2rr finding 5: a frontend's exit summary quoted a secret-sourced value it printed, and the summary reaches the agent's
// status and MCP results.
test("a frontend's failure summary masks the secret-sourced values of its environment", async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-dev-server-'));
  const secret = 'synthetic-webhook-secret-r2tt';
  try {
    await writeExecutable(
      join(directory, 'vite'),
      `#!/usr/bin/env node
console.error('Failed to configure webhook: ' + process.env.PAYMENT_WEBHOOK + ' pin ' + process.env.PAYMENT_PIN + ' for ' + process.env.SHOP_NAME);
console.error('Signing key: ' + process.env.SIGNING_KEY);
process.exit(1);
`
    );
    globalStateManager.rawArgs = { stage: 'secret', currentWorkingDirectory: directory };
    registerDevServerCleanupHook();
    const result = await startDevServer({
      name: 'web',
      config: {
        command: './vite dev',
        workingDirectory: directory,
        framework: 'vite',
        environment: {
          PAYMENT_WEBHOOK: secret,
          PAYMENT_PIN: 'k9#Qz',
          SIGNING_KEY: '== signing material ==\nr2tt-first-secret-line-4f8a\nk3yL1n3TwoSecretTail\n==\n',
          SHOP_NAME: 'demo-shop'
        },
        secretEnvNames: new Set(['PAYMENT_WEBHOOK', 'PAYMENT_PIN', 'SIGNING_KEY'])
      }
    });
    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to configure webhook:');
    expect(result.error).not.toContain(secret);
    // A short secret too (#386 review).
    expect(result.error).not.toContain('k9#Qz');
    // A multi-line secret ending with a newline, line by line (#386 re-review).
    expect(result.error).toContain('Signing key:');
    for (const line of ['r2tt-first-secret-line-4f8a', 'k3yL1n3TwoSecretTail'])
      expect(result.error).not.toContain(line);
    // Plain settings stay readable.
    expect(result.error).toContain('demo-shop');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

// r2bf: on Windows, Ledger's Next server called Cognito in the AWS profile's default region (eu-west-1) while the dev
// session ran in eu-north-1, and sign-in failed with "User pool client ... does not exist". A dev server runs in the
// session's region, as its deployed server and a dev container do, also when the shell names another; a region the
// frontend's configuration sets explicitly wins.
test("a frontend dev server runs in the session's region unless its configuration sets one", async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-dev-server-'));
  const previous = {
    rawArgs: globalStateManager.rawArgs,
    AWS_REGION: process.env.AWS_REGION,
    AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION
  };
  try {
    await writeExecutable(
      join(directory, 'vite'),
      `#!/usr/bin/env node
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]);
const { AWS_REGION, AWS_DEFAULT_REGION } = process.env;
require('node:http').createServer((_q, r) => r.end(JSON.stringify({ AWS_REGION, AWS_DEFAULT_REGION })))
  .listen(port, '127.0.0.1', () => console.log('  ready in 5 ms'));
`
    );
    // The developer's shell names another region than the session.
    process.env.AWS_REGION = 'eu-west-1';
    process.env.AWS_DEFAULT_REGION = 'eu-west-1';
    globalStateManager.rawArgs = { stage: 'region', region: 'eu-north-1', currentWorkingDirectory: directory };
    registerDevServerCleanupHook();
    const regionsOf = async (name: string, environment?: Record<string, string>) => {
      const state = await startDevServer({
        name,
        config: { command: './vite dev', workingDirectory: directory, framework: 'vite', environment }
      });
      expect(state.status, state.error).toBe('ready');
      return (await fetch(`http://127.0.0.1:${state.port}`)).json();
    };

    expect(await regionsOf('web')).toEqual({ AWS_REGION: 'eu-north-1', AWS_DEFAULT_REGION: 'eu-north-1' });
    await runCleanupHooks();
    expect(await regionsOf('web', { AWS_REGION: 'us-east-1', AWS_DEFAULT_REGION: 'us-east-1' })).toEqual({
      AWS_REGION: 'us-east-1',
      AWS_DEFAULT_REGION: 'us-east-1'
    });
  } finally {
    globalStateManager.rawArgs = previous.rawArgs;
    for (const name of ['AWS_REGION', 'AWS_DEFAULT_REGION'] as const) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);
