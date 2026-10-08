import { randomBytes } from 'node:crypto';
import { access, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import { buildOfflineQualificationEnvironment, type OfflineAwsServer } from './offline-aws';
import { assertProcessSucceeded, outputTail, redactOutput, runProcess } from './process';

export const cliDirectory = resolve(import.meta.dir, '..', '..');

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const errorText = (error: unknown) =>
  outputTail(redactOutput(error instanceof Error ? (error.stack ?? error.message) : String(error)), 12_000);

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false
  );

/**
 * The source CLI reads the helper-Lambda artifacts that `pnpm dev:cli` builds through turbo before every command. A
 * fresh checkout or worktree has none, and every packaged project then fails with an unexpected `ENOENT` instead of a
 * useful result. Build them once per run, exactly as the turbo task does.
 */
export const ensureDevCliArtifacts = async () => {
  if (await exists(join(cliDirectory, '__stacktape-dist', 'dev', 'helper-lambdas'))) return;
  process.stderr.write('Building the source CLI dev artifacts (helper Lambdas) for this checkout...\n');
  const result = await runProcess({
    command: process.execPath,
    args: ['run', join(cliDirectory, 'scripts', 'package-helper-lambdas.ts'), '--dev'],
    cwd: cliDirectory,
    timeoutMs: 10 * 60_000
  });
  assertProcessSucceeded(result);
};

/**
 * Packages every workload of one project with the source CLI (`validate --withPackage`) in an isolated home and
 * with every AWS and Stacktape request routed to the offline guard. Throws with a redacted output tail when the CLI
 * fails, when it attempted a blocked network call, or when its result contract is incomplete.
 */
