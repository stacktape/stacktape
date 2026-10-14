/**
 * The SSR starters, packaged by the CLI's own `package` command, answer requests in the Lambda runtime.
 *
 * One pinned real build per adapter: the Astro, Nuxt, SolidStart, SvelteKit, TanStack Start, Remix and Next.js
 * starters that ship with the CLI. Each is materialized as `stacktape init` writes it, then its committed manifest and
 * lockfile are put back (materialization drops lockfiles and rewrites the manifest), so the CLI's frozen install
 * resolves exactly the committed versions; the framework version installed must equal the lockfile's. The source CLI
 * runs `package` as a child process in an isolated home with every AWS and Stacktape request routed to the offline
 * guard; the CLI installs the dependencies and runs the framework's build itself. The server function ZIP is
 * extracted with `unzip` and invoked in the official Lambda Node.js 22 image, the runtime every SSR server function
 * deploys with, as an unprivileged user that owns none of the files, with HTTP API v2 events as the gateway sends them: the index page must be HTML, the starter's dynamic
 * API route must answer with its message, and an unknown path must get the framework's not-found status. The index
 * request carries a cookie as a browser would. Temporary Next, Nuxt and Remix routes exercise two response cookies
 * and feed them back into the next request; a temporary TanStack route reads a dynamic path parameter. Next also
 * executes its image optimizer ZIP and must inline the resource's `NEXT_PUBLIC_` environment at build time. The build
 * must leave hashed static assets for the hosting bucket (for Next, under the `_assets` prefix its CDN route reads) and
 * no temporary files in the application.
 *
 * It needs Docker, `unzip`, the local Lambda Node.js 22 image (pulled when missing) and network access for the
 * starters' dependency installs; it contacts no AWS service.
 *
 *   bun scripts/packaging-archives/ssr-web-acceptance.ts [--starter <id>[,<id>...]] [--out <new or empty directory>]
 *     [--keep]
 */
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { generateStarterProject } from '../generate-starter-project';
import { startOfflineAwsServer } from '../qualification/offline-aws';
import { outputTail } from '../qualification/process';
import { writeJsonAtomic } from '../qualification/report';
import { cliDirectory, ensureDevCliArtifacts, packageWithSourceCli } from '../qualification/source-cli-packaging';
import { replacePlaceholdersInStacktapeConfig } from '../starter-projects/utils';
import { parseDocument } from 'yaml';
import { ensureLambdaImage, extractZip, invokeInLambdaRuntime, listLeftoverContainers } from './lambda-runtime';

type Adapter = {
  starter: string;
  resourceType: string;
  /** A route rendered by server code, not a static file. */
  dynamicRoute?: { path: string; expectedText: string };
  /**
   * Whether the starter's build emits hashed client assets for the hosting bucket. The Astro starter is a single
   * page without styles or client scripts, so its build leaves none.
   */
  expectsAssets: boolean;
  /**
   * What the framework answers for a path no route matches. SolidStart renders the application shell with 200
   * unless the application declares a catch-all route, which the starter does not.
   */
  unknownRouteStatus?: number;
  /** The framework package whose installed version must equal the committed lockfile's. */
  frameworkPackage: string;
};

