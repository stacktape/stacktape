/**
 * Real-AWS check that a configuration-only change reaches a Lambda alias, and that an unchanged redeploy publishes
 * nothing: the version publisher's `versionedConfiguration` (`functions/versioned-configuration.ts`).
 *
 * It deploys `_test-stacks/alias-publication`, one Node.js function behind a CodeDeploy alias, through the source-built
 * CLI (`pnpm dev:cli`, which reads the Stacktape API key from `apps/cli/.env.local` in dev mode), then deletes it:
 * 1. deploy, and invoke the function through its alias;
 * 2. change only its environment value and deploy. The alias must serve the new value from a newly published version,
 *    and the publisher's properties in the two deployed templates must differ only in `versionedConfiguration`: without
 *    it they would be identical, and CloudFormation would not have run the publisher;
 * 3. deploy again unchanged: no new version, the same alias, byte-identical publisher properties and resources;
 * 4. delete the stack with the CLI, then confirm with AWS that the stack, its deployment bucket, its functions and their
 *    log groups are gone.
 *
 * Guardrails (docs/testing.md, "Live AWS"): an explicit opt-in; STS must resolve the credentials to the explicitly
 * expected account, and the CLI deploys through the single active Stacktape connection to that same account; a new
 * `v4aliascanary-` project carrying the run's owner tag; recovery state written before the first deploy; cleanup in
 * `finally` after success or failure, verified with AWS; one exact `--cleanup-only` command when cleanup does not
 * finish. The API key and credentials never appear in commands, logs or the report.
 *
 *   STP_AWS_ALIAS_CANARY_DEPLOY=1 STP_AWS_ALIAS_CANARY_EXPECTED_ACCOUNT_ID=<12 digits> STP_AWS_ALIAS_CANARY_PROFILE=<name>
 *   STP_AWS_ALIAS_CANARY_OWNER=<run id> STP_AWS_ALIAS_CANARY_STATE_FILE=<absolute path>
 *   [STP_AWS_ALIAS_CANARY_REPORT=<absolute path>] [STP_AWS_ALIAS_CANARY_PROJECT_NAME=v4aliascanary-…]
 *   [STP_AWS_ALIAS_CANARY_REGION=eu-west-1]
 *   pnpm --filter @stacktape/cli run test:real-aws-alias-canary [-- --cleanup-only]
 */
