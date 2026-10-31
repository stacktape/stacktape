import type { AddressInfo } from 'node:net';
import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import {
  NEW_STAGE_SETTLE_MS,
  WEBSOCKET_HANDSHAKE_TIMEOUT_MS,
  probeWebSocketHandshake,
  waitForApiStage,
  type HandshakeResult
} from './api-stage-readiness';

// r2bc Shop: dev mode reported ready seconds after CloudFormation created the WebSocket stage, and the browser's first
// handshake got `403 {"message":"Forbidden"}`. A fresh stage answered handshakes like this server for about half a
// minute (r2bg probes): API Gateway's 403 alternating with 101.

/** Answers each handshake with the next of `answers` (`101`, `403` with API Gateway's body, or another status). */
const answers: number[] = [];
let handshakes = 0;
let server: Server;
let url: string;
beforeAll(async () => {
  server = createServer((_request, response) => response.writeHead(426).end());
  server.on('upgrade', (_request, socket) => {
    handshakes++;
    const status = answers.shift() ?? 101;
    if (status === 101) {
      socket.end('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
      return;
    }
    const body = status === 403 ? '{"message":"Forbidden"}' : '{"message":"Unauthorized"}';
    socket.end(
      `HTTP/1.1 ${status} X\r\nContent-Type: application/json\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n${body}`
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/default`;
});
afterAll(() => server.close());

/** A clock that only `sleep` advances, so a test spends no real time waiting. */
const fakeClock = (start: number) => {
  let time = start;
  const sleeps: number[] = [];
  return {
    now: () => time,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      time += ms;
    },
    sleeps
  };
};

test('a handshake classifies API Gateway refusals apart from answers of the API itself', async () => {
  answers.push(101, 403, 401);
  expect(await probeWebSocketHandshake(url)).toBe('accepted');
  expect(await probeWebSocketHandshake(url)).toBe('not-deployed');
  // An authorizer that misses its identity source answers 401: the stage serves.
  expect(await probeWebSocketHandshake(url)).toBe('accepted');
  const closed = createServer();
  await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
  const closedPort = (closed.address() as AddressInfo).port;
  await new Promise((resolve) => closed.close(resolve));
  expect(await probeWebSocketHandshake(`ws://127.0.0.1:${closedPort}/default`)).toBe('unreachable');
});

test('a session waits for a new WebSocket stage to settle and accept several handshakes in a row', async () => {
  const stageCreatedAt = 1_000_000;
  const clock = fakeClock(stageCreatedAt + 10_000);
  // What a ready session's first connection got before this wait (r2bc): API Gateway's refusal.
  answers.push(403);
  expect(await probeWebSocketHandshake(url)).toBe('not-deployed');

  answers.push(403, 101, 101, 403, 101, 101, 101);
  handshakes = 0;
  const readiness = await waitForApiStage({
    kind: 'websocket',
    name: 'websocketApi',
    url,
    stageUpdatedAt: stageCreatedAt,
    now: clock.now,
    sleep: clock.sleep
  });
  expect(readiness).toEqual({ ready: true, waitedMs: NEW_STAGE_SETTLE_MS - 10_000 + 6 * 1000 });
  expect(handshakes).toBe(7);
  expect(clock.sleeps[0]).toBe(NEW_STAGE_SETTLE_MS - 10_000);
});

test('an older WebSocket stage needs one accepted handshake and no wait', async () => {
  const clock = fakeClock(5_000_000);
  handshakes = 0;
  const readiness = await waitForApiStage({
    kind: 'websocket',
    name: 'websocketApi',
    url,
    stageUpdatedAt: 5_000_000 - NEW_STAGE_SETTLE_MS - 1,
    now: clock.now,
    sleep: clock.sleep
  });
  expect(readiness).toEqual({ ready: true, waitedMs: 0 });
  expect(handshakes).toBe(1);
  expect(clock.sleeps).toEqual([]);
});

test('an HTTP API and an IAM-authorized WebSocket stage only wait for a new stage to settle, without requests', async () => {
  for (const options of [{ kind: 'http' as const }, { kind: 'websocket' as const, handshake: false }]) {
    const clock = fakeClock(2_000_000 + 5_000);
    const probes: string[] = [];
    const readiness = await waitForApiStage({
      ...options,
      name: 'api',
      url,
      stageUpdatedAt: 2_000_000,
      now: clock.now,
      sleep: clock.sleep,
      probe: async (target) => {
        probes.push(target);
        return 'accepted';
      }
    });
    expect(readiness).toEqual({ ready: true, waitedMs: NEW_STAGE_SETTLE_MS - 5_000 });
    expect(probes).toEqual([]);
  }
});

test('a stage that keeps refusing handshakes ends the wait with a note instead of blocking the session', async () => {
  const clock = fakeClock(3_000_000);
  let probes = 0;
  const readiness = await waitForApiStage({
    kind: 'websocket',
    name: 'websocketApi',
    url: 'wss://abc.execute-api.eu-west-3.amazonaws.com/default',
    stageUpdatedAt: 3_000_000 - NEW_STAGE_SETTLE_MS * 2,
    now: clock.now,
    sleep: clock.sleep,
    probe: async (): Promise<HandshakeResult> => {
      probes++;
      return 'not-deployed';
    }
  });
  expect(readiness.ready).toBe(false);
  expect(readiness.waitedMs).toBe(WEBSOCKET_HANDSHAKE_TIMEOUT_MS);
  expect(probes).toBe(WEBSOCKET_HANDSHAKE_TIMEOUT_MS / 1000 + 1);
  expect(readiness.note).toContain('WebSocket API websocketApi still answers handshakes with HTTP 403 Forbidden');
});
