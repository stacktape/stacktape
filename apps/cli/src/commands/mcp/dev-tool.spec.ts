import { afterAll, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { appendFile, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { localStatePaths } from 'src/config/local-state-paths';
import { createDevToolHandler, isProjectDirectoryOf, isWriteQuery } from './dev-tool';

// Dev startup itself belongs to S15. These local daemons isolate MCP's handle routing and HTTP envelope handling.
// Each one, like the real agent, answers only requests that carry the session token it stored under its port.
const originalTokenDirectory = process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = mkdtempSync(join(tmpdir(), 'stacktape-mcp-dev-tokens-'));
const tokenDirectory = process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
afterAll(async () => {
  await rm(tokenDirectory, { recursive: true, force: true });
  if (originalTokenDirectory === undefined) delete process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR;
  else process.env.STACKTAPE_DEV_AGENT_TOKEN_DIR = originalTokenDirectory;
});

const daemon = async ({
  logFile,
  status = {},
  hangs = false,
  exitAfterStopMs = 20,
  rebuildMs = 0,
  scriptOutput = []
}: {
  logFile?: string;
  /** The output lines a script run returns. */
  scriptOutput?: string[];
  status?: Record<string, unknown>;
  /** Accepts connections and never answers, like an agent stuck in a long synchronous step. */
  hangs?: boolean;
  /** How long the agent's cleanup takes after `/stop`; `null` keeps it answering. */
  exitAfterStopMs?: number | null;
  /** How long a rebuild takes before the agent answers. */
  rebuildMs?: number;
} = {}) => {
  const state = {
    stopped: false,
    rebuilt: [] as string[],
    requests: [] as Array<{ path: string; body?: unknown }>,
    /** Every POST except env and aws: rebuilds, stops, resets, seeds and queries. */
    changes: [] as string[]
  };
  const token = randomUUID();
  const server = createServer((request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'missing token' }));
      return;
    }
    if (hangs) return;
    const path = new URL(request.url!, 'http://127.0.0.1').pathname;
    if (request.method === 'POST' && !path.startsWith('/env/') && path !== '/aws/sdk') state.changes.push(path);
    let data: Record<string, unknown> = {};
    if (/^\/(postgres|mysql|redis)\/[^/]+\/(query|command)$/.test(path)) {
      let body = '';
      request.on('data', (chunk) => (body += chunk));
      request.on('end', () => {
        state.requests.push({ path, body: JSON.parse(body) });
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ ok: true, code: 'OK', data: { rows: [] } }));
      });
      return;
    }
    if (path.startsWith('/env/') || path === '/aws/sdk') {
      let body = '';
      request.on('data', (chunk) => (body += chunk));
      request.on('end', () => {
        state.requests.push({ path, ...(body ? { body: JSON.parse(body) } : {}) });
        response.setHeader('content-type', 'application/json');
        response.end(
          JSON.stringify(
            path === '/aws/sdk'
              ? {
                  v: '1.0',
                  ok: true,
                  code: 'OK',
                  message: 'OK',
                  data: { output: { Attributes: { DelaySeconds: '0' } } }
                }
              : { v: '1.0', ok: true, code: 'OK', message: 'OK', data: { envVars: { PORT: '3000', TOKEN: '****' } } }
          )
        );
      });
      return;
    }
    if (path === '/health') data = { healthy: !state.stopped };
    else if (path === '/status') data = { stopped: state.stopped, rebuilt: state.rebuilt, ...status };
    else if (path === '/logs' && logFile) data = { logFile };
    else if (request.method === 'POST' && path === '/stop') {
      state.stopped = true;
      // A real agent exits once its cleanup has run.
      if (exitAfterStopMs !== null) {
        response.on('finish', () =>
          setTimeout(() => {
            server.close();
            server.closeAllConnections();
          }, exitAfterStopMs)
        );
      }
    } else if (request.method === 'POST' && path.startsWith('/scripts/')) {
      data = { script: 'seed', durationMs: 5, output: scriptOutput };
    } else if (request.method === 'POST' && path.startsWith('/reset/')) data = {};
    else if (request.method === 'POST' && path === '/rebuild/broken') {
      // What the agent answers when the build fails: the error, the failed workloads and the log file.
      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify({
          v: '1.0',
          ok: false,
          code: 'REBUILD_FAILED',
          message: 'Rebuild failed. broken: Build failed: Unexpected ;',
          data: {
            failedWorkloads: [{ name: 'broken', error: 'Build failed: Unexpected ;' }],
            logFile: '/tmp/7331-logs.txt'
          }
        })
      );
      return;
    } else if (request.method === 'POST' && path.startsWith('/rebuild/')) {
      state.rebuilt.push(decodeURIComponent(path.slice('/rebuild/'.length)));
      if (rebuildMs) {
        setTimeout(() => {
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify({ ok: true, code: 'OK', data }));
        }, rebuildMs);
        return;
      }
    } else {
      response.writeHead(500);
      response.end('Unexpected dev API route');
      return;
    }
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ ok: true, code: 'OK', data }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  await writeFile(localStatePaths.devAgentTokenFile({ port }), token);
  return {
    state,
    port,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) =>
          error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING' ? reject(error) : resolve()
        )
      );
    }
  };
};

type RunCli = NonNullable<NonNullable<Parameters<typeof createDevToolHandler>[0]>['runCli']>;

// What `dev --agent` returns through the JSONL runner: the ready payload of the agent on `port`, which carries the path
// of its token file but never the token.
const agentReady =
  (reportedPort: (requestedPort: number) => number = (requestedPort) => requestedPort): RunCli =>
  async ({ args, cwd }) => {
    const port = reportedPort(Number(args?.agentPort));
    return {
      ok: true,
      code: 'OK',
      message: 'Fixture daemon started.',
      data: {
        result: {
          port,
          projectName: 'fixture',
          tokenFile: localStatePaths.devAgentTokenFile({ port }),
          failedWorkloads: []
        }
      },
      events: [],
      logEvents: [],
      outputEvents: [],
      resolvedContext: { cwd: cwd || process.cwd() }
    };
  };
const startedDaemon = agentReady();

