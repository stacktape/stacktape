// Source-only, unsigned/unfenced phase-1 experiment. This module is reachable only through build-cli.ts's plugin.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { DynamoDBClient, GetItemCommand, PutItemCommand, BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
import {
  ECSClient,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  ListTasksCommand,
  DescribeTasksCommand
} from '@aws-sdk/client-ecs';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { IAMClient, GetRoleCommand } from '@aws-sdk/client-iam';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { createCodeSwapBundle } from '@stacktape/packaging/artifact/code-swap';
import type { LanguageSpecificBundleOutput } from '@stacktape/packaging/runtime-contracts';
import type { getECSHotswapInformation } from '../../src/commands/_utils/cw-deployment';
import { awsClientConfig, createAwsClientContext } from '../../src/aws/context';
import { z } from 'zod';
import { benchmarkDockerfile } from './image';
import { benchmarkBaseInputs } from './base-inputs';
import { trace, traceAsync } from './trace';
import { serviceCapacity, declaredCapacity } from './ecs-budget';
import { parse as parseYaml } from 'yaml';
import { getCfTemplateS3Key } from '../../src/domain/deployment-artifact-manager/artifact-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

export const runSchema = z.object({
  name: z.string().regex(/^v4swap-[a-z0-9-]+$/),
  owner: z.string().min(8),
  table: z.string(),
  mode: z.enum(['swap', 'image']),
  phase3: z.boolean().optional(),
  readinessControl: z.boolean().optional(),
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
    iam: new IAMClient(config),
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
let checkedStatusRoleId: string | undefined;
let declaredMaximum = 0;
const fleet = async (service: string, cluster: string) => {
  const { ecs, run } = await clients();
  const [response, list] = await Promise.all([
    ecs.send(new DescribeServicesCommand({ services: [service], cluster })),
    ecs.send(new ListTasksCommand({ cluster, serviceName: service.split('/').at(-1), desiredStatus: 'RUNNING' }))
  ]);
  const liveCapacity = serviceCapacity({
    name: 'api',
    maximum: Math.max(declaredMaximum, response.services?.[0]?.desiredCount ?? 0),
    maximumPercent: response.services?.[0]?.deploymentConfiguration?.maximumPercent ?? NaN
  });
  if (liveCapacity.reason) throw new Error(liveCapacity.reason);
  const primary = response.services?.[0]?.deployments?.find(({ status }) => status === 'PRIMARY');
  if (!primary || primary.runningCount !== run.count || response.services?.[0]?.desiredCount !== run.count)
    throw new Error('PRIMARY is not fully running.');
  const listedIds = (list.taskArns ?? []).map((arn) => arn.split('/').at(-1)!).toSorted();
  const tasks = await ecs.send(new DescribeTasksCommand({ cluster, tasks: list.taskArns ?? [] }));
  if (
    tasks.failures?.length ||
    tasks.tasks?.length !== run.count ||
    tasks.tasks.some((task) => task.lastStatus !== 'RUNNING' || task.taskDefinitionArn !== primary.taskDefinition)
  )
    throw new Error('Unexpected fleet membership/revision.');
  const ids = tasks.tasks.map(({ taskArn }) => taskArn!.split('/').at(-1)!).toSorted();
  if (JSON.stringify(ids) !== JSON.stringify(listedIds)) throw new Error('Listed/described fleet mismatch.');
  if (run.phase3) {
    if (tasks.tasks.some((task) => task.healthStatus !== 'HEALTHY'))
      throw new Error('Supervisor-checked PRIMARY is not healthy.');
  }
  return { ids, primary: primary.id };
};
const statuses = async (ids: string[]) => {
  const { ddb, run } = await clients();
  let rolePrefix = '';
  if (run.phase3) {
    if (!checkedStatusRoleId) throw new Error('Status addressing requires a checked fleet preflight.');
    rolePrefix = `${checkedStatusRoleId}:`;
  }
  const keys = ids.map((id) => ({ pk: { S: `status#node#${rolePrefix}${id}` } }));
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
    const failed = found.find((s) => s.revision === revision && s.state === 'failed');
    if (failed?.timings.candidateReaped) throw new Error(`Candidate failed: ${failed.reason}`);
    const refused = found.find((s) => s.revision === revision && s.state === 'refused');
    if (refused) {
      const reason = refused.reason ?? 'prepare_refused';
      result.fallback = reason;
      result.refusal = refused;
      throw new Error(reason);
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
  const { configManager } = await import('../../src/domain/config-manager');
  const workload = configManager.allContainerWorkloads.find((workload) => workload.name === 'api');
  if (!workload) throw new Error('Missing benchmark workload.');
  const capacity = declaredCapacity(
    configManager.allContainerWorkloads.map((item) => {
      const resource = configManager.config.resources[item.name];
      return {
        name: item.name,
        maximum: item.scaling.maxInstances,
        maximumPercent: 200,
        overrides:
          resource && 'overrides' in resource
            ? resource.overrides?.[cfLogicalNames.ecsService(item.name, false)]
            : undefined
      };
    })
  ).budgets.find((item) => item.name === workload.name)!;
  if (capacity.reason) {
    result = { mode: 'image', fallback: 'task_cap_exceeded', reason: capacity.reason };
    const { tuiManager } = await import('../../src/app/tui-manager');
    tuiManager.info(capacity.reason);
    await put({ Phase: 'abort' });
    return input.dockerfileContents;
  }
  declaredMaximum = capacity.pollers! - capacity.tasks!;
  const roleLookup =
    run.phase3 && stack.stackActionType !== 'create'
      ? (async () => {
          const role = stack.existingStackResources.find(
            (resource) => resource.LogicalResourceId === cfLogicalNames.ecsTaskRole('api')
          )?.PhysicalResourceId;
          if (!role) throw new Error('Missing benchmark task role.');
          const { iam } = await clients();
          checkedStatusRoleId = (await iam.send(new GetRoleCommand({ RoleName: role }))).Role!.RoleId!;
        })()
      : Promise.resolve();
  const headLookup =
    stack.stackActionType !== 'create' && run.mode === 'swap'
      ? s3
          .send(new GetObjectCommand({ Bucket: artifacts.deploymentBucketName, Key: 'code-swap/api/head.json' }))
          .then(async (response) => identitySchema.parse(JSON.parse(await response.Body!.transformToString())))
      : undefined;
  // Start independent reads together; every result is awaited before it is used.
  roleLookup.catch(() => {});
  headLookup?.catch(() => {});
  if (input.runtime !== 'node' || input.dockerBuildOutputArchitecture !== 'linux/amd64')
    throw new Error('Only amd64 Node is qualified for this benchmark.');
  if (input.languageSpecificBundleOutput.es?.externalDependencies?.length)
    throw new Error('This small slice requires fully bundled dependencies.');
  const source = global.workingDir;
  const [manifest, lock, authored, supervisor] = await Promise.all([
    readFile(join(source, 'package.json'), 'utf8'),
    readFile(join(source, 'package-lock.json'), 'utf8'),
    readFile(global.configPath, 'utf8'),
    readFile(run.supervisor)
  ]);
  const bundle = await createCodeSwapBundle(
    input.buildContextPath,
    benchmarkBaseInputs({
      manifest,
      lock,
      authored,
      supervisor,
      dockerfile: input.dockerfileContents,
      runtime: input.runtime,
      nodeVersion: input.nodeVersion,
      nodeTarget: input.nodeTarget,
      minify: input.minify,
      architecture: input.dockerBuildOutputArchitecture
    })
  );
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
  const rendered = await benchmarkDockerfile(input.buildContextPath, input.dockerfileContents, run.supervisor);
  const dockerfile = async () => {
    await roleLookup;
    return (
      rendered +
      `\nENV STP_BENCH_TABLE=${run.table} STP_BENCH_BUCKET=${artifacts.deploymentBucketName} STP_BENCH_TASK_MIB=${run.memory} STP_BENCH_ENTRY=index.js${run.phase3 ? ' STP_BENCH_PHASE3=1' : ''}${checkedStatusRoleId ? ` STP_BENCH_ROLE_ID=${checkedStatusRoleId}` : ''}\nENTRYPOINT ["/stacktape-supervisor"]\n`
    );
  };
  if (stack.stackActionType === 'create' || run.mode === 'image') {
    await put({ Phase: 'abort' });
    return dockerfile();
  }
  const head = await headLookup!;
  if (head.baseDigest !== identity.baseDigest) {
    result.fallback = 'base_changed';
    await put({ Phase: 'abort' });
    return dockerfile();
  }
  if (head.codeDigest === identity.codeDigest) throw new Error('Expected an actual running-code change.');
  const service = stack.existingStackResources.find((r) => r.ResourceType === 'AWS::ECS::Service')!.PhysicalResourceId;
  const cluster = service.split('/')[1];
  // Prepare runs beside the actual Docker build/ECR push; commit remains in updateEcsService after the upload gate.
  prepare = (async () => {
    const [fleetCheck, upload, roleCheck] = await Promise.allSettled([
      traceAsync('prepareFleet', () => fleet(service, cluster)),
      traceAsync('bundleUpload', async () => {
        await s3.send(
          new PutObjectCommand({
            Bucket: artifacts.deploymentBucketName,
            Key: key,
            Body: bundle.bytes,
            ContentType: 'application/gzip'
          })
        );
        trace('bundleUploaded');
      }),
      roleLookup
    ]);
    // Finish every prerequisite before any fallback; a failed check never publishes prepare.
    if (fleetCheck.status === 'rejected') throw fleetCheck.reason;
    if (upload.status === 'rejected') throw upload.reason;
    if (roleCheck.status === 'rejected') throw roleCheck.reason;
    const before = fleetCheck.value;
    result.tasks = before.ids;
    result.primary = before.primary;
    trace('preparePrerequisitesReady');
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
  return dockerfile();
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
    const capReason =
      error instanceof Error && error.message.startsWith('Code swap skipped') ? error.message : undefined;
    if (capReason) {
      const { tuiManager } = await import('../../src/app/tui-manager');
      tuiManager.info(capReason);
    }
    result = {
      ...result,
      mode: 'image',
      fallback: capReason ? 'task_cap_exceeded' : (result.fallback ?? 'swap_failed'),
      reason: capReason,
      failure: String(error)
    };
    await put({ Phase: 'abort' });
    const expectedIds = result.tasks === undefined ? [] : z.array(z.string()).parse(result.tasks);
    const deadline = Date.now() + 35000;
    for (;;) {
      const found = expectedIds.length ? await statuses(expectedIds) : [];
      if (
        found.length === expectedIds.length &&
        found.every(
          (s) =>
            s.state === 'complete' ||
            s.state === 'refused' ||
            (s.timings.candidateReaped && ['failed', 'aborted'].includes(s.state))
        )
      )
        break;
      if (Date.now() > deadline) throw new Error('Candidate cleanup not confirmed; refusing image fallback.');
      await Bun.sleep(100);
    }
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
        // Qualify concurrent fresh connections as well as one reused S3 edge before the initial parallel upload.
        await Promise.all(
          Array.from({ length: 8 }, () =>
            aws.s3.uploadFile({
              filePath: file,
              s3Key: 'code-swap/bootstrap-upload-probe.json',
              bucketName: artifacts.deploymentBucketName,
              useS3Acceleration: true,
              contentType: 'application/json'
            })
          )
        );
        result.bootstrap = { attempts, clientElapsedMs: performance.now() - started };
        return;
      }
    } catch (error) {
      lastError = error;
      passes = 0;
      if (!/No AWSAccessKey|NoAWSAccessKey|TemporaryRedirect|NoSuchBucket/i.test(String(error))) throw error;
    }
    await Bun.sleep(3000);
  }
  throw new Error(`Initial artifact upload did not become available: ${lastError}`);
};
export const benchmarkReleaseIdentity = () => ({ identity, mode: result.mode, fallback: result.fallback });
export const benchmarkComplete = async () => {
  if (!identity) {
    const { run } = await clients();
    await writeFile(run.result, JSON.stringify(result, null, 2));
    return;
  }
  const { run, s3, artifacts, stack } = await clients();
  // Fast deploys record the overlay identity in their ordinary marker. A
  // full CFN image deploy instead records its version and exact task image in
  // the ordinary retained template; it has no fast-release marker.
  if (!result.initial) {
    let fastMarker: string | undefined;
    try {
      const marker = await s3.send(
        new GetObjectCommand({ Bucket: artifacts.deploymentBucketName, Key: `fast-release/${stack.nextVersion}.json` })
      );
      fastMarker = await marker.Body!.transformToString();
    } catch (error) {
      if (!(error instanceof Error && error.name === 'NoSuchKey' && result.mode === 'image')) throw error;
    }
    if (fastMarker !== undefined) {
      const stored = z
        .object({ codeSwapBenchmark: z.object({ identity: z.object({ codeDigest: z.string() }) }) })
        .parse(JSON.parse(fastMarker));
      if (stored.codeSwapBenchmark.identity.codeDigest !== identity.codeDigest)
        throw new Error('Ordinary release history did not record benchmark identity.');
    } else {
      if (stack.lastVersion !== identity.revision) throw new Error('Full image release version was not recorded.');
      const stored = await s3.send(
        new GetObjectCommand({ Bucket: artifacts.deploymentBucketName, Key: getCfTemplateS3Key(identity.revision) })
      );
      const template = z
        .object({ Resources: z.record(z.string(), z.unknown()) })
        .parse(parseYaml(await stored.Body!.transformToString()));
      const definition = z
        .object({
          Properties: z.object({
            ContainerDefinitions: z.array(
              z.object({ Name: z.string(), Image: z.string(), Essential: z.boolean().optional() })
            )
          })
        })
        .parse(template.Resources[cfLogicalNames.ecsTaskDefinition('api')]);
      const app = definition.Properties.ContainerDefinitions.find((container) => container.Essential !== false);
      if (!app) throw new Error('Recorded image has no essential app.');
      const taskDefinition = stack.existingStackResources.find(
        (resource) => resource.LogicalResourceId === cfLogicalNames.ecsTaskDefinition('api')
      )?.PhysicalResourceId;
      if (!taskDefinition) throw new Error('Full image task definition is missing.');
      const { ecs } = await clients();
      const actual = (
        await ecs.send(new DescribeTaskDefinitionCommand({ taskDefinition }))
      ).taskDefinition?.containerDefinitions?.find((container) => container.name === app.Name);
      if (actual?.image !== app.Image) throw new Error('Full image history differs from the deployed task image.');
      result.fullImageHistory = { version: identity.revision, image: app.Image };
    }
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
