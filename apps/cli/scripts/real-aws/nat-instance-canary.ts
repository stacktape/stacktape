/**
 * Real-AWS check of NAT instances (`stackConfig.vpc.nat.type: 'instance'`): a VPC function reaches the internet
 * through them, a dead instance's zone fails over to the other zone and comes back, a rolling replacement keeps
 * traffic flowing, and deletion leaves nothing behind.
 *
 * It deploys `_test-stacks/nat-instance` (one VPC function that returns the public IP its request left through, two
 * NAT instances) through the source-built CLI (`pnpm dev:cli`, which reads the Stacktape API key from
 * `apps/cli/.env.local` in dev mode), then deletes it:
 * 1. deploy; invoke the function and require every answer to be one of the two NAT Elastic IPs; the private route
 *    tables point at their home interfaces;
 * 2. terminate the zone-0 instance while invoking every two seconds; measure the failed-call window, the time until
 *    zone 0's route table points at zone 1's interface, and the time until the replacement is healthy and the route
 *    is back home;
 * 3. change the instance size and deploy while invoking: CloudFormation replaces the instances one zone at a time;
 *    measure the failed-call window and require both instances to be new and the routes home afterwards;
 * 4. deploy again unchanged: the same instances keep running;
 * 5. delete the stack with the CLI, then confirm with AWS that the stack, the instances, the interfaces, the Elastic
 *    IPs, the heartbeat parameters, the function and its log group are gone.
 *
 * Guardrails (docs/testing.md, "Live AWS"): an explicit opt-in; STS must resolve the credentials to the explicitly
 * expected account, and the CLI deploys through the single active Stacktape connection to that same account; a new
 * `v4natcanary-` project carrying the run's owner tag; recovery state written before the first deploy; cleanup in
 * `finally` after success or failure, verified with AWS; one exact `--cleanup-only` command when cleanup does not
 * finish. The API key and credentials never appear in commands, logs or the report.
 *
 *   STP_AWS_NAT_CANARY_DEPLOY=1 STP_AWS_NAT_CANARY_EXPECTED_ACCOUNT_ID=<12 digits> STP_AWS_NAT_CANARY_PROFILE=<name>
 *   STP_AWS_NAT_CANARY_OWNER=<run id> STP_AWS_NAT_CANARY_STATE_FILE=<absolute path>
 *   [STP_AWS_NAT_CANARY_REPORT=<absolute path>] [STP_AWS_NAT_CANARY_PROJECT_NAME=v4natcanary-…]
 *   [STP_AWS_NAT_CANARY_REGION=eu-west-1]
 *   pnpm --filter @stacktape/cli run test:real-aws-nat-canary [-- --cleanup-only]
 *
 * `--scenario=switch` (script `test:real-aws-nat-switch-canary`) runs the other journey an existing stack takes:
 * deploy with `nat: gateway`, switch to `ha-ec2` (the VPC, subnets and route tables must survive and the gateways must
 * be gone), break forwarding on one instance so the probe path (stale heartbeat) has to reroute and the instance
 * replaces itself, switch to `ec2` (one zone), then delete.
 */
