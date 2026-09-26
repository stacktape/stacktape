/**
 * Whether the released CLI's exit waits for its telemetry report, and whether the report still arrives, measured in
 * the accepted safety sandbox with the perf fixture as the telemetry stand-in.
 *
 *   bun scripts/perf/telemetry-exit.ts --out <new or empty directory> --install <name>=<release install> [...]
 *     --safety-check <name>=<cli-safety-check output that passed for that install> [...] [--rounds 7]
 *
 * Run from `apps/cli`. Each `--install` is a directory made by `build-release-install.ts`. The journeys run `package`,
 * so every install needs a safety check that passed for its executable, as for the harness's `package` suite.
 *
 * Inside the sandbox, with Docker absent and one HOME for every sample, each round runs every journey for every
 * install, installs and journeys rotated per round; round 0 is a discarded warm-up:
 * - `package`: `package` of the harness's one-function fixture, telemetry answered at once;
 * - `package-slow-telemetry`: the same, telemetry answered after `SLOW_TELEMETRY_MS`;
 * - `validate-invalid-slow-telemetry`: `validate` of a configuration the schema refuses, a `CliError`;
 * - `package-read-only-slow-telemetry`: `package` in a read-only project, which fails with an unexpected error and so
 *   also sends the `$exception` report whose ID it prints.
 *
 * Each sample (`runCliSample`) records the wall time, the exit code, the CLI's `telemetry:report` span, every telemetry
 * batch the fixture received with its events and its start and end relative to the exit, the printed error ID, and
 * how long a telemetry sender outlived the CLI. `report.json` holds the samples and the summary: per install and
 * journey the median wall time and where each report arrived, per install the slow-minus-immediate `package` median,
 * and the `package` medians paired by round against the first install. `outer.json` holds the outside evidence. The
 * exit status is 0 only when every sample was valid and every outside check held; the summary reports the behavior.
 */
import type { TelemetryEventRecord } from './external-service-fixture';
import { createHash } from 'node:crypto';
import { createReadStream, realpathSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import yargsParser from 'yargs-parser';
import { runBoundedProcess } from './bounded-process';
import { createPathWithoutDocker, createToolDirectory, getCliEnvironment } from './cli-environment';
import { findProcessesByLink } from './cli-safety-check';
import { findSpans, runCliSample } from './cli-sample';
import { startExternalServiceFixture } from './external-service-fixture';
import { claimOutputDirectory, getLoadAverage, summarize } from './measurement-context';
import {
  assertNetworkSandbox,
  discoverSandboxMasks,
  getNetworkSandboxCommand,
  getNetworkSandboxEnvironment,
  listOtherNamespaceProcesses,
  NETWORK_SANDBOX_ENV,
  readHostNetworkState,
  SANDBOX_RESOLV_CONF
} from './network-sandbox';
import { FIXTURE_CONFIG_FILE, writeFixtureConfig, writePackagingFixture } from './packaging-fixture';

/** How long the fixture waits before answering a telemetry batch in the slow journeys. */
export const SLOW_TELEMETRY_MS = 300;
const SYSTEM_PATH = ['/usr/bin', '/usr/sbin'];
const SANDBOX_TIMEOUT_MS = 20 * 60 * 1000;
const SAMPLE_TIMEOUT_MS = 120_000;
const CONFIG_FILE = 'telemetry-exit-config.json';
const INNER_REPORT_FILE = 'inner-report.json';

const COMMON_ARGS = ['--projectName', 'perfbaseline', '--stage', 'perf', '--region', 'eu-west-1'];
export const JOURNEYS = [
  { journey: 'package', args: ['package', ...COMMON_ARGS], project: 'valid', telemetryDelayMs: 0 },
  {
    journey: 'package-slow-telemetry',
    args: ['package', ...COMMON_ARGS],
    project: 'valid',
    telemetryDelayMs: SLOW_TELEMETRY_MS
  },
  {
    journey: 'validate-invalid-slow-telemetry',
    args: ['validate', ...COMMON_ARGS],
    project: 'invalid',
    telemetryDelayMs: SLOW_TELEMETRY_MS
  },
  {
    journey: 'package-read-only-slow-telemetry',
    args: ['package', ...COMMON_ARGS],
    project: 'read-only',
    telemetryDelayMs: SLOW_TELEMETRY_MS
  }
] as const;
type Journey = (typeof JOURNEYS)[number]['journey'];

type Install = { name: string; directory: string; executable: string; sha256: string };
type Config = { installs: Install[]; rounds: number; work: string };

export type TelemetryExitSample = {
  id: string;
  journey: Journey;
  install: string;
  round: number;
  warmUp: boolean;
  exitCode: number | null;
  wallMs: number;
  invalidReasons: string[];
  /** The CLI's own `telemetry:report` span: what the command spent on its report before exiting. */
  telemetryReportMs: number | null;
  /** Every telemetry batch the fixture received for this sample, relative to the exit (negative: before it). */
  reports: { events: TelemetryEventRecord[]; startAfterExitMs: number | null; endAfterExitMs: number | null }[];
  /** Every other request the fixture saw, as `kind target status`. */
  otherRequests: string[];
  /** The error ID the CLI printed, if any. */
  printedErrorId: string | null;
  telemetrySenderWaitMs: number | null;
  loadBefore: number;
};

type InnerReport = {
  schema: 1;
  kind: 'stacktape-telemetry-exit-inner';
  startedAt: string;
  finishedAt: string | null;
  currentStep: string | null;
  pidNamespace: string | null;
  samples: TelemetryExitSample[];
  error: string | null;
};

const rotate = <T>(items: readonly T[], by: number) => items.map((_, index) => items[(index + by) % items.length]!);
const round1 = (value: number) => Math.round(value * 10) / 10;

const sha256File = (path: string) =>
  new Promise<string>((resolveHash, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolveHash(hash.digest('hex')));
  });

