import { afterAll, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { appendFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localStatePaths } from 'src/config/local-state-paths';
import { createDevToolHandler } from './dev-tool';

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

const daemon = async ({ logFile, status = {} }: { logFile?: string; status?: Record<string, unknown> } = {}) => {
  const state = { stopped: false, rebuilt: [] as string[], requests: [] as Array<{ path: string; body?: unknown }> };
  const token = randomUUID();
  const server = createServer((request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'missing token' }));
      return;
    }
    const path = new URL(request.url!, 'http://127.0.0.1').pathname;
    let data: Record<string, unknown> = {};
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
    else if (request.method === 'POST' && path === '/stop') state.stopped = true;
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
    } else if (request.method === 'POST' && path.startsWith('/rebuild/'))
      state.rebuilt.push(decodeURIComponent(path.slice('/rebuild/'.length)));
    else {
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
