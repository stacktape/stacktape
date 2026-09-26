import type { ExternalServiceFixture } from './external-service-fixture';
import { afterEach, describe, expect, test } from 'bun:test';
import { connect, createServer } from 'node:net';
import { ListBucketsCommand, S3Client } from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { INERT_AWS_CREDENTIALS } from './cli-environment';
import { FIXTURE_ACCOUNT_ID, startExternalServiceFixture } from './external-service-fixture';

const credentials = {
  accessKeyId: INERT_AWS_CREDENTIALS.AWS_ACCESS_KEY_ID,
  secretAccessKey: INERT_AWS_CREDENTIALS.AWS_SECRET_ACCESS_KEY
};

const started: ExternalServiceFixture[] = [];
const start = async (options: Parameters<typeof startExternalServiceFixture>[0] = {}) => {
  const fixture = await startExternalServiceFixture(options);
  started.push(fixture);
  return fixture;
};

afterEach(async () => {
  await Promise.all(started.splice(0).map((fixture) => fixture.close()));
});

/** Sends raw bytes to the proxy and resolves with everything it answered once it closes the connection. */
const talkToProxy = (proxyUrl: string, request: string, { waitForClose = true } = {}) =>
  new Promise<string>((resolveAnswer, reject) => {
    const { port } = new URL(proxyUrl);
    let answer = '';
    const socket = connect(Number(port), '127.0.0.1', () => socket.write(request));
    socket.setEncoding('latin1');
    socket.on('data', (chunk: string) => {
      answer += chunk;
      if (!waitForClose) {
        socket.destroy();
        resolveAnswer(answer);
      }
    });
    socket.on('close', () => resolveAnswer(answer));
    socket.on('error', reject);
  });

