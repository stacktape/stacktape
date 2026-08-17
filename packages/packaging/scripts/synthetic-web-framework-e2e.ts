import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSsrWebArtifacts } from '../src/web/ssr-web-shared';
import type { ExecuteProcess } from '../src/runtime-contracts';
import {
  archiveItem,
  createPackagingError,
  invokeNodeHandlerInLambdaImage,
  progressLogger,
  run,
  runDocker,
  write
} from './e2e-helpers';

const root = await mkdtemp(join(tmpdir(), 'stacktape-web-framework-e2e-'));
const appsRoot = join(root, 'apps');
const buildRoot = join(root, 'build');

const executeProcess: ExecuteProcess = async (command, args, options) => {
  const env = options.env
    ? Object.fromEntries(Object.entries(options.env).map(([key, value]) => [key, String(value)]))
    : undefined;
  return run(command, args, options.cwd, env);
};

const event = ({
  rawPath = '/',
  rawQueryString = ''
}: {
  rawPath?: string;
  rawQueryString?: string;
} = {}) => ({
  version: '2.0',
  routeKey: '$default',
  rawPath,
  rawQueryString,
  headers: {
    host: 'internal.lambda-url.aws',
    'x-forwarded-host': 'public.example.com',
    'x-forwarded-proto': 'https'
  },
  cookies: ['request-cookie=present'],
  requestContext: {
    http: { method: 'GET', path: rawPath, protocol: 'HTTP/1.1' }
  },
  isBase64Encoded: false
});

const assertLambdaZip = (output: { outcome: string; size: number | null; zippedSize?: number | undefined }) => {
  if (
    output.outcome !== 'bundled' ||
    output.size === null ||
    output.size >= 250 ||
    output.zippedSize === undefined ||
    output.zippedSize >= 50
  ) {
    throw new Error(`Expected a deployable Lambda artifact below exact limits: ${JSON.stringify(output)}`);
  }
};

