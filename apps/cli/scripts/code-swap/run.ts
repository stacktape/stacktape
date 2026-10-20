import {
  CloudFormationClient,
  CancelUpdateStackCommand,
  DescribeStacksCommand,
  DescribeStackResourcesCommand
} from '@aws-sdk/client-cloudformation';
import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  DeleteTableCommand,
  ListTagsOfResourceCommand
} from '@aws-sdk/client-dynamodb';
import {
  ECSClient,
  DescribeServicesCommand,
  DescribeTasksCommand,
  ListTasksCommand,
  ListTaskDefinitionsCommand,
  DescribeClustersCommand,
  DeleteTaskDefinitionsCommand,
  DeregisterTaskDefinitionCommand
} from '@aws-sdk/client-ecs';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { ECRClient, DescribeRepositoriesCommand } from '@aws-sdk/client-ecr';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DeleteLogGroupCommand,
  FilterLogEventsCommand
} from '@aws-sdk/client-cloudwatch-logs';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { fromIni } from '@aws-sdk/credential-providers';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { randomBytes } from 'node:crypto';
import { openSync, closeSync } from 'node:fs';
import { mkdir, readFile, writeFile, cp, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { qualifyLifecycle } from './lifecycle';
import { LambdaClient, GetFunctionCommand, ListEventSourceMappingsCommand } from '@aws-sdk/client-lambda';
import { EventBridgeClient, DescribeRuleCommand } from '@aws-sdk/client-eventbridge';
import { IAMClient, GetRoleCommand } from '@aws-sdk/client-iam';
import { buildSupervisor } from './build-supervisor';
import { analyzeBenchmark, calibrateClock } from './analyze';
import { hostClockMs } from './trace';
import type { BenchmarkRun } from './runtime';

const ACCOUNT = '597581086285',
  REGION = 'eu-west-1',
  PROFILE = 'stacktape-e2e';
const cliRoot = resolve(import.meta.dir, '../..');
const root = resolve(cliRoot, '../..');
const clients = { region: REGION, credentials: fromIni({ profile: PROFILE }) };
const cfn = new CloudFormationClient(clients),
  ddb = new DynamoDBClient(clients),
  ecs = new ECSClient(clients),
  s3 = new S3Client(clients),
  ecr = new ECRClient(clients);
type Owned = {
  name: string;
  owner: string;
  table: string;
  bucket: string;
  repository: string;
  directory: string;
  stackId?: string;
  phase3?: boolean;
  tableAttempted?: boolean;
  stackAttempted?: boolean;
  cleaned?: boolean;
  inventory?: { type: string; id: string }[];
};
type State = {
  account: string;
  region: string;
  profile: string;
  owner: string;
  directory: string;
  resources: Owned[];
  supervisor: string;
  cli: string;
};
type Poll = {
  hostMs: number;
  elapsedMs: number;
  awsMs: number;
  rttMs: number;
  task: string;
  revision: string;
  status: number;
  error?: string;
  requestStartMs?: number;
  phase?: string;
  requestId?: string;
  errorBody?: string;
  path?: string;
};
let trafficPhase = 'baseline';
const samplePublic = async (url: string, start: number): Promise<Poll> => {
  const begin = performance.now();
  const phase = trafficPhase;
  try {
    const response = await fetch(`${url}/version`, {
      signal: AbortSignal.timeout(4000),
      headers: { 'cache-control': 'no-cache' }
    });
    const raw = await response.text();
    let revision = '';
    try {
      revision = (JSON.parse(raw) as { revision?: string }).revision ?? '';
    } catch {}
    return {
      hostMs: performance.now(),
      elapsedMs: performance.now() - start,
      requestStartMs: begin,
      awsMs: Number(response.headers.get('x-lab-now-ms')),
      rttMs: performance.now() - begin,
      task: response.headers.get('x-lab-task') ?? '',
      revision,
      status: response.status,
      phase,
      requestId: response.headers.get('apigw-requestid') ?? undefined,
      errorBody: response.status >= 400 ? raw.slice(0, 1024) : undefined
    };
  } catch (error) {
    return {
      hostMs: performance.now(),
      elapsedMs: performance.now() - start,
      requestStartMs: begin,
      awsMs: 0,
      rttMs: performance.now() - begin,
      task: '',
      revision: '',
      status: 0,
      phase,
      error: String(error)
    };
  }
};
const save = async (path: string, value: unknown) => {
  await writeFile(`${path}.tmp`, JSON.stringify(value, null, 2));
  await rename(`${path}.tmp`, path);
};
const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message);
};
const missing = (error: unknown) => /does not exist|NotFound|ResourceNotFound|NoSuch|404/.test(String(error));
// Setup is outside the timed sequence. One good route does not establish that
// initial API Gateway routing has settled across its backends. Keep every sample.
export const waitForInitialRoutes = async (url: string, ids: string[], samples: Poll[], stableMs = 30000) => {
  const seen = new Set<string>();
  const deadline = performance.now() + 120000;
  let stableSince: number | undefined;
  for (;;) {
    assert(performance.now() < deadline, 'Initial public routing did not settle.');
    const sample = await samplePublic(url, 0);
    samples.push(sample);
    if (sample.status === 200 && ids.includes(sample.task) && sample.awsMs > 0) {
      seen.add(sample.task);
      stableSince ??= sample.awsMs;
      if (ids.every((id) => seen.has(id)) && sample.awsMs - stableSince >= stableMs) return;
    } else {
      stableSince = undefined;
      seen.clear();
    }
    await Bun.sleep(20);
  }
};

