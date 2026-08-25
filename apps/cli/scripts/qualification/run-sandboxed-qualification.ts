import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { BUILT_IN_CASES, AWS_QUALIFICATION_SCENARIOS } from './catalog';
import { qualificationReportSchema } from './contracts';
import { assertProcessSucceeded, outputTail, redactOutput, runProcess } from './process';
import { buildRunnerImage } from './sandbox-dockerfile';
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
  outputTail(redactOutput(error instanceof Error ? (error.stack ?? error.message) : String(error)), 12_000);

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
  --clean-orphans                    Remove all lingering qualification containers, networks, and volumes

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

export const cleanOrphanResources = async () => {
  process.stdout.write('Cleaning lingering qualification sandbox resources...\n');
  const containerIds = await runProcess({
    command: 'docker',
    args: ['ps', '-a', '-q', '--filter', 'label=stacktape.qualification.managed=true'],
    cwd: rootDirectory,
    timeoutMs: 15_000
  });
  for (const id of containerIds.stdout.split(/\s+/).filter(Boolean)) {
    await runProcess({ command: 'docker', args: ['rm', '-f', id], cwd: rootDirectory, timeoutMs: 15_000 });
  }

  const volumeNames = await runProcess({
    command: 'docker',
    args: ['volume', 'ls', '-q', '--filter', 'label=stacktape.qualification.managed=true'],
    cwd: rootDirectory,
    timeoutMs: 15_000
  });
  for (const name of volumeNames.stdout.split(/\s+/).filter(Boolean)) {
    await runProcess({ command: 'docker', args: ['volume', 'rm', '-f', name], cwd: rootDirectory, timeoutMs: 15_000 });
  }

  const networkIds = await runProcess({
    command: 'docker',
    args: ['network', 'ls', '-q', '--filter', 'label=stacktape.qualification.managed=true'],
    cwd: rootDirectory,
    timeoutMs: 15_000
  });
  for (const id of networkIds.stdout.split(/\s+/).filter(Boolean)) {
    await runProcess({ command: 'docker', args: ['network', 'rm', id], cwd: rootDirectory, timeoutMs: 15_000 });
  }
  process.stdout.write('Orphan cleanup completed.\n');
};

const verifyResourceOwned = async (kind: 'container' | 'volume' | 'network', name: string, expectedRunId: string) => {
  try {
    const inspectResult = await runProcess({
      command: 'docker',
      args: [kind, 'inspect', name],
      cwd: rootDirectory,
      timeoutMs: 10_000
    });
    if (inspectResult.exitCode !== 0) return false;
    const inspectJson = JSON.parse(inspectResult.stdout.trim() || '[]')[0];
    const labels =
      (kind === 'volume' ? inspectJson?.Labels : (inspectJson?.Config?.Labels ?? inspectJson?.Labels)) ?? {};
    return (
      labels['stacktape.qualification.managed'] === 'true' && labels['stacktape.qualification.run-id'] === expectedRunId
    );
  } catch {
    return false;
  }
};

