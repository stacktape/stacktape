/**
 * The checks that must pass before full-CLI measurements run on a shared machine.
 *
 *   bun scripts/perf/cli-safety-check.ts --install <release install directory> --out <new or empty directory>
 *     [--timeout-ms 120000]
 *
 * `--install` is a directory made by `build-release-install.ts`. Run from `apps/cli`.
 *
 * Outside, the script finds the host sockets the sandbox must mask, reads the Docker daemon's state read-only (the
 * default builder's platforms, binfmt handler names, binfmt containers), shows with a read-only `GET /_ping` that the
 * daemon socket is reachable from the host, and records the host's resolver file, interfaces and routes. It then runs
 * itself inside the network sandbox (`network-sandbox.ts`): loopback only, the daemon sockets and host relays masked,
 * and PID 1 of its own PID namespace.
 *
 * Inside, in order, each step bounded:
 *
 * 1. Egress: a TCP connection to a public address, a name lookup and an HTTPS request to STS must fail, and the lookup
 *    must reach the local DNS recorder.
 * 2. Docker isolation, the negative test, in child processes: the Docker CLI by absolute path, the same with an explicit
 *    `DOCKER_HOST`, and raw connections to every daemon socket and host relay the outside found must all fail. The
 *    Docker guard's simulated `docker info` must work, so any Docker request the measured CLI makes is answered and
 *    recorded. If any of this fails, no `package` runs.
 * 3. The release executable's `package` on a two-function fixture, each run bounded, its output written to disk as it
 *    arrives, with a required timing file, and followed by a check that no process it started is left in the
 *    namespace:
 *    - `missing-platform`: the guard reports no arm64. The fixture is pure JavaScript and builds for no platform, so the
 *      CLI must succeed without asking Docker anything: no `docker info`, buildx or privileged binfmt installer. Its
 *      only AWS request is STS `GetCallerIdentity` to the local fixture, and the CLI caches that caller identity in
 *      the HOME the scenarios share.
 *    - `platform-ready`: the guard reports amd64 and arm64, simulated. The CLI must package through the split path,
 *      again without any Docker request, and send no AWS request: the identity comes from the cache, with the same
 *      account.
 *    - `no-endpoints`: in a HOME of its own, so it cannot use the cached identity. Without the fixture's endpoint and
 *      proxy the CLI must fail, reach nothing, and leave its attempted AWS host name in the DNS recorder.
 *    - `docker-absent`: PATH without Docker. The CLI must still package through the split path, again with no AWS
 *      request.
 *    - The identity cache, PATH without Docker: another access key ID, the entry aged past 24 hours, and a corrupted
 *      cache file each make exactly one STS request; the corrupted file is rewritten without the key ID or secret.
 *
 * Back outside, the script reads the daemon state and the container events for the whole window, requires both reads
 * to succeed and nothing to have changed, requires no process of the sandbox's PID namespace and none running the
 * executable to remain, and requires the host network state to be unchanged.
 *
 * `safety-check.json` (inside) is rewritten after every step, so a failure or a hard kill keeps what was established;
 * each sample's output is under `samples/`. `outer.json` holds the outside evidence. The temporary directory belongs to
 * the outside, which removes it whatever happened inside. The exit status is 0 only when every expectation held.
 */