import { AutoScalingClient, DescribeAutoScalingGroupsCommand } from '@aws-sdk/client-auto-scaling';
import {
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStackResourcesCommand,
  DescribeStacksCommand,
  waitUntilStackDeleteComplete,
  type Stack
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, DeleteLogGroupCommand, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import {
  DescribeAddressesCommand,
  DescribeInstancesCommand,
  DescribeNetworkInterfacesCommand,
  DescribeRouteTablesCommand,
  EC2Client,
  TerminateInstancesCommand
} from '@aws-sdk/client-ec2';
import { GetFunctionCommand, InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { GetCommandInvocationCommand, GetParametersCommand, SendCommandCommand, SSMClient } from '@aws-sdk/client-ssm';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { randomBytes } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';

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
  functionName?: string;
  autoscalingGroupNames?: string[];
  networkInterfaceIds?: string[];
  allocationIds?: string[];
  parameterNames?: string[];
  instanceIds?: string[];
  logGroupNames?: string[];
  cleanupVerifiedAt?: string;
};
type Clients = {
  autoscaling: AutoScalingClient;
  cloudFormation: CloudFormationClient;
  ec2: EC2Client;
  lambda: LambdaClient;
  logs: CloudWatchLogsClient;
  ssm: SSMClient;
  sts: STSClient;
};
type AgentRecord = Record<string, unknown> & { type: string };
type Sample = { at: number; ok: boolean; ip?: string; error?: string; millis?: number };
type NatKind = 'gateway' | 'ha-ec2' | 'ec2';
type Topology = {
  kind: NatKind;
  zones: number;
  vpcId: string;
  subnetIds: string[];
  functionName: string;
  autoscalingGroupNames: string[];
  networkInterfaceIds: string[];
  allocationIds: string[];
  publicIps: string[];
  routeTableIds: string[];
  parameterNames: string[];
  logGroupNames: string[];
};

const PREFIX = 'STP_AWS_NAT_CANARY_';
const STAGE = 'canary';
const FUNCTION = 'egress';
const PRIVATE_SUBNETS = 3;
const OWNER_TAG = 'stacktape-canary-owner';
const CLI_DIRECTORY = join(import.meta.dir, '..', '..');
const REPO_ROOT = join(CLI_DIRECTORY, '..', '..');
const FIXTURE_CONFIG = '_test-stacks/nat-instance/stacktape.ts';
const COMMAND_TIMEOUT_MS = 40 * 60 * 1000;
const INVOKE_INTERVAL_MS = 2000;
const FAILOVER_TIMEOUT_MS = 12 * 60 * 1000;

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const seconds = (milliseconds: number) => Math.round(milliseconds / 100) / 10;

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
    env[`${PREFIX}PROJECT_NAME`]?.trim() || `v4natcanary-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`;
  assert(
    projectName.length <= 40 && /^v4natcanary-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(projectName),
    `${PREFIX}PROJECT_NAME must start with v4natcanary- and contain only lowercase letters, digits and dashes.`
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
    autoscaling: new AutoScalingClient(config),
    cloudFormation: new CloudFormationClient(config),
    ec2: new EC2Client(config),
    lambda: new LambdaClient(config),
    logs: new CloudWatchLogsClient(config),
    ssm: new SSMClient(config),
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

/** One source-built CLI command, `pnpm dev:cli <args> --agent`, with the run's owner and instance size in its environment. */
const runSourceCli = async ({
  options,
  args,
  instanceSize,
  natKind,
  invocationId
}: {
  options: Options;
  args: string[];
  instanceSize?: string;
  natKind?: NatKind;
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
    ...(instanceSize !== undefined && { [`${PREFIX}INSTANCE_SIZE`]: instanceSize }),
    ...(natKind !== undefined && { [`${PREFIX}NAT`]: natKind })
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
  const startedAt = Date.now();
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
  return { command: `pnpm ${cliArgs.join(' ')}`, records, result, durationSeconds: seconds(Date.now() - startedAt) };
};

/**
 * The Stacktape connection the CLI must use. With several connected accounts the CLI needs `--awsAccount`, and a
 * privileged connection gives it Stacktape-issued credentials instead of the profile's, so a name is accepted only when
 * it is the single active connection to the expected account.
 */
const resolveAwsAccountName = async (options: Options, invocationId: string) => {
  const { result } = await runSourceCli({ options, args: ['info:whoami'], invocationId });
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
  instanceSize,
  natKind,
  invocationId
}: {
  options: Options;
  command: 'deploy' | 'delete';
  awsAccountName: string;
  instanceSize?: string;
  natKind?: NatKind;
  invocationId: string;
}) => {
  const { command: commandLine, durationSeconds } = await runSourceCli({
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
    instanceSize,
    natKind,
    invocationId
  });
  return { command: commandLine, durationSeconds };
};

const readStackResources = async (clients: Clients, stackName: string) =>
  (await clients.cloudFormation.send(new DescribeStackResourcesCommand({ StackName: stackName }))).StackResources ?? [];

const readTopology = async (clients: Clients, stackName: string, kind: NatKind = 'ha-ec2'): Promise<Topology> => {
  const resources = await readStackResources(clients, stackName);
  const physical = (logicalName: string) => {
    const id = resources.find(({ LogicalResourceId }) => LogicalResourceId === logicalName)?.PhysicalResourceId;
    assert(id, `The stack has no ${logicalName}.`);
    return id;
  };
  const zoneCount = kind === 'ec2' ? 1 : 2;
  const zones = Array.from({ length: zoneCount }, (_, azIndex) => azIndex);
  // An EIP's physical id is its public IP; its allocation id comes from EC2.
  const publicIps = zones.map((azIndex) =>
    physical(kind === 'gateway' ? cfLogicalNames.natElasticIp(azIndex) : cfLogicalNames.natInstanceElasticIp(azIndex))
  );
  const addresses = await clients.ec2.send(new DescribeAddressesCommand({ PublicIps: publicIps }));
  const instanceZones = kind === 'gateway' ? [] : zones;
  return {
    kind,
    zones: zoneCount,
    vpcId: physical(cfLogicalNames.vpc()),
    subnetIds: [true, false].flatMap((isPublic) =>
      Array.from({ length: PRIVATE_SUBNETS }, (_, index) => physical(cfLogicalNames.subnet(isPublic, index)))
    ),
    functionName: physical(cfLogicalNames.lambda(FUNCTION)),
    autoscalingGroupNames: instanceZones.map((azIndex) =>
      physical(cfLogicalNames.natInstanceAutoscalingGroup(azIndex))
    ),
    networkInterfaceIds: instanceZones.map((azIndex) => physical(cfLogicalNames.natInstanceNetworkInterface(azIndex))),
    allocationIds: (addresses.Addresses ?? []).map(({ AllocationId }) => AllocationId!),
    publicIps,
    routeTableIds: Array.from({ length: PRIVATE_SUBNETS }, (_, index) =>
      physical(cfLogicalNames.routeTable(false, index))
    ),
    parameterNames: instanceZones.map((azIndex) => physical(cfLogicalNames.natInstanceHeartbeatParameter(azIndex))),
    logGroupNames: resources
      .filter(({ ResourceType }) => ResourceType === 'AWS::Logs::LogGroup')
      .map(({ PhysicalResourceId }) => PhysicalResourceId!)
  };
};

/** Everything of the stack that cleanup verifies afterwards, taken by resource type so any NAT kind is covered. */
const describeOwnedResources = async (clients: Clients, stackName: string) => {
  const resources = await readStackResources(clients, stackName);
  const physical = (type: string) =>
    resources.filter(({ ResourceType }) => ResourceType === type).map(({ PhysicalResourceId }) => PhysicalResourceId!);
  const publicIps = physical('AWS::EC2::EIP');
  const addresses = publicIps.length
    ? await clients.ec2.send(new DescribeAddressesCommand({ PublicIps: publicIps })).catch(() => ({ Addresses: [] }))
    : { Addresses: [] };
  return {
    functionName: physical('AWS::Lambda::Function').find((name) => name.includes(FUNCTION)),
    autoscalingGroupNames: physical('AWS::AutoScaling::AutoScalingGroup'),
    networkInterfaceIds: physical('AWS::EC2::NetworkInterface'),
    allocationIds: (addresses.Addresses ?? []).map(({ AllocationId }) => AllocationId!),
    parameterNames: physical('AWS::SSM::Parameter'),
    logGroupNames: physical('AWS::Logs::LogGroup')
  };
};

/** The in-service instance of each NAT Auto Scaling group (undefined while a zone is between instances). */
const readInstances = async (clients: Clients, topology: Topology) => {
  if (!topology.autoscalingGroupNames.length) return [];
  const { AutoScalingGroups } = await clients.autoscaling.send(
    new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: topology.autoscalingGroupNames })
  );
  return topology.autoscalingGroupNames.map(
    (name) =>
      AutoScalingGroups?.find(({ AutoScalingGroupName }) => AutoScalingGroupName === name)?.Instances?.find(
        ({ LifecycleState }) => LifecycleState === 'InService'
      )?.InstanceId
  );
};

