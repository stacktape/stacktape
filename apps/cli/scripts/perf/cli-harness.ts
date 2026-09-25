/**
 * Measures the released CLI in the accepted safety sandbox: one fresh process per sample, one sample at a time.
 *
 *   bun scripts/perf/cli-harness.ts --out <new or empty directory> --install <name>=<release install> [...]
 *     [--package-install <name> --safety-check <cli-safety-check output that passed for that install>]
 *     [--suites startup,active-startup,package] [--startup-samples 21] [--active-startup-samples 11]
 *     [--package-samples 11] [--functions 1,10] [--docker-samples 11] [--timeout-ms 120000] [--inspect-artifacts]
 *     [--ci-install-samples 11] [--config-only-samples 11] [--command-samples 11]
 *
 * Run from `apps/cli`. Each `--install` is a directory made by `build-release-install.ts`, a measured runtime layout
 * rather than a complete customer install. The executables are verified against their `install.json`.
 *
 * Outside the sandbox, the harness:
 * - refuses to run `package` unless `--safety-check` passed for exactly the package install's executable;
 * - times the real daemon's read-only `docker info` and `docker buildx inspect` (`--docker-samples` each);
 * - records the Docker state, the host network state and the full source identity before and after;
 * - requires nothing to survive in the sandbox's PID namespace.
 *
 * Inside the sandbox, which has loopback only, masks the Docker sockets and puts the harness at PID 1:
 * - **startup**: `--version` and `--help` for every install without `STP_TIMINGS_FILE`, installs interleaved and their
 *   order rotated per round;
 * - **active startup**: the same two commands with timings, for the package install only;
 * - **ci-install**, only when named in `--suites`: `package` of an owned one-Lambda npm project and a declared-version
 *   pnpm project that a pipeline has already installed, Docker absent, with `CI=1` (`ci-install.ts`). pnpm's exact
 *   version is fetched into an owned dlx cache outside the sandbox first, the only step with network access. It needs
 *   `--safety-check` like `package`, but never times the host daemon;
 * - **package**: `package` of each fixture size, for the package install with timings, in three Docker situations
 *   rotated per round: `platform-ready` (the guard answers `docker info` and reports amd64 and arm64, simulated),
 *   `docker-absent` (no Docker on PATH) and `buildx-failure` (the guard answers `docker info`, and buildx fails,
 *   simulated). The fixture is pure JavaScript, so it must package in every situation, take the split path whenever it
 *   has two or more functions, and ask Docker nothing (`cli-artifact-contract.ts`);
 * - **commands**, only when named in `--suites`: `defaults:list`, and `validate` of a valid and an invalid YAML
 *   configuration, for every install, interleaved and rotated per round, with timings and Docker absent
 *   (`cli-commands.ts`). `validate` needs only the fixture's STS answer to reach validation; its later AWS requests are
 *   refused by the fixture, and it never packages;
 * - **config-only**, only when named in `--suites`: `package` of each fixture size, platform-ready, while only its YAML
 *   configuration changes: the base, a deployment-only edit, its revert, a packaging-input edit and its revert, in
 *   rotated blocks, then an invalid value as a control (`config-only.ts`). Every sample's artifacts are inspected and
 *   its function ZIPs extracted and invoked. It needs `--safety-check` like `package`, but never times the host daemon.
 *
 * Every combination starts with one discarded warm-up sample. Each sample records the harness's own peak RSS and a
 * digest of the CLI's home directory before it starts, and is followed by:
 * - a check that no process it started is left;
 * - with `--inspect-artifacts`, for `package` only, a manifest of what the project's `.stacktape` holds
 *   (`artifact-inspection.ts`), taken after the process exited, so never part of the wall time. A manifest with a
 *   problem makes the sample invalid, and the outside checks hold every manifest to the packaging contract
 *   (`cli-artifact-contract.ts`);
 * - removing the project's `.stacktape`, whatever the inspection found;
 * - a check of the harness's own source.
 *
 * STS and telemetry go to the local fixture. Update and announcement requests are refused by its proxy. The tools'
 * versions are read inside the sandbox too, so no update check can leave it.
 *
 * `report.json` holds every sample, with the process, the timing analysis, the Docker guard log, the fixture requests
 * and the DNS lookups, and the summaries and paired startup comparison that `report.md` is rendered from
 * (`cli-report.ts`). `outer.json` holds the outside evidence. The exit status is 0 only when every sample was valid
 * and every outside check held.
 */
import type { ReleaseInstallManifest } from './build-release-install';
import type { HostDockerLatency, SampleRecord } from './cli-report';
import type { DockerGuard, DockerGuardMode } from './docker-guard';
import type { HostEnvironment, SourceIdentity } from './measurement-context';
import type { DnsQuery, SandboxMasks } from './network-sandbox';
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, realpathSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, readlink, rm, stat, writeFile } from 'node:fs/promises';
import { freemem, tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import yargsParser from 'yargs-parser';
import { runBoundedProcess } from './bounded-process';
import { createPathWithoutDocker, createToolDirectory, getCliEnvironment } from './cli-environment';
import type { CiInstallSetup } from './ci-install';
import type { ConfigOnlySampleState, ConfigOnlySetup, ConfigVariant } from './config-only';
import { inspectThenRemove } from './artifact-inspection';
import { evaluateArtifacts, expectedPath } from './cli-artifact-contract';
import { COMMAND_SCENARIOS, evaluateCommands, readCommandEvidence } from './cli-commands';
import {
  CI_INSTALL_MANAGERS,
  CI_INSTALL_STATES,
  evaluateCiInstall,
  FUNCTION_NAME,
  inspectAfterSample,
  managerEnvironment,
  managerLayout,
  packDependency,
  prepareManagerSeed,
  prepareSample,
  prewarmPnpm
} from './ci-install';
import { comparePairedStartup, describeSettings, renderReport, summarizeSamples } from './cli-report';
import { findProcessesByLink, readContainerEvents, readDockerState } from './cli-safety-check';
import { runCliSample } from './cli-sample';
import { analyzeTimings } from './cli-timing-analysis';
import { compareClocks, readClocks } from './clock-rate';
import {
  CONFIG_CONTROL,
  CONFIG_ONLY_BLOCKS,
  CONFIG_VARIANTS,
  configOnlyChecks,
  configOnlyShapeProblems,
  configVariantText,
  describeConfigVariant,
  describeRuntimeSdk,
  evaluateConfigOnly,
  readConfigProjectState,
  refusedEnvironmentEntries,
  RUNTIME_EVENT,
  RUNTIME_HOOKS,
  runExtractedFunctions,
  stateProblems,
  variantOf
} from './config-only';
import { createDockerGuard } from './docker-guard';
import { startExternalServiceFixture } from './external-service-fixture';
import {
  claimOutputDirectory,
  compareSourceIdentities,
  createSourceTracker,
  getHostEnvironment,
  getLoadAverage,
  getSourceIdentity
} from './measurement-context';
import {
  assertNetworkSandbox,
  discoverSandboxMasks,
  getNetworkSandboxCommand,
  getNetworkSandboxEnvironment,
  listOtherNamespaceProcesses,
  NETWORK_SANDBOX_ENV,
  readHostNetworkState,
  SANDBOX_RESOLV_CONF,
  startDnsRecorder
} from './network-sandbox';
import {
  FIXTURE_CONFIG_FILE,
  getFixtureIdentity,
  writeFixtureConfig,
  writePackagingFixture
} from './packaging-fixture';

const CLI_ROOT = resolve(import.meta.dir, '../..');
const REPO_ROOT = resolve(CLI_ROOT, '../..');
const SANDBOX_TIMEOUT_MS = 40 * 60_000;
const SYSTEM_PATH = ['/usr/bin', '/usr/sbin'];
/** Everything a release executable is built from, as for `build-release-install.ts`. */
const BUILD_SOURCE_SCOPES = ['apps/cli', 'packages', 'pnpm-lock.yaml'];
/** The code of the measurement itself, checked after every sample. */
const HARNESS_SOURCE_SCOPES = ['apps/cli/scripts/perf'];
const CONFIG_FILE = 'harness-config.json';
const INNER_REPORT_FILE = 'inner-report.json';
const DOCKER_SITUATIONS = ['platform-ready', 'docker-absent', 'buildx-failure'] as const;

type InstallRef = {
  name: string;
  directory: string;
  executable: string;
  sha256: string;
  bytes: number;
  compileTarget: string;
  version: string;
  bundleSettings: Record<string, unknown>;
  /** The source the executable was built from, as `build-release-install.ts` recorded it. */
  builtFrom: ReleaseInstallManifest['source'];
  installBytes: number;
  helperLambdas: { path: string; bytes: number; sha256: string }[];
};

const SUITES = ['startup', 'active-startup', 'package', 'ci-install', 'config-only', 'commands'] as const;
/** What runs without `--suites`: the CI-install, config-only and commands suites are only run when they are named. */
const DEFAULT_SUITES = ['startup', 'active-startup', 'package'] as const;
type Suite = (typeof SUITES)[number];

type HarnessConfig = {
  installs: InstallRef[];
  packageInstall: string | null;
  suites: Suite[];
  startupSamples: number;
  activeStartupSamples: number;
  packageSamples: number;
  functions: number[];
  timeoutMs: number;
  /** Inspect each `package` sample's output before removing it. */
  inspectArtifacts: boolean;
  ciInstallSamples: number;
  /** What the outside prepared for the CI-install suite: pnpm's version and its dlx prewarm, or why pnpm is blocked. */
  ciInstall: Awaited<ReturnType<typeof prewarmPnpm>> | null;
  configOnlySamples: number;
  commandSamples: number;
  work: string;
};

type InnerReport = {
  schema: 1;
  kind: 'stacktape-cli-harness-inner';
  startedAt: string;
  finishedAt: string | null;
  currentStep: string | null;
  sandbox: ReturnType<typeof assertNetworkSandbox> | null;
  fixtures: Record<string, { before: unknown; after: unknown }>;
  /** Each tool's `--version` inside the sandbox, and any name lookup those commands made (none expected). */
  toolVersions: { versions: Record<string, string>; dnsQueries: DnsQuery[] } | null;
  /** The CI-install suite's fixture, lockfiles and seeds, when it ran. */
  ciInstall: CiInstallSetup | null;
  /** The config-only suite's fixtures, configuration variants and runtime SDK, when it ran. */
  configOnly: ConfigOnlySetup | null;
  samples: SampleRecord[];
  error: { message: string; stack: string | null } | null;
  cleanup: { step: string; ok: boolean; error?: string }[];
};

const sha256File = (path: string) =>
  new Promise<string>((resolveHash, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolveHash(hash.digest('hex')));
  });

