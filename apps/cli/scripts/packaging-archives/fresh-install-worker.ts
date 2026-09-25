/**
 * Runs inside the fresh-install acceptance's container (see `fresh-install-acceptance.ts`), which has no network but
 * loopback, no Docker and a read-only root filesystem. Everything it writes goes to the owned `--work` directory.
 *
 * It serves a one-package npm registry on loopback, starts the external-service fixture that stands in for AWS,
 * telemetry and the proxy, and writes an npm project that has only a lockfile, no `node_modules`. The compiled CLI then
 * packages the project twice, started in the project directory as a user starts it. `result.json` records each run,
 * the installed state, every registry and fixture request, and the checks made from inside; the function ZIPs are
 * copied to `zips/`.
 *
 *   bun fresh-install-worker.ts --cli <executable> --work <directory>
 */
import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { getCliEnvironment } from '../perf/cli-environment';
import { startExternalServiceFixture } from '../perf/external-service-fixture';

export const DEPENDENCY = 'stp-fresh-install-dep';
export const GREETING = `hello from ${DEPENDENCY}`;
/** Where the container puts the Lambda image's own Node.js and npm, and nothing else the CLI could use. */
export const CONTAINER_PATH = ['/var/lang/bin', '/usr/bin', '/bin'];
const CLI_DEADLINE_MS = 120_000;

export type WorkerRun = {
  label: 'first' | 'repeat';
  exitCode: number | null;
  timedOut: boolean;
  wallMs: number;
  /** The CLI's `dependencies:install` span: its decision, the command it ran and how long it took. */
  install: { durationMs: number; decision?: unknown; command?: unknown } | null;
  resolveError: string | null;
  zip: string | null;
  registryRequests: string[];
  fixtureRequests: string[];
};

export type WorkerResult = {
  environment: { interfaces: string[]; dockerOnPath: string | null; dockerSocket: boolean; bun: string; npm: string };
  nodeModulesBeforeFirstRun: boolean;
  lockfileRequests: string[];
  runs: WorkerRun[];
  installed: {
    dependencyPostinstall: boolean;
    rootPostinstall: boolean;
    hiddenLockfile: boolean;
    markerVersion: number | null;
    packageLockUnchanged: boolean;
  };
};

const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const exists = (path: string) =>
  stat(path).then(
    () => true,
    () => false
  );