const loadInstall = async (name: string, directory: string): Promise<Install> => {
  const manifest = JSON.parse(await readFile(join(directory, 'install.json'), 'utf8'));
  const executable = join(directory, manifest.installDirectory, manifest.executable.path);
  const sha256 = await sha256File(executable);
  if (sha256 !== manifest.executable.sha256) throw new Error(`The executable of ${name} does not match install.json.`);
  return { name, directory, executable, sha256 };
};

/** The safety check that must have passed for an executable before its `package` runs. */
const verifySafetyCheck = async (directory: string, install: Install) => {
  const outer = JSON.parse(await readFile(join(directory, 'outer.json'), 'utf8'));
  const inner = JSON.parse(await readFile(join(directory, 'safety-check.json'), 'utf8'));
  if (outer.passed !== true || inner.passed !== true) throw new Error(`The safety check in ${directory} did not pass.`);
  if (inner.executable?.sha256 !== install.sha256) {
    throw new Error(`The safety check in ${directory} was for another executable than ${install.name}.`);
  }
  return { install: install.name, directory, finishedAt: inner.finishedAt as string };
};

const pairs = (values: unknown, flag: string) =>
  ([] as string[]).concat((values as string | string[] | undefined) ?? []).map((entry) => {
    const [name, directory] = entry.split('=');
    if (!name || !directory) throw new Error(`${flag} must be <name>=<directory>, not ${entry}.`);
    return { name, directory: resolve(directory) };
  });