import {
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStackResourcesCommand,
  DescribeStacksCommand,
  GetTemplateCommand,
  waitUntilStackDeleteComplete,
  type Stack
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, DeleteLogGroupCommand, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import {
  GetAliasCommand,
  GetFunctionCommand,
  InvokeCommand,
  LambdaClient,
  ListVersionsByFunctionCommand
} from '@aws-sdk/client-lambda';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { createHash, randomBytes } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { parseYaml } from '../../src/utils/yaml';

type Environment = Record<string, string | undefined>;
type Options = {
  expectedAccountId: string;
  profile: string;
  region: string;
  projectName: string;
  owner: string;
  stateFile: string;
  reportFile?: string;
};
type State = {
  accountId: string;
  region: string;
  projectName: string;
  stage: string;
  stackName: string;
  owner: string;
  awsAccountName: string;
  stackId?: string;
  deploymentBucket?: string;
  functionNames?: string[];
  logGroupNames?: string[];
  cleanupVerifiedAt?: string;
};
type Clients = {
  cloudFormation: CloudFormationClient;
  lambda: LambdaClient;
  logs: CloudWatchLogsClient;
  s3: S3Client;
  sts: STSClient;
};
type AgentRecord = Record<string, unknown> & { type: string };

const PREFIX = 'STP_AWS_ALIAS_CANARY_';
const STAGE = 'canary';
const FUNCTION = 'greeter';
const OWNER_TAG = 'stacktape-canary-owner';
const CLI_DIRECTORY = join(import.meta.dir, '..', '..');
const REPO_ROOT = join(CLI_DIRECTORY, '..', '..');
const FIXTURE_CONFIG = '_test-stacks/alias-publication/stacktape.ts';
const COMMAND_TIMEOUT_MS = 30 * 60 * 1000;
const ALIAS = awsResourceNames.lambdaStpAlias();
const PUBLISHER = cfLogicalNames.lambdaVersionPublisherCustomResource(FUNCTION);

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const resolveOptions = (env: Environment = process.env): Options => {
  assert(env[`${PREFIX}DEPLOY`] === '1', `Refusing to mutate AWS without explicit opt-in. Set ${PREFIX}DEPLOY=1.`);
  assert(
    !Object.keys(env).some((name) => name === 'AWS_ENDPOINT_URL' || name.startsWith('AWS_ENDPOINT_URL_')),
    'Refusing to run while an AWS endpoint override is set.'
  );
  const expectedAccountId = env[`${PREFIX}EXPECTED_ACCOUNT_ID`]?.trim() ?? '';
  assert(/^\d{12}$/.test(expectedAccountId), `${PREFIX}EXPECTED_ACCOUNT_ID must be the exact 12-digit account id.`);
  const profile = env[`${PREFIX}PROFILE`]?.trim() ?? '';
  assert(/^[\w.-]{1,64}$/.test(profile), `${PREFIX}PROFILE must name the exact local AWS profile.`);
  const region = env[`${PREFIX}REGION`]?.trim() || 'eu-west-1';
  assert(/^[a-z]{2}(?:-[a-z0-9]+)+-\d+$/.test(region), `${PREFIX}REGION must be an AWS region.`);
  const projectName =
    env[`${PREFIX}PROJECT_NAME`]?.trim() ||
    `v4aliascanary-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`;
  assert(
    projectName.length <= 40 && /^v4aliascanary-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(projectName),
    `${PREFIX}PROJECT_NAME must start with v4aliascanary- and contain only lowercase letters, digits and dashes.`
  );
  const owner = env[`${PREFIX}OWNER`]?.trim() ?? '';
  assert(/^[\w.:-]{1,128}$/.test(owner), `${PREFIX}OWNER must identify this run.`);
  const stateFile = env[`${PREFIX}STATE_FILE`]?.trim() ?? '';
  assert(isAbsolute(stateFile), `${PREFIX}STATE_FILE must be an absolute path.`);
  const reportFile = env[`${PREFIX}REPORT`]?.trim();
  assert(!reportFile || isAbsolute(reportFile), `${PREFIX}REPORT must be an absolute path.`);
  return { expectedAccountId, profile, region, projectName, owner, stateFile, ...(reportFile && { reportFile }) };
};

const createClients = ({ profile, region }: Options): Clients => {
  const config = { credentials: fromIni({ profile }), region, maxAttempts: 6, ignoreConfiguredEndpointUrls: true };
  return {
    cloudFormation: new CloudFormationClient(config),
    lambda: new LambdaClient(config),
    logs: new CloudWatchLogsClient(config),
    s3: new S3Client(config),
    sts: new STSClient(config)
  };
};

/** Whether `apps/cli/.env.local` sets a non-empty API key. Only the answer leaves this function, never the value. */
const hasDevApiKey = async () => {
  const content = await readFile(join(CLI_DIRECTORY, '.env.local'), 'utf8').catch(() => '');
  const value = content
    .match(/^\s*STACKTAPE_API_KEY\s*=\s*(.*)$/m)?.[1]
    ?.trim()
    .replace(/^(["'])(.*)\1$/, '$2');
  return Boolean(value);
};

const describeStack = async (client: CloudFormationClient, stackName: string): Promise<Stack | undefined> => {
  try {
    return (await client.send(new DescribeStacksCommand({ StackName: stackName }))).Stacks?.[0];
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError' && /does not exist/i.test(error.message)) {
      return undefined;
    }
    throw error;
  }
};

const assertOwned = (stack: Stack, options: Options, state?: State) => {
  const owner = stack.Tags?.find(({ Key }) => Key === OWNER_TAG)?.Value;
  assert(owner === options.owner, `Refusing to touch ${stack.StackName}: its owner tag is ${owner ?? 'missing'}.`);
  assert(!state?.stackId || state.stackId === stack.StackId, `Refusing to touch ${stack.StackName}: its id changed.`);
};

const writeState = (options: Options, state: State) =>
  writeFile(options.stateFile, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });

const readState = async (options: Options, stackName: string): Promise<State> => {
  const state = JSON.parse(await readFile(options.stateFile, 'utf8')) as State;
  assert(state.accountId === options.expectedAccountId, 'The state file belongs to another AWS account.');
  assert(state.owner === options.owner && state.stackName === stackName, 'The state file belongs to another run.');
  return state;
};

let activeChild: ReturnType<typeof Bun.spawn> | undefined;
/** Every CLI invocation's working folder under `apps/cli/.stacktape`, removed when the run ends. */
const invocationIds: string[] = [];
const stopActiveChild = (signal: NodeJS.Signals = 'SIGTERM') => {
  if (!activeChild) return;
  try {
    process.kill(-activeChild.pid, signal);
  } catch {
    activeChild.kill(signal);
  }
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

/** One source-built CLI command, `pnpm dev:cli <args> --agent`, with the run's owner and value in its environment. */
const runSourceCli = async ({
  options,
  args,
  value,
  invocationId
}: {
  options: Options;
  args: string[];
  value?: string;
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
    [`${PREFIX}OWNER`]: options.owner,
    ...(value !== undefined && { [`${PREFIX}VALUE`]: value })
  };
  // The key comes from apps/cli/.env.local, which the dev runner loads; nothing inherited may replace or suppress it.
  for (const name of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'STACKTAPE_API_KEY']) {
    delete env[name];
  }
  delete env.SKIP_LOADING_ENV;
  const cliArgs = ['dev:cli', ...args, '--agent'];
  invocationIds.push(invocationId);
  const child = Bun.spawn({
    cmd: ['pnpm', ...cliArgs],
    cwd: REPO_ROOT,
    env,
    stdout: 'pipe',
    stderr: 'pipe',
    detached: true
  });
  activeChild = child;
  const timer = setTimeout(() => stopActiveChild('SIGKILL'), COMMAND_TIMEOUT_MS);
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
  return { command: `pnpm ${cliArgs.join(' ')}`, records, result };
};

/**
 * The Stacktape connection the CLI must use. With several connected accounts the CLI needs `--awsAccount`, and a
 * privileged connection gives it Stacktape-issued credentials instead of the profile's, so a name is accepted only when
 * it is the single active connection to the expected account.
 */
const resolveAwsAccountName = async (options: Options, invocationId: string) => {
  const { result } = await runSourceCli({ options, args: ['info:whoami'], invocationId });
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

/** `deploy` or `delete` of the fixture stack through the connection `resolveAwsAccountName` accepted. */
const runStackCommand = async ({
  options,
  command,
  awsAccountName,
  value,
  invocationId
}: {
  options: Options;
  command: 'deploy' | 'delete';
  awsAccountName: string;
  value: string;
  invocationId: string;
}) => {
  const { command: commandLine, records } = await runSourceCli({
    options,
    args: [
      command,
      '--configPath',
      FIXTURE_CONFIG,
      '--projectName',
      options.projectName,
      '--stage',
      STAGE,
      '--region',
      options.region,
      '--profile',
      options.profile,
      '--awsAccount',
      awsAccountName
    ],
    value,
    invocationId
  });
  const update = records.find(
    (record) =>
      record.eventType === 'UPDATE_STACK' && record.status === 'completed' && typeof record.message === 'string'
  );
  return { command: commandLine, updateMessage: (update?.message as string | undefined) ?? null };
};

const readStackResources = async (clients: Clients, stackName: string) =>
  (await clients.cloudFormation.send(new DescribeStackResourcesCommand({ StackName: stackName }))).StackResources ?? [];

/** What the post-deletion check looks for: the deployment bucket, the functions and the log groups of the stack. */
const describeOwnedResources = (resources: Awaited<ReturnType<typeof readStackResources>>) => {
  const physical = (type: string) =>
    resources.filter(({ ResourceType }) => ResourceType === type).map(({ PhysicalResourceId }) => PhysicalResourceId!);
  return {
    deploymentBucket: resources.find(({ LogicalResourceId }) => LogicalResourceId === cfLogicalNames.deploymentBucket())
      ?.PhysicalResourceId,
    functionNames: physical('AWS::Lambda::Function'),
    logGroupNames: physical('AWS::Logs::LogGroup')
  };
};

const readDeployedTemplate = async (clients: Clients, stackName: string) => {
  const body = (
    await clients.cloudFormation.send(new GetTemplateCommand({ StackName: stackName, TemplateStage: 'Original' }))
  ).TemplateBody;
  assert(body, `CloudFormation returned no template for ${stackName}.`);
  const template = parseYaml(body) as { Resources?: Record<string, { Properties?: Record<string, unknown> }> };
  const publisher = template.Resources?.[PUBLISHER]?.Properties;
  assert(publisher, `The deployed template has no ${PUBLISHER}.`);
  return { body, template, publisher };
};

const readVersions = async (clients: Clients, functionName: string) => {
  const versions: string[] = [];
  let marker: string | undefined;
  do {
    const page = await clients.lambda.send(
      new ListVersionsByFunctionCommand({ FunctionName: functionName, Marker: marker })
    );
    versions.push(...(page.Versions ?? []).map(({ Version }) => Version!).filter((version) => version !== '$LATEST'));
    marker = page.NextMarker;
  } while (marker);
  const alias = await clients.lambda.send(new GetAliasCommand({ FunctionName: functionName, Name: ALIAS }));
  return {
    versions: versions.toSorted((left, right) => Number(left) - Number(right)),
    aliasVersion: alias.FunctionVersion
  };
};

/** Invokes the function through its alias until it serves `expected` (a few seconds of eventual consistency at most). */
const invokeAlias = async (clients: Clients, functionName: string, expected: string) => {
  let last: unknown;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const response = await clients.lambda.send(
      new InvokeCommand({ FunctionName: functionName, Qualifier: ALIAS, Payload: new TextEncoder().encode('{}') })
    );
    assert(!response.FunctionError, `The alias invocation failed: ${response.FunctionError}.`);
    last = JSON.parse(new TextDecoder().decode(response.Payload));
    if (isRecord(last) && last.value === expected)
      return { value: last.value as string, version: String(last.version) };
    await sleep(3000);
  }
  throw new Error(`The alias kept serving ${JSON.stringify(last)} instead of ${expected}.`);
};

/** Paths whose values differ between two parsed templates. */
const differingPaths = (left: unknown, right: unknown, path = ''): string[] => {
  if (JSON.stringify(left) === JSON.stringify(right)) return [];
  if (!isRecord(left) || !isRecord(right)) return [path || '(root)'];
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].flatMap((key) =>
    differingPaths(left[key], right[key], path ? `${path}.${key}` : key)
  );
};

const isMissing = (error: unknown, names: string[]) =>
  error instanceof Error && (names.includes(error.name) || /not ?found|does not exist/i.test(error.message));

/** Deletes the stack with the CLI (which also empties its bucket), then checks with AWS that everything owned is gone. */
const cleanup = async (clients: Clients, options: Options, stackName: string) => {
  const state = await readState(options, stackName);
  const stack = await describeStack(clients.cloudFormation, stackName);
  const verification: Record<string, unknown> = {};
  if (stack) {
    assertOwned(stack, options, state);
    // A first deploy that failed part way recorded no resources: take them from the stack before it goes.
    Object.assign(state, describeOwnedResources(await readStackResources(clients, stackName)));
    await writeState(options, state);
    try {
      await runStackCommand({
        options,
        command: 'delete',
        awsAccountName: state.awsAccountName,
        value: 'cleanup',
        invocationId: `alias-canary-delete-${Date.now()}`
      });
      verification.deletedBy = 'stacktape delete';
    } catch (cliError) {
      console.warn(`Stacktape delete failed; deleting the owned stack directly. ${String(cliError).slice(0, 400)}`);
      await clients.cloudFormation.send(new DeleteStackCommand({ StackName: stack.StackId }));
      verification.deletedBy = 'CloudFormation DeleteStack after a failed stacktape delete';
    }
    const waited = await waitUntilStackDeleteComplete(
      { client: clients.cloudFormation, maxWaitTime: 20 * 60, minDelay: 5, maxDelay: 20 },
      { StackName: stack.StackId }
    );
    assert(waited.state === 'SUCCESS', `CloudFormation did not confirm deletion of ${stackName}: ${waited.state}.`);
  }
  assert(!(await describeStack(clients.cloudFormation, stackName)), `${stackName} still exists.`);
  verification.stack = 'absent';

  if (state.deploymentBucket) {
    const bucketGone = await clients.s3.send(new HeadBucketCommand({ Bucket: state.deploymentBucket })).then(
      () => false,
      (error: unknown) => isMissing(error, ['NotFound', 'NoSuchBucket'])
    );
    assert(bucketGone, `The deployment bucket ${state.deploymentBucket} still exists.`);
    verification.deploymentBucket = 'absent';
  }
  for (const functionName of state.functionNames ?? []) {
    const gone = await clients.lambda.send(new GetFunctionCommand({ FunctionName: functionName })).then(
      () => false,
      (error: unknown) => isMissing(error, ['ResourceNotFoundException'])
    );
    assert(gone, `Lambda function ${functionName} still exists.`);
  }
  verification.functions = `${state.functionNames?.length ?? 0} absent`;
  // A function's own log group can be recreated by Lambda after the stack removed it; only these exact names are owned.
  const logGroupNames = [
    ...new Set([...(state.logGroupNames ?? []), ...(state.functionNames ?? []).map((name) => `/aws/lambda/${name}`)])
  ];
  for (const logGroupName of logGroupNames) {
    const existing = await clients.logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName }));
    if (existing.logGroups?.some((group) => group.logGroupName === logGroupName)) {
      await clients.logs.send(new DeleteLogGroupCommand({ logGroupName }));
    }
    const after = await clients.logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName }));
    assert(!after.logGroups?.some((group) => group.logGroupName === logGroupName), `${logGroupName} still exists.`);
  }
  verification.logGroups = `${logGroupNames.length} absent`;
  await writeState(options, { ...state, cleanupVerifiedAt: new Date().toISOString() });
  return verification;
};

