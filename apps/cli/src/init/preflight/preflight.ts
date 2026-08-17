/**
 * Proving the composed configuration locally, before AWS ever sees it.
 *
 * The agreed deploy-gate design: the pipeline guesses boldly from convention, and this is the half
 * that makes that safe — build the container the way packaging will, boot it the way the platform
 * will, and watch what actually happens. A verified default costs the user nothing; a failed AWS
 * deploy costs ten minutes and their trust. The observations feed back as facts (the CEGIS loop):
 * a crash naming a missing variable is a better citation than any grep, and the port the process
 * actually listened on settles what no probe could.
 *
 * Containment rules, all load-bearing:
 *
 * - **The container gets no network at all** (`--network none`). Preflight runs repository code
 *   under user consent, and consent to *run* is not consent to *phone home*. The listening port is
 *   read from the container's own `/proc/net/tcp` instead of publishing anything.
 * - **Stub values only.** Declared variables are filled with obviously-fake stubs whose schemes
 *   parse (`postgres://…@127.0.0.1:9/…`), so URL parsers survive and eager connections fail fast
 *   and visibly. A process that crashes dialing a stub has *proven its start command* — the real
 *   deploy supplies real connections — so that outcome counts as a pass, not a failure.
 * - **Bounded**: memory and CPU caps, a boot window, at most two services per run, and the
 *   container is force-removed on every path.
 *
 * Every failure of the machinery itself — Docker absent, an image without `sh`, an unreadable
 * `/proc` — degrades to `unavailable` or `inconclusive`, never to a blocked user. Only an actual
 * observed failure of *their* service reports as `failed`.
 */

import { join } from 'node:path';
import type { ProjectFacts } from '@stacktape/config-inference/facts';
import type { ServiceFact } from '@stacktape/config-inference/facts/service';
import type { CompositionResult } from '@stacktape/config-inference/compose';

/** Container resource types preflight knows how to exercise. */
const VERIFIABLE_RESOURCE_TYPES: ReadonlySet<string> = new Set(['web-service', 'worker-service', 'private-service']);

const MAX_SERVICES_PER_RUN = 2;
const BOOT_WINDOW_MS = 30_000;
const POLL_INTERVAL_MS = 1_000;
/** The port Stacktape injects; the stub environment injects the same so conventions line up. */
const PLATFORM_PORT = 8080;

export type CommandResult = { stdout: string; stderr: string };
/** Shell-out seams, injected so the engine is testable without Docker or a repository. */
export type PreflightRunners = {
  docker: (commands: string[]) => Promise<CommandResult>;
  nixpacks: (args: { args: string[]; cwd: string }) => Promise<unknown>;
  sleep?: (ms: number) => Promise<void>;
};

export type BootObservations = {
  /** Ports the process was listening on inside the container, if any were observed. */
  listeningPorts: number[];
  /** The process tried to reach a dependency — proof the start command works. */
  dialedDependency: boolean;
  /** Variable names the process itself said were missing. */
  missingEnvironmentVariables: string[];
  /** The last lines the process printed, for the wizard and the repair loop. */
  logTail: string[];
};

export type ServicePreflightResult = {
  serviceName: string;
  resourceName: string;
  /**
   * `passed` — the start command provably works. `failed` — it provably does not. `inconclusive` —
   * the machinery could not tell (never blocks a deploy). `skipped` — a shape this engine does not
   * exercise yet, with the reason stated.
   */
  status: 'passed' | 'failed' | 'inconclusive' | 'skipped';
  reason: string;
  observations: BootObservations;
};

export type PreflightResult = {
  /** `unavailable` means Docker is not usable here; nothing was attempted and nothing blocks. */
  status: 'completed' | 'unavailable';
  services: ServicePreflightResult[];
};

/**
 * Listening sockets from `/proc/net/tcp{,6}`: hex local ports on lines in state 0A (LISTEN).
 */
