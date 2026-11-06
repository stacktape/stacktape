/**
 * Real-AWS proof of release commands: the command runs once, in the deployed image, inside the VPC, before any workload
 * gets the new code, and a failure stops the deploy with the old code still serving.
 *
 * Two stacks, each deployed through the source-built CLI:
 *
 * - `database` (`_test-stacks/release-command`): a web service whose health check needs the table the command creates,
 *   a worker, and a private Postgres database. The app reports how often the command ran and which release serves, so
 *   every scenario asserts both from the outside.
 * - `variants` (`_test-stacks/release-command-variants`): EC2 capacity from zero, a multi-container workload with a side
 *   container, a `js-bundle` service whose command needs a tool from `devDependencies`, and the order of several commands.
 *
 * `STP_AWS_RELEASE_CANARY_ONLY=database|variants` runs one stack. `STP_AWS_RELEASE_CANARY_LONG=1` adds the wait past the
 * 15-minute Lambda limit.
 *
 * Guardrails (docs/testing/live-aws.md): an explicit opt-in; STS must resolve the profile to the expected account, and
 * the CLI deploys through the single active Stacktape connection to that same account; new `v4rlscanary-` projects
 * carrying the run's owner tag; recovery state written before the first deploy; cleanup after success or failure,
 * verified with AWS; one exact `--cleanup-only` command when cleanup does not finish.
 *
 *   STP_AWS_RELEASE_CANARY_DEPLOY=1 STP_AWS_RELEASE_CANARY_EXPECTED_ACCOUNT_ID=<12 digits>
 *   STP_AWS_RELEASE_CANARY_PROFILE=<name> STP_AWS_RELEASE_CANARY_OWNER=<run id>
 *   STP_AWS_RELEASE_CANARY_STATE_FILE=<absolute path> [STP_AWS_RELEASE_CANARY_REPORT=<absolute path>]
 *   pnpm --filter @stacktape/cli run test:real-aws-release-command-canary [-- --cleanup-only]
 */
import {
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStackResourcesCommand,
  DescribeStacksCommand,
  waitUntilStackDeleteComplete,
  type Stack
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, DeleteLogGroupCommand, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DescribeRepositoriesCommand, ECRClient } from '@aws-sdk/client-ecr';
import { DescribeTasksCommand, ECSClient, ListTasksCommand, type Task } from '@aws-sdk/client-ecs';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { randomBytes } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';

type Environment = Record<string, string | undefined>;
const PREFIX = 'STP_AWS_RELEASE_CANARY_';
const STAGE = 'canary';
const OWNER_TAG = 'stacktape-canary-owner';
const CLI_DIRECTORY = join(import.meta.dir, '..', '..');
const REPO_ROOT = join(CLI_DIRECTORY, '..', '..');
const COMMAND_TIMEOUT_MS = 45 * 60 * 1000;

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

