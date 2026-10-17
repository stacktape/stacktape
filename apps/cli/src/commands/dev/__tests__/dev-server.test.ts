import { afterEach, expect, test } from 'bun:test';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { applicationManager } from '@application-services/application-manager';
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