const describeError = (error: unknown) =>
  error instanceof Error
    ? { message: error.message, stack: error.stack ?? null }
    : { message: String(error), stack: null };

const rotate = <T>(items: readonly T[], by: number) => items.map((_, index) => items[(index + by) % items.length]!);

/**
 * The harness's own peak resident set (`VmHWM`). Linux carries it into every child the harness spawns, so a child's
 * reported max RSS is the child's own only when it is higher.
 */
const readPeakRssBytes = () => {
  const match = readFileSync('/proc/self/status', 'utf8').match(/^VmHWM:\s+(\d+) kB$/m);
  return match ? Number(match[1]) * 1024 : null;
};

/** Larger files are identified by their size alone, to keep the digest quick. */
const DIGEST_CONTENT_LIMIT_BYTES = 4 * 1024 * 1024;

/**
 * A short digest of every entry under `directory`: its path, kind, and a file's size and content or a link's target.
 * Two samples with the same digest started from the same state there.
 */
const digestTree = async (directory: string) => {
  const hash = createHash('sha256');
  const visit = async (relativePath: string) => {
    const entries = await readdir(join(directory, relativePath), { withFileTypes: true }).catch(() => []);
    for (const entry of entries.toSorted((left, right) => (left.name < right.name ? -1 : 1))) {
      const path = join(relativePath, entry.name);
      const absolutePath = join(directory, path);
      if (entry.isDirectory()) {
        hash.update(`directory ${path}\n`);
        await visit(path);
      } else if (entry.isSymbolicLink()) {
        hash.update(`link ${path} ${await readlink(absolutePath)}\n`);
      } else if (entry.isFile()) {
        const { size } = await stat(absolutePath);
        hash.update(`file ${path} ${size}\n`);
        if (size <= DIGEST_CONTENT_LIMIT_BYTES) hash.update(await readFile(absolutePath));
      } else {
        hash.update(`other ${path}\n`);
      }
    }
  };
  await visit('');
  return hash.digest('hex').slice(0, 16);
};

const VERSIONED_TOOLS = ['node', 'npm', 'pnpm', 'git', 'docker'];

/** Each tool's `--version` from the PATH the CLI gets, with an owned home and no update notifier. */
const readToolVersions = async ({ path, home }: { path: string[]; home: string }) => {
  await mkdir(home, { recursive: true });
  const versions: Record<string, string> = { bun: Bun.version };
  for (const tool of VERSIONED_TOOLS) {
    const executable = Bun.which(tool, { PATH: path.join(':') });
    if (!executable) {
      versions[tool] = 'not on PATH';
      continue;
    }
    const run = await runBoundedProcess({
      cmd: [executable, '--version'],
      cwd: home,
      env: {
        PATH: path.join(':'),
        HOME: home,
        DOCKER_CONFIG: join(home, '.docker'),
        NPM_CONFIG_UPDATE_NOTIFIER: 'false'
      },
      timeoutMs: 30_000
    });
    versions[tool] =
      run.exitCode === 0 ? (run.stdout.trim().split('\n')[0] ?? '').slice(0, 120) : `unreadable (exit ${run.exitCode})`;
  }
  return versions;
};

// Inside ------------------------------------------------------------------------------------------------------------

