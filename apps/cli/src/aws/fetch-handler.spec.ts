import { expect, test } from 'bun:test';
import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { HttpRequest } from '@smithy/protocol-http';
import { createFetchHandler } from './fetch-handler';

test('AWS fetch deadlines cover stalled headers and bodies, while caller cancellation remains AbortError', async () => {
  let received: (response: ServerResponse) => void;
  const server = createServer((_request, response) => received(response));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const request = new HttpRequest({
    protocol: 'http:',
    hostname: '127.0.0.1',
    port: (server.address() as AddressInfo).port
  });
  const handler = createFetchHandler({ requestTimeout: 1000 });
  try {
    for (const stall of ['headers', 'body'] as const) {
      received = (response) => {
        if (stall === 'body') {
          response.writeHead(200);
          response.flushHeaders();
          response.write('partial');
        }
      };
      let guard: ReturnType<typeof setTimeout>;
      const outcome = await Promise.race([
        handler
          .handle(request, { requestTimeout: 40, abortSignal: AbortSignal.timeout(300) })
          .catch((error: unknown) => error),
        new Promise<{ name: string }>((resolve) => {
          guard = setTimeout(() => resolve({ name: 'DeadlineMissed' }), 200);
        })
      ]).finally(() => clearTimeout(guard));
      expect(outcome).toMatchObject({ name: 'TimeoutError' });
    }
    const controller = new AbortController();
    received = () => controller.abort();
    await expect(handler.handle(request, { abortSignal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError'
    });
    received = (response) => response.end('complete');
    const { response } = await handler.handle(request);
    const chunks: Buffer[] = [];
    for await (const chunk of response.body) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks).toString()).toBe('complete');
  } finally {
    handler.destroy();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}, 5000);