type Options = {
  expectedAccountId: string;
  profile: string;
  region: string;
  projectPrefix: string;
  owner: string;
  stateFile: string;
  reportFile?: string;
  only?: 'database' | 'variants';
  long: boolean;
};

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
  const region = env[`${PREFIX}REGION`]?.trim() || 'eu-central-1';
  assert(/^[a-z]{2}(?:-[a-z0-9]+)+-\d+$/.test(region), `${PREFIX}REGION must be an AWS region.`);
  const projectPrefix =
    env[`${PREFIX}PROJECT_PREFIX`]?.trim() || `v4rlscanary-${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
  assert(
    projectPrefix.length <= 32 && /^v4rlscanary-[a-z0-9]+$/.test(projectPrefix),
    `${PREFIX}PROJECT_PREFIX must start with v4rlscanary- and contain only lowercase letters and digits.`
  );
  const owner = env[`${PREFIX}OWNER`]?.trim() ?? '';
  assert(/^[\w.:-]{1,128}$/.test(owner), `${PREFIX}OWNER must identify this run.`);
  const stateFile = env[`${PREFIX}STATE_FILE`]?.trim() ?? '';
  assert(isAbsolute(stateFile), `${PREFIX}STATE_FILE must be an absolute path.`);
  const reportFile = env[`${PREFIX}REPORT`]?.trim();
  assert(!reportFile || isAbsolute(reportFile), `${PREFIX}REPORT must be an absolute path.`);
  const only = env[`${PREFIX}ONLY`]?.trim();
  assert(!only || only === 'database' || only === 'variants', `${PREFIX}ONLY must be database or variants.`);
  return {
    expectedAccountId,
    profile,
    region,
    projectPrefix,
    owner,
    stateFile,
    ...(reportFile && { reportFile }),
    ...(only ? { only: only as 'database' | 'variants' } : {}),
    long: env[`${PREFIX}LONG`] === '1'
  };
};

type StackState = {
  stackName: string;
  projectName: string;
  workDirectory: string;
  stackId?: string;
  deploymentBucket?: string;
  ecrRepository?: string;
  logGroupNames?: string[];
};
type State = {
  accountId: string;
  region: string;
  owner: string;
  awsAccountName: string;
  stacks: StackState[];
  cleanupVerifiedAt?: string;
};

const writeState = (options: Options, state: State) =>
  writeFile(options.stateFile, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });

let activeChildren = new Set<ReturnType<typeof Bun.spawn>>();
const stopActiveChildren = (signal: NodeJS.Signals = 'SIGTERM') => {
  for (const child of activeChildren) {
    try {
      process.kill(-child.pid, signal);
    } catch {
      child.kill(signal);
    }
  }
};

const cliEnvironment = (options: Options, invocationId: string): Environment => {
  const env: Environment = {
    ...process.env,
    AWS_PROFILE: options.profile,
    AWS_DEFAULT_PROFILE: options.profile,
    AWS_SDK_LOAD_CONFIG: '1',
    AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'true',
    STP_DISABLE_TELEMETRY: '1',
    STP_INVOCATION_ID: invocationId
  };
  for (const name of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'STACKTAPE_API_KEY']) {
    delete env[name];
  }
  delete env.SKIP_LOADING_ENV;
  return env;
};

type CliResult = { exitCode: number; output: string; seconds: number };

/** One source-built CLI command. It returns what happened; the scenario decides what should have. */
const startCli = (options: Options, args: string[], invocationId: string) => {
  const child = Bun.spawn({
    cmd: ['pnpm', 'dev:cli', ...args, '--agent'],
    cwd: REPO_ROOT,
    env: cliEnvironment(options, invocationId),
    stdout: 'pipe',
    stderr: 'pipe',
    detached: true
  });
  activeChildren.add(child);
  const startedAt = Date.now();
  const timer = setTimeout(() => stopActiveChildren('SIGKILL'), COMMAND_TIMEOUT_MS);
  const finished: Promise<CliResult> = Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]).then(async ([stdout, stderr, exitCode]) => {
    clearTimeout(timer);
    activeChildren.delete(child);
    await rm(join(CLI_DIRECTORY, '.stacktape', invocationId), { recursive: true, force: true });
    return { exitCode, output: `${stdout}\n${stderr}`, seconds: (Date.now() - startedAt) / 1000 };
  });
  return { child, finished };
};

const resolveAwsAccountName = async (options: Options, invocationId: string) => {
  const { output, exitCode } = await startCli(options, ['info:whoami'], invocationId).finished;
  assert(exitCode === 0, `info:whoami failed: ${output.slice(-500)}`);
  for (const line of output.split(/\r?\n/).reverse()) {
    if (!line.trim().startsWith('{')) continue;
    const record = JSON.parse(line) as {
      type?: string;
      data?: { result?: { connectedAwsAccounts?: { awsAccountId?: string; state?: string; name?: string }[] } };
    };
    if (record.type !== 'result') continue;
    const matching = (record.data?.result?.connectedAwsAccounts ?? []).filter(
      ({ awsAccountId, state }) => awsAccountId === options.expectedAccountId && state === 'ACTIVE'
    );
    assert(matching.length === 1 && matching[0]!.name, `Expected one active connection, found ${matching.length}.`);
    return matching[0]!.name!;
  }
  throw new Error('info:whoami returned no result.');
};

const createClients = ({ profile, region }: Options) => {
  const config = { credentials: fromIni({ profile }), region, maxAttempts: 6, ignoreConfiguredEndpointUrls: true };
  return {
    cloudFormation: new CloudFormationClient(config),
    ecr: new ECRClient(config),
    ecs: new ECSClient(config),
    logs: new CloudWatchLogsClient(config),
    s3: new S3Client(config),
    sts: new STSClient(config)
  };
};
type Clients = ReturnType<typeof createClients>;

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

const stackResources = async (clients: Clients, stackName: string) =>
  (await clients.cloudFormation.send(new DescribeStackResourcesCommand({ StackName: stackName }))).StackResources ?? [];

/** One stack the scenarios drive: its config directory, its deploys, and what it looks like from outside. */
class CanaryStack {
  options: Options;
  clients: Clients;
  state: State;
  stack: StackState;
  awsAccountName: string;
  invocations = 0;

  constructor(options: Options, clients: Clients, state: State, stack: StackState) {
    this.options = options;
    this.clients = clients;
    this.state = state;
    this.stack = stack;
    this.awsAccountName = state.awsAccountName;
  }

  commandArgs(command: 'deploy' | 'delete' | 'rollback', extra: string[] = []) {
    return [
      command,
      '--configPath',
      join(this.stack.workDirectory, 'stacktape.yml'),
      '--currentWorkingDirectory',
      this.stack.workDirectory,
      '--projectName',
      this.stack.projectName,
      '--stage',
      STAGE,
      '--region',
      this.options.region,
      '--profile',
      this.options.profile,
      '--awsAccount',
      this.awsAccountName,
      ...(command === 'rollback' ? [] : ['--autoConfirmOperation']),
      ...extra
    ];
  }

  start(command: 'deploy' | 'delete' | 'rollback', extra: string[] = []) {
    this.invocations += 1;
    return startCli(
      this.options,
      this.commandArgs(command, extra),
      `${this.stack.projectName}-${command}-${this.invocations}`
    );
  }

  async deploy(extra: string[] = []) {
    return this.start('deploy', extra).finished;
  }

  async deployOk(label: string, extra: string[] = []) {
    const result = await this.deploy(extra);
    assert(result.exitCode === 0, `${label}: the deploy failed:\n${result.output.slice(-3000)}`);
    return result;
  }

  async deployFails(label: string, expectedInOutput: RegExp, extra: string[] = []) {
    const result = await this.deploy(extra);
    assert(result.exitCode !== 0, `${label}: the deploy should have failed.`);
    assert(expectedInOutput.test(result.output), `${label}: expected ${expectedInOutput}:\n${result.output.slice(-3000)}`);
    return result;
  }

  async write(path: string, content: string) {
    await writeFile(join(this.stack.workDirectory, path), content);
  }

  async remove(path: string) {
    await rm(join(this.stack.workDirectory, path), { force: true });
  }

  async editConfig(edit: (config: string) => string) {
    const path = join(this.stack.workDirectory, 'stacktape.yml');
    const before = await readFile(path, 'utf8');
    const after = edit(before);
    assert(after !== before, 'The config edit changed nothing.');
    await writeFile(path, after);
  }

  async setRelease(file: string, release: string) {
    const path = join(this.stack.workDirectory, file);
    const source = await readFile(path, 'utf8');
    await writeFile(path, source.replace(/const RELEASE = '[^']*';/, `const RELEASE = '${release}';`));
  }

  async url() {
    const resources = await stackResources(this.clients, this.stack.stackName);
    const api = resources.find(({ ResourceType }) => ResourceType === 'AWS::ApiGatewayV2::Api');
    assert(api?.PhysicalResourceId, 'The stack has no HTTP API.');
    return `https://${api.PhysicalResourceId}.execute-api.${this.options.region}.amazonaws.com`;
  }

  /** What the app reports. Retries, because a public URL can answer with an error right after a rollout. */
  async app(): Promise<{ release: string; runs: number; migrations: string[] }> {
    const url = await this.url();
    let lastError: unknown;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (response.ok) return (await response.json()) as { release: string; runs: number; migrations: string[] };
        lastError = `${response.status} ${await response.text()}`;
      } catch (error) {
        lastError = error;
      }
      await sleep(3000);
    }
    throw new Error(`The app does not answer: ${String(lastError)}`);
  }

  async expectApp(label: string, expected: { release?: string; runs?: number; migrations?: string[] }) {
    const app = await this.app();
    if (expected.release !== undefined) {
      assert(app.release === expected.release, `${label}: release ${app.release}, expected ${expected.release}.`);
    }
    if (expected.runs !== undefined) {
      assert(app.runs === expected.runs, `${label}: the command ran ${app.runs} times, expected ${expected.runs}.`);
    }
    if (expected.migrations !== undefined) {
      assert(
        JSON.stringify(app.migrations) === JSON.stringify(expected.migrations),
        `${label}: migrations ${app.migrations.join(', ')}, expected ${expected.migrations.join(', ')}.`
      );
    }
    return app;
  }

  releaseFamily(workload: string) {
    return `${this.stack.stackName}-${workload}-release`;
  }

  async clusterOf(workload: string) {
    return `${this.stack.stackName}-${workload}-cluster`;
  }

  /** The release tasks of a workload, newest first. ECS keeps stopped tasks for about an hour. */
  async releaseTasks(workload: string): Promise<Task[]> {
    const cluster = await this.clusterOf(workload);
    const family = this.releaseFamily(workload);
    const arns = (
      await Promise.all(
        (['RUNNING', 'STOPPED'] as const).map(
          async (desiredStatus) =>
            (await this.clients.ecs.send(new ListTasksCommand({ cluster, family, desiredStatus }))).taskArns ?? []
        )
      )
    ).flat();
    if (!arns.length) return [];
    const { tasks = [] } = await this.clients.ecs.send(new DescribeTasksCommand({ cluster, tasks: arns.slice(0, 100) }));
    return tasks.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async stackStatus() {
    return (await describeStack(this.clients.cloudFormation, this.stack.stackName))?.StackStatus;
  }

  async recordOwnedResources() {
    const stack = await describeStack(this.clients.cloudFormation, this.stack.stackName);
    if (!stack?.StackId) return;
    const resources = await stackResources(this.clients, this.stack.stackName);
    Object.assign(this.stack, {
      stackId: stack.StackId,
      deploymentBucket:
        resources.find(({ LogicalResourceId }) => LogicalResourceId === 'StacktapeDeploymentBucket')
          ?.PhysicalResourceId ?? this.stack.deploymentBucket,
      logGroupNames: resources
        .filter(({ ResourceType }) => ResourceType === 'AWS::Logs::LogGroup')
        .map(({ PhysicalResourceId }) => PhysicalResourceId as string)
    });
    await writeState(this.options, this.state);
  }
}