const invoke = async (args: string[], log: string, env: Record<string, string | undefined> = {}) => {
  const output = openSync(log, 'w');
  const child = Bun.spawn(args, {
    cwd: cliRoot,
    env: { ...process.env, STP_DEV_MODE: 'true', AWS_PROFILE: PROFILE, AWS_REGION: REGION, ...env },
    stdout: output,
    stderr: output
  });
  const timeout = setTimeout(() => child.kill('SIGTERM'), 30 * 60 * 1000);
  const code = await child.exited.finally(() => {
    clearTimeout(timeout);
    closeSync(output);
  });
  if (code) throw new Error(`Command failed (${code}); see ${log}`);
};
const cliArgs = (state: State, owned: Owned, command: string) => [
  'bun',
  state.cli,
  command,
  '--configPath',
  join(owned.directory, 'stacktape.json'),
  '--projectName',
  owned.name,
  '--stage',
  'bench',
  '--region',
  REGION,
  '--awsAccount',
  PROFILE,
  '--outputFormat',
  'jsonl',
  '--autoConfirmOperation'
];
const guard = async () => {
  assert(
    process.env.STP_CODE_SWAP_BENCH_LIVE === '1',
    'Set STP_CODE_SWAP_BENCH_LIVE=1 for the authorized disposable benchmark.'
  );
  assert(
    !Object.keys(process.env).some((key) => /^(AWS_ENDPOINT_URL|STP_.*ENDPOINT)/.test(key) && process.env[key]),
    'Endpoint overrides are forbidden.'
  );
  assert(
    (await new STSClient(clients).send(new GetCallerIdentityCommand({}))).Account === ACCOUNT,
    'Wrong AWS account.'
  );
};
const getStack = async (owned: Owned) => {
  try {
    const stack = (await cfn.send(new DescribeStacksCommand({ StackName: owned.stackId ?? `${owned.name}-bench` })))
      .Stacks?.[0];
    return stack?.StackStatus === 'DELETE_COMPLETE' ? undefined : stack;
  } catch (error) {
    if (missing(error)) return undefined;
    throw error;
  }
};

const ownedStack = async (owned: Owned) => {
  const stack = await getStack(owned);
  if (stack)
    assert(
      stack.Tags?.some((tag) => tag.Key === 'code-swap-benchmark-owner' && tag.Value === owned.owner),
      'Stack ownership mismatch.'
    );
  return stack;
};
const primaryTasks = async (owned: Owned, strict = false, expectedCount?: number) => {
  const resources = await cfn.send(
    new DescribeStackResourcesCommand({ StackName: owned.stackId ?? `${owned.name}-bench` })
  );
  const service = resources.StackResources?.find(
    (resource) => resource.ResourceType === 'AWS::ECS::Service'
  )?.PhysicalResourceId;
  assert(service, 'Missing ECS service.');
  const cluster = service.split('/')[1]!;
  const described = await ecs.send(new DescribeServicesCommand({ cluster, services: [service] }));
  const primary = described.services?.[0]?.deployments?.find((deployment) => deployment.status === 'PRIMARY');
  assert(primary, 'Missing PRIMARY.');
  const list = await ecs.send(
    new ListTasksCommand({ cluster, serviceName: service.split('/').at(-1), desiredStatus: 'RUNNING' })
  );
  const tasks = await ecs.send(new DescribeTasksCommand({ cluster, tasks: list.taskArns ?? [] }));
  if (expectedCount !== undefined)
    assert(
      described.services?.[0]?.desiredCount === expectedCount &&
        primary.runningCount === expectedCount &&
        tasks.tasks?.filter(
          (task) => task.taskDefinitionArn === primary.taskDefinition && task.lastStatus === 'RUNNING'
        ).length === expectedCount,
      'The expected PRIMARY fleet is not running yet.'
    );
  if (strict)
    assert(
      tasks.tasks?.every((task) => task.taskDefinitionArn === primary.taskDefinition),
      'Old tasks still draining.'
    );
  return {
    ids: (tasks.tasks ?? [])
      .filter((task) => task.taskDefinitionArn === primary.taskDefinition && task.lastStatus === 'RUNNING')
      .map((task) => task.taskArn!.split('/').at(-1)!),
    service,
    cluster
  };
};
const waitForFleet = async (owned: Owned, count: number) => {
  const deadline = performance.now() + 600000;
  let lastError: unknown;
  while (performance.now() < deadline) {
    try {
      return await primaryTasks(owned, true, count);
    } catch (error) {
      lastError = error;
      await Bun.sleep(1000);
    }
  }
  throw new Error(`PRIMARY fleet did not settle: ${lastError}`);
};
const retryEcsCleanup = async (request: () => Promise<unknown>) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request();
    } catch (error) {
      if (attempt >= 7 || !/Throttl|Rate exceeded/i.test(String(error))) throw error;
      await Bun.sleep(1500 * (attempt + 1));
    }
  }
};

