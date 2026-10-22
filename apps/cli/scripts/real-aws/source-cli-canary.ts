/**
 * The guardrails and plumbing shared by the canaries that deploy a `_test-stacks` fixture through the source-built CLI
 * (`pnpm dev:cli`, which reads the Stacktape API key from `apps/cli/.env.local` in dev mode): option checks, the
 * Stacktape connection check, ownership checks, recovery state, and the AWS queries that prove deletion.
 *
 * The rules they enforce are in docs/testing/live-aws.md.
 */
import {
  CloudFormationClient,
  DescribeStackResourcesCommand,
  DescribeStacksCommand,
  type Stack
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, DeleteLogGroupCommand, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DeleteObjectsCommand, ListObjectVersionsCommand, type S3Client } from '@aws-sdk/client-s3';
import { randomBytes } from 'node:crypto';
import { Resolver, resolve4, resolveNs } from 'node:dns/promises';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

export type Environment = Record<string, string | undefined>;
export type CanaryOptions = {
  expectedAccountId: string;
  profile: string;
  region: string;
  projectName: string;
  owner: string;
  stateFile: string;
  reportFile?: string;
};
export type BaseState = {
  accountId: string;
  region: string;
  projectName: string;
  stage: string;
  stackName: string;
  owner: string;
  awsAccountName: string;
  stackId?: string;
  cleanupVerifiedAt?: string;
};
type AgentRecord = Record<string, unknown> & { type: string };

export const OWNER_TAG = 'stacktape-canary-owner';
export const CLI_DIRECTORY = join(import.meta.dir, '..', '..');
const REPO_ROOT = join(CLI_DIRECTORY, '..', '..');
const COMMAND_TIMEOUT_MS = 30 * 60 * 1000;

export const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/** Reads `<prefix>*` options. Nothing mutates AWS unless `<prefix>DEPLOY=1` and every identity check passes. */
export const resolveCanaryOptions = (
  env: Environment,
  { prefix, projectPrefix }: { prefix: string; projectPrefix: string }
): CanaryOptions => {
  assert(env[`${prefix}DEPLOY`] === '1', `Refusing to mutate AWS without explicit opt-in. Set ${prefix}DEPLOY=1.`);
  assert(
    !Object.keys(env).some((name) => name === 'AWS_ENDPOINT_URL' || name.startsWith('AWS_ENDPOINT_URL_')),
    'Refusing to run while an AWS endpoint override is set.'
  );
  const expectedAccountId = env[`${prefix}EXPECTED_ACCOUNT_ID`]?.trim() ?? '';
  assert(/^\d{12}$/.test(expectedAccountId), `${prefix}EXPECTED_ACCOUNT_ID must be the exact 12-digit account id.`);
  const profile = env[`${prefix}PROFILE`]?.trim() ?? '';
  assert(/^[\w.-]{1,64}$/.test(profile), `${prefix}PROFILE must name the exact local AWS profile.`);
  const region = env[`${prefix}REGION`]?.trim() || 'eu-west-1';
  assert(/^[a-z]{2}(?:-[a-z0-9]+)+-\d+$/.test(region), `${prefix}REGION must be an AWS region.`);
  const projectName =
    env[`${prefix}PROJECT_NAME`]?.trim() ||
    `${projectPrefix}${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`;
  assert(
    projectName.length <= 40 &&
      projectName.startsWith(projectPrefix) &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(projectName.slice(projectPrefix.length)),
    `${prefix}PROJECT_NAME must start with ${projectPrefix} and contain only lowercase letters, digits and dashes.`
  );
  const owner = env[`${prefix}OWNER`]?.trim() ?? '';
  assert(/^[\w.:-]{1,128}$/.test(owner), `${prefix}OWNER must identify this run.`);
  const stateFile = env[`${prefix}STATE_FILE`]?.trim() ?? '';
  assert(isAbsolute(stateFile), `${prefix}STATE_FILE must be an absolute path.`);
  const reportFile = env[`${prefix}REPORT`]?.trim();
  assert(!reportFile || isAbsolute(reportFile), `${prefix}REPORT must be an absolute path.`);
  return { expectedAccountId, profile, region, projectName, owner, stateFile, ...(reportFile && { reportFile }) };
};