const runInside = async ({ out }: { out: string }) => {
  const config = JSON.parse(await readFile(join(out, CONFIG_FILE), 'utf8')) as Config;
  const report: InnerReport = {
    schema: 1,
    kind: 'stacktape-telemetry-exit-inner',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    currentStep: 'sandbox',
    pidNamespace: null,
    samples: [],
    error: null
  };
  const writeReport = () => writeFile(join(out, INNER_REPORT_FILE), `${JSON.stringify(report, null, 2)}\n`);
  const fixture = await startExternalServiceFixture();
  const { work } = config;
  const projects = { valid: join(work, 'valid'), invalid: join(work, 'invalid'), 'read-only': join(work, 'read-only') };
  try {
    report.pidNamespace = assertNetworkSandbox().pidNamespace;
    const home = join(work, 'home');
    await mkdir(home, { recursive: true });
    const tools = join(work, 'tools');
    await createToolDirectory({ directory: tools, tools: ['node', 'npm', 'npx', 'pnpm'] });
    const withoutDocker = await createPathWithoutDocker({
      directory: join(work, 'path-without-docker'),
      sourceDirectories: SYSTEM_PATH
    });
    const path = [tools, withoutDocker.directory];
    const docker = Bun.which('docker', { PATH: path.join(':') }) ?? null;
    if (docker !== null) throw new Error(`Refusing to run: docker resolves to ${docker}.`);
    for (const [name, root] of Object.entries(projects)) {
      const manifest = await writePackagingFixture({ root, functions: 1 });
      await writeFixtureConfig({ root, functions: manifest.functions });
      // The fixture vendors its packages, so a marker matching its lockfile is what a completed install leaves.
      await writeFile(
        join(root, 'node_modules/.stacktape-install-hash'),
        createHash('sha256')
          .update(await readFile(join(root, 'package-lock.json')))
          .digest('hex')
      );
      if (name === 'invalid') {
        // A resources map that is a number: the configuration schema refuses it before anything else runs.
        const base = await readFile(join(root, FIXTURE_CONFIG_FILE), 'utf8');
        await writeFile(join(root, FIXTURE_CONFIG_FILE), base.replace(/^resources:$/m, 'resources: 5\nunused:'));
      }
      if (name === 'read-only') await chmod(root, 0o555);
    }
    const env = getCliEnvironment({
      home,
      path,
      serviceUrl: fixture.serviceUrl,
      proxyUrl: fixture.proxyUrl,
      extra: { DOCKER_CONFIG: join(work, 'docker-config') }
    });
    for (let round = 0; round <= config.rounds; round++) {
      for (const install of rotate(config.installs, round)) {
        for (const { journey, args, project, telemetryDelayMs } of rotate(JOURNEYS, round)) {
          const id = `${journey}-${install.name}-${String(round).padStart(2, '0')}`;
          const directory = join(out, 'samples', id);
          await mkdir(directory, { recursive: true });
          report.currentStep = id;
          assertNetworkSandbox();
          fixture.setTelemetryResponseDelayMs(telemetryDelayMs);
          const loadBefore = getLoadAverage();
          const sample = await runCliSample({
            cmd: [install.executable, ...args],
            cwd: projects[project],
            env,
            timeoutMs: SAMPLE_TIMEOUT_MS,
            timingsFile: join(directory, 'timings.json'),
            fixture,
            outputFiles: { stdout: join(directory, 'stdout.log'), stderr: join(directory, 'stderr.log') },
            findEscapedProcesses: listOtherNamespaceProcesses
          });
          const relative = (ms: number) => (sample.exitFixtureMs === null ? null : round1(ms - sample.exitFixtureMs));
          const [reportSpan] = findSpans(sample, 'telemetry:report');
          const output = `${sample.process.stdout}\n${sample.process.stderr}`;
          report.samples.push({
            id,
            journey,
            install: install.name,
            round,
            warmUp: round === 0,
            exitCode: sample.process.exitCode,
            wallMs: round1(sample.process.wallMs),
            invalidReasons: sample.invalidReasons,
            telemetryReportMs: reportSpan?.end == null ? null : round1(reportSpan.end - reportSpan.start),
            reports: sample.fixtureRequests
              .filter(({ kind }) => kind === 'telemetry')
              .map(({ events, startMs, endMs }) => ({
                events: events ?? [],
                startAfterExitMs: relative(startMs),
                endAfterExitMs: relative(endMs)
              })),
            otherRequests: sample.fixtureRequests
              .filter(({ kind }) => kind !== 'telemetry')
              .map(({ kind, target, status }) => `${kind} ${target} ${status}`),
            printedErrorId: output.match(/Error ID: ([0-9a-f-]{36})/)?.[1] ?? null,
            telemetrySenderWaitMs: sample.telemetrySenderWaitMs,
            loadBefore
          });
          await rm(join(projects.valid, '.stacktape'), { recursive: true, force: true });
          await writeReport();
        }
      }
    }
    report.currentStep = null;
  } catch (error) {
    report.error = error instanceof Error ? (error.stack ?? error.message) : String(error);
  } finally {
    await chmod(projects['read-only'], 0o755).catch(() => {});
    await fixture.close();
    report.finishedAt = new Date().toISOString();
    await writeReport();
  }
  process.exitCode = report.error ? 1 : 0;
};

const eventLabel = ({ event, outcome }: TelemetryEventRecord) => (outcome ? `${event}:${outcome}` : event);

