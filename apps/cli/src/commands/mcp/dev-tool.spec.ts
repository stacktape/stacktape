import { describe, expect, test } from 'bun:test';
import { createDevToolHandler } from './dev-tool';
import type { RunStacktapeResult } from './cli-jsonl-runner';

type Envelope = {
  ok: boolean;
  code: string;
  data?: Record<string, unknown>;
};

const readEnvelope = (result: { structuredContent?: unknown }): Envelope => result.structuredContent as Envelope;

const successfulStart = ({ cwd, port }: { cwd?: string; port: number }): RunStacktapeResult => ({
  ok: true,
  code: 'OK',
  message: 'Dev mode started.',
  data: { agentPort: port },
  events: [],
  logEvents: [],
  outputEvents: [],
  resolvedContext: { cwd: cwd || process.cwd() }
});

describe('MCP dev session routing', () => {
  test('uses explicit opaque handles for mutating operations and isolates concurrent sessions', async () => {
    const apiCalls: Array<{ port: number; method: string; path: string; body?: Record<string, unknown> }> = [];
    let nextId = 0;
    const handler = createDevToolHandler({
      createId: () => `session-${++nextId}`,
      now: () => new Date('2026-08-09T10:00:00.000Z'),
      runCli: async ({ args, cwd }) => successfulStart({ cwd, port: Number(args?.agentPort) }),
      requestDevApi: async (request) => {
        apiCalls.push(request);
        return { ok: true };
      }
    });

    const first = readEnvelope(
      await handler({ action: 'start', args: { cwd: 'C:\\projects\\first', agentPort: 7101 } })
    );
    const second = readEnvelope(
      await handler({ action: 'start', args: { cwd: 'C:\\projects\\second', agentPort: 7102 } })
    );
    expect(first.data?.session).toMatchObject({ devSessionId: 'session-1', agentPort: 7101 });
    expect(second.data?.session).toMatchObject({ devSessionId: 'session-2', agentPort: 7102 });

    expect(readEnvelope(await handler({ action: 'stop' }))).toMatchObject({
      ok: false,
      code: 'AMBIGUOUS_DEV_SESSION'
    });
    expect(readEnvelope(await handler({ action: 'rebuild_all', args: { devSessionId: 'unknown' } }))).toMatchObject({
      ok: false,
      code: 'NOT_FOUND'
    });
    expect(apiCalls).toEqual([]);

    expect(readEnvelope(await handler({ action: 'stop', args: { devSessionId: 'session-1' } }))).toMatchObject({
      ok: true,
      code: 'OK'
    });
    expect(apiCalls).toEqual([
      { port: 7101, method: 'GET', path: '/health' },
      { port: 7101, method: 'POST', path: '/stop', body: {} }
    ]);

    expect(readEnvelope(await handler({ action: 'status' }))).toMatchObject({ ok: true, code: 'OK' });
    expect(apiCalls.slice(-2)).toEqual([
      { port: 7102, method: 'GET', path: '/health' },
      { port: 7102, method: 'GET', path: '/status?verbose=true' }
    ]);

    const callsBeforeReplay = apiCalls.length;
    expect(readEnvelope(await handler({ action: 'stop', args: { devSessionId: 'session-1' } }))).toMatchObject({
      ok: false,
      code: 'NOT_FOUND'
    });
    expect(apiCalls).toHaveLength(callsBeforeReplay);
  });

  test('requires a handle for rebuild and stop even when one session is active', async () => {
    let apiCallCount = 0;
    const handler = createDevToolHandler({
      createId: () => 'only-session',
      runCli: async ({ args, cwd }) => successfulStart({ cwd, port: Number(args?.agentPort) }),
      requestDevApi: async () => {
        apiCallCount += 1;
        return { ok: true };
      }
    });
    await handler({ action: 'start', args: { agentPort: 7201 } });

    for (const action of ['rebuild', 'rebuild_all', 'stop'] as const) {
      expect(
        readEnvelope(await handler({ action, args: action === 'rebuild' ? { workload: 'api' } : {} }))
      ).toMatchObject({
        ok: false,
        code: 'DEV_SESSION_ID_REQUIRED'
      });
    }
    expect(apiCallCount).toBe(0);
  });
});