/** Whether `apps/cli/.env.local` sets a non-empty API key. Only the answer leaves this function, never the value. */
export const hasDevApiKey = async () => {
  const content = await readFile(join(CLI_DIRECTORY, '.env.local'), 'utf8').catch(() => '');
  const value = content
    .match(/^\s*STACKTAPE_API_KEY\s*=\s*(.*)$/m)?.[1]
    ?.trim()
    .replace(/^(["'])(.*)\1$/, '$2');
  return Boolean(value);
};

export const describeStack = async (client: CloudFormationClient, stackName: string): Promise<Stack | undefined> => {
  try {
    return (await client.send(new DescribeStacksCommand({ StackName: stackName }))).Stacks?.[0];
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError' && /does not exist/i.test(error.message)) {
      return undefined;
    }
    throw error;
  }
};

export const readStackResources = async (client: CloudFormationClient, stackName: string) =>
  (await client.send(new DescribeStackResourcesCommand({ StackName: stackName }))).StackResources ?? [];

export const assertOwned = (stack: Stack, owner: string, stackId?: string) => {
  const tagged = stack.Tags?.find(({ Key }) => Key === OWNER_TAG)?.Value;
  assert(tagged === owner, `Refusing to touch ${stack.StackName}: its owner tag is ${tagged ?? 'missing'}.`);
  assert(!stackId || stackId === stack.StackId, `Refusing to touch ${stack.StackName}: its id changed.`);
};

export const writeState = (options: CanaryOptions, state: BaseState) =>
  writeFile(options.stateFile, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });

export const readState = async <State extends BaseState>(options: CanaryOptions, stackName: string) => {
  const state = JSON.parse(await readFile(options.stateFile, 'utf8')) as State;
  assert(state.accountId === options.expectedAccountId, 'The state file belongs to another AWS account.');
  assert(state.owner === options.owner && state.stackName === stackName, 'The state file belongs to another run.');
  return state;
};

export const isMissing = (error: unknown, names: string[]) =>
  error instanceof Error &&
  (names.includes(error.name) || /not ?found|does not exist|cannot be found/i.test(error.message));

/** True when the describe call reports the resource missing; any other failure propagates. */
export const gone = (operation: () => Promise<unknown>, names: string[]) =>
  operation().then(
    () => false,
    (error: unknown) => {
      if (isMissing(error, names)) return true;
      throw error;
    }
  );

/** Deletes every object version of a bucket the run's stack created, so a direct stack deletion can remove it. */
export const emptyBucket = async (client: S3Client, bucket: string) => {
  for (;;) {
    const page = await client.send(new ListObjectVersionsCommand({ Bucket: bucket, MaxKeys: 1000 }));
    const objects = [...(page.Versions ?? []), ...(page.DeleteMarkers ?? [])].map(({ Key, VersionId }) => ({
      Key,
      VersionId
    }));
    if (objects.length === 0) return;
    await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }));
  }
};

/**
 * Deletes the exact log groups given and proves they are gone. Lambda and ECS can recreate a log group after the stack
 * removed it, so the caller passes only names derived from the run's own resources.
 */
export const deleteLogGroups = async (client: CloudWatchLogsClient, logGroupNames: string[]) => {
  for (const logGroupName of new Set(logGroupNames)) {
    const existing = await client.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName }));
    if (existing.logGroups?.some((group) => group.logGroupName === logGroupName)) {
      await client.send(new DeleteLogGroupCommand({ logGroupName }));
    }
    const after = await client.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName }));
    assert(!after.logGroups?.some((group) => group.logGroupName === logGroupName), `${logGroupName} still exists.`);
  }
  return `${new Set(logGroupNames).size} absent`;
};