describe('external-service fixture', () => {
  test('answers STS GetCallerIdentity from the real AWS SDK with inert credentials', async () => {
    const fixture = await start();
    const client = new STSClient({ endpoint: fixture.serviceUrl, region: 'eu-west-1', credentials });
    const identity = await client.send(new GetCallerIdentityCommand({}));
    expect(identity.Account).toBe(FIXTURE_ACCOUNT_ID);
    const requests = fixture.takeRequests();
    expect(requests).toMatchObject([{ kind: 'aws', target: 'sts:GetCallerIdentity', status: 200, allowed: true }]);
    expect(JSON.stringify(requests)).not.toContain(credentials.accessKeyId);
  });

  test('refuses every other AWS operation with AccessDenied', async () => {
    const fixture = await start();
    const client = new S3Client({
      endpoint: fixture.serviceUrl,
      region: 'eu-west-1',
      credentials,
      forcePathStyle: true
    });
    const error = await client.send(new ListBucketsCommand({})).catch((caught: Error) => caught);
    expect((error as Error).name).toBe('AccessDenied');
    expect(fixture.takeRequests()).toMatchObject([
      { kind: 'aws', target: 's3:GET (REST)', status: 403, allowed: false }
    ]);
  });

  test('accepts telemetry batches and refuses unknown requests', async () => {
    const fixture = await start();
    expect((await fetch(`${fixture.serviceUrl}/batch/`, { method: 'POST', body: '{"batch":[]}' })).status).toBe(200);
    expect((await fetch(`${fixture.serviceUrl}/anything?token=secret`)).status).toBe(404);
    const requests = fixture.takeRequests();
    expect(requests).toMatchObject([
      { kind: 'telemetry', target: '/batch', status: 200 },
      { kind: 'unknown', target: 'GET', status: 404 }
    ]);
    expect(JSON.stringify(requests)).not.toContain('secret');
  });

  test('answers telemetry after the configured delay and keeps only event names, outcomes and tracking IDs', async () => {
    const fixture = await start({ telemetryResponseDelayMs: 300 });
    const trackingId = '0357943b-da67-4510-8479-fdcba22b5141';
    const delayedBatch = {
      api_key: 'phc_project_token',
      batch: [
        {
          event: 'cli_command_completed',
          distinct_id: 'user@example.com',
          properties: { outcome: 'error', error_code: 'UNEXPECTED_ERROR', command: 'package' }
        },
        { event: '$exception', properties: { error_tracking_id: trackingId, $exception_list: [{ value: 'hidden' }] } }
      ]
    };
    const delayedStart = performance.now();
    const delayed = await fetch(`${fixture.serviceUrl}/batch/`, {
      method: 'POST',
      headers: { 'content-encoding': 'gzip' },
      body: Bun.gzipSync(JSON.stringify(delayedBatch))
    });
    const delayedMs = performance.now() - delayedStart;
    fixture.setTelemetryResponseDelayMs(0);
    const plainStart = performance.now();
    const plain = await fetch(`${fixture.serviceUrl}/batch/`, {
      method: 'POST',
      body: JSON.stringify({ batch: [{ event: 'cli_command_completed', properties: { outcome: 'success' } }] })
    });
    const plainMs = performance.now() - plainStart;
    const unreadable = await fetch(`${fixture.serviceUrl}/batch/`, { method: 'POST', body: 'not json' });

    expect([delayed.status, plain.status, unreadable.status]).toEqual([200, 200, 200]);
    expect(delayedMs).toBeGreaterThanOrEqual(300);
    expect(plainMs).toBeLessThan(250);
    const requests = fixture.takeRequests();
    expect(requests).toMatchObject([
      {
        kind: 'telemetry',
        target: '/batch',
        events: [
          { event: 'cli_command_completed', outcome: 'error' },
          { event: '$exception', errorTrackingId: trackingId }
        ]
      },
      { kind: 'telemetry', target: '/batch', events: [{ event: 'cli_command_completed', outcome: 'success' }] },
      { kind: 'telemetry', target: '/batch', events: [] }
    ]);
    expect(requests[0]!.endMs - requests[0]!.startMs).toBeGreaterThanOrEqual(300);
    const recorded = JSON.stringify(requests);
    for (const hidden of ['phc_project_token', 'user@example.com', 'UNEXPECTED_ERROR', 'package', 'hidden']) {
      expect(recorded).not.toContain(hidden);
    }
  });

  test('places its recorded requests on the clock it exposes', async () => {
    const fixture = await start();
    const before = fixture.elapsedMs();
    await fetch(`${fixture.serviceUrl}/batch/`, { method: 'POST', body: '{"batch":[]}' });
    const after = fixture.elapsedMs();
    const [request] = fixture.takeRequests();
    expect(request!.startMs).toBeGreaterThanOrEqual(before);
    expect(request!.endMs).toBeLessThanOrEqual(after);
  });

  test('refuses a body above the limit', async () => {
    const fixture = await start({ limits: { maxRequestBytes: 1000 } });
    const response = await fetch(`${fixture.serviceUrl}/batch/`, { method: 'POST', body: 'x'.repeat(5000) });
    expect(response.status).toBe(413);
    expect(fixture.takeRequests()).toMatchObject([{ status: 413, note: 'request body above the fixture limit' }]);
  });

  test('refuses tunnels to hosts it was not given, and plain-HTTP proxying, keeping only the host', async () => {
    const fixture = await start();
    const tunnel = await talkToProxy(
      fixture.proxyUrl,
      'CONNECT sts.amazonaws.com:443 HTTP/1.1\r\nHost: sts.amazonaws.com:443\r\n\r\n'
    );
    const plain = await talkToProxy(
      fixture.proxyUrl,
      'GET http://example.com/secret-path?token=value HTTP/1.1\r\nHost: example.com\r\n\r\n'
    );
    expect(tunnel).toStartWith('HTTP/1.1 403');
    expect(plain).toStartWith('HTTP/1.1 403');
    const requests = fixture.takeRequests();
    expect(requests).toMatchObject([
      { kind: 'tunnel', target: 'sts.amazonaws.com:443', status: 403, allowed: false },
      { kind: 'proxy-http', target: 'example.com', status: 403, allowed: false }
    ]);
    expect(JSON.stringify(requests)).not.toContain('secret-path');
  });

  test('closes a proxy client that never completes its request', async () => {
    const fixture = await start({ limits: { proxyRequestTimeoutMs: 200 } });
    const startedAt = performance.now();
    await talkToProxy(fixture.proxyUrl, 'CONNECT sts.amaz');
    expect(performance.now() - startedAt).toBeLessThan(5000);
    expect(fixture.takeRequests()).toMatchObject([
      { kind: 'proxy-incomplete', note: 'no complete request before the timeout' }
    ]);
  });

  test('tunnels to an allowed destination, counts bytes, and closes the tunnel when idle', async () => {
    const echo = createServer((socket) => socket.pipe(socket));
    await new Promise<void>((resolveListen) => echo.listen(0, '127.0.0.1', () => resolveListen()));
    const echoPort = (echo.address() as { port: number }).port;
    try {
      const fixture = await start({ allowedTunnels: [`127.0.0.1:${echoPort}`], limits: { tunnelIdleTimeoutMs: 300 } });
      const answer = await talkToProxy(
        fixture.proxyUrl,
        `CONNECT 127.0.0.1:${echoPort} HTTP/1.1\r\nHost: 127.0.0.1:${echoPort}\r\n\r\nping`
      );
      expect(answer).toBe('HTTP/1.1 200 Connection Established\r\n\r\nping');
      expect(fixture.takeRequests()).toMatchObject([
        {
          kind: 'tunnel',
          target: `127.0.0.1:${echoPort}`,
          status: 200,
          allowed: true,
          bytesIn: 4,
          bytesOut: 4,
          note: 'tunnel idle timeout'
        }
      ]);
    } finally {
      echo.close();
    }
  });

  test('lets the calling process exit promptly after close, whatever its close bound', async () => {
    const script = `const { startExternalServiceFixture } = await import(${JSON.stringify(`${import.meta.dir}/external-service-fixture.ts`)});
const fixture = await startExternalServiceFixture({ limits: { closeTimeoutMs: 600_000, idleTimeoutSeconds: 200 } });
const response = await fetch(\`\${fixture.serviceUrl}/batch/\`, { method: 'POST', body: '{}' });
await fixture.close();
console.log(response.status);`;
    const startedAt = performance.now();
    const harness = Bun.spawnSync({
      cmd: [process.execPath, '-e', script],
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 30_000
    });
    expect(harness.stderr.toString()).toBe('');
    expect(harness.exitCode).toBe(0);
    expect(harness.stdout.toString().trim()).toBe('200');
    expect(performance.now() - startedAt).toBeLessThan(5000);
  });

  test('closes within its bound while a client connection is still open', async () => {
    const fixture = await startExternalServiceFixture({ limits: { closeTimeoutMs: 500 } });
    const { port } = new URL(fixture.proxyUrl);
    const idle = connect(Number(port), '127.0.0.1');
    await new Promise<void>((resolveConnect) => idle.once('connect', () => resolveConnect()));
    const startedAt = performance.now();
    await fixture.close();
    expect(performance.now() - startedAt).toBeLessThan(2000);
    idle.destroy();
  });
});