describe('MCP dev session routing', () => {
  // r2w: a container rebuild that waited 84 s for its port sent no progress, so a client could not tell it from a hang.
  test('a rebuild reports what it waits for while it runs', async () => {
    const agent = await daemon({
      rebuildMs: 400,
      status: {
        workloads: [
          {
            name: 'ordersApi',
            status: 'starting',
            statusMessage: 'Waiting for the app to accept connections on port 8080...'
          },
          { name: 'web', status: 'running' }
        ]
      }
    });
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon, rebuildProgressIntervalMs: 100 });
      await handler({ action: 'start', args: { agentPort: agent.port } });
      const progress: string[] = [];
      const result = await handler({
        action: 'rebuild',
        args: { workload: 'ordersApi' },
        onProgress: ({ message }) => void progress.push(message)
      });
      expect(result.structuredContent.ok).toBe(true);
      expect(progress.length).toBeGreaterThanOrEqual(2);
      expect(progress[0]).toMatch(
        /^Rebuilding ordersApi: Waiting for the app to accept connections on port 8080\.\.\. \(\d+ s\)$/
      );
      // No progress after the answer.
      const count = progress.length;
      await new Promise((resolve) => setTimeout(resolve, 250));
      expect(progress).toHaveLength(count);
    } finally {
      await agent.close();
    }
  });

  test('rebuilds and stops only the daemon selected by its live session handle', async () => {
    const first = await daemon();
    let second: Awaited<ReturnType<typeof daemon>> | undefined;
    try {
      second = await daemon();
      const handler = createDevToolHandler({ runCli: startedDaemon });
      const one = (await handler({ action: 'start', args: { agentPort: first.port } })).structuredContent;
      const two = (await handler({ action: 'start', args: { agentPort: second.port } })).structuredContent;
      const idOf = (result: typeof one) => (result.data?.session as { devSessionId: string }).devSessionId;
      const firstId = idOf(one);
      const secondId = idOf(two);
      expect(firstId).not.toBe(secondId);
      expect((await handler({ action: 'status' })).structuredContent.code).toBe('AMBIGUOUS_DEV_SESSION');
      for (const action of ['rebuild', 'rebuild_all', 'stop'] as const) {
        expect((await handler({ action })).structuredContent.code).toBe('AMBIGUOUS_DEV_SESSION');
      }
      expect((await handler({ action: 'stop', args: { devSessionId: 'unknown' } })).structuredContent.code).toBe(
        'NOT_FOUND'
      );
      expect(first.state).toMatchObject({ stopped: false, rebuilt: [] });
      expect(second.state).toMatchObject({ stopped: false, rebuilt: [] });
      expect(
        (await handler({ action: 'rebuild', args: { devSessionId: firstId, workload: 'api worker' } }))
          .structuredContent.ok
      ).toBe(true);
      expect(first.state.rebuilt).toEqual(['api worker']);
      expect(second.state.rebuilt).toEqual([]);
      expect((await handler({ action: 'rebuild_all', args: { devSessionId: secondId } })).structuredContent.ok).toBe(
        true
      );
      expect(first.state.rebuilt).toEqual(['api worker']);
      expect(second.state.rebuilt).toEqual(['all']);
      expect((await handler({ action: 'stop', args: { devSessionId: firstId } })).structuredContent.ok).toBe(true);
      expect(first.state.stopped).toBe(true);
      expect(second.state.stopped).toBe(false);
      expect((await handler({ action: 'stop', args: { devSessionId: firstId } })).structuredContent.code).toBe(
        'NOT_FOUND'
      );
      expect((await handler({ action: 'status' })).structuredContent.data?.status).toMatchObject({
        stopped: false,
        rebuilt: ['all']
      });
      // With one session left, a rebuild goes to it; stopping still names the session.
      expect((await handler({ action: 'stop' })).structuredContent.code).toBe('DEV_SESSION_ID_REQUIRED');
      expect((await handler({ action: 'rebuild', args: { workload: 'worker' } })).structuredContent.ok).toBe(true);
      expect((await handler({ action: 'rebuild_all' })).structuredContent.ok).toBe(true);
      expect(second.state.rebuilt).toEqual(['all', 'worker', 'all']);
      // A failed build comes back as a failure with its error and log file, not as "rebuild requested".
      expect((await handler({ action: 'rebuild', args: { workload: 'broken' } })).structuredContent).toMatchObject({
        ok: false,
        code: 'REBUILD_FAILED',
        message: 'Rebuild failed. broken: Build failed: Unexpected ;',
        data: {
          failedWorkloads: [{ name: 'broken', error: 'Build failed: Unexpected ;' }],
          logFile: '/tmp/7331-logs.txt'
        }
      });
      expect((await handler({ action: 'stop', args: { devSessionId: secondId } })).structuredContent.ok).toBe(true);
      expect(second.state.stopped).toBe(true);
      expect((await handler({ action: 'status' })).structuredContent.code).toBe('NOT_FOUND');
    } finally {
      await second?.close();
      await first.close();
    }
  });

  test('a start that finds the agent already running returns a session that can call it', async () => {
    const running = await daemon();
    try {
      // `dev --agent` reports the running agent of this project and stage, whatever port was requested.
      const handler = createDevToolHandler({ runCli: agentReady(() => running.port) });
      const started = (await handler({ action: 'start', args: { agentPort: 7331 } })).structuredContent;
      expect(started.ok).toBe(true);
      const session = started.data?.session as { devSessionId: string; agentPort: number };
      expect(session.agentPort).toBe(running.port);
      const status = (await handler({ action: 'status', args: { devSessionId: session.devSessionId } }))
        .structuredContent;
      expect(status.ok).toBe(true);
      expect(
        (await handler({ action: 'stop', args: { devSessionId: session.devSessionId } })).structuredContent.ok
      ).toBe(true);
      expect(running.state.stopped).toBe(true);
    } finally {
      await running.close();
    }
  });

  test('a session whose agent ended itself reports the recorded reason, an older reason is ignored', async () => {
    const taken = await daemon();
    const handler = createDevToolHandler({ runCli: startedDaemon });
    const started = (await handler({ action: 'start', args: { agentPort: taken.port } })).structuredContent;
    const devSessionId = (started.data?.session as { devSessionId: string }).devSessionId;
    const reasonFile = localStatePaths.devAgentStopReasonFile({ port: taken.port });
    // A reason left by an earlier agent on this port does not describe this session.
    await writeFile(
      reasonFile,
      JSON.stringify({ code: 'DEV_STAGE_TAKEN_OVER', message: 'old', at: '2020-01-01T00:00:00.000Z' })
    );
    await taken.close();
    expect((await handler({ action: 'status', args: { devSessionId } })).structuredContent.code).toBe('NOT_FOUND');

    const again = await daemon();
    try {
      const restarted = (await handler({ action: 'start', args: { agentPort: again.port } })).structuredContent;
      const restartedId = (restarted.data?.session as { devSessionId: string }).devSessionId;
      await writeFile(
        localStatePaths.devAgentStopReasonFile({ port: again.port }),
        JSON.stringify({
          code: 'DEV_STAGE_TAKEN_OVER',
          message: 'Alice (laptop, ~/shop) took over dev mode for shop-dev.',
          at: new Date().toISOString()
        })
      );
      await again.close();
      const status = (await handler({ action: 'status', args: { devSessionId: restartedId } })).structuredContent;
      expect(status).toMatchObject({ ok: false, code: 'DEV_STAGE_TAKEN_OVER' });
      expect(status.message).toContain('Alice (laptop, ~/shop) took over');
    } finally {
      await again.close();
    }
  });

  test('a start whose result names no agent port creates no session', async () => {
    const running = await daemon();
    try {
      const handler = createDevToolHandler({
        runCli: async (input) => ({ ...(await startedDaemon(input)), data: undefined })
      });
      const started = (await handler({ action: 'start', args: { agentPort: running.port } })).structuredContent;
      expect(started.ok).toBe(false);
      expect(started.data?.session).toBeUndefined();
      expect((await handler({ action: 'status' })).structuredContent.code).toBe('NOT_FOUND');
      expect(running.state.stopped).toBe(false);
    } finally {
      await running.close();
    }
  });

  test('reads dev logs page by page from the cursor the previous page returned', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-mcp-dev-logs-'));
    const logFile = join(directory, 'dev.jsonl');
    const line = (source: string, message: string) => `${JSON.stringify({ source, message })}\n`;
    await writeFile(logFile, line('api', 'started') + line('worker', 'started') + line('api', 'GET / 200'));
    const dev = await daemon({ logFile });
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon });
      const started = (await handler({ action: 'start', args: { agentPort: dev.port } })).structuredContent;
      const devSessionId = (started.data?.session as { devSessionId: string }).devSessionId;
      const read = async (args: Record<string, unknown>) =>
        (await handler({ action: 'logs', args: { devSessionId, ...args } })).structuredContent.data as {
          entries: Array<{ source: string; message: string }>;
          nextCursor: number;
        };

      const first = await read({});
      expect(first.entries.map(({ message }) => message)).toEqual(['started', 'started', 'GET / 200']);
      await appendFile(logFile, line('api', 'TypeError: x is undefined') + line('worker', 'job done'));
      const next = await read({ cursor: first.nextCursor });
      expect(next.entries.map(({ message }) => message)).toEqual(['TypeError: x is undefined', 'job done']);
      expect(next.nextCursor).toBe(5);
      expect((await read({ cursor: first.nextCursor, workload: 'api' })).entries).toEqual([
        { source: 'api', message: 'TypeError: x is undefined' }
      ]);
      // One more line, then the logger rotates the file: its new first line counts the 6 lines before it. A cursor into
      // the rotated copy reads the rest of it first, then the new file.
      await appendFile(logFile, line('api', 'GET /late 200'));
      await rename(logFile, `${logFile}.1`);
      await writeFile(
        logFile,
        `${JSON.stringify({ source: 'dev', message: 'Earlier lines are in dev.jsonl.1', lineOffset: 6 })}\n` +
          line('api', 'GET /orders 200')
      );
      const rotated = await read({ cursor: next.nextCursor });
      expect(rotated.entries.map(({ message }) => message)).toEqual([
        'GET /late 200',
        'Earlier lines are in dev.jsonl.1',
        'GET /orders 200'
      ]);
      expect(rotated.nextCursor).toBe(8);
      expect((await read({ cursor: rotated.nextCursor })).entries).toEqual([]);
      // Without a cursor, the newest lines come from the new file.
      expect((await read({})).nextCursor).toBe(8);
      await handler({ action: 'stop', args: { devSessionId } });
    } finally {
      await dev.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('refuses a list for a flag that takes one value instead of starting dev mode on the last stage', async () => {
    const project = await mkdtemp(join(tmpdir(), 'stacktape-mcp-dev-start-'));
    const previousCommand = process.env.STACKTAPE_MCP_CLI_COMMAND;
    // Only reached if the runner spawns at all: `bun dev` in an empty folder fails without a result.
    process.env.STACKTAPE_MCP_CLI_COMMAND = process.execPath;
    try {
      const output = (
        await createDevToolHandler()({ action: 'start', args: { cwd: project, stage: ['dev', 'production'] } })
      ).structuredContent;
      expect(output).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
      expect(output.message).toContain('stage');
    } finally {
      if (previousCommand === undefined) delete process.env.STACKTAPE_MCP_CLI_COMMAND;
      else process.env.STACKTAPE_MCP_CLI_COMMAND = previousCommand;
      await rm(project, { recursive: true, force: true });
    }
  });

  // A cold start creates the dev network and the dev stack for several minutes, longer than an MCP client's per-call
  // timeout. start returns while the start continues, with the progress so far; status waits for it to finish.
  test('a slow start returns DEV_STARTING with progress and finishes in the background', async () => {
    const dev = await daemon();
    try {
      let finishStart!: () => void;
      const gate = new Promise<void>((resolve) => (finishStart = resolve));
      let passedSessionId: string | undefined;
      const runCli: RunCli = async (input) => {
        passedSessionId = input.env?.STACKTAPE_DEV_SESSION_ID;
        const event = (message: string, detail?: unknown) =>
          input.onProgress?.({
            type: 'event',
            ts: new Date().toISOString(),
            phase: 'DEV_STARTUP',
            eventType: 'DEV_STACK',
            status: 'running',
            message,
            ...(detail ? { detail: detail as never } : {})
          });
        await event('Starting the dev agent', { kind: 'dev-agent', agentPort: dev.port, tokenFile: 'unused' });
        await event('Creating dev stack app-dev');
        await gate;
        return startedDaemon({ ...input, args: { ...input.args, agentPort: dev.port } });
      };
      const progress: string[] = [];
      const handler = createDevToolHandler({ runCli, discoverAgents: async () => [] });
      const started = (
        await handler({
          action: 'start',
          args: { waitSeconds: 0.2 },
          onProgress: ({ message }) => {
            progress.push(message);
          }
        })
      ).structuredContent;
      expect(started).toMatchObject({ ok: true, code: 'DEV_STARTING' });
      expect(progress).toEqual(['Starting the dev agent', 'Creating dev stack app-dev']);
      const session = started.data?.session as { devSessionId: string; agentPort?: number };
      expect(passedSessionId).toBe(session.devSessionId);
      expect(session.agentPort).toBe(dev.port);
      expect(started.message).toContain('still starting: Creating dev stack app-dev.');

      const devSessionId = session.devSessionId;
      expect(
        (await handler({ action: 'status', args: { devSessionId, waitSeconds: 0.1 } })).structuredContent.code
      ).toBe('DEV_STARTING');
      expect((await handler({ action: 'rebuild_all', args: { devSessionId } })).structuredContent).toMatchObject({
        ok: false,
        code: 'DEV_STARTING'
      });

      // The start finishes while a status call waits for it: that call returns the ready status.
      setTimeout(finishStart, 300);
      const ready = (await handler({ action: 'status', args: { devSessionId, waitSeconds: 5 } })).structuredContent;
      expect(ready).toMatchObject({ ok: true, code: 'OK' });
      expect(ready.data?.status).toMatchObject({ stopped: false });
      expect((await handler({ action: 'stop', args: { devSessionId } })).structuredContent.ok).toBe(true);
      expect(dev.state.stopped).toBe(true);
    } finally {
      await dev.close();
    }
  });

  // Sessions used to live only in the MCP server's memory, so a restarted server said no session was running.
  test('a restarted MCP server finds a running session by the ID the agent reports', async () => {
    const project = await mkdtemp(join(tmpdir(), 'stacktape-mcp-dev-rediscover-'));
    const dev = await daemon({ status: { sessionId: 'session-from-earlier-server', projectDirectory: project } });
    try {
      const restarted = createDevToolHandler({ runCli: startedDaemon });
      const status = (await restarted({ action: 'status', args: { cwd: project } })).structuredContent;
      expect(status.ok).toBe(true);
      expect(status.data?.session).toMatchObject({ devSessionId: 'session-from-earlier-server', agentPort: dev.port });

      const another = createDevToolHandler({ runCli: startedDaemon });
      expect(
        (await another({ action: 'stop', args: { devSessionId: 'session-from-earlier-server' } })).structuredContent.ok
      ).toBe(true);
      expect(dev.state.stopped).toBe(true);
    } finally {
      await dev.close();
      await rm(project, { recursive: true, force: true });
    }
  });

  test('logs default to the newest lines and filter by level and time', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-mcp-dev-logs-'));
    const logFile = join(directory, 'dev.jsonl');
    const at = (minutesAgo: number) => new Date(Date.parse('2026-10-24T12:00:00Z') - minutesAgo * 60_000).toISOString();
    const line = (minutesAgo: number, level: string, msg: string) =>
      `${JSON.stringify({ ts: at(minutesAgo), source: 'api', level, msg })}\n`;
    await writeFile(
      logFile,
      [line(30, 'error', 'old failure'), line(20, 'info', 'a'), line(5, 'warn', 'slow'), line(1, 'info', 'b')].join('')
    );
    const dev = await daemon({ logFile });
    try {
      const handler = createDevToolHandler({
        runCli: startedDaemon,
        now: () => new Date('2026-10-24T12:00:00Z')
      });
      const started = (await handler({ action: 'start', args: { agentPort: dev.port } })).structuredContent;
      const devSessionId = (started.data?.session as { devSessionId: string }).devSessionId;
      const read = async (args: Record<string, unknown>) =>
        (await handler({ action: 'logs', args: { devSessionId, ...args } })).structuredContent;
      const messages = (output: Awaited<ReturnType<typeof read>>) =>
        (output.data?.entries as Array<{ msg: string }>).map(({ msg }) => msg);

      const newest = await read({ limit: 2 });
      expect(messages(newest)).toEqual(['slow', 'b']);
      expect(newest.data).toMatchObject({ nextCursor: 4, omittedOlderEntries: 2 });
      expect(messages(await read({ level: 'warn' }))).toEqual(['old failure', 'slow']);
      expect(messages(await read({ since: '10m' }))).toEqual(['slow', 'b']);
      expect(messages(await read({ since: '10m', level: 'error' }))).toEqual([]);
      expect((await read({ level: 'fatal' })).code).toBe('VALIDATION_ERROR');
      expect((await read({ since: 'yesterday-ish' })).code).toBe('VALIDATION_ERROR');
      await handler({ action: 'stop', args: { devSessionId } });
    } finally {
      await dev.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  // r2gg: `logs {since: "5m", limit: 400}` answered RESPONSE_TOO_LARGE, and lines caught up on after a restart were
  // listed before newer ones that had arrived first.
  test('logs fit the response size, say how to read the older entries, and are sorted by time', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-mcp-dev-logs-size-'));
    const logFile = join(directory, 'dev.jsonl');
    const at = (secondsAgo: number) => new Date(Date.parse('2026-10-24T12:00:00Z') - secondsAgo * 1000).toISOString();
    const line = (secondsAgo: number, msg: string) =>
      `${JSON.stringify({ ts: at(secondsAgo), source: 'api', level: 'info', msg })}\n`;
    const big = (index: number) => `request ${index} ${'x'.repeat(400)}`;
    await writeFile(
      logFile,
      [
        ...Array.from({ length: 200 }, (_, index) => line(200 - index, big(index))),
        line(0.5, 'Function code unchanged, already deployed'),
        line(0.7, '(before this session was ready) START RequestId: 1')
      ].join('')
    );
    const dev = await daemon({ logFile });
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon, now: () => new Date('2026-10-24T12:00:00Z') });
      const started = (await handler({ action: 'start', args: { agentPort: dev.port } })).structuredContent;
      const devSessionId = (started.data?.session as { devSessionId: string }).devSessionId;
      const read = async (args: Record<string, unknown>) =>
        (await handler({ action: 'logs', args: { devSessionId, ...args } })).structuredContent;
      const messages = (output: Awaited<ReturnType<typeof read>>) =>
        (output.data?.entries as Array<{ msg: string }>).map(({ msg }) => msg);

      const newest = await read({ since: '5m', limit: 400 });
      expect(newest).toMatchObject({ ok: true, code: 'OK' });
      const shown = messages(newest);
      expect(shown.length).toBeLessThan(202);
      expect(shown.slice(-2)).toEqual([
        '(before this session was ready) START RequestId: 1',
        'Function code unchanged, already deployed'
      ]);
      const omitted = newest.data?.omittedOlderEntries as number;
      expect(omitted).toBe(202 - shown.length);
      expect(newest.data?.olderCursor).toBe(0);
      expect(newest.nextActions?.join('\n')).toContain('args.cursor=0');

      const oldest = await read({ since: '5m', limit: 400, cursor: 0 });
      expect(messages(oldest)[0]).toBe(big(0));
      expect(oldest.data?.nextCursor).toBe(messages(oldest).length);
    } finally {
      await dev.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  // r2xx: one 40 000-character line answered RESPONSE_TOO_LARGE with no cursor, a fractional cursor returned empty
  // entries, and credentials in log lines reached the agent unmasked.
  test('logs cut a line longer than a page, refuse a fractional cursor and mask credentials', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-mcp-dev-logs-long-'));
    const logFile = join(directory, 'dev.jsonl');
    const canary = 'r2zz-fabricated-Xk29fQ7v';
    const line = (msg: string) =>
      `${JSON.stringify({ ts: '2026-10-28T12:00:00.000Z', source: 'api', level: 'error', msg })}\n`;
    await writeFile(
      logFile,
      line('started') +
        line(`dump ${'y'.repeat(40_000)}`) +
        line(`login failed password=${canary}`) +
        line(`GET /me Authorization: Bearer ${canary}`) +
        line(JSON.stringify({ password: canary, api_key: canary }))
    );
    const dev = await daemon({ logFile });
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon });
      const started = (await handler({ action: 'start', args: { agentPort: dev.port } })).structuredContent;
      const devSessionId = (started.data?.session as { devSessionId: string }).devSessionId;
      const read = async (args: Record<string, unknown>) =>
        (await handler({ action: 'logs', args: { devSessionId, ...args } })).structuredContent;

      const long = await read({ cursor: 1, limit: 1 });
      expect(long).toMatchObject({ ok: true, code: 'OK', data: { nextCursor: 2 } });
      const [entry] = long.data?.entries as Array<{ msg: string; truncatedFromChars?: number }>;
      expect(entry.msg).toStartWith('dump yyy');
      expect(entry.msg).toContain('characters cut]');
      expect(entry.truncatedFromChars).toBeGreaterThan(40_000);
      expect(long.nextActions?.join('\n')).toContain('truncatedFromChars');

      expect(await read({ cursor: 0.5 })).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });

      const rest = await read({ cursor: 2 });
      expect((rest.data?.entries as unknown[]).length).toBe(3);
      expect(JSON.stringify(rest)).not.toContain(canary);
    } finally {
      await dev.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  // r2xx: a seed that ran and printed 40 000 characters answered RESPONSE_TOO_LARGE and advised running it again.
  test('a seed with more output than one result holds still reports that it ran', async () => {
    const lines = [
      'inserted 10 users',
      'z'.repeat(40_000),
      ...Array.from({ length: 150 }, (_, index) => `row ${index}`)
    ];
    const dev = await daemon({ scriptOutput: lines });
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon });
      const started = (await handler({ action: 'start', args: { agentPort: dev.port } })).structuredContent;
      const devSessionId = (started.data?.session as { devSessionId: string }).devSessionId;

      const seeded = (await handler({ action: 'seed', args: { devSessionId } })).structuredContent;
      expect(seeded).toMatchObject({ ok: true, code: 'OK' });
      const data = seeded.data as { output: string[]; omittedOutputLines: number; outputLog: string };
      expect(data.output.at(-1)).toBe('row 149');
      expect(data.omittedOutputLines).toBe(lines.length - data.output.length);
      expect((await readFile(data.outputLog, 'utf8')).trimEnd()).toBe(lines.join('\n'));
      await rm(data.outputLog, { force: true });
    } finally {
      await dev.close();
    }
  });

  // The P1 of the review: a start that fails after start returned DEV_STARTING, while no status call waits, must keep
  // its own error for the next call instead of answering NOT_FOUND.
  test('a background start that fails while no call waits keeps its code and hints for the next status call', async () => {
    let failStart!: () => void;
    const gate = new Promise<void>((resolve) => (failStart = resolve));
    const runCli: RunCli = async ({ cwd }) => {
      await gate;
      return {
        ok: false,
        code: 'CLI_DEV_STACK_CONFLICT',
        message: 'Stack `app-dev` exists, but `stacktape dev` did not create it.',
        data: { hints: ['Choose another stage with `--stage`.'] },
        events: [],
        logEvents: [],
        outputEvents: [],
        resolvedContext: { cwd: cwd || process.cwd() }
      };
    };
    const handler = createDevToolHandler({ runCli, discoverAgents: async () => [] });
    const started = (await handler({ action: 'start', args: { waitSeconds: 0.05 } })).structuredContent;
    expect(started.code).toBe('DEV_STARTING');
    const devSessionId = (started.data?.session as { devSessionId: string }).devSessionId;

    failStart();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const failed = (await handler({ action: 'status', args: { devSessionId } })).structuredContent;
    expect(failed).toMatchObject({ ok: false, code: 'CLI_DEV_STACK_CONFLICT' });
    expect(JSON.stringify(failed.data)).toContain('Choose another stage');
    // Read once: afterwards the session is gone like any ended one.
    expect((await handler({ action: 'status', args: { devSessionId } })).structuredContent.code).toBe('NOT_FOUND');

    // Without an ID, a status call gets the failure when it is all this server knows.
    const second = createDevToolHandler({
      runCli: async (input) => ({ ...(await runCli(input)), code: 'STACK_ERROR', message: 'Stack update failed.' }),
      discoverAgents: async () => []
    });
    expect((await second({ action: 'start', args: { waitSeconds: 0 } })).structuredContent.code).toBe('STACK_ERROR');
    expect((await second({ action: 'status' })).structuredContent.code).toBe('NOT_FOUND');
    let failThird!: () => void;
    const thirdGate = new Promise<void>((resolve) => (failThird = resolve));
    const third = createDevToolHandler({
      runCli: async (input) => {
        await thirdGate;
        return { ...(await runCli(input)), code: 'CLI_DEV_STACK_NOT_UPDATABLE', message: 'Delete it.' };
      },
      discoverAgents: async () => []
    });
    expect((await third({ action: 'start', args: { waitSeconds: 0 } })).structuredContent.code).toBe('DEV_STARTING');
    failThird();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect((await third({ action: 'status' })).structuredContent.code).toBe('CLI_DEV_STACK_NOT_UPDATABLE');
  });

  // r2ll: a start whose dev stack update failed left no dev agent, and aws reads about it answered NOT_FOUND "No active
  // dev session". The rolled-back dev stack is what the assistant has to inspect. #382 review: the read must target what
  // the start resolved (an alternate config's project and region), and pick a start only by its ID or exact stage.
  const failingStarts = () => {
    const calls: Array<{ command: string; args?: Record<string, unknown>; cwd?: string }> = [];
    const runCli: RunCli = async ({ command, args, cwd, onProgress }) => {
      calls.push({ command, args, cwd });
      const context = { events: [], logEvents: [], outputEvents: [], resolvedContext: { cwd: cwd || process.cwd() } };
      if (command === 'dev') {
        // The daemon resolves the project and region from the config the start names; no target when it fails earlier.
        if (args?.stage !== 'broken') {
          await onProgress?.({
            type: 'event',
            ts: new Date().toISOString(),
            phase: 'DEV_STARTUP',
            eventType: 'DEV_SESSION',
            status: 'running',
            message: 'Dev session target',
            detail: {
              kind: 'dev-target',
              projectName: args?.configPath ? 'test-app' : 'production-app',
              stage: String(args?.stage),
              region: args?.configPath ? 'eu-central-1' : 'eu-west-1',
              ...(args?.configPath ? { configPath: String(args.configPath) } : {})
            }
          });
        }
        return { ok: false, code: 'CLI_DEPLOYMENT_FAILED', message: 'Dev stack update failed.', ...context };
      }
      return {
        ok: true,
        code: 'OK',
        message: 'Command finished.',
        data: {
          result: { ok: true, service: 'cloudformation', command: 'DescribeStackEvents', data: { StackEvents: [] } }
        },
        ...context
      };
    };
    return { calls, runCli };
  };
  const describeEvents = { service: 'cloudformation', command: 'DescribeStackEvents', input: { StackName: 'stack' } };

  test('aws after a failed start reads the project, stage and region that start resolved', async () => {
    const { calls, runCli } = failingStarts();
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-mcp-failed-start-'));
    const handler = createDevToolHandler({ runCli, discoverAgents: async () => [], serverDirectory: () => directory });
    try {
      const failed = (
        await handler({
          action: 'start',
          args: {
            cwd: directory,
            stage: 'r2nnb',
            configPath: 'stacktape.test.yml',
            profile: 'stacktape-e2e',
            watch: true
          }
        })
      ).structuredContent;
      expect(failed.code).toBe('CLI_DEPLOYMENT_FAILED');
      const hint = failed.nextActions?.join(' ') ?? '';
      const devSessionId = hint.match(/args\.devSessionId=([\w-]+)/)?.[1];
      expect(devSessionId).toBeDefined();

      const read = (await handler({ action: 'aws', args: { ...describeEvents, devSessionId } })).structuredContent;
      expect(read).toMatchObject({
        ok: true,
        data: {
          failedStart: {
            devSessionId,
            projectName: 'test-app',
            stage: 'r2nnb',
            region: 'eu-central-1',
            configPath: 'stacktape.test.yml'
          }
        }
      });
      expect(calls.at(-1)).toEqual({
        command: 'aws:call',
        cwd: directory,
        args: {
          profile: 'stacktape-e2e',
          projectName: 'test-app',
          stage: 'r2nnb',
          region: 'eu-central-1',
          service: 'cloudformation',
          command: 'DescribeStackEvents',
          input: JSON.stringify(describeEvents.input)
        }
      });
      // The SDK call's region is the stack's; another one would read a different stack.
      expect(
        (await handler({ action: 'aws', args: { ...describeEvents, devSessionId, region: 'eu-west-1' } }))
          .structuredContent.code
      ).toBe('VALIDATION_ERROR');
      // Other actions of the failed session still answer that it does not run, and an unknown ID is no failed start.
      expect((await handler({ action: 'env', args: { devSessionId, workload: 'api' } })).structuredContent.code).toBe(
        'NOT_FOUND'
      );
      expect(
        (await handler({ action: 'aws', args: { ...describeEvents, devSessionId: 'unknown' } })).structuredContent.code
      ).toBe('NOT_FOUND');

      // A start that failed before it resolved its target deployed nothing; its read is refused, not guessed.
      const broken = (await handler({ action: 'start', args: { cwd: directory, stage: 'broken' } })).structuredContent;
      const brokenId = (broken.nextActions?.join(' ') ?? '').match(/args\.devSessionId=([\w-]+)/)?.[1];
      const callsBefore = calls.length;
      expect(
        (await handler({ action: 'aws', args: { ...describeEvents, devSessionId: brokenId } })).structuredContent.code
      ).toBe('DEV_TARGET_UNKNOWN');
      expect(calls).toHaveLength(callsBefore);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("aws without an ID picks a failed start only by exact stage, in this server's projects", async () => {
    const { calls, runCli } = failingStarts();
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-mcp-failed-starts-'));
    const elsewhere = await mkdtemp(join(tmpdir(), 'stacktape-mcp-elsewhere-'));
    const handler = createDevToolHandler({ runCli, discoverAgents: async () => [], serverDirectory: () => directory });
    try {
      await handler({ action: 'start', args: { cwd: directory, stage: 'alice', profile: 'profile-a' } });
      await handler({ action: 'start', args: { cwd: directory, stage: 'bob', profile: 'profile-b' } });

      const ambiguous = (await handler({ action: 'aws', args: describeEvents })).structuredContent;
      expect(ambiguous.code).toBe('DEV_SESSION_ID_REQUIRED');
      expect(ambiguous.message).toContain('stage alice');
      expect(ambiguous.message).toContain('stage bob');

      expect(
        (await handler({ action: 'aws', args: { ...describeEvents, cwd: directory, stage: 'alice' } }))
          .structuredContent.ok
      ).toBe(true);
      expect(calls.at(-1)?.args).toMatchObject({ stage: 'alice', profile: 'profile-a' });
      expect((await handler({ action: 'aws', args: { ...describeEvents, stage: 'bob' } })).structuredContent.ok).toBe(
        true
      );
      expect(calls.at(-1)?.args).toMatchObject({ stage: 'bob', profile: 'profile-b' });

      // A server in another directory, whose client names no roots, reads none of them without an ID.
      const other = createDevToolHandler({ runCli, discoverAgents: async () => [], serverDirectory: () => elsewhere });
      await other({ action: 'start', args: { cwd: directory, stage: 'carol', profile: 'profile-c' } });
      const callsBefore = calls.length;
      expect((await other({ action: 'aws', args: { ...describeEvents, stage: 'carol' } })).structuredContent.ok).toBe(
        false
      );
      expect(calls).toHaveLength(callsBefore);
      // The client's roots make the project its own.
      expect(
        (
          await other({
            action: 'aws',
            args: { ...describeEvents, stage: 'carol' },
            getProjectRoots: async () => [directory]
          })
        ).structuredContent.ok
      ).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
      await rm(elsewhere, { recursive: true, force: true });
    }
  });

  // The dev-agent event names the port before the daemon listens: status and logs must not fail or forget the session.
  test('a starting session whose agent does not listen yet stays DEV_STARTING', async () => {
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const closedPort = (probe.address() as AddressInfo).port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    let finish!: () => void;
    const gate = new Promise<void>((resolve) => (finish = resolve));
    const runCli: RunCli = async (input) => {
      await input.onProgress?.({
        type: 'event',
        ts: new Date().toISOString(),
        phase: 'DEV_STARTUP',
        eventType: 'DEV_SESSION',
        status: 'started',
        message: `Starting the dev agent on port ${closedPort}`,
        detail: { kind: 'dev-agent', agentPort: closedPort, tokenFile: 'unused' }
      });
      await gate;
      return { ...(await startedDaemon(input)), ok: false, code: 'CANCELLED', message: 'stopped', data: undefined };
    };
    const handler = createDevToolHandler({ runCli, discoverAgents: async () => [] });
    const started = (await handler({ action: 'start', args: { waitSeconds: 0.05 } })).structuredContent;
    const devSessionId = (started.data?.session as { devSessionId: string }).devSessionId;
    expect((started.data?.session as { agentPort?: number }).agentPort).toBe(closedPort);
    expect(
      (await handler({ action: 'status', args: { devSessionId, waitSeconds: 0.05 } })).structuredContent.code
    ).toBe('DEV_STARTING');
    expect((await handler({ action: 'logs', args: { devSessionId } })).structuredContent).toMatchObject({
      ok: false,
      code: 'DEV_STARTING'
    });
    expect(
      (await handler({ action: 'status', args: { devSessionId, waitSeconds: 0.05 } })).structuredContent.code
    ).toBe('DEV_STARTING');
    finish();
  });

  test('logs with a level and no time read only the current session', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-mcp-dev-logs-'));
    const logFile = join(directory, 'dev.jsonl');
    const entry = (value: Record<string, unknown>) => `${JSON.stringify(value)}\n`;
    const marker = (sessionId: string) =>
      entry({ source: 'dev', level: 'info', msg: 'Dev session started', session: { sessionId } });
    await writeFile(
      logFile,
      marker('earlier') +
        entry({ source: 'api', level: 'error', msg: 'old TypeError' }) +
        marker('current') +
        entry({ source: 'api', level: 'error', msg: 'new TypeError' }) +
        entry({ source: 'api', level: 'info', msg: 'GET / 200' })
    );
    const dev = await daemon({ logFile });
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon });
      const started = (await handler({ action: 'start', args: { agentPort: dev.port } })).structuredContent;
      const devSessionId = (started.data?.session as { devSessionId: string }).devSessionId;
      const messages = async (args: Record<string, unknown>) =>
        (
          (await handler({ action: 'logs', args: { devSessionId, ...args } })).structuredContent.data
            ?.entries as Array<{
            msg: string;
          }>
        ).map(({ msg }) => msg);
      expect(await messages({ level: 'error' })).toEqual(['new TypeError']);
      expect(await messages({ level: 'error', cursor: 0 })).toEqual(['old TypeError', 'new TypeError']);
      expect(await messages({})).toContain('old TypeError');
      await handler({ action: 'stop', args: { devSessionId } });
    } finally {
      await dev.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe('MCP dev stop', () => {
  // r2p dogfood, finding 10: stop answered at once, and a start 3 s later was refused because the stopped session still
  // held the stage on the dev box.
  test('stop answers once the agent has exited, and says so when it has not', async () => {
    const slow = await daemon({ exitAfterStopMs: 400 });
    const stuck = await daemon({ exitAfterStopMs: null });
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon, stopWaitMs: 1500 });
      const start = async (port: number) =>
        (
          (await handler({ action: 'start', args: { agentPort: port } })).structuredContent.data?.session as {
            devSessionId: string;
          }
        ).devSessionId;
      const slowId = await start(slow.port);
      const stuckId = await start(stuck.port);

      const startedAt = Date.now();
      const stopped = (await handler({ action: 'stop', args: { devSessionId: slowId } })).structuredContent;
      expect(stopped).toMatchObject({ ok: true, code: 'OK', message: 'Dev session stopped.' });
      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(350);

      const lingering = (await handler({ action: 'stop', args: { devSessionId: stuckId } })).structuredContent;
      expect(lingering.ok).toBe(true);
      expect(lingering.message).toContain('still stopping after 1.5 s');
    } finally {
      await slow.close();
      await stuck.close();
    }
  });

  test('stop waits for the agent process, which still runs its cleanup after its HTTP server closed', async () => {
    // A process that ends 600 ms from now stands in for the agent; its HTTP stand-in keeps answering.
    const agentProcess = Bun.spawn(['sleep', '0.6']);
    const agent = await daemon({ exitAfterStopMs: null, status: { pid: agentProcess.pid } });
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon, stopWaitMs: 5000 });
      const started = (await handler({ action: 'start', args: { agentPort: agent.port } })).structuredContent;
      const devSessionId = (started.data?.session as { devSessionId: string }).devSessionId;
      const startedAt = Date.now();
      expect((await handler({ action: 'stop', args: { devSessionId } })).structuredContent.message).toBe(
        'Dev session stopped.'
      );
      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(300);
      expect(agentProcess.exitCode).toBe(0);
    } finally {
      agentProcess.kill();
      await agent.close();
    }
  });
});