/**
 * The A records of a domain as its zone's authoritative name servers answer them, so a cached answer from a recursive
 * resolver cannot hide a record that still exists. A missing name answers an empty list.
 */
export const resolveAuthoritatively = async (domain: string) => {
  const zone = domain.split('.').slice(-2).join('.');
  const servers = await Promise.all((await resolveNs(zone)).map(async (name) => (await resolve4(name))[0]!));
  const resolver = new Resolver({ timeout: 5000, tries: 2 });
  resolver.setServers(servers);
  try {
    return await resolver.resolve4(domain);
  } catch (error) {
    if (error instanceof Error && 'code' in error && ['ENOTFOUND', 'ENODATA'].includes(String(error.code))) return [];
    throw error;
  }
};

/**
 * Waits until none of the domains resolves. A default domain left pointing at a deleted API Gateway domain could be
 * claimed by anyone who creates the same custom domain name.
 */
export const awaitDomainsReleased = async (domains: string[], timeoutMs = 3 * 60 * 1000) => {
  const startedAt = Date.now();
  let remaining = [...new Set(domains)];
  while (remaining.length > 0) {
    const resolved = await Promise.all(
      remaining.map(async (domain) => ((await resolveAuthoritatively(domain)).length ? domain : null))
    );
    remaining = resolved.filter((domain): domain is string => domain !== null);
    if (remaining.length === 0) break;
    assert(
      Date.now() - startedAt < timeoutMs,
      `These domains still resolve after the deletion: ${remaining.join(', ')}.`
    );
    await sleep(10_000);
  }
  return `${new Set(domains).size} released`;
};

/** The agent-mode records of a CLI run; `pnpm` and `turbo` lines around them are not JSON records and are skipped. */
const parseAgentOutput = (stdout: string, command: string) => {
  const records = stdout.split(/\r?\n/).flatMap((line): AgentRecord[] => {
    if (!line.trim().startsWith('{')) return [];
    try {
      const value: unknown = JSON.parse(line);
      return isRecord(value) && typeof value.type === 'string' ? [value as AgentRecord] : [];
    } catch {
      return [];
    }
  });
  const results = records.filter(({ type }) => type === 'result');
  assert(results.length === 1 && records.at(-1) === results[0], `CLI ${command} did not end with one result record.`);
  return { records, result: results[0] as AgentRecord & { ok?: unknown; code?: unknown; message?: unknown } };
};

/**
 * Runs `pnpm dev:cli <args> --agent` with the profile's credentials only and the fixture's inputs in the environment.
 * One runner belongs to one canary run: it forwards signals to the active child and removes every invocation's
 * `apps/cli/.stacktape/<id>` folder in `dispose`.
 */
