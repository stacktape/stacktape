/**
 * Does the first DynamoDB stream record written right after a start reach its function?
 *
 * One stack owns a table with a stream and two functions that read it: `fromLatest` with `startingPosition: LATEST`
 * and `fromTrimHorizon` with `TRIM_HORIZON`. A DynamoDB stream shard allows two readers, so one write tests both
 * starting positions at once. Each function logs the ids of the records it receives; the canary reads its log group.
 *
 * Right after a start returns, the canary writes one probe item every 10 seconds until the LATEST function has received
 * a probe (or for at most `PROBE_WINDOW_MS`), then waits for the stragglers. A probe the TRIM_HORIZON function receives
 * and the LATEST function never does was lost by LATEST. The canary does this after:
 * 1. a fresh `dev --agent`, which creates the dev stack (and its mappings);
 * 2. a warm `dev --agent` of the same stage, whose stack is unchanged;
 * 3. a plain `deploy` of another stage, which creates the stack.
 * Steps 1 and 2 repeat `RUNS` times (the dev stage is deleted between runs), and step 3 too.
 *
 * The first start in each fresh stack must see every probe arrive at the TRIM_HORIZON function. The LATEST results are
 * recorded, not asserted: they measure how long a new mapping takes to start reading, which AWS does not bound. A fresh
 * dev start must say in its status that both mappings are new (and that the LATEST one skips records); a warm one must
 * not.
 *
 * Timings and the mapping states go to the report file. Recovery state is written before anything is created;
 * `--cleanup-only` resumes it.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { fromIni } from '@aws-sdk/credential-providers';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import {
  CloudFormationClient,
  DescribeStackResourcesCommand,
  DescribeStacksCommand
} from '@aws-sdk/client-cloudformation';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { LambdaClient, ListEventSourceMappingsCommand, ListFunctionsCommand } from '@aws-sdk/client-lambda';
import {
  CloudWatchLogsClient,
  DeleteLogGroupCommand,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand
} from '@aws-sdk/client-cloudwatch-logs';
import { getDevNetworkStackName } from '@stacktape/naming/shared-stacks';

const check: (value: unknown, message: string) => asserts value = (value, message) => {
  if (!value) throw new Error(message);
};
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const PREFIX = 'STP_AWS_STREAM_EVENT_';
const CLI_DIRECTORY = join(import.meta.dir, '..', '..');
const PROBE_INTERVAL_MS = 10_000;
const PROBE_WINDOW_MS = 6 * 60_000;
/** How long a probe may take to arrive once its function's mapping reads the stream. */
const DELIVERY_GRACE_MS = 90_000;

export const resolveStreamEventOptions = (env: Record<string, string | undefined> = process.env) => {
  check(env[`${PREFIX}DEPLOY`] === '1', 'Explicit stream canary opt-in is required.');
  check(
    env[`${PREFIX}CONFIRM_DISPOSABLE`] === 'this-is-a-disposable-test-account',
    'Disposable account confirmation is required.'
  );
  check(env[`${PREFIX}PROFILE`] === 'stacktape-e2e', 'Only the stacktape-e2e profile is accepted.');
  const accountId = env[`${PREFIX}EXPECTED_ACCOUNT_ID`];
  check(accountId && /^\d{12}$/.test(accountId), 'An exact 12-digit expected account is required.');
  const stateFile = env[`${PREFIX}STATE_FILE`];
  check(stateFile && isAbsolute(stateFile), 'An absolute recovery state file is required.');
  const owner = env[`${PREFIX}OWNER`];
  check(owner && /^[a-z0-9]{1,12}$/.test(owner), 'A unique owner of 1-12 lowercase letters or digits is required.');
  const reportFile = env[`${PREFIX}REPORT`];
  check(!reportFile || isAbsolute(reportFile), 'The report file must be an absolute path.');
  check(
    !Object.keys(env).some((key) => key === 'AWS_ENDPOINT_URL' || key.startsWith('AWS_ENDPOINT_URL_')),
    'Endpoint overrides are forbidden.'
  );
  const region = env[`${PREFIX}REGION`] ?? 'eu-west-1';
  check(/^[a-z]{2}(-[a-z]+)+-\d$/.test(region), 'The region must be an AWS region name.');
  // The fixture's functions use no local resource, so no dev network is expected; a named one isolates the run anyway.
  const networkSuffix = env[`${PREFIX}NETWORK_SUFFIX`] ?? owner;
  check(/^[a-z0-9]{1,16}$/.test(networkSuffix), 'The network suffix must be 1-16 lowercase letters or digits.');
  const runs = Number(env[`${PREFIX}RUNS`] ?? '2');
  check(Number.isInteger(runs) && runs >= 1 && runs <= 5, 'RUNS must be an integer from 1 to 5.');
  return { accountId, stateFile, owner, reportFile, region, networkSuffix, runs, profile: 'stacktape-e2e' };
};
type Options = ReturnType<typeof resolveStreamEventOptions>;

