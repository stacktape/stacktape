/**
 * Fresh-install acceptance: the first `stacktape package` of a fresh npm checkout, as a user runs it.
 *
 * The CLI installs a project's dependencies and then bundles in the same process. Bun reads the working directory's
 * entries when the process starts, so the `node_modules` that install creates stays invisible to the bundler unless the
 * CLI makes Bun read the directory again (`refreshResolverView` in `dependency-installer.ts`). That relies on Bun
 * behavior, not a documented API; this acceptance fails if an upgrade or a change hides the new `node_modules` again.
 *
 * 1. The compiled release CLI is built with `scripts/perf/build-release-install.ts` into the output directory, or
 *    `--install` names one already built, and the report marks it as supplied.
 * 2. `fresh-install-worker.ts` runs in the official Lambda Node.js image, for its Node.js and npm, with no network but
 *    loopback, no Docker, no capabilities, a read-only root filesystem and the caller's uid. Of the repository it sees
 *    only `apps/cli/scripts` and the release install, both read-only. It serves a one-package registry and the AWS
 *    stand-in on loopback, writes a project that has only a lockfile, and runs the CLI's `package` twice from the
 *    project directory, under `/work`, where no `node_modules` exists above the project.
 * 3. Here, each ZIP is extracted with `unzip`. The first run's function runs in the Lambda image as the unprivileged
 *    test user (see `lambda-runtime.ts`) and must return the dependency's value. The repeat must skip the install and
 *    produce the same files.
 *
 *   pnpm --filter @stacktape/cli run test:fresh-install -- [--out <dir>] [--install <release install directory>]
 *
 * Needs Linux, Docker, the Lambda image and `unzip`; contacts no AWS service or registry. `--out` must be new or empty.
 * `report.json`, the ZIPs, CLI output and timings stay there; the project, extracted trees and a built executable are
 * removed.
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import yargsParser from 'yargs-parser';
import { sha256File } from '../perf/build-release-install';
import type { ReleaseInstallManifest } from '../perf/build-release-install';
import {
  claimOutputDirectory,
  createSourceTracker,
  describeSourceIdentity,
  getHostEnvironment
} from '../perf/measurement-context';
import { CONTAINER_PATH, DEPENDENCY, GREETING, type WorkerResult } from './fresh-install-worker';
import {
  ensureLambdaImage,
  extractZip,
  invokeInLambdaRuntime,
  LAMBDA_IMAGE,
  listExtractedEntries,
  listLeftoverContainers,
  removeContainer
} from './lambda-runtime';

const CLI_ROOT = resolve(import.meta.dir, '..', '..');
const REPO_ROOT = resolve(CLI_ROOT, '..', '..');
/** The worker and its helpers; the only repository files the container sees. */
const SCRIPTS = resolve(import.meta.dir, '..');
const WORKER = join(import.meta.dir, 'fresh-install-worker.ts');
const WORKER_LABEL = 'stacktape.test=fresh-install-acceptance';
const WORKER_DEADLINE_MS = 360_000;

