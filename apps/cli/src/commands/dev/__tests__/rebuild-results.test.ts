import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
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
import { createConfigChangeDetector, type ConfigChange } from '../config-change';
import { getReturnableError, type HandledError } from '@utils/errors';
import { getRunningAgentReadyPayload, reportRunningAgent } from '../index';
import { createWorkloadRebuilder } from '../workload-rebuild';
import { createFrontendStatusReporter } from '../frontend-status';
import { CliError } from '@utils/errors';

const freePort = async () => {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as AddressInfo).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
};

/** How the packager reports a build that fails: a `CliError`, which a rebuild does not try again. */
const buildError = () =>
  new CliError({ category: 'PACKAGING', code: 'PACKAGING_FAILED', message: 'Build failed: Unexpected ;' });

type AgentResponse = { ok: boolean; code: string; message: string; data: Record<string, any> };
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

/**
 * A dev session as the agent sees it: the real dev TUI state, the agent's mirror of it, the agent server and the
 * rebuilder. Only the builds are stand-ins, and the configuration file is JSON.
 */
const startSession = async ({
  workloads,
  build,
  retryDelayMs = 20,
  sourceFiles,
  frontends = [],
  remoteImageInputs,
  detectConfigChange,
  configCheckTimeoutMs
}: {
  workloads: string[];
  build: (name: string) => Promise<void>;
  retryDelayMs?: number;
  /** The files each workload's builds read, relative to the session directory. */
  sourceFiles?: Record<string, string[]>;
  /** Workloads that are Next.js frontends, whose dev servers load changed code themselves. */
  frontends?: string[];
  /** The files each batch job's image was built from at the start, relative to the session directory. */
  remoteImageInputs?: Record<string, string[]>;
  /** Replaces the check of the JSON configuration file. */
  detectConfigChange?: () => Promise<ConfigChange>;
  configCheckTimeoutMs?: number;
}) => {
  const sessionStartedAt = Date.now();
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-rebuild-results-'));
  const originalTokenDirectory = process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
  process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = join(directory, 'tokens');
  const configPath = join(directory, 'stacktape.json');
  const config = { resources: Object.fromEntries(workloads.map((name) => [name, { type: 'function' }])) };
  await writeFile(configPath, JSON.stringify(config));
  const inSession = (files: Record<string, string[]> = {}) =>
    new Map(Object.entries(files).map(([name, paths]) => [name, paths.map((file) => join(directory, file))]));
  const rebuilder = createWorkloadRebuilder({
    rebuild: build,
    retryDelayMs,
    getSourceFiles: () => inSession(sourceFiles),
    getRemoteImageInputs: () => inSession(remoteImageInputs),
    reloadsCodeItself: (name) => frontends.includes(name),
    getSessionStartedAt: () => sessionStartedAt,
    getConfigFileName: () => 'stacktape.json',
    configCheckTimeoutMs,
    detectConfigChange:
      detectConfigChange ??
      createConfigChangeDetector({
        configPath,
        sessionConfig: config,
        loadConfig: async () => JSON.parse(await readFile(configPath, 'utf8'))
      })
  });
  setRebuildFunctions(
    (name) => rebuilder.rebuildWorkload(name, workloads.includes(name)),
    () => rebuilder.rebuildAllWorkloads(workloads)
  );

  devTuiManager.start({ projectName: 'todos', stageName: 'dev', agentMode: true });
  const unsubscribe = devTuiState.subscribe(mirrorDevTuiState);
  const port = await freePort();
  await startAgentServer(port, directory, undefined, {
    sessionId: 'rebuild-results',
    projectDirectory: directory,
    projectName: 'todos',
    stage: 'dev',
    region: 'eu-west-1'
  });
  cleanups.push(async () => {
    unsubscribe();
    await devTuiManager.stop();
    stopAgentServer();
    if (originalTokenDirectory === undefined) delete process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
    else process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = originalTokenDirectory;
    await rm(directory, { recursive: true, force: true });
  });
  for (const name of workloads) {
    devTuiManager.addWorkload({ name, type: frontends.includes(name) ? 'nextjs-web' : 'function' });
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
      if (source.includes('(;')) throw buildError();
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

  // `dev --agent` again, as an MCP start that finds the session: it must not report the session as started. The
  // command result is a distinct non-OK code with the error, `ready: false` and the session, which keeps running.
  const runningLockFile = {
    pid: process.pid,
    port,
    phase: 'ready' as const,
    projectName: 'todos',
    stage: 'dev',
    region: 'eu-north-1',
    startedAt: new Date().toISOString(),
    workloads: ['api'],
    databases: []
  };
  const notReady = await reportRunningAgent(runningLockFile).then(
    () => undefined,
    (error: HandledError) => error
  );
  expect(notReady).toMatchObject({ code: 'DEV_STARTED_WITH_FAILURES' });
  expect(notReady?.message).toContain('api: Build failed: Unexpected ;');
  // What the JSONL result's `data` carries: the session as a ready start reports it, and its readiness on top.
  expect((getReturnableError(notReady!) as Error & { details: { data: unknown } }).details.data).toMatchObject({
    ready: false,
    failedWorkloads: [{ name: 'api', error: 'Build failed: Unexpected ;' }],
    result: { port, ready: false, tokenFile: expect.any(String) }
  });

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
  expect(refused.message).toContain('api still runs the previous build');
  // r2ll: the refused workload was reported failed, although its previous build kept serving.
  const waiting = (await call('GET', '/status?verbose=true')).data;
  expect(waiting.ready).toBeFalse();
  expect(waiting.restartRequired).toContain('restart dev mode');
  expect(waiting.failedWorkloads).toEqual([]);
  expect(waiting.workloads).toMatchObject([{ name: 'api', status: 'running' }]);
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
  expect((await call('GET', '/status')).data).toMatchObject({ ready: false, restartRequired: expect.any(String) });
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

/**
 * A configuration file whose checks the test finishes by hand. Each check answers for the file as it was when the check
 * started: `changed` for any version but the one the session started with.
 */
const controlledConfig = () => {
  let version = 0;
  const pending: { version: number; finish: () => void }[] = [];
  const answerFor = (checked: number): ConfigChange =>
    checked === 0 ? { changed: false } : { changed: true, reason: `stacktape.json version ${checked} changed.` };
  return {
    save: (next: number) => (version = next),
    pending,
    detectConfigChange: () => {
      const checked = version;
      return new Promise<ConfigChange>((resolve) =>
        pending.push({ version: checked, finish: () => resolve(answerFor(checked)) })
      );
    }
  };
};
const ticks = async () => {
  for (let tick = 0; tick < 20; tick++) await new Promise((resolve) => setTimeout(resolve, 1));
};

// r2az run 6: the configuration was restored, and the session still waited for a restart. Each check of the file wrote
// its answer when it finished, so a check that read the edited file but finished after the check of the restored file
// (a TypeScript configuration executes again, which takes a while) left the restart required with nothing to clear it.
test('a check of an older file that finishes after the check of the restored file does not count', async () => {
  const config = controlledConfig();
  const { rebuilder, call } = await startSession({ workloads: ['api'], build: async () => {}, ...config });

  config.save(1);
  const edit = rebuilder.onConfigFileChange();
  config.save(0);
  const restore = rebuilder.onConfigFileChange();
  await ticks();
  const [editCheck, restoreCheck] = config.pending.splice(0);
  restoreCheck.finish();
  await ticks();
  editCheck.finish();
  await Promise.all([edit, restore]);

  const status = (await call('GET', '/status?verbose=true')).data;
  expect(status.restartRequired).toBeUndefined();
  expect(status.ready).toBeTrue();
});

// Review of #428: checks that waited for each other let one that never finishes (a TypeScript configuration that awaits
// forever) block every later check and rebuild.
test('a check that never finishes blocks neither the next save nor a rebuild', async () => {
  const config = controlledConfig();
  const deployed: string[] = [];
  const { rebuilder, call } = await startSession({
    workloads: ['api'],
    build: async (name) => {
      deployed.push(name);
    },
    ...config
  });

  config.save(1);
  void rebuilder.onConfigFileChange();
  await ticks();
  config.pending.splice(0);
  config.save(0);
  const restore = rebuilder.onConfigFileChange();
  await ticks();
  config.pending.splice(0).forEach((check) => check.finish());
  await restore;
  const rebuild = call('POST', '/rebuild/api');
  await ticks();
  config.pending.splice(0).forEach((check) => check.finish());
  expect(await rebuild).toMatchObject({ ok: true, data: { rebuilt: ['api'] } });
  expect(deployed).toEqual(['api']);
  expect((await call('GET', '/status')).data).toMatchObject({ ready: true });
});

test('a rebuild that waits too long for the configuration check is refused, and the next save checks again', async () => {
  const config = controlledConfig();
  const deployed: string[] = [];
  const { rebuilder, call } = await startSession({
    workloads: ['api'],
    build: async (name) => {
      deployed.push(name);
    },
    configCheckTimeoutMs: 50,
    ...config
  });

  const refused = await call('POST', '/rebuild/api');
  expect(refused).toMatchObject({ ok: false, code: 'CONFIG_CHECK_TIMEOUT' });
  expect(refused.message).toContain('stacktape.json did not finish loading');
  expect(refused.message).toContain('api still runs the previous build');
  const waiting = (await call('GET', '/status?verbose=true')).data;
  expect(waiting).toMatchObject({ ready: false, failedWorkloads: [] });
  expect(waiting.restartRequired).toContain('did not finish loading');
  expect(deployed).toEqual([]);

  // The next save starts a check that answers: the refused workload rebuilds and the session is ready.
  config.pending.splice(0);
  const saved = rebuilder.onConfigFileChange();
  await ticks();
  config.pending.splice(0).forEach((check) => check.finish());
  await ticks();
  config.pending.splice(0).forEach((check) => check.finish());
  await saved;
  expect(deployed).toEqual(['api']);
  expect((await call('GET', '/status')).data).toMatchObject({ ready: true });
});

test('of many saves in a row, only the check of the newest file decides, in any order the checks finish', async () => {
  const config = controlledConfig();
  const { rebuilder, call } = await startSession({ workloads: ['api'], build: async () => {}, ...config });
  const status = async () => (await call('GET', '/status?verbose=true')).data;

  // 20 saves; the last restores the file. The checks finish newest first, then in the order they started.
  const saves = Array.from({ length: 20 }, (_, index) => {
    config.save(index === 19 ? 0 : index + 1);
    return rebuilder.onConfigFileChange();
  });
  await ticks();
  const checks = config.pending.splice(0);
  expect(checks.map(({ version }) => version)).toEqual([...Array.from({ length: 19 }, (_, index) => index + 1), 0]);
  checks.at(-1)!.finish();
  await ticks();
  for (const check of checks.slice(0, -1)) check.finish();
  await Promise.all(saves);
  expect((await status()).restartRequired).toBeUndefined();

  // 20 more; the last is an edit, and the older checks of the restored file finish after it.
  const edits = Array.from({ length: 20 }, (_, index) => {
    config.save(index === 19 ? 21 : 0);
    return rebuilder.onConfigFileChange();
  });
  await ticks();
  const editChecks = config.pending.splice(0);
  editChecks.at(-1)!.finish();
  await ticks();
  for (const check of editChecks.slice(0, -1)) check.finish();
  await Promise.all(edits);
  expect((await status()).restartRequired).toBe('stacktape.json version 21 changed.');
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
        if (name === 'f1' && read['handler.ts'].includes('(;')) throw buildError();
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

// r2p dogfood, finding 4: a `--watch` rebuild failed once with "EPIPE: broken pipe, write", left the function in
// `error` and never deployed the edit.
test('a rebuild that fails for a reason other than the build is tried once more; a build error is not', async () => {
  const attempts: string[] = [];
  let failNext: Error | undefined;
  const { call } = await startSession({
    workloads: ['api'],
    retryDelayMs: 200,
    build: async (name) => {
      attempts.push(name);
      const error = failNext;
      failNext = undefined;
      if (error) throw error;
    }
  });
  failNext = Object.assign(new Error('EPIPE: broken pipe, write'), { code: 'EPIPE' });
  const startedAt = Date.now();
  expect(await call('POST', '/rebuild/api')).toMatchObject({ ok: true, data: { rebuilt: ['api'] } });
  expect(attempts).toEqual(['api', 'api']);
  // Not at once: a function that is still updating refuses the second attempt too.
  expect(Date.now() - startedAt).toBeGreaterThanOrEqual(150);
  expect((await call('GET', '/status')).data).toMatchObject({ ready: true, failedWorkloads: [] });

  attempts.length = 0;
  failNext = buildError();
  expect(await call('POST', '/rebuild/api')).toMatchObject({ ok: false, code: 'REBUILD_FAILED' });
  expect(attempts).toEqual(['api']);
});

// #343 review: the retry ran even when a newer build already waited, and the two builds deployed one after the other.
test('a failed rebuild is not tried again when a newer build of the workload waits', async () => {
  const attempts: string[] = [];
  /** Hands out the function that makes the first build of a round fail, once that build runs. */
  let onFailingBuild: (fail: () => void) => void = () => {};
  const failingBuildRuns = () => new Promise<() => void>((resolve) => (onFailingBuild = resolve));
  const { rebuilder, call } = await startSession({
    workloads: ['api'],
    retryDelayMs: 200,
    build: async () => {
      attempts.push(attempts.length === 0 ? 'failing' : 'newer');
      if (attempts.length === 1) {
        await new Promise<void>((resolve) => onFailingBuild(resolve));
        throw Object.assign(new Error('ResourceConflictException: The operation cannot be performed at this time.'), {
          name: 'ResourceConflictException'
        });
      }
    }
  });
  let failing = failingBuildRuns();
  const first = rebuilder.rebuildWorkloads(['api']);
  let fail = await failing;
  const second = rebuilder.rebuildWorkloads(['api']);
  // The request has joined the queue (after its configuration check) before the running build fails.
  await new Promise((resolve) => setTimeout(resolve, 50));
  fail();
  expect(await second).toMatchObject({ ok: true });
  expect(await first).toMatchObject({ ok: false, code: 'REBUILD_FAILED' });
  expect(attempts).toEqual(['failing', 'newer']);
  expect((await call('GET', '/status')).data).toMatchObject({ ready: true });

  // A newer build requested while the failed one waits to try again replaces the second attempt as well.
  attempts.length = 0;
  failing = failingBuildRuns();
  const third = rebuilder.rebuildWorkloads(['api']);
  fail = await failing;
  fail();
  await new Promise((resolve) => setTimeout(resolve, 50));
  const fourth = rebuilder.rebuildWorkloads(['api']);
  expect(await fourth).toMatchObject({ ok: true });
  expect(await third).toMatchObject({ ok: false });
  expect(attempts).toEqual(['failing', 'newer']);
});

// r2w: a rebuild of a workload added to the configuration after the start answered NOT_FOUND, which reads as a typo.
test('a rebuild of a workload the configuration gained after the start says to restart', async () => {
  const { call, config, writeConfig } = await startSession({ workloads: ['api'], build: async () => {} });
  const unknown = await call('POST', '/rebuild/worker');
  expect(unknown.ok).toBeFalse();
  expect(unknown.code).not.toBe('CONFIG_CHANGED_RESTART_REQUIRED');

  await writeConfig({ resources: { ...config.resources, worker: { type: 'function' } } });
  const added = await call('POST', '/rebuild/worker');
  expect(added).toMatchObject({ ok: false, code: 'CONFIG_CHANGED_RESTART_REQUIRED' });
  expect(added.message).toStartWith(
    'worker is not part of this dev session. stacktape.json changed after dev mode started'
  );
});

// r2w: a failed Go build came back as 3 KB of BuildKit output twice, in the message and in failedWorkloads.
test("a failed rebuild's error of several lines is in failedWorkloads only", async () => {
  const error =
    'Docker build failed in step `go build`:\n./main.go:78:39: undefined: undefinedVar\nFull build output: /tmp/x';
  const { call } = await startSession({
    workloads: ['api'],
    build: async () => {
      throw new CliError({ category: 'DOCKER', code: 'DOCKER_ERROR', message: error });
    }
  });
  const failed = await call('POST', '/rebuild/api');
  expect(failed.message).toBe('Rebuild failed. api: 3 lines in failedWorkloads');
  expect(failed.data.failedWorkloads).toEqual([{ name: 'api', error }]);
});

// r2gg finding 8: after a change to packages/shared, `rebuild {workload: "api"}` answered "Rebuilt api." while quote and
// report, which use the same package, kept the old code. Watch mode rebuilt all three.
test('a rebuild names the other workloads that use its changed files and still run the previous build', async () => {
  const shared = 'packages/shared/src/index.ts';
  const { call, directory } = await startSession({
    workloads: ['api', 'quote', 'report', 'web'],
    build: async () => {},
    sourceFiles: {
      api: ['apps/api/src/index.ts', shared],
      quote: ['functions/quote/src/handler.ts', shared],
      report: [shared],
      web: []
    }
  });
  await mkdir(join(directory, 'packages/shared/src'), { recursive: true });
  // The file changes after the session's first builds.
  await delay(20);
  await writeFile(join(directory, shared), 'export const SHARED_VERSION = 2;');

  const api = await call('POST', '/rebuild/api');
  expect(api).toMatchObject({ ok: true, code: 'OK' });
  expect(api.message).toBe(
    `Rebuilt api. quote, report also use changed files (${shared}) and still run the previous build; rebuild them or rebuild all.`
  );
  expect(api.data.staleWorkloads).toEqual([
    { name: 'quote', changedFiles: [join(directory, shared)] },
    { name: 'report', changedFiles: [join(directory, shared)] }
  ]);

  // Once every consumer is rebuilt, nothing is stale.
  await delay(20);
  const all = await call('POST', '/rebuild/all');
  expect(all.message).toBe('Rebuilt api, quote, report, web.');
  expect((await call('POST', '/rebuild/api')).data.staleWorkloads).toBeUndefined();
});

// r2gg/r2an: after a change to a shared package, a rebuild named the stale local consumers but not the batch job whose
// image, built at the start, also used the package; rebuild_all did not deploy it either.
test('a rebuild names a batch job whose image uses its changed files, and says only a restart builds it again', async () => {
  const shared = 'packages/shared/src/index.ts';
  const { call, directory } = await startSession({
    workloads: ['api', 'quote'],
    build: async () => {},
    sourceFiles: { api: ['apps/api/src/index.ts', shared], quote: ['functions/quote/src/handler.ts'] },
    remoteImageInputs: { report: ['jobs/report/main.ts', shared] }
  });
  await mkdir(join(directory, 'packages/shared/src'), { recursive: true });
  await delay(20);
  await writeFile(join(directory, shared), 'export const SHARED_VERSION = 2;');

  const restartNote = `report runs in AWS from the image built when dev mode started, which also uses changed files (${shared}). Restart dev mode to build and push it again; rebuilds do not.`;
  const api = await call('POST', '/rebuild/api');
  expect(api.message).toBe(`Rebuilt api. ${restartNote}`);
  expect(api.data.staleRemoteImages).toEqual([{ name: 'report', changedFiles: [join(directory, shared)] }]);
  expect(api.data.staleWorkloads).toBeUndefined();

  // rebuild_all rebuilds every local workload and still leaves the image as the start built it.
  const all = await call('POST', '/rebuild/all');
  expect(all.message).toBe(`Rebuilt api, quote. ${restartNote}`);

  // A rebuild that did not read the changed file says nothing about the image.
  expect((await call('POST', '/rebuild/quote')).data.staleRemoteImages).toBeUndefined();
});

// r2p: rebuild_all also restarted the Vite dev server, which loads changed code itself.
test('rebuild all leaves a running frontend to its own hot reload, and restarts a failed one', async () => {
  const built: string[] = [];
  const { call } = await startSession({
    workloads: ['api', 'web'],
    frontends: ['web'],
    build: async (name) => {
      built.push(name);
    }
  });
  const all = await call('POST', '/rebuild/all');
  expect(all).toMatchObject({ ok: true, data: { rebuilt: ['api'], leftRunning: ['web'] } });
  expect(all.message).toBe(
    'Rebuilt api. web kept running: its dev server loads changed code itself. Rebuild it by name to restart it.'
  );
  expect(built).toEqual(['api']);

  // Rebuilding the frontend by name still restarts its server.
  expect(await call('POST', '/rebuild/web')).toMatchObject({ ok: true, data: { rebuilt: ['web'] } });
  expect(built).toEqual(['api', 'web']);

  // A frontend whose server stopped is restarted with the others.
  devTuiManager.setWorkloadStatus('web', 'error', { error: 'The dev server exited with code 1.' });
  const recovery = await call('POST', '/rebuild/all');
  expect(recovery).toMatchObject({ ok: true, data: { rebuilt: ['api', 'web'] } });
  expect(recovery.data.leftRunning).toBeUndefined();
  expect(built).toEqual(['api', 'web', 'api', 'web']);
});

// r2an: Ledger's handled SDK timeout made its Next.js frontend a failed workload and the session not ready, although the
// server kept serving; the error was only the access log line.
test("a frontend's failed request leaves it running and the session ready; status names the error apart", async () => {
  const { call } = await startSession({ workloads: ['web'], frontends: ['web'], build: async () => {} });
  const reporter = createFrontendStatusReporter('web');
  const url = 'http://web.todos.localhost:1360';
  reporter.onStateChange({ status: 'ready', url });
  const requestError =
    "⨯ [Error [TimeoutError]: ] {\n  code: 'ETIMEDOUT',\n  '$metadata': [Object],\nPOST / 500 in 2536ms";
  reporter.onStateChange({ status: 'ready', url, requestError });
  expect((await call('GET', '/status')).data).toMatchObject({
    ready: true,
    failedWorkloads: [],
    requestErrors: [{ name: 'web', error: requestError }],
    workloads: { web: url }
  });

  // The next successful request clears it.
  reporter.onStateChange({ status: 'ready', url });
  expect((await call('GET', '/status')).data.requestErrors).toBeUndefined();

  // A server that stops is a failed workload.
  reporter.onStateChange({ status: 'error', error: 'The dev server exited with code 1.' });
  expect((await call('GET', '/status')).data).toMatchObject({
    ready: false,
    failedWorkloads: [{ name: 'web', error: 'The dev server exited with code 1.' }]
  });
});