export const packageWithSourceCli = async ({
  label,
  projectName,
  projectRoot,
  configPath,
  templatePath,
  offlineServer,
  command = 'validate'
}: {
  label: string;
  projectName: string;
  projectRoot: string;
  configPath: string;
  /** Where `validate` writes the synthesized template; ignored by `package`. */
  templatePath: string;
  offlineServer: OfflineAwsServer;
  /**
   * `validate --withPackage` removes its build directory when it finishes; `package` leaves every artifact and layer
   * under `<project>/.stacktape/<invocationId>/build` for the caller, as the product's own `package` command does.
   */
  command?: 'validate' | 'package';
}) => {
  const invocationId = `qualification-${label}-${randomBytes(4).toString('hex')}`;
  const isolatedHome = join(dirname(projectRoot), 'isolated-home');
  await Promise.all([
    mkdir(join(isolatedHome, 'tmp'), { recursive: true }),
    mkdir(join(isolatedHome, 'appdata'), { recursive: true }),
    mkdir(join(isolatedHome, 'localappdata'), { recursive: true }),
    mkdir(join(isolatedHome, '.config'), { recursive: true }),
    mkdir(join(isolatedHome, '.cache'), { recursive: true }),
    mkdir(join(isolatedHome, '.docker'), { recursive: true })
  ]);
  const environment = buildOfflineQualificationEnvironment({
    endpoint: offlineServer.endpoint,
    invocationId,
    homeDirectory: isolatedHome
  });
  const configText = await readFile(configPath, 'utf8');
  offlineServer.registerSecretReferences(
    [...configText.matchAll(/\$Secret\(['"]([^'"]+)['"]\)/g)]
      .map((match) => match[1])
      .filter((reference): reference is string => reference !== undefined)
  );
  const initialUnexpectedRequests = offlineServer.unexpectedRequests.length;
  const args = [
    'run',
    join(cliDirectory, 'scripts', 'dev.ts'),
    ...(command === 'package' ? ['package'] : ['validate', '--withPackage']),
    '--configPath',
    configPath,
    '--currentWorkingDirectory',
    projectRoot,
    '--projectName',
    projectName,
    '--stage',
    'qualification',
    '--region',
    'eu-west-1',
    '--agent',
    ...(command === 'package' ? [] : ['--outFile', templatePath])
  ];
  const processResult = await runProcess({
    command: process.execPath,
    args,
    cwd: cliDirectory,
    env: environment,
    timeoutMs: 45 * 60_000
  });
  const blockedRequests = offlineServer.unexpectedRequests.slice(initialUnexpectedRequests);
  if (processResult.timedOut) throw new Error('Source CLI packaging exceeded 45 minutes.');
  if (processResult.stdoutTruncated) {
    throw new Error('Source CLI JSONL exceeded the 32 MiB qualification capture limit.');
  }
  let parsed: ReturnType<typeof parseCliJsonl>;
  try {
    parsed = parseCliJsonl(processResult.stdout, 'validate --withPackage');
  } catch (error) {
    throw new Error(
      `Source CLI packaging exited with ${String(processResult.exitCode)} without a valid result contract.\n${errorText(error)}\n${outputTail(
        `${processResult.stdout}\n${processResult.stderr}`,
        12_000
      )}`
    );
  }
  if (processResult.exitCode !== 0 || !parsed.result.ok || parsed.result.code !== 'OK') {
    throw new Error(
      `Source CLI packaging failed (${String(processResult.exitCode)}): ${parsed.result.code}: ${parsed.result.message}\n${outputTail(
        `${processResult.stdout}\n${processResult.stderr}`,
        12_000
      )}`
    );
  }
  if (blockedRequests.length > 0) {
    throw new Error(`Packaging attempted blocked network calls: ${blockedRequests.join(', ')}.`);
  }

  const commandResult = isRecord(parsed.result.data) ? parsed.result.data.result : undefined;
  const describeWorkloads = (workloads: unknown[]) =>
    workloads.map((workload) =>
      isRecord(workload)
        ? {
            jobName: workload.jobName,
            digest: workload.digest,
            skipped: workload.skipped,
            size: workload.size,
            ...(typeof workload.artifactPath === 'string' ? { artifactPath: workload.artifactPath } : {})
          }
        : workload
    );
  if (command === 'package') {
    if (!Array.isArray(commandResult)) {
      throw new Error(
        `The package command did not return its packaged workloads.\n${outputTail(`${processResult.stdout}\n${processResult.stderr}`, 12_000)}`
      );
    }
    return {
      processResult,
      invocationId,
      details: {
        validationContract: 'package-result' as const,
        checked: { config: true, resources: false, template: false, packaging: true, cloudformation: false },
        packagedWorkloads: describeWorkloads(commandResult),
        blockedNetworkRequests: blockedRequests,
        templatePath
      }
    };
  }
  const structuredResult = isRecord(commandResult) ? commandResult : undefined;
  const structuredChecks =
    structuredResult !== undefined && isRecord(structuredResult.checked) ? structuredResult.checked : undefined;
  const hasStructuredContract = structuredResult?.valid === true && structuredChecks !== undefined;
  const packagingCompleted = parsed.events.some(
    (event) => event.type === 'event' && event.eventType === 'PACKAGE_ARTIFACTS' && event.status === 'completed'
  );
  const templateText = await readFile(templatePath, 'utf8');
  if (!hasStructuredContract && (!packagingCompleted || templateText.trim().length === 0)) {
    throw new Error(
      'Validate returned neither its structured success contract nor completed packaging and a template.'
    );
  }
  if (hasStructuredContract && (structuredChecks?.packaging !== true || structuredChecks.template !== true)) {
    throw new Error('Validate did not check both packaging and the synthesized template.');
  }
  const workloads =
    hasStructuredContract && Array.isArray(structuredResult.packagedWorkloads)
      ? structuredResult.packagedWorkloads
      : [];
  return {
    processResult,
    invocationId,
    details: {
      validationContract: hasStructuredContract ? 'structured-result' : 'completed-events-and-template',
      checked: hasStructuredContract
        ? structuredChecks
        : { config: true, resources: true, template: true, packaging: true, cloudformation: false },
      packagedWorkloads: describeWorkloads(workloads),
      blockedNetworkRequests: blockedRequests,
      templatePath
    }
  };
};