export const createSourceCliRunner = (options: CanaryOptions, ownerVariable: string) => {
  let activeChild: ReturnType<typeof Bun.spawn> | undefined;
  const invocationIds: string[] = [];
  const stop = (signal: NodeJS.Signals = 'SIGTERM') => {
    if (!activeChild) return;
    try {
      process.kill(-activeChild.pid, signal);
    } catch {
      activeChild.kill(signal);
    }
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  const run = async ({
    args,
    fixture = {},
    invocationId
  }: {
    args: string[];
    fixture?: Environment;
    invocationId: string;
  }) => {
    const env: Environment = {
      ...process.env,
      AWS_PROFILE: options.profile,
      AWS_DEFAULT_PROFILE: options.profile,
      AWS_SDK_LOAD_CONFIG: '1',
      AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'true',
      STP_DISABLE_TELEMETRY: '1',
      STP_INVOCATION_ID: invocationId,
      [ownerVariable]: options.owner,
      ...fixture
    };
    // The key comes from apps/cli/.env.local, which the dev runner loads; nothing inherited may replace or suppress it.
    for (const name of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'STACKTAPE_API_KEY']) {
      delete env[name];
    }
    delete env.SKIP_LOADING_ENV;
    const cliArgs = ['dev:cli', ...args, '--agent'];
    invocationIds.push(invocationId);
    const startedAt = Date.now();
    const child = Bun.spawn({
      cmd: ['pnpm', ...cliArgs],
      cwd: REPO_ROOT,
      env,
      stdout: 'pipe',
      stderr: 'pipe',
      detached: true
    });
    activeChild = child;
    const timer = setTimeout(() => stop('SIGKILL'), COMMAND_TIMEOUT_MS);
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited
    ]).finally(() => {
      clearTimeout(timer);
      activeChild = undefined;
    });
    const { records, result } = parseAgentOutput(stdout, args[0]);
    assert(
      exitCode === 0 && result.ok === true,
      `CLI ${args[0]} failed (${exitCode}): ${String(result.code)}: ${String(result.message)}\n${stderr.trim().slice(-2000)}`
    );
    return { command: `pnpm ${cliArgs.join(' ')}`, records, result, durationMs: Date.now() - startedAt };
  };

  /**
   * The Stacktape connection the CLI must use. With several connected accounts the CLI needs `--awsAccount`, and a
   * privileged connection gives it Stacktape-issued credentials instead of the profile's, so a name is accepted only
   * when it is the single active connection to the expected account.
   */
  const resolveAwsAccountName = async (invocationId: string) => {
    const { result } = await run({ args: ['info:whoami'], invocationId });
    // The agent result record carries the command's return value as `data.result`.
    const whoami = isRecord(result.data) && isRecord(result.data.result) ? result.data.result : {};
    const connections = Array.isArray(whoami.connectedAwsAccounts) ? whoami.connectedAwsAccounts.filter(isRecord) : [];
    const matching = connections.filter(
      ({ awsAccountId, state }) => awsAccountId === options.expectedAccountId && state === 'ACTIVE'
    );
    const name = matching[0]?.name;
    assert(
      matching.length === 1 && typeof name === 'string',
      `Expected one active Stacktape connection to account ${options.expectedAccountId}, found ${matching.length}.`
    );
    return name;
  };

  /** `deploy` or `delete` of one fixture stack through the connection `resolveAwsAccountName` accepted. */
  const runStackCommand = (
    command: 'deploy' | 'delete',
    {
      configPath,
      stage,
      awsAccountName,
      fixture,
      invocationId
    }: {
      configPath: string;
      stage: string;
      awsAccountName: string;
      fixture?: Environment;
      invocationId: string;
    }
  ) =>
    run({
      args: [
        command,
        '--configPath',
        configPath,
        '--projectName',
        options.projectName,
        '--stage',
        stage,
        '--region',
        options.region,
        '--profile',
        options.profile,
        '--awsAccount',
        awsAccountName
      ],
      ...(fixture && { fixture }),
      invocationId
    });

  const dispose = async () => {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await Promise.all(
      invocationIds.map((invocationId) =>
        rm(join(CLI_DIRECTORY, '.stacktape', invocationId), { recursive: true, force: true })
      )
    );
  };

  return { run, resolveAwsAccountName, runStackCommand, dispose };
};

/** The exact environment and command that resume an interrupted run's cleanup. */
export const cleanupCommand = (options: CanaryOptions, prefix: string, script: string) =>
  [
    `${prefix}DEPLOY=1`,
    `${prefix}EXPECTED_ACCOUNT_ID=${options.expectedAccountId}`,
    `${prefix}PROFILE=${options.profile}`,
    `${prefix}REGION=${options.region}`,
    `${prefix}PROJECT_NAME=${options.projectName}`,
    `${prefix}OWNER=${options.owner}`,
    `${prefix}STATE_FILE=${options.stateFile}`,
    `pnpm --filter @stacktape/cli run ${script} -- --cleanup-only`
  ].join(' ');
