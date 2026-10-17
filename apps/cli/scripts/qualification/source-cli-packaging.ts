import { randomBytes } from 'node:crypto';
import { access, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { CloudFormationClient, ListStacksCommand } from '@aws-sdk/client-cloudformation';
import { CreateSecretCommand, GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { PutParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { startMiniStack } from '@stacktape/ministack/fixture';
import { getSsmParameterNameForThirdPartyCredentials } from '@stacktape/naming/ssm-parameter-paths';
import {
  MONGODB_PROVIDER_DEFAULT_CREDENTIALS_ID,
  UPSTASH_PROVIDER_DEFAULT_CREDENTIALS_ID,
  THIRD_PARTY_PROVIDER_CREDENTIALS_REGION
} from '../../src/config/constants';
import { parseCliJsonl } from '../verify-source-cli-aws-readonly';
import { buildOfflineQualificationEnvironment, type OfflineAwsServer } from './offline-aws';
import { assertProcessSucceeded, outputTail, redactOutput, runProcess } from './process';

export const cliDirectory = resolve(import.meta.dir, '..', '..');

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const errorText = (error: unknown): string => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  const details =
    error instanceof AggregateError
      ? [message, ...error.errors.map((cause: unknown) => errorText(cause).slice(0, 4_000))].join('\nCaused by: ')
      : message;
  return outputTail(redactOutput(details), 12_000);
};

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
 * with supported AWS reads on MiniStack. The guard answers only services MiniStack lacks and refuses Stacktape calls. Throws with a redacted output tail when the CLI
 * fails, when it attempted a blocked network call, or when its result contract is incomplete.
 */
export const packageWithSourceCli = async ({
  label,
  projectName,
  projectRoot,
  configPath,
  templatePath,
  offlineServer,
  command = 'validate',
  homeDirectory
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
  /** A caller's already isolated home, when it observes child caches as part of the scenario. */
  homeDirectory?: string;
}) => {
  const invocationId = `qualification-${label}-${randomBytes(4).toString('hex')}`;
  const isolatedHome = homeDirectory ?? join(dirname(projectRoot), 'isolated-home');
  await Promise.all([
    mkdir(join(isolatedHome, 'tmp'), { recursive: true }),
    mkdir(join(isolatedHome, 'appdata'), { recursive: true }),
    mkdir(join(isolatedHome, 'localappdata'), { recursive: true }),
    mkdir(join(isolatedHome, '.config'), { recursive: true }),
    mkdir(join(isolatedHome, '.cache'), { recursive: true }),
    mkdir(join(isolatedHome, '.docker'), { recursive: true })
  ]);
  // Tool downloads are prerequisites, not AWS traffic. Resolve the pinned binary in a separate credential-less
  // process before the CLI's network guard is installed, then keep the guarded CLI fully on loopback.
  const toolPreparation = await runProcess({
    command: process.execPath,
    args: [
      '--no-env-file',
      '--eval',
      "import { resolveExternalTool } from './src/utils/external-tools'; await resolveExternalTool({ tool: 'railpack', toolsDirectory: process.env.STACKTAPE_TOOLS_DIR });"
    ],
    cwd: cliDirectory,
    env: { PATH: process.env.PATH, HOME: isolatedHome, STACKTAPE_TOOLS_DIR: join(isolatedHome, '.stacktape', 'tools') },
    timeoutMs: 90_000
  });
  assertProcessSucceeded(toolPreparation);
  const ministack = await startMiniStack({ label: label.slice(0, 30) });
  const account = ministack.account();
  const cloudformation = new CloudFormationClient(ministack.clientConfig(account));
  const secretClient = new SecretsManagerClient(ministack.clientConfig(account));
  const parameterClient = new SSMClient(
    ministack.clientConfig(account, { region: THIRD_PARTY_PROVIDER_CREDENTIALS_REGION })
  );
  // Settle packaging before stopping the fixture, so a cleanup failure cannot replace its diagnostic.
  const outcome = await (async () => {
    try {
      const environment = {
        ...buildOfflineQualificationEnvironment({
          endpoint: ministack.endpoint,
          invocationId,
          homeDirectory: isolatedHome
        }),
        ...ministack.childEnvironment(account),
        AWS_ENDPOINT_URL_COST_EXPLORER: offlineServer.endpoint,
        AWS_ENDPOINT_URL_BUDGETS: offlineServer.endpoint,
        AWS_ENDPOINT_URL_CLOUDTRAIL: offlineServer.endpoint
      };
      const configText = await readFile(configPath, 'utf8');
      const keysBySecret = new Map<string, Set<string>>();
      for (const match of configText.matchAll(/\$Secret\(['"]([^'"]+)['"]\)/g)) {
        const reference = match[1]!;
        const separator = reference.indexOf('.');
        const name = separator === -1 ? reference : reference.slice(0, separator);
        const keys = keysBySecret.get(name) ?? new Set<string>();
        if (separator !== -1) keys.add(reference.slice(separator + 1));
        keysBySecret.set(name, keys);
      }
      const seeded = new Map<string, string>();
      const secretCanary = `qualification-secret-canary-${invocationId}`;
      for (const [name, keys] of keysBySecret) {
        const value =
          keys.size === 0
            ? secretCanary
            : JSON.stringify(Object.fromEntries([...keys].map((key) => [key, secretCanary])));
        await secretClient.send(new CreateSecretCommand({ Name: name, SecretString: value }));
        seeded.set(name, value);
      }
      // Provider credentials are prerequisites only: validation never calls Atlas or Upstash.
      for (const credentialsIdentifier of [
        MONGODB_PROVIDER_DEFAULT_CREDENTIALS_ID,
        UPSTASH_PROVIDER_DEFAULT_CREDENTIALS_ID
      ]) {
        await parameterClient.send(
          new PutParameterCommand({
            Name: getSsmParameterNameForThirdPartyCredentials({
              credentialsIdentifier,
              region: THIRD_PARTY_PROVIDER_CREDENTIALS_REGION
            }),
            Type: 'SecureString',
            Value: JSON.stringify({
              publicKey: secretCanary,
              privateKey: secretCanary,
              organizationId: 'qualification',
              accountEmail: 'qualification@example.test',
              apiKey: secretCanary
            })
          })
        );
      }
      const initialUnexpectedRequests = offlineServer.unexpectedRequests.length;
      const args = [
        '--no-env-file',
        '--preload',
        join(cliDirectory, 'scripts', 'network-guard-preload.ts'),
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
      const stacks = await cloudformation.send(new ListStacksCommand({}));
      if (stacks.StackSummaries?.length) throw new Error('Packaging created CloudFormation stacks.');
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
                ...(typeof workload.artifactPath === 'string' ? { artifactPath: workload.artifactPath } : {}),
                ...(typeof workload.sourceMapsPath === 'string' ? { sourceMapsPath: workload.sourceMapsPath } : {})
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
          accountId: account.accountId,
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
      if (templateText.includes(secretCanary)) throw new Error('Packaging exposed a seeded secret in its template.');
      for (const [name, value] of seeded) {
        const stored = await secretClient.send(new GetSecretValueCommand({ SecretId: name }));
        if (stored.SecretString !== value) throw new Error(`Packaging changed the stored secret ${name}.`);
      }
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
        accountId: account.accountId,
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
    } finally {
      cloudformation.destroy();
      secretClient.destroy();
      parameterClient.destroy();
    }
  })().then(
    (result) => ({ ok: true, result }) as const,
    (error: unknown) => ({ ok: false, error }) as const
  );
  try {
    await ministack.stop();
  } catch (cleanupError) {
    if (outcome.ok === false) {
      throw new AggregateError(
        [outcome.error, cleanupError],
        'Source CLI packaging failed and MiniStack cleanup failed.',
        {
          cause: outcome.error
        }
      );
    }
    throw cleanupError;
  }
  if (outcome.ok === false) throw outcome.error;
  return outcome.result;
};