import type { CliSample } from './cli-sample';
import type { DockerGuardMode } from './docker-guard';
import type { SandboxMasks, SocketProbe } from './network-sandbox';
import { createHash } from 'node:crypto';
import { createReadStream, readdirSync, readlinkSync, realpathSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import yargsParser from 'yargs-parser';
import { runBoundedProcess } from './bounded-process';
import {
  createPathWithoutDocker,
  createToolDirectory,
  getCliEnvironment,
  INERT_AWS_CREDENTIALS
} from './cli-environment';
import { findSpans, runCliSample } from './cli-sample';
import { createDockerGuard } from './docker-guard';
import { FIXTURE_ACCOUNT_ID, startExternalServiceFixture } from './external-service-fixture';
import { claimOutputDirectory } from './measurement-context';
import {
  assertNetworkSandbox,
  discoverSandboxMasks,
  findSocketsUnder,
  getNetworkSandboxCommand,
  getNetworkSandboxEnvironment,
  listOtherNamespaceProcesses,
  NETWORK_SANDBOX_ENV,
  probeEgress,
  probeUnixSockets,
  readHostNetworkState,
  SANDBOX_RESOLV_CONF,
  startDnsRecorder
} from './network-sandbox';
import { writeFixtureConfig, writePackagingFixture } from './packaging-fixture';

const SANDBOX_TIMEOUT_MS = 20 * 60_000;
/** Without reachable endpoints the CLI retries failed name lookups with backoff for up to about a minute and a half. */
const NEGATIVE_TIMEOUT_MS = 240_000;
/** The sandboxed process must exit this soon after writing its final report. */
const MAX_EXIT_LAG_MS = 5000;
const SYSTEM_PATH = ['/usr/bin', '/usr/sbin'];
/** Written by the outside for the inside: what the isolation negative test must fail to reach. */
const ISOLATION_TARGETS_FILE = 'isolation-targets.json';

type Expectation = { check: string; passed: boolean; detail: string };

type IsolationTargets = {
  /** The real Docker CLI, by the path a PATH lookup would find and by its resolved path. */
  dockerCli: string[];
  /** Every daemon socket and host relay socket the outside found; the sandbox masks all of them. */
  sockets: string[];
  /** Of those, Docker API sockets, which also get a read-only `GET /_ping`. */
  pingSockets: string[];
};

const createExpectations = () => {
  const expectations: Expectation[] = [];
  const expect = (check: string, passed: boolean, detail: unknown) => {
    expectations.push({ check, passed, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  };
  return { expectations, expect };
};

const printExpectations = (expectations: Expectation[]) => {
  for (const { check, passed, detail } of expectations) {
    console.info(`${passed ? 'PASS' : 'FAIL'}  ${check}${passed ? '' : `\n      ${detail.slice(0, 600)}`}`);
  }
};

const describeError = (error: unknown) =>
  error instanceof Error
    ? { message: error.message, stack: error.stack ?? null }
    : { message: String(error), stack: null };

const sha256File = (path: string) =>
  new Promise<string>((resolveHash, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolveHash(hash.digest('hex')));
  });

/**
 * Read-only, on the host: the default builder's platform list, the binfmt handler names, and the binfmt containers
 * present. The state is only usable when `problems` is empty: both Docker commands succeeded and the platform list
 * parsed.
 */
export const readDockerState = async ({
  realDocker,
  configDirectory
}: {
  realDocker: string;
  configDirectory: string;
}) => {
  await mkdir(configDirectory, { recursive: true });
  const env = { PATH: SYSTEM_PATH.join(':'), HOME: configDirectory, DOCKER_CONFIG: configDirectory };
  const inspect = await runBoundedProcess({
    cmd: [realDocker, 'buildx', 'inspect', 'default'],
    cwd: configDirectory,
    env,
    timeoutMs: 30_000
  });
  const containers = await runBoundedProcess({
    cmd: [realDocker, 'ps', '--all', '--filter', 'ancestor=tonistiigi/binfmt', '--format', '{{.ID}}'],
    cwd: configDirectory,
    env,
    timeoutMs: 30_000
  });
  const binfmtHandlers = (await readdir('/proc/sys/fs/binfmt_misc'))
    .filter((name) => name !== 'register' && name !== 'status')
    .toSorted();
  const defaultBuilderPlatforms =
    inspect.stdout
      .split('\n')
      .find((line) => line.trim().startsWith('Platforms:'))
      ?.split('Platforms:')[1]
      ?.trim() || null;
  const problems = [
    ...(inspect.exitCode === 0
      ? []
      : [`docker buildx inspect default exited with ${inspect.exitCode ?? inspect.signal}`]),
    ...(defaultBuilderPlatforms ? [] : ['docker buildx inspect default printed no platform list']),
    ...(containers.exitCode === 0 ? [] : [`docker ps exited with ${containers.exitCode ?? containers.signal}`])
  ];
  return {
    at: new Date().toISOString(),
    problems,
    defaultBuilderPlatforms,
    binfmtHandlers,
    binfmtContainers: containers.stdout.split('\n').filter(Boolean).length
  };
};

/** Read-only, on the host: container lifecycle events for a time window, reduced to action and image. */
export const readContainerEvents = async ({
  realDocker,
  configDirectory,
  since,
  until
}: {
  realDocker: string;
  configDirectory: string;
  since: number;
  until: number;
}) => {
  const events = await runBoundedProcess({
    cmd: [
      realDocker,
      'events',
      '--since',
      String(since),
      '--until',
      String(until),
      '--filter',
      'type=container',
      '--format',
      '{{.Action}} {{index .Actor.Attributes "image"}}'
    ],
    cwd: configDirectory,
    env: { PATH: SYSTEM_PATH.join(':'), HOME: configDirectory, DOCKER_CONFIG: configDirectory },
    timeoutMs: 30_000
  });
  const lines = events.stdout.split('\n').filter(Boolean);
  return {
    exitCode: events.exitCode,
    total: lines.length,
    binfmt: lines.filter((line) => line.includes('tonistiigi/binfmt'))
  };
};

/** Live processes whose `/proc/<pid>/<link>` resolves to `target`; only this user's processes are readable. */
export const findProcessesByLink = (link: 'exe' | 'ns/pid', target: string) =>
  readdirSync('/proc')
    .filter((entry) => /^\d+$/.test(entry))
    .filter((pid) => {
      try {
        return readlinkSync(`/proc/${pid}/${link}`) === target;
      } catch {
        return false;
      }
    })
    .map(Number);

const summarizeSample = (sample: CliSample) => ({
  exitCode: sample.process.exitCode,
  signal: sample.process.signal,
  timedOut: sample.process.timedOut,
  wallMs: sample.process.wallMs,
  invalidReasons: sample.invalidReasons,
  dockerOperations: sample.dockerOperations,
  fixtureRequests: sample.fixtureRequests,
  staleFixtureRequests: sample.staleFixtureRequests,
  dnsQueries: sample.dnsQueries,
  escapedProcesses: sample.escapedProcesses,
  awsRequestSpans: findSpans(sample, 'aws:request').map((span) => span.detail),
  packagingPaths: findSpans(sample, 'packaging:paths').map((span) => span.detail),
  subprocessSpans: findSpans(sample, 'subprocess').map((span) => span.detail),
  maxRssBytes: sample.process.maxRssBytes
});

const operationsOf = (sample: CliSample) =>
  (sample.dockerOperations ?? []).map(({ decision, operation }) => `${decision} ${operation}`);

const awsTargetsOf = (sample: CliSample) =>
  sample.fixtureRequests.filter(({ kind }) => kind === 'aws').map(({ target }) => target);

/** Where each caller identity a run used came from, and its account: the CLI's `aws:identity` spans. */
const identitiesOf = (sample: CliSample) =>
  findSpans(sample, 'aws:identity').map(({ detail }) => `${detail?.source} ${detail?.account}`);

/** AWS's second documented example key pair: a different access key ID, as inert as the default one. */
const OTHER_INERT_AWS_CREDENTIALS = {
  AWS_ACCESS_KEY_ID: 'ASIAIOSFODNN7EXAMPLE',
  AWS_SECRET_ACCESS_KEY: 'je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY'
};

/** The CLI's caller-identity cache in a HOME, and the entry key of the default inert credentials in it. */
const identityCachePath = (home: string) => join(home, '.stacktape', 'aws-identity-cache.json');
const INERT_KEY_ENTRY = createHash('sha256').update(INERT_AWS_CREDENTIALS.AWS_ACCESS_KEY_ID).digest('hex');
/** The parsed cache, or null when it is missing or does not parse. */
const readIdentityCache = (home: string): Promise<{ entries?: Record<string, Record<string, unknown>> } | null> =>
  readFile(identityCachePath(home), 'utf8')
    .then((text) => JSON.parse(text))
    .catch(() => null);

type InnerReport = {
  schema: 3;
  kind: 'stacktape-cli-safety-check';
  startedAt: string;
  finishedAt: string | null;
  /** The step running when the report was last written; the step a hard kill interrupted. */
  currentStep: string | null;
  sandbox: ReturnType<typeof assertNetworkSandbox> | null;
  egress: unknown;
  isolation: unknown;
  executable: unknown;
  pathWithoutDocker: unknown;
  samples: Record<string, unknown>;
  expectations: Expectation[];
  cleanup: { step: string; ok: boolean; error?: string }[];
  error: { message: string; stack: string | null } | null;
  passed: boolean;
};

/**
 * The negative test for Docker isolation, run as child processes the way the measured CLI runs: none of the real
 * Docker CLI, a Docker CLI with an explicit daemon socket, or a raw connection to any daemon socket or host relay may
 * reach anything. The guard's simulated `docker info`, the answer the measured CLI gets, must work.
 */
const runIsolationChecks = async ({
  work,
  targets,
  expect
}: {
  work: string;
  targets: IsolationTargets;
  expect: (check: string, passed: boolean, detail: unknown) => void;
}) => {
  const dockerConfig = join(work, 'isolation-docker-config');
  await mkdir(dockerConfig, { recursive: true });
  const env = { PATH: SYSTEM_PATH.join(':'), HOME: dockerConfig, DOCKER_CONFIG: dockerConfig };
  const dockerAttempts = [];
  for (const cli of targets.dockerCli) {
    for (const [label, extra] of [
      ['default endpoint', {}],
      ['DOCKER_HOST=unix:///run/docker.sock', { DOCKER_HOST: 'unix:///run/docker.sock' }]
    ] as const) {
      const attempt = await runBoundedProcess({
        cmd: [cli, 'version', '--format', '{{.Server.Version}}'],
        cwd: dockerConfig,
        env: { ...env, ...extra },
        timeoutMs: 20_000
      });
      const output = `${attempt.stdout}${attempt.stderr}`.trim();
      dockerAttempts.push({
        cli,
        endpoint: label,
        exitCode: attempt.exitCode,
        timedOut: attempt.timedOut,
        output: output.slice(0, 300),
        reached: attempt.exitCode === 0 || /^\d+\.\d+/m.test(attempt.stdout.trim())
      });
    }
  }
  expect(
    'isolation: the Docker CLI by absolute path reaches no daemon',
    dockerAttempts.length > 0 &&
      dockerAttempts.every(
        ({ reached, exitCode, output }) => !reached && exitCode !== 0 && /cannot connect/i.test(output)
      ),
    dockerAttempts
  );

  const rawProbe = await runBoundedProcess({
    cmd: [
      process.execPath,
      '-e',
      `const { probeUnixSockets } = await import(${JSON.stringify(join(import.meta.dir, 'network-sandbox.ts'))});
console.log(JSON.stringify(await probeUnixSockets(${JSON.stringify({ paths: targets.sockets, pingPaths: targets.pingSockets })})));`
    ],
    cwd: work,
    env: { PATH: SYSTEM_PATH.join(':'), HOME: work },
    timeoutMs: 60_000
  });
  let socketAttempts: SocketProbe[] = [];
  try {
    socketAttempts = JSON.parse(rawProbe.stdout.trim().split('\n').at(-1) ?? '[]') as SocketProbe[];
  } catch {
    socketAttempts = [];
  }
  expect(
    'isolation: raw connections to every daemon socket and host relay fail',
    rawProbe.exitCode === 0 &&
      socketAttempts.length === targets.sockets.length &&
      targets.sockets.length > 0 &&
      socketAttempts.every(({ reached }) => !reached),
    { exitCode: rawProbe.exitCode, stderr: rawProbe.stderr.slice(0, 300), socketAttempts }
  );

  const guard = await createDockerGuard({ directory: join(work, 'isolation-guard'), mode: 'platform-ready' });
  const allowed = await runBoundedProcess({
    cmd: ['sh', '-c', 'docker info'],
    cwd: work,
    env: { PATH: [guard.binDirectory, ...SYSTEM_PATH].join(':'), ...guard.env },
    timeoutMs: 20_000
  });
  const guardLog = await guard.readLog();
  expect(
    "isolation: the guard's simulated docker info works and says it is simulated",
    allowed.exitCode === 0 &&
      allowed.stdout.includes('Simulated: answered by the Stacktape measurement Docker guard') &&
      guardLog.length === 1 &&
      guardLog[0]!.decision === 'simulated' &&
      guardLog[0]!.operation === 'info',
    { exitCode: allowed.exitCode, stdout: allowed.stdout, guardLog }
  );
  return { dockerAttempts, socketAttempts, simulatedInfo: { exitCode: allowed.exitCode, guardLog } };
};

const runChecks = async ({
  install,
  out,
  work,
  timeoutMs,
  report,
  expectations,
  expect,
  writeReport,
  dns,
  fixture
}: {
  install: string;
  out: string;
  work: string;
  timeoutMs: number;
  report: InnerReport;
  expectations: Expectation[];
  expect: (check: string, passed: boolean, detail: unknown) => void;
  writeReport: () => Promise<void>;
  dns: Awaited<ReturnType<typeof startDnsRecorder>>;
  fixture: Awaited<ReturnType<typeof startExternalServiceFixture>>;
}) => {
  const step = async (name: string) => {
    report.currentStep = name;
    await writeReport();
  };

  await step('egress');
  const probes = await probeEgress();
  const probeQueries = dns.takeQueries();
  report.egress = { probes, dnsQueries: probeQueries };
  expect(
    'direct TCP, DNS and HTTPS to external hosts fail inside the sandbox',
    probes.every((p) => p.blocked),
    probes
  );
  expect(
    'a direct name lookup reaches only the local recorder',
    probeQueries.some(({ name }) => name === 'sts.amazonaws.com'),
    probeQueries
  );

  await step('isolation');
  const targets = JSON.parse(await readFile(join(out, ISOLATION_TARGETS_FILE), 'utf8')) as IsolationTargets;
  const before = expectations.length;
  report.isolation = await runIsolationChecks({ work, targets, expect });
  if (!expectations.slice(before).every(({ passed }) => passed)) {
    throw new Error('The Docker isolation negative test failed, so no package command was run.');
  }

  await step('fixture');
  const manifest = JSON.parse(await readFile(join(install, 'install.json'), 'utf8'));
  const executable = join(install, manifest.installDirectory, 'stacktape');
  const executableSha256 = await sha256File(executable);
  report.executable = { path: executable, sha256: executableSha256, bytes: manifest.executable.bytes };
  expect('executable matches install.json', executableSha256 === manifest.executable.sha256, executableSha256);

  const project = join(work, 'project');
  const fixtureManifest = await writePackagingFixture({ root: project, functions: 2 });
  await writeFixtureConfig({ root: project, functions: fixtureManifest.functions });
  // The fixture vendors its packages, so a marker matching its lockfile is what a completed Stacktape install leaves.
  await writeFile(
    join(project, 'node_modules/.stacktape-install-hash'),
    createHash('sha256')
      .update(await readFile(join(project, 'package-lock.json')))
      .digest('hex')
  );
  const home = join(work, 'home');
  await mkdir(home);
  const tools = join(work, 'tools');
  await createToolDirectory({ directory: tools, tools: ['node', 'npm', 'npx', 'pnpm'] });
  const withoutDocker = await createPathWithoutDocker({
    directory: join(work, 'path-without-docker'),
    sourceDirectories: SYSTEM_PATH
  });
  report.pathWithoutDocker = { excluded: withoutDocker.excluded, linked: withoutDocker.linked };

  const command = [executable, 'package', '--projectName', 'safetycheck', '--stage', 'perf', '--region', 'eu-west-1'];
  const runScenario = async (
    name: string,
    {
      guardMode,
      withEndpoints,
      dockerOnPath,
      sampleTimeoutMs = timeoutMs,
      scenarioHome = home,
      credentials
    }: {
      guardMode?: DockerGuardMode;
      withEndpoints: boolean;
      dockerOnPath: boolean;
      sampleTimeoutMs?: number;
      /** A HOME of its own, so no caller identity an earlier scenario cached applies. */
      scenarioHome?: string;
      /** Other documented example credentials, as inert as the default ones. */
      credentials?: typeof INERT_AWS_CREDENTIALS;
    }
  ) => {
    const sampleDirectory = join(out, 'samples', name);
    await mkdir(sampleDirectory, { recursive: true });
    const guard = guardMode
      ? await createDockerGuard({ directory: join(work, `guard-${name}`), mode: guardMode })
      : undefined;
    const path = [
      ...(guard ? [guard.binDirectory] : []),
      tools,
      ...(dockerOnPath ? SYSTEM_PATH : [withoutDocker.directory])
    ];
    const resolvedDocker = Bun.which('docker', { PATH: path.join(':') }) ?? null;
    // Refuse to start rather than find out afterwards: the sandbox, and the Docker answer this scenario expects.
    assertNetworkSandbox();
    if (guard && resolvedDocker !== guard.dockerPath) {
      throw new Error(`Refusing to run ${name}: docker resolves to ${resolvedDocker}, not to the guard.`);
    }
    if (!guard && dockerOnPath) throw new Error(`Refusing to run ${name}: Docker is on PATH without the guard.`);
    if (!dockerOnPath && resolvedDocker !== null) {
      throw new Error(`Refusing to run ${name}: docker resolves to ${resolvedDocker} on a PATH meant to have none.`);
    }
    if (
      withEndpoints &&
      (!fixture.serviceUrl.startsWith('http://127.0.0.1:') || !fixture.proxyUrl.startsWith('http://127.0.0.1:'))
    ) {
      throw new Error(`Refusing to run ${name}: the fixture endpoints are not local.`);
    }
    report.samples[name] = { status: 'running', startedAt: new Date().toISOString() };
    await step(`sample ${name}`);
    const sample = await runCliSample({
      cmd: command,
      cwd: project,
      env: {
        ...getCliEnvironment({
          home: scenarioHome,
          path,
          serviceUrl: withEndpoints ? fixture.serviceUrl : undefined,
          proxyUrl: withEndpoints ? fixture.proxyUrl : undefined,
          extra: guard ? guard.env : { DOCKER_CONFIG: join(work, `docker-config-${name}`) }
        }),
        ...credentials
      },
      timeoutMs: sampleTimeoutMs,
      timingsFile: join(sampleDirectory, 'timings.json'),
      fixture,
      dockerGuard: guard,
      dnsRecorder: dns,
      outputFiles: { stdout: join(sampleDirectory, 'stdout.log'), stderr: join(sampleDirectory, 'stderr.log') },
      findEscapedProcesses: listOtherNamespaceProcesses
    });
    // `package` leaves its artifacts in the project's `.stacktape`; the next scenario starts without them.
    await rm(join(project, '.stacktape'), { recursive: true, force: true });
    report.samples[name] = {
      status: sample.invalidReasons.length === 0 ? 'complete' : 'invalid',
      guardMode: guardMode ?? null,
      resolvedDocker,
      guardDocker: guard?.dockerPath ?? null,
      ...summarizeSample(sample)
    };
    await writeReport();
    return { sample, resolvedDocker, guard };
  };

  const missing = await runScenario('missing-platform', {
    guardMode: 'missing-platform',
    withEndpoints: true,
    dockerOnPath: true
  });
  expect(
    'missing-platform: the sample is complete',
    missing.sample.invalidReasons.length === 0,
    missing.sample.invalidReasons
  );
  expect('missing-platform: the CLI succeeds', missing.sample.process.exitCode === 0, missing.sample.process.exitCode);
  expect(
    'missing-platform: Docker was not asked',
    operationsOf(missing.sample).length === 0,
    missing.sample.dockerOperations
  );
  expect(
    'missing-platform: the first run asked STS for the caller identity, its only AWS request',
    awsTargetsOf(missing.sample).join(',') === 'sts:GetCallerIdentity' &&
      identitiesOf(missing.sample).join(',') === `sts ${FIXTURE_ACCOUNT_ID}`,
    { fixture: awsTargetsOf(missing.sample), identities: identitiesOf(missing.sample) }
  );

  const ready = await runScenario('platform-ready', {
    guardMode: 'platform-ready',
    withEndpoints: true,
    dockerOnPath: true
  });
  expect(
    'platform-ready: the sample is complete',
    ready.sample.invalidReasons.length === 0,
    ready.sample.invalidReasons
  );
  expect('platform-ready: the CLI succeeds', ready.sample.process.exitCode === 0, ready.sample.process.exitCode);
  expect(
    'platform-ready: Docker was not asked',
    operationsOf(ready.sample).length === 0,
    ready.sample.dockerOperations
  );
  expect(
    'platform-ready: the split path packaged both functions',
    findSpans(ready.sample, 'packaging:paths').some(({ detail }) => detail?.split === 2 && detail?.perFunction === 0),
    findSpans(ready.sample, 'packaging:paths')
  );
  expect(
    'platform-ready: no AWS request, because the caller identity came from the cache',
    awsTargetsOf(ready.sample).length === 0 &&
      findSpans(ready.sample, 'aws:request').length === 0 &&
      identitiesOf(ready.sample).join(',') === `cache ${FIXTURE_ACCOUNT_ID}`,
    {
      fixture: awsTargetsOf(ready.sample),
      spans: findSpans(ready.sample, 'aws:request').map(({ detail }) => detail),
      identities: identitiesOf(ready.sample)
    }
  );
  expect(
    'identity: two consecutive runs with the same credentials made one STS request in total and reported one account',
    [...awsTargetsOf(missing.sample), ...awsTargetsOf(ready.sample)].join(',') === 'sts:GetCallerIdentity' &&
      [...identitiesOf(missing.sample), ...identitiesOf(ready.sample)]
        .map((identity) => identity.split(' ')[1])
        .join(',') === `${FIXTURE_ACCOUNT_ID},${FIXTURE_ACCOUNT_ID}`,
    { missing: identitiesOf(missing.sample), ready: identitiesOf(ready.sample) }
  );
  expect('platform-ready: no name lookups', (ready.sample.dnsQueries ?? []).length === 0, ready.sample.dnsQueries);

  // A HOME of its own: with the identity cached above, the CLI would not try to reach AWS at all.
  const negativeHome = join(work, 'home-no-endpoints');
  await mkdir(negativeHome);
  const negative = await runScenario('no-endpoints', {
    guardMode: 'platform-ready',
    withEndpoints: false,
    dockerOnPath: true,
    sampleTimeoutMs: Math.max(timeoutMs, NEGATIVE_TIMEOUT_MS),
    scenarioHome: negativeHome
  });
  expect(
    'no-endpoints: the sample is complete',
    negative.sample.invalidReasons.length === 0,
    negative.sample.invalidReasons
  );
  expect(
    'no-endpoints: the CLI fails without the local STS',
    negative.sample.process.exitCode !== 0,
    negative.sample.process.exitCode
  );
  expect(
    'no-endpoints: the fixture received no AWS request',
    awsTargetsOf(negative.sample).length === 0,
    negative.sample.fixtureRequests
  );
  expect(
    'no-endpoints: the attempted AWS host reached only the DNS recorder',
    (negative.sample.dnsQueries ?? []).some(({ name }) => name.endsWith('.amazonaws.com')),
    negative.sample.dnsQueries
  );
  expect(
    'no-endpoints: Docker was not asked',
    operationsOf(negative.sample).length === 0,
    negative.sample.dockerOperations
  );

  const absent = await runScenario('docker-absent', { withEndpoints: true, dockerOnPath: false });
  expect(
    'docker-absent: the sample is complete',
    absent.sample.invalidReasons.length === 0,
    absent.sample.invalidReasons
  );
  expect('docker-absent: the CLI succeeds', absent.sample.process.exitCode === 0, absent.sample.process.exitCode);
  expect(
    'docker-absent: the split path packaged both functions',
    findSpans(absent.sample, 'packaging:paths').some(({ detail }) => detail?.split === 2 && detail?.perFunction === 0),
    findSpans(absent.sample, 'packaging:paths')
  );
  expect(
    'docker-absent: no AWS request, because the caller identity came from the cache',
    awsTargetsOf(absent.sample).length === 0 &&
      findSpans(absent.sample, 'aws:request').length === 0 &&
      identitiesOf(absent.sample).join(',') === `cache ${FIXTURE_ACCOUNT_ID}`,
    { fixture: awsTargetsOf(absent.sample), identities: identitiesOf(absent.sample) }
  );
  expect('docker-absent: no name lookups', (absent.sample.dnsQueries ?? []).length === 0, absent.sample.dnsQueries);

  // The caller-identity cache: each of these runs must ask STS exactly once, like a first run.
  const expectOneLookup = (scenario: string, sample: CliSample) => {
    expect(`${scenario}: the CLI succeeds`, sample.process.exitCode === 0, sample.process.exitCode);
    expect(
      `${scenario}: one STS request, and the identity came from it`,
      awsTargetsOf(sample).join(',') === 'sts:GetCallerIdentity' &&
        identitiesOf(sample).join(',') === `sts ${FIXTURE_ACCOUNT_ID}`,
      { fixture: awsTargetsOf(sample), identities: identitiesOf(sample) }
    );
  };
  const otherKey = await runScenario('identity-other-key', {
    withEndpoints: true,
    dockerOnPath: false,
    credentials: OTHER_INERT_AWS_CREDENTIALS
  });
  expectOneLookup('identity-other-key: a different access key ID', otherKey.sample);

  const beforeAging = await readIdentityCache(home);
  const entry = beforeAging?.entries?.[INERT_KEY_ENTRY];
  expect('identity-expired: the cache holds an entry for the inert key', typeof entry?.fetchedAt === 'string', {
    entries: Object.keys(beforeAging?.entries ?? {})
  });
  if (entry) {
    entry.fetchedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    await writeFile(identityCachePath(home), JSON.stringify(beforeAging));
  }
  const expired = await runScenario('identity-expired', { withEndpoints: true, dockerOnPath: false });
  expectOneLookup('identity-expired: an entry past 24 hours', expired.sample);
  const refreshed = (await readIdentityCache(home))?.entries?.[INERT_KEY_ENTRY];
  expect(
    'identity-expired: the entry was refreshed',
    Date.now() - Date.parse(String(refreshed?.fetchedAt)) < 24 * 60 * 60 * 1000,
    refreshed
  );

  await writeFile(identityCachePath(home), '{"version":1,"entries":{"');
  const corrupted = await runScenario('identity-corrupted', { withEndpoints: true, dockerOnPath: false });
  expectOneLookup('identity-corrupted: a corrupted cache file', corrupted.sample);
  const repairedText = await readFile(identityCachePath(home), 'utf8').catch(() => '');
  const repaired = await readIdentityCache(home);
  expect(
    'identity-corrupted: the file was rewritten with the entry, and holds no key ID or secret',
    repaired?.entries?.[INERT_KEY_ENTRY]?.account === FIXTURE_ACCOUNT_ID &&
      !repairedText.includes(INERT_AWS_CREDENTIALS.AWS_ACCESS_KEY_ID) &&
      !repairedText.includes(INERT_AWS_CREDENTIALS.AWS_SECRET_ACCESS_KEY),
    repaired
  );

  await step('final checks');
  expect('executable unchanged after the check', (await sha256File(executable)) === executableSha256, executableSha256);
  const left = listOtherNamespaceProcesses();
  expect('no other process is left in the sandbox', left.length === 0, left);
};

const runInside = async ({
  install,
  out,
  work,
  timeoutMs
}: {
  install: string;
  out: string;
  work: string;
  timeoutMs: number;
}) => {
  const { expectations, expect } = createExpectations();
  const report: InnerReport = {
    schema: 3,
    kind: 'stacktape-cli-safety-check',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    currentStep: 'sandbox',
    sandbox: null,
    egress: null,
    isolation: null,
    executable: null,
    pathWithoutDocker: null,
    samples: {},
    expectations,
    cleanup: [],
    error: null,
    passed: false
  };
  const writeReport = () => writeFile(join(out, 'safety-check.json'), `${JSON.stringify(report, null, 2)}\n`);
  let dns: Awaited<ReturnType<typeof startDnsRecorder>> | undefined;
  let fixture: Awaited<ReturnType<typeof startExternalServiceFixture>> | undefined;
  try {
    report.sandbox = assertNetworkSandbox();
    await writeReport();
    dns = await startDnsRecorder();
    fixture = await startExternalServiceFixture();
    await runChecks({ install, out, work, timeoutMs, report, expectations, expect, writeReport, dns, fixture });
    report.currentStep = null;
  } catch (error) {
    report.error = describeError(error);
  } finally {
    // Each step runs whatever happened to the others, and its outcome is part of the report. The temporary directory
    // belongs to the outside, which removes it after this process has ended.
    const cleanupSteps: [string, () => Promise<unknown> | undefined][] = [
      ['close the external-service fixture', () => fixture?.close()],
      ['close the DNS recorder', () => dns?.close()]
    ];
    for (const [cleanupStep, action] of cleanupSteps) {
      try {
        await action();
        report.cleanup.push({ step: cleanupStep, ok: true });
      } catch (error) {
        report.cleanup.push({ step: cleanupStep, ok: false, error: describeError(error).message });
      }
    }
    report.finishedAt = new Date().toISOString();
    report.passed =
      report.error === null &&
      expectations.length > 0 &&
      expectations.every(({ passed }) => passed) &&
      report.cleanup.every(({ ok }) => ok);
    await writeReport();
  }
  printExpectations(expectations);
  if (report.error) console.error(`The check stopped early: ${report.error.message}`);
  for (const { step, ok, error } of report.cleanup) if (!ok) console.error(`Cleanup failed: ${step}: ${error}`);
  console.info(report.passed ? 'Every inner safety expectation held.' : 'The inner safety check did not pass.');
  process.exitCode = report.passed ? 0 : 1;
};

const runOutside = async ({ install, out, timeoutMs }: { install: string; out: string; timeoutMs: number }) => {
  await claimOutputDirectory(out);
  const { expectations, expect } = createExpectations();
  const evidence: Record<string, unknown> = { schema: 2, kind: 'stacktape-cli-safety-check-outer' };
  const work = await mkdtemp(join(tmpdir(), 'stacktape-cli-safety-'));
  let passed = false;
  try {
    const realDocker = Bun.which('docker', { PATH: SYSTEM_PATH.join(':') });
    if (!realDocker) throw new Error('The safety check needs the Docker CLI at a system path.');
    const readOnlyConfig = join(work, 'host-read-only-docker-config');

    const masks: SandboxMasks = discoverSandboxMasks();
    const targets: IsolationTargets = {
      dockerCli: [...new Set([realDocker, realpathSync(realDocker)])],
      sockets: [...new Set([...masks.files, ...findSocketsUnder(masks.directories)])].toSorted(),
      pingSockets: masks.files.filter((path) => /docker(-cli)?\.sock$/.test(path))
    };
    evidence.masks = masks;
    evidence.isolationTargets = targets;
    expect('the Docker daemon socket is among the masks', masks.files.includes('/run/docker.sock'), masks);
    await writeFile(join(out, ISOLATION_TARGETS_FILE), `${JSON.stringify(targets, null, 2)}\n`);

    const hostBefore = readHostNetworkState();
    const dockerBefore = await readDockerState({ realDocker, configDirectory: readOnlyConfig });
    const positiveControl = await probeUnixSockets({ paths: ['/run/docker.sock'], pingPaths: ['/run/docker.sock'] });
    evidence.hostBefore = hostBefore;
    evidence.dockerBefore = dockerBefore;
    evidence.hostSocketPositiveControl = positiveControl;
    expect(
      'the Docker state was readable before the sandbox',
      dockerBefore.problems.length === 0,
      dockerBefore.problems
    );
    expect(
      'positive control: the same socket probe reaches the daemon from the host',
      positiveControl[0]?.reached === true && positiveControl[0].detail.includes('200'),
      positiveControl
    );

    const resolvConfPath = join(out, 'sandbox-resolv.conf');
    await writeFile(resolvConfPath, SANDBOX_RESOLV_CONF);
    const windowStart = Math.floor(Date.now() / 1000);
    const sandboxed = await runBoundedProcess({
      cmd: getNetworkSandboxCommand({
        argv: [
          process.execPath,
          import.meta.path,
          '--install',
          install,
          '--out',
          out,
          '--work',
          work,
          '--timeout-ms',
          String(timeoutMs)
        ],
        resolvConfPath,
        masks
      }),
      cwd: process.cwd(),
      env: { ...(process.env as Record<string, string>), ...getNetworkSandboxEnvironment(masks) },
      timeoutMs: SANDBOX_TIMEOUT_MS,
      outputFiles: { stdout: join(out, 'sandbox.stdout.log'), stderr: join(out, 'sandbox.stderr.log') }
    });
    process.stdout.write(sandboxed.stdout);
    process.stderr.write(sandboxed.stderr);
    const windowEnd = Math.ceil(Date.now() / 1000) + 1;

    const inner = await readFile(join(out, 'safety-check.json'), 'utf8')
      .then((content) => JSON.parse(content) as InnerReport)
      .catch(() => null);
    const pidNamespace = inner?.sandbox?.pidNamespace ?? null;
    const namespaceSurvivors = pidNamespace ? findProcessesByLink('ns/pid', pidNamespace) : null;
    const executable = inner?.executable ? (inner.executable as { path: string }).path : null;
    const executableRunning = executable ? findProcessesByLink('exe', realpathSync(executable)) : [];
    const hostAfter = readHostNetworkState();
    const dockerAfter = await readDockerState({ realDocker, configDirectory: readOnlyConfig });
    const events = await readContainerEvents({
      realDocker,
      configDirectory: readOnlyConfig,
      since: windowStart,
      until: windowEnd
    });
    // Both wall-clock readings: the inner report's time and the moment this process saw the exit.
    const exitLagMs = inner?.finishedAt ? Math.round(sandboxed.exitRealtimeMs - Date.parse(inner.finishedAt)) : null;
    Object.assign(evidence, {
      sandboxProcess: {
        exitCode: sandboxed.exitCode,
        signal: sandboxed.signal,
        timedOut: sandboxed.timedOut,
        abandoned: sandboxed.abandoned,
        drainTimedOut: sandboxed.drainTimedOut,
        leftoverProcesses: sandboxed.leftoverProcesses,
        wallMs: sandboxed.wallMs
      },
      pidNamespace,
      namespaceSurvivors,
      executableRunning,
      exitLagMs,
      hostAfter,
      dockerAfter,
      containerEvents: { since: windowStart, until: windowEnd, ...events }
    });

    expect(
      'the sandboxed check exited by itself with status 0',
      sandboxed.exitCode === 0 && !sandboxed.timedOut && !sandboxed.abandoned,
      evidence.sandboxProcess
    );
    expect(
      'the inner report was written and passed',
      inner?.passed === true,
      inner ? { passed: inner.passed, error: inner.error } : 'missing'
    );
    expect(
      `the sandboxed check exited within ${MAX_EXIT_LAG_MS} ms of its final report`,
      exitLagMs !== null && exitLagMs >= 0 && exitLagMs <= MAX_EXIT_LAG_MS,
      { exitLagMs }
    );
    expect(
      'no process of the sandbox PID namespace remains',
      namespaceSurvivors !== null && namespaceSurvivors.length === 0,
      { pidNamespace, namespaceSurvivors }
    );
    expect(
      'nothing is left in the sandbox process group, its output closed',
      sandboxed.leftoverProcesses === 0 && !sandboxed.drainTimedOut,
      evidence.sandboxProcess
    );
    expect('no process of the measured executable is still running', executableRunning.length === 0, executableRunning);
    expect('the Docker state was readable after the sandbox', dockerAfter.problems.length === 0, dockerAfter.problems);
    const bothReadable = dockerBefore.problems.length === 0 && dockerAfter.problems.length === 0;
    expect(
      'the default builder platforms are unchanged',
      bothReadable && dockerBefore.defaultBuilderPlatforms === dockerAfter.defaultBuilderPlatforms,
      { before: dockerBefore.defaultBuilderPlatforms, after: dockerAfter.defaultBuilderPlatforms }
    );
    expect(
      'the binfmt handler names are unchanged',
      dockerBefore.binfmtHandlers.join(',') === dockerAfter.binfmtHandlers.join(','),
      { before: dockerBefore.binfmtHandlers, after: dockerAfter.binfmtHandlers }
    );
    expect(
      'no binfmt container exists',
      bothReadable && dockerAfter.binfmtContainers === 0,
      dockerAfter.binfmtContainers
    );
    expect('no binfmt container ran during the check', events.exitCode === 0 && events.binfmt.length === 0, events);
    expect(
      "the host's resolver file, interfaces and routes are unchanged",
      JSON.stringify(hostBefore) === JSON.stringify(hostAfter),
      { hostBefore, hostAfter }
    );
    expect(
      'nothing is mounted over the host resolver file',
      hostAfter.resolverMounts.length === 0,
      hostAfter.resolverMounts
    );
    passed = expectations.every(({ passed: ok }) => ok);
  } catch (error) {
    evidence.error = describeError(error);
  } finally {
    let workRemoved = true;
    try {
      await rm(work, { recursive: true, force: true });
    } catch (error) {
      workRemoved = false;
      evidence.cleanupError = describeError(error).message;
    }
    evidence.workDirectory = { path: work, removed: workRemoved };
    passed = passed && workRemoved && !evidence.error;
    evidence.expectations = expectations;
    evidence.passed = passed;
    await writeFile(join(out, 'outer.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  }
  printExpectations(expectations);
  if (evidence.error)
    console.error(`The outer check stopped early: ${(evidence.error as { message: string }).message}`);
  console.info(passed ? 'Every outer safety expectation held.' : 'The outer safety check did not pass.');
  process.exitCode = passed ? 0 : 1;
};

const main = async () => {
  const args = yargsParser(process.argv.slice(2), { string: ['install', 'out', 'work'], number: ['timeout-ms'] });
  if (!args.install || !args.out) {
    throw new Error(
      'Usage: bun scripts/perf/cli-safety-check.ts --install <release install> --out <new or empty directory>'
    );
  }
  const options = {
    install: resolve(args.install),
    out: resolve(args.out),
    timeoutMs: Number(args['timeout-ms'] ?? 120_000)
  };
  if (process.env[NETWORK_SANDBOX_ENV] === '1') {
    if (!args.work) throw new Error('The sandboxed check needs the --work directory the outside created.');
    await runInside({ ...options, work: resolve(args.work) });
  } else {
    await runOutside(options);
  }
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
