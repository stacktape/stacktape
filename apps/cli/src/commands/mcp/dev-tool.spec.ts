import { describe, expect, test } from 'bun:test';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createDevToolHandler } from './dev-tool';

// Dev startup itself belongs to S15. These local daemons isolate MCP's handle routing and HTTP envelope handling.
const daemon = async () => {
  const state = { stopped: false, rebuilt: [] as string[] };
  const server = createServer((request, response) => {
    const path = new URL(request.url!, 'http://127.0.0.1').pathname;
    let data: Record<string, unknown> = {};
    if (path === '/health') data = { healthy: !state.stopped };
    else if (path === '/status') data = { stopped: state.stopped, rebuilt: state.rebuilt };
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
  return {
    state,
    port: (server.address() as AddressInfo).port,
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

describe('MCP dev session routing', () => {
  test('rebuilds and stops only the daemon selected by its live session handle', async () => {
    const first = await daemon();
    let second: Awaited<ReturnType<typeof daemon>> | undefined;
    try {
      second = await daemon();
      const handler = createDevToolHandler({
        runCli: async ({ args, cwd }) => ({
          ok: true,
          code: 'OK',
          message: 'Fixture daemon started.',
          data: { agentPort: args?.agentPort },
          events: [],
          logEvents: [],
          outputEvents: [],
          resolvedContext: { cwd: cwd || process.cwd() }
        })
      });
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
      expect((await handler({ action: 'stop', args: { devSessionId: firstId } })).structuredContent.ok).toBe(true);
      expect(first.state.stopped).toBe(true);
      expect(second.state.stopped).toBe(false);
      expect((await handler({ action: 'stop', args: { devSessionId: firstId } })).structuredContent.code).toBe(
        'NOT_FOUND'
      );
      expect((await handler({ action: 'status' })).structuredContent.data?.status).toMatchObject({
        stopped: false,
        rebuilt: []
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
});