const runInside = async ({ out }: { out: string }) => {
  const config = JSON.parse(await readFile(join(out, CONFIG_FILE), 'utf8')) as HarnessConfig;
  const report: InnerReport = {
    schema: 1,
    kind: 'stacktape-cli-harness-inner',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    currentStep: 'sandbox',
    sandbox: null,
    fixtures: {},
    toolVersions: null,
    ciInstall: null,
    configOnly: null,
    samples: [],
    error: null,
    cleanup: []
  };
  const writeReport = () => writeFile(join(out, INNER_REPORT_FILE), `${JSON.stringify(report)}\n`);
  let dns: Awaited<ReturnType<typeof startDnsRecorder>> | undefined;
  let fixture: Awaited<ReturnType<typeof startExternalServiceFixture>> | undefined;
  try {
    report.sandbox = assertNetworkSandbox();
    await writeReport();
    dns = await startDnsRecorder();
    fixture = await startExternalServiceFixture();
    const { work } = config;
    const home = join(work, 'home');
    await mkdir(home, { recursive: true });
    const tools = join(work, 'tools');
    await createToolDirectory({ directory: tools, tools: ['node', 'npm', 'npx', 'pnpm'] });
    const withoutDocker = await createPathWithoutDocker({
      directory: join(work, 'path-without-docker'),
      sourceDirectories: SYSTEM_PATH
    });
    dns.takeQueries();
    report.currentStep = 'tool versions';
    report.toolVersions = {
      versions: await readToolVersions({ path: [tools, ...SYSTEM_PATH], home: join(work, 'tool-versions-home') }),
      dnsQueries: dns.takeQueries()
    };
    await writeReport();
    const harnessSource = createSourceTracker({
      repoRoot: REPO_ROOT,
      scopes: HARNESS_SOURCE_SCOPES,
      excludePaths: [out]
    });
    const executableStats = new Map(
      await Promise.all(
        config.installs.map(async ({ name, executable }) => {
          const { size, mtimeMs, ino } = await stat(executable);
          return [name, `${size}:${mtimeMs}:${ino}`] as const;
        })
      )
    );

    const runOne = async ({
      suite,
      scenario,
      install,
      round,
      cmd,
      cwd,
      path,
      guard,
      extraEnv,
      timings,
      packageCase,
      afterExit
    }: {
      suite: SampleRecord['suite'];
      scenario: string;
      install: InstallRef;
      round: number;
      cmd: string[];
      cwd: string;
      path: string[];
      guard?: DockerGuard | undefined;
      extraEnv?: Record<string, string>;
      timings: boolean;
      packageCase?: NonNullable<SampleRecord['packageCase']>;
      /**
       * Runs once the process has exited, before its output is inspected and removed; never part of the timing. What it
       * returns is added to the sample's record.
       */
      afterExit?: (sample: {
        directory: string;
      }) => Promise<Pick<SampleRecord, 'ciInstall' | 'configOnly' | 'command'>>;
    }) => {
      const id = `${suite}-${scenario}-${install.name}-${String(round).padStart(2, '0')}`;
      const sampleDirectory = join(out, 'samples', id);
      await mkdir(sampleDirectory, { recursive: true });
      report.currentStep = id;
      assertNetworkSandbox();
      const { size, mtimeMs, ino } = await stat(install.executable);
      if (`${size}:${mtimeMs}:${ino}` !== executableStats.get(install.name)) {
        throw new Error(`The executable of ${install.name} changed during the run.`);
      }
      const homeState = await digestTree(home);
      const harnessPeakRssBytes = readPeakRssBytes();
      const env = getCliEnvironment({
        home,
        path,
        serviceUrl: fixture!.serviceUrl,
        proxyUrl: fixture!.proxyUrl,
        extra: { ...(guard ? guard.env : { DOCKER_CONFIG: join(work, 'docker-config') }), ...extraEnv }
      });
      // `ci-info` reads the environment when the CLI loads; a CI sample without it would measure a local install.
      if (suite === 'ci-install' && env.CI !== '1') throw new Error(`Refusing to run ${id} without CI=1.`);
      const loadBefore = getLoadAverage();
      const sample = await runCliSample({
        cmd,
        cwd,
        env,
        timeoutMs: config.timeoutMs,
        timingsFile: timings ? join(sampleDirectory, 'timings.json') : undefined,
        fixture,
        dockerGuard: guard,
        dnsRecorder: dns,
        outputFiles: { stdout: join(sampleDirectory, 'stdout.log'), stderr: join(sampleDirectory, 'stderr.log') },
        findEscapedProcesses: listOtherNamespaceProcesses
      });
      const loadAfter = getLoadAverage();
      // The process has exited and its times are final; only now is its output read, then removed.
      const afterExitEvidence = afterExit ? await afterExit({ directory: sampleDirectory }) : {};
      const artifacts = await inspectThenRemove({
        outputDirectory: join(cwd, '.stacktape'),
        inspect: (config.inspectArtifacts && suite === 'package') || suite === 'ci-install' || suite === 'config-only'
      });
      const sourceCheck = harnessSource.check();
      const invalidReasons = [
        ...sample.invalidReasons,
        ...(sourceCheck === 'unchanged' ? [] : [`harness source ${sourceCheck}`]),
        ...(artifacts && artifacts.problems.length > 0 ? [`artifact inspection: ${artifacts.problems.join('; ')}`] : [])
      ];
      const record: SampleRecord = {
        id,
        suite,
        scenario,
        install: install.name,
        round,
        warmUp: round === 0,
        timings,
        exitCode: sample.process.exitCode,
        signal: sample.process.signal,
        wallMs: Math.round(sample.process.wallMs * 10) / 10,
        maxRssBytes: sample.process.maxRssBytes,
        harnessPeakRssBytes,
        userCpuMs: sample.process.userCpuMs,
        systemCpuMs: sample.process.systemCpuMs,
        invalidReasons,
        loadBefore,
        loadAfter,
        homeState,
        harnessSource: sourceCheck,
        analysis: sample.timings
          ? analyzeTimings({
              document: sample.timings,
              wallMs: sample.process.wallMs,
              spawnMonotonicNs: sample.process.spawnMonotonicNs,
              exitMonotonicNs: sample.process.exitMonotonicNs
            })
          : null,
        clock: {
          spawnMonotonicNs: sample.process.spawnMonotonicNs,
          exitMonotonicNs: sample.process.exitMonotonicNs,
          childAnchors: sample.timings?.clockAnchors ?? null
        },
        dockerOperations: sample.dockerOperations,
        fixtureRequests: sample.fixtureRequests,
        staleFixtureRequests: sample.staleFixtureRequests,
        dnsQueries: sample.dnsQueries,
        escapedProcesses: sample.escapedProcesses,
        artifacts,
        packageCase: packageCase ?? null,
        ...afterExitEvidence
      };
      report.samples.push(record);
      await writeReport();
      return record;
    };

    const startupCwd = join(work, 'startup-cwd');
    await mkdir(startupCwd, { recursive: true });
    const startupPath = [tools, withoutDocker.directory];
    const commands = [
      ['version', '--version'],
      ['help', '--help']
    ] as const;

    // Startup without timings: every install, interleaved and rotated so no install always runs first.
    for (let round = 0; config.suites.includes('startup') && round <= config.startupSamples; round++) {
      for (const install of rotate(config.installs, round)) {
        for (const [scenario, argument] of rotate(commands, round)) {
          await runOne({
            suite: 'startup',
            scenario,
            install,
            round,
            cmd: [install.executable, argument],
            cwd: startupCwd,
            path: startupPath,
            timings: false
          });
        }
      }
    }

    if (config.suites.includes('commands')) {
      report.currentStep = 'commands setup';
      const commandPath = [tools, withoutDocker.directory];
      // Refuse to start rather than find out afterwards: these commands run with Docker absent.
      const docker = Bun.which('docker', { PATH: commandPath.join(':') }) ?? null;
      if (docker !== null) throw new Error(`Refusing to run the commands suite: docker resolves to ${docker}.`);
      const projects = { valid: join(work, 'commands', 'valid'), invalid: join(work, 'commands', 'invalid') };
      for (const [name, project] of Object.entries(projects)) {
        const manifest = await writePackagingFixture({ root: project, functions: 1 });
        await writeFixtureConfig({ root: project, functions: manifest.functions });
        await writeFile(
          join(project, 'node_modules/.stacktape-install-hash'),
          createHash('sha256')
            .update(await readFile(join(project, 'package-lock.json')))
            .digest('hex')
        );
        if (name === 'invalid') {
          const base = await readFile(join(project, FIXTURE_CONFIG_FILE), 'utf8');
          await writeFile(
            join(project, FIXTURE_CONFIG_FILE),
            configVariantText({ base, variant: CONFIG_CONTROL, functions: 1 })
          );
        }
        report.fixtures[`commands-${name}`] = { before: await getFixtureIdentity(project), after: null };
      }
      await writeReport();
      for (let round = 0; round <= config.commandSamples; round++) {
        for (const install of rotate(config.installs, round)) {
          for (const { scenario, args, project } of rotate(COMMAND_SCENARIOS, round)) {
            await runOne({
              suite: 'commands',
              scenario,
              install,
              round,
              cmd: [install.executable, ...args],
              cwd: project ? projects[project] : startupCwd,
              path: commandPath,
              timings: true,
              afterExit: async ({ directory }) => ({ command: await readCommandEvidence({ scenario, directory }) })
            });
          }
        }
      }
      for (const [name, project] of Object.entries(projects)) {
        report.fixtures[`commands-${name}`]!.after = await getFixtureIdentity(project);
      }
      await writeReport();
    }

    const packageInstall = config.installs.find(({ name }) => name === config.packageInstall);
    if (packageInstall) {
      for (let round = 0; config.suites.includes('active-startup') && round <= config.activeStartupSamples; round++) {
        for (const [scenario, argument] of rotate(commands, round)) {
          await runOne({
            suite: 'active-startup',
            scenario,
            install: packageInstall,
            round,
            cmd: [packageInstall.executable, argument],
            cwd: startupCwd,
            path: startupPath,
            timings: true
          });
        }
      }

      const guards = new Map<string, DockerGuard>();
      const guardFor = async (key: string, mode: DockerGuardMode) => {
        if (!guards.has(key)) {
          guards.set(key, await createDockerGuard({ directory: join(work, 'guards', key), mode }));
        }
        return guards.get(key)!;
      };
      for (const functions of config.suites.includes('package') ? config.functions : []) {
        const project = join(work, 'projects', `functions-${functions}`);
        const manifest = await writePackagingFixture({ root: project, functions });
        await writeFixtureConfig({ root: project, functions: manifest.functions });
        // The fixture vendors its packages, so a marker matching its lockfile is what a completed install leaves.
        await writeFile(
          join(project, 'node_modules/.stacktape-install-hash'),
          createHash('sha256')
            .update(await readFile(join(project, 'package-lock.json')))
            .digest('hex')
        );
        const fixtureKey = `functions-${functions}`;
        report.fixtures[fixtureKey] = { before: await getFixtureIdentity(project), after: null };
        const command = [
          packageInstall.executable,
          'package',
          '--projectName',
          'perfbaseline',
          '--stage',
          'perf',
          '--region',
          'eu-west-1'
        ];
        for (let round = 0; round <= config.packageSamples; round++) {
          for (const situation of rotate(DOCKER_SITUATIONS, round)) {
            const guard =
              situation === 'docker-absent' ? undefined : await guardFor(`${fixtureKey}-${situation}`, situation);
            const path = guard ? [guard.binDirectory, tools, ...SYSTEM_PATH] : [tools, withoutDocker.directory];
            // Refuse to start rather than find out afterwards: the Docker answer this situation needs.
            const resolved = Bun.which('docker', { PATH: path.join(':') }) ?? null;
            if (resolved !== (guard?.dockerPath ?? null)) {
              throw new Error(`Refusing to run ${situation}: docker resolves to ${resolved}.`);
            }
            await runOne({
              suite: 'package',
              scenario: `${functions}-functions-${situation}`,
              install: packageInstall,
              round,
              cmd: command,
              cwd: project,
              path,
              guard,
              timings: true,
              packageCase: {
                functions: manifest.functions.map(({ name }) => name),
                situation,
                helperLambdas: packageInstall.helperLambdas.map(({ path, sha256 }) => ({
                  file: basename(path),
                  sha256
                }))
              }
            });
          }
        }
        report.fixtures[fixtureKey]!.after = await getFixtureIdentity(project);
        await writeReport();
      }

      if (config.suites.includes('ci-install')) {
        report.currentStep = 'ci-install setup';
        const ciRoot = join(work, 'ci-install');
        const ciPath = [tools, withoutDocker.directory];
        // Refuse to start rather than find out afterwards: these samples need Docker absent.
        const docker = Bun.which('docker', { PATH: ciPath.join(':') }) ?? null;
        if (docker !== null) throw new Error(`Refusing to run ci-install: docker resolves to ${docker}.`);
        const prepared = config.ciInstall;
        const pnpmVersion = prepared?.pnpmVersion ?? 'unavailable';
        const recorders = { takeRequests: () => fixture!.takeRequests(), takeQueries: () => dns!.takeQueries() };
        const toolPaths = { npm: join(tools, 'npm'), pnpm: join(tools, 'pnpm'), node: join(tools, 'node') };
        const managerExtra = (manager: (typeof CI_INSTALL_MANAGERS)[number]) => ({
          CI: '1',
          ...managerEnvironment({ manager, state: managerLayout(ciRoot, manager).state })
        });
        // The same environment the CLI gives its installer child, which inherits the CLI's.
        const environmentFor = (extra: Record<string, string>) =>
          getCliEnvironment({
            home,
            path: ciPath,
            serviceUrl: fixture.serviceUrl,
            proxyUrl: fixture.proxyUrl,
            extra: { DOCKER_CONFIG: join(work, 'docker-config'), ...extra }
          });
        const setup: CiInstallSetup = {
          pnpmVersion,
          prewarm: prepared?.prewarm ?? null,
          dependency: null,
          managers: []
        };
        report.ciInstall = setup;
        const dependency = await packDependency({
          ciRoot,
          npm: toolPaths.npm,
          env: environmentFor({ CI: '1', npm_config_cache: join(ciRoot, 'pack-cache') }),
          recorders
        });
        setup.dependency = dependency.sha256
          ? { sha256: dependency.sha256, bytes: dependency.bytes, pack: dependency.pack }
          : null;
        for (const manager of CI_INSTALL_MANAGERS) {
          const blocked = !setup.dependency
            ? 'the dependency tarball was not packed'
            : manager === 'pnpm' && (prepared?.blocked || !prepared?.pnpmVersion)
              ? `the pnpm prewarm outside the sandbox did not succeed: ${prepared?.blocked ?? 'no version'}`
              : null;
          setup.managers.push(
            blocked
              ? {
                  manager,
                  blocked,
                  packageManagerDeclaration: null,
                  lockfile: '',
                  lockSha256: null,
                  inputs: {},
                  lockfilesPresent: [],
                  steps: [],
                  seed: null
                }
              : await prepareManagerSeed({
                  manager,
                  layout: managerLayout(ciRoot, manager),
                  pnpmVersion,
                  tarball: dependency.path,
                  tools: toolPaths,
                  env: environmentFor(managerExtra(manager)),
                  recorders
                })
          );
          await writeReport();
        }

        const ready = setup.managers.filter(({ blocked }) => !blocked);
        const helperLambdas = packageInstall.helperLambdas.map(({ path, sha256 }) => ({
          file: basename(path),
          sha256
        }));
        const command = [
          packageInstall.executable,
          'package',
          '--projectName',
          'perfbaseline',
          '--stage',
          'perf',
          '--region',
          'eu-west-1'
        ];
        for (let round = 0; round <= config.ciInstallSamples; round++) {
          for (const managerSetup of rotate(ready, round)) {
            const { manager } = managerSetup;
            const layout = managerLayout(ciRoot, manager);
            for (const state of rotate(CI_INSTALL_STATES, round)) {
              report.currentStep = `ci-install ${manager} ${state} ${round} preparation`;
              const sample = await prepareSample({
                layout,
                manager,
                state,
                setup: managerSetup,
                env: environmentFor(managerExtra(manager)),
                node: toolPaths.node
              });
              await runOne({
                suite: 'ci-install',
                scenario: `${manager}-${state}`,
                install: packageInstall,
                round,
                cmd: command,
                cwd: layout.project,
                path: ciPath,
                extraEnv: managerExtra(manager),
                timings: true,
                packageCase: { functions: [FUNCTION_NAME], situation: 'docker-absent', helperLambdas },
                afterExit: async () => {
                  const inspected = await inspectAfterSample({
                    layout,
                    manager,
                    expectedInputs: sample.expectedInputs,
                    validMarker: sample.validMarkerAfter,
                    sizesBefore: sample.sizes,
                    extractDirectory: join(ciRoot, 'extracted', `${manager}-${state}-${round}`),
                    invocationEnv: { HOME: home, PATH: ciPath.join(':'), LANG: 'C.UTF-8' },
                    node: toolPaths.node
                  });
                  return {
                    ciInstall: {
                      manager,
                      state,
                      pnpmVersion,
                      lockSha256: managerSetup.lockSha256!,
                      restore: sample.restore,
                      preparationMs: sample.preparationMs,
                      before: sample.before,
                      after: inspected.after,
                      growth: inspected.growth,
                      invocation: inspected.invocation,
                      rootScriptRan: inspected.rootScriptRan
                    }
                  };
                }
              });
            }
          }
        }
      }

      if (config.suites.includes('config-only')) {
        report.currentStep = 'config-only setup';
        const configRoot = join(work, 'config-only');
        await mkdir(configRoot, { recursive: true });
        const hooksPath = join(configRoot, 'runtime-hooks.mjs');
        await writeFile(hooksPath, RUNTIME_HOOKS);
        const sdk = await describeRuntimeSdk(CLI_ROOT);
        const node = join(tools, 'node');
        const runtimePath = [tools, withoutDocker.directory].join(':');
        const setup: ConfigOnlySetup = {
          sdk,
          hooksSha256: createHash('sha256').update(RUNTIME_HOOKS).digest('hex'),
          event: RUNTIME_EVENT,
          shapes: []
        };
        report.configOnly = setup;
        const helperLambdas = packageInstall.helperLambdas.map(({ path, sha256 }) => ({
          file: basename(path),
          sha256
        }));
        const command = [
          packageInstall.executable,
          'package',
          '--projectName',
          'perfbaseline',
          '--stage',
          'perf',
          '--region',
          'eu-west-1'
        ];
        const shapes: {
          functions: number;
          names: string[];
          project: string;
          texts: Record<ConfigVariant, string>;
          guard: DockerGuard;
          path: string[];
          /** The bytes the last edit replaced, which its revert writes back. */
          replaced: Buffer | null;
        }[] = [];
        for (const functions of config.functions) {
          const project = join(configRoot, `functions-${functions}`);
          const manifest = await writePackagingFixture({ root: project, functions });
          await writeFixtureConfig({ root: project, functions: manifest.functions });
          // As in the package suite: a marker matching the lockfile is what a completed install of the vendored packages leaves.
          await writeFile(
            join(project, 'node_modules/.stacktape-install-hash'),
            createHash('sha256')
              .update(await readFile(join(project, 'package-lock.json')))
              .digest('hex')
          );
          const names = manifest.functions.map(({ name }) => name);
          const base = await readFile(join(project, FIXTURE_CONFIG_FILE), 'utf8');
          const texts = Object.fromEntries(
            CONFIG_VARIANTS.map((variant) => [variant, configVariantText({ base, variant, functions })])
          ) as Record<ConfigVariant, string>;
          setup.shapes.push({
            functions,
            functionNames: names,
            expected: expectedPath({ situation: 'platform-ready', functions }),
            source: await getFixtureIdentity(project, { exclude: [FIXTURE_CONFIG_FILE] }),
            variants: Object.fromEntries(
              CONFIG_VARIANTS.map((variant) => [
                variant,
                describeConfigVariant({ base, text: texts[variant], variant, functionNames: names })
              ])
            ) as ConfigOnlySetup['shapes'][number]['variants']
          });
          const guard = await guardFor(`config-only-functions-${functions}`, 'platform-ready');
          const path = [guard.binDirectory, tools, ...SYSTEM_PATH];
          // Refuse to start rather than find out afterwards: every sample needs the simulating guard's answer.
          const resolved = Bun.which('docker', { PATH: path.join(':') }) ?? null;
          if (resolved !== guard.dockerPath) {
            throw new Error(`Refusing to run config-only: docker resolves to ${resolved}.`);
          }
          shapes.push({ functions, names, project, texts, guard, path, replaced: null });
          report.fixtures[`config-only-functions-${functions}`] = {
            before: await getFixtureIdentity(project),
            after: null
          };
        }
        await writeReport();
        const setupProblems = setup.shapes.flatMap(({ variants }) =>
          Object.values(variants).flatMap(({ problems }) => problems)
        );
        if (setupProblems.length > 0 || !sdk.version) {
          throw new Error(
            `Refusing to run config-only: ${[...setupProblems, ...(sdk.version ? [] : ['no runtime SDK'])].join('; ')}`
          );
        }

        const runState = async (shape: (typeof shapes)[number], state: ConfigOnlySampleState, round: number) => {
          report.currentStep = `config-only ${shape.functions} ${state} ${round} preparation`;
          const started = performance.now();
          const configPath = join(shape.project, FIXTURE_CONFIG_FILE);
          const variant = variantOf(state);
          const configSha256 = setup.shapes.find(({ functions }) => functions === shape.functions)!.variants[variant]
            .sha256;
          const source = setup.shapes.find(({ functions }) => functions === shape.functions)!.source;
          let action: 'kept' | 'edited' | 'reverted' = 'kept';
          if (variant !== 'base') {
            shape.replaced = await readFile(configPath);
            await writeFile(configPath, shape.texts[variant]);
            action = 'edited';
          } else if (state !== 'base') {
            if (!shape.replaced) throw new Error(`Refusing to run ${state} without the bytes an edit replaced.`);
            await writeFile(configPath, shape.replaced);
            shape.replaced = null;
            action = 'reverted';
          }
          const before = await readConfigProjectState(shape.project);
          const problems = stateProblems({ state: before, configSha256, source, output: false });
          if (problems.length > 0) {
            throw new Error(`Refusing to run config-only ${shape.functions} ${state}: ${problems.join('; ')}`);
          }
          const preparationMs = Math.round((performance.now() - started) * 10) / 10;
          await runOne({
            suite: 'config-only',
            scenario: `${shape.functions}-functions-${state}`,
            install: packageInstall,
            round,
            cmd: command,
            cwd: shape.project,
            path: shape.path,
            guard: shape.guard,
            timings: true,
            packageCase: { functions: shape.names, situation: 'platform-ready', helperLambdas },
            afterExit: async ({ directory }) => ({
              configOnly: {
                functions: shape.functions,
                state,
                variant,
                configSha256,
                preparation: { action, ms: preparationMs },
                before,
                after: await readConfigProjectState(shape.project),
                runtime:
                  state === CONFIG_CONTROL
                    ? null
                    : await runExtractedFunctions({
                        project: shape.project,
                        functions: shape.names,
                        extractRoot: join(configRoot, 'extracted', `${shape.functions}-${state}-${round}`),
                        hooksPath,
                        sdkParentUrl: sdk.parentUrl,
                        node,
                        env: { HOME: home, PATH: runtimePath, LANG: 'C.UTF-8' },
                        recorders: {
                          takeRequests: () => fixture!.takeRequests(),
                          takeQueries: () => dns!.takeQueries()
                        }
                      }),
                refusedEntries:
                  state === CONFIG_CONTROL
                    ? refusedEnvironmentEntries(
                        (
                          await Promise.all(
                            ['stdout.log', 'stderr.log'].map((name) =>
                              readFile(join(directory, name), 'utf8').catch(() => '')
                            )
                          )
                        ).join('\n')
                      )
                    : null
              }
            })
          });
        };

        for (let round = 0; round <= config.configOnlySamples; round++) {
          for (const shape of rotate(shapes, round)) {
            for (const state of rotate(CONFIG_ONLY_BLOCKS, round).flat()) await runState(shape, state, round);
          }
        }
        // The control: the CLI must refuse every CONFIG_REVISION value made a list, so it reads the entry the deployment
        // edit changed. Then the base is written back.
        for (const shape of shapes) {
          await runState(shape, CONFIG_CONTROL, config.configOnlySamples + 1);
          await writeFile(join(shape.project, FIXTURE_CONFIG_FILE), shape.replaced!);
          shape.replaced = null;
          report.fixtures[`config-only-functions-${shape.functions}`]!.after = await getFixtureIdentity(shape.project);
        }
        await writeReport();
      }
    }
    report.currentStep = null;
  } catch (error) {
    report.error = describeError(error);
  } finally {
    const cleanupSteps: [string, () => Promise<unknown> | undefined][] = [
      ['close the external-service fixture', () => fixture?.close()],
      ['close the DNS recorder', () => dns?.close()]
    ];
    for (const [step, action] of cleanupSteps) {
      try {
        await action();
        report.cleanup.push({ step, ok: true });
      } catch (error) {
        report.cleanup.push({ step, ok: false, error: describeError(error).message });
      }
    }
    report.finishedAt = new Date().toISOString();
    await writeReport();
  }
  if (report.error) console.error(`The measurement stopped early: ${report.error.message}`);
  process.exitCode = report.error || report.cleanup.some(({ ok }) => !ok) ? 1 : 0;
};

