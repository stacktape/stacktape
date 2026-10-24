import { expect, test } from 'bun:test';
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
import { rebuildWorkloads } from '../workload-rebuild';

const freePort = async () => {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as AddressInfo).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
};

// The dogfood run broke a function's entry file and called /rebuild/api: it answered ok in 9 ms, /status stayed ready
// and the old code kept serving. These scenarios drive the agent the same way, through the real dev TUI state, the
// agent's mirror of it and the agent server; only the build itself is a stand-in.
test('a failed rebuild or a changed configuration is reported, and the session is not ready until it is fixed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-rebuild-results-'));
  const originalTokenDirectory = process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
  process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = join(directory, 'tokens');
  const configPath = join(directory, 'stacktape.json');
  await writeFile(configPath, JSON.stringify({ resources: { api: { type: 'function' } } }));

  let source = 'export const handler = () => 200;';
  const deployed: string[] = [];
  const build = async (name: string) => {
    if (source.includes('(;')) throw new Error('Build failed: Unexpected ;');
    deployed.push(`${name}:${source}`);
  };
  const detectConfigChange = await createConfigChangeDetector({
    configPath,
    loadConfig: async () => JSON.parse(await readFile(configPath, 'utf8'))
  });
  const rebuild = (names: string[]) => rebuildWorkloads({ names, rebuild: build, detectConfigChange });
  setRebuildFunctions(
    (name) => (name === 'api' ? rebuild([name]) : Promise.resolve(undefined)),
    () => rebuild(['api'])
  );

  devTuiManager.start({ projectName: 'todos', stageName: 'dev', agentMode: true });
  const unsubscribe = devTuiState.subscribe(mirrorDevTuiState);
  const port = await freePort();
  await startAgentServer(port, directory);
  try {
    devTuiManager.addWorkload({ name: 'api', type: 'function' });
    devTuiManager.setWorkloadStatus('api', 'running', { url: 'https://api.example.test' });
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
      ).json()) as { ok: boolean; code: string; message: string; data: Record<string, any> };

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
    await writeFile(configPath, JSON.stringify({ resources: { api: { type: 'function', payloadFormat: '2.0' } } }));
    const refused = await call('POST', '/rebuild/api');
    expect(refused).toMatchObject({ ok: false, code: 'CONFIG_CHANGED_RESTART_REQUIRED' });
    expect(refused.message).toContain('stacktape.json changed after dev mode started');
    const waiting = (await call('GET', '/status?verbose=true')).data;
    expect(waiting.ready).toBeFalse();
    expect(waiting.restartRequired).toContain('restart dev mode');
    expect(deployed).toHaveLength(1);

    // Formatting and key order are not a change; reverting the change makes the session ready again.
    await writeFile(configPath, JSON.stringify({ resources: { api: { type: 'function' } } }, null, 2));
    expect(await call('POST', '/rebuild/api')).toMatchObject({ ok: true });
    expect((await call('GET', '/status')).data).toMatchObject({ ready: true });
    expect(deployed).toHaveLength(2);

    // A second `dev --agent` for the running session reports what a fresh start reports, not "unknown" workloads.
    devTuiManager.setLocalResourceStatus('db', 'running', { port: 54321 });
    const reattached = await getRunningAgentReadyPayload({
      pid: process.pid,
      port,
      phase: 'ready',
      projectName: 'todos',
      stage: 'dev',
      region: 'eu-north-1',
      startedAt: new Date().toISOString(),
      workloads: ['api'],
      databases: ['db']
    });
    expect(reattached).toMatchObject({
      port,
      workloads: [{ name: 'api', type: 'function', url: 'https://api.example.test' }],
      databases: [{ name: 'db', type: 'postgres', port: 54321 }],
      failedWorkloads: []
    });
  } finally {
    unsubscribe();
    await devTuiManager.stop();
    stopAgentServer();
    if (originalTokenDirectory === undefined) delete process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
    else process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = originalTokenDirectory;
    await rm(directory, { recursive: true, force: true });
  }
});
