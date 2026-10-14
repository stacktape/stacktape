import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServerWrapper } from './ssr-web-shared';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.map((root) => rm(root, { force: true, recursive: true })));
  roots.length = 0;
});

const createRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-ssr-web-'));
  roots.push(root);
  return root;
};

// The application at the framework boundary echoes what it received; `/pixel` answers with binary bytes. Remix's
// `createRequestHandler` is the one framework call the web-fetch wrapper makes, so the fixture supplies it.
const pixel = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0x00]);
const echoApplications = {
  'node-http': {
    handlerFileName: 'server.mjs',
    files: {
      'server.mjs': `export default (request, response) => {
        const chunks = [];
        request.on("data", (chunk) => chunks.push(chunk));
        request.on("end", () => {
          if (request.url === "/pixel") {
            response.setHeader("content-type", "image/png");
            return response.end(Buffer.from(${JSON.stringify([...pixel])}));
          }
          response.setHeader("content-type", "application/json");
          response.setHeader("set-cookie", ["session=new; Path=/; HttpOnly", "theme=dark; Path=/"]);
          response.end(JSON.stringify({
            method: request.method,
            url: (request.socket.encrypted ? "https" : "http") + "://" + request.headers.host + request.url,
            cookie: request.headers.cookie,
            body: Buffer.concat(chunks).toString("utf8")
          }));
        });
      };`
    }
  },
  'web-fetch': {
    handlerFileName: 'index.js',
    files: {
      'node_modules/@remix-run/node/package.json': '{"name":"@remix-run/node","type":"module","main":"index.js"}',
      'node_modules/@remix-run/node/index.js':
        'export const createRequestHandler = (build) => (request) => build.default(request);',
      'index.js': `export default async (request) => {
        if (new URL(request.url).pathname === "/pixel") {
          return new Response(Buffer.from(${JSON.stringify([...pixel])}), { headers: { "content-type": "image/png" } });
        }
        const headers = new Headers({ "content-type": "application/json" });
        headers.append("set-cookie", "session=new; Path=/; HttpOnly");
        headers.append("set-cookie", "theme=dark; Path=/");
        return new Response(JSON.stringify({
          method: request.method,
          url: request.url,
          cookie: request.headers.get("cookie"),
          body: await request.text()
        }), { headers });
      };`
    }
  }
} as const;

// What a function URL or HTTP API sends: the method only in requestContext, cookies outside the headers, the
// body base64-encoded and the public host in x-forwarded-host.
const httpApiEvent = (method: string, rawPath: string, body?: string) => ({
  version: '2.0',
  rawPath,
  rawQueryString: 'q=red%20apple',
  cookies: ['session=abc', 'theme=light'],
  headers: {
    host: 'internal.lambda-url.example',
    'x-forwarded-host': 'public.example.com',
    'x-forwarded-proto': 'https',
    'content-type': 'application/x-www-form-urlencoded'
  },
  requestContext: { http: { method } },
  ...(body === undefined ? {} : { body: Buffer.from(body).toString('base64'), isBase64Encoded: true })
});

describe('SSR Lambda wrappers', () => {
  test.each(['node-http', 'web-fetch'] as const)(
    '%s passes an HTTP API v2 request through intact and answers in the v2 shape',
    async (wrapperType) => {
      const root = await createRoot();
      const application = echoApplications[wrapperType];
      await Promise.all(
        Object.entries(application.files).map(async ([path, contents]) => {
          await mkdir(dirname(join(root, 'server-function', path)), { recursive: true });
          await writeFile(join(root, 'server-function', path), contents);
        })
      );
      await createServerWrapper({ distFolderPath: root, handlerFileName: application.handlerFileName, wrapperType });
      const { handler } = await import(
        `${pathToFileURL(join(root, 'server-function', 'index-wrap.mjs')).href}?test=${Date.now()}`
      );
      const response = await handler(httpApiEvent('POST', '/orders/42', 'item=caf%C3%A9&qty=2'));
      expect(response.statusCode).toBe(200);
      expect(response.cookies).toEqual(['session=new; Path=/; HttpOnly', 'theme=dark; Path=/']);
      expect(response.multiValueHeaders).toBeUndefined();
      expect(JSON.parse(response.body)).toEqual({
        method: 'POST',
        url: 'https://public.example.com/orders/42?q=red%20apple',
        cookie: 'session=abc; theme=light',
        body: 'item=caf%C3%A9&qty=2'
      });

      const image = await handler({ ...httpApiEvent('GET', '/pixel'), rawQueryString: '' });
      expect(image.isBase64Encoded).toBe(true);
      expect(Buffer.from(image.body, 'base64')).toEqual(pixel);
    }
  );

  test('drops the encoding of a response fetch already decompressed', async () => {
    const root = await createRoot();
    const serverFunctionPath = join(root, 'server-function');
    await mkdir(serverFunctionPath, { recursive: true });
    await writeFile(
      join(serverFunctionPath, 'server.mjs'),
      `import { gzipSync } from "node:zlib";
       export default (request, response) => {
         const body = gzipSync("compressed body");
         response.setHeader("content-type", "text/plain");
         response.setHeader("content-encoding", "gzip");
         response.setHeader("connection", "keep-alive");
         response.setHeader("content-length", String(body.length));
         response.end(body);
       };`
    );
    await createServerWrapper({
      distFolderPath: root,
      handlerFileName: 'server.mjs',
      wrapperType: 'node-http'
    });
    const wrapperUrl = `${pathToFileURL(join(serverFunctionPath, 'index-wrap.mjs')).href}?test=${Date.now()}`;
    const { handler } = await import(wrapperUrl);

    const response = await handler({
      version: '2.0',
      requestContext: { http: { method: 'GET' } },
      rawPath: '/',
      rawQueryString: '',
      headers: { host: 'internal.lambda-url.example' }
    });

    expect(response.body).toBe('compressed body');
    expect(response.isBase64Encoded).toBe(false);
    expect(response.headers['content-encoding']).toBeUndefined();
    expect(response.headers['content-length']).toBeUndefined();
    expect(response.headers.connection).toBeUndefined();
  });
});