type Scenario = { name: string; seconds?: number; details?: Record<string, unknown> };

const usesCloudFormation = (output: string) => /Deploying through CloudFormation|Deploying infrastructure resources/.test(output);
const whyCloudFormation = (output: string) =>
  output.match(/Deploying through CloudFormation[^"\n]*/)?.[0] ?? 'no reason printed';

const runDatabaseScenarios = async (stack: CanaryStack, record: (scenario: Scenario) => Promise<void>, long: boolean) => {
  // The health check needs the table, so this works only when the command runs before the service.
  const first = await stack.deployOk('first deploy');
  await stack.recordOwnedResources();
  assert(first.output.includes('release-command-finished'), `first deploy: the output has no command logs:\n${first.output.slice(-2000)}`);
  await stack.expectApp('first deploy', { release: 'initial', runs: 1, migrations: ['001-items.sql'] });
  const [firstTask] = await stack.releaseTasks('web');
  assert(firstTask?.containers?.[0]?.exitCode === 0, 'first deploy: no release task exited with 0.');
  await record({ name: 'first deploy runs before the service', seconds: first.seconds });

  await stack.setRelease('server.mjs', 'r2');
  const codeOnly = await stack.deployOk('code-only deploy');
  assert(!usesCloudFormation(codeOnly.output), `code-only deploy used CloudFormation: ${whyCloudFormation(codeOnly.output)}`);
  await stack.expectApp('code-only deploy', { release: 'r2', runs: 1 });
  await record({ name: 'unchanged runWhenChanged skips the command on the fast path', seconds: codeOnly.seconds });

  await stack.setRelease('server.mjs', 'r3');
  await stack.write('migrations/002-more.sql', 'ALTER TABLE items ADD COLUMN note text;\n');
  const withMigration = await stack.deployOk('deploy with a migration');
  assert(
    !usesCloudFormation(withMigration.output),
    `a deploy with a migration should stay on the fast path: ${whyCloudFormation(withMigration.output)}`
  );
  assert(withMigration.output.includes('applying 002-more.sql'), 'the output has no command logs.');
  await stack.expectApp('deploy with a migration', {
    release: 'r3',
    runs: 2,
    migrations: ['001-items.sql', '002-more.sql']
  });
  await record({ name: 'a new migration runs on the fast path', seconds: withMigration.seconds });

  await stack.setRelease('server.mjs', 'r4-must-not-serve');
  await stack.write('migrations/003-bad.sql', 'THIS IS NOT SQL;\n');
  const failedFast = await stack.deployFails('failing command on the fast path', /exit code 1/);
  await stack.expectApp('failing command on the fast path', { release: 'r3', runs: 3 });
  await record({ name: 'a failing command stops a fast deployment, old code serves', seconds: failedFast.seconds });

  await stack.remove('migrations/003-bad.sql');
  await stack.setRelease('server.mjs', 'r5');
  await stack.deployOk('fixed fast deploy');
  await stack.expectApp('fixed fast deploy', { release: 'r5', runs: 3 });
  await record({ name: 'fixing the migration folder returns to the last successful key' });

  await stack.editConfig((config) =>
    config.replace('      connectTo:\n        - database\n      environment:\n', '      connectTo:\n        - database\n      environment:\n        - name: FEATURE\n          value: one\n')
  );
  await stack.write('migrations/003-bad.sql', 'THIS IS NOT SQL;\n');
  const failedFull = await stack.deployFails('failing command through CloudFormation', /exit code 1/);
  assert(usesCloudFormation(failedFull.output), 'an environment change should use CloudFormation.');
  await stack.expectApp('failing command through CloudFormation', { release: 'r5', runs: 4 });
  // The CLI reports the failure as soon as it happens, while CloudFormation still rolls back.
  let status = await stack.stackStatus();
  for (let attempt = 0; attempt < 120 && status?.includes('IN_PROGRESS'); attempt += 1) {
    await sleep(5000);
    status = await stack.stackStatus();
  }
  assert(status === 'UPDATE_ROLLBACK_COMPLETE', `the stack should have rolled back, it is ${status}.`);
  // The app's count is read after the rollback, which must not run the command again.
  await stack.expectApp('rollback of a failing command', { release: 'r5', runs: 4 });
  await record({
    name: 'a failing command through CloudFormation rolls back without running again',
    seconds: failedFull.seconds
  });

  await stack.remove('migrations/003-bad.sql');
  const envChanged = await stack.deployOk('environment change');
  assert(usesCloudFormation(envChanged.output), 'an environment change should use CloudFormation.');
  await stack.expectApp('environment change', { release: 'r5', runs: 5 });
  await record({ name: 'a changed environment runs the command', seconds: envChanged.seconds });

  await stack.write('migrations/003-good.sql', 'ALTER TABLE items ADD COLUMN extra text;\n');
  await stack.editConfig(
    (config) =>
      `${config}
cloudformationResources:
  FailsAfterTheCommand:
    Type: AWS::SNS::Topic
    DependsOn: WebReleaseCommandCustomResource
    Properties:
      TopicName: not a valid topic name
`
  );
  await stack.deployFails('failure after the command', /FailsAfterTheCommand/);
  await stack.expectApp('failure after the command', { runs: 6 });
  await record({ name: 'a failure after the command does not rerun it during the rollback' });
  await stack.editConfig((config) => config.slice(0, config.indexOf('\ncloudformationResources:')) + '\n');
  await stack.deployOk('retry after a later failure');
  await stack.expectApp('retry after a later failure', { runs: 7 });
  await record({ name: 'a retry after a later failure runs the command again' });

  await stack.setRelease('server.mjs', 'r6');
  await stack.deployOk('deploy before a rollback');
  const rollback = await stack.start('rollback', ['--rollbackSteps', '1']).finished;
  if (rollback.exitCode === 0) {
    await stack.expectApp('stacktape rollback', { runs: 7 });
    await record({ name: 'stacktape rollback does not run the command', seconds: rollback.seconds });
    await stack.deployOk('deploy after a rollback');
  } else {
    throw new Error(`stacktape rollback failed:\n${rollback.output.slice(-2000)}`);
  }

  await stack.setRelease('server.mjs', 'r7');
  const [one, two] = await Promise.all([stack.deploy(), stack.deploy()]);
  const failed = [one, two].filter(({ exitCode }) => exitCode !== 0);
  assert(failed.length === 1, `of two concurrent deploys, ${failed.length} failed.`);
  assert(/Another operation/.test(failed[0]!.output), `the second deploy failed for another reason:\n${failed[0]!.output.slice(-1500)}`);
  await record({ name: 'of two concurrent deploys, the second is refused' });

  await stack.write('migrations/004-slow.sql', "SELECT pg_sleep(170);\nALTER TABLE items ADD COLUMN slow text;\n");
  await stack.setRelease('server.mjs', 'r8');
  const killed = stack.start('deploy');
  let running: Task | undefined;
  for (let attempt = 0; attempt < 120 && !running; attempt += 1) {
    await sleep(2000);
    running = (await stack.releaseTasks('web')).find(({ lastStatus }) => lastStatus === 'RUNNING');
  }
  assert(running, 'the slow command never started.');
  process.kill(-killed.child.pid, 'SIGKILL');
  await killed.finished;
  await stack.deployFails('deploy right after a killed deploy', /Another operation/);
  await sleep(125_000);
  await stack.deployFails('deploy after the lock expired, command still running', /still running/);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (!(await stack.releaseTasks('web')).some(({ lastStatus }) => lastStatus !== 'STOPPED')) break;
    await sleep(5000);
  }
  await stack.deployOk('deploy after the killed command finished');
  await stack.expectApp('deploy after the killed command finished', { release: 'r8' });
  await record({ name: 'a killed deploy holds the lock for its lease, and its task blocks a second one' });

  await stack.editConfig((config) => config.replace('        command: node migrate.mjs\n', '        command: node migrate.mjs\n        timeout: 20\n'));
  await stack.write('migrations/005-too-slow.sql', 'SELECT pg_sleep(600);\n');
  await stack.deployFails('command past its timeout', /timeout/);
  await sleep(40_000);
  assert(
    !(await stack.releaseTasks('web')).some(({ lastStatus }) => lastStatus === 'RUNNING'),
    'the task should have been stopped at the timeout.'
  );
  await stack.remove('migrations/005-too-slow.sql');
  await stack.editConfig((config) => config.replace('        timeout: 20\n', ''));
  await stack.deployOk('deploy after a timeout');
  await record({ name: 'a command past its timeout is stopped and fails the deploy' });

  await stack.editConfig((config) =>
    config.replace('      releaseCommand:\n        command: node migrate.mjs\n        runWhenChanged:\n          - migrations\n', '')
  );
  const removed = await stack.deployOk('removing the setting');
  const runsBefore = (await stack.app()).runs;
  await record({ name: 'removing the setting works', seconds: removed.seconds });
  await stack.editConfig((config) =>
    config.replace('      internalHealthCheck:\n', '      logging:\n        disabled: true\n      releaseCommand: node migrate.mjs\n      internalHealthCheck:\n')
  );
  const added = await stack.deployOk('adding the setting back, with logging off');
  assert(added.output.includes('release-command-finished'), 'command logs should stay on when service logging is off.');
  await stack.expectApp('adding the setting back', { runs: runsBefore + 1 });
  await record({ name: 'adding the setting runs the command, with its logs on when logging is off' });

  const skipped = await stack.deployOk('--skipReleaseCommand', ['--skipReleaseCommand']);
  assert(!skipped.output.includes('release-command-started'), 'a skipped command should not run.');
  await record({ name: '--skipReleaseCommand does not run the command' });

  if (long) {
    await stack.editConfig((config) => config.replace('        - name: FEATURE\n          value: one\n', '        - name: FEATURE\n          value: two\n'));
    await stack.write('migrations/006-very-slow.sql', 'SELECT pg_sleep(1000);\n');
    const chained = await stack.deployOk('a wait past the Lambda limit');
    assert(chained.seconds > 1000, 'the command should have taken over 1000 s.');
    await record({ name: 'CloudFormation waits past the 15-minute Lambda limit', seconds: chained.seconds });
  }
};

const runVariantScenarios = async (stack: CanaryStack, record: (scenario: Scenario) => Promise<void>) => {
  const first = await stack.deployOk('variants first deploy');
  await stack.recordOwnedResources();
  const outputOrder = ['variant-ec2', 'variant-multi', 'variant-bundle'].map((marker) => first.output.indexOf(marker));
  assert(outputOrder.every((index) => index >= 0), `some command logs are missing:\n${first.output.slice(-3000)}`);
  await record({ name: 'EC2 from zero capacity, a side container and a js-bundle release image all run', seconds: first.seconds });

  const taskTimes = await Promise.all(
    ['ec2app', 'multi', 'bundle'].map(async (workload) => {
      const [task] = await stack.releaseTasks(workload);
      assert(task?.containers?.some(({ exitCode }) => exitCode === 0), `${workload}: no release task exited with 0.`);
      return { workload, startedAt: task!.startedAt?.getTime() ?? 0, stoppedAt: task!.stoppedAt?.getTime() ?? 0 };
    })
  );
  for (let index = 1; index < taskTimes.length; index += 1) {
    assert(
      taskTimes[index]!.startedAt >= taskTimes[index - 1]!.startedAt,
      `${taskTimes[index]!.workload} started before ${taskTimes[index - 1]!.workload}.`
    );
  }
  await record({ name: 'several commands run in config order', details: { taskTimes } });

  await stack.setRelease('bundle/server.ts', 'r2');
  const bundleCodeOnly = await stack.deployOk('js-bundle code-only deploy');
  assert(
    !usesCloudFormation(bundleCodeOnly.output),
    `a js-bundle code change should stay on the fast path: ${whyCloudFormation(bundleCodeOnly.output)}`
  );
  assert(!bundleCodeOnly.output.includes('variant-bundle'), 'an unchanged folder should not run the command.');
  await record({ name: 'a js-bundle code change keeps the release image and skips the command', seconds: bundleCodeOnly.seconds });

  await stack.write('bundle-migrations/002.txt', 'second\n');
  const bundleMigration = await stack.deployOk('js-bundle migration');
  assert(
    !usesCloudFormation(bundleMigration.output),
    `a js-bundle migration should stay on the fast path: ${whyCloudFormation(bundleMigration.output)}`
  );
  assert(bundleMigration.output.includes('variant-bundle'), 'the changed folder should run the command.');
  await record({ name: 'a js-bundle migration builds the release image and runs on the fast path', seconds: bundleMigration.seconds });

  await stack.write('ec2.txt', 'changed\n');
  const ec2Run = await stack.deployOk('EC2 fast run');
  assert(ec2Run.output.includes('variant-ec2'), 'the EC2 command should run on the fast path.');
  await record({ name: 'an EC2 command runs on the fast path', seconds: ec2Run.seconds });
};

const isMissing = (error: unknown, names: string[]) =>
  error instanceof Error && (names.includes(error.name) || /not ?found|does not exist/i.test(error.message));

const cleanupStack = async (clients: Clients, options: Options, state: State, stack: StackState) => {
  const canary = new CanaryStack(options, clients, state, stack);
  const existing = await describeStack(clients.cloudFormation, stack.stackName);
  if (existing) {
    const owner = existing.Tags?.find(({ Key }) => Key === OWNER_TAG)?.Value;
    assert(owner === options.owner, `Refusing to touch ${stack.stackName}: its owner tag is ${owner ?? 'missing'}.`);
    await canary.recordOwnedResources();
    const result = await canary.start('delete').finished;
    if (result.exitCode !== 0) {
      console.warn(`Stacktape delete failed; deleting the owned stack directly. ${result.output.slice(-400)}`);
      await clients.cloudFormation.send(new DeleteStackCommand({ StackName: existing.StackId }));
    }
    const waited = await waitUntilStackDeleteComplete(
      { client: clients.cloudFormation, maxWaitTime: 40 * 60, minDelay: 5, maxDelay: 20 },
      { StackName: existing.StackId }
    );
    assert(waited.state === 'SUCCESS', `CloudFormation did not confirm deletion of ${stack.stackName}: ${waited.state}.`);
  }
  assert(!(await describeStack(clients.cloudFormation, stack.stackName)), `${stack.stackName} still exists.`);
  if (stack.deploymentBucket) {
    const gone = await clients.s3.send(new HeadBucketCommand({ Bucket: stack.deploymentBucket })).then(
      () => false,
      (error: unknown) => isMissing(error, ['NotFound', 'NoSuchBucket'])
    );
    assert(gone, `The deployment bucket ${stack.deploymentBucket} still exists.`);
  }
  if (stack.ecrRepository) {
    const gone = await clients.ecr.send(new DescribeRepositoriesCommand({ repositoryNames: [stack.ecrRepository] })).then(
      () => false,
      (error: unknown) => isMissing(error, ['RepositoryNotFoundException'])
    );
    assert(gone, `The image repository ${stack.ecrRepository} still exists.`);
  }
  for (const logGroupName of stack.logGroupNames ?? []) {
    const existingGroups = await clients.logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName }));
    if (existingGroups.logGroups?.some((group) => group.logGroupName === logGroupName)) {
      await clients.logs.send(new DeleteLogGroupCommand({ logGroupName }));
    }
  }
  await rm(stack.workDirectory, { recursive: true, force: true });
};