type Result = { check: string; ok: boolean; detail?: string | undefined };
const results: Result[] = [];
const check = (name: string, assertion: () => string | void) => {
  try {
    results.push({ check: name, ok: true, detail: assertion() || undefined });
    console.info(`PASS  ${name}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ check: name, ok: false, detail });
    console.error(`FAIL  ${name}\n      ${detail}`);
  }
};

const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

const buildReleaseInstall = async (directory: string) => {
  const child = Bun.spawn([process.execPath, 'scripts/perf/build-release-install.ts', '--out', directory], {
    cwd: CLI_ROOT,
    stdout: 'pipe',
    stderr: 'pipe'
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);
  await writeFile(join(dirname(directory), 'build-release-install.log'), `${stdout}${stderr}`);
  if (exitCode !== 0) throw new Error(`build-release-install.ts exited ${exitCode}:\n${stdout}${stderr}`);
};

/** Runs the worker in its container and returns the container command; the container is removed whatever happens. */
const runWorker = async ({ executable, work }: { executable: string; work: string }) => {
  const uid = process.getuid?.();
  const gid = process.getgid?.();
  const name = `stp-fresh-install-${randomUUID().slice(0, 12)}`;
  const command = [
    'docker',
    'run',
    '--name',
    name,
    '--label',
    WORKER_LABEL,
    '--network',
    'none',
    '--user',
    `${uid}:${gid}`,
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--read-only',
    '--tmpfs',
    '/tmp:rw,size=256m',
    '--mount',
    `type=bind,source=${process.execPath},target=/opt/stacktape-test/bun,readonly`,
    '--mount',
    `type=bind,source=${SCRIPTS},target=${SCRIPTS},readonly`,
    '--mount',
    `type=bind,source=${dirname(executable)},target=/opt/stacktape-cli,readonly`,
    '--mount',
    `type=bind,source=${work},target=/work`,
    '--env',
    'HOME=/work/worker-home',
    '--env',
    `PATH=${CONTAINER_PATH.join(':')}`,
    '--env',
    'BUN_RUNTIME_TRANSPILER_CACHE_PATH=0',
    '--workdir',
    '/work',
    '--entrypoint',
    '/opt/stacktape-test/bun',
    LAMBDA_IMAGE,
    WORKER,
    '--cli',
    `/opt/stacktape-cli/${relative(dirname(executable), executable)}`,
    '--work',
    '/work'
  ];
  try {
    const child = Bun.spawn(command, { stdout: 'pipe', stderr: 'pipe', timeout: WORKER_DEADLINE_MS });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited
    ]);
    await writeFile(join(work, 'worker.log'), `${stdout}${stderr}`);
    if (exitCode !== 0) throw new Error(`The worker container exited ${exitCode}:\n${stdout}${stderr}`);
  } finally {
    removeContainer(name);
  }
  return command;
};

const main = async () => {
  if (process.platform !== 'linux') {
    throw new Error('The fresh-install acceptance runs the host Bun and CLI in a Linux container: run it on Linux.');
  }
  const args = yargsParser(process.argv.slice(2), { string: ['out', 'install'] });
  const outDirectory = resolve(
    args.out ?? join(CLI_ROOT, '.stacktape', 'fresh-install-acceptance', new Date().toISOString().replace(/[:.]/g, '-'))
  );
  await claimOutputDirectory(outDirectory);
  const source = createSourceTracker({
    repoRoot: REPO_ROOT,
    scopes: ['apps/cli', 'packages/packaging'],
    excludePaths: [relative(REPO_ROOT, outDirectory)]
  });
  console.info(`Source ${describeSourceIdentity(source.before)}; output in ${outDirectory}`);

  const supplied = typeof args.install === 'string';
  const installDirectory = supplied ? resolve(args.install) : join(outDirectory, 'install');
  if (!supplied) await buildReleaseInstall(installDirectory);
  const manifest = JSON.parse(await readFile(join(installDirectory, 'install.json'), 'utf8')) as ReleaseInstallManifest;
  const executable = join(installDirectory, manifest.installDirectory, manifest.executable.path);
  const executableSha256 = await sha256File(executable);
  check('the CLI is the compiled release executable its install.json describes', () => {
    assert.equal(executableSha256, manifest.executable.sha256);
    return `${manifest.compileTarget} ${manifest.version}, ${manifest.bytecode}, ${executableSha256}`;
  });
  const lambdaImage = ensureLambdaImage();

  const work = join(outDirectory, 'work');
  await mkdir(join(work, 'worker-home'), { recursive: true });
  let containerCommand: string[] = [];
  let worker: WorkerResult | null = null;
  const extracted: Record<string, string> = {};
  const artifacts: Record<string, { zipSha256: string; entriesSha256: string; entries: string[] }> = {};
  let invocation: { status: number; body: string } | null = null;
  try {
    containerCommand = await runWorker({ executable, work });
    worker = JSON.parse(await readFile(join(work, 'result.json'), 'utf8')) as WorkerResult;
    for (const run of worker.runs) {
      if (!run.zip) continue;
      const zipPath = join(work, run.zip);
      extracted[run.label] = await extractZip(zipPath);
      const entries = await listExtractedEntries(extracted[run.label]!);
      artifacts[run.label] = {
        zipSha256: sha256(await readFile(zipPath)),
        entriesSha256: sha256(entries.join('\n')),
        entries
      };
    }
    if (extracted.first) {
      const { status, body } = await invokeInLambdaRuntime({
        functionDirectory: extracted.first,
        handler: 'index.handler'
      });
      invocation = { status, body };
    }
  } catch (error) {
    check('the worker ran and its artifacts could be inspected', () => {
      throw error;
    });
  } finally {
    await Promise.all(Object.values(extracted).map((directory) => rm(directory, { recursive: true, force: true })));
  }

  const [first, repeat] = [
    worker?.runs.find(({ label }) => label === 'first'),
    worker?.runs.find(({ label }) => label === 'repeat')
  ];
  if (worker) {
    const { environment } = worker;
    check('the container had only loopback, no Docker and no Docker socket', () => {
      assert.deepEqual(environment.interfaces, ['lo']);
      assert.equal(environment.dockerOnPath, null);
      assert.equal(environment.dockerSocket, false);
      return `Bun ${environment.bun}, npm ${environment.npm}`;
    });
    check('the project had no node_modules before the first package', () => {
      assert.equal(worker.nodeModulesBeforeFirstRun, false);
    });
    check('first package: the CLI installed the dependencies, then built the function', () => {
      assert.ok(first, 'The first run is missing.');
      assert.equal(first.timedOut, false, 'The first run timed out.');
      assert.equal(first.install?.decision, 'installed', `Install span: ${JSON.stringify(first.install)}.`);
      assert.equal(first.exitCode, 0, `Exit ${first.exitCode}: ${first.resolveError ?? 'see work/first.out'}.`);
      assert.ok(first.zip, 'The first run wrote no function ZIP.');
      return `${first.wallMs} ms, install ${first.install?.durationMs} ms (${first.install?.command})`;
    });
    check("first package's function runs in the Lambda image and returns the installed dependency's value", () => {
      assert.ok(invocation, 'Nothing was invoked.');
      assert.equal(invocation.status, 200);
      assert.deepEqual(JSON.parse(invocation.body), { greeting: GREETING });
      return invocation.body;
    });
    check("the install ran lifecycle scripts, kept the lockfile and wrote npm's and Stacktape's records", () => {
      assert.deepEqual(worker.installed, {
        dependencyPostinstall: true,
        rootPostinstall: true,
        hiddenLockfile: true,
        markerVersion: 3,
        packageLockUnchanged: true
      });
    });
    check('repeat package: the install is skipped and the function has the same files', () => {
      assert.ok(repeat, 'The repeat run is missing.');
      assert.equal(repeat.exitCode, 0, `Exit ${repeat.exitCode}: see work/repeat.out.`);
      assert.equal(repeat.install?.decision, 'marker-matches', `Install span: ${JSON.stringify(repeat.install)}.`);
      assert.ok(artifacts.first && artifacts.repeat, 'A function ZIP is missing.');
      assert.deepEqual(artifacts.repeat.entries, artifacts.first.entries);
      return `entries ${artifacts.first.entriesSha256}`;
    });
    check('the registry served only the dependency', () => {
      const allowed = new Set([`GET /${DEPENDENCY}`, `GET /${DEPENDENCY}/-/${DEPENDENCY}-1.0.0.tgz`]);
      const unexpected = worker.runs
        .flatMap(({ registryRequests }) => registryRequests)
        .filter((request) => !allowed.has(request));
      assert.deepEqual(unexpected, []);
    });
  }

  // The project and its node_modules, npm's cache and the homes are rebuilt on every run; the evidence stays.
  const kept = new Set([
    'result.json',
    'worker.log',
    'zips',
    'first.out',
    'repeat.out',
    'first.timings.jsonl',
    'repeat.timings.jsonl'
  ]);
  for (const entry of await readdir(work)) {
    if (!kept.has(entry)) await rm(join(work, entry), { recursive: true, force: true });
  }
  if (!supplied) await rm(join(installDirectory, manifest.installDirectory), { recursive: true, force: true });
  check('no container of this acceptance remains', () => {
    const leftovers = [
      ...listLeftoverContainers(),
      ...Bun.spawnSync(['docker', 'ps', '--all', '--quiet', '--filter', `label=${WORKER_LABEL}`])
        .stdout.toString()
        .split('\n')
        .filter(Boolean)
    ];
    assert.deepEqual(leftovers, []);
  });
  const sourceCheck = source.check();
  check('the source did not change during the run', () => {
    assert.equal(sourceCheck, 'unchanged');
  });

  const failed = results.filter(({ ok }) => !ok);
  const report = {
    kind: 'stacktape-fresh-install-acceptance',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    source: { before: source.before, after: source.after, check: sourceCheck },
    host: getHostEnvironment(),
    cli: {
      supplied,
      installDirectory,
      executableSha256,
      compileTarget: manifest.compileTarget,
      version: manifest.version,
      bytecode: manifest.bytecode
    },
    lambdaImage,
    containerCommand,
    worker,
    artifacts,
    invocation,
    results
  };
  await writeFile(join(outDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.info(
    `\n${results.length - failed.length} of ${results.length} checks passed. Report: ${join(outDirectory, 'report.json')}`
  );
  if (failed.length > 0) process.exitCode = 1;
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