type State = {
  accountId: string;
  owner: string;
  region: string;
  /** `stream-<owner>-<6 hex>`; stages `dev` (dev mode) and `dep` (plain deploy). */
  projectName: string;
  directory: string;
  awsAccountName?: string;
  agentPorts?: number[];
  createAttempted: boolean;
  cleanupVerified?: boolean;
};

export const validateStreamEventRecoveryState = (value: unknown, options: Options): State => {
  check(typeof value === 'object' && value !== null, 'Recovery state must be an object.');
  const candidate = value as Record<string, unknown>;
  check(
    candidate.accountId === options.accountId &&
      candidate.owner === options.owner &&
      candidate.region === options.region,
    'Recovery state identity differs from this run.'
  );
  check(
    typeof candidate.projectName === 'string' &&
      new RegExp(`^stream-${options.owner}-[a-f0-9]{6}$`).test(candidate.projectName),
    'Recovery resource names differ from this run.'
  );
  check(
    typeof candidate.directory === 'string' &&
      isAbsolute(candidate.directory) &&
      candidate.directory.startsWith(join(tmpdir(), 'stacktape-stream-event-')),
    'Recovery directory is not a canary temporary directory.'
  );
  check(typeof candidate.createAttempted === 'boolean', 'Recovery state has no creation marker.');
  check(
    candidate.agentPorts === undefined ||
      (Array.isArray(candidate.agentPorts) &&
        candidate.agentPorts.every((port) => Number.isInteger(port) && port > 1024 && port < 65536)),
    'Recovery agent ports are malformed.'
  );
  return candidate as unknown as State;
};

const DEV_STAGE = 'dev';
const DEPLOY_STAGE = 'dep';
const STAGES = [DEV_STAGE, DEPLOY_STAGE];
const READERS = { fromLatest: 'LATEST', fromTrimHorizon: 'TRIM_HORIZON' } as const;
type Reader = keyof typeof READERS;
const READER_NAMES = Object.keys(READERS) as Reader[];
const stackName = (state: State, stage: string) => `${state.projectName}-${stage}`;
const functionName = (state: State, stage: string, reader: Reader) => `${stackName(state, stage)}-${reader}`;
const projectDirectory = (state: State) => join(state.directory, 'project');

const writeFixture = async (state: State) => {
  const directory = projectDirectory(state);
  await mkdir(join(directory, 'src'), { recursive: true });
  const reader = (name: Reader) => `  ${name}:
    type: function
    properties:
      packaging: { type: js-bundle, properties: { entryfilePath: ./src/consumer.ts } }
      timeout: 10
      events:
        - type: dynamo-db-stream
          properties:
            streamArn: $ResourceParam('probes', 'streamArn')
            startingPosition: ${READERS[name]}
`;
  await writeFile(
    join(directory, 'stacktape.yml'),
    `# Stream first-event canary fixture (${state.owner}).
resources:
  probes:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey: { name: id, type: string }
      streamType: NEW_IMAGE
${READER_NAMES.map(reader).join('')}`
  );
  await writeFile(
    join(directory, 'src/consumer.ts'),
    `export const handler = async (event: { Records?: Array<{ dynamodb?: { Keys?: { id?: { S?: string } } } }> }) => {
  for (const record of event.Records ?? []) console.log(\`stream-probe \${record.dynamodb?.Keys?.id?.S}\`);
};
`
  );
};

const startedProcesses = new Set<ChildProcess>();

const cliEnvironment = (options: Options) => {
  const env: Record<string, string | undefined> = {
    ...process.env,
    AWS_PROFILE: options.profile,
    AWS_DEFAULT_PROFILE: options.profile,
    AWS_SDK_LOAD_CONFIG: '1',
    AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'true',
    STP_DISABLE_TELEMETRY: '1',
    STACKTAPE_DEV_NETWORK_SUFFIX: options.networkSuffix
  };
  // The API key comes from apps/cli/.env.local, which the source CLI loads; nothing inherited may replace it.
  for (const name of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'STACKTAPE_API_KEY']) {
    delete env[name];
  }
  delete env.SKIP_LOADING_ENV;
  return env;
};

