/**
 * The SSR starters, packaged by the CLI's own `package` command, answer requests in the Lambda runtime.
 *
 * One pinned real build per adapter: the Astro, Nuxt, SolidStart, SvelteKit, TanStack Start, Remix and Next.js
 * starters that ship with the CLI. Each is materialized as `stacktape init` writes it, then its committed manifest and
 * lockfile are put back (materialization drops lockfiles and rewrites the manifest), so the CLI's frozen install
 * resolves exactly the committed versions; the framework version installed must equal the lockfile's. The source CLI
 * runs `package` as a child process in an isolated home with every AWS and Stacktape request routed to the offline
 * guard; the CLI installs the dependencies and runs the framework's build itself. The server function ZIP is
 * extracted with `unzip` and invoked in the official Lambda Node.js image as an unprivileged user that owns none of
 * the files, with HTTP API v2 events as the gateway sends them: the index page must be HTML, the starter's dynamic
 * API route must answer with its message, and an unknown path must get the framework's not-found status. The index
 * request carries a cookie as a browser would; no starter route reads or sets cookies, so cookie semantics are not
 * observed here (the packaging package's web-framework E2E proves them for Astro and SvelteKit with purpose-built
 * apps). The build must also leave hashed static assets for the hosting bucket.
 *
 * It needs Docker, `unzip`, the local Lambda Node.js 24 image (pulled when missing) and network access for the
 * starters' dependency installs; it contacts no AWS service.
 *
 *   bun scripts/packaging-archives/ssr-web-acceptance.ts [--starter <id>[,<id>...]] [--out <new or empty directory>]
 *     [--keep]
 */
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { generateStarterProject } from '../generate-starter-project';
import { startOfflineAwsServer } from '../qualification/offline-aws';
import { outputTail } from '../qualification/process';
import { writeJsonAtomic } from '../qualification/report';
import { cliDirectory, ensureDevCliArtifacts, packageWithSourceCli } from '../qualification/source-cli-packaging';
import { replacePlaceholdersInStacktapeConfig } from '../starter-projects/utils';
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
    frameworkPackage: '@tanstack/react-start',
    resourceType: 'tanstack-web',
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

const LAMBDA_IMAGE = 'public.ecr.aws/lambda/nodejs:24';

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
    accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
    ...(cookies.length > 0 ? { cookie: cookies.join('; ') } : {})
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

const runAdapter = async ({ adapter, work }: { adapter: Adapter; work: string }) => {
  const { starter } = adapter;
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

    functionDirectory = await extractZip(serverFunction.artifactPath);
    const invoke = async (event: unknown) => {
      const invocation = await invokeInLambdaRuntime({
        functionDirectory: functionDirectory!,
        handler: 'index-wrap.handler',
        image: LAMBDA_IMAGE,
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
  const image = ensureLambdaImage(LAMBDA_IMAGE);
  const work = await mkdtemp(join(tmpdir(), 'stacktape-ssr-web-acceptance-'));
  const reports: unknown[] = [];
  try {
    for (const adapter of ADAPTERS.filter((candidate) => selectedStarters.includes(candidate.starter))) {
      reports.push(await runAdapter({ adapter, work }));
      await writeJsonAtomic(join(out, 'report.json'), { out, image, work, starters: reports, checks });
    }
  } finally {
    const leftovers = listLeftoverContainers();
    check('all', 'no acceptance container is left behind', leftovers.length === 0, leftovers.join(', ') || 'none');
    if (!keep) await rm(work, { recursive: true, force: true }).catch(() => undefined);
    await writeJsonAtomic(join(out, 'report.json'), { out, image, work, starters: reports, checks });
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
