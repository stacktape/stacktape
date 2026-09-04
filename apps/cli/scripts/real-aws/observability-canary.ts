import {
  CloudFormationClient,
  DeleteStackCommand,
  DescribeStacksCommand,
  ListStackResourcesCommand,
  waitUntilStackDeleteComplete,
  type Stack,
  type StackResourceSummary
} from '@aws-sdk/client-cloudformation';
import { CloudWatchClient, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { GetCanaryCommand, GetCanaryRunsCommand, SyntheticsClient } from '@aws-sdk/client-synthetics';
import { fromEnv, fromIni } from '@aws-sdk/credential-providers';
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  assertCliVersionOutput,
  assertOwnedStack,
  buildCanaryEnvironment,
  resolveCanaryOptions,
  type CanaryOptions
} from './packaging-canary';

const fixtureConfigPath = '_test-stacks/observability-smoke/stacktape.ts';
const cliDirectory = join(import.meta.dir, '..', '..');
const stage = 'dev';
const commandTimeoutMs = 60 * 60_000;
const stackDeleteTimeoutSeconds = 30 * 60;

type CanaryState = {
  accountId: string;
  owner: string;
  stackId?: string;
  stackName: string;
};

type StackInfoResource = {
  referencableParams?: Record<string, { value?: unknown }>;
  resourceType?: string;
};

type ObservabilityStackInfo = {
  apiUrl: string;
  webUrl: string;
};

type Clients = {
  cloudFormation: CloudFormationClient;
  cloudWatch: CloudWatchClient;
  logs: CloudWatchLogsClient;
  s3: S3Client;
  sts: STSClient;
  synthetics: SyntheticsClient;
};

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const requiredString = (value: unknown, label: string) => {
  assert(typeof value === 'string' && value.trim(), `${label} is missing.`);
  return value;
};

const readResourceUrl = (resource: StackInfoResource | undefined, name: string) =>
  requiredString(resource?.referencableParams?.url?.value, `${name}.url`);

export const extractObservabilityStackInfo = (stack: Pick<Stack, 'Outputs'>): ObservabilityStackInfo => {
  const output = stack.Outputs?.find(({ OutputKey }) => OutputKey === 'StpStackInfoMap')?.OutputValue;
  assert(output, 'The observability stack has no StpStackInfoMap output.');
  const parsed: unknown = JSON.parse(output);
  assert(isRecord(parsed) && isRecord(parsed.resources), 'The observability stack resource map is invalid.');
  const resources = parsed.resources as Record<string, StackInfoResource>;
  return {
    apiUrl: readResourceUrl(resources.api, 'api'),
    webUrl: readResourceUrl(resources.web, 'web')
  };
};

const credentialProvider = (options: CanaryOptions): AwsCredentialIdentityProvider =>
  options.credentials.mode === 'profile' ? fromIni({ profile: options.credentials.profile }) : fromEnv();

const createClients = (options: CanaryOptions): Clients => {
  const config = { credentials: credentialProvider(options), maxAttempts: 6, region: options.region };
  return {
    cloudFormation: new CloudFormationClient(config),
    cloudWatch: new CloudWatchClient(config),
    logs: new CloudWatchLogsClient(config),
    s3: new S3Client(config),
    sts: new STSClient(config),
    synthetics: new SyntheticsClient(config)
  };
};

const closeClients = (clients: Clients) => {
  for (const client of Object.values(clients)) client.destroy();
};

const isMissingStack = (error: unknown) =>
  error instanceof Error && error.name === 'ValidationError' && /does not exist/i.test(error.message);

const describeStack = async (client: CloudFormationClient, stackName: string) => {
  try {
    return (await client.send(new DescribeStacksCommand({ StackName: stackName }))).Stacks?.[0];
  } catch (error) {
    if (isMissingStack(error)) return undefined;
    throw error;
  }
};

const listStackResources = async (client: CloudFormationClient, stackName: string) => {
  const resources: StackResourceSummary[] = [];
  let nextToken: string | undefined;
  do {
    const page = await client.send(new ListStackResourcesCommand({ StackName: stackName, NextToken: nextToken }));
    resources.push(...(page.StackResourceSummaries ?? []));
    nextToken = page.NextToken;
  } while (nextToken);
  return resources;
};

const stateFileFor = (options: CanaryOptions) =>
  options.stateFile ?? join(cliDirectory, '.stacktape', 'aws-canaries', `${options.projectName}-observability.json`);