const cleanupAll = async (clients: Clients, options: Options, state: State) => {
  for (const stack of state.stacks) await cleanupStack(clients, options, state, stack);
  await writeState(options, { ...state, cleanupVerifiedAt: new Date().toISOString() });
};

export const runReleaseCommandCanary = async ({ cleanupOnly = false }: { cleanupOnly?: boolean } = {}) => {
  const options = resolveOptions();
  const clients = createClients(options);
  const report: Record<string, unknown> & { scenarios: Scenario[] } = {
    kind: 'stacktape-release-command-canary',
    region: options.region,
    owner: options.owner,
    scenarios: []
  };
  const writeReport = () =>
    options.reportFile ? writeFile(options.reportFile, `${JSON.stringify(report, null, 2)}\n`) : Promise.resolve();
  const record = async (scenario: Scenario) => {
    report.scenarios.push(scenario);
    console.info(`PASS ${scenario.name}${scenario.seconds === undefined ? '' : ` (${scenario.seconds.toFixed(1)} s)`}`);
    await writeReport();
  };
  const identity = await clients.sts.send(new GetCallerIdentityCommand({}));
  assert(
    identity.Account === options.expectedAccountId,
    `AWS credentials resolved to account ${identity.Account}, not the expected ${options.expectedAccountId}.`
  );
  if (cleanupOnly) {
    const state = JSON.parse(await readFile(options.stateFile, 'utf8')) as State;
    assert(state.accountId === options.expectedAccountId, 'The state file belongs to another AWS account.');
    assert(state.owner === options.owner, 'The state file belongs to another run.');
    await cleanupAll(clients, options, state);
    return;
  }

  const onSignal = (signal: NodeJS.Signals) => stopActiveChildren(signal);
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  const awsAccountName = await resolveAwsAccountName(options, `${options.projectPrefix}-whoami`);
  const prepare = async (name: 'database' | 'variants', fixture: string): Promise<StackState> => {
    const projectName = `${options.projectPrefix}-${name.slice(0, 2)}`;
    const stackName = `${projectName}-${STAGE}`;
    assert(!(await describeStack(clients.cloudFormation, stackName)), `Refusing to mutate existing stack ${stackName}.`);
    const workDirectory = join(tmpdir(), `stacktape-release-canary-${projectName}`);
    await rm(workDirectory, { recursive: true, force: true });
    await mkdir(workDirectory, { recursive: true });
    await cp(join(CLI_DIRECTORY, '_test-stacks', fixture), workDirectory, { recursive: true, force: true });
    const configPath = join(workDirectory, 'stacktape.yml');
    const config = await readFile(configPath, 'utf8');
    await writeFile(configPath, config.replace(/(name: stacktape-canary-owner\n\s+value: )local/, `$1${options.owner}`));
    return { stackName, projectName, workDirectory };
  };
  const stacks: StackState[] = [];
  if (options.only !== 'variants') stacks.push(await prepare('database', 'release-command'));
  if (options.only !== 'database') stacks.push(await prepare('variants', 'release-command-variants'));
  const state: State = {
    accountId: options.expectedAccountId,
    region: options.region,
    owner: options.owner,
    awsAccountName,
    stacks
  };
  await writeState(options, state);

  let bodyError: unknown;
  let cleanupError: unknown;
  try {
    const results = await Promise.allSettled(
      stacks.map((stackState) => {
        const stack = new CanaryStack(options, clients, state, stackState);
        return stackState.projectName.endsWith('-da')
          ? runDatabaseScenarios(stack, record, options.long)
          : runVariantScenarios(stack, record);
      })
    );
    const failures = results.filter((result) => result.status === 'rejected') as PromiseRejectedResult[];
    if (failures.length) throw new Error(failures.map(({ reason }) => String(reason)).join('\n\n'));
  } catch (error) {
    bodyError = error;
  } finally {
    try {
      await cleanupAll(clients, options, state);
      report.cleanup = 'verified';
    } catch (error) {
      cleanupError = error;
    }
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    if (bodyError) report.error = String(bodyError);
    if (cleanupError) report.cleanupError = String(cleanupError);
    await writeReport();
  }
  if (cleanupError) {
    console.error(
      `Cleanup did not finish. Run: ${[
        `${PREFIX}DEPLOY=1`,
        `${PREFIX}EXPECTED_ACCOUNT_ID=${options.expectedAccountId}`,
        `${PREFIX}PROFILE=${options.profile}`,
        `${PREFIX}REGION=${options.region}`,
        `${PREFIX}OWNER=${options.owner}`,
        `${PREFIX}STATE_FILE=${options.stateFile}`,
        'pnpm --filter @stacktape/cli run test:real-aws-release-command-canary -- --cleanup-only'
      ].join(' ')}`
    );
    throw cleanupError;
  }
  if (bodyError) throw bodyError;
};

if (import.meta.main) {
  runReleaseCommandCanary({ cleanupOnly: process.argv.includes('--cleanup-only') }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