// Outside -----------------------------------------------------------------------------------------------------------

const loadInstall = async (name: string, directory: string): Promise<InstallRef> => {
  const manifest = JSON.parse(await readFile(join(directory, 'install.json'), 'utf8')) as ReleaseInstallManifest;
  const executable = join(directory, manifest.installDirectory, manifest.executable.path);
  const sha256 = await sha256File(executable);
  if (sha256 !== manifest.executable.sha256) {
    throw new Error(`The executable of ${name} does not match its install.json (${sha256}).`);
  }
  return {
    name,
    directory,
    executable,
    sha256,
    bytes: manifest.executable.bytes,
    compileTarget: manifest.compileTarget,
    version: manifest.version,
    bundleSettings: manifest.bundleSettings,
    builtFrom: manifest.source,
    installBytes: manifest.files.reduce((sum, { bytes }) => sum + bytes, 0),
    helperLambdas: manifest.files
      .filter(({ path }) => path.startsWith('helper-lambdas/'))
      .map(({ path, bytes, sha256: fileSha256 }) => ({ path, bytes, sha256: fileSha256 }))
  };
};

/** The safety check that must have passed for the executable `package` samples run. */
const verifySafetyCheck = async (directory: string, install: InstallRef) => {
  const outer = JSON.parse(await readFile(join(directory, 'outer.json'), 'utf8'));
  const inner = JSON.parse(await readFile(join(directory, 'safety-check.json'), 'utf8'));
  if (outer.passed !== true || inner.passed !== true) throw new Error(`The safety check in ${directory} did not pass.`);
  if (inner.executable?.sha256 !== install.sha256) {
    throw new Error(`The safety check in ${directory} was for another executable (${inner.executable?.sha256}).`);
  }
  return { directory, executableSha256: inner.executable.sha256 as string, finishedAt: inner.finishedAt as string };
};