/** Which zone's interface each private route table points at (by zone index), or -1. */
const readRoutes = async (clients: Clients, topology: Topology) => {
  const { RouteTables } = await clients.ec2.send(
    new DescribeRouteTablesCommand({ RouteTableIds: topology.routeTableIds })
  );
  return topology.routeTableIds.map((routeTableId) => {
    const target = RouteTables?.find(({ RouteTableId }) => RouteTableId === routeTableId)?.Routes?.find(
      ({ DestinationCidrBlock }) => DestinationCidrBlock === '0.0.0.0/0'
    )?.NetworkInterfaceId;
    return topology.networkInterfaceIds.indexOf(target ?? '');
  });
};

const homeRoutes = (zones: number) => Array.from({ length: PRIVATE_SUBNETS }, (_, index) => Math.min(index, zones - 1));
const routesAreHome = (routes: number[], zones = 2) => JSON.stringify(routes) === JSON.stringify(homeRoutes(zones));

/** The raw default-route targets of the private route tables (gateway or interface ids). */
const readRouteTargets = async (clients: Clients, topology: Topology) => {
  const { RouteTables } = await clients.ec2.send(
    new DescribeRouteTablesCommand({ RouteTableIds: topology.routeTableIds })
  );
  return topology.routeTableIds.map((routeTableId) => {
    const route = RouteTables?.find(({ RouteTableId }) => RouteTableId === routeTableId)?.Routes?.find(
      ({ DestinationCidrBlock }) => DestinationCidrBlock === '0.0.0.0/0'
    );
    return route?.NatGatewayId ?? route?.NetworkInterfaceId ?? null;
  });
};

/** Runs a shell command on a NAT instance through Systems Manager and returns its output. */
const runOnInstance = async (clients: Clients, instanceId: string, commands: string[]) => {
  const { Command } = await clients.ssm.send(
    new SendCommandCommand({
      InstanceIds: [instanceId],
      DocumentName: 'AWS-RunShellScript',
      Parameters: { commands }
    })
  );
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await sleep(2000);
    const invocation = await clients.ssm
      .send(new GetCommandInvocationCommand({ CommandId: Command!.CommandId!, InstanceId: instanceId }))
      .catch(() => undefined);
    if (invocation && !['Pending', 'InProgress', 'Delayed'].includes(invocation.Status ?? '')) {
      return { status: invocation.Status, output: invocation.StandardOutputContent ?? '' };
    }
  }
  throw new Error(`The command on ${instanceId} did not finish.`);
};

const invokeOnce = async (clients: Clients, functionName: string): Promise<Sample> => {
  const at = Date.now();
  try {
    const response = await clients.lambda.send(
      new InvokeCommand({ FunctionName: functionName, Payload: new TextEncoder().encode('{}') })
    );
    if (response.FunctionError) return { at, ok: false, error: `FunctionError ${response.FunctionError}` };
    const payload: unknown = JSON.parse(new TextDecoder().decode(response.Payload));
    if (!isRecord(payload)) return { at, ok: false, error: 'unexpected payload' };
    return {
      at,
      ok: payload.ok === true,
      ...(typeof payload.ip === 'string' && { ip: payload.ip }),
      ...(typeof payload.error === 'string' && { error: payload.error }),
      ...(typeof payload.millis === 'number' && { millis: payload.millis })
    };
  } catch (error) {
    return { at, ok: false, error: String(error) };
  }
};

/** Invokes the function every two seconds until stopped; the samples are the measurement. */
const startInvokeLoop = (clients: Clients, functionName: string) => {
  const samples: Sample[] = [];
  const control = new AbortController();
  const loop = (async () => {
    while (!control.signal.aborted) {
      const sample = await invokeOnce(clients, functionName);
      samples.push(sample);
      await sleep(INVOKE_INTERVAL_MS);
    }
  })();
  return {
    samples,
    stop: async () => {
      control.abort();
      await loop;
      return samples;
    }
  };
};

