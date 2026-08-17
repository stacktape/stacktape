import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createServerWrapper,
  getMissingRequiredAdapterPackages,
  reorganizeBuildOutput,
  type SsrWebBuildConfig
} from './ssr-web-shared';
import { parseCommand } from '../process/command';

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

describe('SSR Lambda wrappers', () => {
  test('adapts API Gateway v1 path, query, request headers, body, and repeated response cookies', async () => {
    const root = await createRoot();
    const serverFunctionPath = join(root, 'server-function');
    await mkdir(serverFunctionPath, { recursive: true });
    await writeFile(
      join(serverFunctionPath, 'server.mjs'),
      `export default (request, response) => {
        const chunks = [];
        request.on("data", (chunk) => chunks.push(chunk));
        request.on("end", () => {
          response.statusCode = 201;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("set-cookie", ["first=one; Path=/", "second=two; Path=/"]);
          response.end(JSON.stringify({
            method: request.method,
            url: request.url,
            cookie: request.headers.cookie,
            repeated: request.headers["x-repeated"],
            body: Buffer.concat(chunks).toString("utf8")
          }));
        });
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
      version: '1.0',
      httpMethod: 'POST',
      path: '/orders',
      queryStringParameters: { search: 'ignored', single: 'one' },
      multiValueQueryStringParameters: { search: ['red apple', 'green apple'] },
      headers: {
        cookie: 'session=abc',
        'content-type': 'text/plain',
        'x-repeated': 'duplicate'
      },
      multiValueHeaders: { 'x-repeated': ['one', 'two'] },
      body: 'payload',
      isBase64Encoded: false
    });

    expect(response.statusCode).toBe(201);
    expect(response.multiValueHeaders['set-cookie']).toEqual(['first=one; Path=/', 'second=two; Path=/']);
    expect(response.cookies).toBeUndefined();
    expect(JSON.parse(response.body)).toEqual({
      method: 'POST',
      url: '/orders?search=red+apple&search=green+apple&single=one',
      cookie: 'session=abc',
      repeated: 'one, two',
      body: 'payload'
    });
  });

  test('uses the API Gateway v2 cookie response field', async () => {
    const root = await createRoot();
    const serverFunctionPath = join(root, 'server-function');
    await mkdir(serverFunctionPath, { recursive: true });
    await writeFile(
      join(serverFunctionPath, 'server.mjs'),
      `export default (_request, response) => {
        response.setHeader("content-type", "text/plain");
        response.setHeader("set-cookie", ["a=1; Path=/", "b=2; Path=/"]);
        response.end("ok");
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
      headers: {},
      cookies: ['request=one']
    });

    expect(response.cookies).toEqual(['a=1; Path=/', 'b=2; Path=/']);
    expect(response.multiValueHeaders).toBeUndefined();
  });

  test('normalizes transparently decompressed responses and preserves the public origin', async () => {
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
         response.setHeader("x-observed-origin", (request.socket.encrypted ? "https" : "http") + "://" + request.headers.host);
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
      headers: {
        host: 'internal.lambda-url.example',
        'x-forwarded-host': 'public.example.com',
        'x-forwarded-proto': 'https'
      }
    });

    expect(response.body).toBe('compressed body');
    expect(response.isBase64Encoded).toBe(false);
    expect(response.headers['content-encoding']).toBeUndefined();
    expect(response.headers['content-length']).toBeUndefined();
    expect(response.headers.connection).toBeUndefined();
    expect(response.headers['x-observed-origin']).toBe('https://public.example.com');
  });
});

describe('SSR build output organization', () => {
  test('separates a server directory nested inside the static output', async () => {
    const root = await createRoot();
    const buildOutput = join(root, 'build-output');
    await mkdir(join(buildOutput, 'public', 'server'), { recursive: true });
    await writeFile(join(buildOutput, 'public', 'asset.txt'), 'public');
    await writeFile(join(buildOutput, 'public', 'server', 'handler.mjs'), 'private-server');
    await mkdir(join(buildOutput, '__server-output'), { recursive: true });
    await writeFile(join(buildOutput, '__server-output', 'handler.mjs'), 'private-server');
    await rm(join(buildOutput, 'public', 'server'), { recursive: true });

    const buildConfig: SsrWebBuildConfig = {
      buildCommand: 'unused',
      workingDir: root,
      serverOutputPath: 'public/server',
      staticOutputPath: 'public',
      handlerFileName: 'handler.mjs',
      staticAssetPrefix: '',
      wrapperType: 'passthrough'
    };
    await reorganizeBuildOutput({
      distFolderPath: root,
      buildConfig
    });

    expect(await readFile(join(root, 'server-function', 'handler.mjs'), 'utf8')).toBe('private-server');
    expect(await readFile(join(root, 'bucket-content', 'asset.txt'), 'utf8')).toBe('public');
    expect(await Bun.file(join(root, 'bucket-content', 'server', 'handler.mjs')).exists()).toBe(false);
  });

  test('preserves a framework-required server directory', async () => {
    const root = await createRoot();
    const buildOutput = join(root, 'build-output');
    await mkdir(join(buildOutput, 'dist', 'server'), { recursive: true });
    await mkdir(join(buildOutput, 'dist', 'client'), { recursive: true });
    await writeFile(join(buildOutput, 'dist', 'server', 'entry.mjs'), 'export const handler = () => {};');
    await writeFile(join(buildOutput, 'dist', 'client', 'asset.txt'), 'public');

    const buildConfig: SsrWebBuildConfig = {
      buildCommand: 'unused',
      workingDir: root,
      serverOutputPath: 'dist/server',
      staticOutputPath: 'dist/client',
      handlerFileName: 'entry.mjs',
      preserveServerOutputDirectory: true,
      copyStaticAssetsToServerDirectory: 'client',
      staticAssetPrefix: '_astro',
      wrapperType: 'passthrough'
    };
    await reorganizeBuildOutput({
      distFolderPath: root,
      buildConfig
    });

    expect(await readFile(join(root, 'server-function', 'server', 'entry.mjs'), 'utf8')).toContain('handler');
    expect(await readFile(join(root, 'bucket-content', 'asset.txt'), 'utf8')).toBe('public');
    expect(await readFile(join(root, 'server-function', 'client', 'asset.txt'), 'utf8')).toBe('public');
  });
});

describe('SSR build commands', () => {
  test('preserves quoted arguments and rejects an empty command', () => {
    expect(parseCommand('vite build --mode "production preview" --define=NAME="Stack Tape"')).toEqual([
      'vite',
      'build',
      '--mode',
      'production preview',
      '--define=NAME=Stack Tape'
    ]);
    expect(() => parseCommand('   ')).toThrow('cannot be empty');
    expect(() => parseCommand('vite build "unfinished')).toThrow('unterminated quote');
  });
});

describe('SSR framework adapter validation', () => {
  test('reports adapters missing from the application manifest', async () => {
    const root = await createRoot();
    await writeFile(join(root, 'package.json'), JSON.stringify({ devDependencies: { '@astrojs/node': '11.1.2' } }));

    expect(
      await getMissingRequiredAdapterPackages({
        requiredAdapterPackages: ['@astrojs/node', '@sveltejs/adapter-node'],
        workingDir: root
      })
    ).toEqual(['@sveltejs/adapter-node']);
  });
});