describe('MCP dev tool arguments', () => {
  test('plan returns a start call that start accepts as it is, with the project directory in args', async () => {
    const project = await mkdtemp(join(tmpdir(), 'stacktape-mcp-dev-plan-'));
    try {
      await writeFile(
        join(project, 'package.json'),
        JSON.stringify({ scripts: { deploy: 'stacktape deploy --stage prod --region eu-west-1' } })
      );
      const planned = (
        await createDevToolHandler()({ action: 'plan', args: { cwd: project, configPath: 'stacktape.config.ts' } })
      ).structuredContent;
      const startCall = (planned.data?.stacktapeDevStart as { arguments: Record<string, unknown> }).arguments;
      expect(startCall).toEqual({
        action: 'start',
        args: {
          stage: 'dev',
          region: 'eu-west-1',
          currentWorkingDirectory: project,
          configPath: 'stacktape.config.ts',
          cwd: project
        }
      });

      const started: Array<{ cwd?: string; args?: Record<string, unknown> }> = [];
      const handler = createDevToolHandler({
        runCli: async (input) => {
          started.push({ cwd: input.cwd, args: input.args });
          return { ...(await startedDaemon(input)), ok: false, code: 'CONFIG_ERROR', data: undefined };
        }
      });
      await handler(startCall as Parameters<typeof handler>[0]);
      expect(started).toEqual([
        {
          cwd: project,
          args: {
            stage: 'dev',
            region: 'eu-west-1',
            currentWorkingDirectory: project,
            configPath: 'stacktape.config.ts'
          }
        }
      ]);
    } finally {
      await rm(project, { recursive: true, force: true });
    }
  });

  // Seventh dogfood (r2ll): plan dropped the requested AWS profile from its start call, so a client running that call
  // started the session with whatever profile its environment named.
  test('plan returns every start setting it was given, except a take-over', async () => {
    const project = await mkdtemp(join(tmpdir(), 'stacktape-mcp-dev-plan-settings-'));
    try {
      const settings = {
        stage: 'r2mm',
        region: 'eu-west-3',
        projectName: 'shelf',
        profile: 'stacktape-e2e',
        awsAccount: 'e2e',
        configPath: 'stacktape.yml',
        noTunnel: true,
        watch: true,
        resources: ['api', 'web'],
        skipResources: 'recs',
        remoteResources: ['mainDatabase'],
        agentPort: 7400
      };
      const planned = (
        await createDevToolHandler()({ action: 'plan', args: { cwd: project, ...settings, takeOver: true } })
      ).structuredContent;
      const startCall = (planned.data?.stacktapeDevStart as { arguments: { args: Record<string, unknown> } }).arguments;
      expect(startCall.args).toEqual({ ...settings, currentWorkingDirectory: project, cwd: project });
    } finally {
      await rm(project, { recursive: true, force: true });
    }
  });

  // Fifth dogfood (r2cc): a wrapper started the MCP server in the CLI's own directory, and plan without cwd scanned it
  // instead of the client's project.
  test('plan and start without cwd use the client root when the server runs outside it', async () => {
    const project = await mkdtemp(join(tmpdir(), 'stacktape-mcp-dev-root-'));
    const elsewhere = await mkdtemp(join(tmpdir(), 'stacktape-mcp-dev-server-'));
    try {
      await writeFile(
        join(project, 'package.json'),
        JSON.stringify({ scripts: { deploy: 'stacktape deploy --stage prod --region eu-west-1' } })
      );
      const started: Array<string | undefined> = [];
      const handler = createDevToolHandler({
        serverDirectory: () => elsewhere,
        runCli: async (input) => {
          started.push(input.cwd);
          return { ...(await startedDaemon(input)), ok: false, code: 'CONFIG_ERROR', data: undefined };
        }
      });
      const getProjectRoots = async () => [project];
      const planned = (await handler({ action: 'plan', args: { configPath: 'stacktape.config.ts' }, getProjectRoots }))
        .structuredContent;
      expect(planned.data?.args).toMatchObject({ cwd: project, region: 'eu-west-1' });
      await handler({ action: 'start', args: { stage: 'dev' }, getProjectRoots });
      expect(started).toEqual([project]);
      // A server inside the client's root keeps its own directory, which may be a package of that project.
      const inside = join(project, 'packages', 'api');
      await mkdir(inside, { recursive: true });
      const insideHandler = createDevToolHandler({ serverDirectory: () => inside });
      const insidePlan = (await insideHandler({ action: 'plan', args: { configPath: 'x.ts' }, getProjectRoots }))
        .structuredContent;
      expect(insidePlan.data?.args).toMatchObject({ cwd: inside });
    } finally {
      await rm(project, { recursive: true, force: true });
      await rm(elsewhere, { recursive: true, force: true });
    }
  });

  test('a destructive reset names the tool argument that confirms it, not a request body field', async () => {
    const dev = await daemon();
    try {
      const handler = createDevToolHandler({
        runCli: startedDaemon,
        // The agent's own answer to a reset without confirm (agent-server.ts), as `devApiRequest` unwraps it.
        requestDevApi: async ({ path }) =>
          path.startsWith('/reset/')
            ? {
                ok: false,
                code: 'DESTRUCTIVE_OPERATION',
                message: 'Resetting deletes all data in the local databases.',
                hint: 'To proceed, set confirm: true in the request body.'
              }
            : { ok: true, code: 'OK' }
      });
      expect((await handler({ action: 'start', args: { agentPort: dev.port } })).structuredContent.ok).toBe(true);
      const reset = (await handler({ action: 'reset_db' })).structuredContent;
      expect(reset.code).toBe('DESTRUCTIVE_OPERATION');
      expect(JSON.stringify(reset)).not.toContain('request body');
      expect(reset.data?.hint).toBe('To proceed, repeat this call with args.confirm=true.');
    } finally {
      await dev.close();
    }
  });

  test('env and aws go to the agent of the session and name what is missing', async () => {
    const dev = await daemon();
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon });
      const started = (await handler({ action: 'start', args: { agentPort: dev.port } })).structuredContent;
      expect(started.ok).toBe(true);

      const env = (await handler({ action: 'env', args: { workload: 'api' } })).structuredContent;
      expect(env).toMatchObject({ ok: true, data: { envVars: { PORT: '3000', TOKEN: '****' } } });
      expect(env.message).toContain('masked');
      const aws = (
        await handler({
          action: 'aws',
          args: { service: 'sqs', command: 'GetQueueAttributes', input: { QueueUrl: 'https://queue' } }
        })
      ).structuredContent;
      expect(aws).toMatchObject({ ok: true, message: 'Called sqs GetQueueAttributes.' });
      expect(dev.state.requests).toEqual([
        { path: '/env/api' },
        {
          path: '/aws/sdk',
          body: { service: 'sqs', command: 'GetQueueAttributes', input: { QueueUrl: 'https://queue' } }
        }
      ]);

      expect((await handler({ action: 'env' })).structuredContent.code).toBe('VALIDATION_ERROR');
      expect((await handler({ action: 'aws', args: { service: 'sqs' } })).structuredContent.code).toBe(
        'VALIDATION_ERROR'
      );
      // The fixture runs no databases.
      expect((await handler({ action: 'query', args: { sql: 'select 1' } })).structuredContent.code).toBe('NOT_FOUND');
      expect(dev.state.requests).toHaveLength(2);
    } finally {
      await dev.close();
    }
  });
});

