import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devTuiManager } from 'src/app/tui-manager/dev/manager';
import { devTuiState } from 'src/app/tui-manager/dev/state';
import {
  getAgentTokenFile,
  mirrorDevTuiState,
  setRebuildFunctions,
  startAgentServer,
  stopAgentServer
} from '../agent-server';
import { createConfigChangeDetector } from '../config-change';
import { getRunningAgentReadyPayload } from '../index';
import { createWorkloadRebuilder } from '../workload-rebuild';

const freePort = async () => {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as AddressInfo).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
};

type AgentResponse = { ok: boolean; code: string; message: string; data: Record<string, any> };
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

/**
 * A dev session as the agent sees it: the real dev TUI state, the agent's mirror of it, the agent server and the
 * rebuilder. Only the builds are stand-ins, and the configuration file is JSON.
 */
const startSession = async ({ workloads, build }: { workloads: string[]; build: (name: string) => Promise<void> }) => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-rebuild-results-'));
  const originalTokenDirectory = process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
  process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = join(directory, 'tokens');
  const configPath = join(directory, 'stacktape.json');
  const config = { resources: Object.fromEntries(workloads.map((name) => [name, { type: 'function' }])) };
  await writeFile(configPath, JSON.stringify(config));
  const rebuilder = createWorkloadRebuilder({
    rebuild: build,
    detectConfigChange: createConfigChangeDetector({
      configPath,
      sessionConfig: config,
      loadConfig: async () => JSON.parse(await readFile(configPath, 'utf8'))
    })
  });
  setRebuildFunctions(
    (name) => (workloads.includes(name) ? rebuilder.rebuildWorkloads([name]) : Promise.resolve(undefined)),
    () => rebuilder.rebuildWorkloads(workloads)
  );

  devTuiManager.start({ projectName: 'todos', stageName: 'dev', agentMode: true });
  const unsubscribe = devTuiState.subscribe(mirrorDevTuiState);
  const port = await freePort();
  await startAgentServer(port, directory);
  cleanups.push(async () => {
    unsubscribe();
    await devTuiManager.stop();
    stopAgentServer();
    if (originalTokenDirectory === undefined) delete process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
    else process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = originalTokenDirectory;
    await rm(directory, { recursive: true, force: true });
  });
  for (const name of workloads) {
    devTuiManager.addWorkload({ name, type: 'function' });
    devTuiManager.setWorkloadStatus(name, 'running', { url: `https://${name}.example.test` });
  }
  devTuiManager.transitionToRunning();

  const token = await readFile(getAgentTokenFile()!, 'utf8');
  const call = async (method: 'GET' | 'POST', path: string) =>
    (await (
      await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          ...(method === 'POST' ? { 'content-type': 'application/json' } : {})
        },
        ...(method === 'POST' ? { body: '{}' } : {})
      })
    ).json()) as AgentResponse;
  const writeConfig = (value: unknown, indent?: number) => writeFile(configPath, JSON.stringify(value, null, indent));
  return { directory, port, config, rebuilder, call, writeConfig };
};