const cleanupCommand = (options: Options) =>
  [
    `${PREFIX}DEPLOY=1`,
    `${PREFIX}EXPECTED_ACCOUNT_ID=${options.expectedAccountId}`,
    `${PREFIX}PROFILE=${options.profile}`,
    `${PREFIX}REGION=${options.region}`,
    `${PREFIX}PROJECT_NAME=${options.projectName}`,
    `${PREFIX}OWNER=${options.owner}`,
    `${PREFIX}STATE_FILE=${options.stateFile}`,
    'pnpm --filter @stacktape/cli run test:real-aws-alias-canary -- --cleanup-only'
  ].join(' ');

export const runAliasPublicationCanary = async ({ cleanupOnly = false }: { cleanupOnly?: boolean } = {}) => {
  const options = resolveOptions();
  const clients = createClients(options);
  const stackName = `${options.projectName}-${STAGE}`;
  const report: Record<string, unknown> = {
    kind: 'stacktape-alias-publication-canary',
    startedAt: new Date().toISOString(),
    region: options.region,
    projectName: options.projectName,
    stage: STAGE,
    stackName,
    owner: options.owner
  };
  const writeReport = () =>
    options.reportFile ? writeFile(options.reportFile, `${JSON.stringify(report, null, 2)}\n`) : Promise.resolve();
  let deployAttempted = false;
  let bodyError: unknown;
  let cleanupError: unknown;
  const onSignal = (signal: NodeJS.Signals) => stopActiveChild(signal);
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  try {
    const identity = await clients.sts.send(new GetCallerIdentityCommand({}));
    assert(
      identity.Account === options.expectedAccountId,
      `AWS credentials resolved to account ${identity.Account}, not the expected ${options.expectedAccountId}.`
    );
    report.accountId = identity.Account;
    if (cleanupOnly) {
      report.cleanup = await cleanup(clients, options, stackName);
      return;
    }
    assert(await hasDevApiKey(), 'apps/cli/.env.local sets no STACKTAPE_API_KEY.');
    const run = options.owner.replace(/[^\w-]/g, '-');
    const awsAccountName = await resolveAwsAccountName(options, `alias-canary-whoami-${run}`);
    report.awsAccountName = awsAccountName;
    assert(
      !(await describeStack(clients.cloudFormation, stackName)),
      `Refusing to mutate existing stack ${stackName}.`
    );
    const state: State = {
      accountId: options.expectedAccountId,
      region: options.region,
      projectName: options.projectName,
      stage: STAGE,
      stackName,
      owner: options.owner,
      awsAccountName
    };
    await writeState(options, state);
    const values = { initial: `initial-${run}`, updated: `updated-${run}` };

    // A rejected preflight above authorizes no cleanup; from here on, cleanup always runs.
    deployAttempted = true;
    const first = await runStackCommand({
      options,
      command: 'deploy',
      awsAccountName,
      value: values.initial,
      invocationId: `alias-canary-1-${run}`
    });
    const stack = await describeStack(clients.cloudFormation, stackName);
    assert(stack, `${stackName} does not exist after the first deploy.`);
    assertOwned(stack, options);
    const resources = await readStackResources(clients, stackName);
    const functionName = resources.find(
      ({ LogicalResourceId }) => LogicalResourceId === cfLogicalNames.lambda(FUNCTION)
    )?.PhysicalResourceId;
    assert(functionName, `The stack has no ${cfLogicalNames.lambda(FUNCTION)} function.`);
    Object.assign(state, { stackId: stack.StackId, ...describeOwnedResources(resources) });
    await writeState(options, state);
    report.resources = resources.map(({ LogicalResourceId, ResourceType }) => `${LogicalResourceId} ${ResourceType}`);
    report.deploymentBucket = state.deploymentBucket;

    const readStep = async (value: string, cli: Awaited<ReturnType<typeof runStackCommand>>) => {
      const invocation = await invokeAlias(clients, functionName, value);
      const { body, template, publisher } = await readDeployedTemplate(clients, stackName);
      return {
        value,
        cli,
        invocation,
        ...(await readVersions(clients, functionName)),
        templateSha256: sha256(body),
        template,
        publisher
      };
    };
    const describeStep = ({ template: _template, ...step }: Awaited<ReturnType<typeof readStep>>) => step;

    const initial = await readStep(values.initial, first);
    assert(initial.aliasVersion === initial.invocation.version, 'The alias and the version that answered differ.');
    report.initial = describeStep(initial);
    await writeReport();

    const second = await runStackCommand({
      options,
      command: 'deploy',
      awsAccountName,
      value: values.updated,
      invocationId: `alias-canary-2-${run}`
    });
    const updated = await readStep(values.updated, second);
    const newVersions = updated.versions.filter((version) => !initial.versions.includes(version));
    const { versionedConfiguration: before, ...publisherBefore } = initial.publisher;
    const { versionedConfiguration: after, ...publisherAfter } = updated.publisher;
    report.configurationChange = {
      ...describeStep(updated),
      newVersions,
      publisherPropertiesOtherThanVersionedConfigurationUnchanged:
        JSON.stringify(publisherBefore) === JSON.stringify(publisherAfter),
      versionedConfigurationChanged: JSON.stringify(before) !== JSON.stringify(after)
    };
    await writeReport();
    assert(newVersions.length === 1, `Expected one new version, found ${newVersions.join(', ') || 'none'}.`);
    assert(
      updated.aliasVersion === newVersions[0],
      `The alias points at ${updated.aliasVersion}, not ${newVersions[0]}.`
    );
    assert(updated.invocation.version === newVersions[0], 'The new value was not served by the new version.');
    assert(
      JSON.stringify(publisherBefore) === JSON.stringify(publisherAfter),
      'A publisher property other than versionedConfiguration changed with the environment value.'
    );
    assert(JSON.stringify(before) !== JSON.stringify(after), 'versionedConfiguration did not change.');

    const third = await runStackCommand({
      options,
      command: 'deploy',
      awsAccountName,
      value: values.updated,
      invocationId: `alias-canary-3-${run}`
    });
    const unchanged = await readStep(values.updated, third);
    const changedPaths = differingPaths(updated.template, unchanged.template);
    report.unchangedRedeploy = {
      ...describeStep(unchanged),
      templateByteIdentical: unchanged.templateSha256 === updated.templateSha256,
      changedTemplatePaths: changedPaths
    };
    await writeReport();
    assert(
      JSON.stringify(unchanged.versions) === JSON.stringify(updated.versions),
      'The unchanged redeploy published a version.'
    );
    assert(unchanged.aliasVersion === updated.aliasVersion, 'The unchanged redeploy moved the alias.');
    assert(unchanged.invocation.version === updated.invocation.version, 'Another version answered after the redeploy.');
    assert(
      JSON.stringify(unchanged.publisher) === JSON.stringify(updated.publisher),
      'The unchanged redeploy changed the publisher properties.'
    );
    assert(
      !changedPaths.some((path) => path.startsWith('Resources')),
      `The unchanged redeploy changed resources: ${changedPaths.join(', ')}.`
    );
  } catch (error) {
    bodyError = error;
  } finally {
    if (!cleanupOnly && deployAttempted) {
      try {
        report.cleanup = await cleanup(clients, options, stackName);
      } catch (error) {
        cleanupError = error;
        report.cleanup = { failed: String(error), recoveryCommand: cleanupCommand(options) };
      }
    }
    await Promise.all(
      invocationIds.map((invocationId) =>
        rm(join(CLI_DIRECTORY, '.stacktape', invocationId), { recursive: true, force: true })
      )
    );
    report.finishedAt = new Date().toISOString();
    report.result = bodyError || cleanupError ? 'failed' : 'passed';
    if (bodyError) report.error = String(bodyError);
    await writeReport();
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    for (const client of Object.values(clients)) client.destroy();
  }

  if (cleanupError) {
    console.error(`Cleanup did not finish. Keep ${options.stateFile} and run:\n${cleanupCommand(options)}`);
  }
  if (bodyError && cleanupError)
    throw new AggregateError([bodyError, cleanupError], `The canary and its cleanup failed.`);
  if (bodyError) throw bodyError;
  if (cleanupError) throw cleanupError;
  console.info(`Alias publication canary passed for ${stackName}, and its deletion was verified.`);
};

if (import.meta.main) {
  runAliasPublicationCanary({ cleanupOnly: process.argv.includes('--cleanup-only') }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
