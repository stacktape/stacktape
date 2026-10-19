import { expect, test } from 'bun:test';
import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { HttpRequest } from '@smithy/protocol-http';

test.skipIf(process.platform !== 'linux')(
  'measured transport drains over 1,000 requests, preserves errors, and aborts stalled headers and bodies',
  async () => {
    const { createMeasuredHandler } = await import('./transport');
    let respond = (response: ServerResponse) => {
      response.end('complete');
    };
    const server = createServer((_request, response) => respond(response));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const request = new HttpRequest({
      protocol: 'http:',
      hostname: '127.0.0.1',
      port: (server.address() as AddressInfo).port
    });
    const handler = createMeasuredHandler({ requestTimeout: 1000 });
    try {
      for (let index = 0; index < 1050; index++) {
        const { response } = await handler.handle(request);
        const chunks: Buffer[] = [];
        for await (const chunk of response.body) chunks.push(Buffer.from(chunk));
        expect(Buffer.concat(chunks).toString()).toBe('complete');
      }
      for (const stall of ['headers', 'body']) {
        respond = (response) => {
          if (stall === 'body') {
            response.writeHead(200);
            response.flushHeaders();
            response.write('partial');
          }
        };
        await expect(handler.handle(request, { requestTimeout: 40 })).rejects.toMatchObject({ name: 'TimeoutError' });
      }
      const controller = new AbortController();
      respond = () => controller.abort();
      await expect(handler.handle(request, { abortSignal: controller.signal })).rejects.toMatchObject({
        name: 'AbortError'
      });
      respond = (response) => {
        response.writeHead(503);
        response.end('retry');
      };
      expect((await handler.handle(request)).response.statusCode).toBe(503);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
  15000
);

test.skipIf(process.platform !== 'linux')(
  'signed SDK retries retain transport marks without authentication or payload data',
  async () => {
    const { mkdtemp, readFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
    const { createMeasuredHandler } = await import('./transport');
    const directory = await mkdtemp(join(tmpdir(), 'swap-transport-'));
    const traceFile = join(directory, 'transport.jsonl');
    const previous = process.env.STP_CODE_SWAP_BENCH_TRACE;
    process.env.STP_CODE_SWAP_BENCH_TRACE = traceFile;
    let attempts = 0;
    const server = createServer((_request, response) => {
      attempts++;
      response.writeHead(attempts === 1 ? 503 : 200, { 'content-type': 'text/xml' });
      response.end(
        attempts === 1
          ? '<ErrorResponse><Error><Code>ServiceUnavailable</Code></Error></ErrorResponse>'
          : '<GetCallerIdentityResponse><GetCallerIdentityResult><Account>123456789012</Account><Arn>arn:aws:iam::123456789012:user/test</Arn><UserId>test-user</UserId></GetCallerIdentityResult></GetCallerIdentityResponse>'
      );
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const client = new STSClient({
        region: 'eu-west-1',
        endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
        credentials: {
          accessKeyId: 'fixture-access-marker',
          secretAccessKey: 'fixture-signing-marker',
          sessionToken: 'fixture-session-marker'
        },
        maxAttempts: 3,
        requestHandler: createMeasuredHandler()
      });
      const answer = await client.send(new GetCallerIdentityCommand({}));
      expect(answer.Account).toBe('123456789012');
      expect(answer.$metadata.attempts).toBe(2);
      const text = await readFile(traceFile, 'utf8');
      for (const marker of [
        'fixture-access-marker',
        'fixture-signing-marker',
        'fixture-session-marker',
        'Authorization',
        'UserId'
      ])
        expect(text).not.toContain(marker);
      const rows = text
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
      expect(rows).toHaveLength(2);
      expect(rows.map((row) => row.status)).toEqual([503, 200]);
      expect(rows.map((row) => row.attempt)).toEqual(['attempt=1; max=3', 'attempt=2; max=3']);
      expect(rows[0].invocation).toBe(rows[1].invocation);
      expect(rows.every((row) => row.firstByteMs > 0 && row.totalMs >= row.firstByteMs)).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.STP_CODE_SWAP_BENCH_TRACE;
      else process.env.STP_CODE_SWAP_BENCH_TRACE = previous;
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(directory, { recursive: true, force: true });
    }
  },
  10000
);
