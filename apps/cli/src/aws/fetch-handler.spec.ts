import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HttpRequest } from '@smithy/protocol-http';
import { createFetchHandler } from './fetch-handler';
import { AwsSdkManager } from './sdk-manager';

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

// A fresh bucket's accelerated (or global) endpoint answers with a 307 to the bucket's regional host until DNS and the
// acceleration setting propagate. The stub mirrors S3: the regional host rejects a request without a signature.
test.each([
  {
    style: 'virtual-hosted',
    clientHost: 's3-accelerate.localhost',
    redirectEndpoint: 'my-bucket.s3-eu-west-1.localhost',
    regionalHost: 'my-bucket.s3-eu-west-1.localhost',
    path: '/stack/stp-template.yml'
  },
  {
    style: 'path-style',
    clientHost: '127.0.0.1',
    redirectEndpoint: 'my-bucket.localhost',
    regionalHost: 'localhost',
    path: '/my-bucket/stack/stp-template.yml'
  }
])(
  'a $style upload that S3 temporarily redirects is signed again for the regional host',
  async (example) => {
    const stored: { host: string; path: string; body: string }[] = [];
    const server = Bun.serve({
      port: 0,
      fetch: async (request) => {
        const url = new URL(request.url);
        if (url.hostname !== example.regionalHost) {
          const location = `http://${example.regionalHost}:${url.port}${url.pathname}${url.search}`;
          return new Response(
            `<Error><Code>TemporaryRedirect</Code><Endpoint>${example.redirectEndpoint}</Endpoint><Bucket>my-bucket</Bucket></Error>`,
            { status: 307, headers: { location } }
          );
        }
        if (!request.headers.get('authorization')) {
          return new Response(
            '<Error><Code>AccessDenied</Code><Message>No AWSAccessKey was presented.</Message></Error>',
            {
              status: 403
            }
          );
        }
        stored.push({ host: url.hostname, path: url.pathname, body: await request.text() });
        return new Response(null, { status: 200, headers: { etag: '"etag"' } });
      }
    });
    const directory = await mkdtemp(join(tmpdir(), 'stp-s3-redirect-'));
    const filePath = join(directory, 'stp-template.yml');
    await writeFile(filePath, 'Resources: {}\n');
    const sdk = new AwsSdkManager();
    sdk.init({
      credentials: { accessKeyId: 'AKIATEST', secretAccessKey: 'secret', sessionToken: 'token' },
      endpoint: `http://${example.clientHost}:${server.port}`,
      region: 'eu-west-1'
    });
    try {
      await sdk.s3.uploadFile({
        bucketName: 'my-bucket',
        filePath,
        s3Key: 'stack/stp-template.yml',
        useS3Acceleration: true
      });
      expect(stored).toEqual([{ host: example.regionalHost, path: example.path, body: 'Resources: {}\n' }]);
    } finally {
      server.stop(true);
      await rm(directory, { recursive: true, force: true });
    }
  },
  10_000
);