try {
  await run('docker', ['version', '--format', '{{.Server.Version}}']);
  await write(
    join(root, 'package.json'),
    `${JSON.stringify({
      name: 'stacktape-web-framework-e2e',
      private: true,
      packageManager: 'pnpm@11.17.0'
    })}\n`
  );
  await write(
    join(root, 'pnpm-workspace.yaml'),
    [
      'packages:',
      '  - "apps/*"',
      'onlyBuiltDependencies:',
      '  - esbuild',
      '  - sharp',
      "  - '@astrojs/compiler'",
      "  - '@parcel/watcher'",
      ''
    ].join('\n')
  );

  const astroRoot = join(appsRoot, 'astro');
  await write(
    join(astroRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'synthetic-astro',
        private: true,
        type: 'module',
        scripts: { build: 'astro build' },
        dependencies: {
          '@astrojs/node': '11.1.2',
          astro: '7.2.2'
        }
      },
      null,
      2
    )}\n`
  );
  await write(
    join(astroRoot, 'astro.config.mjs'),
    [
      'import { defineConfig } from "astro/config";',
      'import node from "@astrojs/node";',
      'export default defineConfig({ output: "server", adapter: node({ mode: "middleware" }) });',
      ''
    ].join('\n')
  );
  await write(
    join(astroRoot, 'src', 'pages', 'index.astro'),
    [
      '---',
      'import { Image } from "astro:assets";',
      'import pixel from "../pixel.png";',
      'Astro.cookies.set("astro-secure", "ok", { path: "/", httpOnly: true, secure: true });',
      'const requestCookie = Astro.cookies.get("request-cookie")?.value ?? "missing";',
      '---',
      '<p id="marker">ASTRO_FINAL_OK|{Astro.url.href}|request-cookie={requestCookie}</p>',
      '<Image src={pixel} width={1} height={1} alt="pixel" />',
      ''
    ].join('\n')
  );
  await write(
    join(astroRoot, 'src', 'pixel.png'),
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    )
  );

  const svelteRoot = join(appsRoot, 'svelte');
  await write(
    join(svelteRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'synthetic-svelte',
        private: true,
        type: 'module',
        scripts: { build: 'vite build' },
        dependencies: { 'left-pad': '1.3.0' },
        devDependencies: {
          '@sveltejs/adapter-node': '5.5.7',
          '@sveltejs/kit': '2.70.2',
          svelte: '5.56.9',
          vite: '8.2.1'
        }
      },
      null,
      2
    )}\n`
  );
  await write(
    join(svelteRoot, 'svelte.config.js'),
    'import adapter from "@sveltejs/adapter-node"; export default { kit: { adapter: adapter() } };\n'
  );
  await write(
    join(svelteRoot, 'vite.config.js'),
    'import { sveltekit } from "@sveltejs/kit/vite"; import { defineConfig } from "vite"; export default defineConfig({ plugins: [sveltekit()] });\n'
  );
  await write(
    join(svelteRoot, 'src', 'app.html'),
    '<!doctype html><html><head>%sveltekit.head%</head><body><div style="display: contents">%sveltekit.body%</div></body></html>\n'
  );
  await write(
    join(svelteRoot, 'src', 'routes', '+page.server.js'),
    [
      'export const load = async ({ cookies, url }) => {',
      '  const packageName = process.env.DYNAMIC_PACKAGE ?? "left-pad";',
      '  const loaded = await import(/* @vite-ignore */ packageName);',
      '  const pad = loaded.default ?? loaded;',
      '  cookies.set("svelte", "ok", { path: "/", httpOnly: true, secure: true, sameSite: "lax" });',
      '  return { padded: pad("x", 3, "0"), url: url.href, requestCookie: cookies.get("request-cookie") };',
      '};',
      ''
    ].join('\n')
  );
  await write(
    join(svelteRoot, 'src', 'routes', '+page.svelte'),
    '<script>let { data } = $props();</script><p>DYNAMIC_LEFT_PAD:{data.padded}|{data.url}|{data.requestCookie}</p>\n'
  );

  console.log('Installing pinned Astro and SvelteKit synthetic workspaces...');
  try {
    await run('pnpm', ['install', '--prefer-offline'], root);
  } catch (error) {
    if (!String(error).includes('ERR_PNPM_IGNORED_BUILDS')) throw error;
    // pnpm 11 can require an explicit approval pass even when the workspace allowlist is already present.
    await run('pnpm', ['approve-builds', '--all'], root);
    await run('pnpm', ['rebuild'], root);
  }

  console.log('Building, zipping, and invoking Astro middleware with its default image optimizer...');
  const astroOutputs = await createSsrWebArtifacts({
    resourceName: 'synthetic-astro',
    resourceType: 'astro-web',
    serverFunctionName: 'synthetic-astro-server',
    distFolderPath: join(buildRoot, 'astro'),
    cwd: root,
    progressLogger,
    createProgressLogger: () => progressLogger,
    buildConfig: {
      buildCommand: 'astro build',
      bundledApplicationPackages: ['astro', '@astrojs/node'],
      copyStaticAssetsToServerDirectory: 'client',
      workingDir: astroRoot,
      serverOutputPath: 'dist/server',
      staticOutputPath: 'dist/client',
      handlerFileName: 'entry.mjs',
      adapterConfigurationHint: "Configure astro.config with output: 'server' and @astrojs/node in middleware mode.",
      preserveServerOutputDirectory: true,
      requiredAdapterPackages: ['@astrojs/node'],
      nativeRuntimePackages: [{ name: 'sharp', resolveFromPackage: 'astro' }],
      traceBasePath: root,
      staticAssetPrefix: '_astro',
      wrapperType: 'node-http'
    },
    environmentVars: [],
    existingDigests: [],
    archiveItem,
    createPackagingError,
    executeProcess,
    runDocker,
    nativeDependencyInstallationRootPath: join(buildRoot, 'native-installations'),
    dockerBuildOutputArchitecture: 'linux/amd64'
  });
  const astroOutput = astroOutputs[0];
  if (!astroOutput) throw new Error('Astro did not emit a server artifact.');
  assertLambdaZip(astroOutput);
  const astroFunctionPath = join(buildRoot, 'astro', 'server-function');
  const astroPage = await invokeNodeHandlerInLambdaImage({
    functionPath: astroFunctionPath,
    event: event({ rawQueryString: 'q=hello%20astro' })
  });
  if (
    astroPage.statusCode !== 200 ||
    !astroPage.body.includes('ASTRO_FINAL_OK|https://public.example.com/?q=hello%20astro|request-cookie=present') ||
    !astroPage.cookies?.some((cookie) => cookie.startsWith('astro-secure=ok;'))
  ) {
    throw new Error(`Unexpected Astro page response: ${JSON.stringify(astroPage)}`);
  }
  const imageUrl = astroPage.body.match(/src="([^"]*\/_image\?[^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
  if (!imageUrl) {
    throw new Error(`Astro did not emit an image optimizer URL: ${astroPage.body}`);
  }
  const parsedImageUrl = new URL(imageUrl, 'https://public.example.com');
  const astroImage = await invokeNodeHandlerInLambdaImage({
    functionPath: astroFunctionPath,
    event: event({
      rawPath: parsedImageUrl.pathname,
      rawQueryString: parsedImageUrl.search.slice(1)
    })
  });
  if (
    astroImage.statusCode !== 200 ||
    astroImage.headers['content-type'] !== 'image/webp' ||
    astroImage.isBase64Encoded !== true ||
    Buffer.from(astroImage.body, 'base64').byteLength === 0
  ) {
    throw new Error(`Astro image optimization failed in Lambda Node 24: ${JSON.stringify(astroImage)}`);
  }

  console.log('Building, zipping, and invoking nested pnpm SvelteKit with a runtime-selected dependency...');
  const svelteOutputs = await createSsrWebArtifacts({
    resourceName: 'synthetic-svelte',
    resourceType: 'sveltekit-web',
    serverFunctionName: 'synthetic-svelte-server',
    distFolderPath: join(buildRoot, 'svelte'),
    cwd: root,
    progressLogger,
    createProgressLogger: () => progressLogger,
    buildConfig: {
      buildCommand: 'vite build',
      workingDir: svelteRoot,
      serverOutputPath: 'build',
      staticOutputPath: 'build/client',
      handlerFileName: 'handler.js',
      adapterConfigurationHint:
        'Configure svelte.config.js to use @sveltejs/adapter-node instead of @sveltejs/adapter-auto.',
      requiredAdapterPackages: ['@sveltejs/adapter-node'],
      traceBasePath: root,
      staticAssetPrefix: '_app',
      wrapperType: 'node-http'
    },
    environmentVars: [],
    existingDigests: [],
    archiveItem,
    createPackagingError,
    executeProcess
  });
  const svelteOutput = svelteOutputs[0];
  if (!svelteOutput) throw new Error('SvelteKit did not emit a server artifact.');
  assertLambdaZip(svelteOutput);
  if ((svelteOutput.zippedSize ?? Number.POSITIVE_INFINITY) >= 5) {
    throw new Error(`The trivial SvelteKit pnpm artifact regressed above 5 MiB: ${JSON.stringify(svelteOutput)}`);
  }
  const svelteResponse = await invokeNodeHandlerInLambdaImage({
    functionPath: join(buildRoot, 'svelte', 'server-function'),
    event: event({ rawQueryString: 'q=hello%20svelte' }),
    environment: { DYNAMIC_PACKAGE: 'left-pad' }
  });
  if (
    svelteResponse.statusCode !== 200 ||
    !svelteResponse.body.includes('DYNAMIC_LEFT_PAD:00x|https://public.example.com/?q=hello%20svelte|present') ||
    !svelteResponse.cookies?.some((cookie) => cookie.startsWith('svelte=ok;'))
  ) {
    throw new Error(`Unexpected SvelteKit Lambda response: ${JSON.stringify(svelteResponse)}`);
  }

  console.table([
    {
      framework: 'Astro 7 + sharp image optimizer',
      uncompressedMiB: astroOutput.size,
      zippedMiB: astroOutput.zippedSize
    },
    {
      framework: 'SvelteKit 2 + dynamic dependency',
      uncompressedMiB: svelteOutput.size,
      zippedMiB: svelteOutput.zippedSize
    }
  ]);
  console.log('Synthetic framework E2E passed with real builds, real ZIPs, and official Lambda Node 24 execution.');
} finally {
  await rm(root, { recursive: true, force: true });
}
