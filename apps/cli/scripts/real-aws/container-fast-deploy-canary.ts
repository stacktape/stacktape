/**
 * Real-AWS timing of a code-only container deploy: the fast path that registers a task definition and calls
 * UpdateService directly instead of updating the CloudFormation stack.
 *
 * It deploys `_test-stacks/container-fast-deploy` (a tiny Node.js web service behind an application load balancer and
 * the same service behind an HTTP API Gateway with a container health check) through the source-built CLI, then, for
 * every measurement, changes only the release string in the server source and deploys again. While the deploy runs it
 * polls ECS, the target group, Cloud Map and both public URLs, and it reports one timeline per service: image build
 * and push, task definition registration, UpdateService, the new task's PROVISIONING → PENDING → RUNNING (image pull
 * and container start from the task timestamps), target registration and health, Cloud Map health and when
 * `DiscoverInstances` returns the task as API Gateway calls it, the first response with the new release, the moment
 * from which every response has it, and when the CLI finished.
 *
 * The CLI must report the deploy done only once the new release serves traffic: every measurement fails when a probe
 * got an error response, or when the CLI finished before the first response with the new release.
 *
 * Guardrails (docs/testing/live-aws.md): an explicit opt-in; STS must resolve the profile to the expected account, and
 * the CLI deploys through the single active Stacktape connection to that same account; a new `v4ctrcanary-` project
 * carrying the run's owner tag; recovery state written before the first deploy; cleanup after success or failure,
 * verified with AWS; one exact `--cleanup-only` command when cleanup does not finish. `--keep` leaves the stack for a
 * later `--reuse` run (for example to compare two CLI revisions) and prints the cleanup command.
 *
 *   STP_AWS_CONTAINER_CANARY_DEPLOY=1 STP_AWS_CONTAINER_CANARY_EXPECTED_ACCOUNT_ID=<12 digits>
 *   STP_AWS_CONTAINER_CANARY_PROFILE=<name> STP_AWS_CONTAINER_CANARY_OWNER=<run id>
 *   STP_AWS_CONTAINER_CANARY_STATE_FILE=<absolute path> [STP_AWS_CONTAINER_CANARY_REPORT=<absolute path>]
 *   [STP_AWS_CONTAINER_CANARY_MEASUREMENTS=2] [STP_AWS_CONTAINER_CANARY_LABEL=<label>]
 *   pnpm --filter @stacktape/cli run test:real-aws-container-canary [-- --keep | --reuse | --cleanup-only]
 */
import {
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStackResourcesCommand,
  DescribeStacksCommand,
  waitUntilStackDeleteComplete,
  type Stack,
  type StackResource
} from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, DeleteLogGroupCommand, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DescribeRepositoriesCommand, ECRClient } from '@aws-sdk/client-ecr';
import {
  DescribeServicesCommand,
  DescribeTasksCommand,
  ECSClient,
  ListServiceDeploymentsCommand,
  ListTasksCommand,
  type Task
} from '@aws-sdk/client-ecs';
import {
  DescribeLoadBalancersCommand,
  DescribeTargetHealthCommand,
  ElasticLoadBalancingV2Client
} from '@aws-sdk/client-elastic-load-balancing-v2';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import {
  DiscoverInstancesCommand,
  GetInstancesHealthStatusCommand,
  GetNamespaceCommand,
  GetServiceCommand,
  ServiceDiscoveryClient
} from '@aws-sdk/client-servicediscovery';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { randomBytes } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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
  measurements: number;
  label: string;
};
type State = {
  accountId: string;
  region: string;
  projectName: string;
  stage: string;
  stackName: string;
  owner: string;
  awsAccountName: string;
  workDirectory: string;
  measurementsDone: number;
  stackId?: string;
  deploymentBucket?: string;
  ecrRepository?: string;
  logGroupNames?: string[];
  cleanupVerifiedAt?: string;
};
type Clients = {
  cloudFormation: CloudFormationClient;
  ecr: ECRClient;
  ecs: ECSClient;
  elb: ElasticLoadBalancingV2Client;
  logs: CloudWatchLogsClient;
  s3: S3Client;
  serviceDiscovery: ServiceDiscoveryClient;
  sts: STSClient;
};
type AgentRecord = Record<string, unknown> & { type: string };
type TimedRecord = AgentRecord & { at: number };
type ServiceTarget = {
  name: string;
  serviceArn: string;
  cluster: string;
  targetGroupArns: string[];
  url: string;
};

