import { lstat, mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { BUILT_IN_CASES, AWS_QUALIFICATION_SCENARIOS } from './catalog';
import { qualificationReportSchema } from './contracts';
import { assertProcessSucceeded, outputTail, redactOutput, runProcess } from './process';
import { buildRunnerImage } from './sandbox-dockerfile';
import { inspectOutputTree, type OutputInspection } from './sandbox-output';
import {
  assertPlannedSecurity,
  DEFAULT_SANDBOX_CPUS,
  DEFAULT_SANDBOX_MEMORY,
  DEFAULT_SANDBOX_PIDS_LIMIT,
  parseSandboxedOptions,
  planSandboxExecution,
  type PlannedSandboxExecution,
  type StagedInput
} from './sandbox-planning';

const rootDirectory = resolve(import.meta.dir, '..', '..', '..', '..');
const invocationDirectory = resolve(process.env.INIT_CWD ?? process.cwd());

const errorText = (error: unknown) =>
  outputTail(
    redactOutput(
      error instanceof Error ? `${error.message}${error.stack === undefined ? '' : `\n${error.stack}`}` : String(error)
    ),
    12_000
  );

const pathExists = async (path: string) => {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
};

const isInside = (parent: string, child: string) => {
  const childRelative = relative(parent, child);
  return (
    childRelative === '' ||
    (!childRelative.startsWith(`..${sep}`) && childRelative !== '..' && !isAbsolute(childRelative))
  );
};

export const prepareHostOutputDirectory = async (target: string) => {
  if (await pathExists(target)) {
    throw new Error(`Qualification output directory already exists; refusing to merge with stale evidence: ${target}`);
  }
  const parent = dirname(target);
  const rootReal = await realpath(rootDirectory);
  const outputIsInsideWorktree = isInside(resolve(rootDirectory), resolve(target));
  let existingAncestor = parent;
  while (!(await pathExists(existingAncestor))) {
    const nextAncestor = dirname(existingAncestor);
    if (nextAncestor === existingAncestor) throw new Error(`Could not find an existing parent for output ${target}.`);
    existingAncestor = nextAncestor;
  }
  if (outputIsInsideWorktree && !isInside(rootReal, await realpath(existingAncestor))) {
    throw new Error(`Qualification output ancestor resolves outside the Stacktape worktree: ${existingAncestor}`);
  }
  await mkdir(parent, { recursive: true });
  const parentReal = await realpath(parent);
  if (outputIsInsideWorktree && !isInside(rootReal, parentReal)) {
    throw new Error(`Default qualification output parent resolves outside the Stacktape worktree: ${parentReal}`);
  }
  return mkdtemp(join(parent, `.${basename(target)}.partial-`));
};

export const validateAndHashOutputTree = async (directory: string, keepWorkdirs: boolean) => {
  return (await inspectOutputTree(directory, keepWorkdirs, true)).artifacts;
};

const helpText = `Stacktape disposable project qualification sandbox

Runs qualification in a disposable non-root Docker container connected to an isolated
Docker-in-Docker (DinD) daemon. Untrusted project installation and build scripts never receive
the host home directory, credential files, arbitrary environment tokens, or the host Docker socket.

Usage:
  pnpm qualify:projects:sandboxed -- [options]
  bun apps/cli/scripts/qualification/run-sandboxed-qualification.ts [options]

Standard Qualification Options:
  --preset=smoke|release|stress|all  Built-in project set (default: smoke without --manifest)
  --case=<id>[,<id>...]              Run selected built-in or manifest cases; repeatable
  --manifest=<path>                  Add a versioned JSON corpus manifest; repeatable
  --lanes=import,package,runtime     Requested lanes (package automatically includes import; aws lane is rejected)
  --aws-scenario=<id>                Explicit AWS archetype (note: aws lane is rejected in sandbox)
  --output-dir=<path>                Durable JSON/Markdown results (default: .stacktape/qualification/<run>)
  --cache-root=<path>                Rejected in sandbox; its cache is disposable and never copied onto the host
  --resume-from=<report.json>        Skip matching cases that already passed
  --shard=<index>/<total>            Deterministically run one shard, for example 2/10
  --max-cases=<count>                Cap projects after selection and sharding
  --keep-workdirs                    Retain isolated project copies inside container output for diagnosis
  --fail-fast                        Stop project execution after the first failed case
  --list                             List built-in projects and AWS scenarios
  --help                             Show this help

Sandbox Options:
  --memory=<limit>                   Container memory limit per container (default: ${DEFAULT_SANDBOX_MEMORY})
  --cpus=<limit>                     Container CPU limit per container (default: ${DEFAULT_SANDBOX_CPUS})
  --pids-limit=<limit>               Process limit per container (default: ${DEFAULT_SANDBOX_PIDS_LIMIT})
  --rebuild-image                    Force rebuilding the runner image even if already cached
  --dry-run                          Print planned sandbox container commands and boundary without executing
  --self-test                        Run complete end-to-end self-test with a synthetic Docker project
  --list-orphans                     List any lingering qualification containers, networks, or volumes
  --clean-orphans --run-id=<id>      Remove lingering resources owned by exactly one qualification run
  --prune-images [--keep-images=3]   Remove older unused managed runner images, retaining the newest images

Security Model & Honest Limitations:
  1. Scope: Disposable build containment for reviewed or reputable pinned sources.
     Actively hostile code requires an ephemeral cloud VM or hosted runner with no secrets.
  2. Privileged DinD: DinD requires --privileged to manage overlayfs namespaces. While the runner is
     unprivileged (non-root, cap-drop ALL, read-only rootfs), an escape from the nested dockerd could reach the VM kernel.
  3. Network Egress: Outbound internet access is enabled for package managers (npm, pip, maven, cargo).
     DNS overrides sinkhole names like host.docker.internal and metadata.google.internal to 127.0.0.1,
     but direct IP egress to public IPs and local LAN remains open unless blocked by external firewalls.
  4. Non-Root Runner: Runs as UID 1000 with root-owned read-only /workspace, read-only rootfs, and cap-drop ALL.
     Project code cannot rewrite CLI source files or tool binaries.
  5. Zero Host Bind Mounts: All inputs are staged via docker cp into container volumes. Outputs are copied
     back and schema-validated by the host upon completion.
`;

const listCatalog = () => {
  process.stdout.write('Built-in projects:\n');
  for (const entry of BUILT_IN_CASES) process.stdout.write(`  ${entry.id}  [${entry.tags.join(', ')}]\n`);
  process.stdout.write('\nExplicit AWS scenarios (note: rejected in sandbox):\n');
  for (const scenario of AWS_QUALIFICATION_SCENARIOS) {
    process.stdout.write(
      `  ${scenario.id}  policy=${scenario.policy} cost=${scenario.costClass} [${scenario.coverage.join(', ')}]\n`
    );
  }
};

const assertDockerAvailable = async () => {
  try {
    const result = await runProcess({
      command: 'docker',
      args: ['info', '--format', '{{.ServerVersion}}'],
      cwd: rootDirectory,
      timeoutMs: 15_000
    });
    if (result.exitCode !== 0) {
      throw new Error(`Docker daemon is not running or accessible:\n${result.stderr || result.stdout}`);
    }
  } catch (error) {
    throw new Error(
      `Docker is required to run qualification in the sandbox. Make sure Docker Desktop or dockerd is running.\n${errorText(error)}`
    );
  }
};

const getCleanProductCommit = async (allowDirty = false) => {
  const commitResult = await runProcess({
    command: 'git',
    args: ['rev-parse', 'HEAD'],
    cwd: rootDirectory,
    timeoutMs: 15_000
  });
  assertProcessSucceeded(commitResult);
  const commit = commitResult.stdout.trim();

  const statusResult = await runProcess({
    command: 'git',
    args: ['status', '--porcelain=v1', '--untracked-files=all'],
    cwd: rootDirectory,
    timeoutMs: 30_000
  });
  assertProcessSucceeded(statusResult);

  const dirtyFiles = statusResult.stdout.trim();
  if (dirtyFiles.length > 0 && !allowDirty) {
    const preview = dirtyFiles.split('\n').slice(0, 10).join('\n');
    throw new Error(
      `Cannot run qualification sandbox with uncommitted changes. The sandbox builds strictly from committed code at HEAD (${commit.slice(0, 12)}).\nPlease commit or stash your changes before running in the sandbox:\n${preview}`
    );
  }

  return commit;
};

const waitForDindReadiness = async (dindContainerName: string, timeoutMs = 30_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError = '';

  while (Date.now() < deadline) {
    try {
      const check = await runProcess({
        command: 'docker',
        args: ['exec', dindContainerName, 'docker', 'info'],
        cwd: rootDirectory,
        timeoutMs: 5_000
      });
      if (check.exitCode === 0) {
        return;
      }
      lastError = check.stderr || check.stdout;
    } catch (error) {
      lastError = String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Nested Docker-in-Docker daemon failed to become ready within ${timeoutMs}ms:\n${lastError}`);
};

export const listOrphanResources = async () => {
  process.stdout.write('Checking for lingering qualification sandbox resources...\n');
  const containers = await runProcess({
    command: 'docker',
    args: [
      'ps',
      '-a',
      '--filter',
      'label=stacktape.qualification.managed=true',
      '--format',
      '{{.ID}} {{.Names}} ({{.Status}})'
    ],
    cwd: rootDirectory,
    timeoutMs: 15_000
  });
  const volumes = await runProcess({
    command: 'docker',
    args: ['volume', 'ls', '--filter', 'label=stacktape.qualification.managed=true', '--format', '{{.Name}}'],
    cwd: rootDirectory,
    timeoutMs: 15_000
  });
  const networks = await runProcess({
    command: 'docker',
    args: ['network', 'ls', '--filter', 'label=stacktape.qualification.managed=true', '--format', '{{.ID}} {{.Name}}'],
    cwd: rootDirectory,
    timeoutMs: 15_000
  });

  process.stdout.write(`Containers:\n${containers.stdout || '  None'}\n`);
  process.stdout.write(`Volumes:\n${volumes.stdout || '  None'}\n`);
  process.stdout.write(`Networks:\n${networks.stdout || '  None'}\n`);
};

export const cleanOrphanResources = async (runId: string) => {
  if (!/^qual-[a-zA-Z0-9-]+$/.test(runId)) {
    throw new Error(`Invalid qualification run ID ${JSON.stringify(runId)}.`);
  }
  const filters = [
    '--filter',
    'label=stacktape.qualification.managed=true',
    '--filter',
    `label=stacktape.qualification.run-id=${runId}`
  ];
  process.stdout.write(`Cleaning lingering qualification sandbox resources for ${runId}...\n`);
  const containerIds = await runProcess({
    command: 'docker',
    args: ['ps', '-a', '-q', ...filters],
    cwd: rootDirectory,
    timeoutMs: 15_000
  });
  assertProcessSucceeded(containerIds);
  for (const id of containerIds.stdout.split(/\s+/).filter(Boolean)) {
    const result = await runProcess({
      command: 'docker',
      args: ['rm', '-f', id],
      cwd: rootDirectory,
      timeoutMs: 15_000
    });
    assertProcessSucceeded(result);
  }

  const volumeNames = await runProcess({
    command: 'docker',
    args: ['volume', 'ls', '-q', ...filters],
    cwd: rootDirectory,
    timeoutMs: 15_000
  });
  assertProcessSucceeded(volumeNames);
  for (const name of volumeNames.stdout.split(/\s+/).filter(Boolean)) {
    const result = await runProcess({
      command: 'docker',
      args: ['volume', 'rm', '-f', name],
      cwd: rootDirectory,
      timeoutMs: 15_000
    });
    assertProcessSucceeded(result);
  }

  const networkIds = await runProcess({
    command: 'docker',
    args: ['network', 'ls', '-q', ...filters],
    cwd: rootDirectory,
    timeoutMs: 15_000
  });
  assertProcessSucceeded(networkIds);
  for (const id of networkIds.stdout.split(/\s+/).filter(Boolean)) {
    const result = await runProcess({
      command: 'docker',
      args: ['network', 'rm', id],
      cwd: rootDirectory,
      timeoutMs: 15_000
    });
    assertProcessSucceeded(result);
  }
  process.stdout.write(`Orphan cleanup completed for ${runId}.\n`);
};

export const pruneManagedRunnerImages = async (keepImages = 3) => {
  if (!Number.isInteger(keepImages) || keepImages < 0 || keepImages > 20) {
    throw new Error('--keep-images must be an integer between 0 and 20.');
  }
  const imageIdsResult = await runProcess({
    command: 'docker',
    args: ['image', 'ls', '-q', '--filter', 'label=stacktape.qualification.managed=true'],
    cwd: rootDirectory,
    timeoutMs: 30_000
  });
  assertProcessSucceeded(imageIdsResult);
  const imageIds = [...new Set(imageIdsResult.stdout.split(/\s+/).filter(Boolean))];
  const images = await Promise.all(
    imageIds.map(async (imageId) => {
      const inspectResult = await runProcess({
        command: 'docker',
        args: ['image', 'inspect', imageId],
        cwd: rootDirectory,
        timeoutMs: 15_000
      });
      assertProcessSucceeded(inspectResult);
      const inspected = JSON.parse(inspectResult.stdout)[0];
      return { id: imageId, createdAt: Date.parse(String(inspected?.Created ?? '')) || 0 };
    })
  );
  images.sort((left, right) => right.createdAt - left.createdAt);
  for (const image of images.slice(keepImages)) {
    const removeResult = await runProcess({
      command: 'docker',
      args: ['image', 'rm', image.id],
      cwd: rootDirectory,
      timeoutMs: 2 * 60_000
    });
    assertProcessSucceeded(removeResult);
  }
  process.stdout.write(`Managed runner image pruning complete; retained ${Math.min(keepImages, images.length)}.\n`);
};

type SandboxResourceKind = 'container' | 'volume' | 'network';

const inspectResource = async (kind: SandboxResourceKind, name: string, expectedRunId: string) => {
  const inspectResult = await runProcess({
    command: 'docker',
    args: [kind, 'inspect', name],
    cwd: rootDirectory,
    timeoutMs: 10_000
  });
  if (inspectResult.exitCode !== 0) {
    const output = `${inspectResult.stdout}\n${inspectResult.stderr}`;
    if (/no such|not found/i.test(output)) return { exists: false, owned: false };
    throw new Error(`Could not inspect ${kind} ${name}: ${outputTail(output, 2_000)}`);
  }
  const inspectJson = JSON.parse(inspectResult.stdout.trim() || '[]')[0];
  const labels = (kind === 'volume' ? inspectJson?.Labels : (inspectJson?.Config?.Labels ?? inspectJson?.Labels)) ?? {};
  return {
    exists: true,
    owned:
      labels['stacktape.qualification.managed'] === 'true' && labels['stacktape.qualification.run-id'] === expectedRunId
  };
};

const cleanupSandboxResources = async (planned: PlannedSandboxExecution) => {
  const errors: string[] = [];

  const removeOwnedResource = async (kind: SandboxResourceKind, name: string, removeArgs: string[]) => {
    const before = await inspectResource(kind, name, planned.runId);
    if (!before.exists) return;
    if (!before.owned)
      throw new Error(`Refusing to remove ${kind} ${name}: its qualification ownership labels differ.`);
    const removeResult = await runProcess({
      command: 'docker',
      args: removeArgs,
      cwd: rootDirectory,
      timeoutMs: 30_000
    });
    assertProcessSucceeded(removeResult);
    const after = await inspectResource(kind, name, planned.runId);
    if (after.exists) throw new Error(`${kind} ${name} still exists after Docker reported successful removal.`);
  };

  for (const containerName of [planned.runnerContainerName, planned.stagingContainerName]) {
    try {
      await removeOwnedResource('container', containerName, ['rm', '-f', containerName]);
    } catch (error) {
      errors.push(`Failed to remove container ${containerName}: ${String(error)}`);
    }
  }

  // Remove DinD container
  try {
    await removeOwnedResource('container', planned.dindContainerName, ['rm', '-f', planned.dindContainerName]);
  } catch (error) {
    errors.push(`Failed to remove DinD container ${planned.dindContainerName}: ${String(error)}`);
  }

  // Remove volumes
  for (const vol of [planned.inputVolumeName, planned.outputVolumeName, planned.cacheVolumeName]) {
    try {
      await removeOwnedResource('volume', vol, ['volume', 'rm', '-f', vol]);
    } catch (error) {
      errors.push(`Failed to remove volume ${vol}: ${String(error)}`);
    }
  }

  // Remove network
  try {
    await removeOwnedResource('network', planned.networkName, ['network', 'rm', planned.networkName]);
  } catch (error) {
    errors.push(`Failed to remove network ${planned.networkName}: ${String(error)}`);
  }

  return errors;
};

const stageInputIntoContainer = async (containerName: string, staged: StagedInput) => {
  const targetPath = `/qualification/${staged.containerRelativePath.replaceAll('\\', '/')}`;
  const targetDir = dirname(targetPath);
  let temporaryDirectory: string | undefined;
  let sourcePath = staged.hostPath;

  if (staged.content !== undefined) {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'stacktape-qualification-input-'));
    sourcePath = join(temporaryDirectory, 'input');
    await writeFile(sourcePath, staged.content, 'utf8');
  }
  if (sourcePath === undefined) throw new Error(`Staged input ${staged.label} has no source.`);

  try {
    const mkdirResult = await runProcess({
      command: 'docker',
      args: ['exec', '--user', '0:0', containerName, 'mkdir', '-p', targetDir],
      cwd: rootDirectory,
      timeoutMs: 15_000
    });
    assertProcessSucceeded(mkdirResult);

    const cpResult = await runProcess({
      command: 'docker',
      args: ['cp', sourcePath, `${containerName}:${targetPath}`],
      cwd: rootDirectory,
      timeoutMs: 5 * 60_000
    });
    assertProcessSucceeded(cpResult);

    const permissionsResult = await runProcess({
      command: 'docker',
      args: [
        'exec',
        '--user',
        '0:0',
        containerName,
        'sh',
        '-c',
        'chown -R root:root "$1" && chmod -R a-w,a+rX "$1"',
        'sh',
        targetPath
      ],
      cwd: rootDirectory,
      timeoutMs: 60_000
    });
    assertProcessSucceeded(permissionsResult);
  } finally {
    if (temporaryDirectory !== undefined) {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
};

const expectedReportLanes = (planned: PlannedSandboxExecution) => {
  const laneArgument = planned.innerCommandArgs.find((argument) => argument.startsWith('--lanes='));
  const lanes = (laneArgument?.slice('--lanes='.length) ?? 'import,package')
    .split(',')
    .map((lane) => lane.trim())
    .filter(Boolean);
  if (lanes.includes('package') && !lanes.includes('import')) lanes.unshift('import');
  return [...new Set(lanes)];
};

export const processResultExitCode = (result: {
  exitCode: number | null;
  timedOut: boolean;
  interruptedSignal?: NodeJS.Signals;
}) => {
  if (result.interruptedSignal !== undefined) return result.interruptedSignal === 'SIGINT' ? 130 : 143;
  if (result.timedOut) return 124;
  return result.exitCode ?? 1;
};

const inspectRunnerImage = async (planned: PlannedSandboxExecution) => {
  const containerResult = await runProcess({
    command: 'docker',
    args: ['container', 'inspect', '--format={{.Image}}', planned.runnerContainerName],
    cwd: rootDirectory,
    timeoutMs: 15_000
  });
  assertProcessSucceeded(containerResult);
  const immutableImageId = containerResult.stdout.trim();
  if (!/^sha256:[a-f0-9]{64}$/.test(immutableImageId)) {
    throw new Error(`Runner container returned an invalid immutable image id: ${immutableImageId}`);
  }
  const result = await runProcess({
    command: 'docker',
    args: ['image', 'inspect', immutableImageId],
    cwd: rootDirectory,
    timeoutMs: 15_000
  });
  assertProcessSucceeded(result);
  const inspected = JSON.parse(result.stdout)[0];
  const labels = inspected?.Config?.Labels ?? {};
  if (
    labels['stacktape.qualification.managed'] !== 'true' ||
    labels['stacktape.qualification.commit'] !== planned.productCommit
  ) {
    throw new Error(`Runner image ${immutableImageId} does not carry the expected qualification labels.`);
  }
  return {
    tag: planned.imageTag,
    id: immutableImageId,
    repoDigests: Array.isArray(inspected?.RepoDigests) ? inspected.RepoDigests : [],
    labels
  };
};

const inspectOutputVolumeBeforeCopy = async (
  planned: PlannedSandboxExecution,
  immutableImageId: string,
  keepWorkdirs: boolean
): Promise<OutputInspection> => {
  const result = await runProcess({
    command: 'docker',
    args: [
      'run',
      '--rm',
      '--name',
      planned.stagingContainerName,
      '--network=none',
      '--user',
      '1000:1000',
      '--read-only',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges:true',
      '--memory=512m',
      '--cpus=1',
      '--pids-limit=128',
      '--label',
      'stacktape.qualification.managed=true',
      '--label',
      `stacktape.qualification.run-id=${planned.runId}`,
      '-e',
      `KEEP_WORKDIRS=${keepWorkdirs ? '1' : '0'}`,
      '-v',
      `${planned.outputVolumeName}:/qualification/output:ro`,
      '--entrypoint',
      'bun',
      immutableImageId,
      '/workspace/apps/cli/scripts/qualification/sandbox-output.ts'
    ],
    cwd: rootDirectory,
    timeoutMs: 5 * 60_000
  });
  assertProcessSucceeded(result);
  const parsed = JSON.parse(result.stdout.trim()) as Partial<OutputInspection>;
  for (const key of ['entries', 'directories', 'files', 'symlinks', 'totalBytes'] as const) {
    if (!Number.isInteger(parsed[key]) || Number(parsed[key]) < 0) {
      throw new Error(`Output inspection returned an invalid ${key} value.`);
    }
  }
  if (
    parsed.limits === undefined ||
    !Number.isInteger(parsed.limits.maxEntries) ||
    !Number.isInteger(parsed.limits.maxBytes)
  ) {
    throw new Error('Output inspection returned invalid limits.');
  }
  return parsed as OutputInspection;
};

export const executeSandboxedQualification = async (
  rawArgs: string[] = process.argv.slice(2)
): Promise<{ exitCode: number; planned: PlannedSandboxExecution }> => {
  const parsed = parseSandboxedOptions(rawArgs);

  if (parsed.help) {
    process.stdout.write(helpText);
    return { exitCode: 0, planned: undefined as any };
  }

  if (parsed.list) {
    listCatalog();
    return { exitCode: 0, planned: undefined as any };
  }

  await assertDockerAvailable();

  if (parsed.listOrphans) {
    await listOrphanResources();
    return { exitCode: 0, planned: undefined as any };
  }

  if (parsed.cleanOrphans) {
    if (parsed.runId === undefined) throw new Error('--clean-orphans requires the exact --run-id=<id>.');
    await cleanOrphanResources(parsed.runId);
    return { exitCode: 0, planned: undefined as any };
  }

  if (parsed.pruneImages) {
    await pruneManagedRunnerImages(parsed.keepImages === undefined ? 3 : Number(parsed.keepImages));
    return { exitCode: 0, planned: undefined as any };
  }
  if (parsed.runId !== undefined || parsed.keepImages !== undefined) {
    throw new Error('--run-id requires --clean-orphans, and --keep-images requires --prune-images.');
  }

  const productCommit = await getCleanProductCommit(parsed.dryRun);

  if (parsed.cacheRoot !== undefined) {
    throw new Error(
      '--cache-root is not supported by the sandbox because qualification code must not copy a writable build cache back onto the host. The sandbox keeps one disposable cache for the entire run; omit this option.'
    );
  }

  let effectiveArgs = rawArgs;
  if (parsed.selfTest) {
    if (
      parsed.preset !== undefined ||
      parsed.cases !== undefined ||
      parsed.manifests !== undefined ||
      parsed.lanes !== undefined ||
      parsed.awsScenarios !== undefined ||
      parsed.resumeFrom !== undefined ||
      parsed.shard !== undefined ||
      parsed.maxCases !== undefined
    ) {
      throw new Error('--self-test cannot be combined with project selection, lanes, resume, or sharding options.');
    }
    const fixtureManifest = resolve(
      rootDirectory,
      'apps/cli/scripts/qualification/fixtures/self-test-docker-project/manifest.json'
    );
    effectiveArgs = [
      `--manifest=${fixtureManifest}`,
      '--case=qualification-self-test-docker',
      '--lanes=import,package',
      ...rawArgs.filter((arg) => arg !== '--self-test')
    ];
  }

  const planned = planSandboxExecution({
    productCommit,
    rawArgs: effectiveArgs,
    invocationDirectory,
    rootDirectory,
    isSelfTest: Boolean(parsed.selfTest)
  });

  assertPlannedSecurity(planned);

  if (parsed.dryRun) {
    process.stdout.write(
      `Planned Sandboxed Qualification Execution:\n${JSON.stringify(
        {
          runId: planned.runId,
          productCommit: planned.productCommit,
          imageTag: planned.imageTag,
          network: planned.networkName,
          dindContainer: planned.dindContainerName,
          stagingContainer: planned.stagingContainerName,
          runnerContainer: planned.runnerContainerName,
          inputVolume: planned.inputVolumeName,
          outputVolume: planned.outputVolumeName,
          cacheVolume: planned.cacheVolumeName,
          stagedInputs: planned.stagedInputs,
          hostOverrides: planned.hostOverrides,
          environment: planned.environment,
          dindCommand: ['docker', ...planned.dindArgs].join(' '),
          runnerCommand: ['docker', ...planned.runnerArgs].join(' '),
          resourceLimits: planned.resourceLimits
        },
        null,
        2
      )}\n`
    );
    return { exitCode: 0, planned };
  }

  await buildRunnerImage({
    productCommit,
    rootDirectory,
    forceRebuild: parsed.rebuildImage,
    onProgress: (msg) => process.stderr.write(msg)
  });

  const hostMaterializationDirectory = await prepareHostOutputDirectory(planned.hostOutputDirectory);
  let outputMaterialized = false;

  process.stderr.write(
    `Starting disposable qualification sandbox:\n- Network: ${planned.networkName}\n- DinD: ${planned.dindContainerName}\n- Runner: ${planned.runnerContainerName}\n- Output: ${planned.hostOutputDirectory}\n\n`
  );

  let runnerExitCode = 1;
  let runnerImage: Awaited<ReturnType<typeof inspectRunnerImage>> | undefined;
  let outputInspection: OutputInspection | undefined;
  let primaryFailure: unknown;
  let cleanupErrors: string[] = [];
  let executionResult: { exitCode: number; planned: PlannedSandboxExecution } | undefined;
  try {
    // 1. Create bridge network
    const netResult = await runProcess({
      command: 'docker',
      args: [
        'network',
        'create',
        '--driver',
        'bridge',
        '--label',
        'stacktape.qualification.managed=true',
        '--label',
        `stacktape.qualification.run-id=${planned.runId}`,
        planned.networkName
      ],
      cwd: rootDirectory,
      timeoutMs: 30_000
    });
    assertProcessSucceeded(netResult);

    // 2. Create named volumes
    for (const vol of [planned.inputVolumeName, planned.outputVolumeName, planned.cacheVolumeName]) {
      const volResult = await runProcess({
        command: 'docker',
        args: [
          'volume',
          'create',
          '--label',
          'stacktape.qualification.managed=true',
          '--label',
          `stacktape.qualification.run-id=${planned.runId}`,
          vol
        ],
        cwd: rootDirectory,
        timeoutMs: 15_000
      });
      assertProcessSucceeded(volResult);
    }

    // 3. Start DinD
    const dindResult = await runProcess({
      command: 'docker',
      args: planned.dindArgs,
      cwd: rootDirectory,
      timeoutMs: 60_000
    });
    assertProcessSucceeded(dindResult);

    await waitForDindReadiness(planned.dindContainerName);

    // 4. Stage exact manifest inputs through a trusted helper. The runner later mounts inputs read-only.
    const stagingCreateResult = await runProcess({
      command: 'docker',
      args: [
        'create',
        '--name',
        planned.stagingContainerName,
        '--network=none',
        '--user',
        '0:0',
        '--read-only',
        '--security-opt=no-new-privileges:true',
        '--label',
        'stacktape.qualification.managed=true',
        '--label',
        `stacktape.qualification.run-id=${planned.runId}`,
        '-v',
        `${planned.inputVolumeName}:/qualification/inputs:rw`,
        '-v',
        `${planned.outputVolumeName}:/qualification/output:rw`,
        '-v',
        `${planned.cacheVolumeName}:/qualification/cache:rw`,
        '--entrypoint',
        '/bin/sh',
        planned.imageTag,
        '-c',
        'sleep infinity'
      ],
      cwd: rootDirectory,
      timeoutMs: 30_000
    });
    assertProcessSucceeded(stagingCreateResult);

    const stagingStartResult = await runProcess({
      command: 'docker',
      args: ['start', planned.stagingContainerName],
      cwd: rootDirectory,
      timeoutMs: 30_000
    });
    assertProcessSucceeded(stagingStartResult);

    const writableVolumePermissions = await runProcess({
      command: 'docker',
      args: [
        'exec',
        '--user',
        '0:0',
        planned.stagingContainerName,
        'sh',
        '-c',
        'chown 1000:1000 /qualification/output /qualification/cache && chmod 700 /qualification/output /qualification/cache && chown root:root /qualification/inputs && chmod 755 /qualification/inputs'
      ],
      cwd: rootDirectory,
      timeoutMs: 15_000
    });
    assertProcessSucceeded(writableVolumePermissions);

    for (const staged of planned.stagedInputs) {
      await stageInputIntoContainer(planned.stagingContainerName, staged);
    }

    const stagingRemoveResult = await runProcess({
      command: 'docker',
      args: ['rm', '-f', planned.stagingContainerName],
      cwd: rootDirectory,
      timeoutMs: 15_000
    });
    assertProcessSucceeded(stagingRemoveResult);

    // 5. Create the unprivileged runner with read-only source inputs.
    const createArgs = ['create', ...planned.runnerArgs.slice(1)];
    const createResult = await runProcess({
      command: 'docker',
      args: createArgs,
      cwd: rootDirectory,
      timeoutMs: 30_000
    });
    assertProcessSucceeded(createResult);
    runnerImage = await inspectRunnerImage(planned);

    // 6. Start runner and attach
    const runResult = await runProcess({
      command: 'docker',
      args: ['start', '-a', planned.runnerContainerName],
      cwd: rootDirectory,
      timeoutMs: planned.resourceLimits.timeoutMs,
      forwardSignals: true
    });

    if (runResult.stdout) process.stdout.write(runResult.stdout);
    if (runResult.stderr) process.stderr.write(runResult.stderr);

    runnerExitCode = processResultExitCode(runResult);

    // 7. Inspect the stopped runner's output volume before allowing any copy to the host.
    outputInspection = await inspectOutputVolumeBeforeCopy(planned, runnerImage.id, parsed.keepWorkdirs === true);

    // 8. Copy the already-bounded output directory back to host.
    process.stderr.write(`Copying qualification output back to ${planned.hostOutputDirectory}...\n`);
    const cpOutResult = await runProcess({
      command: 'docker',
      args: ['cp', `${planned.runnerContainerName}:/qualification/output/.`, hostMaterializationDirectory],
      cwd: rootDirectory,
      timeoutMs: 60_000
    });
    if (processResultExitCode(cpOutResult) !== 0) {
      process.stderr.write(`Failed to copy output files from container: ${cpOutResult.stderr}\n`);
      runnerExitCode = 1;
    }

    // 9. Schema validate the qualification report if present
    const reportPath = join(hostMaterializationDirectory, 'qualification-report.json');
    try {
      const artifactHashes = await validateAndHashOutputTree(
        hostMaterializationDirectory,
        parsed.keepWorkdirs === true
      );
      const reportJsonText = await readFile(reportPath, 'utf8');
      const parsedReport = qualificationReportSchema.parse(JSON.parse(reportJsonText));
      if (parsedReport.productCommit !== planned.productCommit) {
        throw new Error(
          `Qualification report commit ${parsedReport.productCommit} does not match sandbox commit ${planned.productCommit}.`
        );
      }
      const expectedLanes = expectedReportLanes(planned);
      if (JSON.stringify(parsedReport.lanes) !== JSON.stringify(expectedLanes)) {
        throw new Error(
          `Qualification report lanes ${parsedReport.lanes.join(',')} do not match requested lanes ${expectedLanes.join(',')}.`
        );
      }
      const reportedCaseIds = parsedReport.cases.map((entry) => entry.id);
      if (JSON.stringify(reportedCaseIds) !== JSON.stringify(planned.expectedCaseIds)) {
        throw new Error(
          `Qualification report cases ${reportedCaseIds.join(',')} do not exactly match selected cases ${planned.expectedCaseIds.join(',')}.`
        );
      }
      if (
        parsedReport.summary.failed > 0 ||
        parsedReport.globalSteps.some((step) => step.status === 'failed') ||
        parsedReport.cases.some((entry) => entry.status === 'failed')
      ) {
        runnerExitCode = runnerExitCode === 0 ? 1 : runnerExitCode;
      }
      process.stderr.write(
        `Qualification report verified: ${parsedReport.summary.passed} passed, ${parsedReport.summary.failed} failed.\n`
      );
      if (planned.isSelfTest) {
        const selfTestCase = parsedReport.cases.find((entry) => entry.id === 'qualification-self-test-docker');
        const packageStep = selfTestCase?.steps.find((step) => step.name === 'package');
        const checked = packageStep?.details?.checked;
        const templatePath = join(
          hostMaterializationDirectory,
          'cases',
          'qualification-self-test-docker',
          'compiled-template.yml'
        );
        const templateText = (await pathExists(templatePath)) ? await readFile(templatePath, 'utf8') : '';
        const selfTestPassed =
          runnerExitCode === 0 &&
          parsedReport.cases.length === 1 &&
          parsedReport.summary.passed === 1 &&
          parsedReport.summary.failed === 0 &&
          selfTestCase?.execution === 'executed' &&
          selfTestCase.status === 'passed' &&
          packageStep?.status === 'passed' &&
          typeof checked === 'object' &&
          checked !== null &&
          'packaging' in checked &&
          checked.packaging === true &&
          'template' in checked &&
          checked.template === true &&
          Array.isArray(packageStep.details?.packagedWorkloads) &&
          packageStep.details.packagedWorkloads.some(
            (workload) =>
              typeof workload === 'object' &&
              workload !== null &&
              'skipped' in workload &&
              workload.skipped === false &&
              'digest' in workload &&
              typeof workload.digest === 'string' &&
              workload.digest.length > 0
          ) &&
          templateText.trim().length > 0;
        if (selfTestPassed) {
          process.stdout.write('\nSandbox self-test SUCCESS: nested Docker build and template synthesis verified.\n');
        } else {
          process.stderr.write('\nSandbox self-test FAILED: expected 1 passed case with 0 failures.\n');
          runnerExitCode = 1;
        }
      }
      await writeFile(
        join(hostMaterializationDirectory, 'sandbox-metadata.json'),
        `${JSON.stringify(
          {
            schemaVersion: 1,
            runId: planned.runId,
            generatedAt: new Date().toISOString(),
            productCommit: planned.productCommit,
            runnerImage,
            outputInspection,
            hostReplay: planned.hostReplay,
            manifestMappings: planned.manifestMappings,
            pathMappings: {
              containerOutput: '/qualification/output',
              hostOutput: planned.hostOutputDirectory,
              ...(planned.resumeFrom === undefined
                ? {}
                : {
                    containerResumeReport: '/qualification/inputs/resume-report.json',
                    hostResumeReport: planned.resumeFrom
                  })
            },
            artifacts: artifactHashes
          },
          null,
          2
        )}\n`,
        'utf8'
      );
      await rename(hostMaterializationDirectory, planned.hostOutputDirectory);
      outputMaterialized = true;
    } catch (reportError) {
      process.stderr.write(`Qualification report validation failed: ${String(reportError)}\n`);
      runnerExitCode = 1;
    }

    executionResult = { exitCode: runnerExitCode, planned };
  } catch (error) {
    primaryFailure = error;
  } finally {
    process.stderr.write('Cleaning up disposable sandbox resources...\n');
    cleanupErrors = await cleanupSandboxResources(planned);
    if (cleanupErrors.length === 0) {
      process.stderr.write('Disposable sandbox cleanup complete and absence verified.\n');
    }
    if (!outputMaterialized) {
      await rm(hostMaterializationDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 });
    }
  }
  if (cleanupErrors.length > 0) {
    const recoveryCommand = `pnpm qualify:projects:sandboxed -- --clean-orphans --run-id=${planned.runId}`;
    throw new Error(
      `Sandbox run ${planned.runId} cleanup is incomplete. Runner exit code: ${runnerExitCode}.` +
        `${primaryFailure === undefined ? '' : `\nOriginal failure:\n${errorText(primaryFailure)}`}` +
        `\nCleanup failures:\n${cleanupErrors.join('\n')}\nRecovery command:\n${recoveryCommand}`
    );
  }
  if (primaryFailure !== undefined) throw primaryFailure;
  if (executionResult === undefined) throw new Error(`Sandbox run ${planned.runId} produced no execution result.`);
  return executionResult;
};

const main = async () => {
  const result = await executeSandboxedQualification();
  if (result.exitCode !== 0) {
    process.exitCode = result.exitCode;
  }
};

if (import.meta.main) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${errorText(error)}\n`);
    process.exitCode = 1;
  });
}