const cleanupSandboxResources = async (planned: PlannedSandboxExecution) => {
  const errors: string[] = [];

  for (const containerName of [planned.runnerContainerName, planned.stagingContainerName]) {
    try {
      if (await verifyResourceOwned('container', containerName, planned.runId)) {
        await runProcess({
          command: 'docker',
          args: ['rm', '-f', containerName],
          cwd: rootDirectory,
          timeoutMs: 15_000
        });
      }
    } catch (error) {
      errors.push(`Failed to remove container ${containerName}: ${String(error)}`);
    }
  }

  // Remove DinD container
  try {
    if (await verifyResourceOwned('container', planned.dindContainerName, planned.runId)) {
      await runProcess({
        command: 'docker',
        args: ['rm', '-f', planned.dindContainerName],
        cwd: rootDirectory,
        timeoutMs: 15_000
      });
    }
  } catch (error) {
    errors.push(`Failed to remove DinD container ${planned.dindContainerName}: ${String(error)}`);
  }

  // Remove volumes
  for (const vol of [planned.inputVolumeName, planned.outputVolumeName, planned.cacheVolumeName]) {
    try {
      if (await verifyResourceOwned('volume', vol, planned.runId)) {
        await runProcess({
          command: 'docker',
          args: ['volume', 'rm', '-f', vol],
          cwd: rootDirectory,
          timeoutMs: 15_000
        });
      }
    } catch (error) {
      errors.push(`Failed to remove volume ${vol}: ${String(error)}`);
    }
  }

  // Remove network
  try {
    if (await verifyResourceOwned('network', planned.networkName, planned.runId)) {
      await runProcess({
        command: 'docker',
        args: ['network', 'rm', planned.networkName],
        cwd: rootDirectory,
        timeoutMs: 15_000
      });
    }
  } catch (error) {
    errors.push(`Failed to remove network ${planned.networkName}: ${String(error)}`);
  }

  if (errors.length > 0) {
    process.stderr.write(`Cleanup warnings:\n${errors.join('\n')}\n`);
  }
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
    await cleanOrphanResources();
    return { exitCode: 0, planned: undefined as any };
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

  await mkdir(planned.hostOutputDirectory, { recursive: true });

  process.stderr.write(
    `Starting disposable qualification sandbox:\n- Network: ${planned.networkName}\n- DinD: ${planned.dindContainerName}\n- Runner: ${planned.runnerContainerName}\n- Output: ${planned.hostOutputDirectory}\n\n`
  );

  let runnerExitCode = 1;
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

    runnerExitCode = runResult.exitCode ?? (runResult.timedOut ? 124 : 1);

    // 7. Copy output directory back to host
    process.stderr.write(`Copying qualification output back to ${planned.hostOutputDirectory}...\n`);
    const cpOutResult = await runProcess({
      command: 'docker',
      args: ['cp', `${planned.runnerContainerName}:/qualification/output/.`, planned.hostOutputDirectory],
      cwd: rootDirectory,
      timeoutMs: 60_000
    });
    if (cpOutResult.exitCode !== 0) {
      process.stderr.write(`Failed to copy output files from container: ${cpOutResult.stderr}\n`);
      runnerExitCode = 1;
    }

    // 8. Schema validate the qualification report if present
    const reportPath = join(planned.hostOutputDirectory, 'qualification-report.json');
    try {
      const reportJsonText = await readFile(reportPath, 'utf8');
      const parsedReport = qualificationReportSchema.parse(JSON.parse(reportJsonText));
      if (parsedReport.productCommit !== planned.productCommit) {
        throw new Error(
          `Qualification report commit ${parsedReport.productCommit} does not match sandbox commit ${planned.productCommit}.`
        );
      }
      process.stderr.write(
        `Qualification report verified: ${parsedReport.summary.passed} passed, ${parsedReport.summary.failed} failed.\n`
      );
      if (planned.isSelfTest) {
        const selfTestCase = parsedReport.cases.find((entry) => entry.id === 'qualification-self-test-docker');
        const packageStep = selfTestCase?.steps.find((step) => step.name === 'package');
        const checked = packageStep?.details?.checked;
        const templatePath = join(
          planned.hostOutputDirectory,
          'cases',
          'qualification-self-test-docker',
          'compiled-template.yml'
        );
        const templateText = await readFile(templatePath, 'utf8');
        if (
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
          templateText.trim().length > 0
        ) {
          process.stdout.write('\nSandbox self-test SUCCESS: nested Docker build and template synthesis verified.\n');
          runnerExitCode = 0;
        } else {
          process.stderr.write('\nSandbox self-test FAILED: expected 1 passed case with 0 failures.\n');
          runnerExitCode = 1;
        }
      }
    } catch (reportError) {
      process.stderr.write(`Qualification report validation failed: ${String(reportError)}\n`);
      runnerExitCode = 1;
    }

    return { exitCode: runnerExitCode, planned };
  } finally {
    process.stderr.write('Cleaning up disposable sandbox resources...\n');
    await cleanupSandboxResources(planned);
    process.stderr.write('Disposable sandbox cleanup complete.\n');
  }
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