const writeState = async (options: CanaryOptions, state: CanaryState) => {
  const path = stateFileFor(options);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
};

const readState = async (options: CanaryOptions): Promise<CanaryState | undefined> => {
  try {
    const parsed: unknown = JSON.parse(await readFile(stateFileFor(options), 'utf8'));
    assert(isRecord(parsed), 'Observability canary state is invalid.');
    assert(parsed.accountId === options.expectedAccountId, 'Canary state belongs to another AWS account.');
    assert(parsed.owner === options.owner, 'Canary state belongs to another owner.');
    assert(parsed.stackName === `${options.projectName}-${stage}`, 'Canary state belongs to another stack.');
    assert(parsed.stackId === undefined || typeof parsed.stackId === 'string', 'Canary state has an invalid stack ID.');
    return parsed as CanaryState;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
};

let activeChild: ReturnType<typeof Bun.spawn> | undefined;

const stopActiveChild = () => {
  if (!activeChild) return;
  try {
    if (process.platform === 'win32') activeChild.kill();
    else process.kill(-activeChild.pid, 'SIGTERM');
  } catch {
    activeChild.kill();
  }
};

const runCli = async (options: CanaryOptions, env: Record<string, string | undefined>, args: string[]) => {
  const prefix = options.cli.mode === 'binary' ? [options.cli.path] : [process.execPath, 'run', 'dev'];
  const child = Bun.spawn({
    cmd: [...prefix, ...args],
    cwd: cliDirectory,
    detached: process.platform !== 'win32',
    env,
    stderr: 'pipe',
    stdout: 'pipe',
    windowsHide: true
  });
  activeChild = child;
  const stdoutPromise = new Response(child.stdout).text();
  const stderrPromise = new Response(child.stderr).text();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    stopActiveChild();
  }, commandTimeoutMs);
  const [code, stdout, stderr] = await Promise.all([child.exited, stdoutPromise, stderrPromise]).finally(() => {
    clearTimeout(timeout);
    if (activeChild === child) activeChild = undefined;
  });
  assert(!timedOut, `Stacktape ${args[0]} exceeded ${commandTimeoutMs / 60_000} minutes.`);
  assert(code === 0, `Stacktape ${args[0]} exited with ${code}:\n${stderr.trim().slice(-4_000)}`);
  return { stderr, stdout };
};

const commonCliArgs = (options: CanaryOptions) => [
  '--configPath',
  fixtureConfigPath,
  '--projectName',
  options.projectName,
  '--stage',
  stage,
  '--region',
  options.region,
  ...(options.credentials.mode === 'profile' ? ['--profile', options.credentials.profile] : []),
  '--agent'
];

const verifyCli = async (options: CanaryOptions, env: Record<string, string | undefined>) => {
  if (options.cli.mode !== 'binary') return;
  const { stdout } = await runCli(options, env, ['--version']);
  assertCliVersionOutput(stdout, options.cli.expectedVersion);
};

const fetchHealthyJson = async (url: string, label: string) => {
  const parsed = new URL(url);
  assert(parsed.protocol === 'https:', `${label} URL must use HTTPS.`);
  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
      assert(response.status === 200, `${label} returned HTTP ${response.status}.`);
      const body: unknown = await response.json();
      assert(isRecord(body) && body.ok === true, `${label} did not return its expected JSON body.`);
      return;
    } catch (error) {
      lastError = error;
      await Bun.sleep(5_000);
    }
  }
  throw new Error(`${label} never became healthy.`, { cause: lastError });
};

export const servicesObservedInSpanEvents = (messages: (string | undefined)[], services: string[]) =>
  services.filter((service) =>
    messages.some((message) => {
      if (!message) return false;
      try {
        return JSON.stringify(JSON.parse(message)).includes(`\"${service}\"`);
      } catch {
        return message.includes(service);
      }
    })
  );

const waitForSpans = async (clients: Clients, projectName: string, startedAt: number) => {
  const expectedServices = ['api', 'web'];
  for (let attempt = 0; attempt < 24; attempt += 1) {
    try {
      const response = await clients.logs.send(
        new FilterLogEventsCommand({
          endTime: Date.now(),
          filterPattern: `\"${projectName}\"`,
          logGroupName: 'aws/spans',
          startTime: startedAt
        })
      );
      const projectEvents = (response.events ?? []).filter(({ message }) => message?.includes(projectName));
      const observedServices = servicesObservedInSpanEvents(
        projectEvents.map(({ message }) => message),
        expectedServices
      );
      if (observedServices.length === expectedServices.length) return;
    } catch (error) {
      if (!(error instanceof Error && error.name === 'ResourceNotFoundException')) throw error;
    }
    await Bun.sleep(10_000);
  }
  throw new Error(`Spans from both ${projectName} workloads did not arrive in aws/spans within four minutes.`);
};