// Second dogfood (r2l): after a take-over, an agent called rebuild and then reset_db without a devSessionId. The MCP
// server picked the only running session, another worktree's, rebuilt it and emptied its databases, and answered ok.
describe('MCP dev session scope', () => {
  const directories: string[] = [];
  afterAll(async () => {
    for (const directory of directories) await rm(directory, { recursive: true, force: true });
  });
  const projectDirectory = async (name: string) => {
    const directory = await mkdtemp(join(tmpdir(), `stacktape-mcp-dev-${name}-`));
    directories.push(directory);
    return directory;
  };
  const localDatabase = { localResources: [{ name: 'db', type: 'postgres', status: 'running' }] };
  const CHANGES = [
    ['rebuild', { workload: 'api' }],
    ['rebuild_all', {}],
    ['reset_db', { confirm: true }],
    ['seed', {}],
    ['query', { sql: 'delete from notes where id = 1' }],
    ['stop', {}]
  ] as const;

  test('an MCP server in project A cannot rebuild, reset, seed, write to or stop project B without its ID', async () => {
    const projectA = await projectDirectory('a');
    const projectB = await projectDirectory('b');
    const sessionB = `session-b-${randomUUID()}`;
    const b = await daemon({
      status: { sessionId: sessionB, projectDirectory: projectB, stage: 'b', ...localDatabase }
    });
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon, serverDirectory: () => projectA });
      for (const [action, args] of CHANGES) {
        const refused = (await handler({ action, args })).structuredContent;
        expect(refused).toMatchObject({ ok: false, code: 'DEV_SESSION_ID_REQUIRED' });
        expect(refused.data?.activeDevSessions).toEqual([
          { devSessionId: sessionB, projectDirectory: projectB, stage: 'b' }
        ]);
        // Naming the other project's directory is not the explicit choice a change needs.
        const named = (await handler({ action, args: { ...args, cwd: projectB } })).structuredContent;
        expect(named.code).toBe('DEV_SESSION_ID_REQUIRED');
      }
      expect(b.state.changes).toEqual([]);
      // Without a directory, even reading would answer about another project.
      expect((await handler({ action: 'status' })).structuredContent.code).toBe('DEV_SESSION_ID_REQUIRED');

      // Reading another project's session needs its directory; changing it needs its ID.
      const status = (await handler({ action: 'status', args: { cwd: projectB } })).structuredContent;
      expect(status).toMatchObject({ ok: true, data: { session: { devSessionId: sessionB, cwd: projectB } } });
      expect(
        (await handler({ action: 'query', args: { cwd: projectB, sql: 'select count(*) from notes' } }))
          .structuredContent.ok
      ).toBe(true);
      // A statement that looks like a read can still write through a function, so the database enforces the read.
      expect(
        (await handler({ action: 'query', args: { cwd: projectB, sql: "select nextval('notes_id_seq')" } }))
          .structuredContent.code
      ).toBe('DEV_SESSION_ID_REQUIRED');
      expect(
        (await handler({ action: 'query', args: { devSessionId: sessionB, sql: 'delete from notes where id = 1' } }))
          .structuredContent.ok
      ).toBe(true);
      expect(b.state.requests).toEqual([
        { path: '/postgres/db/query', body: { sql: 'select count(*) from notes', readOnly: true } },
        { path: '/postgres/db/query', body: { sql: 'delete from notes where id = 1' } }
      ]);
      expect(
        (await handler({ action: 'rebuild', args: { devSessionId: sessionB, workload: 'api' } })).structuredContent.ok
      ).toBe(true);
      expect(b.state.changes).toEqual(['/postgres/db/query', '/postgres/db/query', '/rebuild/api']);

      // The same session counts as this server's own when the client names project B as one of its roots.
      const withRoots = createDevToolHandler({ runCli: startedDaemon, serverDirectory: () => projectA });
      const rooted = await withRoots({
        action: 'reset_db',
        args: { confirm: true },
        getProjectRoots: async () => [projectB]
      });
      expect(rooted.structuredContent.ok).toBe(true);
      // And when the MCP server itself runs there, or in a folder that contains the project.
      const inB = createDevToolHandler({ runCli: startedDaemon, serverDirectory: () => join(projectB, '..') });
      expect((await inB({ action: 'rebuild', args: { workload: 'web' } })).structuredContent.ok).toBe(true);
      expect(b.state.changes).toEqual([
        '/postgres/db/query',
        '/postgres/db/query',
        '/rebuild/api',
        '/reset/all',
        '/rebuild/web'
      ]);
    } finally {
      await b.close();
    }
  });

  test('a server started in the home directory or / does not own every project below it', async () => {
    // Some clients start MCP servers in the home directory. The path is only reported, never created.
    const projectUnderHome = join(homedir(), `stacktape-mcp-dev-${randomUUID()}`, 'app');
    const b = await daemon({ status: { sessionId: `s-${randomUUID()}`, projectDirectory: projectUnderHome } });
    try {
      for (const serverDirectory of [homedir(), join(homedir(), '..'), '/']) {
        const handler = createDevToolHandler({ runCli: startedDaemon, serverDirectory: () => serverDirectory });
        expect((await handler({ action: 'rebuild_all' })).structuredContent.code).toBe('DEV_SESSION_ID_REQUIRED');
      }
      const inParent = createDevToolHandler({
        runCli: startedDaemon,
        serverDirectory: () => join(projectUnderHome, '..')
      });
      expect((await inParent({ action: 'rebuild_all' })).structuredContent.ok).toBe(true);
    } finally {
      await b.close();
    }
  });

  // Review of #336: the home check compared paths as strings, so a symlinked home or a differently cased Windows path
  // made every project under the home directory count as the server's own.
  test('home, the directories that hold homes and roots never own the projects below them', async () => {
    const root = await projectDirectory('linked-home');
    await mkdir(join(root, 'data', 'home', 'u', 'shop'), { recursive: true });
    await symlink(join(root, 'data', 'home'), join(root, 'home'), 'junction');
    const linux = { platform: 'linux' as const, home: join(root, 'home', 'u') };
    const cases: Array<[string, string, { platform: NodeJS.Platform; home: string }, boolean]> = [
      // HOME is a link; the server reports the real path.
      [join(root, 'data', 'home', 'u', 'shop'), join(root, 'data', 'home', 'u'), linux, false],
      [join(root, 'home', 'u', 'shop'), join(root, 'data', 'home'), linux, false],
      [join(root, 'data', 'home', 'u', 'shop'), join(root, 'home', 'u', 'shop'), linux, true],
      [join(root, 'data', 'home', 'u', 'shop', 'api'), join(root, 'home', 'u', 'shop'), linux, true],
      [join(root, 'data', 'home', 'u'), join(root, 'data', 'home', 'u'), linux, true],
      ['/srv/app', '/', linux, false],
      // A VS Code root on Windows arrives as c:\Users\u; os.homedir() says C:\Users\u.
      ['C:\\Users\\u\\shop', 'c:\\Users\\u', { platform: 'win32', home: 'C:\\Users\\u' }, false],
      ['C:\\Users\\u\\shop', 'c:\\users', { platform: 'win32', home: 'C:\\Users\\u' }, false],
      ['D:\\shop', 'D:\\', { platform: 'win32', home: 'C:\\Users\\u' }, false],
      ['c:\\users\\U\\work\\shop', 'C:\\Users\\u\\work', { platform: 'win32', home: 'C:\\Users\\u' }, true],
      ['/Users/u/shop', '/users/U', { platform: 'darwin', home: '/Users/u' }, false],
      ['/Users/u/Work/shop', '/Users', { platform: 'darwin', home: '/Users/u' }, false],
      ['/Users/u/Work/shop', '/users/u/work', { platform: 'darwin', home: '/Users/u' }, true]
    ];
    for (const [directory, scope, platform, expected] of cases) {
      expect([directory, scope, isProjectDirectoryOf(directory, scope, platform)]).toEqual([
        directory,
        scope,
        expected
      ]);
    }
  });

  test('an agent that does not answer blocks no call longer than the status timeout and is not guessed past', async () => {
    const project = await projectDirectory('hung');
    const hung = await daemon({ hangs: true });
    const healthy = await daemon();
    try {
      const handler = createDevToolHandler({
        runCli: startedDaemon,
        serverDirectory: () => project,
        statusCheckTimeoutMs: 200
      });
      // The hung agent is registered as started; a start never asks it for anything.
      await handler({ action: 'start', args: { agentPort: hung.port, cwd: project } });
      const startedAt = Date.now();
      const output = (await handler({ action: 'rebuild_all' })).structuredContent;
      expect(output).toMatchObject({ ok: false, code: 'DEV_AGENT_NOT_RESPONDING' });
      expect(Date.now() - startedAt).toBeLessThan(2000);
      // It stays known: with a second session, a call without an ID is ambiguous instead of picking the one that answers.
      await handler({ action: 'start', args: { agentPort: healthy.port, cwd: project } });
      expect((await handler({ action: 'rebuild_all' })).structuredContent.code).toBe('AMBIGUOUS_DEV_SESSION');
      expect(healthy.state.changes).toEqual([]);
    } finally {
      await hung.close();
      await healthy.close();
    }
  });

  test('after a take-over the replaced session keeps answering DEV_STAGE_TAKEN_OVER and never reaches the new holder', async () => {
    const project = await projectDirectory('taken');
    const replaced = await daemon({ status: localDatabase });
    // The session that took the stage over runs in the same directory, so it would count as this server's own.
    const holderId = `holder-${randomUUID()}`;
    const holder = await daemon({ status: { sessionId: holderId, projectDirectory: project, ...localDatabase } });
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon, serverDirectory: () => project });
      const started = (await handler({ action: 'start', args: { agentPort: replaced.port, cwd: project } }))
        .structuredContent;
      const replacedId = (started.data?.session as { devSessionId: string }).devSessionId;
      await writeFile(
        localStatePaths.devAgentStopReasonFile({ port: replaced.port }),
        JSON.stringify({
          code: 'DEV_STAGE_TAKEN_OVER',
          // What `endSessionForLostStage` records.
          message:
            'Bob (laptop, ~/shop-wt2) took over dev mode for shop-dev, so deployed functions now reach the databases there. This session stopped so that it cannot redeploy functions over theirs. To move the stage back, run `stacktape dev` again with --take-over.',
          at: new Date().toISOString()
        })
      );
      await replaced.close();

      for (const [action, args] of [...CHANGES, ['status', {}]] as const) {
        const output = (await handler({ action, args })).structuredContent;
        expect(output).toMatchObject({ ok: false, code: 'DEV_STAGE_TAKEN_OVER' });
        expect(output.message).toContain('Bob (laptop, ~/shop-wt2) took over dev mode for shop-dev on purpose');
        // Two agents that each took the stage back would move it between them forever, so only the user decides.
        expect(output.nextActions?.join(' ')).toContain('Do not take it back unless the user asks for it');
        expect(JSON.stringify(output)).not.toMatch(/takeOver|--take-over/);
      }
      expect((await handler({ action: 'status', args: { devSessionId: replacedId } })).structuredContent.code).toBe(
        'DEV_STAGE_TAKEN_OVER'
      );
      expect(holder.state.changes).toEqual([]);

      // Its ID still reaches the new holder on purpose, and a new start ends the take-over answer.
      expect(
        (await handler({ action: 'rebuild', args: { devSessionId: holderId, workload: 'api' } })).structuredContent.ok
      ).toBe(true);
      const again = await daemon();
      try {
        expect(
          (await handler({ action: 'start', args: { agentPort: again.port, cwd: project } })).structuredContent.ok
        ).toBe(true);
        expect((await handler({ action: 'status' })).structuredContent.code).toBe('AMBIGUOUS_DEV_SESSION');
      } finally {
        await again.close();
      }
    } finally {
      await holder.close();
    }
  });

  // r2p dogfood, finding 9: the server took the stage back with a new start, but its first call afterwards found the
  // replaced session ended and kept answering DEV_STAGE_TAKEN_OVER for it.
  test('a session this server starts after a take-over answers instead of the replaced one; args.stage picks among a directory', async () => {
    const project = await projectDirectory('taken-back');
    const replaced = await daemon({ status: localDatabase });
    const restarted = await daemon({ status: localDatabase });
    const other = await daemon({ status: localDatabase });
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon, serverDirectory: () => project });
      expect(
        (await handler({ action: 'start', args: { agentPort: replaced.port, cwd: project, stage: 'r2p' } }))
          .structuredContent.ok
      ).toBe(true);
      await writeFile(
        localStatePaths.devAgentStopReasonFile({ port: replaced.port }),
        JSON.stringify({
          code: 'DEV_STAGE_TAKEN_OVER',
          message:
            'Bob (laptop, ~/shop-wt2) took over dev mode for shop-r2p, so deployed functions now reach the databases there. This session stopped so that it cannot redeploy functions over theirs.',
          at: new Date().toISOString()
        })
      );
      await replaced.close();
      // No call notices the take-over before the agent takes the stage back.
      await new Promise((resolve) => setTimeout(resolve, 5));
      const started = (
        await handler({
          action: 'start',
          args: { agentPort: restarted.port, cwd: project, stage: 'r2p', takeOver: true }
        })
      ).structuredContent;
      const restartedId = (started.data?.session as { devSessionId: string }).devSessionId;

      for (const action of ['status', 'rebuild'] as const) {
        const output = (await handler({ action, args: { workload: 'api' } })).structuredContent;
        expect(output).toMatchObject({ ok: true, data: { session: { devSessionId: restartedId } } });
      }
      expect(restarted.state.rebuilt).toEqual(['api']);

      // A second stage in the same directory: calls without an ID are ambiguous, args.stage chooses.
      await handler({ action: 'start', args: { agentPort: other.port, cwd: project, stage: 'r2p2' } });
      expect((await handler({ action: 'status' })).structuredContent.code).toBe('AMBIGUOUS_DEV_SESSION');
      const byStage = (await handler({ action: 'rebuild', args: { workload: 'web', stage: 'r2p2' } }))
        .structuredContent;
      expect(byStage).toMatchObject({ ok: true, data: { session: { agentPort: other.port, stage: 'r2p2' } } });
      expect(other.state.rebuilt).toEqual(['web']);
      expect(restarted.state.rebuilt).toEqual(['api']);
    } finally {
      await replaced.close();
      await restarted.close();
      await other.close();
    }
  });

  // #343 review: a session of another stage started in the directory cleared the take-over answer of the replaced one.
  test('a session of another stage started after a take-over leaves the replaced stage reported', async () => {
    const project = await projectDirectory('taken-over-other-stage');
    const replaced = await daemon({ status: localDatabase });
    const other = await daemon({ status: localDatabase });
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon, serverDirectory: () => project });
      await handler({ action: 'start', args: { agentPort: replaced.port, cwd: project, stage: 'r2p' } });
      await writeFile(
        localStatePaths.devAgentStopReasonFile({ port: replaced.port }),
        JSON.stringify({
          code: 'DEV_STAGE_TAKEN_OVER',
          message:
            'Bob (laptop, ~/shop-wt2) took over dev mode for shop-r2p, so deployed functions now reach the databases there. This session stopped so that it cannot redeploy functions over theirs.',
          at: new Date().toISOString()
        })
      );
      await replaced.close();
      await new Promise((resolve) => setTimeout(resolve, 5));
      await handler({ action: 'start', args: { agentPort: other.port, cwd: project, stage: 'r2p2' } });

      for (const action of ['status', 'rebuild'] as const) {
        const output = (await handler({ action, args: { workload: 'api' } })).structuredContent;
        expect(output).toMatchObject({ ok: false, code: 'DEV_STAGE_TAKEN_OVER' });
      }
      expect(other.state.rebuilt).toEqual([]);
      const byStage = (await handler({ action: 'rebuild', args: { workload: 'web', stage: 'r2p2' } }))
        .structuredContent;
      expect(byStage).toMatchObject({ ok: true, data: { session: { agentPort: other.port, stage: 'r2p2' } } });
      expect(other.state.rebuilt).toEqual(['web']);
    } finally {
      await replaced.close();
      await other.close();
    }
  });

  test('sessions stopped elsewhere are dropped before an inferred session is chosen', async () => {
    const project = await projectDirectory('stopped');
    const kept = await daemon();
    const stoppedByCli = await daemon();
    const tokenGone = await daemon();
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon, serverDirectory: () => project });
      for (const { port } of [kept, stoppedByCli, tokenGone]) {
        expect((await handler({ action: 'start', args: { agentPort: port, cwd: project } })).structuredContent.ok).toBe(
          true
        );
      }
      expect((await handler({ action: 'status', args: { cwd: project } })).structuredContent.code).toBe(
        'AMBIGUOUS_DEV_SESSION'
      );
      // `stacktape dev stop` from a terminal: the agent exits. Another stop removes the agent's token file.
      await stoppedByCli.close();
      await rm(localStatePaths.devAgentTokenFile({ port: tokenGone.port }));

      const status = (await handler({ action: 'status', args: { cwd: project } })).structuredContent;
      expect(status).toMatchObject({ ok: true, data: { session: { agentPort: kept.port } } });
      expect((await handler({ action: 'rebuild', args: { workload: 'api' } })).structuredContent.ok).toBe(true);
      expect(kept.state.rebuilt).toEqual(['api']);
      expect(tokenGone.state.changes).toEqual([]);
    } finally {
      await kept.close();
      await stoppedByCli.close();
      await tokenGone.close();
    }
  });

  test('a port that now serves another session does not count as the session that ended there', async () => {
    // The agent adopts the MCP server's session ID; one that reports another ID started later on the same port.
    const other = await daemon({ status: { sessionId: 'started-later-on-this-port' } });
    try {
      const handler = createDevToolHandler({ runCli: startedDaemon, discoverAgents: async () => [] });
      const started = (await handler({ action: 'start', args: { agentPort: other.port } })).structuredContent;
      const devSessionId = (started.data?.session as { devSessionId: string }).devSessionId;
      const output = (await handler({ action: 'rebuild_all', args: { devSessionId } })).structuredContent;
      expect(output).toMatchObject({ ok: false, code: 'NOT_FOUND' });
      expect(output.message).toContain('now serves another dev session');
      expect(other.state.changes).toEqual([]);
    } finally {
      await other.close();
    }
  });
});

