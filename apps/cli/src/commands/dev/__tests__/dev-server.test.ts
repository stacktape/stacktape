import { afterEach, expect, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { applicationManager } from '@application-services/application-manager';
import { localStatePaths } from 'src/config/local-state-paths';
import { registerDevServerCleanupHook, startDevServer } from '../dev-server';
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