const runCli = async (options: Options, args: string[], timeoutMs = 25 * 60_000) => {
  const child = spawn(process.execPath, ['scripts/dev.ts', ...args], {
    cwd: CLI_DIRECTORY,
    env: cliEnvironment(options),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  startedProcesses.add(child);
  let stdout = '';
  let stderr = '';
  child.stdout!.on('data', (data) => (stdout += data));
  child.stderr!.on('data', (data) => (stderr += data));
  const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
  const exitCode = await new Promise<number | null>((resolve) => child.once('exit', (code) => resolve(code)));
  clearTimeout(timer);
  startedProcesses.delete(child);
  const result = stdout
    .split(/\r?\n/)
    .flatMap((line) => {
      try {
        const value = JSON.parse(line) as { type?: string };
        return value?.type === 'result'
          ? [value as { ok?: boolean; code?: string; data?: { result?: unknown }; message?: string }]
          : [];
      } catch {
        return [];
      }
    })
    .at(-1);
  return { exitCode, result, output: `${stdout}\n${stderr}` };
};

const tail = (output: string) => output.slice(-4000);

const stackArgs = (options: Options, state: State, stage: string) => [
  '--currentWorkingDirectory',
  projectDirectory(state),
  '--configPath',
  'stacktape.yml',
  '--projectName',
  state.projectName,
  '--stage',
  stage,
  '--region',
  options.region,
  '--profile',
  options.profile,
  '--awsAccount',
  state.awsAccountName!
];

const resolveAwsAccountName = async (options: Options) => {
  const run = await runCli(options, ['info:whoami', '--agent']);
  const whoami = (run.result?.data?.result ?? {}) as {
    connectedAwsAccounts?: Array<{ awsAccountId?: string; state?: string; name?: string }>;
  };
  const matching = (whoami.connectedAwsAccounts ?? []).filter(
    ({ awsAccountId, state: connectionState }) => awsAccountId === options.accountId && connectionState === 'ACTIVE'
  );
  check(
    matching.length === 1 && matching[0].name,
    `Expected one active Stacktape connection to account ${options.accountId}, found ${matching.length}.`
  );
  return matching[0].name;
};

/** Notes (status `notices`) of a dev agent, as a coding agent reads them. */
const agentNotices = async (port: number, tokenFile: string) => {
  const token = readFileSync(tokenFile, 'utf8').trim();
  const response = await fetch(`http://127.0.0.1:${port}/status`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000)
  });
  const body = (await response.json()) as { data?: { ready?: boolean; notices?: string[] } };
  return { ready: body.data?.ready, notices: body.data?.notices ?? [] };
};