const cleanup = async (state: State, owned: Owned) => {
  if (owned.cleaned) return;
  await guard();
  const stack = await ownedStack(owned);
  if (owned.stackAttempted && (stack || owned.stackId)) {
    const resources = await cfn.send(
      new DescribeStackResourcesCommand({ StackName: owned.stackId ?? `${owned.name}-bench` })
    );
    owned.inventory = [
      ...(owned.inventory ?? []),
      ...(resources.StackResources ?? [])
        .filter((r) => r.PhysicalResourceId)
        .map((r) => ({ type: r.ResourceType!, id: r.PhysicalResourceId! }))
    ].filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index);
    await save(join(state.directory, 'state.json'), state);
  }
  if (stack) {
    if (stack.StackStatus === 'UPDATE_IN_PROGRESS') {
      await cfn.send(new CancelUpdateStackCommand({ StackName: stack.StackId }));
    }
    for (let i = 0; i < 1200; i++) {
      const current = await ownedStack(owned);
      if (!current?.StackStatus?.endsWith('_IN_PROGRESS')) break;
      await Bun.sleep(1000);
    }
    owned.stackId = stack.StackId;
    await save(join(state.directory, 'state.json'), state);
    // Deep benchmark artifacts are not understood by the ordinary historical key parser.
    let continuation: string | undefined;
    try {
      do {
        const listed = await s3.send(
          new ListObjectsV2Command({ Bucket: owned.bucket, Prefix: 'code-swap/', ContinuationToken: continuation })
        );
        if (listed.Contents?.length)
          await s3.send(
            new DeleteObjectsCommand({
              Bucket: owned.bucket,
              Delete: { Objects: listed.Contents.map(({ Key }) => ({ Key: Key! })) }
            })
          );
        continuation = listed.NextContinuationToken;
      } while (continuation);
    } catch (error) {
      // A previous partial delete may already have removed the artifact bucket. Keep recovering the owned stack.
      if (!missing(error)) throw error;
    }
    await invoke(cliArgs(state, owned, 'delete'), join(owned.directory, 'delete.log'));
  }
  if (owned.tableAttempted) {
    try {
      const table = await ddb.send(new DescribeTableCommand({ TableName: owned.table }));
      const tags = await ddb.send(new ListTagsOfResourceCommand({ ResourceArn: table.Table!.TableArn! }));
      assert(
        tags.Tags?.some((tag) => tag.Key === 'code-swap-benchmark-owner' && tag.Value === owned.owner),
        'Table ownership mismatch.'
      );
      await ddb.send(new DeleteTableCommand({ TableName: owned.table }));
    } catch (error) {
      if (!missing(error)) throw error;
    }
  }
  const family = awsResourceNames.ecsTaskDefinitionFamily('api', `${owned.name}-bench`);
  for (const status of ['ACTIVE', 'INACTIVE'] as const) {
    let nextToken: string | undefined;
    do {
      const definitions = await ecs.send(new ListTaskDefinitionsCommand({ familyPrefix: family, status, nextToken }));
      const exact = (definitions.taskDefinitionArns ?? []).filter(
        (arn) => arn.split('/').at(-1)?.split(':')[0] === family
      );
      for (const arn of exact) {
        if (status === 'ACTIVE')
          await retryEcsCleanup(() => ecs.send(new DeregisterTaskDefinitionCommand({ taskDefinition: arn })));
        await retryEcsCleanup(async () => {
          const deleted = await ecs.send(new DeleteTaskDefinitionsCommand({ taskDefinitions: [arn] }));
          assert(!deleted.failures?.length, 'Owned task-definition deletion failed.');
        });
        await Bun.sleep(1200);
      }
      nextToken = definitions.nextToken;
    } while (nextToken);
  }
  // ECS retains DELETE_IN_PROGRESS revisions while recently stopped tasks still reference them.
  // Keep exact-family recovery state until every revision is absent, rather than treating acceptance as deletion.
  const revisionDeadline = performance.now() + 70 * 60 * 1000;
  for (;;) {
    const remaining: string[] = [];
    for (const status of ['ACTIVE', 'INACTIVE', 'DELETE_IN_PROGRESS'] as const) {
      let nextToken: string | undefined;
      do {
        const page = await ecs.send(new ListTaskDefinitionsCommand({ familyPrefix: family, status, nextToken }));
        remaining.push(
          ...(page.taskDefinitionArns ?? []).filter((arn) => arn.split('/').at(-1)?.split(':')[0] === family)
        );
        nextToken = page.nextToken;
      } while (nextToken);
    }
    if (!remaining.length) break;
    await save(join(owned.directory, 'task-definition-cleanup.json'), { pending: remaining, verified: false });
    assert(performance.now() < revisionDeadline, 'Owned task-definition deletion still pending; run cleanup-only.');
    await Bun.sleep(15000);
  }
  await save(join(owned.directory, 'task-definition-cleanup.json'), { pending: [], verified: true });
  for (let i = 0; i < 180; i++) {
    const remaining = await getStack(owned);
    if (!remaining) break;
    await Bun.sleep(1000);
  }
  assert(!(await getStack(owned)), 'Stack remains after delete.');
  for (let i = 0; i < 60; i++) {
    try {
      await ddb.send(new DescribeTableCommand({ TableName: owned.table }));
      await Bun.sleep(1000);
    } catch (error) {
      if (missing(error)) break;
      throw error;
    }
  }
  for (const query of [
    () => ddb.send(new DescribeTableCommand({ TableName: owned.table })),
    () => s3.send(new HeadBucketCommand({ Bucket: owned.bucket })),
    () => ecr.send(new DescribeRepositoriesCommand({ repositoryNames: [owned.repository] }))
  ]) {
    let gone = false;
    try {
      await query();
    } catch (error) {
      if (missing(error)) gone = true;
      else throw error;
    }
    assert(gone, 'Owned table/bucket/repository still exists.');
  }
  const logs = new CloudWatchLogsClient(clients);
  for (const item of owned.inventory ?? []) {
    if (item.type === 'AWS::Logs::LogGroup') {
      const found = await logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: item.id }));
      if (found.logGroups?.some((group) => group.logGroupName === item.id))
        await logs.send(new DeleteLogGroupCommand({ logGroupName: item.id }));
      assert(
        !(await logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: item.id }))).logGroups?.some(
          (group) => group.logGroupName === item.id
        ),
        'Owned log group remains.'
      );
    }
    if (item.type === 'AWS::Lambda::Function') {
      let absent = false;
      try {
        await new LambdaClient(clients).send(new GetFunctionCommand({ FunctionName: item.id }));
      } catch (error) {
        if (missing(error)) absent = true;
        else throw error;
      }
      assert(absent, 'Owned Lambda remains after stack deletion.');
    }
    if (item.type === 'AWS::ECS::Cluster') {
      const response = await ecs.send(new DescribeClustersCommand({ clusters: [item.id] }));
      assert(
        !(response.clusters ?? []).some(
          (cluster) => cluster.status === 'ACTIVE' || cluster.runningTasksCount || cluster.pendingTasksCount
        ),
        'Owned cluster still active.'
      );
    }
  }
  if (owned.phase3) {
    const lambda = new LambdaClient(clients),
      events = new EventBridgeClient(clients),
      iam = new IAMClient(clients);
    const functionName = `${owned.name}-capacity`;
    const mappings = await lambda.send(new ListEventSourceMappingsCommand({ FunctionName: functionName }));
    assert(!mappings.EventSourceMappings?.length, 'Owned capacity stream mapping remains.');
    for (const check of [
      () => lambda.send(new GetFunctionCommand({ FunctionName: functionName })),
      ...(owned.inventory ?? [])
        .filter((item) => item.type === 'AWS::Events::Rule' && item.id.includes('SwapCapacity'))
        .map((item) => () => events.send(new DescribeRuleCommand({ Name: item.id }))),
      ...(owned.inventory ?? [])
        .filter((item) => item.type === 'AWS::IAM::Role' && item.id.includes('SwapCapacity'))
        .map((item) => () => iam.send(new GetRoleCommand({ RoleName: item.id })))
    ]) {
      let absent = false;
      try {
        await check();
      } catch (error) {
        if (missing(error) || /NoSuchEntity/.test(String(error))) absent = true;
        else throw error;
      }
      assert(absent, 'Owned capacity function/rule/role remains.');
    }
    await save(join(owned.directory, 'capacity-cleanup.json'), {
      verified: true,
      functionName,
      streamMappingsAbsent: true,
      ownedRuleAndRoleAbsent: true
    });
  }
  const images = Bun.spawn(['docker', 'image', 'ls', '--format', '{{json .}}'], { stdout: 'pipe', stderr: 'inherit' });
  const localImages = (await new Response(images.stdout).text())
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { Repository: string; Tag: string });
  assert((await images.exited) === 0, 'Could not enumerate owned local image tags.');
  for (const image of localImages.filter(
    (image) =>
      image.Repository === `${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/${owned.repository}` ||
      image.Repository === `${owned.name}-api-service-container`
  ))
    await invoke(
      ['docker', 'image', 'rm', `${image.Repository}:${image.Tag}`],
      join(owned.directory, 'local-image-cleanup.log')
    );
  owned.cleaned = true;
  await save(join(state.directory, 'state.json'), state);
  await save(join(owned.directory, 'cleanup.json'), {
    verified: true,
    at: new Date().toISOString(),
    stack: owned.stackId,
    table: owned.table,
    bucket: owned.bucket,
    repository: owned.repository
  });
};
const configure = async (owned: Owned, memory: 512 | 1024, count: 1 | 2) => {
  const stackName = `${owned.name}-bench`;
  const config = {
    projectName: owned.name,
    resources: {
      api: {
        type: 'web-service',
        overrides: {
          [cfLogicalNames.ecsService('api', false)]: {
            DesiredCount: count,
            ...(owned.phase3
              ? {
                  'DeploymentConfiguration.MinimumHealthyPercent': process.argv.includes('--cap-lifecycle') ? 90 : 100,
                  'DeploymentConfiguration.MaximumPercent': process.argv.includes('--cap-lifecycle') ? 100 : 200,
                  ServiceName: awsResourceNames.ecsService('api', stackName, false)
                }
              : {})
          },
          ...(owned.phase3
            ? {
                [cfLogicalNames.ecsTaskDefinition('api')]: {
                  'ContainerDefinitions.0.Environment': [
                    {
                      Name: 'STP_BENCH_ROLE_ID',
                      Value: { 'Fn::GetAtt': [cfLogicalNames.ecsTaskRole('api'), 'RoleId'] }
                    }
                  ]
                }
              }
            : {}),
          [cfLogicalNames.httpApiStage('api')]: {
            'AccessLogSettings.Format': JSON.stringify({
              requestId: '$context.requestId',
              requestTimeEpoch: '$context.requestTimeEpoch',
              status: '$context.status',
              integrationError: '$context.integrationErrorMessage',
              integrationLatency: '$context.integrationLatency'
            })
          }
        },
        properties: {
          port: 8080,
          packaging: {
            type: 'js-bundle',
            properties: { entryfilePath: 'entry.mjs', nodeVersion: 22, disableSourceMaps: true }
          },
          resources: { cpu: 0.25, memory },
          scaling: {
            minInstances: count,
            maxInstances: process.argv.includes('--cap-lifecycle') ? 10 : owned.phase3 ? 2 : count
          },
          iamRoleStatements: [
            {
              Effect: 'Allow',
              Action: ['dynamodb:GetItem'],
              Resource: [`arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/${owned.table}`],
              ...(owned.phase3
                ? {
                    Condition: {
                      'ForAllValues:StringEquals': {
                        'dynamodb:LeadingKeys': ['release#node']
                      }
                    }
                  }
                : {})
            },
            {
              Effect: 'Allow',
              Action: ['dynamodb:PutItem'],
              Resource: [`arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/${owned.table}`],
              ...(owned.phase3
                ? {
                    Condition: {
                      'ForAllValues:StringEquals': { 'dynamodb:LeadingKeys': ['status#node#${aws:userid}'] }
                    }
                  }
                : {})
            },
            { Effect: 'Allow', Action: ['s3:GetObject'], Resource: [`arn:aws:s3:::${owned.bucket}/code-swap/*`] }
          ]
        }
      }
    },
    stackConfig: {
      tags: [{ name: 'code-swap-benchmark-owner', value: owned.owner }],
      outputs: [{ name: 'apiUrl', value: "$ResourceParam('api', 'url')" }]
    }
  };
  await save(join(owned.directory, 'stacktape.json'), config);
};
const endpoint = async (owned: Owned) => {
  const stack = await getStack(owned);
  const output = stack?.Outputs?.find((item) => item.OutputKey === 'apiUrl');
  if (output?.OutputValue) return output.OutputValue;
  // CLI stack-info keeps authored output names when CloudFormation normalizes their logical IDs.
  const outputs = stack?.Outputs ?? [];
  const url = outputs.find((item) => item.OutputValue?.includes('.execute-api.'))?.OutputValue;
  assert(url, 'Missing HTTP API URL.');
  return url;
};
const business = async (url: string, evidence: Poll[]) => {
  const request = async (path: string, init?: RequestInit) => {
    const begin = performance.now();
    try {
      const response = await fetch(`${url}${path}`, { ...init, signal: AbortSignal.timeout(4000) });
      const body = await response.text();
      evidence.push({
        hostMs: performance.now(),
        elapsedMs: 0,
        requestStartMs: begin,
        awsMs: Number(response.headers.get('x-lab-now-ms')),
        rttMs: performance.now() - begin,
        task: response.headers.get('x-lab-task') ?? '',
        revision: '',
        status: response.status,
        requestId: response.headers.get('apigw-requestid') ?? undefined,
        phase: trafficPhase,
        path,
        errorBody: body.slice(0, 1024)
      });
      assert(response.ok, `${path} returned HTTP ${response.status}.`);
      return body;
    } catch (error) {
      if (evidence.at(-1)?.requestStartMs !== begin)
        evidence.push({
          hostMs: performance.now(),
          elapsedMs: 0,
          requestStartMs: begin,
          awsMs: 0,
          rttMs: performance.now() - begin,
          task: '',
          revision: '',
          status: 0,
          phase: trafficPhase,
          path,
          error: String(error)
        });
      throw error;
    }
  };
  try {
    const quote = await request('/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lines: [
          { productId: 'coffee', quantity: 2 },
          { productId: 'mug', quantity: 1 }
        ]
      })
    });
    assert((JSON.parse(quote) as { total: string }).total === '33.00', 'Wrong quote.');
    const receipt = await request('/receipt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: 'order-100', placedAt: '2025-01-15T12:00:00Z', total: '33.00' })
    });
    assert(
      (JSON.parse(receipt) as { html: string }).html === '<p>Order order-100, 2025-01-15: USD 33.00</p>',
      'Wrong receipt.'
    );
    await request('/products');
  } catch (error) {
    if (evidence.length) evidence.at(-1)!.error = String(error);
    throw error;
  }
};
const edit = async (state: State, owned: Owned, run: BenchmarkRun, url: string, index: number) => {
  const label = `${run.mode}-${run.memory}-${run.count}-${String(index).padStart(2, '0')}`;
  const desired = `${label}-${state.owner}`;
  await writeFile(join(owned.directory, 'revision.mjs'), `export const revision = ${JSON.stringify(desired)};\n`);
  run.result = join(owned.directory, `${label}-cli-result.json`);
  const runFile = join(owned.directory, 'run.json');
  await save(runFile, run);
  const before = await waitForFleet(owned, run.count);
  const polls: Poll[] = [];
  const businessTraffic: Poll[] = [];
  let running = true;
  const start = performance.now();
  const hostClockOffsetMs = hostClockMs() - performance.now();
  trafficPhase = label;
  const poll = async () => {
    // eslint-disable-next-line no-unmodified-loop-condition -- The deploy completion cancels all concurrent pollers.
    while (running) {
      polls.push(await samplePublic(url, start));
      await Bun.sleep(35);
    }
  };
  const pollers = Promise.all([poll(), poll(), poll(), poll()]);
  let exitMs: number | undefined;
  let failure: string | undefined;
  let expected: string[] = [];
  try {
    await invoke(cliArgs(state, owned, 'deploy'), join(owned.directory, `${label}.log`), {
      STP_CODE_SWAP_BENCH_RUN: runFile,
      STP_CODE_SWAP_BENCH_TRACE: join(owned.directory, `${label}-trace.jsonl`),
      STP_TIMINGS_FILE: join(owned.directory, `${label}-timings.json`)
    });
    exitMs = performance.now() - start;
    expected = (await primaryTasks(owned)).ids;
    const deadline = performance.now() + 120000;
    while (!expected.every((id) => polls.some((p) => p.revision === desired && p.task === id))) {
      if (performance.now() > deadline) throw new Error('Not every PRIMARY task served new code.');
      await Bun.sleep(50);
    }
    await business(url, businessTraffic);
  } catch (error) {
    failure = String(error);
  } finally {
    // Keep the clock qualification separate from serving and CLI-exit latency.
    const calibrationDeadline = performance.now() + 15000;
    while (performance.now() < calibrationDeadline) {
      try {
        calibrateClock(polls, 3000);
        break;
      } catch {
        await Bun.sleep(100);
      }
    }
    running = false;
    await pollers;
  }
  const hits = polls.filter((p) => p.revision === desired && expected.includes(p.task));
  const firstMs = hits.length ? Math.min(...hits.map((p) => p.elapsedMs)) : undefined;
  const allMs =
    expected.length && expected.every((id) => hits.some((p) => p.task === id))
      ? Math.max(...expected.map((id) => Math.min(...hits.filter((p) => p.task === id).map((p) => p.elapsedMs))))
      : undefined;
  let details: unknown;
  try {
    details = JSON.parse(await readFile(run.result, 'utf8'));
  } catch {}
  await save(join(owned.directory, `${label}-polls.json`), polls);
  await save(join(owned.directory, `${label}-business.json`), businessTraffic);
  const result = {
    label,
    desired,
    start,
    hostClockOffsetMs,
    exitMs,
    firstMs,
    allMs,
    before: before.ids,
    after: expected,
    failure,
    details
  };
  await save(join(owned.directory, `${label}.json`), result);
  console.log(JSON.stringify(result));
  if (failure) throw new Error(failure);
  trafficPhase = `${label}:settle`;
  // A memory/eligibility fallback also replaces tasks; finish that ordinary rollout before the next timed edit.
  if (run.mode === 'image' || (details && typeof details === 'object' && 'mode' in details && details.mode === 'image'))
    await waitForFleet(owned, run.count);

  trafficPhase = 'gap';

  return result;
};
export const qualifyOverCap = async (state: State, owned: Owned, run: BenchmarkRun, url: string) => {
  const path = join(owned.directory, 'stacktape.json');
  const config = JSON.parse(await readFile(path, 'utf8'));
  config.resources.api.properties.scaling.maxInstances = 11;
  // At desiredCount one and no surge, the image control must permit the old task to stop.
  config.resources.api.overrides[cfLogicalNames.ecsService('api', false)][
    'DeploymentConfiguration.MinimumHealthyPercent'
  ] = 0;
  await save(path, config);
  const revision = `over-cap-${state.owner}`;
  await writeFile(join(owned.directory, 'revision.mjs'), `export const revision = ${JSON.stringify(revision)};\n`);
  run.count = 1;
  run.result = join(owned.directory, 'cap-fallback-cli-result.json');
  const runFile = join(owned.directory, 'run.json');
  await save(runFile, run);
  const log = join(owned.directory, 'cap-fallback.log');
  await invoke(cliArgs(state, owned, 'deploy'), log, { STP_CODE_SWAP_BENCH_RUN: runFile });
  await waitForFleet(owned, 1);
  const fallback = JSON.parse(await readFile(run.result, 'utf8'));
  assert(
    fallback.mode === 'image' && fallback.fallback === 'task_cap_exceeded',
    'Over-cap service did not use images.'
  );
  assert(
    fallback.reason.includes('exceeds 10') && (await readFile(log, 'utf8')).includes(fallback.reason),
    'Missing CLI cap reason.'
  );
  const response = await fetch(`${url}/version`, { signal: AbortSignal.timeout(4000) });
  assert(
    response.ok && ((await response.json()) as { revision: string }).revision === revision,
    'Image fallback did not serve the new code.'
  );
  await save(join(owned.directory, 'cap-fallback.json'), fallback);
};
const main = async () => {
  await guard();
  const stateArg = process.argv.indexOf('--state');
  const directory =
    stateArg >= 0
      ? resolve(process.argv[stateArg + 1]!)
      : resolve(root, '.stacktape/code-swap', `live-${randomBytes(6).toString('hex')}`);
  await mkdir(directory, { recursive: true });
  let state: State;
  if (process.argv.includes('--cleanup-only')) {
    state = JSON.parse(await readFile(join(directory, 'state.json'), 'utf8'));
    assert(
      state.account === ACCOUNT && state.region === REGION && state.profile === PROFILE,
      'Recovery target mismatch.'
    );
    for (const owned of state.resources)
      await cleanup(state, process.argv.includes('--recheck') ? { ...owned, cleaned: false } : owned);
    return;
  }
  const selectionIndex = process.argv.indexOf('--configurations');
  const selections =
    selectionIndex < 0 ? ['512-1', '512-2', '1024-1', '1024-2'] : (process.argv[selectionIndex + 1] ?? '').split(',');
  assert(
    selections.length > 0 && selections.every((value) => ['512-1', '512-2', '1024-1', '1024-2'].includes(value)),
    'Select known memory/task configurations.'
  );
  const owner = randomBytes(8).toString('hex');
  state = {
    account: ACCOUNT,
    region: REGION,
    profile: PROFILE,
    owner,
    directory,
    resources: [],
    supervisor: await buildSupervisor(join(directory, 'supervisor')),
    cli: resolve(cliRoot, '.stacktape/code-swap/cli/entrypoint.js')
  };
  await save(join(directory, 'state.json'), state);
  console.log(
    `Recovery: STP_CODE_SWAP_BENCH_LIVE=1 pnpm --filter @stacktape/cli exec bun scripts/code-swap/run.ts --cleanup-only --state ${directory}`
  );
  const fixture = resolve(
    process.env.STP_CODE_SWAP_BENCH_FIXTURE ?? '/home/congy/projects/deploy-benchmarks/fixtures/containers/node'
  );
  try {
    for (const memory of [512, 1024] as const)
      for (const count of [1, 2] as const) {
        if (!selections.includes(`${memory}-${count}`)) continue;
        const name = `v4swap-${owner.slice(0, 8)}-${memory}-${count}`;
        const stackHash = getGloballyUniqueStackHash({
          stackName: `${name}-bench`,
          accountId: ACCOUNT,
          region: REGION
        });
        const owned: Owned = {
          name,
          owner,
          table: `${name}-control`,
          bucket: awsResourceNames.deploymentBucket(stackHash),
          repository: awsResourceNames.deploymentEcrRepo(stackHash),
          directory: join(directory, `${memory}-${count}`),
          phase3: process.argv.includes('--phase3')
        };
        state.resources.push(owned);
        await mkdir(owned.directory, { recursive: true });
        await save(join(directory, 'state.json'), state);
        assert(!(await getStack(owned)), 'Stack name already exists.');
        let tableExists = false;
        try {
          await ddb.send(new DescribeTableCommand({ TableName: owned.table }));
          tableExists = true;
        } catch (error) {
          if (!missing(error)) throw error;
        }
        assert(!tableExists, 'Table name already exists.');
        await cp(fixture, owned.directory, {
          recursive: true,
          filter: (path) => !path.split('/').some((part) => part === 'node_modules' || part === '.stacktape')
        });
        await invoke(
          ['npm', 'ci', '--ignore-scripts', '--prefix', owned.directory],
          join(owned.directory, 'install.log')
        );
        // Stacktape's bundler resolves import.meta.url at build time. Start the fixture's exported app explicitly.
        await writeFile(
          join(owned.directory, 'entry.mjs'),
          "import { createApp } from './server.mjs'; const server = createApp().listen(Number(process.env.PORT ?? 8080), '0.0.0.0'); process.on('SIGTERM', () => server.close());\n"
        );
        owned.tableAttempted = true;
        await save(join(directory, 'state.json'), state);
        await ddb.send(
          new CreateTableCommand({
            TableName: owned.table,
            KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
            AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }],
            BillingMode: 'PAY_PER_REQUEST',
            Tags: [{ Key: 'code-swap-benchmark-owner', Value: owner }]
          })
        );
        for (let i = 0; i < 60; i++) {
          if ((await ddb.send(new DescribeTableCommand({ TableName: owned.table }))).Table?.TableStatus === 'ACTIVE')
            break;
          await Bun.sleep(1000);
        }
        await configure(owned, memory, count);
        const run: BenchmarkRun = {
          name,
          owner,
          table: owned.table,
          mode: 'swap',
          phase3: owned.phase3,
          supervisor: state.supervisor,
          result: join(owned.directory, 'setup-result.json'),
          memory,
          count
        };
        const runFile = join(owned.directory, 'run.json');
        await save(runFile, run);
        owned.stackAttempted = true;
        await save(join(directory, 'state.json'), state);
        await invoke(cliArgs(state, owned, 'deploy'), join(owned.directory, 'setup.log'), {
          STP_CODE_SWAP_BENCH_RUN: runFile
        });
        const stack = await ownedStack(owned);
        owned.stackId = stack!.StackId;
        await save(join(directory, 'state.json'), state);
        const url = await endpoint(owned);
        const initialFleet = await waitForFleet(owned, count);
        const setupTraffic: Poll[] = [];
        trafficPhase = 'setup-readiness';
        try {
          await waitForInitialRoutes(url, initialFleet.ids, setupTraffic);
        } finally {
          await save(join(owned.directory, 'setup-traffic.json'), setupTraffic);
        }

        if (process.argv.includes('--over-cap-only')) {
          await qualifyOverCap(state, owned, run, url);
          await cleanup(state, owned);
          continue;
        }
        const setupBusiness: Poll[] = [];
        const traffic: Poll[] = [];
        trafficPhase = 'baseline';
        const trafficController = new AbortController();
        const trafficLoop = (async () => {
          while (!trafficController.signal.aborted) {
            traffic.push(await samplePublic(url, 0));
            await Bun.sleep(35);
          }
        })();
        try {
          await Bun.sleep(10000);
          await business(url, setupBusiness);
          if (process.argv.includes('--lifecycle-only') || process.argv.includes('--cap-lifecycle')) {
            run.mode = 'swap';
            await edit(state, owned, run, url, 1);
          } else if (process.argv.includes('--image-penalty-only')) {
            assert(owned.phase3, 'Image readiness control requires the owned phase3 harness.');
            run.mode = 'image';
            const controls = [];
            for (const [index, checked] of [false, true].entries()) {
              run.readinessControl = checked;
              const outcome = await edit(state, owned, run, url, 101 + index);
              const polls: Poll[] = JSON.parse(
                await readFile(join(owned.directory, `${outcome.label}-polls.json`), 'utf8')
              );
              const clock = calibrateClock(polls, 3000);
              controls.push({
                checked,
                outcome,
                clock,
                allServingSeconds: outcome.allMs! / clock.rate / 1000,
                cliExitSeconds: outcome.exitMs! / clock.rate / 1000
              });
            }
            await save(join(directory, 'image-readiness-penalty.json'), {
              scope: 'One paired image control, same drain/app/CLI; no Phase1 distribution claim',
              controls,
              addedServingSeconds: controls[1]!.allServingSeconds - controls[0]!.allServingSeconds
            });
          } else if (process.argv.includes('--memory-fallback')) {
            assert(memory === 512 && count === 1, 'The memory fallback fixture requires 512-1.');
            const entry = join(owned.directory, 'entry.mjs');
            const source = await readFile(entry, 'utf8');
            await writeFile(entry, source + '\nglobalThis.__benchmarkWorkingSet=Buffer.alloc(180*1024*1024,0x5a);\n');
            const overlap = await edit(state, owned, run, url, 1);
            await writeFile(entry, source);
            const fallback = await edit(state, owned, run, url, 2);
            const first = overlap.details as {
              mode: string;
              completed: { timings: { memoryBefore: { peakBytes: number }; memoryAfter: { peakBytes: number } } }[];
            };
            const second = fallback.details as { mode: string; fallback: string };
            assert(
              first.mode === 'swap' && second.mode === 'image' && second.fallback === 'memory_screen',
              'Expected one swap followed by exactly one memory image fallback.'
            );
            const polls: Poll[] = JSON.parse(
              await readFile(join(owned.directory, `${fallback.label}-polls.json`), 'utf8')
            );
            const clock = calibrateClock(polls, 3000);
            await save(join(directory, 'memory-fallback.json'), {
              pass: true,
              otherwiseEligibleAttempts: 2,
              memoryFallbacks: 1,
              fallbackRate: 0.5,
              overlap,
              fallback,
              clock,
              allServingSeconds: fallback.allMs! / clock.rate / 1000,
              cliExitSeconds: fallback.exitMs! / clock.rate / 1000
            });
          } else {
            // Twenty uninterrupted edits on each exact fleet. Image controls use the same app, checks, caches and source build.
            for (const mode of process.argv.includes('--regression')
              ? (['swap'] as const)
              : (['swap', 'image'] as const)) {
              run.mode = mode;
              for (let i = 1; i <= 20; i++) await edit(state, owned, run, url, i);
            }
          }
        } finally {
          trafficController.abort();
          await trafficLoop;
          await save(join(owned.directory, 'continuous-traffic.json'), traffic);
          await save(join(owned.directory, 'setup-business.json'), setupBusiness);
          // Preserve gateway failures and supervisor transitions before owned log groups are removed.
          const logs = new CloudWatchLogsClient(clients);
          for (const [name, logGroupName, filterPattern] of [
            [
              'gateway-errors',
              `/aws/vendedlogs/${owned.name}-bench/api-gateway/api/access-logs`,
              '{ $.status = "5*" }'
            ],
            ['supervisor-events', `/stp/${owned.name}-bench/ecs/api/service-container/process-logs`, '"benchmarkEvent"']
          ]) {
            const events = [];
            let nextToken: string | undefined;
            do {
              const page = await logs.send(new FilterLogEventsCommand({ logGroupName, filterPattern, nextToken }));
              events.push(...(page.events ?? []));
              nextToken = page.nextToken;
            } while (nextToken);
            await save(join(owned.directory, `${name}.json`), events);
          }
        }
        if (owned.phase3 && !process.argv.includes('--image-penalty-only') && !process.argv.includes('--speed-only')) {
          const sample = await samplePublic(url, 0);
          await qualifyLifecycle(owned, url, sample.revision, {
            clients,
            guard,
            save,
            count: process.argv.includes('--cap-lifecycle') ? 10 : 2
          });
          if (process.argv.includes('--cap-lifecycle')) {
            await waitForFleet(owned, 1);
            await qualifyOverCap(state, owned, run, url);
          }
        }
        await cleanup(state, owned);
      }
  } catch (error) {
    await save(join(directory, 'failure.json'), {
      name: error instanceof Error ? error.name : 'unknown',
      frames: error instanceof Error ? error.stack?.split('\n').slice(1) : undefined
    });
    console.error(
      JSON.stringify({
        benchmarkFailure: error instanceof Error ? error.name : 'unknown',
        evidence: join(directory, 'failure.json')
      })
    );
    throw error;
  } finally {
    const errors: unknown[] = [];
    for (const owned of state.resources) {
      try {
        await cleanup(state, owned);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) {
      console.error(
        `Cleanup required: STP_CODE_SWAP_BENCH_LIVE=1 pnpm --filter @stacktape/cli exec bun scripts/code-swap/run.ts --cleanup-only --state ${directory}`
      );
      process.exitCode = 1;
      console.error(new AggregateError(errors, 'Benchmark cleanup incomplete'));
    }
  }
  if (
    process.argv.includes('--memory-fallback') ||
    process.argv.includes('--image-penalty-only') ||
    process.argv.includes('--lifecycle-only') ||
    process.argv.includes('--cap-lifecycle') ||
    process.argv.includes('--over-cap-only')
  )
    return;
  const report = await analyzeBenchmark(
    directory,
    process.argv.includes('--regression') ? selections : undefined,
    process.argv.includes('--regression')
  );
  console.log(
    `${process.argv.includes('--regression') ? 'Phase-2 regression' : 'Phase-1 decision'}: ${report.go ? 'GO' : 'NO-GO'}. Report: ${join(directory, 'summary.json')}`
  );
  if (!report.go) process.exitCode = 1;
};
if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

// The runtime qualifier shares the benchmark's exact account, ownership, CLI and cleanup boundary.
export {
  guard,
  save,
  invoke,
  cliArgs,
  cleanup,
  getStack,
  ownedStack,
  endpoint,
  waitForFleet,
  edit,
  clients,
  ACCOUNT,
  REGION,
  PROFILE
};
export type { State, Owned };