export const parseListeningPorts = (procNetTcp: string): number[] => {
  const ports = new Set<number>();
  for (const line of procNetTcp.split('\n')) {
    const match = /^\s*\d+:\s+[0-9A-F]+:([0-9A-F]{4})\s+[0-9A-F]+:[0-9A-F]{4}\s+0A\s/i.exec(line);
    if (match?.[1] !== undefined) {
      const port = Number.parseInt(match[1], 16);
      if (port > 0) ports.add(port);
    }
  }
  return [...ports].sort((a, b) => a - b);
};

const MISSING_VARIABLE_PATTERNS: readonly RegExp[] = [
  /(?:environment variable|env var(?:iable)?)s?\s+['"`]?([A-Z][A-Z0-9_]{2,})['"`]?/gi,
  /['"`]?([A-Z][A-Z0-9_]{2,})['"`]?\s+(?:is not set|is not defined|is required|must be set|is missing|was not provided)/g
];

/** Names a crash may mention that are not configuration the user can supply. */
const NOISE_VARIABLES: ReadonlySet<string> = new Set(['NODE_ENV', 'PATH', 'HOME', 'PORT', 'ERROR', 'WARN', 'INFO']);

const DIALED_DEPENDENCY = /ECONNREFUSED|connection refused|connect ETIMEDOUT|could not connect|getaddrinfo|EAI_AGAIN/i;

export const analyseBootLogs = (
  log: string
): Pick<BootObservations, 'dialedDependency' | 'missingEnvironmentVariables'> => {
  const missing = new Set<string>();
  for (const pattern of MISSING_VARIABLE_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of log.matchAll(pattern)) {
      const name = match[1];
      if (name !== undefined && !NOISE_VARIABLES.has(name)) missing.add(name);
    }
  }
  return {
    dialedDependency: DIALED_DEPENDENCY.test(log),
    missingEnvironmentVariables: [...missing].sort()
  };
};

/** Stub values whose schemes parse, so the process reaches the point of dialing and failing fast. */
const STUB_BY_KIND: Readonly<Record<string, string>> = {
  postgres: 'postgres://preflight:preflight@127.0.0.1:9/preflight',
  mysql: 'mysql://preflight:preflight@127.0.0.1:9/preflight',
  mssql: 'sqlserver://preflight:preflight@127.0.0.1:9/preflight',
  mongodb: 'mongodb://127.0.0.1:9/preflight',
  redis: 'redis://127.0.0.1:9',
  amqp: 'amqp://127.0.0.1:9',
  queue: 'https://sqs.invalid/preflight',
  topic: 'arn:aws:sns:invalid:000000000000:preflight',
  'object-storage': 'stp-preflight-stub',
  dynamodb: 'stp-preflight-stub',
  search: 'http://127.0.0.1:9',
  email: 'smtp://127.0.0.1:9'
};

export const stubEnvironmentFor = (
  service: Pick<ServiceFact, 'environmentVariables'>,
  facts: Pick<ProjectFacts, 'dependencies'>
): Array<{ name: string; value: string }> => {
  const kindByDependency = new Map(facts.dependencies.map((dependency) => [dependency.name, dependency.kind]));
  return service.environmentVariables
    .filter((variable) => variable.role !== 'build-time')
    .map((variable) => {
      const kind = variable.dependencyName === undefined ? undefined : kindByDependency.get(variable.dependencyName);
      const byKind = kind === undefined ? undefined : STUB_BY_KIND[kind];
      const byShape = /(URL|URI|ENDPOINT|HOST)$/.test(variable.name) ? 'http://127.0.0.1:9' : undefined;
      return { name: variable.name, value: byKind ?? byShape ?? 'stp-preflight-stub' };
    });
};

const sanitizeName = (value: string): string => {
  const safe = value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '');
  return safe.length === 0 ? 'service' : safe;
};

const tail = (text: string, lines: number): string[] => text.split(/\r?\n/).filter(Boolean).slice(-lines);

type VerifiableService = {
  service: ServiceFact;
  resourceName: string;
  packaging: { type: string; properties: Record<string, unknown> };
};