const ADAPTERS: Adapter[] = [
  {
    starter: 'astro-serverless',
    frameworkPackage: 'astro',
    resourceType: 'astro-web',
    dynamicRoute: { path: '/api/hello', expectedText: 'Hello from Astro API route on Lambda!' },
    expectsAssets: false
  },
  {
    starter: 'nuxt-serverless',
    frameworkPackage: 'nuxt',
    resourceType: 'nuxt-web',
    dynamicRoute: { path: '/api/hello', expectedText: 'Hello from Nuxt API route on Lambda!' },
    expectsAssets: true
  },
  {
    starter: 'solidstart-serverless',
    frameworkPackage: '@solidjs/start',
    resourceType: 'solidstart-web',
    dynamicRoute: { path: '/api/hello', expectedText: 'Hello from SolidStart API route on Lambda!' },
    expectsAssets: true,
    unknownRouteStatus: 200
  },
  {
    starter: 'sveltekit-serverless',
    frameworkPackage: '@sveltejs/kit',
    resourceType: 'sveltekit-web',
    dynamicRoute: { path: '/api/hello', expectedText: 'Hello from SvelteKit API route on Lambda!' },
    expectsAssets: true
  },
  {
    starter: 'tanstack-start-serverless',
    frameworkPackage: '@tanstack/start',
    resourceType: 'tanstack-web',
    dynamicRoute: { path: '/probe/t13', expectedText: 'TANSTACK_DYNAMIC:t13' },
    expectsAssets: true
  },
  {
    starter: 'remix-serverless',
    frameworkPackage: '@remix-run/node',
    resourceType: 'remix-web',
    dynamicRoute: { path: '/api/hello', expectedText: 'Hello from Remix API route on Lambda!' },
    expectsAssets: true
  },
  {
    starter: 'nextjs-serverless',
    frameworkPackage: 'next',
    resourceType: 'nextjs-web',
    dynamicRoute: { path: '/api/hello', expectedText: 'Hello from Next.js API route on Lambda!' },
    expectsAssets: true
  },
  {
    starter: 'nextjs-saas',
    frameworkPackage: 'next',
    resourceType: 'nextjs-web',
    dynamicRoute: { path: '/api/health', expectedText: 'healthy' },
    expectsAssets: true
  }
];

const keep = process.argv.includes('--keep');
const outIndex = process.argv.indexOf('--out');
const out = resolve(
  outIndex === -1
    ? join(cliDirectory, '.stacktape', 'ssr-web-acceptance', new Date().toISOString().replace(/[:.]/g, '-'))
    : process.argv[outIndex + 1]!
);
const starterIndex = process.argv.indexOf('--starter');
const selectedStarters =
  starterIndex === -1 ? ADAPTERS.map((adapter) => adapter.starter) : process.argv[starterIndex + 1]!.split(',');
const unknown = selectedStarters.filter((starter) => !ADAPTERS.some((adapter) => adapter.starter === starter));
if (unknown.length > 0) throw new Error(`Unknown SSR starter(s): ${unknown.join(', ')}.`);

/** `nodejs22.x`, the runtime `ssr-webs.ts` and `nextjs-webs.ts` give every SSR server and image function. */
const LAMBDA_IMAGE = 'public.ecr.aws/lambda/nodejs:22';
const NEXT_PUBLIC_PROBE = 'inlined-at-build-t13';

const checks: { starter: string; check: string; ok: boolean; detail: string }[] = [];
const check = (starter: string, name: string, ok: boolean, detail: string) => {
  checks.push({ starter, check: name, ok, detail });
  console.log(`${ok ? 'ok    ' : 'FAILED'}  ${starter}: ${name} — ${outputTail(detail, 300)}`);
};

/** An HTTP API v2 event, as API Gateway or a function URL sends it. */
const httpEvent = ({ path, cookies = [] }: { path: string; cookies?: string[] }) => ({
  version: '2.0',
  routeKey: '$default',
  rawPath: path,
  rawQueryString: '',
  headers: {
    host: 'internal.lambda-url.aws',
    'x-forwarded-host': 'public.example.com',
    'x-forwarded-proto': 'https',
    accept: 'text/html,application/json;q=0.9,*/*;q=0.8'
  },
  ...(cookies.length > 0 ? { cookies } : {}),
  requestContext: {
    accountId: '123456789012',
    apiId: 'acceptance',
    domainName: 'internal.lambda-url.aws',
    domainPrefix: 'internal',
    http: { method: 'GET', path, protocol: 'HTTP/1.1', sourceIp: '127.0.0.1', userAgent: 'ssr-web-acceptance' },
    requestId: `req-${Math.random().toString(36).slice(2, 10)}`,
    routeKey: '$default',
    stage: '$default',
    time: new Date().toUTCString(),
    timeEpoch: Date.now()
  },
  isBase64Encoded: false
});