const summarizeSamples = (samples: Sample[], publicIps: string[], since = 0) => {
  const window = samples.filter(({ at }) => at >= since);
  const failed = window.filter(({ ok }) => !ok);
  const unexpectedIp = window.filter(({ ok, ip }) => ok && !publicIps.includes(ip ?? ''));
  const first = failed[0]?.at;
  const last = failed.at(-1)?.at;
  return {
    calls: window.length,
    failed: failed.length,
    unexpectedIp: unexpectedIp.length,
    failedWindowSeconds: first !== undefined && last !== undefined ? seconds(last - first + INVOKE_INTERVAL_MS) : 0,
    byIp: Object.fromEntries(
      publicIps.map((ip, index) => [`zone${index}`, window.filter((sample) => sample.ip === ip).length])
    ),
    firstFailureAt: first ? new Date(first).toISOString() : null,
    lastFailureAt: last ? new Date(last).toISOString() : null,
    failures: failed.slice(0, 10).map(({ at, error, millis }) => ({ at: new Date(at).toISOString(), error, millis }))
  };
};

/** Ten fresh calls after a change has settled; every one must succeed and leave through a NAT Elastic IP. */
const assertServing = async (clients: Clients, topology: Topology, when: string) => {
  const samples: Sample[] = [];
  for (let call = 0; call < 10; call += 1) samples.push(await invokeOnce(clients, topology.functionName));
  const bad = samples.filter(({ ok, ip }) => !ok || !topology.publicIps.includes(ip ?? ''));
  assert(bad.length === 0, `Calls still fail ${when}: ${JSON.stringify(bad.slice(0, 3))}.`);
  return summarizeSamples(samples, topology.publicIps);
};

/** Waits until `condition` holds, polling every two seconds; returns the elapsed seconds. */
const waitFor = async (description: string, condition: () => Promise<boolean>, timeoutMs = FAILOVER_TIMEOUT_MS) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await condition()) return seconds(Date.now() - startedAt);
    await sleep(2000);
  }
  throw new Error(`Timed out after ${seconds(timeoutMs)} s waiting for ${description}.`);
};

const isMissing = (error: unknown, names: string[]) =>
  error instanceof Error && (names.includes(error.name) || /not ?found|does not exist/i.test(error.message));

