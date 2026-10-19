// Source-only, unsigned/unfenced phase-1 experiment. This module is reachable only through build-cli.ts's plugin.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { DynamoDBClient, GetItemCommand, PutItemCommand, BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
import { ECSClient, DescribeServicesCommand, ListTasksCommand, DescribeTasksCommand } from '@aws-sdk/client-ecs';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { createCodeSwapBundle } from '@stacktape/packaging/artifact/code-swap';
import type { LanguageSpecificBundleOutput } from '@stacktape/packaging/runtime-contracts';
import type { getECSHotswapInformation } from '../../src/commands/_utils/cw-deployment';
import { awsClientConfig, createAwsClientContext } from '../../src/aws/context';
import { z } from 'zod';
import { benchmarkDockerfile } from './image';
import { trace, traceAsync } from './trace';

export const runSchema = z.object({
  name: z.string().regex(/^v4swap-[a-z0-9-]+$/),
  owner: z.string().min(8),
  table: z.string(),
  mode: z.enum(['swap', 'image']),
  supervisor: z.string(),
  result: z.string(),
  memory: z.union([z.literal(512), z.literal(1024)]),
  count: z.union([z.literal(1), z.literal(2)])
});
export type BenchmarkRun = z.infer<typeof runSchema>;
const identitySchema = z.object({
  baseDigest: z.string(),
  codeDigest: z.string(),
  sha256: z.string(),
  size: z.number(),
  key: z.string(),
  revision: z.string()
});
type Identity = z.infer<typeof identitySchema>;
const statusSchema = z.object({
  state: z.string(),
  revision: z.string(),
  task: z.string(),
  timings: z.record(z.string(), z.unknown()),
  reason: z.string().optional()
});
type Status = z.infer<typeof statusSchema>;
let identity: Identity | undefined;
let result: Record<string, unknown> = {};
let prepare: Promise<{ ids: string[]; statuses: Status[]; service: string; cluster: string }> | undefined;
let preparationError: unknown;
let clientsPromise: ReturnType<typeof initialize> | undefined;
const hash = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex');
const initialize = async () => {
  if (!process.env.STP_CODE_SWAP_BENCH_RUN) throw new Error('Missing owned benchmark run file.');
  const run = runSchema.parse(JSON.parse(await readFile(process.env.STP_CODE_SWAP_BENCH_RUN, 'utf8')));
  const { globalStateManager: global } = await import('../../src/app/global-state-manager');
  const { awsSdkManager: aws } = await import('../../src/utils/aws-sdk-manager');
  if (
    global.targetAwsAccount.awsAccountId !== '597581086285' ||
    global.region !== 'eu-west-1' ||
    global.targetStack.projectName !== run.name ||
    global.targetStack.stage !== 'bench' ||
    global.args.awsAccount !== 'stacktape-e2e'
  )
    throw new Error('Benchmark target mismatch.');
  const context = createAwsClientContext({
    credentials: aws.credentialsProvider,
    region: aws.region,
    plugins: [...aws.plugins]
  });
  const config = awsClientConfig(context);
  if ((await new STSClient(config).send(new GetCallerIdentityCommand({}))).Account !== '597581086285')
    throw new Error('Benchmark credentials mismatch.');
  const { deploymentArtifactManager: artifacts } = await import('../../src/domain/deployment-artifact-manager');
  const { stackManager: stack } = await import('../../src/domain/cloudformation-stack-manager');
  return {
    run,
    global,
    artifacts,
    stack,
    ddb: new DynamoDBClient(config),
    ecs: new ECSClient(config),
    s3: new S3Client(config)
  };
};
const clients = () => (clientsPromise ??= initialize());
export const benchmarkImageName = async (name: string) => `${(await clients()).run.name}-${name}`;
const put = async (data: Record<string, unknown>) => {
  const { ddb, run } = await clients();
  await ddb.send(
    new PutItemCommand({ TableName: run.table, Item: { pk: { S: 'release#node' }, data: { S: JSON.stringify(data) } } })
  );
  trace(`signal:${data.Phase}`);
};
const fleet = async (service: string, cluster: string) => {
  const { ecs, run } = await clients();
  const [response, list] = await Promise.all([
    ecs.send(new DescribeServicesCommand({ services: [service], cluster })),
    ecs.send(new ListTasksCommand({ cluster, serviceName: service.split('/').at(-1), desiredStatus: 'RUNNING' }))
  ]);
  const primary = response.services?.[0]?.deployments?.find(({ status }) => status === 'PRIMARY');
  if (!primary || primary.runningCount !== run.count || response.services?.[0]?.desiredCount !== run.count)
    throw new Error('PRIMARY is not fully running.');
  const tasks = await ecs.send(new DescribeTasksCommand({ cluster, tasks: list.taskArns ?? [] }));
  if (
    tasks.failures?.length ||
    tasks.tasks?.length !== run.count ||
    tasks.tasks.some((task) => task.lastStatus !== 'RUNNING' || task.taskDefinitionArn !== primary.taskDefinition)
  )
    throw new Error('Unexpected fleet membership/revision.');
  return { ids: tasks.tasks.map(({ taskArn }) => taskArn!.split('/').at(-1)!).toSorted(), primary: primary.id };
};
const statuses = async (ids: string[]) => {
  const { ddb, run } = await clients();
  const keys = ids.map((id) => ({ pk: { S: `status#node#${id}` } }));
  const response = await ddb.send(
    new BatchGetItemCommand({ RequestItems: { [run.table]: { Keys: keys, ConsistentRead: true } } })
  );
  if (Object.keys(response.UnprocessedKeys ?? {}).length) throw new Error('Unprocessed status reads.');
  return (response.Responses?.[run.table] ?? []).map((item) => statusSchema.parse(JSON.parse(item.data!.S!)));
};
const waitStatus = async (ids: string[], revision: string, state: string) => {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const found = await statuses(ids);
    const refused = found.find((s) => s.revision === revision && s.state === 'refused');
    if (refused) {
      result.fallback = 'memory_screen';
      result.refusal = refused;
      throw new Error('memory_screen');
    }
    if (found.length === ids.length && found.every((s) => s.revision === revision && s.state === state)) return found;
    await Bun.sleep(100);
  }
  throw new Error(`Timed out waiting for ${state}.`);
};
export const benchmarkImage = async (input: {
  dockerfileContents: string;
  buildContextPath: string;
  runtime: string;
  nodeVersion: number;
  nodeTarget: string;
  minify: boolean;
  dockerBuildOutputArchitecture: string;
  languageSpecificBundleOutput: LanguageSpecificBundleOutput;
}) => {
  trace('benchmarkImage:start');
  const { run, global, artifacts, stack, s3 } = await clients();
  if (input.runtime !== 'node' || input.dockerBuildOutputArchitecture !== 'linux/amd64')
    throw new Error('Only amd64 Node is qualified for this benchmark.');
  if (input.languageSpecificBundleOutput.es?.externalDependencies?.length)
    throw new Error('This small slice requires fully bundled dependencies.');
  const source = global.workingDir;
  const manifest = await readFile(join(source, 'package.json'), 'utf8');
  const lock = await readFile(join(source, 'package-lock.json'), 'utf8');
  const authored = await readFile(global.configPath, 'utf8');
  const supervisor = await readFile(run.supervisor);
  const bundle = await createCodeSwapBundle(input.buildContextPath, {
    manifest,
    lock,
    authored,
    supervisor: hash(supervisor),
    dockerfile: input.dockerfileContents,
    runtime: input.runtime,
    nodeVersion: input.nodeVersion,
    nodeTarget: input.nodeTarget,
    minify: input.minify,
    architecture: input.dockerBuildOutputArchitecture
  });
  const revision = stack.nextVersion;
  const key = `code-swap/api/bundles/${revision}-${bundle.sha256}.tgz`;
  identity = {
    baseDigest: bundle.baseDigest,
    codeDigest: bundle.codeDigest,
    sha256: bundle.sha256,
    size: bundle.size,
    key,
    revision
  };
  result = { revision, mode: 'image', identity, initial: stack.stackActionType === 'create' };
  // The image uses the same real bundler output, entrypoint and dependencies as the ordinary js-bundle image.
  const dockerfile =
    (await benchmarkDockerfile(input.buildContextPath, input.dockerfileContents, run.supervisor)) +
    `\nENV STP_BENCH_TABLE=${run.table} STP_BENCH_BUCKET=${artifacts.deploymentBucketName} STP_BENCH_TASK_MIB=${run.memory} STP_BENCH_ENTRY=index.js\nENTRYPOINT ["/stacktape-supervisor"]\n`;
  if (stack.stackActionType === 'create' || run.mode === 'image') {
    await put({ Phase: 'abort' });
    return dockerfile;
  }
  const headResponse = await s3.send(
    new GetObjectCommand({ Bucket: artifacts.deploymentBucketName, Key: 'code-swap/api/head.json' })
  );
  const head = identitySchema.parse(JSON.parse(await headResponse.Body!.transformToString()));
  if (head.baseDigest !== identity.baseDigest) {
    result.fallback = 'base_changed';
    await put({ Phase: 'abort' });
    return dockerfile;
  }
  if (head.codeDigest === identity.codeDigest) throw new Error('Expected an actual running-code change.');
  const service = stack.existingStackResources.find((r) => r.ResourceType === 'AWS::ECS::Service')!.PhysicalResourceId;
  const cluster = service.split('/')[1];
  // Prepare runs beside the actual Docker build/ECR push; commit remains in updateEcsService after the upload gate.
  prepare = (async () => {
    const before = await traceAsync('prepareFleet', () => fleet(service, cluster));
    result.tasks = before.ids;
    result.primary = before.primary;
    await s3.send(
      new PutObjectCommand({
        Bucket: artifacts.deploymentBucketName,
        Key: key,
        Body: bundle.bytes,
        ContentType: 'application/gzip'
      })
    );
    trace('bundleUploaded');
    await put({ Revision: revision, Key: key, Sha256: bundle.sha256, Size: bundle.size, Phase: 'prepare' });
    const prepared = await waitStatus(before.ids, revision, 'prepared');
    trace('allPrepared');
    result.prepared = prepared;
    return { ids: before.ids, statuses: prepared, service, cluster };
  })();
  // Handle rejection immediately, then propagate it at the image gate.
  prepare.catch((error) => {
    preparationError = error;
  });
  return dockerfile;
};
export const benchmarkSwap = async (update: Awaited<ReturnType<typeof getECSHotswapInformation>>) => {
  trace('benchmarkSwap:start');
  if (!prepare) return false;
  try {
    const { ids, service, cluster } = await prepare;
    if (preparationError) throw preparationError;
    if (
      update.blueGreen ||
      update.workload.containers.length !== 1 ||
      update.workload.containers.some((c) => c.internalHealthCheck)
    )
      throw new Error('Unsupported benchmark workload.');
    if (JSON.stringify((await traceAsync('commitFleet', () => fleet(service, cluster))).ids) !== JSON.stringify(ids))
      throw new Error('Fleet changed before commit.');
    await put({
      Revision: identity!.revision,
      Key: identity!.key,
      Sha256: identity!.sha256,
      Size: identity!.size,
      Phase: 'commit'
    });
    const completed = await waitStatus(ids, identity!.revision, 'complete');
    trace('allComplete');
    if (JSON.stringify((await fleet(service, cluster)).ids) !== JSON.stringify(ids))
      throw new Error('Fleet changed after commit.');
    const { ddb, run } = await clients();
    const committed = await ddb.send(
      new GetItemCommand({ TableName: run.table, Key: { pk: { S: 'release#node' } }, ConsistentRead: true })
    );
    if (JSON.parse(committed.Item!.data!.S!).Revision !== identity!.revision)
      throw new Error('Committed identity lost.');
    result = { ...result, mode: 'swap', completed };
    return true;
  } catch (error) {
    result = { ...result, mode: 'image', fallback: result.fallback ?? 'swap_failed', failure: String(error) };
    await put({ Phase: 'abort' });
    return false;
  }
};
export const benchmarkBootstrapBucket = async () => {
  const { run, artifacts } = await clients();
  const { awsSdkManager: aws } = await import('../../src/utils/aws-sdk-manager');
  const file = join(dirname(run.result), 'bootstrap-upload-probe.json');
  await writeFile(file, JSON.stringify({ owner: run.owner, purpose: 'code-swap benchmark bootstrap' }));
  const started = performance.now();
  let attempts = 0;
  let passes = 0;
  let lastError: unknown;
  while (performance.now() - started < 300000) {
    attempts++;
    try {
      await aws.s3.uploadFile({
        filePath: file,
        s3Key: 'code-swap/bootstrap-upload-probe.json',
        bucketName: artifacts.deploymentBucketName,
        useS3Acceleration: true,
        contentType: 'application/json'
      });
      passes++;
      if (passes >= 3) {
        result.bootstrap = { attempts, clientElapsedMs: performance.now() - started };
        return;
      }
    } catch (error) {
      lastError = error;
      passes = 0;
      if (!/No AWSAccessKey|NoAWSAccessKey|TemporaryRedirect/i.test(String(error))) throw error;
    }
    await Bun.sleep(3000);
  }
  throw new Error(`Initial artifact upload did not become available: ${lastError}`);
};
export const benchmarkReleaseIdentity = () => ({ identity, mode: result.mode, fallback: result.fallback });
export const benchmarkComplete = async () => {
  if (!identity) return;
  const { run, s3, artifacts, stack } = await clients();
  // Ordinary recordFastRelease has already recorded the exact image template and benchmark identity.
  if (!result.initial) {
    const marker = await s3.send(
      new GetObjectCommand({ Bucket: artifacts.deploymentBucketName, Key: `fast-release/${stack.nextVersion}.json` })
    );
    const stored = JSON.parse(await marker.Body!.transformToString());
    if (stored.codeSwapBenchmark?.identity?.codeDigest !== identity.codeDigest)
      throw new Error('Ordinary release history did not record benchmark identity.');
  }
  await s3.send(
    new PutObjectCommand({
      Bucket: artifacts.deploymentBucketName,
      Key: 'code-swap/api/head.json',
      Body: JSON.stringify(identity),
      ContentType: 'application/json'
    })
  );
  await writeFile(
    run.result,
    JSON.stringify({ ...result, bucket: artifacts.deploymentBucketName, repository: artifacts.repositoryName }, null, 2)
  );
};