/** Per install and journey: the wall-time distribution and, per event, how many arrived before and after the exit. */
export const summarizeTelemetryExit = (samples: TelemetryExitSample[], installs: string[]) => {
  const measured = samples.filter(({ warmUp, invalidReasons }) => !warmUp && invalidReasons.length === 0);
  const journeys = JOURNEYS.map(({ journey }) => journey);
  const medianOf = (install: string, journey: Journey) =>
    summarize(measured.filter((s) => s.install === install && s.journey === journey).map(({ wallMs }) => wallMs))
      ?.median ?? null;
  const byJourney = installs.flatMap((install) =>
    journeys.map((journey) => {
      const group = measured.filter((s) => s.install === install && s.journey === journey);
      const events: Record<string, { received: number; endedBeforeExit: number; startedAfterExit: number }> = {};
      for (const sample of group) {
        for (const { events: batch, startAfterExitMs, endAfterExitMs } of sample.reports) {
          for (const label of batch.map(eventLabel)) {
            const entry = (events[label] ??= { received: 0, endedBeforeExit: 0, startedAfterExit: 0 });
            entry.received += 1;
            if (endAfterExitMs !== null && endAfterExitMs <= 0) entry.endedBeforeExit += 1;
            if (startAfterExitMs !== null && startAfterExitMs > 0) entry.startedAfterExit += 1;
          }
        }
      }
      const trackingIds = (sample: TelemetryExitSample) =>
        sample.reports.flatMap(({ events: batch }) => batch.flatMap(({ errorTrackingId }) => errorTrackingId ?? []));
      return {
        install,
        journey,
        samples: group.length,
        exitCodes: [...new Set(group.map(({ exitCode }) => exitCode))],
        wallMs: summarize(group.map(({ wallMs }) => wallMs)),
        telemetryReportMs: summarize(group.flatMap(({ telemetryReportMs }) => telemetryReportMs ?? [])),
        senderWaitMs: summarize(group.flatMap(({ telemetrySenderWaitMs }) => telemetrySenderWaitMs ?? [])),
        events,
        printedIdMatchesReport: group.filter(
          (sample) => sample.printedErrorId !== null && trackingIds(sample).includes(sample.printedErrorId)
        ).length
      };
    })
  );
  const slowMinusImmediate = installs.map((install) => {
    const slow = medianOf(install, 'package-slow-telemetry');
    const immediate = medianOf(install, 'package');
    return { install, ms: slow === null || immediate === null ? null : round1(slow - immediate) };
  });
  const [reference] = installs;
  const pairedPackage = installs.slice(1).map((install) => {
    const differences = measured
      .filter((s) => s.install === install && s.journey === 'package')
      .flatMap((sample) => {
        const mate = measured.find(
          (s) => s.install === reference && s.journey === 'package' && s.round === sample.round
        );
        return mate ? [round1(sample.wallMs - mate.wallMs)] : [];
      });
    return {
      install,
      reference,
      medians: { [reference!]: medianOf(reference!, 'package'), [install]: medianOf(install, 'package') },
      pairedDifferenceMs: summarize(differences)
    };
  });
  return { byJourney, slowMinusImmediate, pairedPackage };
};