/** Deletes the stack with the CLI, then checks with AWS that everything owned is gone. */
const cleanup = async (clients: Clients, options: Options, stackName: string) => {
  const state = await readState(options, stackName);
  const stack = await describeStack(clients.cloudFormation, stackName);
  const verification: Record<string, unknown> = {};
  if (stack) {
    assertOwned(stack, options, state);
    // A first deploy that failed part way recorded no resources: take what exists from the stack before it goes.
    try {
      const owned = await describeOwnedResources(clients, stackName);
      const instanceIds = owned.autoscalingGroupNames.length
        ? ((
            await clients.autoscaling.send(
              new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: owned.autoscalingGroupNames })
            )
          ).AutoScalingGroups?.flatMap(({ Instances }) => (Instances ?? []).map(({ InstanceId }) => InstanceId!)) ?? [])
        : [];
      Object.assign(state, {
        ...(owned.functionName && { functionName: owned.functionName }),
        autoscalingGroupNames: owned.autoscalingGroupNames,
        networkInterfaceIds: [...new Set([...(state.networkInterfaceIds ?? []), ...owned.networkInterfaceIds])],
        allocationIds: [...new Set([...(state.allocationIds ?? []), ...owned.allocationIds])],
        parameterNames: [...new Set([...(state.parameterNames ?? []), ...owned.parameterNames])],
        logGroupNames: [...new Set([...(state.logGroupNames ?? []), ...owned.logGroupNames])],
        instanceIds: [...new Set([...(state.instanceIds ?? []), ...instanceIds])]
      });
    } catch (error) {
      console.warn(
        `The stack is incomplete; cleanup verifies what the state file recorded. ${String(error).slice(0, 300)}`
      );
    }
    await writeState(options, state);
    try {
      await runStackCommand({
        options,
        command: 'delete',
        awsAccountName: state.awsAccountName,
        invocationId: `nat-canary-delete-${Date.now()}`
      });
      verification.deletedBy = 'stacktape delete';
    } catch (cliError) {
      console.warn(`Stacktape delete failed; deleting the owned stack directly. ${String(cliError).slice(0, 400)}`);
      await clients.cloudFormation.send(new DeleteStackCommand({ StackName: stack.StackId }));
      verification.deletedBy = 'CloudFormation DeleteStack after a failed stacktape delete';
    }
    const waited = await waitUntilStackDeleteComplete(
      { client: clients.cloudFormation, maxWaitTime: 30 * 60, minDelay: 5, maxDelay: 20 },
      { StackName: stack.StackId }
    );
    assert(waited.state === 'SUCCESS', `CloudFormation did not confirm deletion of ${stackName}: ${waited.state}.`);
  }
  assert(!(await describeStack(clients.cloudFormation, stackName)), `${stackName} still exists.`);
  verification.stack = 'absent';

  for (const networkInterfaceId of state.networkInterfaceIds ?? []) {
    const gone = await clients.ec2
      .send(new DescribeNetworkInterfacesCommand({ NetworkInterfaceIds: [networkInterfaceId] }))
      .then(
        ({ NetworkInterfaces }) => !NetworkInterfaces?.length,
        (error: unknown) => isMissing(error, ['InvalidNetworkInterfaceID.NotFound'])
      );
    assert(gone, `Network interface ${networkInterfaceId} still exists.`);
  }
  verification.networkInterfaces = `${state.networkInterfaceIds?.length ?? 0} absent`;
  for (const allocationId of state.allocationIds ?? []) {
    const gone = await clients.ec2.send(new DescribeAddressesCommand({ AllocationIds: [allocationId] })).then(
      ({ Addresses }) => !Addresses?.length,
      (error: unknown) => isMissing(error, ['InvalidAllocationID.NotFound'])
    );
    assert(gone, `Elastic IP ${allocationId} still exists.`);
  }
  verification.elasticIps = `${state.allocationIds?.length ?? 0} released`;
  if (state.instanceIds?.length) {
    // A boot failure tags the instance with its reason; the report keeps it because the instance itself is gone.
    const tagged = await clients.ec2
      .send(
        new DescribeInstancesCommand({
          Filters: [
            { Name: 'tag:stacktape-canary-owner', Values: [options.owner] },
            { Name: 'tag-key', Values: ['stacktape:nat-failure'] }
          ]
        })
      )
      .catch(() => ({ Reservations: [] }));
    verification.instanceFailures = (tagged.Reservations ?? [])
      .flatMap(({ Instances }) => Instances ?? [])
      .map(
        ({ InstanceId, Tags }) => `${InstanceId}: ${Tags?.find(({ Key }) => Key === 'stacktape:nat-failure')?.Value}`
      );
    const { Reservations } = await clients.ec2
      .send(new DescribeInstancesCommand({ InstanceIds: state.instanceIds }))
      .catch((error: unknown) => {
        if (isMissing(error, ['InvalidInstanceID.NotFound'])) return { Reservations: [] };
        throw error;
      });
    const alive = (Reservations ?? [])
      .flatMap(({ Instances }) => Instances ?? [])
      .filter(({ State }) => State?.Name !== 'terminated' && State?.Name !== 'shutting-down')
      .map(({ InstanceId }) => InstanceId);
    assert(!alive.length, `NAT instances still running: ${alive.join(', ')}.`);
  }
  verification.instances = `${state.instanceIds?.length ?? 0} terminated`;
  if (state.parameterNames?.length) {
    const { Parameters } = await clients.ssm.send(new GetParametersCommand({ Names: state.parameterNames }));
    assert(!Parameters?.length, `Heartbeat parameters still exist: ${Parameters?.map(({ Name }) => Name).join(', ')}.`);
  }
  verification.parameters = `${state.parameterNames?.length ?? 0} absent`;
  if (state.functionName) {
    const gone = await clients.lambda.send(new GetFunctionCommand({ FunctionName: state.functionName })).then(
      () => false,
      (error: unknown) => isMissing(error, ['ResourceNotFoundException'])
    );
    assert(gone, `Lambda function ${state.functionName} still exists.`);
    verification.function = 'absent';
  }
  // A function's own log group can be recreated by Lambda after the stack removed it; only these exact names are owned.
  const logGroupNames = [
    ...new Set([...(state.logGroupNames ?? []), ...(state.functionName ? [`/aws/lambda/${state.functionName}`] : [])])
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

const cleanupCommand = (options: Options, scenario: 'failover' | 'switch' = 'failover') =>
  [
    `${PREFIX}DEPLOY=1`,
    `${PREFIX}EXPECTED_ACCOUNT_ID=${options.expectedAccountId}`,
    `${PREFIX}PROFILE=${options.profile}`,
    `${PREFIX}REGION=${options.region}`,
    `${PREFIX}PROJECT_NAME=${options.projectName}`,
    `${PREFIX}OWNER=${options.owner}`,
    `${PREFIX}STATE_FILE=${options.stateFile}`,
    scenario === 'switch'
      ? 'pnpm --filter @stacktape/cli run test:real-aws-nat-switch-canary -- --cleanup-only'
      : 'pnpm --filter @stacktape/cli run test:real-aws-nat-canary -- --cleanup-only'
  ].join(' ');

export const runNatInstanceCanary = async ({ cleanupOnly = false }: { cleanupOnly?: boolean } = {}) => {
  const options = resolveOptions();
  const clients = createClients(options);
  const stackName = `${options.projectName}-${STAGE}`;
  const report: Record<string, unknown> = {
    kind: 'stacktape-nat-instance-canary',
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
  let activeLoop: ReturnType<typeof startInvokeLoop> | undefined;
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
    const awsAccountName = await resolveAwsAccountName(options, `nat-canary-whoami-${run}`);
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

    // A rejected preflight above authorizes no cleanup; from here on, cleanup always runs.
    deployAttempted = true;
    const firstDeploy = await runStackCommand({
      options,
      command: 'deploy',
      awsAccountName,
      natKind: 'ha-ec2',
      instanceSize: 't4g.nano',
      invocationId: `nat-canary-1-${run}`
    });
    const stack = await describeStack(clients.cloudFormation, stackName);
    assert(stack, `${stackName} does not exist after the first deploy.`);
    assertOwned(stack, options);
    const topology = await readTopology(clients, stackName);
    const initialInstances = await readInstances(clients, topology);
    Object.assign(state, {
      stackId: stack.StackId,
      functionName: topology.functionName,
      autoscalingGroupNames: topology.autoscalingGroupNames,
      networkInterfaceIds: topology.networkInterfaceIds,
      allocationIds: topology.allocationIds,
      parameterNames: topology.parameterNames,
      logGroupNames: topology.logGroupNames,
      instanceIds: initialInstances.filter((id): id is string => Boolean(id))
    });
    await writeState(options, state);
    report.deploy = { ...firstDeploy, publicIps: topology.publicIps, instances: initialInstances };
    await writeReport();

    // 1. Steady state: every call leaves through one of the NAT Elastic IPs; the routes are home.
    assert(initialInstances.every(Boolean), 'A NAT zone has no in-service instance after the deploy.');
    // While zone 1 was still booting, the failover handler routed its tables through zone 0; the next probe (up to a
    // minute later) moves them home once zone 1's heartbeat is fresh.
    const homeAfterDeploy = await waitFor(
      'the routes to point at their home zones after the deploy',
      async () => routesAreHome(await readRoutes(clients, topology)),
      3 * 60 * 1000
    );
    (report.deploy as Record<string, unknown>).secondsUntilRoutesHome = homeAfterDeploy;
    const steady: Sample[] = [];
    for (let call = 0; call < 20; call += 1) steady.push(await invokeOnce(clients, topology.functionName));
    report.steadyState = summarizeSamples(steady, topology.publicIps);
    await writeReport();
    assert(
      steady.every(({ ok }) => ok),
      `Steady-state calls failed: ${JSON.stringify(steady.filter(({ ok }) => !ok).slice(0, 3))}.`
    );
    assert(
      steady.every(({ ip }) => topology.publicIps.includes(ip ?? '')),
      `A call left through an unexpected IP: ${steady.map(({ ip }) => ip).join(', ')}.`
    );

    // 2. Zone 0's instance dies: its route table must move to zone 1 and come back with the replacement.
    activeLoop = startInvokeLoop(clients, topology.functionName);
    await sleep(10_000);
    const killedAt = Date.now();
    await clients.ec2.send(new TerminateInstancesCommand({ InstanceIds: [initialInstances[0]!] }));
    const failedOverAfter = await waitFor('zone 0 to be routed through zone 1', async () => {
      const routes = await readRoutes(clients, topology);
      return routes[0] === 1;
    });
    const replacementHealthyAfter = await waitFor('the replacement of zone 0 and the route back home', async () => {
      const [routes, instances] = await Promise.all([readRoutes(clients, topology), readInstances(clients, topology)]);
      return routesAreHome(routes) && Boolean(instances[0]) && instances[0] !== initialInstances[0];
    });
    await sleep(20_000);
    const failoverSamples = await activeLoop.stop();
    activeLoop = undefined;
    const afterFailover = await readInstances(clients, topology);
    state.instanceIds = [
      ...new Set([...(state.instanceIds ?? []), ...afterFailover.filter((id): id is string => Boolean(id))])
    ];
    await writeState(options, state);
    report.failover = {
      killedInstance: initialInstances[0],
      replacementInstance: afterFailover[0],
      secondsUntilRerouted: failedOverAfter,
      secondsUntilBackHome: replacementHealthyAfter,
      calls: summarizeSamples(failoverSamples, topology.publicIps, killedAt - 10_000),
      callsAfterRecovery: summarizeSamples(
        failoverSamples,
        topology.publicIps,
        killedAt + replacementHealthyAfter * 1000
      )
    };
    await writeReport();
    assert(afterFailover[0] && afterFailover[0] !== initialInstances[0], 'Zone 0 has no replacement instance.');
    assert(afterFailover[1] === initialInstances[1], 'Zone 1 was replaced although only zone 0 died.');
    // A route switch resets the connections in flight at that moment, so single failed calls around the switches are
    // expected and reported above; what must hold is that calls succeed once the switch has settled.
    (report.failover as Record<string, unknown>).callsAfterSettling = await assertServing(
      clients,
      topology,
      'after the route returned home'
    );
    await writeReport();

    // 3. A rolling replacement: a new instance size replaces both instances, one zone at a time.
    activeLoop = startInvokeLoop(clients, topology.functionName);
    const rollingStartedAt = Date.now();
    const secondDeploy = await runStackCommand({
      options,
      command: 'deploy',
      awsAccountName,
      natKind: 'ha-ec2',
      instanceSize: 't4g.micro',
      invocationId: `nat-canary-2-${run}`
    });
    const backHomeAfterRolling = await waitFor(
      'the routes to return home after the rolling update',
      async () => routesAreHome(await readRoutes(clients, topology)),
      5 * 60 * 1000
    );
    await sleep(20_000);
    const rollingSamples = await activeLoop.stop();
    activeLoop = undefined;
    const afterRolling = await readInstances(clients, topology);
    state.instanceIds = [
      ...new Set([...(state.instanceIds ?? []), ...afterRolling.filter((id): id is string => Boolean(id))])
    ];
    await writeState(options, state);
    const { Reservations } = await clients.ec2.send(
      new DescribeInstancesCommand({ InstanceIds: afterRolling.filter((id): id is string => Boolean(id)) })
    );
    const instanceTypes = (Reservations ?? [])
      .flatMap(({ Instances }) => Instances ?? [])
      .map(({ InstanceType }) => InstanceType);
    report.rollingUpdate = {
      ...secondDeploy,
      secondsUntilBackHomeAfterDeploy: backHomeAfterRolling,
      instancesBefore: afterFailover,
      instancesAfter: afterRolling,
      instanceTypes,
      calls: summarizeSamples(rollingSamples, topology.publicIps, rollingStartedAt)
    };
    await writeReport();
    assert(afterRolling.every(Boolean), 'A NAT zone has no in-service instance after the rolling update.');
    assert(
      afterRolling.every((id, index) => id !== afterFailover[index]),
      'The rolling update did not replace every instance.'
    );
    assert(
      instanceTypes.every((type) => type === 't4g.micro'),
      `Instances are ${instanceTypes.join(', ')}, not t4g.micro.`
    );
    (report.rollingUpdate as Record<string, unknown>).callsAfterSettling = await assertServing(
      clients,
      topology,
      'after the rolling update'
    );
    await writeReport();

    // 4. Unchanged redeploy: nothing is replaced.
    const thirdDeploy = await runStackCommand({
      options,
      command: 'deploy',
      awsAccountName,
      natKind: 'ha-ec2',
      instanceSize: 't4g.micro',
      invocationId: `nat-canary-3-${run}`
    });
    const afterUnchanged = await readInstances(clients, topology);
    report.unchangedRedeploy = { ...thirdDeploy, instancesBefore: afterRolling, instancesAfter: afterUnchanged };
    await writeReport();
    assert(
      JSON.stringify(afterUnchanged) === JSON.stringify(afterRolling),
      `The unchanged redeploy replaced instances: ${afterRolling.join(', ')} -> ${afterUnchanged.join(', ')}.`
    );
    assert(routesAreHome(await readRoutes(clients, topology)), 'The routes are not home after the unchanged redeploy.');
  } catch (error) {
    bodyError = error;
  } finally {
    if (activeLoop) await activeLoop.stop().catch(() => undefined);
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
  console.info(`NAT instance canary passed for ${stackName}, and its deletion was verified.`);
};

/**
 * The journey of an existing stack: gateways first, then NAT instances, then a single instance. Every switch must keep
 * the VPC, subnets and route tables (nothing stateful is replaced), remove the previous NAT kind, and end with the
 * function reaching the internet through the new kind. Between the switches, forwarding is broken on one instance so
 * the heartbeat, probe and self-replacement path has to recover without a termination.
 */
export const runNatKindSwitchCanary = async ({ cleanupOnly = false }: { cleanupOnly?: boolean } = {}) => {
  const options = resolveOptions();
  const clients = createClients(options);
  const stackName = `${options.projectName}-${STAGE}`;
  const report: Record<string, unknown> = {
    kind: 'stacktape-nat-kind-switch-canary',
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
  let activeLoop: ReturnType<typeof startInvokeLoop> | undefined;
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
    const awsAccountName = await resolveAwsAccountName(options, `nat-switch-whoami-${run}`);
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
    const recordOwned = async (topology: Topology) => {
      const instanceIds = (await readInstances(clients, topology)).filter((id): id is string => Boolean(id));
      Object.assign(state, {
        functionName: topology.functionName,
        autoscalingGroupNames: topology.autoscalingGroupNames,
        networkInterfaceIds: [...new Set([...(state.networkInterfaceIds ?? []), ...topology.networkInterfaceIds])],
        allocationIds: [...new Set([...(state.allocationIds ?? []), ...topology.allocationIds])],
        parameterNames: [...new Set([...(state.parameterNames ?? []), ...topology.parameterNames])],
        logGroupNames: [...new Set([...(state.logGroupNames ?? []), ...topology.logGroupNames])],
        instanceIds: [...new Set([...(state.instanceIds ?? []), ...instanceIds])]
      });
      await writeState(options, state);
      return instanceIds;
    };

    // 1. Gateways, as a v3 stack would have them.
    deployAttempted = true;
    const gatewayDeploy = await runStackCommand({
      options,
      command: 'deploy',
      awsAccountName,
      natKind: 'gateway',
      invocationId: `nat-switch-1-${run}`
    });
    const stack = await describeStack(clients.cloudFormation, stackName);
    assert(stack, `${stackName} does not exist after the first deploy.`);
    assertOwned(stack, options);
    state.stackId = stack.StackId;
    const gateway = await readTopology(clients, stackName, 'gateway');
    await recordOwned(gateway);
    const gatewayTargets = await readRouteTargets(clients, gateway);
    assert(
      gatewayTargets.every((target) => target?.startsWith('nat-')),
      `The private route tables do not point at NAT gateways: ${gatewayTargets.join(', ')}.`
    );
    report.gateway = {
      ...gatewayDeploy,
      publicIps: gateway.publicIps,
      routeTargets: gatewayTargets,
      calls: await assertServing(clients, gateway, 'with NAT gateways')
    };
    await writeReport();

    // 2. Switch to NAT instances. The VPC, subnets and route tables must be the same objects; the gateways must be gone.
    activeLoop = startInvokeLoop(clients, gateway.functionName);
    const switchStartedAt = Date.now();
    const haDeploy = await runStackCommand({
      options,
      command: 'deploy',
      awsAccountName,
      natKind: 'ha-ec2',
      instanceSize: 't4g.nano',
      invocationId: `nat-switch-2-${run}`
    });
    const ha = await readTopology(clients, stackName, 'ha-ec2');
    const haInstances = await recordOwned(ha);
    const homeAfterSwitch = await waitFor(
      'the routes to point at their home zones after the switch to instances',
      async () => routesAreHome(await readRoutes(clients, ha), ha.zones),
      3 * 60 * 1000
    );
    await sleep(10_000);
    const switchSamples = await activeLoop.stop();
    activeLoop = undefined;
    const resourcesAfterSwitch = await readStackResources(clients, stackName);
    const remainingGateways = resourcesAfterSwitch.filter(
      ({ ResourceType }) => ResourceType === 'AWS::EC2::NatGateway'
    );
    report.switchToInstances = {
      ...haDeploy,
      publicIps: ha.publicIps,
      instances: haInstances,
      secondsUntilRoutesHome: homeAfterSwitch,
      vpcUnchanged: ha.vpcId === gateway.vpcId,
      subnetsUnchanged: JSON.stringify(ha.subnetIds) === JSON.stringify(gateway.subnetIds),
      routeTablesUnchanged: JSON.stringify(ha.routeTableIds) === JSON.stringify(gateway.routeTableIds),
      remainingGateways: remainingGateways.length,
      callsDuringSwitch: summarizeSamples(switchSamples, [...gateway.publicIps, ...ha.publicIps], switchStartedAt),
      calls: await assertServing(clients, ha, 'after the switch to instances')
    };
    await writeReport();
    assert(ha.vpcId === gateway.vpcId, 'The switch to instances replaced the VPC.');
    assert(JSON.stringify(ha.subnetIds) === JSON.stringify(gateway.subnetIds), 'The switch replaced a subnet.');
    assert(
      JSON.stringify(ha.routeTableIds) === JSON.stringify(gateway.routeTableIds),
      'The switch replaced a route table.'
    );
    assert(remainingGateways.length === 0, `${remainingGateways.length} NAT gateways remain after the switch.`);
    assert(haInstances.length === 2 && haInstances.every(Boolean), 'A NAT zone has no in-service instance.');

    // 3. Forwarding breaks on zone 0 without the instance dying: the heartbeat stops, the probe reroutes, the instance
    //    marks itself unhealthy and gets replaced.
    activeLoop = startInvokeLoop(clients, ha.functionName);
    await sleep(10_000);
    const brokenAt = Date.now();
    const broken = await runOnInstance(clients, haInstances[0], ['nft flush ruleset', 'echo flushed']);
    assert(broken.status === 'Success', `Breaking forwarding on ${haInstances[0]} failed: ${broken.status}.`);
    const reroutedAfter = await waitFor('zone 0 to be routed through zone 1 by the probe', async () => {
      const routes = await readRoutes(clients, ha);
      return routes[0] === 1;
    });
    const backHomeAfter = await waitFor('zone 0 to be replaced and routed home again', async () => {
      const [routes, instances] = await Promise.all([readRoutes(clients, ha), readInstances(clients, ha)]);
      return routesAreHome(routes, ha.zones) && Boolean(instances[0]) && instances[0] !== haInstances[0];
    });
    await sleep(20_000);
    const brokenSamples = await activeLoop.stop();
    activeLoop = undefined;
    const afterBroken = await recordOwned(ha);
    report.brokenForwarding = {
      brokenInstance: haInstances[0],
      replacementInstance: afterBroken[0],
      secondsUntilRerouted: reroutedAfter,
      secondsUntilBackHome: backHomeAfter,
      calls: summarizeSamples(brokenSamples, ha.publicIps, brokenAt - 10_000),
      callsAfterSettling: await assertServing(clients, ha, 'after the broken instance was replaced')
    };
    await writeReport();
    assert(afterBroken[0] && afterBroken[0] !== haInstances[0], 'Zone 0 was not replaced after its forwarding broke.');

    // 4. Down to a single instance: zone 1's instance goes away and every private route table uses zone 0.
    const ec2Deploy = await runStackCommand({
      options,
      command: 'deploy',
      awsAccountName,
      natKind: 'ec2',
      instanceSize: 't4g.nano',
      invocationId: `nat-switch-3-${run}`
    });
    const single = await readTopology(clients, stackName, 'ec2');
    const singleInstances = await recordOwned(single);
    // The probe may have moved a table to the removed zone right after CloudFormation changed it; the next probe with
    // the one-zone input brings it back within a minute.
    const settledAfterSingle = await waitFor(
      'every private route table to use the single instance',
      async () => (await readRouteTargets(clients, single)).every((target) => target === single.networkInterfaceIds[0]),
      3 * 60 * 1000
    );
    const resourcesAfterSingle = await readStackResources(clients, stackName);
    const remainingGroups = resourcesAfterSingle.filter(
      ({ ResourceType }) => ResourceType === 'AWS::AutoScaling::AutoScalingGroup'
    );
    const singleTargets = await readRouteTargets(clients, single);
    report.switchToSingle = {
      ...ec2Deploy,
      publicIps: single.publicIps,
      instances: singleInstances,
      autoscalingGroups: remainingGroups.length,
      routeTargets: singleTargets,
      secondsUntilRoutesSettled: settledAfterSingle,
      vpcUnchanged: single.vpcId === gateway.vpcId,
      calls: await assertServing(clients, single, 'with a single NAT instance')
    };
    await writeReport();
    assert(single.vpcId === gateway.vpcId, 'The switch to a single instance replaced the VPC.');
    assert(remainingGroups.length === 1, `${remainingGroups.length} Auto Scaling groups remain with nat: ec2.`);
    assert(
      singleTargets.every((target) => target === single.networkInterfaceIds[0]),
      `Not every private route table uses the single instance: ${singleTargets.join(', ')}.`
    );
  } catch (error) {
    bodyError = error;
  } finally {
    if (activeLoop) await activeLoop.stop().catch(() => undefined);
    if (!cleanupOnly && deployAttempted) {
      try {
        report.cleanup = await cleanup(clients, options, stackName);
      } catch (error) {
        cleanupError = error;
        report.cleanup = { failed: String(error), recoveryCommand: cleanupCommand(options, 'switch') };
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
    console.error(`Cleanup did not finish. Keep ${options.stateFile} and run:\n${cleanupCommand(options, 'switch')}`);
  }
  if (bodyError && cleanupError)
    throw new AggregateError([bodyError, cleanupError], `The canary and its cleanup failed.`);
  if (bodyError) throw bodyError;
  if (cleanupError) throw cleanupError;
  console.info(`NAT kind-switch canary passed for ${stackName}, and its deletion was verified.`);
};

if (import.meta.main) {
  const scenario = process.argv.includes('--scenario=switch') ? runNatKindSwitchCanary : runNatInstanceCanary;
  scenario({ cleanupOnly: process.argv.includes('--cleanup-only') }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