// ─── Run ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export const runStreamEventCanary = async (cleanupOnly = false) => {
  const options = resolveStreamEventOptions();
  const config = {
    region: options.region,
    credentials: fromIni({ profile: options.profile }),
    ignoreConfiguredEndpointUrls: true,
    maxAttempts: 4
  };
  const sts = new STSClient(config);
  const cloudFormation = new CloudFormationClient(config);
  const dynamo = new DynamoDBClient(config);
  const lambda = new LambdaClient(config);
  const logs = new CloudWatchLogsClient(config);
  const report: Record<string, unknown> = { region: options.region, scenarios: [] as unknown[] };
  let state: State | undefined;
  const save = () => writeFile(options.stateFile, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  const saveReport = async () => {
    if (options.reportFile) await writeFile(options.reportFile, JSON.stringify(report, null, 2) + '\n');
  };

  const stackStatus = async (name: string) => {
    try {
      const stack = (await cloudFormation.send(new DescribeStacksCommand({ StackName: name }))).Stacks?.[0];
      return stack?.StackStatus === 'DELETE_COMPLETE' ? undefined : stack?.StackStatus;
    } catch (error) {
      if (error instanceof Error && /does not exist/.test(error.message)) return undefined;
      throw error;
    }
  };

  const tableName = async (stage: string) => {
    // The table is the stack's only DynamoDB table.
    const { StackResources } = await cloudFormation.send(
      new DescribeStackResourcesCommand({ StackName: stackName(state!, stage) })
    );
    const table = StackResources?.find(({ ResourceType }) => ResourceType === 'AWS::DynamoDB::GlobalTable');
    check(table?.PhysicalResourceId, `The ${stage} stack has no DynamoDB table.`);
    return table.PhysicalResourceId;
  };

  const mappings = async (stage: string) =>
    Object.fromEntries(
      await Promise.all(
        READER_NAMES.map(async (reader) => {
          const mapping = (
            await lambda.send(new ListEventSourceMappingsCommand({ FunctionName: functionName(state!, stage, reader) }))
          ).EventSourceMappings?.[0];
          return [
            reader,
            mapping && {
              state: mapping.State,
              startingPosition: mapping.StartingPosition,
              lastModified: mapping.LastModified?.toISOString(),
              lastProcessingResult: mapping.LastProcessingResult
            }
          ];
        })
      )
    );

  const receivedProbes = async (stage: string, reader: Reader, sinceMs: number) => {
    const received = new Map<string, number>();
    let nextToken: string | undefined;
    do {
      const page = await logs
        .send(
          new FilterLogEventsCommand({
            logGroupName: `/aws/lambda/${functionName(state!, stage, reader)}`,
            startTime: sinceMs - 60_000,
            filterPattern: '"stream-probe"',
            nextToken
          })
        )
        .catch((error: Error) => {
          if (error.name === 'ResourceNotFoundException') return { events: [], nextToken: undefined };
          throw error;
        });
      for (const { message, timestamp } of page.events ?? []) {
        const id = message?.match(/stream-probe (\S+)/)?.[1];
        if (id && !received.has(id)) received.set(id, timestamp ?? 0);
      }
      nextToken = page.nextToken;
    } while (nextToken);
    return received;
  };

  /**
   * Writes a probe every 10 s from now until the LATEST reader has received one (or the window ends), then waits for
   * every probe at the TRIM_HORIZON reader and gives the LATEST reader the same grace.
   */
  const probeAfterStart = async (stage: string, scenario: string, startedAt: number) => {
    const table = await tableName(stage);
    const readyAt = Date.now();
    const mappingsAtReady = await mappings(stage);
    const probes: Array<{ id: string; writtenAt: number }> = [];
    const write = async () => {
      const id = `${scenario}-${probes.length}-${randomUUID().slice(0, 8)}`;
      await dynamo.send(new PutItemCommand({ TableName: table, Item: { id: { S: id } } }));
      probes.push({ id, writtenAt: Date.now() });
    };
    await write();
    while (Date.now() - readyAt < PROBE_WINDOW_MS) {
      const latest = await receivedProbes(stage, 'fromLatest', readyAt);
      if (probes.some(({ id }) => latest.has(id))) break;
      await sleep(PROBE_INTERVAL_MS);
      await write();
    }
    const lastWrite = probes.at(-1)!.writtenAt;
    let received: Record<Reader, Map<string, number>> = { fromLatest: new Map(), fromTrimHorizon: new Map() };
    while (Date.now() - lastWrite < DELIVERY_GRACE_MS) {
      received = {
        fromLatest: await receivedProbes(stage, 'fromLatest', readyAt),
        fromTrimHorizon: await receivedProbes(stage, 'fromTrimHorizon', readyAt)
      };
      if (READER_NAMES.every((reader) => probes.every(({ id }) => received[reader].has(id)))) break;
      await sleep(5000);
    }
    const perReader = Object.fromEntries(
      READER_NAMES.map((reader) => {
        const lost = probes.filter(({ id }) => !received[reader].has(id));
        const firstDelivered = probes.find(({ id }) => received[reader].has(id));
        return [
          reader,
          {
            delivered: probes.length - lost.length,
            lost: lost.length,
            firstProbeDelivered: received[reader].has(probes[0].id),
            firstDeliveredProbeWrittenSecondsAfterReady: firstDelivered
              ? (firstDelivered.writtenAt - readyAt) / 1000
              : null,
            firstProbeLatencySeconds: received[reader].has(probes[0].id)
              ? (received[reader].get(probes[0].id)! - probes[0].writtenAt) / 1000
              : null
          }
        ];
      })
    );
    const result = {
      scenario,
      stage,
      startSeconds: (readyAt - startedAt) / 1000,
      probes: probes.length,
      readers: perReader,
      mappingsAtReady,
      mappingsAtEnd: await mappings(stage)
    };
    (report.scenarios as unknown[]).push(result);
    await saveReport();
    console.info(JSON.stringify(result));
    return result;
  };

  const startAgent = async (port: number) => {
    state!.agentPorts = [...new Set([...(state!.agentPorts ?? []), port])];
    await save();
    const startedAt = Date.now();
    const run = await runCli(options, [
      'dev',
      ...stackArgs(options, state!, DEV_STAGE),
      '--resources',
      'all',
      '--agent',
      '--agentPort',
      String(port)
    ]);
    check(run.exitCode === 0 && run.result?.ok === true, `dev --agent failed (${run.exitCode}):\n${tail(run.output)}`);
    const tokenFile = (run.result?.data?.result as { tokenFile?: string } | undefined)?.tokenFile;
    check(tokenFile, 'dev --agent did not report its token file.');
    return { startedAt, tokenFile };
  };

  /**
   * Stops this run's agent by its project directory and stage, never by port alone: other dev sessions run on this
   * machine, and the port recorded before a start can belong to one of them when the start failed or ended.
   */
  const stopAgent = async ({ running = true }: { running?: boolean } = {}) => {
    const run = await runCli(options, [
      'dev:stop',
      '--currentWorkingDirectory',
      projectDirectory(state!),
      '--stage',
      DEV_STAGE,
      '--agent'
    ]);
    check(run.exitCode === 0, `dev:stop failed (${run.exitCode}):\n${tail(run.output)}`);
    const stopped = (run.result?.data?.result as { stopped?: unknown[] } | undefined)?.stopped ?? [];
    check(!running || stopped.length === 1, `dev:stop stopped ${stopped.length} agents of this run, not 1.`);
  };

  const deleteStage = async (stage: string) => {
    if (!(await stackStatus(stackName(state!, stage)))) return;
    const started = Date.now();
    const run = await runCli(options, ['delete', ...stackArgs(options, state!, stage), '--autoConfirmOperation']);
    check(run.exitCode === 0, `delete of ${stage} failed (${run.exitCode}):\n${tail(run.output)}`);
    check(!(await stackStatus(stackName(state!, stage))), `The ${stage} stack still exists.`);
    report[`deleteSeconds_${stage}`] = (Date.now() - started) / 1000;
  };

  const cleanup = async () => {
    if (!state || state.cleanupVerified || !state.createAttempted) {
      if (state && !state.createAttempted) await rm(state.directory, { recursive: true, force: true });
      return;
    }
    if (state.agentPorts?.length) await stopAgent({ running: false }).catch(() => {});
    for (const child of startedProcesses) child.kill('SIGKILL');
    if (!state.awsAccountName) state.awsAccountName = await resolveAwsAccountName(options);
    for (const stage of STAGES) await deleteStage(stage);
    check(
      !(await stackStatus(getDevNetworkStackName(options.networkSuffix))),
      'A dev network exists for this run; delete it with `stacktape dev network delete`.'
    );
    // Exact names authorize these checks; nothing is discovered from a broad prefix.
    const remaining: string[] = [];
    let marker: string | undefined;
    do {
      const page = await lambda.send(new ListFunctionsCommand({ Marker: marker }));
      for (const { FunctionName } of page.Functions ?? []) {
        if (STAGES.some((stage) => FunctionName?.startsWith(`${stackName(state!, stage)}-`))) {
          remaining.push(FunctionName!);
        }
      }
      marker = page.NextMarker;
    } while (marker);
    check(!remaining.length, `Functions remain: ${remaining.join(', ')}.`);
    for (const stage of STAGES) {
      for (const reader of READER_NAMES) {
        const groupName = `/aws/lambda/${functionName(state, stage, reader)}`;
        const exists = (
          await logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: groupName }))
        ).logGroups?.some(({ logGroupName }) => logGroupName === groupName);
        if (exists) await logs.send(new DeleteLogGroupCommand({ logGroupName: groupName }));
      }
    }
    await rm(state.directory, { recursive: true, force: true });
    state.cleanupVerified = true;
    await save();
    console.info('Stream canary cleanup verified: stacks, functions and log groups removed; no dev network.');
  };

  let failure: unknown;
  try {
    check(
      (await sts.send(new GetCallerIdentityCommand({}))).Account === options.accountId,
      'The profile account differs from the expected account.'
    );
    if (cleanupOnly) {
      state = validateStreamEventRecoveryState(JSON.parse(await readFile(options.stateFile, 'utf8')), options);
      await cleanup();
      return;
    }
    check(!(await Bun.file(options.stateFile).exists()), 'Recovery state already exists; run --cleanup-only first.');
    state = {
      accountId: options.accountId,
      owner: options.owner,
      region: options.region,
      projectName: `stream-${options.owner}-${randomBytes(3).toString('hex')}`,
      directory: await mkdtemp(join(tmpdir(), 'stacktape-stream-event-')),
      createAttempted: false
    };
    await save();
    for (const stage of STAGES) {
      check(!(await stackStatus(stackName(state, stage))), `The stack name of ${stage} is already taken.`);
    }
    state.awsAccountName = await resolveAwsAccountName(options);
    await writeFixture(state);
    state.createAttempted = true;
    await save();
    report.projectName = state.projectName;

    for (let run = 1; run <= options.runs; run++) {
      // A fresh start creates the dev stack and both mappings.
      const port = 7800 + Math.floor(Math.random() * 400);
      const fresh = await startAgent(port);
      const freshStatus = await agentNotices(port, fresh.tokenFile);
      const freshResult = await probeAfterStart(DEV_STAGE, `dev-fresh-${run}`, fresh.startedAt);
      (freshResult as Record<string, unknown>).agentStatus = freshStatus;
      await saveReport();
      await stopAgent();
      check(
        freshResult.readers.fromTrimHorizon.lost === 0,
        `dev-fresh-${run}: the TRIM_HORIZON reader lost ${freshResult.readers.fromTrimHorizon.lost} probes.`
      );
      // The start says that both new mappings read late, and that the LATEST one skips what is written meanwhile.
      const streamNotice = freshStatus.notices.find((notice) => notice.includes('stream mappings'));
      check(
        streamNotice?.includes('`fromLatest` (DynamoDB)') &&
          streamNotice.includes('`fromTrimHorizon` (DynamoDB)') &&
          streamNotice.includes('`fromLatest` reads from `startingPosition: LATEST`') &&
          !streamNotice.includes('`fromTrimHorizon` reads'),
        `dev-fresh-${run}: the start's status does not describe the new stream mappings: ${JSON.stringify(freshStatus)}`
      );
      // A warm start of the unchanged stage deploys nothing; its mappings already read the stream.
      const warmPort = 7800 + Math.floor(Math.random() * 400);
      const warm = await startAgent(warmPort);
      const warmStatus = await agentNotices(warmPort, warm.tokenFile);
      const warmResult = await probeAfterStart(DEV_STAGE, `dev-warm-${run}`, warm.startedAt);
      (warmResult as Record<string, unknown>).agentStatus = warmStatus;
      await saveReport();
      await stopAgent();
      check(
        warmResult.readers.fromTrimHorizon.lost === 0 && warmResult.readers.fromLatest.lost === 0,
        `dev-warm-${run}: a warm start lost probes.`
      );
      check(
        !warmStatus.notices.some((notice) => notice.includes('stream mappings')),
        `dev-warm-${run}: an unchanged stage reported new stream mappings.`
      );
      await deleteStage(DEV_STAGE);
    }
    for (let run = 1; run <= options.runs; run++) {
      const startedAt = Date.now();
      const deployed = await runCli(options, [
        'deploy',
        ...stackArgs(options, state, DEPLOY_STAGE),
        '--autoConfirmOperation'
      ]);
      check(deployed.exitCode === 0, `deploy failed (${deployed.exitCode}):\n${tail(deployed.output)}`);
      const result = await probeAfterStart(DEPLOY_STAGE, `deploy-${run}`, startedAt);
      check(
        result.readers.fromTrimHorizon.lost === 0,
        `deploy-${run}: the TRIM_HORIZON reader lost ${result.readers.fromTrimHorizon.lost} probes.`
      );
      await deleteStage(DEPLOY_STAGE);
    }
  } catch (error) {
    failure = error;
  } finally {
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error(
        `Cleanup failed; keep ${options.stateFile} and rerun with --cleanup-only: ${
          cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        }`
      );
      failure ??= cleanupError;
    }
    await saveReport();
  }
  if (failure) throw failure;
};

if (import.meta.main) {
  runStreamEventCanary(process.argv.includes('--cleanup-only')).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Stream first-event canary failed.');
    process.exitCode = 1;
  });
}