type HttpResponse = {
  statusCode?: number;
  headers?: Record<string, string>;
  cookies?: string[];
  body?: string;
  isBase64Encoded?: boolean;
  errorMessage?: string;
};

const decodeBody = (response: HttpResponse) =>
  response.isBase64Encoded && response.body
    ? Buffer.from(response.body, 'base64').toString('utf8')
    : (response.body ?? '');

const headerOf = (response: HttpResponse, name: string) =>
  Object.entries(response.headers ?? {}).find(([key]) => key.toLowerCase() === name)?.[1];

/** Lists files under a directory (relative paths), at most `limit` entries, for reports and asset checks. */
const listFiles = async (directory: string, limit = 5_000) => {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(directory.length + 1))
    .toSorted()
    .slice(0, limit);
};

/**
 * Puts the starter's committed `package.json` and lockfile back into a materialized copy, so the install is the
 * committed one. `package-lock.json` is preferred; a starter with only `bun.lock` installs with Bun. Returns the
 * lockfile name, or `undefined` when the starter commits none (the build then resolves its version ranges).
 */
const restoreCommittedLockfile = async ({ starter, project }: { starter: string; project: string }) => {
  const source = join(cliDirectory, 'starter-projects', starter);
  for (const lockfile of ['package-lock.json', 'bun.lock']) {
    const exists = await stat(join(source, lockfile)).then(
      () => true,
      () => false
    );
    if (!exists) continue;
    await cp(join(source, 'package.json'), join(project, 'package.json'));
    await cp(join(source, lockfile), join(project, lockfile));
    // The committed manifest has no `stacktape` package (materialization adds it), and a framework's type check would
    // fail on the TypeScript config's import of it; this lane packages the YAML config.
    await rm(join(project, 'stacktape.ts'), { force: true });
    return lockfile;
  }
  return undefined;
};