// The dogfood run broke a function's entry file and called /rebuild/api: it answered ok in 9 ms, /status stayed ready
// and the old code kept serving.
test('a failed rebuild or a changed configuration is reported, and the session is not ready until it is fixed', async () => {
  let source = 'export const handler = () => 200;';
  const deployed: string[] = [];
  const { directory, port, config, rebuilder, call, writeConfig } = await startSession({
    workloads: ['api'],
    build: async (name) => {
      if (source.includes('(;')) throw new Error('Build failed: Unexpected ;');
      deployed.push(`${name}:${source}`);
    }
  });
  expect((await call('GET', '/status')).data).toMatchObject({ ready: true });

  // A syntax error: the rebuild fails, says why and where the log is, and the workload stays failed.
  source = 'export const broken = (;';
  const failed = await call('POST', '/rebuild/api');
  expect(failed).toMatchObject({ ok: false, code: 'REBUILD_FAILED' });
  expect(failed.message).toContain('api: Build failed: Unexpected ;');
  expect(failed.data.failedWorkloads).toEqual([{ name: 'api', error: 'Build failed: Unexpected ;' }]);
  expect(failed.data.logFile.startsWith(directory)).toBeTrue();
  expect(await readFile(failed.data.logFile, 'utf8')).toContain('Rebuild failed: Build failed: Unexpected ;');
  // Later state changes, such as a log line or a database status, do not turn it back to running.
  devTuiManager.addLocalResource({ name: 'db', type: 'postgres' });
  expect((await call('GET', '/status')).data).toMatchObject({
    ready: false,
    failedWorkloads: [{ name: 'api', error: 'Build failed: Unexpected ;' }],
    workloads: { api: 'error: Build failed: Unexpected ;' }
  });
  expect(await call('POST', '/rebuild/all')).toMatchObject({ ok: false, code: 'REBUILD_FAILED' });
  expect(deployed).toEqual([]);

  // The fix lands: the rebuild succeeds and the session is ready again.
  source = 'export const handler = () => 201;';
  expect(await call('POST', '/rebuild/api')).toMatchObject({ ok: true, data: { rebuilt: ['api'] } });
  expect((await call('GET', '/status')).data).toMatchObject({
    ready: true,
    failedWorkloads: [],
    workloads: { api: 'https://api.example.test' }
  });

  // A configuration change cannot be applied by a rebuild: the rebuild refuses it and readiness waits for a restart.
  await writeConfig({ resources: { api: { type: 'function', payloadFormat: '2.0' } } });
  source = 'export const handler = () => 202;';
  const refused = await call('POST', '/rebuild/api');
  expect(refused).toMatchObject({ ok: false, code: 'CONFIG_CHANGED_RESTART_REQUIRED' });
  expect(refused.message).toContain('stacktape.json changed after dev mode started');
  const waiting = (await call('GET', '/status?verbose=true')).data;
  expect(waiting.ready).toBeFalse();
  expect(waiting.restartRequired).toContain('restart dev mode');
  expect(deployed).toHaveLength(1);

  // A second `dev --agent` for this session reports it, but not as ready: it waits for a restart.
  devTuiManager.setLocalResourceStatus('db', 'running', { port: 54321 });
  const lockFile = {
    pid: process.pid,
    port,
    phase: 'ready' as const,
    projectName: 'todos',
    stage: 'dev',
    region: 'eu-north-1',
    startedAt: new Date().toISOString(),
    workloads: ['api'],
    databases: ['db']
  };
  expect(await getRunningAgentReadyPayload(lockFile)).toMatchObject({
    ready: false,
    restartRequired: expect.stringContaining('restart dev mode')
  });

  // Reverting the configuration does not forget the refused edit: the session stays not ready until the watcher's
  // configuration check rebuilds it. Formatting and key order are not a change.
  await writeConfig(config, 2);
  expect((await call('GET', '/status')).data).toMatchObject({
    ready: false,
    failedWorkloads: [{ name: 'api', error: expect.stringContaining('Not rebuilt') }]
  });
  await rebuilder.onConfigFileChange();
  expect(deployed.at(-1)).toBe('api:export const handler = () => 202;');
  expect((await call('GET', '/status')).data).toMatchObject({ ready: true });

  // A second `dev --agent` reports what a fresh start reports, not "unknown" workloads.
  expect(await getRunningAgentReadyPayload(lockFile)).toMatchObject({
    port,
    ready: true,
    workloads: [{ name: 'api', type: 'function', url: 'https://api.example.test' }],
    databases: [{ name: 'db', type: 'postgres', port: 54321 }],
    failedWorkloads: []
  });
});

// The review's scenario: lib/db.ts is built into f1 and f2, handler.ts only into f1. An edit to lib/db.ts rebuilds
// both; a second later a syntax error in handler.ts rebuilds f1. The second build failed fast, then the first one,
// which had read the old handler.ts, finished and reported f1 running.
test('a rebuild requested while the workload builds runs after it, and the newest files decide the status', async () => {
  const files = { 'lib/db.ts': 'v1', 'handler.ts': 'ok' };
  const gates: (() => void)[] = [];
  const builds: { name: string; read: typeof files }[] = [];
  let concurrent = 0;
  let maxConcurrentF1 = 0;
  const { call, rebuilder } = await startSession({
    workloads: ['f1', 'f2'],
    build: async (name) => {
      const read = { ...files };
      builds.push({ name, read });
      if (name === 'f1') maxConcurrentF1 = Math.max(maxConcurrentF1, ++concurrent);
      try {
        // Builds that read the broken handler fail at once; the others take a while.
        if (name === 'f1' && read['handler.ts'].includes('(;')) throw new Error('Build failed: Unexpected ;');
        await new Promise<void>((resolve) => gates.push(resolve));
      } finally {
        if (name === 'f1') concurrent--;
      }
    }
  });
  const waitForBuilds = async (count: number) => {
    while (builds.length < count) await new Promise((resolve) => setTimeout(resolve, 5));
  };

  files['lib/db.ts'] = 'v2';
  const first = rebuilder.rebuildWorkloads(['f1', 'f2']);
  await waitForBuilds(2);
  files['handler.ts'] = 'export const broken = (;';
  const second = call('POST', '/rebuild/f1');
  // A third request while the second waits joins it instead of queueing another build.
  const third = rebuilder.rebuildWorkloads(['f1']);
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(builds).toHaveLength(2);
  expect((await call('GET', '/status')).data).toMatchObject({ ready: false, workloads: { f1: 'starting' } });

  for (const release of gates.splice(0)) release();
  expect(await first).toMatchObject({ ok: true });
  expect(await second).toMatchObject({ ok: false, code: 'REBUILD_FAILED' });
  expect(await third).toMatchObject({ ok: false, code: 'REBUILD_FAILED' });
  expect(builds.map(({ name }) => name)).toEqual(['f1', 'f2', 'f1']);
  expect(maxConcurrentF1).toBe(1);
  expect((await call('GET', '/status')).data).toMatchObject({
    ready: false,
    workloads: { f1: 'error: Build failed: Unexpected ;', f2: 'https://f2.example.test' }
  });

  files['handler.ts'] = 'ok';
  const fixed = rebuilder.rebuildWorkloads(['f1']);
  await waitForBuilds(4);
  for (const release of gates.splice(0)) release();
  expect(await fixed).toMatchObject({ ok: true });
  expect((await call('GET', '/status')).data).toMatchObject({ ready: true });
});