/** The services this engine can exercise, HTTP-facing first — the shape the user will click first. */
const selectServices = (facts: ProjectFacts, composition: CompositionResult): VerifiableService[] => {
  const selected: VerifiableService[] = [];
  const ordered = [...facts.services].sort((a, b) => Number(b.exposesHttp) - Number(a.exposesHttp));
  for (const service of ordered) {
    const resourceName = composition.serviceResources[service.name];
    if (resourceName === undefined) continue;
    const resource = composition.config.resources[resourceName];
    if (resource === undefined || !VERIFIABLE_RESOURCE_TYPES.has(resource.type)) continue;
    const packaging = resource.properties.packaging as VerifiableService['packaging'] | undefined;
    if (packaging === undefined) continue;
    selected.push({ service, resourceName, packaging });
    if (selected.length >= MAX_SERVICES_PER_RUN) break;
  }
  return selected;
};

const buildImage = async ({
  repositoryRoot,
  entry,
  imageName,
  runners
}: {
  repositoryRoot: string;
  entry: VerifiableService;
  imageName: string;
  runners: PreflightRunners;
}): Promise<{ ok: true } | { ok: false; reason: string }> => {
  const { packaging } = entry;
  try {
    if (packaging.type === 'custom-dockerfile') {
      const contextPath = String(packaging.properties.buildContextPath ?? entry.service.path);
      const dockerfilePath = String(packaging.properties.dockerfilePath ?? 'Dockerfile');
      await runners.docker([
        'build',
        '--file',
        join(repositoryRoot, contextPath, dockerfilePath),
        '--tag',
        imageName,
        join(repositoryRoot, contextPath)
      ]);
      return { ok: true };
    }
    if (packaging.type === 'nixpacks') {
      const sourceDirectory = String(packaging.properties.sourceDirectoryPath ?? entry.service.path);
      const startCmd = packaging.properties.startCmd;
      const phases = packaging.properties.phases as Array<{ name: string; cmds: string[] }> | undefined;
      const buildCmd = phases?.find((phase) => phase.name === 'build')?.cmds[0];
      await runners.nixpacks({
        args: [
          'build',
          '.',
          '--name',
          imageName,
          ...(typeof startCmd === 'string' ? ['--start-cmd', startCmd] : []),
          ...(typeof buildCmd === 'string' ? ['--build-cmd', buildCmd] : [])
        ],
        cwd: sourceDirectory === '.' ? repositoryRoot : join(repositoryRoot, sourceDirectory)
      });
      return { ok: true };
    }
    return { ok: false, reason: `Packaging type ${packaging.type} is verified at deploy time for now.` };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'The build failed.' };
  }
};

const emptyObservations = (): BootObservations => ({
  listeningPorts: [],
  dialedDependency: false,
  missingEnvironmentVariables: [],
  logTail: []
});