const installedVersion = async (packageDirectory: string) => {
  try {
    return (JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8')) as { version?: string }).version;
  } catch {
    return undefined;
  }
};

/** The version a lockfile pins for a package; `undefined` for a lockfile format this does not read (bun.lock). */
const lockedVersion = async ({ project, lockfile, name }: { project: string; lockfile: string; name: string }) => {
  if (lockfile !== 'package-lock.json') return undefined;
  const lock = JSON.parse(await readFile(join(project, lockfile), 'utf8')) as {
    packages?: Record<string, { version?: string }>;
  };
  return lock.packages?.[`node_modules/${name}`]?.version;
};

/** Add probes only to the materialized copy; the shipped starter and its pinned dependencies stay intact. */
const addRuntimeProbes = async (starter: string, project: string) => {
  const write = async (path: string, contents: string | Buffer) => {
    await mkdir(dirname(join(project, path)), { recursive: true });
    await writeFile(join(project, path), contents);
  };
  if (starter === 'nextjs-serverless' || starter === 'nextjs-saas') {
    // Next inlines NEXT_PUBLIC_ values when it builds; the Lambda invocation below does not set them.
    const config = parseDocument(await readFile(join(project, 'stacktape.yml'), 'utf8'));
    config.setIn(
      ['resources', 'web', 'properties', 'environment'],
      [{ name: 'NEXT_PUBLIC_STP_PROBE', value: NEXT_PUBLIC_PROBE }]
    );
    await writeFile(join(project, 'stacktape.yml'), config.toString());
    if (starter === 'nextjs-saas') {
      // Force sharp's host lifecycle script to fail regardless of download/cache availability. OpenNext swallows
      // that error and emits no sharp package. Stacktape must skip host scripts and build it for Lambda instead.
      await write(
        'open-next.config.ts',
        `export default { default: { runtime: 'node' }, imageOptimization: { install: { packages: ['sharp@0.32.6'], additionalArgs: '--arch=unsupported --target=invalid' } } };\n`
      );
    }
    await write(
      'next.config.ts',
      `export default { images: { remotePatterns: [{ protocol: 'http', hostname: '127.0.0.1' }] } };\n`
    );
    await write(
      'src/app/api/session/route.ts',
      `import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export function GET(request: NextRequest) {
  const response = NextResponse.json({ session: request.cookies.get('session')?.value ?? 'missing', theme: request.cookies.get('theme')?.value ?? 'missing', build: process.env.NEXT_PUBLIC_STP_PROBE ?? 'missing' });
  response.cookies.set('session', 't13', { path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
  response.cookies.set('theme', 'dark', { path: '/', secure: true, sameSite: 'lax' });
  return response;
}
`
    );
  } else if (starter === 'nuxt-serverless') {
    await write(
      'server/api/session.get.ts',
      `import { defineEventHandler, getCookie, setCookie } from 'h3';
export default defineEventHandler(event => {
  const session = getCookie(event, 'session') ?? 'missing';
  const theme = getCookie(event, 'theme') ?? 'missing';
  setCookie(event, 'session', 't13', { path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
  setCookie(event, 'theme', 'dark', { path: '/', secure: true, sameSite: 'lax' });
  return { session, theme };
});
`
    );
  } else if (starter === 'remix-serverless') {
    await write(
      'app/routes/api.session.ts',
      `import { createCookie, json } from '@remix-run/node';
const session = createCookie('session', { path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
const theme = createCookie('theme', { path: '/', secure: true, sameSite: 'lax' });
export async function loader({ request }: { request: Request }) {
  const headers = new Headers();
  headers.append('Set-Cookie', await session.serialize('t13'));
  headers.append('Set-Cookie', await theme.serialize('dark'));
  return json({ session: await session.parse(request.headers.get('Cookie')) ?? 'missing', theme: await theme.parse(request.headers.get('Cookie')) ?? 'missing' }, { headers });
}
`
    );
  } else if (starter === 'tanstack-start-serverless') {
    await write(
      'app/routes/probe.$value.tsx',
      `import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/probe/$value')({
  loader: ({ params }) => ({ value: params.value }),
  component: () => <p>{'TANSTACK_DYNAMIC:' + Route.useLoaderData().value}</p>
});
`
    );
  }
};

const runAdapter = async ({ adapter, work }: { adapter: Adapter; work: string }) => {
  const { starter } = adapter;
  const runtimeImage = LAMBDA_IMAGE;
  const caseWork = join(work, starter);
  const project = join(caseWork, starter);
  const report: Record<string, unknown> = { starter, resourceType: adapter.resourceType };
  const invocationDirectories: string[] = [];
  let functionDirectory: string | undefined;
  try {
    await mkdir(caseWork, { recursive: true });
    await generateStarterProject({ starterProjectId: starter, outputDirPath: caseWork, mode: 'app' });
    const configPath = join(project, 'stacktape.yml');
    await replacePlaceholdersInStacktapeConfig({ configPath });
    const lockfile = await restoreCommittedLockfile({ starter, project });
    report.lockfile = lockfile;
    await addRuntimeProbes(starter, project);
    check(starter, 'the starter commits a lockfile to pin its build', lockfile !== undefined, lockfile ?? 'none');

    console.log(`${starter}: packaging with the source CLI...`);
    const offlineServer = await startOfflineAwsServer();
    let packaged: Awaited<ReturnType<typeof packageWithSourceCli>>;
    try {
      packaged = await packageWithSourceCli({
        label: starter,
        projectName: `ssr-${starter}`.slice(0, 40),
        projectRoot: project,
        configPath,
        templatePath: join(out, `${starter}-template.yml`),
        offlineServer,
        command: 'package'
      });
    } finally {
      await offlineServer.close();
    }
    const leftovers = (await readdir(project)).filter((entry) => entry.startsWith('stp-'));
    check(
      starter,
      'packaging leaves no temporary file in the application',
      leftovers.length === 0,
      leftovers.join(', ') || 'none'
    );
    const installed = await installedVersion(join(project, 'node_modules', adapter.frameworkPackage));
    const locked =
      lockfile === undefined ? undefined : await lockedVersion({ project, lockfile, name: adapter.frameworkPackage });
    report.frameworkVersion = { installed, locked };
    check(
      starter,
      `the build used the committed lockfile's ${adapter.frameworkPackage}`,
      installed !== undefined && (locked === undefined ? lockfile !== undefined : installed === locked),
      `installed=${String(installed)} locked=${String(locked)}`
    );
    const workloads = packaged.details.packagedWorkloads as {
      jobName?: unknown;
      digest?: unknown;
      artifactPath?: unknown;
    }[];
    report.workloads = workloads;
    const zips = workloads.filter(
      (workload): workload is { jobName: string; digest: string; artifactPath: string } =>
        typeof workload.jobName === 'string' &&
        typeof workload.artifactPath === 'string' &&
        workload.artifactPath.endsWith('.zip')
    );
    const serverFunction = zips.find((workload) => /server/i.test(workload.jobName)) ?? zips[0];
    check(
      starter,
      'the CLI packaged a server function ZIP',
      serverFunction !== undefined,
      zips.map((zip) => zip.jobName).join(', ') || 'no ZIP'
    );
    if (!serverFunction) return;
    // `<invocation>/build/<resourceType>/<resourceName>/serverFunction/<zip>`.
    const resourceDirectory = dirname(dirname(serverFunction.artifactPath));
    let buildDirectory = resourceDirectory;
    while (basename(buildDirectory) !== 'build' && dirname(buildDirectory) !== buildDirectory) {
      buildDirectory = dirname(buildDirectory);
    }
    invocationDirectories.push(dirname(buildDirectory));
    const zipBytes = (await stat(serverFunction.artifactPath)).size;
    check(
      starter,
      'the server function ZIP is within the Lambda limit',
      zipBytes > 0 && zipBytes < 250 * 1024 * 1024,
      `${zipBytes} bytes`
    );

    // What the deployment uploads to the hosting bucket; the Next.js build names it the same way.
    const assetFiles = await listFiles(join(resourceDirectory, 'bucket-content'));
    report.resourceDirectoryEntries = await readdir(resourceDirectory).catch(() => []);
    report.assetFiles = assetFiles.slice(0, 50);
    if (adapter.expectsAssets) {
      check(
        starter,
        'the build left hashed static assets for the hosting bucket',
        assetFiles.some((file) => /[.-][0-9a-zA-Z_-]{6,}\.(m?js|css)$/.test(file)),
        `${assetFiles.length} file(s) under bucket-content: ${assetFiles.slice(0, 5).join(', ')}`
      );
    }
    if (adapter.resourceType === 'nextjs-web') {
      check(
        starter,
        'Next static files are under the _assets prefix its CDN route reads',
        assetFiles.some((file) => file.startsWith('_assets/_next/static/')),
        assetFiles.slice(0, 5).join(', ')
      );
    }

    functionDirectory = await extractZip(serverFunction.artifactPath);
    const invoke = async (event: unknown) => {
      const invocation = await invokeInLambdaRuntime({
        functionDirectory: functionDirectory!,
        handler: 'index-wrap.handler',
        image: runtimeImage,
        event,
        timeoutMs: 120_000
      });
      const response = JSON.parse(invocation.body) as HttpResponse;
      if (invocation.status !== 200 || response.errorMessage !== undefined) {
        throw new Error(`Invocation failed: ${invocation.body}\n${invocation.logs.stdout}\n${invocation.logs.stderr}`);
      }
      return response;
    };

    const index = await invoke(httpEvent({ path: '/', cookies: ['j3-session=present'] }));
    const indexBody = decodeBody(index);
    report.index = { statusCode: index.statusCode, headers: index.headers, bodyStart: indexBody.slice(0, 300) };
    check(
      starter,
      'GET / renders the index page as HTML',
      index.statusCode === 200 &&
        (headerOf(index, 'content-type') ?? '').includes('text/html') &&
        /<html|<!doctype html/i.test(indexBody),
      `status=${String(index.statusCode)} content-type=${String(headerOf(index, 'content-type'))}`
    );

    if (adapter.dynamicRoute) {
      const dynamic = await invoke(httpEvent({ path: adapter.dynamicRoute.path }));
      const dynamicBody = decodeBody(dynamic);
      report.dynamic = { statusCode: dynamic.statusCode, headers: dynamic.headers, body: dynamicBody.slice(0, 300) };
      check(
        starter,
        `GET ${adapter.dynamicRoute.path} answers from server code`,
        dynamic.statusCode === 200 && dynamicBody.includes(adapter.dynamicRoute.expectedText),
        `status=${String(dynamic.statusCode)} body=${dynamicBody.slice(0, 120)}`
      );
    }

    if (starter === 'tanstack-start-serverless') {
      const alternate = await invoke(httpEvent({ path: '/probe/t42' }));
      check(
        starter,
        'a second path parameter changes the rendered page',
        alternate.statusCode === 200 && decodeBody(alternate).includes('TANSTACK_DYNAMIC:t42'),
        `status=${String(alternate.statusCode)} body=${decodeBody(alternate).slice(0, 120)}`
      );
    }

    if (['nextjs-serverless', 'nextjs-saas', 'nuxt-serverless', 'remix-serverless'].includes(starter)) {
      const first = await invoke(httpEvent({ path: '/api/session' }));
      const cookies = first.cookies ?? [];
      check(
        starter,
        'a new session emits two independent secure cookies',
        first.statusCode === 200 &&
          JSON.parse(decodeBody(first)).session === 'missing' &&
          cookies.length === 2 &&
          cookies.every((cookie) => /;\s*Secure/i.test(cookie) && /;\s*Path=\//i.test(cookie)) &&
          cookies.some((cookie) => cookie.startsWith('session=') && /;\s*HttpOnly/i.test(cookie)) &&
          cookies.some((cookie) => cookie.startsWith('theme=')),
        JSON.stringify(first)
      );
      const second = await invoke(
        httpEvent({ path: '/api/session', cookies: cookies.map((cookie) => cookie.split(';')[0]!) })
      );
      const body = JSON.parse(decodeBody(second)) as { session?: string; theme?: string; build?: string };
      check(
        starter,
        'the next request reads both response cookies',
        second.statusCode === 200 && body.session === 't13' && body.theme === 'dark',
        JSON.stringify(second)
      );
      report.session = { first, second };
      if (adapter.resourceType === 'nextjs-web') {
        check(
          starter,
          'the build inlined the resource NEXT_PUBLIC_ environment',
          body.build === NEXT_PUBLIC_PROBE,
          JSON.stringify(body)
        );
      }
    }

    if (adapter.resourceType === 'nextjs-web') {
      const imageZip = zips.find((workload) => /image/i.test(workload.jobName));
      if (!imageZip) throw new Error('Next did not package its image optimizer ZIP.');
      const imageDirectory = await extractZip(imageZip.artifactPath);
      try {
        // The original optimizer handles a real HTTP image source on loopback in the same Lambda container.
        // It exercises the packaged native sharp dependency without any AWS stand-in or external request.
        await writeFile(
          join(imageDirectory, 'probe.mjs'),
          `import { createServer } from 'node:http';
import { handler as optimize } from './index.mjs';
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
export const handler = async (event, context) => {
  const server = createServer((_req, res) => { res.setHeader('content-type', 'image/png'); res.end(pixel); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const query = { url: 'http://127.0.0.1:' + server.address().port + '/pixel.png', w: '64', q: '75' };
  try { return await optimize({ ...event, rawQueryString: new URLSearchParams(query).toString(), queryStringParameters: query }, context); }
  finally { await new Promise(resolve => server.close(resolve)); }
};
`
        );
        const invocation = await invokeInLambdaRuntime({
          functionDirectory: imageDirectory,
          handler: 'probe.handler',
          image: runtimeImage,
          event: { ...httpEvent({ path: '/_next/image' }), headers: { accept: 'image/webp' } },
          timeoutMs: 120_000
        });
        const response = JSON.parse(invocation.body) as HttpResponse;
        const bytes = Buffer.from(response.body ?? '', 'base64');
        check(
          starter,
          'the image optimizer ZIP converts PNG to WebP in Lambda',
          invocation.status === 200 &&
            response.statusCode === 200 &&
            response.isBase64Encoded === true &&
            headerOf(response, 'content-type') === 'image/webp' &&
            bytes.subarray(0, 4).toString() === 'RIFF' &&
            bytes.subarray(8, 12).toString() === 'WEBP',
          JSON.stringify(response)
        );
        report.image = response;
      } finally {
        await rm(imageDirectory, { recursive: true, force: true });
      }
    }

    const missing = await invoke(httpEvent({ path: '/this-route-does-not-exist-j3' }));
    report.missing = { statusCode: missing.statusCode, bodyStart: decodeBody(missing).slice(0, 200) };
    const unknownRouteStatus = adapter.unknownRouteStatus ?? 404;
    check(
      starter,
      `an unknown path answers ${unknownRouteStatus}`,
      missing.statusCode === unknownRouteStatus,
      `status=${String(missing.statusCode)}`
    );
  } catch (error) {
    check(
      starter,
      'the scenario completed',
      false,
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    );
  } finally {
    if (functionDirectory !== undefined) await rm(functionDirectory, { recursive: true, force: true });
    if (!keep) {
      await rm(caseWork, { recursive: true, force: true }).catch(() => undefined);
      await Promise.all(
        invocationDirectories.map((directory) => rm(directory, { recursive: true, force: true }).catch(() => undefined))
      );
    } else {
      report.kept = { caseWork, invocationDirectories };
    }
  }
  return report;
};

const main = async () => {
  await mkdir(out, { recursive: true });
  if ((await readdir(out)).length > 0) throw new Error(`Refusing to write into ${out}: it is not empty.`);
  await ensureDevCliArtifacts();
  const images = { [LAMBDA_IMAGE]: ensureLambdaImage(LAMBDA_IMAGE) };
  const work = await mkdtemp(join(tmpdir(), 'stacktape-ssr-web-acceptance-'));
  const reports: unknown[] = [];
  try {
    for (const adapter of ADAPTERS.filter((candidate) => selectedStarters.includes(candidate.starter))) {
      reports.push(await runAdapter({ adapter, work }));
      await writeJsonAtomic(join(out, 'report.json'), { out, images, work, starters: reports, checks });
    }
  } finally {
    const leftovers = listLeftoverContainers();
    check('all', 'no acceptance container is left behind', leftovers.length === 0, leftovers.join(', ') || 'none');
    if (!keep) await rm(work, { recursive: true, force: true }).catch(() => undefined);
    await writeJsonAtomic(join(out, 'report.json'), { out, images, work, starters: reports, checks });
  }
  const failed = checks.filter((entry) => !entry.ok);
  if (failed.length > 0) {
    throw new Error(
      `${failed.length} check(s) failed: ${failed.map((entry) => `${entry.starter}: ${entry.check}`).join('; ')}`
    );
  }
  console.log(`SSR web acceptance passed; report at ${join(out, 'report.json')}`);
};

void main().catch((error: unknown) => {
  console.error(outputTail(error instanceof Error ? (error.stack ?? error.message) : String(error), 12_000));
  process.exitCode = 1;
});