const PREFIX = 'STP_AWS_CONTAINER_CANARY_';
const STAGE = 'canary';
const OWNER_TAG = 'stacktape-canary-owner';
const CLI_DIRECTORY = join(import.meta.dir, '..', '..');
const REPO_ROOT = join(CLI_DIRECTORY, '..', '..');
const FIXTURE_DIRECTORY = join(CLI_DIRECTORY, '_test-stacks', 'container-fast-deploy');
const SERVICES = ['albweb', 'apiweb'] as const;
const COMMAND_TIMEOUT_MS = 30 * 60 * 1000;
/** How long the observers keep running after the CLI exits, to see the old tasks drain and stop. */
const SETTLE_TIMEOUT_MS = 5 * 60 * 1000;

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
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
    env[`${PREFIX}PROJECT_NAME`]?.trim() || `v4ctrcanary-${Date.now().toString(36)}-${randomBytes(2).toString('hex')}`;
  assert(
    projectName.length <= 40 && /^v4ctrcanary-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(projectName),
    `${PREFIX}PROJECT_NAME must start with v4ctrcanary- and contain only lowercase letters, digits and dashes.`
  );
  const owner = env[`${PREFIX}OWNER`]?.trim() ?? '';
  assert(/^[\w.:-]{1,128}$/.test(owner), `${PREFIX}OWNER must identify this run.`);
  const stateFile = env[`${PREFIX}STATE_FILE`]?.trim() ?? '';
  assert(isAbsolute(stateFile), `${PREFIX}STATE_FILE must be an absolute path.`);
  const reportFile = env[`${PREFIX}REPORT`]?.trim();
  assert(!reportFile || isAbsolute(reportFile), `${PREFIX}REPORT must be an absolute path.`);
  const measurements = Number(env[`${PREFIX}MEASUREMENTS`]?.trim() || 2);
  assert(Number.isInteger(measurements) && measurements >= 0 && measurements <= 10, 'MEASUREMENTS must be 0 to 10.');
  const label = env[`${PREFIX}LABEL`]?.trim() || 'run';
  assert(/^[\w.-]{1,40}$/.test(label), `${PREFIX}LABEL must be a short word.`);
  return {
    expectedAccountId,
    profile,
    region,
    projectName,
    owner,
    stateFile,
    measurements,
    label,
    ...(reportFile && { reportFile })
  };
};