describe('MCP dev start results', () => {
  test('takeOver reaches the CLI, and a refused start says how to take the stage over', async () => {
    const received: Array<Record<string, unknown> | undefined> = [];
    const handler = createDevToolHandler({
      runCli: async (input) => {
        received.push(input.args);
        return {
          ...(await startedDaemon(input)),
          ok: false,
          code: 'DEV_STAGE_RUNNING_ELSEWHERE',
          message: 'Dev mode for shop-dev already runs in another session: Bob (laptop, ~/shop-wt2).',
          data: undefined,
          rawTail: 'the CLI output',
          cliReportedResult: true
        };
      },
      discoverAgents: async () => []
    });
    const refused = (await handler({ action: 'start', args: { stage: 'dev' } })).structuredContent;
    expect(refused).toMatchObject({ ok: false, code: 'DEV_STAGE_RUNNING_ELSEWHERE' });
    // The message explains the refusal; the CLI's output stays in a file instead of the agent's context (r2gg).
    expect(refused.rawTail).toBeUndefined();
    const outputLog = (refused.data as { outputLog?: string }).outputLog;
    expect(await readFile(outputLog!, 'utf8')).toBe('the CLI output\n');
    await rm(outputLog!, { force: true });
    expect(refused.nextActions?.join(' ')).toContain('args.takeOver=true');
    await handler({ action: 'start', args: { stage: 'dev', takeOver: true } });
    await handler({ action: 'start', args: { stage: 'dev', take_over: true } });
    expect(received).toEqual([{ stage: 'dev' }, { stage: 'dev', takeOver: true }, { stage: 'dev', takeOver: true }]);
  });

  // r2p's false green: a warm start with a Python syntax error reported ok, and the assistant tested the old code.
  test('a start whose session runs with a failed function is not a success, and the session takes the rebuild', async () => {
    const dev = await daemon();
    try {
      const failedWorkloads = [{ name: 'api', error: 'api/main.py, line 103: SyntaxError: invalid syntax' }];
      const handler = createDevToolHandler({
        // What `dev --agent` returns for such a session (`DEV_STARTED_WITH_FAILURES` in commands/dev/index.ts).
        runCli: async (input) => {
          const started = await startedDaemon(input);
          return {
            ...started,
            ok: false,
            code: 'DEV_STARTED_WITH_FAILURES',
            message: `Dev mode runs, but functions in it were not deployed and run their previous code:\n  api: ${failedWorkloads[0]!.error}`,
            data: {
              result: { ...(started.data!.result as Record<string, unknown>), ready: false, failedWorkloads },
              ready: false,
              failedWorkloads,
              hints: ['Fix the errors, then rebuild.']
            }
          };
        }
      });
      const started = (await handler({ action: 'start', args: { agentPort: dev.port, stage: 'dev' } }))
        .structuredContent;
      expect(started).toMatchObject({
        ok: false,
        code: 'DEV_STARTED_WITH_FAILURES',
        data: { ready: false, failedWorkloads }
      });
      expect(started.message).toContain('api/main.py, line 103');
      const session = started.data?.session as { devSessionId: string; agentPort: number };
      expect(session.agentPort).toBe(dev.port);
      expect(started.nextActions?.join(' ')).toContain(`action=rebuild, args.devSessionId=${session.devSessionId}`);
      // Not a failed start: the next call reaches the running session instead of repeating the start's error.
      expect(
        (await handler({ action: 'rebuild', args: { devSessionId: session.devSessionId, workload: 'api' } }))
          .structuredContent.ok
      ).toBe(true);
      // The session is selected by its stage as well, like a session that started without failures.
      expect((await handler({ action: 'rebuild', args: { stage: 'dev', workload: 'api' } })).structuredContent.ok).toBe(
        true
      );
      expect(dev.state.rebuilt).toEqual(['api', 'api']);
      expect(
        (await handler({ action: 'stop', args: { devSessionId: session.devSessionId } })).structuredContent.ok
      ).toBe(true);
    } finally {
      await dev.close();
    }
  });

  test('a successful start leaves out the CLI output meant for people', async () => {
    const dev = await daemon();
    try {
      const handler = createDevToolHandler({
        runCli: async (input) => ({
          ...(await startedDaemon(input)),
          rawTail: 'IMPORTANT: When done, stop the dev agent with:\n  stacktape dev stop --agent-port 7331'
        })
      });
      const started = (await handler({ action: 'start', args: { agentPort: dev.port } })).structuredContent;
      expect(started.ok).toBe(true);
      expect(started.rawTail).toBeUndefined();
      expect(JSON.stringify(started)).not.toContain('dev stop');
    } finally {
      await dev.close();
    }
  });
});