/** Read-only, on the host: the real daemon's `docker info` and `docker buildx inspect`, each timed as a process. */
const timeHostDocker = async ({ realDocker, work, samples }: { realDocker: string; work: string; samples: number }) => {
  const configDirectory = join(work, 'host-docker-latency');
  await mkdir(configDirectory, { recursive: true });
  const env = { PATH: SYSTEM_PATH.join(':'), HOME: configDirectory, DOCKER_CONFIG: configDirectory };
  const commands = { info: ['info'], 'buildx inspect': ['buildx', 'inspect'] } as const;
  const results: HostDockerLatency = {};
  for (let round = 0; round <= samples; round++) {
    for (const [label, args] of Object.entries(commands)) {
      const run = await runBoundedProcess({
        cmd: [realDocker, ...args],
        cwd: configDirectory,
        env,
        timeoutMs: 60_000
      });
      (results[label] ??= []).push({ round, wallMs: Math.round(run.wallMs * 10) / 10, exitCode: run.exitCode });
    }
  }
  return results;
};

const runOutside = async (args: ReturnType<typeof yargsParser>) => {
  const out = resolve(String(args.out));
  await claimOutputDirectory(out);
  const evidence: Record<string, unknown> = { schema: 1, kind: 'stacktape-cli-harness-outer' };
  const checks: { check: string; passed: boolean; detail: string }[] = [];
  const expect = (check: string, passed: boolean, detail: unknown) =>
    checks.push({ check, passed, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  const clockStart = readClocks();
  evidence.freeMemoryBytesBefore = freemem();
  const work = await mkdtemp(join(tmpdir(), 'stacktape-cli-harness-'));
  let inner: InnerReport | null = null;
  let installs: InstallRef[] = [];
  let config: HarnessConfig | null = null;
  let artifactResults: ReturnType<typeof evaluateArtifacts> | null = null;
  let ciInstallResult: ReturnType<typeof evaluateCiInstall> | null = null;
  let configOnlyResult: ReturnType<typeof evaluateConfigOnly> | null = null;
  let commandsResult: ReturnType<typeof evaluateCommands> | null = null;
  try {
    const installArguments = ([] as string[]).concat(args.install ?? []);
    installs = await Promise.all(
      installArguments.map((entry) => {
        const [name, directory] = entry.split('=');
        if (!name || !directory) throw new Error(`--install must be <name>=<directory>, not ${entry}.`);
        return loadInstall(name, resolve(directory));
      })
    );
    if (installs.length === 0) throw new Error('At least one --install is needed.');
    const suites = String(args.suites ?? DEFAULT_SUITES.join(','))
      .split(',')
      .map((suite) => {
        if (!(SUITES as readonly string[]).includes(suite)) throw new Error(`Unknown suite ${suite}.`);
        return suite as Suite;
      });
    const packageInstallName = args['package-install'] ? String(args['package-install']) : null;
    const packageInstall = installs.find(({ name }) => name === packageInstallName) ?? null;
    if (packageInstallName && !packageInstall)
      throw new Error(`--package-install ${packageInstallName} is not an --install.`);
    for (const suite of ['ci-install', 'config-only'] as const) {
      if (suites.includes(suite) && !packageInstall) {
        throw new Error(`The \`${suite}\` suite runs \`package\` and needs --package-install.`);
      }
    }
    if (
      packageInstall &&
      (suites.includes('package') || suites.includes('ci-install') || suites.includes('config-only'))
    ) {
      if (!args['safety-check']) throw new Error('`package` samples need --safety-check for that executable.');
      evidence.safetyCheck = await verifySafetyCheck(resolve(String(args['safety-check'])), packageInstall);
    }
    let ciInstall: Awaited<ReturnType<typeof prewarmPnpm>> | null = null;
    if (suites.includes('ci-install')) {
      // Outside the sandbox, with network access, before anything is measured: pnpm's exact version into an owned cache.
      const ciRoot = join(work, 'ci-install');
      const prewarmTools = join(ciRoot, 'prewarm-tools');
      await createToolDirectory({ directory: prewarmTools, tools: ['node', 'pnpm'] });
      ciInstall = await prewarmPnpm({
        ciRoot,
        home: join(work, 'home'),
        toolsDirectory: prewarmTools,
        systemPath: SYSTEM_PATH
      });
      evidence.ciInstallPrewarm = ciInstall;
    }
    config = {
      installs,
      packageInstall: packageInstall?.name ?? null,
      suites,
      startupSamples: Number(args['startup-samples'] ?? 21),
      activeStartupSamples: Number(args['active-startup-samples'] ?? 11),
      packageSamples: Number(args['package-samples'] ?? 11),
      functions: String(args.functions ?? '1,10')
        .split(',')
        .map(Number),
      timeoutMs: Number(args['timeout-ms'] ?? 120_000),
      inspectArtifacts: args['inspect-artifacts'] === true,
      ciInstallSamples: Number(args['ci-install-samples'] ?? 11),
      ciInstall,
      configOnlySamples: Number(args['config-only-samples'] ?? 11),
      commandSamples: Number(args['command-samples'] ?? 11),
      work
    };
    // The config-only suite compares one function on the per-function path with ten on the split path: both are needed.
    if (suites.includes('config-only')) {
      const shapeProblems = configOnlyShapeProblems(config.functions);
      if (shapeProblems.length > 0) throw new Error(`Refusing to run config-only: ${shapeProblems.join('; ')}.`);
    }
    await writeFile(join(out, CONFIG_FILE), `${JSON.stringify(config, null, 2)}\n`);
    evidence.config = { ...config, work: 'owned temporary directory, removed afterwards' };
    evidence.host = getHostEnvironment();
    evidence.buildSourceBefore = getSourceIdentity({
      repoRoot: REPO_ROOT,
      scopes: BUILD_SOURCE_SCOPES,
      excludePaths: [out]
    });

    const realDocker = Bun.which('docker', { PATH: SYSTEM_PATH.join(':') });
    const readOnlyConfig = join(work, 'host-read-only-docker-config');
    const dockerBefore = realDocker ? await readDockerState({ realDocker, configDirectory: readOnlyConfig }) : null;
    evidence.dockerBefore = dockerBefore;
    if (realDocker && packageInstall && suites.includes('package')) {
      evidence.hostDockerLatency = await timeHostDocker({
        realDocker,
        work,
        samples: Number(args['docker-samples'] ?? 11)
      });
    }
    const masks: SandboxMasks = discoverSandboxMasks();
    evidence.masks = masks;
    const hostBefore = readHostNetworkState();
    const resolvConfPath = join(out, 'sandbox-resolv.conf');
    await writeFile(resolvConfPath, SANDBOX_RESOLV_CONF);
    const windowStart = Math.floor(Date.now() / 1000);
    evidence.loadBefore = getLoadAverage();
    const sandboxed = await runBoundedProcess({
      cmd: getNetworkSandboxCommand({
        argv: [process.execPath, import.meta.path, '--out', out],
        resolvConfPath,
        masks
      }),
      cwd: CLI_ROOT,
      env: { ...(process.env as Record<string, string>), ...getNetworkSandboxEnvironment(masks) },
      timeoutMs: SANDBOX_TIMEOUT_MS,
      outputFiles: { stdout: join(out, 'sandbox.stdout.log'), stderr: join(out, 'sandbox.stderr.log') }
    });
    evidence.loadAfter = getLoadAverage();
    const windowEnd = Math.ceil(Date.now() / 1000) + 1;
    inner = await readFile(join(out, INNER_REPORT_FILE), 'utf8')
      .then((content) => JSON.parse(content) as InnerReport)
      .catch(() => null);
    const pidNamespace = inner?.sandbox?.pidNamespace ?? null;
    const survivors = pidNamespace ? findProcessesByLink('ns/pid', pidNamespace) : null;
    const executablesRunning = installs.flatMap(({ executable }) =>
      findProcessesByLink('exe', realpathSync(executable))
    );
    const hostAfter = readHostNetworkState();
    const dockerAfter = realDocker ? await readDockerState({ realDocker, configDirectory: readOnlyConfig }) : null;
    const events = realDocker
      ? await readContainerEvents({ realDocker, configDirectory: readOnlyConfig, since: windowStart, until: windowEnd })
      : null;
    const buildSourceAfter = getSourceIdentity({
      repoRoot: REPO_ROOT,
      scopes: BUILD_SOURCE_SCOPES,
      excludePaths: [out]
    });
    Object.assign(evidence, {
      sandboxProcess: {
        exitCode: sandboxed.exitCode,
        signal: sandboxed.signal,
        timedOut: sandboxed.timedOut,
        leftoverProcesses: sandboxed.leftoverProcesses,
        wallMs: sandboxed.wallMs
      },
      pidNamespace,
      survivors,
      executablesRunning,
      hostAfter,
      dockerAfter,
      containerEvents: events,
      buildSourceAfter,
      buildSourceCheck: compareSourceIdentities(
        evidence.buildSourceBefore as ReturnType<typeof getSourceIdentity>,
        buildSourceAfter
      ),
      executablesAfter: await Promise.all(
        installs.map(async ({ name, executable, sha256 }) => ({
          name,
          unchanged: (await sha256File(executable)) === sha256
        }))
      )
    });
    expect(
      'the sandboxed measurement exited by itself with status 0',
      sandboxed.exitCode === 0 && !sandboxed.timedOut,
      evidence.sandboxProcess
    );
    expect(
      'the inner report is complete',
      inner?.error === null && inner.finishedAt !== null,
      inner?.error ?? 'missing'
    );
    expect('no process of the sandbox PID namespace remains', survivors !== null && survivors.length === 0, survivors);
    expect('no measured executable is still running', executablesRunning.length === 0, executablesRunning);
    expect(
      'every executable is unchanged',
      (evidence.executablesAfter as { unchanged: boolean }[]).every(({ unchanged }) => unchanged),
      evidence.executablesAfter
    );
    if (dockerBefore && dockerAfter && events) {
      expect(
        'the Docker state was readable and unchanged',
        dockerBefore.problems.length === 0 &&
          dockerAfter.problems.length === 0 &&
          dockerBefore.defaultBuilderPlatforms === dockerAfter.defaultBuilderPlatforms &&
          dockerBefore.binfmtHandlers.join(',') === dockerAfter.binfmtHandlers.join(',') &&
          dockerAfter.binfmtContainers === 0,
        { dockerBefore, dockerAfter }
      );
      expect('no binfmt container ran', events.exitCode === 0 && events.binfmt.length === 0, events);
    }
    expect('the host network state is unchanged', JSON.stringify(hostBefore) === JSON.stringify(hostAfter), {
      hostBefore,
      hostAfter
    });
    const samples = inner?.samples ?? [];
    const invalid = samples.filter(({ invalidReasons, warmUp }) => !warmUp && invalidReasons.length > 0);
    expect(
      'every measured sample is valid',
      samples.length > 0 && invalid.length === 0,
      invalid.map(({ id, invalidReasons }) => ({ id, invalidReasons }))
    );
    if (config.inspectArtifacts) {
      const packageSamples = samples.filter(({ suite }) => suite === 'package');
      const uninspected = packageSamples.filter(({ artifacts }) => !artifacts).map(({ id }) => id);
      expect('every package sample was inspected', packageSamples.length > 0 && uninspected.length === 0, uninspected);
      artifactResults = evaluateArtifacts(samples);
      expect(
        'every package sample, warm-ups included, met its artifact contract',
        artifactResults.length > 0 && artifactResults.every(({ contractMet }) => contractMet),
        artifactResults.flatMap(({ samples: results }) =>
          results.filter(({ problems }) => problems.length > 0).map(({ id, problems }) => ({ id, problems }))
        )
      );
      const zipFolderMismatches = artifactResults.flatMap(({ functions, samples: results }) =>
        results
          .filter(({ counts }) => counts.zipsMatchingFolder !== functions)
          .map(({ id, counts }) => ({ id, zipsMatchingFolder: counts.zipsMatchingFolder, functions }))
      );
      expect(
        "every successful package sample's function ZIPs each hold exactly their unzipped folder's content",
        artifactResults.length > 0 && zipFolderMismatches.length === 0,
        zipFolderMismatches
      );
      expect(
        'the retained samples of every scenario repeated their canonical artifact content',
        artifactResults.every(({ retained }) => retained.samples >= 2 && retained.canonicalRepeated),
        artifactResults
          .filter(({ retained }) => !(retained.samples >= 2 && retained.canonicalRepeated))
          .map(({ scenario, retained }) => ({ scenario, samples: retained.samples, missingIn: retained.missingIn }))
      );
    }
    if (config.suites.includes('ci-install')) {
      const install = installs.find(({ name }) => name === config!.packageInstall)!;
      ciInstallResult = evaluateCiInstall({
        samples,
        setup: inner?.ciInstall ?? null,
        helperLambdas: install.helperLambdas.map(({ path, sha256 }) => ({ file: basename(path), sha256 }))
      });
      expect(
        'the CI-install setup prepared both package managers',
        ciInstallResult.setupProblems.length === 0,
        ciInstallResult.setupProblems
      );
      expect(
        'every CI-install manager and state has its retained samples',
        ciInstallResult.retainedPerState.every(({ retained }) => retained >= config!.ciInstallSamples),
        ciInstallResult.retainedPerState
      );
      const failing = ciInstallResult.samples.filter(({ problems }) => problems.length > 0);
      expect(
        'every CI-install sample met the installer, output and isolation requirements',
        ciInstallResult.samples.length > 0 && failing.length === 0,
        failing.map(({ id, problems }) => ({ id, problems }))
      );
      expect(
        "every CI-install manager's samples produced one function ZIP (one canonical digest, one name digest)",
        ciInstallResult.identity.every(
          ({ samples: count, canonicalSha256, nameDigests }) =>
            count > 0 && canonicalSha256.length === 1 && nameDigests.length === 1
        ),
        ciInstallResult.identity
      );
    }
    if (config.suites.includes('commands')) {
      commandsResult = evaluateCommands({ samples, reference: installs[0]?.name ?? null });
      const failing = commandsResult.samples.filter(({ problems }) => problems.length > 0);
      expect(
        'every command sample met its scenario: defaults:list answered, the valid configuration passed validation, and the invalid one failed at config:validate with CONFIG_SCHEMA_INVALID naming the refused entry',
        commandsResult.samples.length > 0 && failing.length === 0,
        failing.map(({ id, problems }) => ({ id, problems }))
      );
      expect(
        'every install behaved the same in every command scenario',
        commandsResult.behaviorProblems.length === 0,
        commandsResult.behaviorProblems
      );
      expect(
        'every install and command scenario has its retained samples',
        commandsResult.retained.length === COMMAND_SCENARIOS.length * installs.length &&
          commandsResult.retained.every(({ retained }) => retained >= config!.commandSamples),
        commandsResult.retained
      );
      const fixtures = Object.entries(inner?.fixtures ?? {}).filter(([key]) => key.startsWith('commands-'));
      expect(
        'both command fixtures ended byte-identical to how they were prepared',
        fixtures.length === 2 &&
          fixtures.every(([, { before, after }]) => JSON.stringify(before) === JSON.stringify(after)),
        Object.fromEntries(fixtures)
      );
    }
    if (config.suites.includes('config-only')) {
      const install = installs.find(({ name }) => name === config!.packageInstall)!;
      configOnlyResult = evaluateConfigOnly({
        samples,
        setup: inner?.configOnly ?? null,
        helperLambdas: install.helperLambdas.map(({ path, sha256 }) => ({ file: basename(path), sha256 })),
        retainedWanted: config.configOnlySamples
      });
      for (const { check, passed, detail } of configOnlyChecks({
        result: configOnlyResult,
        fixtures: inner?.fixtures ?? {}
      })) {
        expect(check, passed, detail);
      }
    }
  } catch (error) {
    evidence.error = describeError(error);
  } finally {
    try {
      await rm(work, { recursive: true, force: true });
      evidence.workRemoved = true;
    } catch (error) {
      evidence.workRemoved = false;
      evidence.cleanupError = describeError(error).message;
    }
  }
  const clock = compareClocks(clockStart, readClocks());
  evidence.clock = clock;
  evidence.freeMemoryBytesAfter = freemem();
  const passed = !evidence.error && evidence.workRemoved === true && checks.every(({ passed: ok }) => ok);
  evidence.checks = checks;
  evidence.passed = passed;
  await writeFile(join(out, 'outer.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  const samples = inner?.samples ?? [];
  const summaries = summarizeSamples(samples);
  const reference = installs[0]?.name ?? null;
  const paired = reference ? comparePairedStartup({ samples, reference }) : [];
  await writeFile(
    join(out, 'report.json'),
    `${JSON.stringify(
      {
        summaries,
        paired,
        ...(artifactResults && { artifacts: artifactResults }),
        ...(ciInstallResult && { ciInstall: ciInstallResult }),
        ...(configOnlyResult && { configOnly: configOnlyResult }),
        ...(commandsResult && { commands: commandsResult }),
        samples
      },
      null,
      2
    )}\n`
  );
  const buildSourceBefore = (evidence.buildSourceBefore as SourceIdentity | undefined) ?? null;
  const buildSourceAfter = (evidence.buildSourceAfter as SourceIdentity | undefined) ?? null;
  const markdown = renderReport({
    passed,
    checks,
    clock,
    settings: config
      ? describeSettings(config, (evidence.safetyCheck as { directory: string } | undefined)?.directory ?? null)
      : {},
    installs,
    reference,
    summaries,
    paired,
    hostDockerLatency: (evidence.hostDockerLatency as HostDockerLatency | undefined) ?? null,
    host: (evidence.host as HostEnvironment | undefined) ?? null,
    toolVersions: inner?.toolVersions?.versions ?? null,
    source: {
      before: buildSourceBefore,
      after: buildSourceAfter,
      check: buildSourceBefore && buildSourceAfter ? compareSourceIdentities(buildSourceBefore, buildSourceAfter) : null
    },
    load: {
      before: (evidence.loadBefore as number | undefined) ?? null,
      after: (evidence.loadAfter as number | undefined) ?? null
    },
    artifacts: artifactResults,
    ciInstall: ciInstallResult,
    configOnly: configOnlyResult,
    commands: commandsResult
  });
  await writeFile(join(out, 'report.md'), markdown);
  console.info(markdown);
  if (evidence.error)
    console.error(`The measurement stopped early: ${(evidence.error as { message: string }).message}`);
  process.exitCode = passed ? 0 : 1;
};

const main = async () => {
  const args = yargsParser(process.argv.slice(2), {
    string: ['out', 'install', 'package-install', 'safety-check', 'functions', 'suites'],
    boolean: ['inspect-artifacts'],
    array: ['install']
  });
  if (!args.out) {
    throw new Error(
      'Usage: bun scripts/perf/cli-harness.ts --out <new or empty directory> --install <name>=<dir> [...]'
    );
  }
  if (process.env[NETWORK_SANDBOX_ENV] === '1') {
    await runInside({ out: resolve(String(args.out)) });
  } else {
    await runOutside(args);
  }
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