const waitForCanaries = async (clients: Clients, resources: StackResourceSummary[]) => {
  const names = resources
    .filter(({ ResourceType }) => ResourceType === 'AWS::Synthetics::Canary')
    .map(({ PhysicalResourceId }) => PhysicalResourceId)
    .filter((name): name is string => Boolean(name));
  assert(names.length === 2, `Expected two synthetic canaries, found ${names.length}.`);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const states = await Promise.all(
      names.map(async (name) => {
        const runs = await clients.synthetics.send(new GetCanaryRunsCommand({ MaxResults: 10, Name: name }));
        return runs.CanaryRuns?.some(({ Status }) => Status?.State === 'PASSED') ?? false;
      })
    );
    if (states.every(Boolean)) return names;
    await Bun.sleep(10_000);
  }
  throw new Error('The two synthetic canaries did not both produce a passing run within eight minutes.');
};

const waitForAlarms = async (clients: Clients, resources: StackResourceSummary[]) => {
  const names = resources
    .filter(({ ResourceType }) => ResourceType === 'AWS::CloudWatch::Alarm')
    .map(({ PhysicalResourceId }) => PhysicalResourceId)
    .filter((name): name is string => Boolean(name));
  assert(names.length >= 2, `Expected at least two synthetic-test alarms, found ${names.length}.`);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await clients.cloudWatch.send(new DescribeAlarmsCommand({ AlarmNames: names }));
    if (
      response.MetricAlarms?.length === names.length &&
      response.MetricAlarms.every(({ StateValue }) => StateValue === 'OK')
    ) {
      return;
    }
    await Bun.sleep(10_000);
  }
  throw new Error('Synthetic-test alarms did not settle in OK within five minutes.');
};

const verifyNotificationRule = (resources: StackResourceSummary[]) => {
  const rules = resources.filter(({ ResourceType }) => ResourceType === 'AWS::Events::Rule');
  assert(rules.length >= 1, 'Expected the synthetic-test failure notification rule.');
};

