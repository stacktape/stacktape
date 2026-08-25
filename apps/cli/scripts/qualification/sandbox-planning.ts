import { createHash, randomBytes } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, relative, resolve, sep, win32 } from 'node:path';
import { parseArgs } from 'node:util';
import { BUILT_IN_CASES, casesForPreset } from './catalog';
import {
  qualificationCaseResultSchema,
  qualificationManifestSchema,
  qualificationReportSchema,
  type QualificationCaseManifest,
  type QualificationCaseResult
} from './contracts';

export const QUALIFICATION_SANDBOX_REPORT_VERSION = 2 as const;

export const SANDBOX_BASE_NODE_IMAGE =
  'node:24-bookworm-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03';
export const SANDBOX_DIND_IMAGE =
  'docker:27-dind@sha256:aa3df78ecf320f5fafdce71c659f1629e96e9de0968305fe1de670e0ca9176ce';
export const SANDBOX_RUNNER_IMAGE_PREFIX = 'stacktape-qualification-runner';

export const PINNED_BUN_VERSION = '1.3.14';
export const PINNED_BUN_SHA256 = {
  x64: '951ee2aee855f08595aeec6225226a298d3fea83a3dcd6465c09cbccdf7e848f',
  aarch64: 'a27ffb63a8310375836e0d6f668ae17fa8d8d18b88c37c821c65331973a19a3b'
} as const;

export const PINNED_PNPM_VERSION = '11.17.0';
export const PINNED_BUILDX_VERSION = '0.36.1';
export const PINNED_BUILDX_SHA256 = {
  x64: '48af8a397ebd60178778bf63611dbcebe5f5e7a9be90eb9147b24b9587455778',
  aarch64: '5d0cafd9d16afe1a0f0d9529885344ace2cc99efdd531b6c783c5455a6001569'
} as const;

export const DEFAULT_SANDBOX_MEMORY = '8g';
export const DEFAULT_SANDBOX_CPUS = '4';
export const DEFAULT_SANDBOX_PIDS_LIMIT = 2048;
export const DEFAULT_SANDBOX_TIMEOUT_MS = 2 * 60 * 60_000;
export const MAX_RESUME_STAGING_ENTRIES = 10_000;
export const MAX_RESUME_STAGING_BYTES = 512 * 1024 ** 2;

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

export type StagedInput = {
  hostPath?: string;
  content?: string;
  containerRelativePath: string;
  isDirectory: boolean;
  label: string;
};

export type PlannedSandboxExecution = {
  runId: string;
  createdAt: string;
  networkName: string;
  dindContainerName: string;
  stagingContainerName: string;
  runnerContainerName: string;
  inputVolumeName: string;
  outputVolumeName: string;
  cacheVolumeName: string;
  imageTag: string;
  productCommit: string;
  labels: Record<string, string>;
  dindArgs: string[];
  runnerArgs: string[];
  innerCommandArgs: string[];
  stagedInputs: StagedInput[];
  environment: Record<string, string>;
  hostOverrides: readonly string[];
  hostOutputDirectory: string;
  hostCacheRoot?: string;
  resumeFrom?: string;
  manifests: string[];
  expectedCaseIds: string[];
  hostReplay: {
    command: 'pnpm';
    args: string[];
    cwd: string;
  };
  manifestMappings: Array<{
    originalPath: string;
    originalSha256: string;
    containerPath: string;
    rewrittenSha256: string;
  }>;
  resourceLimits: {
    memory: string;
    cpus: string;
    pidsLimit: number;
    timeoutMs: number;
  };
  isSelfTest: boolean;
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
  listOrphans?: boolean;
  cleanOrphans?: boolean;
  runId?: string;
  pruneImages?: boolean;
  keepImages?: string;
  help?: boolean;
  rawForwardedArgs: string[];
};

export const buildRunnerImageTag = (productCommit: string) => {
  const shortCommit = productCommit.trim().slice(0, 12);
  return `${SANDBOX_RUNNER_IMAGE_PREFIX}:${shortCommit}`;
};

