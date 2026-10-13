import { expect, test } from 'bun:test';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildHostingBucket } from '@stacktape/packaging/web/hosting-bucket-build';
import { assertProcessSucceeded, runProcess } from '../../scripts/qualification/process';

test('a nested static project builds chained commands and serves its deep page and compiled asset', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-static-build-'));
  let server: ReturnType<typeof Bun.serve> | undefined;
  try {
    await cp(join(import.meta.dir, 'fixtures/site'), join(root, 'frontend'), { recursive: true });
    await buildHostingBucket({
      name: 'website',
      cwd: root,
      build: { workingDirectory: 'frontend', command: 'bun run prepare-site && bun run build' },
      progressLogger: { eventContext: {}, startEvent() {}, updateEvent() {}, finishEvent() {} },
      createPackagingError: ({ message }) => new Error(message),
      executeProcess: async (command, args, options) => {
        const result = await runProcess({
          command,
          args,
          cwd: options.cwd ?? root,
          // The fixture has no dependencies or provider access; give its build only the tools it needs.
          env: { PATH: process.env.PATH },
          timeoutMs: 20_000
        });
        assertProcessSucceeded(result);
        return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode ?? 1 };
      }
    });
    const output = join(root, 'frontend/dist');
    // Serve only the built directory. This verifies artifact paths, not CloudFront's routing or a browser runtime.
    server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch(request) {
        const pathname = new URL(request.url).pathname;
        const file = Bun.file(join(output, pathname.endsWith('/') ? `${pathname}index.html` : pathname));
        return (await file.exists()) ? new Response(file) : new Response('Missing', { status: 404 });
      }
    });
    const home = await fetch(new URL('/', server.url));
    expect(home.status).toBe(200);
    expect(await home.text()).toContain('<h1>Static home</h1>');
    const deepPage = await fetch(new URL('/docs/getting-started/', server.url));
    expect(deepPage.status).toBe(200);
    const html = await deepPage.text();
    expect(html).toContain('<h1>Getting started</h1>');
    const assetPath = html.match(/src="([^"]+)"/)?.[1];
    expect(assetPath).toBe('/static/app.js');
    const asset = await fetch(new URL(assetPath!, server.url));
    expect(asset.status).toBe(200);
    expect(asset.headers.get('content-type')).toContain('javascript');
    expect(await asset.text()).toContain('static-release-one');
    expect((await fetch(new URL('/missing.js', server.url))).status).toBe(404);
  } finally {
    await server?.stop(true);
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