const parseS3Location = (location: string) => {
  const parsed = new URL(location);
  assert(parsed.protocol === 's3:', `Unexpected canary artifact location ${location}.`);
  return { bucket: parsed.hostname, prefix: parsed.pathname.replace(/^\//, '') };
};

const verifyScreenshot = async (clients: Clients, canaryNames: string[]) => {
  for (const name of canaryNames) {
    const canary = (await clients.synthetics.send(new GetCanaryCommand({ Name: name }))).Canary;
    const location = canary?.ArtifactS3Location;
    if (!location) continue;
    const { bucket, prefix } = parseS3Location(location);
    const objects = await clients.s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
    if (objects.Contents?.some(({ Key }) => Key?.toLowerCase().endsWith('.png'))) return;
  }
  throw new Error('The browser synthetic canary did not write a screenshot artifact.');
};

const uptimeRegions = (stackRegion: string) =>
  [...new Set([stackRegion, 'us-east-1', 'eu-west-1', 'ap-southeast-1'])].slice(0, 3);

const verifyUptimeManifests = async (options: CanaryOptions, stackName: string) => {
  const credentials = credentialProvider(options);
  await Promise.all(
    uptimeRegions(options.region).map(async (region) => {
      const client = new SSMClient({ credentials, maxAttempts: 6, region });
      try {
        const prefix = `/stacktape/uptime-checks/${stackName}`;
        const response = await client.send(
          new GetParametersByPathCommand({ Path: prefix, Recursive: true, WithDecryption: false })
        );
        assert(response.Parameters?.length, `No uptime manifest exists under ${prefix} in ${region}.`);
      } finally {
        client.destroy();
      }
    })
  );
};

const waitForStackAbsence = async (client: CloudFormationClient, stackName: string) => {
  const result = await waitUntilStackDeleteComplete(
    { client, maxWaitTime: stackDeleteTimeoutSeconds, minDelay: 5, maxDelay: 20 },
    { StackName: stackName }
  );
  assert(result.state === 'SUCCESS', `CloudFormation did not confirm deletion of ${stackName}: ${result.state}.`);
  assert(!(await describeStack(client, stackName)), `Stack ${stackName} still exists after cleanup.`);
};

const cleanup = async (
  clients: Clients,
  options: CanaryOptions,
  env: Record<string, string | undefined>,
  state: CanaryState | undefined
) => {
  const stackName = `${options.projectName}-${stage}`;
  const stack = await describeStack(clients.cloudFormation, stackName);
  if (!stack) {
    await rm(stateFileFor(options), { force: true });
    return;
  }
  assertOwnedStack(stack, options);
  if (state?.stackId)
    assert(stack.StackId === state.stackId, `Refusing cleanup because ${stackName} changed identity.`);
  try {
    await runCli(options, env, ['delete', ...commonCliArgs(options)]);
  } catch (cliError) {
    try {
      await clients.cloudFormation.send(new DeleteStackCommand({ StackName: stackName }));
    } catch (cloudFormationError) {
      throw new AggregateError([cliError, cloudFormationError], `Both cleanup paths failed for ${stackName}.`);
    }
  }
  await waitForStackAbsence(clients.cloudFormation, stackName);
  await rm(stateFileFor(options), { force: true });
};

export const runObservabilityCanary = async ({ cleanupOnly = false }: { cleanupOnly?: boolean } = {}) => {
  const options = resolveCanaryOptions();
  const clients = createClients(options);
  const stackName = `${options.projectName}-${stage}`;
  const invocationId = `observability-canary-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
  const env = buildCanaryEnvironment({ options, revision: invocationId, invocationId });
  let state = await readState(options);
  let bodyError: unknown;
  let cleanupError: unknown;
  const startedAt = Date.now();
  const handleSignal = () => stopActiveChild();
  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  try {
    const identity = await clients.sts.send(new GetCallerIdentityCommand({}));
    assert(identity.Account === options.expectedAccountId, `Active AWS account is ${identity.Account ?? 'unknown'}.`);
    if (cleanupOnly) {
      await cleanup(clients, options, env, state);
      console.info(`Cleanup verified for ${stackName}.`);
      return;
    }
    assert(
      !(await describeStack(clients.cloudFormation, stackName)),
      `Refusing to mutate existing stack ${stackName}.`
    );
    state = { accountId: options.expectedAccountId, owner: options.owner, stackName };
    await writeState(options, state);
    await verifyCli(options, env);
    await runCli(options, env, ['deploy', ...commonCliArgs(options)]);

    const stack = await describeStack(clients.cloudFormation, stackName);
    assert(stack, `${stackName} does not exist after deploy.`);
    assertOwnedStack(stack, options);
    state = { ...state, stackId: requiredString(stack.StackId, `${stackName} ID`) };
    await writeState(options, state);

    const stackInfo = extractObservabilityStackInfo(stack);
    await Promise.all([
      fetchHealthyJson(stackInfo.apiUrl, 'Traced Lambda'),
      fetchHealthyJson(stackInfo.webUrl, 'Traced web service')
    ]);
    const resources = await listStackResources(clients.cloudFormation, stackName);
    verifyNotificationRule(resources);
    await verifyUptimeManifests(options, stackName);
    const canaryNames = await waitForCanaries(clients, resources);
    await Promise.all([waitForSpans(clients, options.projectName, startedAt), waitForAlarms(clients, resources)]);
    await verifyScreenshot(clients, canaryNames);
    console.info(`Verified observability signal production and cleanup readiness for ${stackName}.`);
  } catch (error) {
    bodyError = error;
  } finally {
    if (!cleanupOnly) {
      try {
        await cleanup(clients, options, env, state);
      } catch (error) {
        cleanupError = error;
        console.error(
          'Cleanup is incomplete. Recover with: pnpm --filter @stacktape/cli run test:real-aws-observability-canary -- --cleanup-only'
        );
      }
    }
    await rm(join(cliDirectory, '.stacktape', invocationId), { force: true, recursive: true });
    process.off('SIGINT', handleSignal);
    process.off('SIGTERM', handleSignal);
    closeClients(clients);
  }

  if (bodyError && cleanupError) throw new AggregateError([bodyError, cleanupError], `Canary and cleanup failed.`);
  if (bodyError) throw bodyError;
  if (cleanupError) throw cleanupError;
  console.info(`Real-AWS observability canary passed and ${stackName} was deleted.`);
};

if (import.meta.main) {
  runObservabilityCanary({ cleanupOnly: process.argv.includes('--cleanup-only') }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