const run = async (command: string[], cwd: string, env: Record<string, string>) => {
  const child = Bun.spawn(command, { cwd, env, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);
  if (exitCode !== 0) throw new Error(`${command.join(' ')} exited ${exitCode}:\n${stdout}${stderr}`);
  return stdout;
};

const main = async () => {
  // Only `apps/cli/scripts` is mounted, so this uses nothing from the workspace's node_modules.
  const { values } = parseArgs({ options: { cli: { type: 'string' }, work: { type: 'string' } } });
  const { cli: executable, work } = values as { cli: string; work: string };
  const npmEnvironment = (home: string, registry: string) => ({
    HOME: home,
    PATH: CONTAINER_PATH.join(':'),
    npm_config_registry: registry
  });

  const environment = {
    interfaces: (await readdir('/sys/class/net')).toSorted(),
    dockerOnPath: Bun.which('docker', { PATH: CONTAINER_PATH.join(':') }),
    dockerSocket: await exists('/var/run/docker.sock'),
    bun: Bun.version,
    npm: (await run(['npm', '--version'], work, npmEnvironment(join(work, 'npm-home'), 'http://127.0.0.1:9/'))).trim()
  };
  // Nothing may run the CLI unless the container is what the acceptance asked for.
  if (environment.interfaces.join() !== 'lo' || environment.dockerOnPath || environment.dockerSocket) {
    throw new Error(`The container is not isolated: ${JSON.stringify(environment)}`);
  }

  // The dependency: one file, and a postinstall whose output shows that lifecycle scripts ran.
  const dependency = join(work, 'dependency');
  await mkdir(dependency, { recursive: true });
  const scripts = { postinstall: "node -e \"require('fs').writeFileSync('postinstall-ran.txt','ran')\"" };
  const dependencyManifest = { name: DEPENDENCY, version: '1.0.0', main: 'index.js', scripts };
  await writeFile(join(dependency, 'package.json'), `${JSON.stringify(dependencyManifest, null, 2)}\n`);
  await writeFile(join(dependency, 'index.js'), `exports.greeting = '${GREETING}';\n`);
  const packed = JSON.parse(
    await run(
      ['npm', 'pack', '--json', '--pack-destination', work],
      dependency,
      npmEnvironment(join(work, 'npm-home'), 'http://127.0.0.1:9/')
    )
  )[0] as { filename: string; integrity: string; shasum: string };
  const tarball = new Uint8Array(await readFile(join(work, packed.filename)));

  let requests: string[] = [];
  const takeRequests = () => {
    const taken = requests;
    requests = [];
    return taken;
  };
  const registry = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch: (request) => {
      const path = new URL(request.url).pathname;
      requests.push(`${request.method} ${path}`);
      if (path === `/${DEPENDENCY}`) {
        const dist = { tarball: `${registry.url.href}${DEPENDENCY}/-/${packed.filename}`, ...packed };
        return Response.json({
          name: DEPENDENCY,
          'dist-tags': { latest: '1.0.0' },
          versions: { '1.0.0': { ...dependencyManifest, hasInstallScript: true, dist } }
        });
      }
      if (path === `/${DEPENDENCY}/-/${packed.filename}`) return new Response(tarball);
      return new Response('not found', { status: 404 });
    }
  });
  const fixture = await startExternalServiceFixture();

  try {
    // The project as a fresh checkout has it: a manifest, a lockfile and source, never a `node_modules`.
    const project = join(work, 'project');
    await mkdir(join(project, 'src'), { recursive: true });
    const manifest = {
      name: 'fresh-install-fixture',
      version: '1.0.0',
      private: true,
      scripts: { postinstall: "node -e \"require('fs').writeFileSync('root-postinstall.txt','ran')\"" },
      dependencies: { [DEPENDENCY]: '1.0.0' }
    };
    await writeFile(join(project, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(
      join(project, 'src', 'index.ts'),
      `import { greeting } from '${DEPENDENCY}';\n\nexport const handler = async () => ({ greeting });\n`
    );
    await writeFile(
      join(project, 'stacktape.yml'),
      [
        'resources:',
        '  handler:',
        '    type: function',
        '    properties:',
        '      packaging:',
        '        type: stacktape-lambda-buildpack',
        '        properties:',
        '          entryfilePath: src/index.ts',
        ''
      ].join('\n')
    );
    await run(
      ['npm', 'install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-update-notifier'],
      project,
      npmEnvironment(join(work, 'npm-home'), registry.url.href)
    );
    const lockfileRequests = takeRequests();
    const packageLock = sha256(await readFile(join(project, 'package-lock.json')));
    const nodeModulesBeforeFirstRun = await exists(join(project, 'node_modules'));
    fixture.takeRequests();

    const home = join(work, 'cli-home');
    await mkdir(home, { recursive: true });
    const runs: WorkerRun[] = [];
    for (const label of ['first', 'repeat'] as const) {
      const timingsFile = join(work, `${label}.timings.jsonl`);
      const env = {
        ...getCliEnvironment({
          home,
          path: CONTAINER_PATH,
          serviceUrl: fixture.serviceUrl,
          proxyUrl: fixture.proxyUrl,
          timingsFile
        }),
        npm_config_registry: registry.url.href
      };
      const started = performance.now();
      const child = Bun.spawn(
        [executable, 'package', '--projectName', 'freshinstall', '--stage', 'test', '--region', 'eu-west-1'],
        { cwd: project, env, stdout: 'pipe', stderr: 'pipe', timeout: CLI_DEADLINE_MS, killSignal: 'SIGKILL' }
      );
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited
      ]);
      const wallMs = Math.round(performance.now() - started);
      await writeFile(join(work, `${label}.out`), `${stdout}${stderr}`);
      const timings = await readFile(timingsFile, 'utf8').then(
        (content) =>
          JSON.parse(content.split('\n')[0]!) as {
            spans: { name: string; start: number; end: number; detail?: Record<string, unknown> }[];
          },
        () => null
      );
      const install = timings?.spans.find(({ name }) => name === 'dependencies:install');
      const invocations = (await readdir(join(project, '.stacktape')).catch(() => [] as string[])).toSorted();
      const lambdas = invocations.length ? join(project, '.stacktape', invocations.at(-1)!, 'build', 'lambdas') : null;
      const zipName = lambdas
        ? (await readdir(lambdas).catch(() => [] as string[])).find((name) => name.endsWith('.zip'))
        : undefined;
      if (lambdas && zipName) {
        await mkdir(join(work, 'zips'), { recursive: true });
        await cp(join(lambdas, zipName), join(work, 'zips', `${label}.zip`));
      }
      runs.push({
        label,
        exitCode,
        timedOut: child.signalCode === 'SIGKILL',
        wallMs,
        install: install
          ? {
              durationMs: Math.round(install.end - install.start),
              decision: install.detail?.decision,
              command: install.detail?.command
            }
          : null,
        resolveError: `${stdout}${stderr}`.match(/Could not resolve[^\n]*/)?.[0] ?? null,
        zip: lambdas && zipName ? `zips/${label}.zip` : null,
        registryRequests: takeRequests(),
        fixtureRequests: fixture.takeRequests().map(({ kind, target, status }) => `${kind} ${target} ${status}`)
      });
    }

    const marker = await readFile(join(project, 'node_modules', '.stacktape-install-hash'), 'utf8').catch(() => '');
    const result: WorkerResult = {
      environment,
      nodeModulesBeforeFirstRun,
      lockfileRequests,
      runs,
      installed: {
        dependencyPostinstall: await exists(join(project, 'node_modules', DEPENDENCY, 'postinstall-ran.txt')),
        rootPostinstall: await exists(join(project, 'root-postinstall.txt')),
        hiddenLockfile: await exists(join(project, 'node_modules', '.package-lock.json')),
        markerVersion: marker ? ((JSON.parse(marker) as { version?: number }).version ?? null) : null,
        packageLockUnchanged: sha256(await readFile(join(project, 'package-lock.json'))) === packageLock
      }
    };
    await writeFile(join(work, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await fixture.close();
    await registry.stop(true);
  }
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
