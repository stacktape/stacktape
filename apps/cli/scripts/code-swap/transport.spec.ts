import { expect, test } from 'bun:test';
import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { HttpRequest } from '@smithy/protocol-http';

// This source-only benchmark reads Linux CLOCK_MONOTONIC through libc; its transport scenarios require Linux.

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

test.skipIf(process.platform !== 'linux')('pending TLS dials are canceled by the whole-response deadline', async () => {
  const { createServer: createTcpServer } = await import('node:net');
  const { createMeasuredHandler } = await import('./transport');
  const sockets = new Set<import('node:net').Socket>();
  const server = createTcpServer((socket) => {
    sockets.add(socket);
    socket.resume();
    socket.on('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const handler = createMeasuredHandler({ requestTimeout: 600 });
    await expect(
      handler.handle(
        new HttpRequest({ protocol: 'https:', hostname: '127.0.0.1', port: (server.address() as AddressInfo).port })
      )
    ).rejects.toMatchObject({ name: 'TimeoutError' });
    await Bun.sleep(50);
    expect(sockets.size).toBe(0);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test.skipIf(process.platform !== 'linux')(
  'Console does not replay a dispatched POST when its peer disconnects',
  async () => {
    const { measuredConsoleFetch } = await import('./transport');
    let writes = 0;
    const server = createServer((request) => {
      writes++;
      request.resume();
      request.on('end', () => request.socket.destroy());
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      await expect(
        measuredConsoleFetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`, {
          method: 'POST',
          body: 'once-only-write'
        })
      ).rejects.toThrow();
      expect(writes).toBe(1);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
);

test.skipIf(process.platform !== 'linux')(
  'a delayed first TCP completion sends one verified HTTPS request',
  async () => {
    const { mkdtemp, readFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { createServer: createHttpsServer } = await import('node:https');
    const { createMeasuredHandler, HedgedHttpsAgent } = await import('./transport');
    const directory = await mkdtemp(join(tmpdir(), 'swap-tcp-race-'));
    const key = join(directory, 'key.pem'),
      cert = join(directory, 'cert.pem');
    const openssl = Bun.spawn(
      [
        'openssl',
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-keyout',
        key,
        '-out',
        cert,
        '-days',
        '1',
        '-subj',
        '/CN=localhost',
        '-addext',
        'subjectAltName=IP:127.0.0.1,DNS:localhost'
      ],
      { stdout: 'ignore', stderr: 'ignore' }
    );
    expect(await openssl.exited).toBe(0);
    let requests = 0,
      connections = 0;
    const gateResponse = Promise.withResolvers<ServerResponse>();
    const server = createHttpsServer({ key: await readFile(key), cert: await readFile(cert) }, (request, response) => {
      requests++;
      request.resume();
      request.once('end', () => {
        if (request.url === '/queue-gate') gateResponse.resolve(response);
        else response.end('complete');
      });
    });
    server.on('connection', () => connections++);
    server.on('tlsClientError', () => {});
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    class DelayedAgent extends HedgedHttpsAgent {
      first?: import('node:net').Socket;
      readonly dialSockets: import('node:net').Socket[] = [];
      constructor(
        options: import('node:https').AgentOptions,
        delay = 50,
        private readonly delayAll = false
      ) {
        super(options, delay);
      }
      protected override connectSocket(options: import('node:net').TcpNetConnectOpts) {
        const socket = super.connectSocket(options);
        this.dialSockets.push(socket);
        if (this.delayAll || !this.first) {
          this.first ??= socket;
          const emit = socket.emit.bind(socket);
          socket.emit = ((event: string | symbol, ...args: unknown[]) => {
            if (event === 'connect') {
              const timer = setTimeout(() => {
                if (!socket.destroyed) emit(event, ...args);
              }, 500);
              socket.once('close', () => clearTimeout(timer));
              return true;
            }
            return emit(event, ...args);
          }) as typeof socket.emit;
        }
        return socket;
      }
    }
    const agent = new DelayedAgent({ ca: await readFile(cert) }, 50);
    try {
      const handler = createMeasuredHandler({ requestTimeout: 3000, secureAgent: agent });
      const { response } = await handler.handle(
        new HttpRequest({
          protocol: 'https:',
          hostname: '127.0.0.1',
          port: (server.address() as AddressInfo).port,
          method: 'POST',
          body: 'once-only-write',
          headers: { 'content-length': '15' }
        })
      );
      let body = '';
      for await (const bytes of response.body) body += bytes.toString();
      expect(body).toBe('complete');
      expect(connections).toBe(2);
      expect(requests).toBe(1);
      expect(agent.first!.destroyed).toBe(true);
      expect(agent.first!.bytesWritten).toBe(0);
      const pending = new DelayedAgent({ ca: await readFile(cert) }, 30, true);
      try {
        const blocked = createMeasuredHandler({ requestTimeout: 150, secureAgent: pending });
        await expect(
          blocked.handle(
            new HttpRequest({ protocol: 'https:', hostname: '127.0.0.1', port: (server.address() as AddressInfo).port })
          )
        ).rejects.toMatchObject({ name: 'TimeoutError' });
        expect(pending.dialSockets.length).toBe(2);
        expect(pending.dialSockets.every((socket) => socket.destroyed && socket.bytesWritten === 0)).toBe(true);
      } finally {
        pending.destroy();
      }
      const untrusted = new HedgedHttpsAgent();
      try {
        await expect(
          createMeasuredHandler({ secureAgent: untrusted }).handle(
            new HttpRequest({ protocol: 'https:', hostname: '127.0.0.1', port: (server.address() as AddressInfo).port })
          )
        ).rejects.toThrow();
        expect(requests).toBe(1);
      } finally {
        untrusted.destroy();
      }

      const invalidTls = new HedgedHttpsAgent({ ciphers: 'no-such-cipher' });
      try {
        await expect(
          createMeasuredHandler({ secureAgent: invalidTls }).handle(
            new HttpRequest({
              protocol: 'https:',
              hostname: '127.0.0.1',
              port: (server.address() as AddressInfo).port
            })
          )
        ).rejects.toThrow();
        expect(requests).toBe(1);
      } finally {
        invalidTls.destroy();
      }

      class QueuedAgent extends HedgedHttpsAgent {
        readonly dials: import('node:net').Socket[] = [];
        protected override connectSocket(options: import('node:net').TcpNetConnectOpts) {
          const socket = super.connectSocket(options);
          this.dials.push(socket);
          if (this.dials.length > 1) {
            const emit = socket.emit.bind(socket);
            socket.emit = ((event: string | symbol, ...args: unknown[]) =>
              event === 'connect' ? true : emit(event, ...args)) as typeof socket.emit;
          }
          return socket;
        }
      }
      const queued = new QueuedAgent({ ca: await readFile(cert), maxSockets: 1 });
      try {
        const handler = createMeasuredHandler({ secureAgent: queued, requestTimeout: 3000 });
        const input = { protocol: 'https:', hostname: '127.0.0.1', port: (server.address() as AddressInfo).port };
        const first = handler.handle(new HttpRequest({ ...input, path: '/queue-gate' }));
        const heldResponse = await gateResponse.promise;
        const until = Date.now() + 2000;
        const controller = new AbortController();
        const result = handler.handle(new HttpRequest(input), { abortSignal: controller.signal }).then(
          () => null,
          (e) => e
        );
        await Bun.sleep(10);
        expect(queued.dials.length).toBe(1);
        heldResponse!.setHeader('connection', 'close');
        heldResponse!.end('gate');
        await first;
        while (queued.dials.length < 2 && Date.now() < until) await Bun.sleep(5);
        expect(queued.dials.length).toBeGreaterThanOrEqual(2);
        controller.abort();
        expect(await result).toMatchObject({ name: 'AbortError' });
        expect(queued.dials.slice(1).every((socket) => socket.destroyed)).toBe(true);
      } finally {
        queued.destroy();
      }
    } finally {
      agent.destroy();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(directory, { recursive: true, force: true });
    }
  },
  10000
);
