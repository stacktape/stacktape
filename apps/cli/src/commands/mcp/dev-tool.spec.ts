import { afterAll, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { appendFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDevToolHandler } from './dev-tool';

// Dev startup itself belongs to S15. These local daemons isolate MCP's handle routing and HTTP envelope handling.
// Each one, like the real agent, answers only requests that carry the session token from its token file.
const tokenDirectory = mkdtempSync(join(tmpdir(), 'stacktape-mcp-dev-tokens-'));
const daemon = async ({ logFile }: { logFile?: string } = {}) => {
  const state = { stopped: false, rebuilt: [] as string[] };
  const token = randomUUID();
  const server = createServer((request, response) => {
    if (request.headers.authorization !== `Bearer ${token}`) {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: false, code: 'UNAUTHORIZED', message: 'missing token' }));
      return;
    }
    const path = new URL(request.url!, 'http://127.0.0.1').pathname;
    let data: Record<string, unknown> = {};
    if (path === '/health') data = { healthy: !state.stopped };
    else if (path === '/status') data = { stopped: state.stopped, rebuilt: state.rebuilt };
    else if (path === '/logs' && logFile) data = { logFile };
    else if (request.method === 'POST' && path === '/stop') state.stopped = true;
    else if (request.method === 'POST' && path.startsWith('/rebuild/'))
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
  const tokenFile = join(tokenDirectory, `${port}.token`);
  await writeFile(tokenFile, token);
  daemonTokenFiles.set(port, tokenFile);
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

const daemonTokenFiles = new Map<number, string>();

// What `dev --agent` returns: the agent's port and the path of its token file, never the token.
const startedDaemon: NonNullable<NonNullable<Parameters<typeof createDevToolHandler>[0]>['runCli']> = async ({
  args,
  cwd
}) => ({
  ok: true,
  code: 'OK',
  message: 'Fixture daemon started.',
  data: { agentPort: args?.agentPort, tokenFile: daemonTokenFiles.get(Number(args?.agentPort)) },
  events: [],
  logEvents: [],
  outputEvents: [],
  resolvedContext: { cwd: cwd || process.cwd() }
});

afterAll(() => rm(tokenDirectory, { recursive: true, force: true }));

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
      expect(first.state).toEqual({ stopped: false, rebuilt: [] });
      expect(second.state).toEqual({ stopped: false, rebuilt: [] });
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
      for (const action of ['rebuild', 'rebuild_all', 'stop'] as const) {
        expect((await handler({ action })).structuredContent.code).toBe('DEV_SESSION_ID_REQUIRED');
      }
      expect((await handler({ action: 'stop', args: { devSessionId: secondId } })).structuredContent.ok).toBe(true);
      expect(second.state.stopped).toBe(true);
      expect((await handler({ action: 'status' })).structuredContent.code).toBe('NOT_FOUND');
    } finally {
      await second?.close();
      await first.close();
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
});