const bootProbe = async ({
  entry,
  facts,
  imageName,
  runners
}: {
  entry: VerifiableService;
  facts: ProjectFacts;
  imageName: string;
  runners: PreflightRunners;
}): Promise<ServicePreflightResult> => {
  const { service, resourceName } = entry;
  const sleep = runners.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const containerName = `stp-preflight-${sanitizeName(service.name)}`;
  const observations = emptyObservations();

  const environmentFlags = [
    '--env',
    `PORT=${PLATFORM_PORT}`,
    ...stubEnvironmentFor(service, facts).flatMap(({ name, value }) => ['--env', `${name}=${value}`])
  ];

  // A leftover container from an interrupted run must never fail this one.
  await runners.docker(['rm', '--force', containerName]).catch(() => undefined);

  try {
    await runners.docker([
      'run',
      '--detach',
      '--name',
      containerName,
      '--network',
      'none',
      '--memory',
      '512m',
      '--cpus',
      '1',
      ...environmentFlags,
      imageName
    ]);
  } catch (error) {
    return {
      serviceName: service.name,
      resourceName,
      status: 'failed',
      reason: `The container could not start: ${error instanceof Error ? error.message : 'unknown error'}`,
      observations
    };
  }

  try {
    const attempts = Math.ceil(BOOT_WINDOW_MS / POLL_INTERVAL_MS);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);

      const inspect = await runners
        .docker(['inspect', '--format', '{{.State.Running}} {{.State.ExitCode}}', containerName])
        .catch(() => ({ stdout: 'false 125', stderr: '' }));
      const [running] = inspect.stdout.trim().split(' ');

      if (running !== 'true') {
        const logs = await runners
          .docker(['logs', '--tail', '80', containerName])
          .catch(() => ({ stdout: '', stderr: '' }));
        const combined = `${logs.stdout}\n${logs.stderr}`;
        const analysis = analyseBootLogs(combined);
        observations.dialedDependency = analysis.dialedDependency;
        observations.missingEnvironmentVariables = analysis.missingEnvironmentVariables;
        observations.logTail = tail(combined, 20);

        if (analysis.dialedDependency) {
          return {
            serviceName: service.name,
            resourceName,
            status: 'passed',
            reason:
              'Started and tried to reach its backing services — the start command works. The real deploy supplies the real connections this dry run stubbed out.',
            observations
          };
        }
        return {
          serviceName: service.name,
          resourceName,
          status: 'failed',
          reason:
            analysis.missingEnvironmentVariables.length > 0
              ? `Exited on startup asking for: ${analysis.missingEnvironmentVariables.join(', ')}.`
              : 'Exited during startup. The last log lines say why.',
          observations
        };
      }

      const proc = await runners
        .docker(['exec', containerName, 'sh', '-c', 'cat /proc/net/tcp /proc/net/tcp6 2>/dev/null'])
        .catch(() => undefined);
      if (proc !== undefined) {
        const ports = parseListeningPorts(proc.stdout);
        if (ports.length > 0) {
          observations.listeningPorts = ports;
          const expected = service.port ?? PLATFORM_PORT;
          return {
            serviceName: service.name,
            resourceName,
            status: 'passed',
            reason: ports.includes(expected)
              ? `Listening on port ${expected}, as configured.`
              : `Listening on port ${ports.join(', ')} rather than the configured ${expected} — worth a look at the port setting.`,
            observations
          };
        }
      }
    }

    // Still running after the whole window. For a worker that IS the success condition; for an
    // HTTP service it usually means a slow boot (a JVM warming up), which must not read as failure.
    return {
      serviceName: service.name,
      resourceName,
      status: service.exposesHttp ? 'inconclusive' : 'passed',
      reason: service.exposesHttp
        ? `Still starting after ${BOOT_WINDOW_MS / 1000}s — nothing was listening yet. Slow boots are normal for some runtimes; the deploy health check has a longer patience.`
        : 'Ran steadily for the whole observation window.',
      observations
    };
  } finally {
    await runners.docker(['rm', '--force', containerName]).catch(() => undefined);
  }
};

/**
 * Verify the composed services locally. The caller owns consent: this function must only be
 * invoked after the user has explicitly agreed to run their repository's code.
 */
export const runPreflight = async ({
  repositoryRoot,
  facts,
  composition,
  runners
}: {
  repositoryRoot: string;
  facts: ProjectFacts;
  composition: CompositionResult;
  runners: PreflightRunners;
}): Promise<PreflightResult> => {
  try {
    await runners.docker(['version', '--format', '{{.Server.Version}}']);
  } catch {
    return { status: 'unavailable', services: [] };
  }

  const services: ServicePreflightResult[] = [];
  for (const entry of selectServices(facts, composition)) {
    const imageName = `stp-preflight-${sanitizeName(entry.service.name)}`;
    const built = await buildImage({ repositoryRoot, entry, imageName, runners });
    if (built.ok === false) {
      services.push({
        serviceName: entry.service.name,
        resourceName: entry.resourceName,
        status: built.reason.startsWith('Packaging type') ? 'skipped' : 'failed',
        reason: built.reason,
        observations: emptyObservations()
      });
      continue;
    }
    services.push(await bootProbe({ entry, facts, imageName, runners }));
  }

  return { status: 'completed', services };
};

/** Whether these results allow the Deploy button. Only a proven failure blocks. */
export const preflightAllowsDeploy = (result: PreflightResult): boolean =>
  result.status === 'unavailable' || result.services.every((service) => service.status !== 'failed');
