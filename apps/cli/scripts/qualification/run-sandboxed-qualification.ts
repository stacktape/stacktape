import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BUILT_IN_CASES, AWS_QUALIFICATION_SCENARIOS } from './catalog';
import { assertProcessSucceeded, outputTail, redactOutput, runProcess, type ProcessResult } from './process';
import { buildRunnerImage } from './sandbox-dockerfile';
import {
  assertPlannedSecurity,
  DEFAULT_SANDBOX_CPUS,
  DEFAULT_SANDBOX_MEMORY,
  DEFAULT_SANDBOX_PIDS_LIMIT,
  parseSandboxedOptions,
  planSandboxExecution,
  type PlannedSandboxExecution
} from './sandbox-planning';

const rootDirectory = resolve(import.meta.dir, '..', '..', '..', '..');
const invocationDirectory = resolve(process.env.INIT_CWD ?? process.cwd());

const errorText = (error: unknown) =>
  outputTail(redactOutput(error instanceof Error ? (error.stack ?? error.message) : String(error)), 12_000);

const helpText = `Stacktape sandboxed project qualification

Runs qualification in a disposable Docker container connected to a nested Docker-in-Docker (DinD)
daemon. Untrusted project installation and build scripts never receive host credentials, the host home
directory, or the host Docker socket (/var/run/docker.sock).

Usage:
  pnpm qualify:projects:sandboxed -- [options]
  bun apps/cli/scripts/qualification/run-sandboxed-qualification.ts [options]

Standard Qualification Options:
  --preset=smoke|release|stress|all  Built-in project set (default: smoke without --manifest)
  --case=<id>[,<id>...]              Run selected built-in or manifest cases; repeatable
  --manifest=<path>                  Add a versioned JSON corpus manifest; repeatable
  --lanes=import,package,runtime,aws Requested lanes (package automatically includes import)
  --aws-scenario=<id>                Explicit AWS archetype; required for the aws lane; repeatable
  --output-dir=<path>                Durable JSON/Markdown results (default: .stacktape/qualification/<run>)
  --cache-root=<path>                Persistent checkout cache
  --resume-from=<report.json>        Skip matching cases that already passed
  --shard=<index>/<total>            Deterministically run one shard, for example 2/10
  --max-cases=<count>                Cap projects after selection and sharding
  --keep-workdirs                    Retain isolated project copies inside container for diagnosis
  --fail-fast                        Stop project execution after the first failed case
  --list                             List built-in projects and AWS scenarios
  --help                             Show this help

Sandbox Options:
  --memory=<limit>                   Container memory limit (default: ${DEFAULT_SANDBOX_MEMORY})
  --cpus=<limit>                     Container CPU limit (default: ${DEFAULT_SANDBOX_CPUS})
  --pids-limit=<limit>               Container process limit (default: ${DEFAULT_SANDBOX_PIDS_LIMIT})
  --rebuild-image                    Force rebuilding the runner image even if already cached
  --dry-run                          Print planned sandbox container commands and boundary without executing
  --self-test                        Run a fast self-test inside the sandbox to verify the boundary

Residual Security Model & Limitations:
  1. Privileged DinD: The nested Docker daemon requires --privileged to manage overlayfs namespaces.
     While the qualification runner is unprivileged, code escaping the nested daemon could access the VM/kernel.
  2. Network / LAN Egress: Outbound internet connectivity is enabled to download dependencies (npm, PyPI, etc.).
     Cloud metadata (169.254.169.254) and host gateway DNS names (host.docker.internal) are sinkholed to 127.0.0.1,
     but egress to public IPs and unsegmented local network endpoints remains reachable.
  3. Shared Linux Kernel: Containers share the underlying Linux VM / host kernel. This is not a hardware hypervisor.
  4. Isolation Scope: Only --output-dir (read-write), --cache-root (read-write), and declared manifests (read-only)
     are mounted. Host home, AWS credentials, Stacktape API keys, and /var/run/docker.sock are never mounted.
`;

const listCatalog = () => {
  process.stdout.write('Built-in projects:\n');
  for (const entry of BUILT_IN_CASES) process.stdout.write(`  ${entry.id}  [${entry.tags.join(', ')}]\n`);
  process.stdout.write('\nExplicit AWS scenarios:\n');
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

const cleanupSandboxResources = async (planned: PlannedSandboxExecution) => {
  try {
    await runProcess({
      command: 'docker',
      args: ['rm', '-f', planned.runnerContainerName],
      cwd: rootDirectory,
      timeoutMs: 15_000
    });
  } catch {}

  try {
    await runProcess({
      command: 'docker',
      args: ['rm', '-f', planned.dindContainerName],
      cwd: rootDirectory,
      timeoutMs: 15_000
    });
  } catch {}

  try {
    await runProcess({
      command: 'docker',
      args: ['network', 'rm', planned.networkName],
      cwd: rootDirectory,
      timeoutMs: 15_000
    });
  } catch {}
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

  const effectiveArgs = parsed.selfTest
    ? ['--preset=smoke', '--lanes=import', '--max-cases=1', ...rawArgs.filter((arg) => arg !== '--self-test')]
    : rawArgs;

  const productCommit = await getCleanProductCommit(parsed.dryRun);
  const planned = planSandboxExecution({
    productCommit,
    rawArgs: effectiveArgs,
    invocationDirectory,
    rootDirectory
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
          runnerContainer: planned.runnerContainerName,
          mounts: planned.mounts,
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

  await mkdir(planned.outputDirectory, { recursive: true });
  await mkdir(planned.cacheRoot, { recursive: true });

  process.stderr.write(
    `Starting disposable qualification sandbox:\n- Network: ${planned.networkName}\n- DinD: ${planned.dindContainerName}\n- Runner: ${planned.runnerContainerName}\n- Output: ${planned.outputDirectory}\n- Cache: ${planned.cacheRoot}\n\n`
  );

  let runnerProcessResult: ProcessResult | undefined;
  try {
    const netResult = await runProcess({
      command: 'docker',
      args: ['network', 'create', '--driver', 'bridge', planned.networkName],
      cwd: rootDirectory,
      timeoutMs: 30_000
    });
    assertProcessSucceeded(netResult);

    const dindResult = await runProcess({
      command: 'docker',
      args: planned.dindArgs,
      cwd: rootDirectory,
      timeoutMs: 60_000
    });
    assertProcessSucceeded(dindResult);

    await waitForDindReadiness(planned.dindContainerName);

    runnerProcessResult = await runProcess({
      command: 'docker',
      args: planned.runnerArgs,
      cwd: rootDirectory,
      timeoutMs: planned.resourceLimits.timeoutMs,
      forwardSignals: true
    });

    if (runnerProcessResult.stdout) process.stdout.write(runnerProcessResult.stdout);
    if (runnerProcessResult.stderr) process.stderr.write(runnerProcessResult.stderr);

    const exitCode = runnerProcessResult.exitCode ?? (runnerProcessResult.timedOut ? 124 : 1);
    return { exitCode, planned };
  } finally {
    process.stderr.write('\nCleaning up disposable sandbox containers and network...\n');
    await cleanupSandboxResources(planned);
    process.stderr.write('Disposable sandbox cleaned up.\n');
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
