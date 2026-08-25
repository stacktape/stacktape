import { randomBytes } from 'node:crypto';
import { dirname, join, normalize, resolve } from 'node:path';
import { parseArgs } from 'node:util';

export const QUALIFICATION_SANDBOX_REPORT_VERSION = 1 as const;

export const SANDBOX_DIND_IMAGE = 'docker:27-dind';
export const SANDBOX_RUNNER_IMAGE_PREFIX = 'stacktape-qualification-runner';
export const DEFAULT_SANDBOX_MEMORY = '8g';
export const DEFAULT_SANDBOX_CPUS = '4';
export const DEFAULT_SANDBOX_PIDS_LIMIT = 2048;
export const DEFAULT_SANDBOX_TIMEOUT_MS = 2 * 60 * 60_000;

export const BLOCKED_HOST_GATEWAYS = [
  '169.254.169.254:127.0.0.1',
  'metadata.google.internal:127.0.0.1',
  'host.docker.internal:127.0.0.1',
  'gateway.docker.internal:127.0.0.1',
  'kubernetes.default.svc:127.0.0.1'
] as const;

export const SENSITIVE_HOST_ENV_PATTERNS = [
  /^AWS_/i,
  /^STACKTAPE_/i,
  /^STP_/i,
  /^GITHUB_/i,
  /^GH_/i,
  /^NPM_/i,
  /^SSH_/i,
  /^DOCKER_AUTH/i,
  /TOKEN/i,
  /SECRET/i,
  /PASSWORD/i,
  /API[_-]?KEY/i
];

export type PlannedVolumeMount = {
  hostPath: string;
  containerPath: string;
  mode: 'ro' | 'rw';
  label: string;
};

export type PlannedSandboxExecution = {
  runId: string;
  networkName: string;
  dindContainerName: string;
  runnerContainerName: string;
  imageTag: string;
  productCommit: string;
  dindArgs: string[];
  runnerArgs: string[];
  innerCommandArgs: string[];
  mounts: PlannedVolumeMount[];
  environment: Record<string, string>;
  hostOverrides: readonly string[];
  outputDirectory: string;
  cacheRoot: string;
  resumeFrom?: string;
  manifests: string[];
  resourceLimits: {
    memory: string;
    cpus: string;
    pidsLimit: number;
    timeoutMs: number;
  };
};

export type SandboxedQualificationParsedOptions = {
  preset?: 'smoke' | 'release' | 'stress' | 'all';
  cases?: string[];
  manifests?: string[];
  lanes?: string;
  awsScenarios?: string[];
  outputDir?: string;
  cacheRoot?: string;
  resumeFrom?: string;
  shard?: string;
  maxCases?: string;
  keepWorkdirs?: boolean;
  failFast?: boolean;
  allowHostProjectCode?: boolean;
  memory?: string;
  cpus?: string;
  pidsLimit?: string;
  timeoutMs?: string;
  rebuildImage?: boolean;
  dryRun?: boolean;
  selfTest?: boolean;
  list?: boolean;
  help?: boolean;
  rawForwardedArgs: string[];
};

export const buildRunnerImageTag = (productCommit: string) => {
  const shortCommit = productCommit.trim().slice(0, 12);
  return `${SANDBOX_RUNNER_IMAGE_PREFIX}:${shortCommit}`;
};

const normalizeSlash = (path: string) => path.replaceAll('\\', '/');

const isWindowsDriveRoot = (path: string) => /^[a-zA-Z]:[\\/]?$/.test(path);

const isSystemRootOrHome = (targetPath: string, homeDirectory?: string) => {
  const normalizedTarget = normalize(resolve(targetPath)).toLowerCase();
  if (normalizedTarget === '/' || isWindowsDriveRoot(normalizedTarget)) return true;
  if (homeDirectory !== undefined) {
    const normalizedHome = normalize(resolve(homeDirectory)).toLowerCase();
    if (normalizedTarget === normalizedHome) return true;
  }
  return false;
};