export const validateMemoryString = (mem: string): string => {
  const match = /^(\d+(?:\.\d+)?)\s*([kmg])b?$/i.exec(mem.trim());
  if (!match) {
    throw new Error(`Invalid memory limit "${mem}". Expected format like "8g", "4096m", or "512m".`);
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  let megabytes = value;
  if (unit === 'g') megabytes = value * 1024;
  else if (unit === 'k') megabytes = value / 1024;

  if (megabytes < 512 || megabytes > 64 * 1024) {
    throw new Error(`Memory limit must be between 512m and 64g, got "${mem}".`);
  }
  return mem.trim().toLowerCase();
};

export const validateCpusString = (cpus: string): string => {
  const value = Number(cpus.trim());
  if (!Number.isFinite(value) || value < 0.5 || value > 64) {
    throw new Error(`CPU limit must be a positive number between 0.5 and 64, got "${cpus}".`);
  }
  return String(value);
};

export const validatePidsLimit = (pids: string | number): number => {
  const value = Number(pids);
  if (!Number.isInteger(value) || value < 64 || value > 32768) {
    throw new Error(`PIDs limit must be an integer between 64 and 32768, got "${pids}".`);
  }
  return value;
};

export const validateTimeoutMs = (timeout: string | number): number => {
  const value = Number(timeout);
  if (!Number.isInteger(value) || value < 10_000 || value > 24 * 60 * 60_000) {
    throw new Error(`Timeout must be between 10000ms and 86400000ms (24h), got "${timeout}".`);
  }
  return value;
};

export const validateCanonicalPath = (userPath: string, invocationDirectory: string): string => {
  const resolved = resolve(invocationDirectory, userPath);
  const normalized = normalize(resolved);
  if (normalized.includes('\0')) {
    throw new Error(`Path contains null byte: "${userPath}".`);
  }
  return normalized;
};

const assertInside = (parent: string, child: string, label: string) => {
  const childRelative = relative(parent, child);
  if (childRelative === '..' || childRelative.startsWith(`..${sep}`) || isAbsolute(childRelative)) {
    throw new Error(`${label} resolves outside ${parent}.`);
  }
};

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

const replayArgsFor = (rawArgs: string[]) => {
  const replayArgs: string[] = [];
  for (let index = 0; index < rawArgs.length; index++) {
    const argument = rawArgs[index];
    if (argument === '--output-dir') {
      index++;
      continue;
    }
    if (argument.startsWith('--output-dir=') || argument === '--dry-run' || argument === '--rebuild-image') {
      continue;
    }
    replayArgs.push(argument);
  }
  return replayArgs;
};

const validateResumeCaseDirectory = (reportDirectory: string, result: QualificationCaseResult) => {
  const candidate = join(reportDirectory, 'cases', result.id);
  const caseDirectory = realpathSync(candidate);
  assertInside(reportDirectory, caseDirectory, `Resume artifacts for ${result.id}`);
  const allowed = new Set(['result.json', 'stacktape.yml', 'compiled-template.yml']);
  const required = new Set(['result.json']);
  if (result.steps.some((step) => step.name === 'import' && step.status === 'passed')) required.add('stacktape.yml');
  if (result.steps.some((step) => step.name === 'package' && step.status === 'passed')) {
    required.add('compiled-template.yml');
  }
  let totalBytes = 0;
  const directoryEntries = readdirSync(caseDirectory, { withFileTypes: true });
  for (const entry of directoryEntries) {
    if (!entry.isFile() || !allowed.has(entry.name)) {
      throw new Error(`Resume artifacts for ${result.id} contain an unexpected entry: ${entry.name}.`);
    }
    required.delete(entry.name);
    const metadata = lstatSync(join(caseDirectory, entry.name));
    if (metadata.nlink !== 1) {
      throw new Error(`Resume artifact ${result.id}/${entry.name} must not be hard linked.`);
    }
    totalBytes += metadata.size;
    if (entry.name === 'result.json') {
      const artifactResult = qualificationCaseResultSchema.parse(
        JSON.parse(readFileSync(join(caseDirectory, entry.name), 'utf8'))
      );
      if (JSON.stringify(artifactResult) !== JSON.stringify(result)) {
        throw new Error(`Resume artifact ${result.id}/result.json does not match its qualification report.`);
      }
    }
  }
  if (required.size > 0) {
    throw new Error(`Resume artifacts for ${result.id} are missing: ${[...required].join(', ')}.`);
  }
  if (totalBytes > 512 * 1024 ** 2) {
    throw new Error(`Resume artifacts for ${result.id} exceed the 512 MiB staging limit.`);
  }
  return { caseDirectory, entries: directoryEntries.length, totalBytes };
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
      'list-orphans': { type: 'boolean' },
      'clean-orphans': { type: 'boolean' },
      'run-id': { type: 'string' },
      'prune-images': { type: 'boolean' },
      'keep-images': { type: 'string' },
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
    listOrphans: values['list-orphans'],
    cleanOrphans: values['clean-orphans'],
    runId: values['run-id'],
    pruneImages: values['prune-images'],
    keepImages: values['keep-images'],
    help: values.help,
    rawForwardedArgs
  };
};