const createClients = ({ profile, region }: Options): Clients => {
  const config = { credentials: fromIni({ profile }), region, maxAttempts: 6, ignoreConfiguredEndpointUrls: true };
  return {
    cloudFormation: new CloudFormationClient(config),
    ecr: new ECRClient(config),
    ecs: new ECSClient(config),
    elb: new ElasticLoadBalancingV2Client(config),
    logs: new CloudWatchLogsClient(config),
    s3: new S3Client(config),
    serviceDiscovery: new ServiceDiscoveryClient(config),
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
const stopActiveChild = (signal: NodeJS.Signals = 'SIGTERM') => {
  if (!activeChild) return;
  try {
    process.kill(-activeChild.pid, signal);
  } catch {
    activeChild.kill(signal);
  }
};

/** The environment of a source-built CLI command: the profile and no inherited credentials or API key. */
const sourceCliEnvironment = (options: Options, invocationId: string): Environment => {
  const env: Environment = {
    ...process.env,
    AWS_PROFILE: options.profile,
    AWS_DEFAULT_PROFILE: options.profile,
    AWS_SDK_LOAD_CONFIG: '1',
    AWS_IGNORE_CONFIGURED_ENDPOINT_URLS: 'true',
    STP_DISABLE_TELEMETRY: '1',
    STP_INVOCATION_ID: invocationId
  };
  // The key comes from apps/cli/.env.local, which the dev runner loads; nothing inherited may replace or suppress it.
  for (const name of ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'STACKTAPE_API_KEY']) {
    delete env[name];
  }
  delete env.SKIP_LOADING_ENV;
  return env;
};

/**
 * One source-built CLI command, `pnpm dev:cli <args> --agent`. Every agent record is stamped with the time it arrived,
 * so CLI phases line up with what the observers saw in AWS.
 */
const runSourceCli = async ({
  options,
  args,
  invocationId
}: {
  options: Options;
  args: string[];
  invocationId: string;
}) => {
  const cliArgs = ['dev:cli', ...args, '--agent'];
  const child = Bun.spawn({
    cmd: ['pnpm', ...cliArgs],
    cwd: REPO_ROOT,
    env: sourceCliEnvironment(options, invocationId),
    stdout: 'pipe',
    stderr: 'pipe',
    detached: true
  });
  activeChild = child;
  const timer = setTimeout(() => stopActiveChild('SIGKILL'), COMMAND_TIMEOUT_MS);
  const records: TimedRecord[] = [];
  const readStdout = async () => {
    const decoder = new TextDecoder();
    let buffered = '';
    for await (const chunk of child.stdout) {
      buffered += decoder.decode(chunk, { stream: true });
      const lines = buffered.split(/\r?\n/);
      buffered = lines.pop() ?? '';
      const at = Date.now();
      for (const line of lines) {
        if (!line.trim().startsWith('{')) continue;
        try {
          const value: unknown = JSON.parse(line);
          if (isRecord(value) && typeof value.type === 'string') records.push({ ...(value as AgentRecord), at });
        } catch {}
      }
    }
  };
  const [, stderr, exitCode] = await Promise.all([
    readStdout(),
    new Response(child.stderr).text(),
    child.exited
  ]).finally(() => {
    clearTimeout(timer);
    activeChild = undefined;
  });
  const exitedAt = Date.now();
  await rm(join(CLI_DIRECTORY, '.stacktape', invocationId), { recursive: true, force: true });
  const result = records.findLast(({ type }) => type === 'result') as
    | (TimedRecord & { ok?: unknown; code?: unknown; message?: unknown; data?: unknown })
    | undefined;
  assert(
    exitCode === 0 && result?.ok === true,
    `CLI ${args[0]} failed (${exitCode}): ${String(result?.code)}: ${String(result?.message)}\n${stderr.trim().slice(-2000)}`
  );
  return { records, result, exitedAt };
};

/**
 * The Stacktape connection the CLI must use: the single active connection to the expected account. A privileged
 * connection gives the CLI Stacktape-issued credentials instead of the profile's, so a wrong name would deploy elsewhere.
 */
const resolveAwsAccountName = async (options: Options, invocationId: string) => {
  const { result } = await runSourceCli({ options, args: ['info:whoami'], invocationId });
  const whoami = isRecord(result?.data) && isRecord(result.data.result) ? result.data.result : {};
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

const runStackCommand = (options: Options, state: State, command: 'deploy' | 'delete', invocationId: string) =>
  runSourceCli({
    options,
    invocationId,
    args: [
      command,
      '--configPath',
      join(state.workDirectory, 'stacktape.yml'),
      '--currentWorkingDirectory',
      state.workDirectory,
      '--projectName',
      options.projectName,
      '--stage',
      STAGE,
      '--region',
      options.region,
      '--profile',
      options.profile,
      '--awsAccount',
      state.awsAccountName,
      ...(command === 'deploy' ? ['--autoConfirmOperation'] : [])
    ]
  });

const prepareWorkDirectory = async (directory: string, owner: string) => {
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  await cp(FIXTURE_DIRECTORY, directory, { recursive: true, force: true });
  const configPath = join(directory, 'stacktape.yml');
  const config = await readFile(configPath, 'utf8');
  await writeFile(configPath, config.replace(/(name: stacktape-canary-owner\n\s+value: )local/, `$1${owner}`));
};

const setRelease = async (state: State, release: string) => {
  const serverPath = join(state.workDirectory, 'src', 'server.ts');
  const source = await readFile(serverPath, 'utf8');
  const updated = source.replace(/const RELEASE = '[^']*';/, `const RELEASE = '${release}';`);
  assert(updated !== source || source.includes(`'${release}'`), 'The fixture server has no RELEASE line.');
  await writeFile(serverPath, updated);
};

const readStackResources = async (clients: Clients, stackName: string): Promise<StackResource[]> =>
  (await clients.cloudFormation.send(new DescribeStackResourcesCommand({ StackName: stackName }))).StackResources ?? [];

/** The two services of the fixture with their target groups and public URLs. */
const resolveServiceTargets = async (clients: Clients, options: Options, stackName: string) => {
  const resources = await readStackResources(clients, stackName);
  const physical = (logicalId: string) =>
    resources.find(({ LogicalResourceId }) => LogicalResourceId === logicalId)?.PhysicalResourceId;
  const ofType = (type: string) => resources.filter(({ ResourceType }) => ResourceType === type);
  const loadBalancerArn = ofType('AWS::ElasticLoadBalancingV2::LoadBalancer')[0]?.PhysicalResourceId;
  assert(loadBalancerArn, 'The stack has no load balancer.');
  const { LoadBalancers } = await clients.elb.send(
    new DescribeLoadBalancersCommand({ LoadBalancerArns: [loadBalancerArn] })
  );
  // The HTTP listener redirects to HTTPS, and the HTTPS listener serves a certificate for no name of the load balancer.
  const albUrl = `https://${LoadBalancers?.[0]?.DNSName}/`;
  const apiId = ofType('AWS::ApiGatewayV2::Api')[0]?.PhysicalResourceId;
  assert(apiId, 'The stack has no HTTP API.');
  const apiUrl = `https://${apiId}.execute-api.${options.region}.amazonaws.com/`;
  return SERVICES.map((name): ServiceTarget => {
    const serviceArn = physical(cfLogicalNames.ecsService(name, false));
    assert(serviceArn, `The stack has no ECS service for ${name}.`);
    const targetGroupArns = ofType('AWS::ElasticLoadBalancingV2::TargetGroup')
      .filter(({ LogicalResourceId }) => LogicalResourceId?.toLowerCase().startsWith(name))
      .map(({ PhysicalResourceId }) => PhysicalResourceId!);
    return {
      name,
      serviceArn,
      cluster: serviceArn.split('/')[1]!,
      targetGroupArns,
      url: name === 'albweb' ? albUrl : apiUrl
    };
  });
};

const describeOwnedResources = (resources: StackResource[]) => ({
  deploymentBucket: resources.find(({ LogicalResourceId }) => LogicalResourceId === cfLogicalNames.deploymentBucket())
    ?.PhysicalResourceId,
  ecrRepository: resources.find(({ ResourceType }) => ResourceType === 'AWS::ECR::Repository')?.PhysicalResourceId,
  logGroupNames: resources
    .filter(({ ResourceType }) => ResourceType === 'AWS::Logs::LogGroup')
    .map(({ PhysicalResourceId }) => PhysicalResourceId!)
});

/** Everything the observers saw about one service during one deploy, in epoch milliseconds. */
type ServiceObservation = {
  deploymentId?: string;
  deploymentCreatedAt?: number;
  taskArns: Set<string>;
  oldTaskArns: Set<string>;
  oldIps: Set<string>;
  tasks: Map<string, Task>;
  firstSeen: Map<string, number>;
  serviceDeploymentSuccessfulAt?: number;
  rolloutCompletedAt?: number;
  oldTasksStoppedAt?: number;
  oldTargetsGoneAt?: number;
  /** When Cloud Map stopped listing every old task as an instance. */
  oldInstancesGoneAt?: number;
  probes: { at: number; release?: string; error?: string }[];
};

const firstTime = (map: Map<string, number>, key: string, at: number) => {
  if (!map.has(key)) map.set(key, at);
};
const ipOf = (task: Task) =>
  task.attachments?.flatMap(({ details }) => details ?? []).find(({ name }) => name === 'privateIPv4Address')?.value;

const listServiceTasks = async (clients: Clients, target: ServiceTarget) => {
  const arns: string[] = [];
  for (const desiredStatus of ['RUNNING', 'STOPPED'] as const) {
    const { taskArns } = await clients.ecs.send(
      new ListTasksCommand({ cluster: target.cluster, serviceName: target.serviceArn.split('/').at(-1), desiredStatus })
    );
    arns.push(...(taskArns ?? []));
  }
  if (!arns.length) return [];
  const { tasks } = await clients.ecs.send(
    new DescribeTasksCommand({ cluster: target.cluster, tasks: arns.slice(0, 100) })
  );
  return tasks ?? [];
};

/** Polls ECS, the target groups and the public URL of one service until `stop` is called. */
const observeService = (
  clients: Clients,
  target: ServiceTarget,
  before: { taskArns: Set<string>; ips: Set<string>; deploymentIds: Set<string> },
  release: string
) => {
  const observation: ServiceObservation = {
    taskArns: new Set(),
    oldTaskArns: before.taskArns,
    oldIps: before.ips,
    tasks: new Map(),
    firstSeen: new Map(),
    probes: []
  };
  const stopping = new AbortController();
  /** Cloud Map service ID → the names `DiscoverInstances` takes. */
  const discoveryNames = new Map<string, { NamespaceName: string; ServiceName: string }>();
  const ecsLoop = async () => {
    while (!stopping.signal.aborted) {
      const loopStartedAt = Date.now();
      try {
        const { services } = await clients.ecs.send(
          new DescribeServicesCommand({ cluster: target.cluster, services: [target.serviceArn] })
        );
        const at = Date.now();
        const deployment = services?.[0]?.deployments?.find(({ id }) => id && !before.deploymentIds.has(id));
        for (const { registryArn } of services?.[0]?.serviceRegistries ?? []) {
          const { Status = {} } = await clients.serviceDiscovery.send(
            new GetInstancesHealthStatusCommand({ ServiceId: registryArn!.split('/').at(-1) })
          );
          const instanceAt = Date.now();
          for (const [instanceId, status] of Object.entries(Status)) {
            firstTime(observation.firstSeen, `cloudmap:${instanceId}:${status}`, instanceAt);
          }
          const oldListed = [...before.taskArns].some((arn) => Status[arn.split('/').at(-1)!] !== undefined);
          if (!oldListed && observation.deploymentId) observation.oldInstancesGoneAt ??= instanceAt;
          const serviceId = registryArn!.split('/').at(-1)!;
          if (!discoveryNames.has(serviceId)) {
            const { Service } = await clients.serviceDiscovery.send(new GetServiceCommand({ Id: serviceId }));
            const { Namespace } = await clients.serviceDiscovery.send(
              new GetNamespaceCommand({ Id: Service?.NamespaceId })
            );
            discoveryNames.set(serviceId, { NamespaceName: Namespace!.Name!, ServiceName: Service!.Name! });
          }
          // The call API Gateway makes to find the tasks: while no instance is healthy, it returns all of them.
          const { Instances = [] } = await clients.serviceDiscovery.send(
            new DiscoverInstancesCommand({ ...discoveryNames.get(serviceId)!, HealthStatus: 'HEALTHY_OR_ELSE_ALL' })
          );
          const discoveredAt = Date.now();
          for (const { InstanceId } of Instances)
            firstTime(observation.firstSeen, `discoverable:${InstanceId}`, discoveredAt);
        }
        if (deployment?.id) {
          observation.deploymentId = deployment.id;
          observation.deploymentCreatedAt ??= deployment.createdAt?.getTime();
          if (deployment.rolloutState === 'COMPLETED') observation.rolloutCompletedAt ??= at;
          const { serviceDeployments } = await clients.ecs.send(
            new ListServiceDeploymentsCommand({ cluster: target.cluster, service: target.serviceArn })
          );
          const revisionId = deployment.id.split('/').at(-1);
          const serviceDeployment = serviceDeployments?.find(({ targetServiceRevisionArn }) =>
            targetServiceRevisionArn?.endsWith(`/${revisionId}`)
          );
          if (serviceDeployment?.status === 'SUCCESSFUL') observation.serviceDeploymentSuccessfulAt ??= at;
        }
        const tasks = await listServiceTasks(clients, target);
        const taskAt = Date.now();
        for (const task of tasks) {
          if (!task.taskArn) continue;
          if (observation.deploymentId && task.startedBy === observation.deploymentId) {
            observation.taskArns.add(task.taskArn);
            observation.tasks.set(task.taskArn, task);
            firstTime(observation.firstSeen, `${task.taskArn}:${task.lastStatus}`, taskAt);
            if (task.healthStatus === 'HEALTHY') firstTime(observation.firstSeen, `${task.taskArn}:HEALTHY`, taskAt);
          } else if (before.taskArns.has(task.taskArn)) {
            observation.tasks.set(task.taskArn, task);
          }
        }
        const oldTasks = [...before.taskArns].map((arn) => observation.tasks.get(arn));
        if (oldTasks.length && oldTasks.every((task) => task?.lastStatus === 'STOPPED')) {
          observation.oldTasksStoppedAt ??= taskAt;
        }
        for (const targetGroupArn of target.targetGroupArns) {
          const { TargetHealthDescriptions } = await clients.elb.send(
            new DescribeTargetHealthCommand({ TargetGroupArn: targetGroupArn })
          );
          const healthAt = Date.now();
          const newIps = new Set(
            [...observation.taskArns].map((arn) => ipOf(observation.tasks.get(arn)!)).filter(Boolean)
          );
          for (const { Target, TargetHealth } of TargetHealthDescriptions ?? []) {
            if (Target?.Id && newIps.has(Target.Id)) {
              firstTime(observation.firstSeen, `target:${Target.Id}:${TargetHealth?.State}`, healthAt);
            }
          }
          const oldStillRegistered = (TargetHealthDescriptions ?? []).some(
            ({ Target, TargetHealth }) => Target?.Id && before.ips.has(Target.Id) && TargetHealth?.State !== 'draining'
          );
          if (!oldStillRegistered && observation.deploymentId) observation.oldTargetsGoneAt ??= healthAt;
        }
      } catch (error) {
        console.warn(`[${target.name}] observer: ${String(error).slice(0, 200)}`);
      }
      await sleep(Math.max(0, 1000 - (Date.now() - loopStartedAt)));
    }
  };
  const probeLoop = async () => {
    while (!stopping.signal.aborted) {
      const at = Date.now();
      try {
        const response = await fetch(`${target.url}?probe=${at}`, {
          signal: AbortSignal.timeout(3000),
          tls: { rejectUnauthorized: false }
        });
        const body = await response.text();
        const parsed = response.ok ? (JSON.parse(body) as { release?: string }) : undefined;
        observation.probes.push(
          parsed?.release ? { at, release: parsed.release } : { at, error: `HTTP ${response.status}` }
        );
      } catch (error) {
        observation.probes.push({ at, error: String(error).slice(0, 120) });
      }
      await sleep(Math.max(0, 250 - (Date.now() - at)));
    }
  };
  const loops = Promise.all([ecsLoop(), probeLoop()]);
  return {
    observation,
    /** Whether the old tasks are gone and the probes have answered only with the new release for 15 seconds. */
    settled: () => {
      const recent = observation.probes.filter(({ at }) => at > Date.now() - 15_000);
      return (
        observation.oldTasksStoppedAt !== undefined &&
        recent.length > 10 &&
        recent.every((probe) => probe.release === release)
      );
    },
    stop: async () => {
      stopping.abort();
      await loops;
    }
  };
};

const snapshotService = async (clients: Clients, target: ServiceTarget) => {
  const { services } = await clients.ecs.send(
    new DescribeServicesCommand({ cluster: target.cluster, services: [target.serviceArn] })
  );
  const tasks = (await listServiceTasks(clients, target)).filter(({ lastStatus }) => lastStatus !== 'STOPPED');
  return {
    deploymentIds: new Set((services?.[0]?.deployments ?? []).map(({ id }) => id!)),
    taskArns: new Set(tasks.map(({ taskArn }) => taskArn!)),
    ips: new Set(tasks.map(ipOf).filter((ip): ip is string => Boolean(ip)))
  };
};

const seconds = (from: number, to: number | undefined) =>
  to === undefined || Number.isNaN(to) ? null : Math.round((to - from) / 100) / 10;

/** The timeline of one service, in seconds after the CLI started. */
const summarizeService = ({
  target,
  observation,
  records,
  cliStartedAt,
  cliDoneAt,
  release
}: {
  target: ServiceTarget;
  observation: ServiceObservation;
  records: TimedRecord[];
  cliStartedAt: number;
  cliDoneAt: number;
  release: string;
}) => {
  const at = (time: number | undefined) => seconds(cliStartedAt, time);
  const eventTime = (eventType: string, status: string, instance?: string) =>
    records.find(
      (record) =>
        record.eventType === eventType &&
        record.status === status &&
        (!instance || String(record.instanceId ?? '').includes(instance))
    )?.at;
  const tasks = [...observation.taskArns].map((arn) => observation.tasks.get(arn)!);
  const latest = (values: (number | undefined)[]) =>
    values.some((value) => value === undefined) || !values.length ? undefined : Math.max(...(values as number[]));
  const taskTime = (pick: (task: Task) => Date | undefined) => latest(tasks.map((task) => pick(task)?.getTime()));
  const seen = (suffix: string) => latest(tasks.map((task) => observation.firstSeen.get(`${task.taskArn}:${suffix}`)));
  const targetSeen = (state: string) =>
    target.targetGroupArns.length
      ? latest(tasks.map((task) => observation.firstSeen.get(`target:${ipOf(task)}:${state}`)))
      : undefined;
  const probes = observation.probes.filter(({ at: probeAt }) => probeAt >= cliStartedAt);
  const firstNew = probes.find((probe) => probe.release === release)?.at;
  const lastOld = probes.findLast((probe) => probe.release !== release && !probe.error)?.at;
  const errors = probes.filter((probe) => probe.error);
  const allNewFrom = firstNew === undefined ? undefined : probes.find((probe) => probe.at > (lastOld ?? 0))?.at;
  return {
    service: target.name,
    imageBuilt: at(eventTime('BUILD_IMAGE', 'completed', target.name) ?? eventTime('PACKAGE_ARTIFACTS', 'completed')),
    imagePushed: at(
      eventTime('UPLOAD_IMAGE', 'completed', target.name) ?? eventTime('UPLOAD_DEPLOYMENT_ARTIFACTS', 'completed')
    ),
    taskDefinitionRegistered: at(eventTime('REGISTER_ECS_TASK_DEFINITION', 'completed', target.name)),
    updateServiceStarted: at(eventTime('UPDATE_ECS_SERVICE', 'started', target.name)),
    deploymentCreated: at(observation.deploymentCreatedAt),
    taskCreated: at(taskTime(({ createdAt }) => createdAt)),
    pending: at(seen('PENDING')),
    pullStarted: at(taskTime(({ pullStartedAt }) => pullStartedAt)),
    pullStopped: at(taskTime(({ pullStoppedAt }) => pullStoppedAt)),
    containerStarted: at(taskTime(({ startedAt }) => startedAt)),
    runningSeen: at(seen('RUNNING')),
    taskHealthySeen: at(seen('HEALTHY')),
    targetRegisteredSeen: at(targetSeen('initial')),
    targetHealthySeen: at(targetSeen('healthy')),
    cloudMapRegisteredSeen: at(
      latest(
        tasks.map((task) => {
          const id = task.taskArn!.split('/').at(-1);
          const times = ['HEALTHY', 'UNHEALTHY', 'UNKNOWN'].map((status) =>
            observation.firstSeen.get(`cloudmap:${id}:${status}`)
          );
          return times.some((time) => time !== undefined)
            ? Math.min(...times.filter((time): time is number => time !== undefined))
            : undefined;
        })
      )
    ),
    cloudMapHealthySeen: at(
      latest(tasks.map((task) => observation.firstSeen.get(`cloudmap:${task.taskArn!.split('/').at(-1)}:HEALTHY`)))
    ),
    discoverableSeen: at(
      latest(tasks.map((task) => observation.firstSeen.get(`discoverable:${task.taskArn!.split('/').at(-1)}`)))
    ),
    firstNewResponse: at(firstNew),
    serviceUpdatedInCli: at(eventTime('UPDATE_ECS_SERVICE', 'completed', target.name)),
    cliDone: at(cliDoneAt),
    ecsDeploymentSuccessful: at(observation.serviceDeploymentSuccessfulAt),
    oldTargetsDraining: at(observation.oldTargetsGoneAt),
    oldInstancesDeregistered: at(observation.oldInstancesGoneAt),
    oldTaskStopping: at(
      latest([...observation.oldTaskArns].map((arn) => observation.tasks.get(arn)?.stoppingAt?.getTime()))
    ),
    allResponsesNewFrom: at(allNewFrom),
    oldTasksStopped: at(observation.oldTasksStoppedAt),
    rolloutCompleted: at(observation.rolloutCompletedAt),
    taskCount: tasks.length,
    probes: probes.length,
    failedProbes: errors.length,
    failedProbesBetween: errors.length ? [at(errors[0]!.at), at(errors.at(-1)!.at)] : null,
    failedProbeSamples: [...new Set(errors.map(({ error }) => error))].slice(0, 3)
  };
};

const measure = async ({
  clients,
  options,
  state,
  targets,
  release
}: {
  clients: Clients;
  options: Options;
  state: State;
  targets: ServiceTarget[];
  release: string;
}) => {
  await setRelease(state, release);
  const befores = await Promise.all(targets.map((target) => snapshotService(clients, target)));
  const observers = targets.map((target, index) => observeService(clients, target, befores[index]!, release));
  try {
    const { records, exitedAt } = await runStackCommand(options, state, 'deploy', `container-canary-${release}`);
    const cliStartedAt = records[0]?.at ?? exitedAt;
    const settleDeadline = Date.now() + SETTLE_TIMEOUT_MS;
    while (Date.now() < settleDeadline && !observers.every(({ settled }) => settled())) await sleep(1000);
    await Promise.all(observers.map(({ stop }) => stop()));
    const fastPath = records.some(({ eventType }) => eventType === 'HOTSWAP_UPDATE');
    const services = targets.map((target, index) =>
      summarizeService({
        target,
        observation: observers[index]!.observation,
        records,
        cliStartedAt,
        cliDoneAt: exitedAt,
        release
      })
    );
    const events = records
      .filter(({ type, status }) => type === 'event' && (status === 'started' || status === 'completed'))
      .map(({ at, eventType, status, instanceId }) => ({
        at: seconds(cliStartedAt, at),
        eventType,
        status,
        ...(instanceId ? { instanceId } : {})
      }));
    return { release, fastPath, cliSeconds: seconds(cliStartedAt, exitedAt), services, events };
  } finally {
    await Promise.all(observers.map(({ stop }) => stop()));
  }
};

const isMissing = (error: unknown, names: string[]) =>
  error instanceof Error && (names.includes(error.name) || /not ?found|does not exist/i.test(error.message));

/** Deletes the stack with the CLI (which empties its bucket and image repository), then checks AWS. */
const cleanup = async (clients: Clients, options: Options, stackName: string) => {
  const state = await readState(options, stackName);
  const stack = await describeStack(clients.cloudFormation, stackName);
  const verification: Record<string, unknown> = {};
  if (stack) {
    assertOwned(stack, options, state);
    Object.assign(state, describeOwnedResources(await readStackResources(clients, stackName)));
    await writeState(options, state);
    try {
      await runStackCommand(options, state, 'delete', `container-canary-delete-${Date.now()}`);
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
  if (state.deploymentBucket) {
    const gone = await clients.s3.send(new HeadBucketCommand({ Bucket: state.deploymentBucket })).then(
      () => false,
      (error: unknown) => isMissing(error, ['NotFound', 'NoSuchBucket'])
    );
    assert(gone, `The deployment bucket ${state.deploymentBucket} still exists.`);
    verification.deploymentBucket = 'absent';
  }
  if (state.ecrRepository) {
    const gone = await clients.ecr
      .send(new DescribeRepositoriesCommand({ repositoryNames: [state.ecrRepository] }))
      .then(
        () => false,
        (error: unknown) => isMissing(error, ['RepositoryNotFoundException'])
      );
    assert(gone, `The image repository ${state.ecrRepository} still exists.`);
    verification.ecrRepository = 'absent';
  }
  // ECS can deliver a stopping task's last log lines after the stack removed its group; only these names are owned.
  for (const logGroupName of state.logGroupNames ?? []) {
    const existing = await clients.logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName }));
    if (existing.logGroups?.some((group) => group.logGroupName === logGroupName)) {
      await clients.logs.send(new DeleteLogGroupCommand({ logGroupName }));
    }
    const after = await clients.logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName }));
    assert(!after.logGroups?.some((group) => group.logGroupName === logGroupName), `${logGroupName} still exists.`);
  }
  verification.logGroups = `${state.logGroupNames?.length ?? 0} absent`;
  await rm(state.workDirectory, { recursive: true, force: true });
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
    'pnpm --filter @stacktape/cli run test:real-aws-container-canary -- --cleanup-only'
  ].join(' ');