describe('which queries write', () => {
  const cases: Array<[Record<string, unknown>, boolean]> = [
    [{ sql: 'select * from notes' }, false],
    [{ sql: '  /* list */ SELECT count(*) FROM notes' }, false],
    [{ sql: '-- comment\nshow tables' }, false],
    [{ sql: 'explain select 1' }, false],
    [{ sql: 'describe notes' }, false],
    [{ sql: 'explain analyze delete from notes' }, true],
    [{ sql: 'select * into backup from notes' }, true],
    [{ sql: 'with gone as (delete from notes returning *) select * from gone' }, true],
    [{ sql: 'insert into notes (text) values (1)' }, true],
    [{ sql: 'update notes set seen = true where id = 1' }, true],
    [{ sql: 'truncate notes' }, true],
    [{ command: 'GET session:1' }, false],
    [{ command: 'hgetall user:1' }, false],
    [{ command: 'SET session:1 alive' }, true],
    [{ command: 'FLUSHALL' }, true],
    [{ command: 'EVAL "return 1" 0' }, true],
    [{ sql: 'select 1; update notes set seen = true' }, true],
    [{ sql: 'EXPLAIN (ANALYZE) DELETE FROM notes' }, true],
    [{ sql: "select nextval('notes_id_seq')" }, true],
    [{ sql: 'select 1', command: 'SET session:1 alive' }, true],
    [{ sql: 'select 1;' }, false],
    [{ pk: { pk: 'user#1' } }, false],
    [{}, false]
  ];
  for (const [args, writes] of cases) {
    test(`${JSON.stringify(args)} ${writes ? 'writes' : 'reads'}`, () => {
      expect(isWriteQuery(args)).toBe(writes);
    });
  }
});
