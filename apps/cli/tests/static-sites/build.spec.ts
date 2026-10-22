import { expect, test } from 'bun:test';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildHostingBucket } from '@stacktape/packaging/web/hosting-bucket-build';
import { assertProcessSucceeded, runProcess } from '../../scripts/qualification/process';

type FinishedEvent = { eventType: string; finalMessage?: string; status?: string };

/** Runs the real build module on a copy of the fixture, with the product's own process environment. */
const buildFixtureSite = async ({ root, command }: { root: string; command: string }) => {
  const finished: FinishedEvent[] = [];
  await cp(join(import.meta.dir, 'fixtures/site'), join(root, 'frontend'), { recursive: true });
  const result = buildHostingBucket({
    name: 'website',
    cwd: root,
    build: { workingDirectory: 'frontend', command },
    progressLogger: {
      eventContext: {},
      startEvent() {},
      updateEvent() {},
      finishEvent(event) {
        finished.push(event as FinishedEvent);
      }
    },
    createPackagingError: ({ message }) => new Error(message),
    executeProcess: async (command, args, options) => {
      const result = await runProcess({
        command,
        args,
        cwd: options.cwd ?? root,
        // The environment the product prepared for the build, as the CLI's process runner passes it on.
        env: options.env as Record<string, string>,
        timeoutMs: 20_000
      });
      assertProcessSucceeded(result);
      return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode ?? 1 };
    }
  });
  return { result, finished };
};

test('a nested static project builds chained commands and serves its deep page and compiled asset', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-static-build-'));
  let server: ReturnType<typeof Bun.serve> | undefined;
  // A customer's build reads deploy-time variables (`VITE_*`, `PUBLIC_*`) from the environment the CLI runs in.
  process.env.STATIC_SITE_CHANNEL = 'preview-channel';
  try {
    const { result } = await buildFixtureSite({ root, command: 'bun run prepare-site && bun run build' });
    await result;
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
    const homeHtml = await home.text();
    expect(homeHtml).toContain('<h1>Static home</h1>');
    expect(homeHtml).toContain('<meta name="channel" content="preview-channel">');
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
    delete process.env.STATIC_SITE_CHANNEL;
    await server?.stop(true);
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test('a failing build command stops packaging with the build output instead of publishing stale files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-static-build-failure-'));
  try {
    const { result, finished } = await buildFixtureSite({
      root,
      command: `bun run prepare-site && bun -e "console.error('Cannot resolve ./release'); process.exit(2)"`
    });
    await expect(result).rejects.toThrow(/Failed to build hosting bucket "website"[\s\S]*Cannot resolve \.\/release/);
    expect(finished).toContainEqual(expect.objectContaining({ eventType: 'BUILD_HOSTING_BUCKET', status: 'error' }));
    expect(await Bun.file(join(root, 'frontend/dist/index.html')).exists()).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
