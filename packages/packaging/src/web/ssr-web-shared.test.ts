import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createSsrWebArtifacts,
  createServerWrapper,
  getMissingRequiredAdapterPackages,
  reorganizeBuildOutput,
  resolveSsrWebOutputVariant,
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

  test('adapts a TanStack Start default fetch entry to an API Gateway response', async () => {
    const root = await createRoot();
    const serverFunctionPath = join(root, 'server-function');
    await mkdir(serverFunctionPath, { recursive: true });
    await writeFile(
      join(serverFunctionPath, 'server.js'),
      `export default {
        marker: "tanstack-start",
        async fetch(request) {
          return Response.json({ marker: this.marker, method: request.method, url: request.url });
        }
      };`
    );
    await createServerWrapper({
      distFolderPath: root,
      handlerFileName: 'server.js',
      wrapperType: 'tanstack-fetch'
    });
    const wrapperUrl = `${pathToFileURL(join(serverFunctionPath, 'index-wrap.mjs')).href}?test=${Date.now()}`;
    const { handler } = await import(wrapperUrl);

    const response = await handler({
      version: '2.0',
      requestContext: { http: { method: 'GET' } },
      rawPath: '/dashboard',
      rawQueryString: 'mode=ssr',
      headers: { 'x-forwarded-host': 'app.example.com', 'x-forwarded-proto': 'https' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.isBase64Encoded).toBe(false);
    expect(JSON.parse(response.body)).toEqual({
      marker: 'tanstack-start',
      method: 'GET',
      url: 'https://app.example.com/dashboard?mode=ssr'
    });
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
  test('falls back when a stale primary directory does not contain its required handler', async () => {
    const root = await createRoot();
    await mkdir(join(root, 'dist', 'server'), { recursive: true });
    await writeFile(join(root, 'dist', 'server', 'stale.txt'), 'stale');
    await mkdir(join(root, '.output', 'server'), { recursive: true });
    await writeFile(join(root, '.output', 'server', 'index.mjs'), 'export const handler = () => {};');
    const buildConfig: SsrWebBuildConfig = {
      buildCommand: 'unused',
      workingDir: root,
      serverOutputPath: 'dist/server',
      staticOutputPath: 'dist/client',
      handlerFileName: 'server.js',
      staticAssetPrefix: 'assets',
      wrapperType: 'tanstack-fetch',
      fallbackOutputVariants: [
        {
          serverOutputPath: '.output/server',
          staticOutputPath: '.output/public',
          handlerFileName: 'index.mjs',
          staticAssetPrefix: '_build',
          wrapperType: 'passthrough'
        }
      ]
    };

    expect(await resolveSsrWebOutputVariant(buildConfig)).toMatchObject({
      serverOutputPath: '.output/server',
      staticOutputPath: '.output/public',
      handlerFileName: 'index.mjs',
      staticAssetPrefix: '_build',
      wrapperType: 'passthrough'
    });
  });

  test('prefers the freshest output when both current and legacy handlers exist', async () => {
    const root = await createRoot();
    const legacyHandler = join(root, '.output', 'server', 'index.mjs');
    await mkdir(join(root, '.output', 'server'), { recursive: true });
    await writeFile(legacyHandler, 'export const handler = () => {};');
    await utimes(legacyHandler, new Date('2020-01-01T00:00:00.000Z'), new Date('2020-01-01T00:00:00.000Z'));
    await mkdir(join(root, 'dist', 'server'), { recursive: true });
    await writeFile(join(root, 'dist', 'server', 'server.js'), 'export default { fetch() {} };');

    const buildConfig: SsrWebBuildConfig = {
      buildCommand: 'unused',
      workingDir: root,
      serverOutputPath: 'dist/server',
      staticOutputPath: 'dist/client',
      handlerFileName: 'server.js',
      staticAssetPrefix: 'assets',
      wrapperType: 'tanstack-fetch',
      fallbackOutputVariants: [
        {
          serverOutputPath: '.output/server',
          staticOutputPath: '.output/public',
          handlerFileName: 'index.mjs',
          staticAssetPrefix: '_build',
          wrapperType: 'passthrough'
        }
      ]
    };

    expect(await resolveSsrWebOutputVariant(buildConfig)).toMatchObject({
      serverOutputPath: 'dist/server',
      handlerFileName: 'server.js',
      wrapperType: 'tanstack-fetch'
    });
  });

  test('selects a fresh legacy handler instead of a stale current handler', async () => {
    const root = await createRoot();
    const currentHandler = join(root, 'dist', 'server', 'server.js');
    const legacyHandler = join(root, '.output', 'server', 'index.mjs');
    await mkdir(join(root, 'dist', 'server'), { recursive: true });
    await writeFile(currentHandler, 'export default { fetch() {} };');
    await utimes(currentHandler, new Date('2020-01-01T00:00:00.000Z'), new Date('2020-01-01T00:00:00.000Z'));
    await mkdir(join(root, '.output', 'server'), { recursive: true });
    await writeFile(legacyHandler, 'export const handler = () => {};');

    const resolved = await resolveSsrWebOutputVariant({
      buildCommand: 'unused',
      workingDir: root,
      serverOutputPath: 'dist/server',
      staticOutputPath: 'dist/client',
      handlerFileName: 'server.js',
      staticAssetPrefix: 'assets',
      wrapperType: 'tanstack-fetch',
      fallbackOutputVariants: [
        {
          serverOutputPath: '.output/server',
          staticOutputPath: '.output/public',
          handlerFileName: 'index.mjs',
          staticAssetPrefix: '_build',
          wrapperType: 'passthrough'
        }
      ]
    });

    expect(resolved).toMatchObject({
      serverOutputPath: '.output/server',
      staticOutputPath: '.output/public',
      handlerFileName: 'index.mjs',
      staticAssetPrefix: '_build',
      wrapperType: 'passthrough'
    });
  });

  test('does not select a directory whose name matches the required handler', async () => {
    const root = await createRoot();
    await mkdir(join(root, 'dist', 'server', 'server.js'), { recursive: true });
    await mkdir(join(root, '.output', 'server'), { recursive: true });
    await writeFile(join(root, '.output', 'server', 'index.mjs'), 'export const handler = () => {};');

    const resolved = await resolveSsrWebOutputVariant({
      buildCommand: 'unused',
      workingDir: root,
      serverOutputPath: 'dist/server',
      staticOutputPath: 'dist/client',
      handlerFileName: 'server.js',
      staticAssetPrefix: 'assets',
      wrapperType: 'tanstack-fetch',
      fallbackOutputVariants: [
        {
          serverOutputPath: '.output/server',
          staticOutputPath: '.output/public',
          handlerFileName: 'index.mjs',
          staticAssetPrefix: '_build',
          wrapperType: 'passthrough'
        }
      ]
    });

    expect(resolved.handlerFileName).toBe('index.mjs');
  });

  test('requires the handler filename to use the exact wrapper import casing', async () => {
    const root = await createRoot();
    await mkdir(join(root, 'dist', 'server'), { recursive: true });
    await writeFile(join(root, 'dist', 'server', 'Server.js'), 'export default { fetch() {} };');
    await mkdir(join(root, '.output', 'server'), { recursive: true });
    await writeFile(join(root, '.output', 'server', 'index.mjs'), 'export const handler = () => {};');

    const resolved = await resolveSsrWebOutputVariant({
      buildCommand: 'unused',
      workingDir: root,
      serverOutputPath: 'dist/server',
      staticOutputPath: 'dist/client',
      handlerFileName: 'server.js',
      staticAssetPrefix: 'assets',
      wrapperType: 'tanstack-fetch',
      fallbackOutputVariants: [
        {
          serverOutputPath: '.output/server',
          staticOutputPath: '.output/public',
          handlerFileName: 'index.mjs',
          staticAssetPrefix: '_build',
          wrapperType: 'passthrough'
        }
      ]
    });

    expect(resolved.handlerFileName).toBe('index.mjs');
  });

  test('rejects output directories that do not contain a supported handler', async () => {
    const root = await createRoot();
    await mkdir(join(root, 'dist', 'server'), { recursive: true });
    await mkdir(join(root, '.output', 'server'), { recursive: true });
    const buildConfig: SsrWebBuildConfig = {
      buildCommand: 'unused',
      workingDir: root,
      serverOutputPath: 'dist/server',
      staticOutputPath: 'dist/client',
      handlerFileName: 'server.js',
      staticAssetPrefix: 'assets',
      wrapperType: 'tanstack-fetch',
      fallbackOutputVariants: [
        {
          serverOutputPath: '.output/server',
          staticOutputPath: '.output/public',
          handlerFileName: 'index.mjs',
          staticAssetPrefix: '_build',
          wrapperType: 'passthrough'
        }
      ]
    };

    await expect(resolveSsrWebOutputVariant(buildConfig)).rejects.toThrow(
      'dist/server/server.js, .output/server/index.mjs'
    );
  });

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

  test('clears stale current output before a build emits only the legacy layout', async () => {
    const root = await createRoot();
    const applicationRoot = join(root, 'application');
    const artifactRoot = join(root, 'artifacts');
    const staleHandler = join(applicationRoot, 'dist', 'server', 'server.js');
    await mkdir(join(applicationRoot, 'dist', 'server'), { recursive: true });
    await mkdir(join(applicationRoot, 'dist', 'client', 'assets'), { recursive: true });
    await writeFile(staleHandler, 'export default { async fetch() { return new Response("stale"); } };');
    await writeFile(join(applicationRoot, 'dist', 'client', 'assets', 'stale.js'), 'stale');
    await writeFile(join(applicationRoot, 'package.json'), JSON.stringify({ name: 'legacy-start', type: 'module' }));
    let inspectedArchive = false;

    const outputs = await createSsrWebArtifacts({
      resourceName: 'legacy-start',
      resourceType: 'tanstack-web',
      serverFunctionName: 'legacy-start-server',
      distFolderPath: artifactRoot,
      cwd: root,
      progressLogger: {
        eventContext: { instanceId: 'legacy-start' },
        startEvent: () => {},
        updateEvent: () => {},
        finishEvent: () => {}
      },
      createProgressLogger: () => ({
        eventContext: { instanceId: 'legacy-start.archive' },
        startEvent: () => {},
        updateEvent: () => {},
        finishEvent: () => {}
      }),
      buildConfig: {
        buildCommand: 'vinxi build',
        workingDir: applicationRoot,
        serverOutputPath: 'dist/server',
        staticOutputPath: 'dist/client',
        handlerFileName: 'server.js',
        staticAssetPrefix: 'assets',
        wrapperType: 'tanstack-fetch',
        fallbackOutputVariants: [
          {
            serverOutputPath: '.output/server',
            staticOutputPath: '.output/public',
            handlerFileName: 'index.mjs',
            staticAssetPrefix: '_build',
            wrapperType: 'passthrough'
          }
        ]
      },
      environmentVars: [],
      archiveItem: async ({ absoluteSourcePath, absoluteDestDirPath }) => {
        expect(await Bun.file(join(absoluteSourcePath, 'index.mjs')).exists()).toBe(true);
        expect(await Bun.file(join(absoluteSourcePath, 'server.js')).exists()).toBe(false);
        expect(await readFile(join(absoluteSourcePath, 'index-wrap.mjs'), 'utf8')).toContain('import("./index.mjs")');
        inspectedArchive = true;
        if (absoluteDestDirPath === undefined) throw new Error('Expected an archive destination.');
        await mkdir(absoluteDestDirPath, { recursive: true });
        const archivePath = join(absoluteDestDirPath, 'legacy-start.zip');
        await writeFile(archivePath, 'zip');
        return archivePath;
      },
      createPackagingError: ({ message, cause }) => new Error(message, { cause }),
      executeProcess: async () => {
        expect(await Bun.file(staleHandler).exists()).toBe(false);
        await mkdir(join(applicationRoot, '.output', 'server'), { recursive: true });
        await mkdir(join(applicationRoot, '.output', 'public', '_build'), { recursive: true });
        await writeFile(join(applicationRoot, '.output', 'server', 'index.mjs'), 'export const handler = () => {};');
        await writeFile(join(applicationRoot, '.output', 'public', 'index.html'), 'legacy');
        await writeFile(join(applicationRoot, '.output', 'public', '_build', 'fresh.js'), 'fresh');
        return { stdout: '', stderr: '', exitCode: 0 };
      }
    });

    expect(inspectedArchive).toBe(true);
    expect(outputs[0]?.outcome).toBe('bundled');
    expect(await readFile(join(artifactRoot, 'bucket-content', 'index.html'), 'utf8')).toBe('legacy');
    expect(await readFile(join(artifactRoot, 'bucket-content', '_build', 'fresh.js'), 'utf8')).toBe('fresh');
    expect(await Bun.file(join(artifactRoot, 'bucket-content', 'assets', 'stale.js')).exists()).toBe(false);
  });

  test(`refuses to clear output through an intermediate ${process.platform === 'win32' ? 'junction' : 'symbolic link'}`, async () => {
    const root = await createRoot();
    const applicationRoot = join(root, 'application');
    const outsideRoot = join(root, 'outside');
    const artifactRoot = join(root, 'artifacts');
    const outsideFile = join(outsideRoot, 'server', 'keep.txt');
    await mkdir(applicationRoot, { recursive: true });
    await mkdir(join(outsideRoot, 'server'), { recursive: true });
    await writeFile(outsideFile, 'must survive');
    await writeFile(join(applicationRoot, 'package.json'), JSON.stringify({ name: 'linked-output' }));
    await symlink(outsideRoot, join(applicationRoot, 'dist'), process.platform === 'win32' ? 'junction' : 'dir');
    let buildStarted = false;
    let packagingCause: unknown;

    await expect(
      createSsrWebArtifacts({
        resourceName: 'linked-output',
        resourceType: 'tanstack-web',
        serverFunctionName: 'linked-output-server',
        distFolderPath: artifactRoot,
        cwd: root,
        progressLogger: {
          eventContext: { instanceId: 'linked-output' },
          startEvent: () => {},
          updateEvent: () => {},
          finishEvent: () => {}
        },
        createProgressLogger: () => ({
          eventContext: { instanceId: 'linked-output.archive' },
          startEvent: () => {},
          updateEvent: () => {},
          finishEvent: () => {}
        }),
        buildConfig: {
          buildCommand: 'vite build',
          workingDir: applicationRoot,
          serverOutputPath: 'dist/server',
          staticOutputPath: 'dist/client',
          handlerFileName: 'server.js',
          staticAssetPrefix: 'assets',
          wrapperType: 'tanstack-fetch'
        },
        environmentVars: [],
        archiveItem: async () => {
          throw new Error('archive must not run');
        },
        createPackagingError: ({ message, cause }) => {
          packagingCause = cause;
          return new Error(message, { cause });
        },
        executeProcess: async () => {
          buildStarted = true;
          return { stdout: '', stderr: '', exitCode: 0 };
        }
      })
    ).rejects.toThrow('Error when packaging tanstack-web "linked-output".');

    expect(buildStarted).toBe(false);
    expect(packagingCause).toBeInstanceOf(Error);
    expect((packagingCause as Error).message).toContain(
      'Refusing to clear SSR build output through a symbolic link or junction'
    );
    expect(await readFile(outsideFile, 'utf8')).toBe('must survive');
  });

  test('packages the Rsbuild handler under the exact fetch-wrapper import name', async () => {
    const root = await createRoot();
    const applicationRoot = join(root, 'application');
    const artifactRoot = join(root, 'artifacts');
    await mkdir(applicationRoot, { recursive: true });
    await writeFile(join(applicationRoot, 'package.json'), JSON.stringify({ name: 'rsbuild-start', type: 'module' }));
    let inspectedArchive = false;

    const outputs = await createSsrWebArtifacts({
      resourceName: 'rsbuild-start',
      resourceType: 'tanstack-web',
      serverFunctionName: 'rsbuild-start-server',
      distFolderPath: artifactRoot,
      cwd: root,
      progressLogger: {
        eventContext: { instanceId: 'rsbuild-start' },
        startEvent: () => {},
        updateEvent: () => {},
        finishEvent: () => {}
      },
      createProgressLogger: () => ({
        eventContext: { instanceId: 'rsbuild-start.archive' },
        startEvent: () => {},
        updateEvent: () => {},
        finishEvent: () => {}
      }),
      buildConfig: {
        buildCommand: 'rsbuild build',
        workingDir: applicationRoot,
        serverOutputPath: 'dist/server',
        staticOutputPath: 'dist/client',
        handlerFileName: 'server.js',
        staticAssetPrefix: 'assets',
        wrapperType: 'tanstack-fetch',
        fallbackOutputVariants: [
          {
            serverOutputPath: 'dist/server',
            staticOutputPath: 'dist/client',
            handlerFileName: 'index.js',
            staticAssetPrefix: 'assets',
            wrapperType: 'tanstack-fetch'
          }
        ]
      },
      environmentVars: [],
      archiveItem: async ({ absoluteSourcePath, absoluteDestDirPath }) => {
        expect(await Bun.file(join(absoluteSourcePath, 'index.js')).exists()).toBe(true);
        expect(await Bun.file(join(absoluteSourcePath, 'server.js')).exists()).toBe(false);
        expect(await readFile(join(absoluteSourcePath, 'index-wrap.mjs'), 'utf8')).toContain('import("./index.js")');
        const { handler } = await import(
          `${pathToFileURL(join(absoluteSourcePath, 'index-wrap.mjs')).href}?test=${Date.now()}`
        );
        const response = await handler({
          version: '2.0',
          requestContext: { http: { method: 'GET' } },
          rawPath: '/',
          rawQueryString: '',
          headers: {}
        });
        expect(response.statusCode).toBe(200);
        expect(response.isBase64Encoded).toBe(true);
        expect(Buffer.from(response.body, 'base64').toString('utf8')).toBe('ok');
        inspectedArchive = true;
        if (absoluteDestDirPath === undefined) throw new Error('Expected an archive destination.');
        await mkdir(absoluteDestDirPath, { recursive: true });
        const archivePath = join(absoluteDestDirPath, 'rsbuild-start.zip');
        await writeFile(archivePath, 'zip');
        return archivePath;
      },
      createPackagingError: ({ message, cause }) => new Error(message, { cause }),
      executeProcess: async () => {
        await mkdir(join(applicationRoot, 'dist', 'server'), { recursive: true });
        await mkdir(join(applicationRoot, 'dist', 'client'), { recursive: true });
        await writeFile(
          join(applicationRoot, 'dist', 'server', 'index.js'),
          'export default { async fetch() { return new Response("ok"); } };'
        );
        await writeFile(join(applicationRoot, 'dist', 'client', 'asset.txt'), 'public');
        return { stdout: '', stderr: '', exitCode: 0 };
      }
    });

    expect(inspectedArchive).toBe(true);
    expect(outputs).toHaveLength(1);
    expect(outputs[0]?.outcome).toBe('bundled');
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