/** Failures of the promise this canary checks: the CLI is done only when the new release serves without errors. */
const findViolations = (measurement: Awaited<ReturnType<typeof measure>>) =>
  [
    !measurement.fastPath && 'the deploy did not take the fast path',
    ...measurement.services.flatMap((service) => [
      service.failedProbes > 0 && `${service.service}: ${service.failedProbes} probes failed`,
      (service.firstNewResponse === null ||
        (service.serviceUpdatedInCli !== null && service.firstNewResponse > service.serviceUpdatedInCli + 1)) &&
        `${service.service}: the CLI reported the service updated before it served the new release`
    ])
  ].filter((violation): violation is string => Boolean(violation));

export const runContainerFastDeployCanary = async ({
  cleanupOnly = false,
  keep = false,
  reuse = false
}: { cleanupOnly?: boolean; keep?: boolean; reuse?: boolean } = {}) => {
  const options = resolveOptions();
  const clients = createClients(options);
  const stackName = `${options.projectName}-${STAGE}`;
  const existingReport = options.reportFile
    ? await readFile(options.reportFile, 'utf8').then(
        (content) => JSON.parse(content) as Record<string, unknown>,
        () => undefined
      )
    : undefined;
  const report: Record<string, unknown> & { measurements: unknown[] } = {
    kind: 'stacktape-container-fast-deploy-canary',
    region: options.region,
    projectName: options.projectName,
    stackName,
    owner: options.owner,
    ...existingReport,
    measurements: Array.isArray(existingReport?.measurements) ? existingReport.measurements : []
  };
  const writeReport = () =>
    options.reportFile ? writeFile(options.reportFile, `${JSON.stringify(report, null, 2)}\n`) : Promise.resolve();
  let deployAttempted = reuse;
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
    if (cleanupOnly) {
      report.cleanup = await cleanup(clients, options, stackName);
      return;
    }
    assert(await hasDevApiKey(), 'apps/cli/.env.local sets no STACKTAPE_API_KEY.');
    let state: State;
    if (reuse) {
      state = await readState(options, stackName);
      const stack = await describeStack(clients.cloudFormation, stackName);
      assert(stack, `${stackName} does not exist; run without --reuse first.`);
      assertOwned(stack, options, state);
    } else {
      const run = options.owner.replace(/[^\w-]/g, '-');
      const awsAccountName = await resolveAwsAccountName(options, `container-canary-whoami-${run}`);
      assert(
        !(await describeStack(clients.cloudFormation, stackName)),
        `Refusing to mutate existing stack ${stackName}.`
      );
      state = {
        accountId: options.expectedAccountId,
        region: options.region,
        projectName: options.projectName,
        stage: STAGE,
        stackName,
        owner: options.owner,
        awsAccountName,
        workDirectory: join(tmpdir(), `stacktape-container-canary-${options.projectName}`),
        measurementsDone: 0
      };
      await writeState(options, state);
      await prepareWorkDirectory(state.workDirectory, options.owner);
      // A rejected preflight above authorizes no cleanup; from here on, cleanup always runs.
      deployAttempted = true;
      const createdAt = Date.now();
      await runStackCommand(options, state, 'deploy', `container-canary-create-${run}`);
      const stack = await describeStack(clients.cloudFormation, stackName);
      assert(stack?.StackId, `${stackName} was not created.`);
      assertOwned(stack, options);
      Object.assign(
        state,
        { stackId: stack.StackId },
        describeOwnedResources(await readStackResources(clients, stackName))
      );
      await writeState(options, state);
      report.createSeconds = seconds(createdAt, Date.now());
    }
    const targets = await resolveServiceTargets(clients, options, stackName);
    report.urls = Object.fromEntries(targets.map(({ name, url }) => [name, url]));
    const violations: string[] = [];
    for (let index = 0; index < options.measurements; index += 1) {
      state.measurementsDone += 1;
      await writeState(options, state);
      const measurement = await measure({ clients, options, state, targets, release: `r${state.measurementsDone}` });
      const measurementViolations = findViolations(measurement);
      report.measurements.push({ label: options.label, ...measurement, violations: measurementViolations });
      violations.push(...measurementViolations);
      await writeReport();
      console.info(
        `[${options.label}] ${measurement.release}: CLI ${measurement.cliSeconds} s, fast path ${measurement.fastPath}`
      );
      console.table(measurement.services);
    }
    assert(!violations.length, `The fast deploy broke its promise:\n${violations.join('\n')}`);
  } catch (error) {
    bodyError = error;
  } finally {
    if (deployAttempted && !keep) {
      try {
        report.cleanup = await cleanup(clients, options, stackName);
      } catch (error) {
        cleanupError = error;
      }
    }
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    if (bodyError) report.error = String(bodyError);
    if (cleanupError) report.cleanupError = String(cleanupError);
    await writeReport();
  }
  if (keep && deployAttempted) console.info(`The stack is kept. Remove it with:\n${cleanupCommand(options)}`);
  if (cleanupError) {
    console.error(`Cleanup did not finish. Run:\n${cleanupCommand(options)}`);
    throw cleanupError;
  }
  if (bodyError) throw bodyError;
};

if (import.meta.main) {
  runContainerFastDeployCanary({
    cleanupOnly: process.argv.includes('--cleanup-only'),
    keep: process.argv.includes('--keep'),
    reuse: process.argv.includes('--reuse')
  }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