export const parseSandboxedOptions = (argv: string[]): SandboxedQualificationParsedOptions => {
  const { values } = parseArgs({
    args: argv,
    options: {
      preset: { type: 'string' },
      case: { type: 'string', multiple: true },
      manifest: { type: 'string', multiple: true },
      lanes: { type: 'string' },
      'aws-scenario': { type: 'string', multiple: true },
      'output-dir': { type: 'string' },
      'cache-root': { type: 'string' },
      'resume-from': { type: 'string' },
      shard: { type: 'string' },
      'max-cases': { type: 'string' },
      'keep-workdirs': { type: 'boolean' },
      'fail-fast': { type: 'boolean' },
      'allow-host-project-code': { type: 'boolean' },
      memory: { type: 'string' },
      cpus: { type: 'string' },
      'pids-limit': { type: 'string' },
      'timeout-ms': { type: 'string' },
      'rebuild-image': { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      'self-test': { type: 'boolean' },
      list: { type: 'boolean' },
      help: { type: 'boolean' }
    },
    strict: true,
    allowPositionals: false
  });

  const rawForwardedArgs: string[] = [];
  if (values.preset !== undefined) rawForwardedArgs.push(`--preset=${values.preset}`);
  if (values.case !== undefined) {
    for (const c of values.case) rawForwardedArgs.push(`--case=${c}`);
  }
  if (values.lanes !== undefined) rawForwardedArgs.push(`--lanes=${values.lanes}`);
  if (values['aws-scenario'] !== undefined) {
    for (const s of values['aws-scenario']) rawForwardedArgs.push(`--aws-scenario=${s}`);
  }
  if (values.shard !== undefined) rawForwardedArgs.push(`--shard=${values.shard}`);
  if (values['max-cases'] !== undefined) rawForwardedArgs.push(`--max-cases=${values['max-cases']}`);
  if (values['keep-workdirs']) rawForwardedArgs.push('--keep-workdirs');
  if (values['fail-fast']) rawForwardedArgs.push('--fail-fast');
  if (values['allow-host-project-code']) rawForwardedArgs.push('--allow-host-project-code');

  return {
    preset: values.preset as SandboxedQualificationParsedOptions['preset'],
    cases: values.case,
    manifests: values.manifest,
    lanes: values.lanes,
    awsScenarios: values['aws-scenario'],
    outputDir: values['output-dir'],
    cacheRoot: values['cache-root'],
    resumeFrom: values['resume-from'],
    shard: values.shard,
    maxCases: values['max-cases'],
    keepWorkdirs: values['keep-workdirs'],
    failFast: values['fail-fast'],
    allowHostProjectCode: values['allow-host-project-code'],
    memory: values.memory,
    cpus: values.cpus,
    pidsLimit: values['pids-limit'],
    timeoutMs: values['timeout-ms'],
    rebuildImage: values['rebuild-image'],
    dryRun: values['dry-run'],
    selfTest: values['self-test'],
    list: values.list,
    help: values.help,
    rawForwardedArgs
  };
};

export const planSandboxExecution = ({
  productCommit,
  rawArgs,
  invocationDirectory = process.cwd(),
  rootDirectory,
  hostHomeDirectory = process.env.USERPROFILE ?? process.env.HOME,
  runIdSuffix
}: {
  productCommit: string;
  rawArgs: string[];
  invocationDirectory?: string;
  rootDirectory: string;
  hostHomeDirectory?: string;
  runIdSuffix?: string;
}): PlannedSandboxExecution => {
  const parsed = parseSandboxedOptions(rawArgs);
  const commit = productCommit.trim();
  if (commit.length === 0) {
    throw new Error('Product commit is required to plan sandboxed qualification execution.');
  }

  const suffix = runIdSuffix ?? randomBytes(3).toString('hex');
  const runId = `qualification-${new Date().toISOString().replace(/[:.]/g, '-')}-${suffix}`;
  const networkName = `stp-qual-net-${suffix}`;
  const dindContainerName = `stp-qual-dind-${suffix}`;
  const runnerContainerName = `stp-qual-runner-${suffix}`;
  const imageTag = buildRunnerImageTag(commit);

  const defaultOutputDir = join(rootDirectory, '.stacktape', 'qualification', runId);
  const defaultCacheRoot = join(rootDirectory, '.stacktape', 'project-cache');

  const hostOutputDir = resolve(invocationDirectory, parsed.outputDir ?? defaultOutputDir);
  const hostCacheRoot = resolve(invocationDirectory, parsed.cacheRoot ?? defaultCacheRoot);

  const mounts: PlannedVolumeMount[] = [
    {
      hostPath: hostOutputDir,
      containerPath: '/qualification/output',
      mode: 'rw',
      label: 'qualification-output'
    },
    {
      hostPath: hostCacheRoot,
      containerPath: '/qualification/cache',
      mode: 'rw',
      label: 'qualification-cache'
    }
  ];

  const innerCommandArgs: string[] = ['--output-dir=/qualification/output', '--cache-root=/qualification/cache'];

  if (parsed.preset !== undefined) innerCommandArgs.push(`--preset=${parsed.preset}`);
  if (parsed.cases !== undefined) {
    for (const c of parsed.cases) innerCommandArgs.push(`--case=${c}`);
  }
  if (parsed.lanes !== undefined) innerCommandArgs.push(`--lanes=${parsed.lanes}`);
  if (parsed.awsScenarios !== undefined) {
    for (const s of parsed.awsScenarios) innerCommandArgs.push(`--aws-scenario=${s}`);
  }
  if (parsed.shard !== undefined) innerCommandArgs.push(`--shard=${parsed.shard}`);
  if (parsed.maxCases !== undefined) innerCommandArgs.push(`--max-cases=${parsed.maxCases}`);
  if (parsed.keepWorkdirs) innerCommandArgs.push('--keep-workdirs');
  if (parsed.failFast) innerCommandArgs.push('--fail-fast');

  const resolvedManifestPaths: string[] = [];
  if (parsed.manifests !== undefined && parsed.manifests.length > 0) {
    for (const [index, manifestRelPath] of parsed.manifests.entries()) {
      const absoluteManifestPath = resolve(invocationDirectory, manifestRelPath);
      const manifestDir = dirname(absoluteManifestPath);
      const manifestBasename = absoluteManifestPath.split(/[\\/]/).at(-1)!;
      const containerManifestDir = `/qualification/manifests/${index}`;
      const containerManifestPath = `${containerManifestDir}/${manifestBasename}`;

      mounts.push({
        hostPath: manifestDir,
        containerPath: containerManifestDir,
        mode: 'ro',
        label: `manifest-${index}`
      });

      innerCommandArgs.push(`--manifest=${containerManifestPath}`);
      resolvedManifestPaths.push(absoluteManifestPath);
    }
  }

  let resolvedResumePath: string | undefined;
  if (parsed.resumeFrom !== undefined) {
    const absoluteResumePath = resolve(invocationDirectory, parsed.resumeFrom);
    const resumeDir = dirname(absoluteResumePath);
    const resumeBasename = absoluteResumePath.split(/[\\/]/).at(-1)!;
    const containerResumeDir = '/qualification/resume';
    const containerResumePath = `${containerResumeDir}/${resumeBasename}`;

    mounts.push({
      hostPath: resumeDir,
      containerPath: containerResumeDir,
      mode: 'ro',
      label: 'resume-report'
    });

    innerCommandArgs.push(`--resume-from=${containerResumePath}`);
    resolvedResumePath = absoluteResumePath;
  }

  const memory = parsed.memory ?? DEFAULT_SANDBOX_MEMORY;
  const cpus = parsed.cpus ?? DEFAULT_SANDBOX_CPUS;
  const pidsLimit = parsed.pidsLimit ? Number(parsed.pidsLimit) : DEFAULT_SANDBOX_PIDS_LIMIT;
  const timeoutMs = parsed.timeoutMs ? Number(parsed.timeoutMs) : DEFAULT_SANDBOX_TIMEOUT_MS;

  const dindArgs = [
    'run',
    '-d',
    '--name',
    dindContainerName,
    '--network',
    networkName,
    '--privileged',
    '-e',
    'DOCKER_TLS_CERTDIR=',
    '--memory',
    memory,
    '--cpus',
    cpus,
    SANDBOX_DIND_IMAGE,
    'dockerd',
    '--tls=false',
    '--host=unix:///var/run/docker.sock',
    '--host=tcp://0.0.0.0:2375'
  ];

  const environment: Record<string, string> = {
    DOCKER_HOST: `tcp://${dindContainerName}:2375`,
    STACKTAPE_QUALIFICATION_SANDBOX: '1',
    CI: '1',
    NO_COLOR: '1',
    STP_DISABLE_TELEMETRY: '1',
    AWS_ACCESS_KEY_ID: 'offline-qualification',
    AWS_SECRET_ACCESS_KEY: 'offline-qualification',
    AWS_REGION: 'eu-west-1',
    AWS_DEFAULT_REGION: 'eu-west-1',
    AWS_EC2_METADATA_DISABLED: 'true',
    AWS_SDK_LOAD_CONFIG: '0',
    STACKTAPE_API_KEY: 'offline-qualification-do-not-use',
    HOME: '/root'
  };

  const runnerArgs = [
    'run',
    '--name',
    runnerContainerName,
    '--network',
    networkName,
    '--memory',
    memory,
    '--cpus',
    cpus,
    '--pids-limit',
    String(pidsLimit)
  ];

  for (const override of BLOCKED_HOST_GATEWAYS) {
    runnerArgs.push('--add-host', override);
  }

  for (const [key, value] of Object.entries(environment)) {
    runnerArgs.push('-e', `${key}=${value}`);
  }

  for (const mount of mounts) {
    const formattedHostPath = normalizeSlash(mount.hostPath);
    runnerArgs.push('-v', `${formattedHostPath}:${mount.containerPath}:${mount.mode}`);
  }

  runnerArgs.push(imageTag, 'bun', 'apps/cli/scripts/qualification/run-project-qualification.ts', ...innerCommandArgs);

  const planned: PlannedSandboxExecution = {
    runId,
    networkName,
    dindContainerName,
    runnerContainerName,
    imageTag,
    productCommit: commit,
    dindArgs,
    runnerArgs,
    innerCommandArgs,
    mounts,
    environment,
    hostOverrides: BLOCKED_HOST_GATEWAYS,
    outputDirectory: hostOutputDir,
    cacheRoot: hostCacheRoot,
    ...(resolvedResumePath === undefined ? {} : { resumeFrom: resolvedResumePath }),
    manifests: resolvedManifestPaths,
    resourceLimits: {
      memory,
      cpus,
      pidsLimit,
      timeoutMs
    }
  };

  assertPlannedSecurity(planned, hostHomeDirectory);

  return planned;
};

export const assertPlannedSecurity = (
  planned: PlannedSandboxExecution,
  hostHomeDirectory = process.env.USERPROFILE ?? process.env.HOME
) => {
  if (planned.environment.STACKTAPE_QUALIFICATION_SANDBOX !== '1') {
    throw new Error('Sandbox plan violation: STACKTAPE_QUALIFICATION_SANDBOX must be explicitly set to 1.');
  }

  if (!planned.environment.DOCKER_HOST?.startsWith('tcp://') || planned.environment.DOCKER_HOST.includes('var/run')) {
    throw new Error(
      `Sandbox plan violation: DOCKER_HOST must route strictly over TCP to the disposable DinD daemon, got: ${planned.environment.DOCKER_HOST}.`
    );
  }

  for (const mount of planned.mounts) {
    const normalizedHost = normalize(mount.hostPath).toLowerCase();
    const normalizedContainer = normalize(mount.containerPath).toLowerCase();

    if (
      normalizedHost.includes('docker.sock') ||
      normalizedContainer.includes('docker.sock') ||
      normalizedHost.includes('pipe/docker_engine')
    ) {
      throw new Error(
        `Sandbox plan violation: host Docker socket must never be mounted into the qualification sandbox (${mount.hostPath} -> ${mount.containerPath}).`
      );
    }

    if (isSystemRootOrHome(mount.hostPath, hostHomeDirectory)) {
      throw new Error(
        `Sandbox plan violation: host system root or user home directory must not be mounted (${mount.hostPath}).`
      );
    }
  }

  for (const [key, value] of Object.entries(planned.environment)) {
    if (key === 'AWS_SECRET_ACCESS_KEY' && value !== 'offline-qualification') {
      throw new Error('Sandbox plan violation: real AWS_SECRET_ACCESS_KEY leaked into planned environment.');
    }
    if (key === 'STACKTAPE_API_KEY' && value !== 'offline-qualification-do-not-use') {
      throw new Error('Sandbox plan violation: real STACKTAPE_API_KEY leaked into planned environment.');
    }
  }

  for (const requiredBlocked of ['169.254.169.254:127.0.0.1', 'host.docker.internal:127.0.0.1']) {
    if (!planned.hostOverrides.includes(requiredBlocked as any)) {
      throw new Error(`Sandbox plan violation: missing required host override ${requiredBlocked}.`);
    }
  }
};