const runOutside = async (args: ReturnType<typeof yargsParser>) => {
  const out = resolve(String(args.out));
  await claimOutputDirectory(out);
  const evidence: Record<string, unknown> = { schema: 1, kind: 'stacktape-telemetry-exit-outer' };
  const checks: { check: string; passed: boolean; detail: string }[] = [];
  const expect = (check: string, passed: boolean, detail: unknown) =>
    checks.push({ check, passed, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  const work = await mkdtemp(join(tmpdir(), 'stacktape-telemetry-exit-'));
  let inner: InnerReport | null = null;
  try {
    const installs = await Promise.all(
      pairs(args.install, '--install').map(({ name, directory }) => loadInstall(name, directory))
    );
    if (installs.length === 0) throw new Error('At least one --install is needed.');
    const safetyChecks = pairs(args['safety-check'], '--safety-check');
    evidence.safetyChecks = await Promise.all(
      installs.map((install) => {
        const check = safetyChecks.find(({ name }) => name === install.name);
        if (!check) throw new Error(`${install.name} needs --safety-check ${install.name}=<directory>.`);
        return verifySafetyCheck(check.directory, install);
      })
    );
    const config: Config = { installs, rounds: Number(args.rounds ?? 7), work };
    await writeFile(join(out, CONFIG_FILE), `${JSON.stringify(config, null, 2)}\n`);
    evidence.config = config;
    const masks = discoverSandboxMasks();
    const hostBefore = readHostNetworkState();
    const resolvConfPath = join(out, 'sandbox-resolv.conf');
    await writeFile(resolvConfPath, SANDBOX_RESOLV_CONF);
    evidence.loadBefore = getLoadAverage();
    const sandboxed = await runBoundedProcess({
      cmd: getNetworkSandboxCommand({
        argv: [process.execPath, import.meta.path, '--out', out],
        resolvConfPath,
        masks
      }),
      cwd: process.cwd(),
      env: { ...(process.env as Record<string, string>), ...getNetworkSandboxEnvironment(masks) },
      timeoutMs: SANDBOX_TIMEOUT_MS,
      outputFiles: { stdout: join(out, 'sandbox.stdout.log'), stderr: join(out, 'sandbox.stderr.log') }
    });
    evidence.loadAfter = getLoadAverage();
    inner = await readFile(join(out, INNER_REPORT_FILE), 'utf8')
      .then((content) => JSON.parse(content) as InnerReport)
      .catch(() => null);
    const survivors = inner?.pidNamespace ? findProcessesByLink('ns/pid', inner.pidNamespace) : null;
    const executablesRunning = installs.flatMap(({ executable }) =>
      findProcessesByLink('exe', realpathSync(executable))
    );
    const hostAfter = readHostNetworkState();
    evidence.sandboxProcess = {
      exitCode: sandboxed.exitCode,
      timedOut: sandboxed.timedOut,
      wallMs: round1(sandboxed.wallMs),
      leftoverProcesses: sandboxed.leftoverProcesses
    };
    expect('the sandboxed run exited by itself with status 0', sandboxed.exitCode === 0, evidence.sandboxProcess);
    expect('the inner report finished without an error', inner?.finishedAt != null && inner.error === null, {
      error: inner?.error ?? 'missing report'
    });
    expect('no process of the sandbox PID namespace remains', survivors !== null && survivors.length === 0, survivors);
    expect('no measured executable is still running', executablesRunning.length === 0, executablesRunning);
    expect('the host network state is unchanged', JSON.stringify(hostBefore) === JSON.stringify(hostAfter), {
      hostBefore,
      hostAfter
    });
    const invalid = (inner?.samples ?? []).filter(({ invalidReasons }) => invalidReasons.length > 0);
    expect(
      'every sample is valid',
      invalid.length === 0,
      invalid.map(({ id, invalidReasons }) => ({ id, invalidReasons }))
    );
    expect(
      'every journey ran for every install in every round',
      inner?.samples.length === (config.rounds + 1) * installs.length * JOURNEYS.length,
      { samples: inner?.samples.length ?? 0 }
    );
  } catch (error) {
    evidence.error = error instanceof Error ? (error.stack ?? error.message) : String(error);
  } finally {
    await rm(work, { recursive: true, force: true }).catch((error: unknown) => {
      evidence.cleanupError = String(error);
    });
  }
  const summary = inner
    ? summarizeTelemetryExit(
        inner.samples,
        ((evidence.config as Config | undefined)?.installs ?? []).map(({ name }) => name)
      )
    : null;
  const passed = !evidence.error && !evidence.cleanupError && checks.every(({ passed: ok }) => ok);
  Object.assign(evidence, { checks, passed });
  await writeFile(join(out, 'outer.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  await writeFile(join(out, 'report.json'), `${JSON.stringify({ summary, samples: inner?.samples ?? [] }, null, 2)}\n`);
  for (const { check, passed: ok, detail } of checks)
    console.info(`${ok ? 'ok  ' : 'FAIL'} ${check}${ok ? '' : `: ${detail}`}`);
  if (evidence.error) console.error(`The run stopped early: ${evidence.error}`);
  if (summary) console.info(JSON.stringify(summary, null, 2));
  process.exitCode = passed ? 0 : 1;
};

const main = async () => {
  const args = yargsParser(process.argv.slice(2), { string: ['out', 'install', 'safety-check'] });
  if (!args.out) {
    throw new Error(
      'Usage: bun scripts/perf/telemetry-exit.ts --out <dir> --install <name>=<dir> [...] --safety-check <name>=<dir> [...]'
    );
  }
  if (process.env[NETWORK_SANDBOX_ENV] === '1') await runInside({ out: resolve(String(args.out)) });
  else await runOutside(args);
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