export const planSandboxExecution = ({
  productCommit,
  rawArgs,
  invocationDirectory = process.cwd(),
  rootDirectory,
  runIdSuffix,
  isSelfTest = false,
  hostReplayArgs
}: {
  productCommit: string;
  rawArgs: string[];
  invocationDirectory?: string;
  rootDirectory: string;
  runIdSuffix?: string;
  isSelfTest?: boolean;
  hostReplayArgs?: string[];
}): PlannedSandboxExecution => {
  const parsed = parseSandboxedOptions(rawArgs);
  const commit = productCommit.trim();
  if (commit.length === 0) {
    throw new Error('Product commit is required to plan sandboxed qualification execution.');
  }

  if (
    parsed.lanes !== undefined &&
    parsed.lanes
      .split(',')
      .map((l) => l.trim())
      .includes('aws')
  ) {
    throw new Error(
      'The aws lane cannot be executed in the qualification sandbox. AWS scenarios require real AWS credentials and run in disposable AWS accounts. Use the import, package, and runtime lanes in the sandbox.'
    );
  }
  if (parsed.preset !== undefined && !['smoke', 'release', 'stress', 'all'].includes(parsed.preset)) {
    throw new Error(`Unknown preset ${parsed.preset}. Use smoke, release, stress, or all.`);
  }

  const suffix = runIdSuffix ?? randomBytes(3).toString('hex');
  const now = new Date();
  const createdAt = now.toISOString();
  const runId = `qual-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${suffix}`;
  const networkName = `stp-qual-net-${suffix}`;
  const dindContainerName = `stp-qual-dind-${suffix}`;
  const stagingContainerName = `stp-qual-stage-${suffix}`;
  const runnerContainerName = `stp-qual-runner-${suffix}`;
  const inputVolumeName = `stp-qual-input-${suffix}`;
  const outputVolumeName = `stp-qual-out-${suffix}`;
  const cacheVolumeName = `stp-qual-cache-${suffix}`;
  const imageTag = buildRunnerImageTag(commit);

  const labels: Record<string, string> = {
    'stacktape.qualification.managed': 'true',
    'stacktape.qualification.run-id': runId,
    'stacktape.qualification.created-at': createdAt,
    'stacktape.qualification.commit': commit
  };

  const defaultOutputDir = join(rootDirectory, '.stacktape', 'qualification', runId);
  const hostOutputDir = validateCanonicalPath(parsed.outputDir ?? defaultOutputDir, invocationDirectory);

  const stagedInputs: StagedInput[] = [];
  const innerCommandArgs: string[] = [
    '--output-dir=/qualification/output',
    '--cache-root=/qualification/cache',
    `--run-id=${runId}`
  ];

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

  const loadedManifests = (parsed.manifests ?? []).map((manifestRelPath, index) => {
    const canonicalPath = realpathSync(validateCanonicalPath(manifestRelPath, invocationDirectory));
    const text = readFileSync(canonicalPath, 'utf8');
    return {
      index,
      canonicalPath,
      directory: realpathSync(dirname(canonicalPath)),
      text,
      manifest: qualificationManifestSchema.parse(JSON.parse(text))
    };
  });
  type Candidate = {
    entry: QualificationCaseManifest;
    manifestIndex?: number;
  };
  const builtInEntries: Candidate[] =
    parsed.preset === undefined && loadedManifests.length > 0
      ? []
      : casesForPreset(parsed.preset ?? 'smoke').map((entry) => ({ entry }));
  const externalEntries: Candidate[] = loadedManifests.flatMap(({ index, manifest }) =>
    manifest.cases.map((entry) => ({ entry, manifestIndex: index }))
  );
  const allCandidates: Candidate[] = [...BUILT_IN_CASES.map((entry) => ({ entry })), ...externalEntries];
  const explicitlySelectedCaseIds = new Set(parsed.cases?.flatMap((value) => value.split(',')).filter(Boolean) ?? []);
  let selectedCandidates =
    explicitlySelectedCaseIds.size === 0
      ? [...builtInEntries, ...externalEntries]
      : allCandidates.filter(({ entry }) => explicitlySelectedCaseIds.has(entry.id));
  const duplicateIds = selectedCandidates
    .map(({ entry }) => entry.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate qualification case ids: ${[...new Set(duplicateIds)].join(', ')}.`);
  }
  const missingIds = [...explicitlySelectedCaseIds].filter(
    (id) => !selectedCandidates.some(({ entry }) => entry.id === id)
  );
  if (missingIds.length > 0) throw new Error(`Unknown qualification case ids: ${missingIds.join(', ')}.`);
  if (parsed.shard !== undefined) {
    const shard = parsed.shard.match(/^(\d+)\/(\d+)$/);
    if (shard === null) throw new Error('--shard must use <index>/<total>, for example 2/10.');
    const index = Number(shard[1]);
    const total = Number(shard[2]);
    if (index < 1 || total < 1 || index > total) {
      throw new Error('--shard index must be between 1 and total.');
    }
    selectedCandidates = selectedCandidates.filter((_, candidateIndex) => candidateIndex % total === index - 1);
  }
  if (parsed.maxCases !== undefined) {
    const maximumCases = Number(parsed.maxCases);
    if (!Number.isInteger(maximumCases) || maximumCases < 1) {
      throw new Error('--max-cases must be a positive integer.');
    }
    selectedCandidates = selectedCandidates.slice(0, maximumCases);
  }
  const requestedLanes = (parsed.lanes ?? 'import,package')
    .split(',')
    .map((lane) => lane.trim())
    .filter(Boolean);
  if (!requestedLanes.some((lane) => lane === 'import' || lane === 'package') && explicitlySelectedCaseIds.size === 0) {
    selectedCandidates = [];
  }
  const expectedCaseIds = selectedCandidates.map(({ entry }) => entry.id);
  const selectedExternalCaseIds = new Set(
    selectedCandidates.filter(({ manifestIndex }) => manifestIndex !== undefined).map(({ entry }) => entry.id)
  );

  const resolvedManifestPaths: string[] = [];
  const manifestMappings: PlannedSandboxExecution['manifestMappings'] = [];
  const stagedLocalSources = new Map<string, string>();
  if (loadedManifests.length > 0) {
    for (const { index, canonicalPath, directory: manifestDirectory, manifest, text } of loadedManifests) {
      const rewrittenManifest = structuredClone(manifest);

      for (const [caseIndex, entry] of rewrittenManifest.cases.entries()) {
        if (entry.source.kind !== 'local' || !selectedExternalCaseIds.has(entry.id)) {
          continue;
        }
        const sourceRoot = realpathSync(resolve(manifestDirectory, entry.source.path));
        assertInside(manifestDirectory, sourceRoot, `Local source for ${entry.id}`);
        const sourceDirectoryName =
          stagedLocalSources.get(sourceRoot) ?? `manifest-${index}-source-${caseIndex}-${entry.id}`;
        if (!stagedLocalSources.has(sourceRoot)) {
          stagedLocalSources.set(sourceRoot, sourceDirectoryName);
          stagedInputs.push({
            hostPath: sourceRoot,
            containerRelativePath: `inputs/${sourceDirectoryName}`,
            isDirectory: true,
            label: `manifest-${index}-source-${entry.id}`
          });
        }
        entry.source.path = sourceDirectoryName;
      }

      const manifestFileName = `manifest-${index}.json`;
      const containerManifestPath = `/qualification/inputs/${manifestFileName}`;
      const rewrittenText = `${JSON.stringify(rewrittenManifest, null, 2)}\n`;

      stagedInputs.push({
        content: rewrittenText,
        containerRelativePath: `inputs/${manifestFileName}`,
        isDirectory: false,
        label: `manifest-${index}`
      });

      innerCommandArgs.push(`--manifest=${containerManifestPath}`);
      resolvedManifestPaths.push(canonicalPath);
      manifestMappings.push({
        originalPath: canonicalPath,
        originalSha256: sha256(text),
        containerPath: containerManifestPath,
        rewrittenSha256: sha256(rewrittenText)
      });
    }
  }

  let resolvedResumePath: string | undefined;
  if (parsed.resumeFrom !== undefined) {
    const canonicalResume = realpathSync(validateCanonicalPath(parsed.resumeFrom, invocationDirectory));
    const containerResumePath = '/qualification/inputs/resume-report.json';
    const resumeText = readFileSync(canonicalResume, 'utf8');
    const resumeReport = qualificationReportSchema.parse(JSON.parse(resumeText));
    const reportDirectory = realpathSync(dirname(canonicalResume));

    stagedInputs.push({
      content: resumeText,
      containerRelativePath: 'inputs/resume-report.json',
      isDirectory: false,
      label: 'resume-report'
    });
    let resumeStagingEntries = 1;
    let resumeStagingBytes = Buffer.byteLength(resumeText);
    if (resumeStagingBytes > MAX_RESUME_STAGING_BYTES) {
      throw new Error(`Resume report exceeds the ${MAX_RESUME_STAGING_BYTES}-byte campaign staging limit.`);
    }
    const selectedIds = new Set(expectedCaseIds);
    for (const result of resumeReport.cases) {
      if (result.status !== 'passed' || !selectedIds.has(result.id)) continue;
      const validated = validateResumeCaseDirectory(reportDirectory, result);
      resumeStagingEntries += validated.entries;
      resumeStagingBytes += validated.totalBytes;
      if (resumeStagingEntries > MAX_RESUME_STAGING_ENTRIES || resumeStagingBytes > MAX_RESUME_STAGING_BYTES) {
        throw new Error(
          `Selected resume artifacts exceed the ${MAX_RESUME_STAGING_ENTRIES}-entry or ${MAX_RESUME_STAGING_BYTES}-byte campaign staging limit.`
        );
      }
      stagedInputs.push({
        hostPath: validated.caseDirectory,
        containerRelativePath: `inputs/cases/${result.id}`,
        isDirectory: true,
        label: `resume-case-${result.id}`
      });
    }

    innerCommandArgs.push(`--resume-from=${containerResumePath}`);
    resolvedResumePath = canonicalResume;
  }

  const memory = validateMemoryString(parsed.memory ?? DEFAULT_SANDBOX_MEMORY);
  const cpus = validateCpusString(parsed.cpus ?? DEFAULT_SANDBOX_CPUS);
  const pidsLimit = validatePidsLimit(parsed.pidsLimit ?? DEFAULT_SANDBOX_PIDS_LIMIT);
  const timeoutMs = validateTimeoutMs(parsed.timeoutMs ?? DEFAULT_SANDBOX_TIMEOUT_MS);

  const dindArgs = [
    'run',
    '-d',
    '--name',
    dindContainerName,
    '--network',
    networkName,
    '--privileged',
    '--pids-limit',
    String(pidsLimit),
    '--memory',
    memory,
    '--cpus',
    cpus,
    '-e',
    'DOCKER_TLS_CERTDIR=',
    '--label',
    'stacktape.qualification.managed=true',
    '--label',
    `stacktape.qualification.run-id=${runId}`,
    '--label',
    `stacktape.qualification.commit=${commit}`,
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
    HOME: '/home/node'
  };

  const runnerArgs = [
    'run',
    '--name',
    runnerContainerName,
    '--network',
    networkName,
    '--user',
    '1000:1000',
    '--read-only',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges:true',
    '--memory',
    memory,
    '--cpus',
    cpus,
    '--pids-limit',
    String(pidsLimit),
    '--tmpfs',
    '/tmp:rw,exec,nosuid,size=4g',
    '--tmpfs',
    '/run:rw,noexec,nosuid,size=64m',
    '--tmpfs',
    '/home/node:rw,exec,nosuid,size=1g',
    '--tmpfs',
    '/workspace/apps/cli/.stacktape:rw,exec,nosuid,size=4g,uid=1000,gid=1000,mode=0700',
    '-v',
    `${inputVolumeName}:/qualification/inputs:ro`,
    '-v',
    `${outputVolumeName}:/qualification/output:rw`,
    '-v',
    `${cacheVolumeName}:/qualification/cache:rw`,
    '--label',
    'stacktape.qualification.managed=true',
    '--label',
    `stacktape.qualification.run-id=${runId}`,
    '--label',
    `stacktape.qualification.commit=${commit}`
  ];

  for (const override of BLOCKED_HOST_GATEWAYS) {
    runnerArgs.push('--add-host', override);
  }

  for (const [key, value] of Object.entries(environment)) {
    runnerArgs.push('-e', `${key}=${value}`);
  }

  runnerArgs.push(imageTag, ...innerCommandArgs);

  const planned: PlannedSandboxExecution = {
    runId,
    createdAt,
    networkName,
    dindContainerName,
    stagingContainerName,
    runnerContainerName,
    inputVolumeName,
    outputVolumeName,
    cacheVolumeName,
    imageTag,
    productCommit: commit,
    labels,
    dindArgs,
    runnerArgs,
    innerCommandArgs,
    stagedInputs,
    environment,
    hostOverrides: BLOCKED_HOST_GATEWAYS,
    hostOutputDirectory: hostOutputDir,
    ...(parsed.cacheRoot !== undefined
      ? { hostCacheRoot: validateCanonicalPath(parsed.cacheRoot, invocationDirectory) }
      : {}),
    ...(resolvedResumePath === undefined ? {} : { resumeFrom: resolvedResumePath }),
    manifests: resolvedManifestPaths,
    expectedCaseIds,
    hostReplay: {
      command: 'pnpm',
      args: ['qualify:projects:sandboxed', '--', ...replayArgsFor(hostReplayArgs ?? rawArgs)],
      cwd: invocationDirectory
    },
    manifestMappings,
    resourceLimits: {
      memory,
      cpus,
      pidsLimit,
      timeoutMs
    },
    isSelfTest
  };

  assertPlannedSecurity(planned);

  return planned;
};

export const assertPlannedSecurity = (planned: PlannedSandboxExecution) => {
  if (planned.environment.STACKTAPE_QUALIFICATION_SANDBOX !== '1') {
    throw new Error('Sandbox plan violation: STACKTAPE_QUALIFICATION_SANDBOX must be explicitly set to 1.');
  }

  if (!planned.environment.DOCKER_HOST?.startsWith('tcp://') || planned.environment.DOCKER_HOST.includes('var/run')) {
    throw new Error(
      `Sandbox plan violation: DOCKER_HOST must route strictly over TCP to the disposable DinD daemon, got: ${planned.environment.DOCKER_HOST}.`
    );
  }

  for (const arg of planned.runnerArgs) {
    if (arg.includes('docker.sock') || arg.includes('pipe/docker_engine')) {
      throw new Error(`Sandbox plan violation: host Docker socket detected in runner arguments: ${arg}`);
    }
  }

  for (const staged of planned.stagedInputs) {
    if ((staged.hostPath === undefined) === (staged.content === undefined)) {
      throw new Error(`Sandbox plan violation: staged input ${staged.label} must have exactly one source.`);
    }
    const normalizedTarget = staged.containerRelativePath.replaceAll('\\', '/');
    if (!normalizedTarget.startsWith('inputs/') || normalizedTarget.split('/').includes('..')) {
      throw new Error(`Sandbox plan violation: staged input ${staged.label} has unsafe target ${normalizedTarget}.`);
    }
  }

  for (let i = 0; i < planned.runnerArgs.length; i++) {
    const arg = planned.runnerArgs[i];
    if (arg === '-v' || arg === '--volume') {
      const vol = planned.runnerArgs[i + 1] ?? '';
      let source = vol;
      if (/^[a-zA-Z]:[\\/]/.test(vol)) {
        const colonIndex = vol.indexOf(':', 2);
        source = colonIndex > 0 ? vol.slice(0, colonIndex) : vol;
      } else {
        const colonIndex = vol.indexOf(':');
        source = colonIndex > 0 ? vol.slice(0, colonIndex) : vol;
      }
      if (
        /^[a-zA-Z]:/i.test(source) ||
        isAbsolute(source) ||
        win32.isAbsolute(source) ||
        source.includes('/') ||
        source.includes('\\') ||
        source.startsWith('.') ||
        source.startsWith('~')
      ) {
        throw new Error(
          `Sandbox plan violation: host bind mounts are prohibited in qualification sandbox. Volume source must be a named volume, got: ${source}`
        );
      }
    }
  }

  if (!planned.runnerArgs.includes('--read-only')) {
    throw new Error('Sandbox plan violation: runner container must enforce --read-only root filesystem.');
  }

  if (!planned.runnerArgs.includes('--cap-drop=ALL')) {
    throw new Error('Sandbox plan violation: runner container must enforce --cap-drop=ALL.');
  }

  if (!planned.runnerArgs.includes('--security-opt=no-new-privileges:true')) {
    throw new Error('Sandbox plan violation: runner container must enforce --security-opt=no-new-privileges:true.');
  }

  if (
    !planned.runnerArgs.includes('/workspace/apps/cli/.stacktape:rw,exec,nosuid,size=4g,uid=1000,gid=1000,mode=0700')
  ) {
    throw new Error('Sandbox plan violation: CLI project state must use its dedicated disposable tmpfs.');
  }

  if (!planned.runnerArgs.includes(`${planned.inputVolumeName}:/qualification/inputs:ro`)) {
    throw new Error('Sandbox plan violation: staged project inputs must be mounted read-only.');
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
