import { pythonHashLock, strictPythonPlan, pythonEnvironmentFingerprint } from './python';
import { execDocker } from '../../utils/docker';
import { codeSwapIntegration } from './integration';
import { pruneCodeSwapArtifacts, waitForRetiredCodeSwapTasks } from './artifacts';
// Opt-in code-swap deployment lifecycle.
import { access, readFile, writeFile, mkdir, copyFile, lstat } from 'node:fs/promises';
import { join, relative, dirname, isAbsolute, resolve } from 'node:path';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  BatchGetItemCommand,
  ScanCommand,
  BatchWriteItemCommand
} from '@aws-sdk/client-dynamodb';
import {
  ECSClient,
  DescribeServicesCommand,
  DescribeTaskDefinitionCommand,
  ListTasksCommand,
  DescribeTasksCommand
} from '@aws-sdk/client-ecs';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
  ServiceDiscoveryClient,
  GetServiceCommand,
  GetNamespaceCommand,
  DiscoverInstancesCommand
} from '@aws-sdk/client-servicediscovery';
import { IAMClient, GetRoleCommand } from '@aws-sdk/client-iam';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { createCodeSwapBundle } from '@stacktape/packaging/artifact/code-swap';
import type { LanguageSpecificBundleOutput } from '@stacktape/packaging/runtime-contracts';
import type { getECSHotswapInformation } from '../../commands/_utils/cw-deployment';
import { awsClientConfig, createAwsClientContext } from '../../aws/context';
import { z } from 'zod';
import { unsupportedReason } from './eligibility';
import { codeSwapDockerfile } from './image';
import { resolveStatusRole } from './ecs-policy';
import { findProjectRoot } from '@stacktape/packaging/es/project-root';
import { codeSwapBaseInputs } from './base-inputs';
import { trace, traceAsync } from './trace';
import { ALLOWED_MEMORY_VALUES_FOR_CPU } from '@stacktape/config/container-workload-resources';
import { memoryFallbackReason, serviceCapacity, declaredCapacity } from './ecs-budget';
import { parse as parseYaml } from 'yaml';
import { getCfTemplateS3Key } from '../deployment-artifact-manager/artifact-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import {
  readReleaseRecord,
  writeReleaseRecord,
  interruptedSwapReason,
  incompleteHistoryVersions,
  allTasksObservedAttempt,
  allCandidatesCleaned,
  type SwapRecord
} from './release-record';
import {
  recoveredOperation,
  releaseRecordsAtStart,
  hadCodeSwapTable,
  codeSwapTrackPreparation
} from './lifecycle-hooks';
import { createHash } from 'node:crypto';

const identitySchema = z.object({
  packagingDigest: z.string().optional(),
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
export const createServiceRuntime = (run: import('./benchmark-run').BenchmarkRun) => {
  const releaseRecordAtStart = releaseRecordsAtStart.get(run.recordService);
  let identity: Identity | undefined;
  let runningHead: Identity | undefined;
  let jobName: string | undefined;
  let result: Record<string, unknown> = {};

  let prepare: Promise<{ ids: string[]; statuses: Status[]; service: string; cluster: string }> | undefined;
  let preparationError: unknown;
  let selectedWorkload: string | undefined;
  const codeSwapPending = (workloadName: string) => Boolean(prepare && selectedWorkload === workloadName);
  let recordTaskDefinition: string | undefined;
  let releaseRecord: SwapRecord | undefined;
  let clientsPromise: ReturnType<typeof initialize> | undefined;
  const initialize = async () => {
    const { globalStateManager: global } = await import('../../app/global-state-manager');
    const { awsSdkManager: aws } = await import('../../utils/aws-sdk-manager');
    if (
      (process.env.STP_CODE_SWAP_BENCH_RUN || process.env.STP_CODE_SWAP_BENCH_SUPERVISOR) &&
      (global.targetAwsAccount.awsAccountId !== '597581086285' ||
        global.region !== 'eu-west-1' ||
        global.targetStack.projectName !== run.name ||
        global.targetStack.stage !== 'bench' ||
        global.args.awsAccount !== 'stacktape-e2e')
    )
      throw new Error('Benchmark target mismatch.');
    const context = createAwsClientContext({
      credentials: aws.credentialsProvider,
      region: aws.region,
      plugins: [...aws.plugins]
    });
    const config = awsClientConfig(context);
    if (
      (process.env.STP_CODE_SWAP_BENCH_RUN || process.env.STP_CODE_SWAP_BENCH_SUPERVISOR) &&
      (await new STSClient(config).send(new GetCallerIdentityCommand({}))).Account !== '597581086285'
    )
      throw new Error('Benchmark credentials mismatch.');
    const { deploymentArtifactManager: artifacts } = await import('../deployment-artifact-manager');
    const { stackManager: stack } = await import('../cloudformation-stack-manager');
    return {
      run,
      global,
      artifacts,
      stack,
      discovery: new ServiceDiscoveryClient(config),
      iam: new IAMClient(config),
      ddb: new DynamoDBClient(config),
      ecs: new ECSClient(config),
      s3: new S3Client(config)
    };
  };
  const clients = () => (clientsPromise ??= initialize());
  const codeSwapBuildInputs = async () => {
    const { run, stack, global } = await clients();
    if (!run.phase4) return {};
    const { configManager } = await import('../config-manager');
    const grace =
      configManager.allContainerWorkloads.find((item) => item.name === run.service)?.containers[0]?.stopTimeout ?? 2;
    const enabled = !run.optOut && !(await codeSwapCapacity()).reason;
    return {
      codeSwap: {
        pythonDependencyIdentity: 2,
        enabled,
        recordService: run.recordService,
        artifactService: run.artifactService,
        grace,
        plan: configManager.allContainerWorkloads.find((item) => item.name === run.service),
        // A cached image build must still execute the lifecycle hooks when repairing an interrupted swap.
        imageRevision:
          run.mode === 'image' ||
          global.args.fullDeploy ||
          interruptedSwapReason(releaseRecordAtStart, recoveredOperation)
            ? stack.nextVersion
            : undefined,
        supervisor: enabled
          ? createHash('sha256')
              .update(await readFile(run.supervisor))
              .digest('hex')
          : null
      }
    };
  };

  const put = async (data: Record<string, unknown>) => {
    const { ddb, run, stack, global } = await clients();
    if (run.phase4) {
      if (!hadCodeSwapTable) return; // Initial opt-in: CFN has not created the table yet, including on an existing stack.
      if (!recordTaskDefinition) {
        const service = stack.existingStackResources.find(
          (r) => r.LogicalResourceId === cfLogicalNames.ecsService(run.service, false)
        )?.PhysicalResourceId;
        if (!service) return; // A newly added service starts on its image before its first record exists.
        recordTaskDefinition = (await newServiceState(service)).taskDefinition!;
      }
      releaseRecord ??= await readReleaseRecord(ddb, run.table, run.recordService);
      const bundle = data.Revision
        ? {
            Revision: String(data.Revision),
            Key: String(data.Key),
            Sha256: String(data.Sha256),
            Size: Number(data.Size)
          }
        : undefined;
      const phase = z.enum(['prepare', 'commit', 'abort']).parse(data.Phase);
      const next: SwapRecord = {
        Seq: (releaseRecord?.Seq ?? 0) + 1,
        TaskDefinition: recordTaskDefinition,
        Committed: phase === 'commit' ? bundle! : (releaseRecord?.Committed ?? null),
        Proposed: phase === 'prepare' ? { ...bundle!, Attempt: global.invocationId } : null,
        HistoryVersion: releaseRecord?.HistoryVersion ?? null,
        Attempt: bundle ? global.invocationId : (releaseRecord?.Attempt ?? null),
        Phase: phase,
        ...bundle
      };
      await writeReleaseRecord(ddb, run.table, releaseRecord, next, run.recordService);
      releaseRecord = next;
    } else {
      await ddb.send(
        new PutItemCommand({
          TableName: run.table,
          Item: { pk: { S: `release#${run.recordService}` }, data: { S: JSON.stringify(data) } }
        })
      );
    }
    trace(`signal:${data.Phase}`);
  };
  const newServiceState = async (service: string) => {
    const { ecs } = await clients();
    return (await ecs.send(new DescribeServicesCommand({ services: [service], cluster: service.split('/')[1] })))
      .services![0]!;
  };
  const faultCheckpoint = async (point: 'before-proposal' | 'after-commit') => {
    const { run, global } = await clients();
    if (run.fault !== point) return;
    await writeFile(`${run.result}.checkpoint`, JSON.stringify({ point, invocationId: global.invocationId }));
    // Owned kill test only. A missed kill eventually fails rather than hanging forever.
    const deadline = Date.now() + 300000;
    while (Date.now() < deadline) {
      if (
        await access(`${run.result}.continue`).then(
          () => true,
          () => false
        )
      )
        return;
      await Bun.sleep(100);
    }
    throw new Error(`Fault checkpoint ${point} was not killed.`);
  };
  let checkedStatusRoleId: string | undefined;
  let declaredMaximum = 0;
  const discoveryNames = new Map<string, { NamespaceName: string; ServiceName: string }>();
  const fleet = async (service: string, cluster: string) => {
    const { ecs, run } = await clients();
    const [response, list] = await Promise.all([
      ecs.send(new DescribeServicesCommand({ services: [service], cluster })),
      ecs.send(new ListTasksCommand({ cluster, serviceName: service.split('/').at(-1), desiredStatus: 'RUNNING' }))
    ]);
    const liveCapacity = serviceCapacity({
      name: run.service,
      maximum: Math.max(declaredMaximum, response.services?.[0]?.desiredCount ?? 0),
      minimum: response.services?.[0]?.desiredCount,
      minimumHealthyPercent: response.services?.[0]?.deploymentConfiguration?.minimumHealthyPercent ?? NaN,
      maximumPercent: response.services?.[0]?.deploymentConfiguration?.maximumPercent ?? NaN
    });
    if (liveCapacity.reason) throw new Error(liveCapacity.reason);
    const primary = response.services?.[0]?.deployments?.find(({ status }) => status === 'PRIMARY');
    if (primary?.taskDefinition) recordTaskDefinition = primary.taskDefinition;
    const desired = response.services?.[0]?.desiredCount ?? 0;
    if (!primary || !desired || primary.runningCount !== desired) throw new Error('PRIMARY is not fully running.');
    const listedIds = (list.taskArns ?? []).map((arn) => arn.split('/').at(-1)!).toSorted();
    const tasks = await ecs.send(new DescribeTasksCommand({ cluster, tasks: list.taskArns ?? [] }));
    if (
      tasks.failures?.length ||
      tasks.tasks?.length !== desired ||
      tasks.tasks.some((task) => task.lastStatus !== 'RUNNING' || task.taskDefinitionArn !== primary.taskDefinition)
    )
      throw new Error('Unexpected fleet membership/revision.');
    const ids = tasks.tasks.map(({ taskArn }) => taskArn!.split('/').at(-1)!).toSorted();
    if (JSON.stringify(ids) !== JSON.stringify(listedIds)) throw new Error('Listed/described fleet mismatch.');
    if (run.phase3) {
      if (tasks.tasks.some((task) => task.healthStatus !== 'HEALTHY'))
        throw new Error('Supervisor-checked PRIMARY is not healthy.');
    }
    if (run.phase3) {
      const { discovery } = await clients();
      const registries = response.services?.[0]?.serviceRegistries ?? [];
      if (!registries.length) throw new Error('HTTP API discovery registry is missing.');
      for (const registry of registries) {
        const serviceId = registry.registryArn?.split('/').at(-1);
        if (!serviceId) throw new Error('HTTP API discovery registry identity is missing.');
        let names = discoveryNames.get(serviceId);
        if (!names) {
          const { Service } = await discovery.send(new GetServiceCommand({ Id: serviceId }));
          const { Namespace } = await discovery.send(new GetNamespaceCommand({ Id: Service?.NamespaceId }));
          if (!Service?.Name || !Namespace?.Name) throw new Error('HTTP API discovery identity is missing.');
          names = {
            NamespaceName: Namespace.Properties?.HttpProperties?.HttpName ?? Namespace.Name,
            ServiceName: Service.Name
          };
          discoveryNames.set(serviceId, names);
        }
        const { Instances = [] } = await discovery.send(
          new DiscoverInstancesCommand({ ...names, HealthStatus: 'HEALTHY', MaxResults: 100 })
        );
        if (
          Instances.length !== ids.length ||
          !ids.every((id) => Instances.some((instance) => instance.InstanceId === id))
        )
          throw new Error('PRIMARY tasks lost HTTP API routability.');
      }
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
    const keys = ids.map((id) => ({ pk: { S: `status#${run.recordService}#${rolePrefix}${id}` } }));
    const response = await ddb.send(
      new BatchGetItemCommand({ RequestItems: { [run.table]: { Keys: keys, ConsistentRead: true } } })
    );
    if (Object.keys(response.UnprocessedKeys ?? {}).length) throw new Error('Unprocessed status reads.');
    return (response.Responses?.[run.table] ?? []).map((item) => statusSchema.parse(JSON.parse(item.data!.S!)));
  };
  const waitStatus = async (ids: string[], revision: string, state: string) => {
    const deadline = Date.now() + 90000;
    let nextFleetCheck = Date.now() + 2000;
    let stickyFailure: Error | undefined;
    while (Date.now() < deadline) {
      const found = await statuses(ids);
      const failed = found.find((s) => s.revision === revision && s.state === 'failed');
      if (failed?.timings.candidateReaped) stickyFailure ??= new Error(`Candidate failed: ${failed.reason}`);
      const refused = found.find((s) => s.revision === revision && s.state === 'refused');
      if (refused) {
        const reason = refused.reason ?? 'prepare_refused';
        result.fallback = reason;
        result.refusal = refused;
        stickyFailure ??= new Error(reason);
      }
      // Let every task observe the proposal before aborting, so a fast refusal cannot hide another task preparing.
      if (stickyFailure && allTasksObservedAttempt(found, ids.length, revision)) throw stickyFailure;
      if (
        !stickyFailure &&
        found.length === ids.length &&
        found.every((s) => s.revision === revision && s.state === state)
      )
        return found;
      if (result.tasks && Date.now() >= nextFleetCheck) {
        const { stack } = await clients();
        const service = stack.existingStackResources.find(
          (resource) => resource.LogicalResourceId === cfLogicalNames.ecsService(run.service, false)
        )!.PhysicalResourceId;
        if (JSON.stringify((await fleet(service, service.split('/')[1])).ids) !== JSON.stringify(ids))
          throw new Error('Fleet changed during code swap.');
        nextFleetCheck = Date.now() + 2000;
      }
      await Bun.sleep(100);
    }
    throw new Error(`Timed out waiting for ${state}.`);
  };
  const codeSwapCapacity = async () => {
    const { configManager } = await import('../config-manager');
    const { run } = await clients();
    const workload = configManager.allContainerWorkloads.find((workload) => workload.name === run.service);
    if (!workload) throw new Error('Missing code-swap workload.');
    const unsupported = unsupportedReason(workload, configManager.allContainerWorkloads.length);
    if (!process.env.STP_CODE_SWAP_BENCH_RUN && unsupported)
      return {
        reason: `Code swap skipped for ${run.service}: ${unsupported}; using an image deploy.`,
        tasks: 0,
        pollers: 0
      };
    const capacity = declaredCapacity(
      configManager.allContainerWorkloads.map((item) => {
        const resource = configManager.config.resources[item.name];
        return {
          name: item.name,
          maximum: item.scaling.maxInstances,
          minimum: item.scaling.minInstances,
          maximumPercent: 200,
          scalingOverrides:
            resource && 'overrides' in resource
              ? resource.overrides?.[cfLogicalNames.autoScalingTarget(item.name)]
              : undefined,
          overrides:
            resource && 'overrides' in resource
              ? resource.overrides?.[cfLogicalNames.ecsService(item.name, false)]
              : undefined
        };
      })
    ).budgets.find((item) => item.name === workload.name)!;
    return capacity;
  };
  let roleLookup: Promise<void> | undefined;
  const codeSwapPrimeIdentity = () => {
    // Identity is resolved during packaging after configuration has loaded.
    return (roleLookup ??= (async () => {
      const { run, stack } = await clients();
      if (
        !run.phase3 ||
        stack.stackActionType === 'create' ||
        !stack.existingStackResources.some(
          (item) => item.LogicalResourceId === cfLogicalNames.ecsService(run.service, false)
        )
      )
        return;
      if ((await codeSwapCapacity()).reason) return;
      checkedStatusRoleId = await lookupTaskRoleId();
    })());
  };
  const lookupTaskRoleId = async () => {
    const { stack, iam, run } = await clients();
    const role = stack.existingStackResources.find(
      (resource) => resource.LogicalResourceId === cfLogicalNames.ecsTaskRole(run.service)
    )?.PhysicalResourceId;
    if (!role) throw new Error('Missing managed code-swap task role.');
    return (await iam.send(new GetRoleCommand({ RoleName: role }))).Role!.RoleId!;
  };
  const codeSwapImage = async (input: {
    packagingDigest: string;
    dockerfileContents: string;
    buildContextPath: string;
    runtime: string;
    nodeVersion: number;
    nodeTarget: string;
    minify: boolean;
    dockerBuildOutputArchitecture: string;
    languageSpecificBundleOutput: LanguageSpecificBundleOutput;
    nodeBaseDigest?: string;
    python?: { command: string; baseInputs: string };
  }) => {
    trace('codeSwapImage:start');
    const { run, global, artifacts, stack, s3 } = await clients();
    if (run.optOut) {
      const { configManager } = await import('../config-manager');
      const workload = configManager.allContainerWorkloads.find((item) => item.name === run.service);
      result = {
        mode: 'image',
        optOut: true,
        reason: workload && unsupportedReason(workload, configManager.allContainerWorkloads.length)
      };
      codeSwapIntegration.imageHasSupervisor.set(run.service, false);
      return input.dockerfileContents;
    }
    if (run.phase4 && stack.stackActionType !== 'create') releaseRecord = releaseRecordAtStart;
    const recoveryReason = interruptedSwapReason(releaseRecord, recoveredOperation);
    if (recoveryReason && releaseRecord?.Attempt && incompleteHistoryVersions(releaseRecord).length) {
      const interruptedVersion = releaseRecord.Proposed?.Revision ?? releaseRecord.Committed?.Revision;
      const attemptKey = `code-swap/${run.artifactService}/attempts/${interruptedVersion}-${releaseRecord.Attempt}.json`;
      const attempt = await s3.send(new GetObjectCommand({ Bucket: artifacts.deploymentBucketName, Key: attemptKey }));
      const saved = z.record(z.string(), z.unknown()).parse(JSON.parse(await attempt.Body!.transformToString()));
      await s3.send(
        new PutObjectCommand({
          Bucket: artifacts.deploymentBucketName,
          Key: attemptKey,
          Body: JSON.stringify({ ...saved, outcome: 'interrupted', repairedBy: global.invocationId })
        })
      );
    }

    const capacity = await codeSwapCapacity();
    if (capacity.reason) {
      codeSwapIntegration.imageHasSupervisor.set(run.service, false);
      result = { mode: 'image', fallback: 'task_cap_exceeded', reason: capacity.reason };
      const { tuiManager } = await import('../../app/tui-manager');
      tuiManager.info(capacity.reason);
      await put({ Phase: 'abort' });
      return input.dockerfileContents;
    }
    declaredMaximum = capacity.pollers! - capacity.tasks!;
    const identityLookup = codeSwapPrimeIdentity();
    const headLookup =
      stack.stackActionType !== 'create' && run.mode === 'swap'
        ? s3
            .send(
              new GetObjectCommand({
                Bucket: artifacts.deploymentBucketName,
                Key: `code-swap/${run.artifactService}/head.json`
              })
            )
            .then(async (response) => identitySchema.parse(JSON.parse(await response.Body!.transformToString())))
            .catch((error: unknown) => {
              if (error instanceof Error && error.name === 'NoSuchKey') return undefined;
              throw error;
            })
        : undefined;
    // Start independent reads together; every result is awaited before it is used.
    identityLookup.catch(() => {});
    headLookup?.catch(() => {});
    if (
      (!input.python && input.runtime !== 'node') ||
      input.dockerBuildOutputArchitecture !== 'linux/amd64' ||
      (input.languageSpecificBundleOutput.es?.externalDependencies?.length && !input.nodeBaseDigest)
    ) {
      codeSwapIntegration.imageHasSupervisor.set(run.service, false);
      result = {
        mode: 'image',
        fallback: 'unsupported_packaging',
        reason: 'Node.js external dependencies need an independent generated install on x86 Fargate'
      };
      return input.dockerfileContents;
    }
    const { configManager: configuration } = await import('../config-manager');
    const packaging = configuration.allContainerWorkloads.find((item) => item.name === run.service)?.containers[0]
      ?.packaging;
    const source =
      packaging?.type === 'js-bundle'
        ? dirname(resolve(global.workingDir, packaging.properties.entryfilePath))
        : global.workingDir;
    const dependencyInputs = async () => {
      if (input.python) return input.python.baseInputs;
      const root = (await findProjectRoot(source)) ?? source;
      const directories: string[] = [];
      for (let directory = source; ; directory = dirname(directory)) {
        directories.push(directory);
        if (directory === root || dirname(directory) === directory) break;
      }
      return JSON.stringify(
        await Promise.all(
          directories.map(async (directory) => [
            relative(root, directory),
            await Promise.all(
              [
                'package.json',
                'package-lock.json',
                'pnpm-lock.yaml',
                'pnpm-workspace.yaml',
                'yarn.lock',
                'bun.lock',
                'bun.lockb'
              ].map(async (name) =>
                readFile(join(directory, name)).then(
                  (bytes) => [name, bytes.toString('base64')],
                  () => [name, '']
                )
              )
            )
          ])
        )
      );
    };
    const [manifest, authored, supervisor] = await Promise.all([
      dependencyInputs(),
      Promise.all([readFile(global.configPath, 'utf8'), import('../config-manager')]).then(
        ([authored, { configManager }]) =>
          JSON.stringify({
            authored,
            plan: configManager.allContainerWorkloads.find((item) => item.name === run.service)
          })
      ),
      readFile(run.supervisor)
    ]);
    let bundle: Awaited<ReturnType<typeof createCodeSwapBundle>>;
    try {
      bundle = await createCodeSwapBundle(
        input.buildContextPath,
        codeSwapBaseInputs({
          manifest,
          ...(input.nodeBaseDigest && { dependencyImage: input.nodeBaseDigest }),
          lock: '',
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
    } catch (error) {
      if (!(error instanceof Error) || !/^(?:Code swap|Unsupported code swap)/.test(error.message)) throw error;
      codeSwapIntegration.imageHasSupervisor.set(run.service, false);
      result = { mode: 'image', fallback: 'unsupported_artifact', reason: error.message };
      return input.dockerfileContents;
    }
    const revision = stack.nextVersion;
    const key = `code-swap/${run.artifactService}/bundles/${revision}-${bundle.sha256}.tgz`;
    identity = {
      packagingDigest: input.packagingDigest,
      baseDigest: bundle.baseDigest,
      codeDigest: bundle.codeDigest,
      sha256: bundle.sha256,
      size: bundle.size,
      key,
      revision
    };
    result = { revision, mode: 'image', identity, initial: stack.stackActionType === 'create' };
    // The image uses the same real bundler output, entrypoint and dependencies as the ordinary js-bundle image.
    codeSwapIntegration.imageHasSupervisor.set(run.service, true);
    const rendered = await codeSwapDockerfile(input.buildContextPath, input.dockerfileContents, run.supervisor);
    if (input.python) {
      await writeFile(join(input.buildContextPath, 'stacktape-start'), `#!/bin/sh\nexec ${input.python.command}\n`, {
        mode: 0o755
      });
    }
    const { configManager } = await import('../config-manager');
    const port =
      configManager.allContainerWorkloads
        .find((item) => item.name === run.service)
        ?.containers[0]?.environment?.findLast((entry) => entry.name === 'PORT')?.value ?? 3000;
    if (typeof port !== 'number' && (typeof port !== 'string' || !/^\d+$/.test(port)))
      throw new Error('Code swap needs a resolved numeric PORT.');
    const authoredGrace =
      configManager.allContainerWorkloads.find((item) => item.name === run.service)?.containers[0]?.stopTimeout ?? 2;
    const dockerfile = async () => {
      await identityLookup;
      return (
        rendered +
        (input.python
          ? '\nCOPY stacktape-start /stacktape-start\nENV STP_CODE_SWAP_COMMAND=/stacktape-start PYTHONDONTWRITEBYTECODE=1\n'
          : '') +
        `\nENV STP_CODE_SWAP_SERVICE=${run.recordService} STP_BENCH_TABLE=${run.table} STP_BENCH_BUCKET=${artifacts.deploymentBucketName} STP_BENCH_TASK_MIB=${run.memory} STP_BENCH_PORT=${port} STP_BENCH_ENTRY=index.js STP_BENCH_GRACE_S=${authoredGrace}${run.phase4 ? ' STP_BENCH_PHASE4=1' : ''}${run.phase3 ? ' STP_BENCH_PHASE3=1' : ''}${checkedStatusRoleId ? ` STP_BENCH_ROLE_ID=${checkedStatusRoleId}` : ''}\nENTRYPOINT ["/stacktape-supervisor"]\n`
      );
    };
    if (
      stack.stackActionType === 'create' ||
      (run.phase4 && !hadCodeSwapTable) ||
      run.mode === 'image' ||
      global.args.fullDeploy ||
      recoveryReason
    ) {
      if (recoveryReason) result.fallback = recoveryReason;
      await put({ Phase: 'abort' });
      return dockerfile();
    }
    const head = await headLookup!;
    if (!head) {
      result.fallback = 'base_changed';
      await put({ Phase: 'abort' });
      return dockerfile();
    }
    if (run.phase4 && head.revision !== releaseRecord?.HistoryVersion) {
      result.fallback = 'interrupted_swap_image_repair';
      await put({ Phase: 'abort' });
      return dockerfile();
    }
    if (head.baseDigest !== identity.baseDigest) {
      result.fallback = 'base_changed';
      await put({ Phase: 'abort' });
      return dockerfile();
    }
    if (head.codeDigest === identity.codeDigest) {
      result.mode = 'unchanged';
      return dockerfile();
    }
    const service = stack.existingStackResources.find(
      (r) => r.LogicalResourceId === cfLogicalNames.ecsService(run.service, false)
    )!.PhysicalResourceId;
    const cluster = service.split('/')[1];
    // Prepare runs beside the actual Docker build/ECR push; commit remains in updateEcsService after the upload gate.
    prepare = (async () => {
      const [fleetCheck, upload, roleCheck, attempt] = await Promise.allSettled([
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
        identityLookup,
        run.phase4
          ? s3.send(
              new PutObjectCommand({
                Bucket: artifacts.deploymentBucketName,
                Key: `code-swap/${run.artifactService}/attempts/${revision}-${global.invocationId}.json`,
                Body: JSON.stringify({
                  revision,
                  invocationId: global.invocationId,
                  outcome: 'incomplete',
                  baseline: head,
                  candidate: identity
                })
              })
            )
          : Promise.resolve()
      ]);
      // Finish every prerequisite before any fallback; a failed check never publishes prepare.
      if (fleetCheck.status === 'rejected') throw fleetCheck.reason;
      if (upload.status === 'rejected') throw upload.reason;
      if (roleCheck.status === 'rejected') throw roleCheck.reason;
      if (attempt.status === 'rejected') throw attempt.reason;
      const before = fleetCheck.value;
      result.tasks = before.ids;
      result.primary = before.primary;
      trace('preparePrerequisitesReady');
      await faultCheckpoint('before-proposal');
      await put({ Revision: revision, Key: key, Sha256: bundle.sha256, Size: bundle.size, Phase: 'prepare' });
      const prepared = await waitStatus(before.ids, revision, 'prepared');
      trace('allPrepared');
      result.prepared = prepared;
      return { ids: before.ids, statuses: prepared, service, cluster };
    })();
    if (run.phase4) codeSwapTrackPreparation(prepare);
    // Handle rejection immediately, then propagate it at the image gate.
    prepare.catch((error) => {
      preparationError = error;
    });
    return dockerfile();
  };
  const codeSwapSwap = async (update: Awaited<ReturnType<typeof getECSHotswapInformation>>) => {
    trace('codeSwapSwap:start');
    if (result.mode === 'swap') return true;
    if (!prepare) return false;
    try {
      const { ids, service, cluster } = await prepare;
      if (preparationError) throw preparationError;
      if (
        update.blueGreen ||
        update.workload.containers.length !== 1 ||
        update.workload.containers.some((c) => c.internalHealthCheck)
      )
        throw new Error('This workload cannot swap code.');
      if (JSON.stringify((await traceAsync('commitFleet', () => fleet(service, cluster))).ids) !== JSON.stringify(ids))
        throw new Error('Fleet changed before commit.');
      await put({
        Revision: identity!.revision,
        Key: identity!.key,
        Sha256: identity!.sha256,
        Size: identity!.size,
        Phase: 'commit'
      });
      await faultCheckpoint('after-commit');
      const completed = await waitStatus(ids, identity!.revision, 'complete');
      trace('allComplete');
      if (JSON.stringify((await fleet(service, cluster)).ids) !== JSON.stringify(ids))
        throw new Error('Fleet changed after commit.');
      const { ddb, run } = await clients();
      const committed = await ddb.send(
        new GetItemCommand({
          TableName: run.table,
          Key: { pk: { S: `release#${run.recordService}` } },
          ConsistentRead: true
        })
      );
      if (JSON.parse(committed.Item!.data!.S!).Revision !== identity!.revision)
        throw new Error('Committed identity lost.');
      result = { ...result, mode: 'swap', completed };
      return true;
    } catch (error) {
      const capReason =
        error instanceof Error && error.message.startsWith('Code swap skipped') ? error.message : undefined;
      if (capReason) {
        const { tuiManager } = await import('../../app/tui-manager');
        tuiManager.info(capReason);
      }
      let memoryReason: string | undefined;
      if (result.fallback === 'memory_screen') {
        const refusal = z
          .object({
            timings: z.object({
              memoryBefore: z.object({ peakBytes: z.number(), effectiveLimitBytes: z.number(), peakFile: z.string() })
            })
          })
          .safeParse(result.refusal);
        if (refusal.success) {
          const { configManager } = await import('../config-manager');
          const { run } = await clients();
          const workload = configManager.allContainerWorkloads.find((item) => item.name === run.service);
          memoryReason = memoryFallbackReason(
            refusal.data.timings.memoryBefore,
            ALLOWED_MEMORY_VALUES_FOR_CPU[workload?.resources.cpu ?? 0.25]
          );
        }
      }
      result = {
        ...result,
        mode: 'image',
        fallback: capReason ? 'task_cap_exceeded' : (result.fallback ?? 'swap_failed'),
        reason: capReason ?? memoryReason,
        failure: String(error)
      };
      await put({ Phase: 'abort' });
      await waitForCandidateCleanup();
      prepare = undefined;
      return false;
    }
  };
  // CloudFormation resolves RoleId for full deployments; direct ECS registration needs the actual value.
  const codeSwapResolveRole = async (
    definition: Awaited<ReturnType<typeof getECSHotswapInformation>>['newCfTaskDefinition']
  ) => {
    const { run } = await clients();
    if (!run.phase4 || run.optOut || codeSwapIntegration.imageHasSupervisor.get(run.service) === false) return;
    await codeSwapPrimeIdentity();
    // Over-cap services skip the swap preflight but still need the RoleId for the image fallback.
    resolveStatusRole(definition, checkedStatusRoleId ?? (await lookupTaskRoleId()));
  };
  const waitForCandidateCleanup = async () => {
    const expectedIds = result.tasks === undefined ? [] : z.array(z.string()).parse(result.tasks);
    const deadline = Date.now() + 35000;
    for (;;) {
      const found = expectedIds.length ? await statuses(expectedIds) : [];
      if (!expectedIds.length || allCandidatesCleaned(found, expectedIds.length, identity!.revision)) break;
      if (Date.now() > deadline) throw new Error('Candidate cleanup not confirmed; refusing image fallback.');
      await Bun.sleep(100);
    }
  };

  const codeSwapUseImage = async () => {
    if (!prepare) return;
    await Promise.allSettled([prepare]);
    await abortCodeSwapPreparation();
    result = { ...result, mode: 'image', fallback: result.fallback ?? 'task_configuration_changed' };
  };

  const abortCodeSwapPreparation = async () => {
    if (!prepare || result.mode === 'swap') return;
    // A packaging/template failure after prepare must not leave an idle candidate behind when the lock is released.
    await put({ Phase: 'abort' });
    await waitForCandidateCleanup();
    prepare = undefined;
  };

  const codeSwapReleaseIdentity = () =>
    identity || result.mode ? { identity, mode: result.mode, fallback: result.fallback } : undefined;
  const recordImageBaseline = async (version: string) => {
    const { run, stack, ddb } = await clients();
    const previous = await readReleaseRecord(ddb, run.table, run.recordService);
    const service = stack.existingStackResources.find(
      (r) => r.LogicalResourceId === cfLogicalNames.ecsService(run.service, false)
    )!.PhysicalResourceId;
    await writeReleaseRecord(
      ddb,
      run.table,
      previous,
      {
        Seq: (previous?.Seq ?? 0) + 1,
        TaskDefinition: (await newServiceState(service)).taskDefinition!,
        Committed: null,
        Proposed: null,
        HistoryVersion: version,
        Attempt: null,
        Phase: 'abort'
      },
      run.recordService
    );
  };
  const removeCodeSwapArtifacts = async (currentRevision: string) => {
    const { ecs, stack, s3, artifacts, run } = await clients();
    const service = stack.existingStackResources.find(
      (resource) => resource.LogicalResourceId === cfLogicalNames.ecsService(run.service, false)
    )?.PhysicalResourceId;
    // A completed full deployment may already have removed this service and its task consumers.
    if (service) await waitForRetiredCodeSwapTasks(ecs, service);
    await pruneCodeSwapArtifacts({
      s3,
      bucket: artifacts.deploymentBucketName,
      currentRevision,
      optOut: true,
      service: run.artifactService
    });
  };
  const codeSwapRollbackComplete = async (newVersion: string, targetVersion: string, tablePresent = true) => {
    const { run, s3, artifacts } = await clients();
    if (!run.phase4) return;
    if (!tablePresent) {
      if (hadCodeSwapTable) await removeCodeSwapArtifacts(newVersion);
      return;
    }
    let restoredIdentity: Identity;
    try {
      const savedIdentity = await s3.send(
        new GetObjectCommand({
          Bucket: artifacts.deploymentBucketName,
          Key: `code-swap/${run.artifactService}/releases/${targetVersion}.json`
        })
      );
      restoredIdentity = identitySchema.parse(JSON.parse(await savedIdentity.Body!.transformToString()));
    } catch (error) {
      if (!(error instanceof Error && error.name === 'NoSuchKey')) throw error;
      // An image-only release above the task cap has no overlay identity.
      await recordImageBaseline(newVersion);
      await s3.send(
        new DeleteObjectCommand({
          Bucket: artifacts.deploymentBucketName,
          Key: `code-swap/${run.artifactService}/head.json`
        })
      );
      return;
    }
    await recordImageBaseline(newVersion);
    await s3.send(
      new PutObjectCommand({
        Bucket: artifacts.deploymentBucketName,
        Key: `code-swap/${run.artifactService}/releases/${newVersion}.json`,
        Body: JSON.stringify({ ...restoredIdentity, revision: newVersion })
      })
    );
    await s3.send(
      new PutObjectCommand({
        Bucket: artifacts.deploymentBucketName,
        Key: `code-swap/${run.artifactService}/head.json`,
        Body: JSON.stringify({ ...restoredIdentity, revision: newVersion }),
        ContentType: 'application/json'
      })
    );
  };
  const codeSwapComplete = async (createsRelease: boolean) => {
    if (!createsRelease) return;
    if (result.mode === 'unchanged') {
      // An infrastructure-only release advances ordinary retention while preserving the serving overlay.
      await pruneArtifacts();
      return;
    }
    if (!identity) {
      const { run, stack, s3, artifacts } = await clients();
      let cachedImageFinalized = false;
      if (run.phase4 && !run.optOut && runningHead && !result.mode) {
        const service = stack.existingStackResources.find(
          (item) => item.LogicalResourceId === cfLogicalNames.ecsService(run.service, false)
        )?.PhysicalResourceId;
        if (service && (await newServiceState(service)).taskDefinition !== releaseRecordAtStart?.TaskDefinition) {
          await recordImageBaseline(stack.nextVersion);
          const baseline = { ...runningHead, revision: stack.nextVersion };
          for (const key of [
            `code-swap/${run.artifactService}/head.json`,
            `code-swap/${run.artifactService}/releases/${stack.nextVersion}.json`
          ])
            await s3.send(
              new PutObjectCommand({ Bucket: artifacts.deploymentBucketName, Key: key, Body: JSON.stringify(baseline) })
            );
          result = { mode: 'image', fallback: 'task_configuration_changed' };
          cachedImageFinalized = true;
        }
      }
      if (run.phase4 && !run.optOut && result.mode === 'image' && !cachedImageFinalized) {
        await recordImageBaseline(stack.nextVersion);
        await s3.send(
          new DeleteObjectCommand({
            Bucket: artifacts.deploymentBucketName,
            Key: `code-swap/${run.artifactService}/head.json`
          })
        );
      }
      if (run.phase4 && run.optOut) {
        if (hadCodeSwapTable) await removeCodeSwapArtifacts(stack.nextVersion);
      } else if (run.phase4) {
        await pruneArtifacts();
      }
      if (run.result) await writeFile(run.result, JSON.stringify(result, null, 2));
      if (result.mode) await reportResult();
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
          new GetObjectCommand({
            Bucket: artifacts.deploymentBucketName,
            Key: `fast-release/${stack.nextVersion}.json`
          })
        );
        fastMarker = await marker.Body!.transformToString();
      } catch (error) {
        if (!(error instanceof Error && error.name === 'NoSuchKey' && result.mode === 'image')) throw error;
      }
      if (fastMarker !== undefined) {
        const marker = z
          .object({ codeSwap: z.object({ mode: z.string().optional(), identity: z.unknown() }) })
          .parse(JSON.parse(fastMarker));
        const stored =
          marker.codeSwap.mode === 'services'
            ? z
                .object({ identity: identitySchema })
                .parse(z.record(z.string(), z.unknown()).parse(marker.codeSwap.identity)[run.service]).identity
            : identitySchema.parse(marker.codeSwap.identity);
        if (stored.codeDigest !== identity.codeDigest)
          throw new Error('Ordinary release history did not record the code identity.');
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
          .parse(template.Resources[cfLogicalNames.ecsTaskDefinition(run.service)]);
        const app = definition.Properties.ContainerDefinitions.find((container) => container.Essential !== false);
        if (!app) throw new Error('Recorded image has no essential app.');
        const taskDefinition = stack.existingStackResources.find(
          (resource) => resource.LogicalResourceId === cfLogicalNames.ecsTaskDefinition(run.service)
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
    if (run.phase4) {
      await s3.send(
        new PutObjectCommand({
          Bucket: artifacts.deploymentBucketName,
          Key: `code-swap/${run.artifactService}/releases/${identity.revision}.json`,
          Body: JSON.stringify(identity)
        })
      );
    }
    let finalizeHistory = async () => {};
    if (run.phase4) {
      const { ddb } = await clients();
      const previous = await readReleaseRecord(ddb, run.table, run.recordService);
      if (result.mode === 'swap' && (previous?.Committed?.Revision !== identity.revision || previous.Proposed))
        throw new Error('Committed code changed before history finalization.');
      const service = stack.existingStackResources.find(
        (r) => r.LogicalResourceId === cfLogicalNames.ecsService(run.service, false)
      )!.PhysicalResourceId;
      const currentDefinition = (await newServiceState(service)).taskDefinition!;
      const next: SwapRecord =
        result.mode === 'swap'
          ? { ...previous!, Seq: previous!.Seq + 1, HistoryVersion: identity.revision }
          : {
              Seq: (previous?.Seq ?? 0) + 1,
              TaskDefinition: currentDefinition,
              Committed: null,
              Proposed: null,
              HistoryVersion: identity.revision,
              Attempt: null,
              Phase: 'abort'
            };
      finalizeHistory = async () => {
        await writeReleaseRecord(ddb, run.table, previous, next, run.recordService);
      };
    }
    await s3.send(
      new PutObjectCommand({
        Bucket: artifacts.deploymentBucketName,
        Key: `code-swap/${run.artifactService}/head.json`,
        Body: JSON.stringify(identity),
        ContentType: 'application/json'
      })
    );
    if (result.mode === 'swap') {
      const service = stack.existingStackResources.find(
        (resource) => resource.LogicalResourceId === cfLogicalNames.ecsService(run.service, false)
      )!.PhysicalResourceId;
      const final = await fleet(service, service.split('/')[1]);
      if (JSON.stringify(final.ids) !== JSON.stringify(result.tasks))
        throw new Error('Fleet changed while recording release history.');
      const fresh = await statuses(final.ids);
      if (
        fresh.length !== final.ids.length ||
        fresh.some((status) => status.revision !== identity!.revision || status.state !== 'complete')
      )
        throw new Error('Task failed while recording release history.');
    }
    // Until the final reconciliation passes, recovery must still see an unfinished committed attempt.
    await finalizeHistory();
    await pruneArtifacts();
    await reportResult();
    if (run.result)
      await writeFile(
        run.result,
        JSON.stringify(
          { ...result, bucket: artifacts.deploymentBucketName, repository: artifacts.repositoryName },
          null,
          2
        )
      );
  };

  const reportResult = async () => {
    const { tuiManager } = await import('../../app/tui-manager');
    const { run } = await clients();
    if (result.mode === 'swap') {
      tuiManager.info(
        `Swapped code in ${run.service}; every task serves the new release and the old processes have exited.`
      );
      return;
    }
    const reasons: Record<string, string> = {
      base_changed: 'dependencies, environment or base configuration changed',
      another_service_failed: 'another changed service could not complete its swap',
      task_configuration_changed: 'the resolved task or infrastructure configuration changed',
      memory_screen: 'the kernel peak-memory screen refused a swap',
      swap_failed: `candidate or fleet check failed (${result.failure})`,
      interrupted_swap_image_repair: 'repairing an interrupted swap',
      task_cap_exceeded: 'task capacity is outside the supported bounds'
    };
    const reason =
      result.reason ??
      reasons[String(result.fallback)] ??
      result.fallback ??
      (run.optOut ? 'code swap disabled' : 'initial opt-in');
    tuiManager.info(`Image deploy for ${run.service}: ${reason}.`);
  };

  const codeSwapImageExtension = async (workloadName: string) => {
    if (run.service !== workloadName) return undefined;
    const { stack, s3, artifacts } = await clients();
    let currentDigest: string | undefined;
    if (!run.optOut && stack.stackActionType !== 'create') {
      try {
        const head = await s3.send(
          new GetObjectCommand({
            Bucket: artifacts.deploymentBucketName,
            Key: `code-swap/${run.artifactService}/head.json`
          })
        );
        runningHead = identitySchema.parse(JSON.parse(await head.Body!.transformToString()));
        currentDigest = runningHead.packagingDigest;
      } catch (error) {
        if (!(error instanceof Error && error.name === 'NoSuchKey')) throw error;
      }
    }
    selectedWorkload = workloadName;
    const { configManager } = await import('../config-manager');
    const workload = configManager.allContainerWorkloads.find((item) => item.name === run.service);
    const { getJobName } = await import('@stacktape/naming/workload-names');
    if (workload)
      jobName = getJobName({
        workloadName: workload.name,
        workloadType: workload.configParentResourceType,
        containerName: workload.containers[0]?.name
      });
    return {
      digestInput: await codeSwapBuildInputs(),
      // Historical cached images cannot establish the identity currently serving through an overlay.
      existingDigests: currentDigest ? [currentDigest] : [],
      transform: codeSwapImage
    };
  };

  const codeSwapPythonExtension = async (workloadName: string) => {
    const extension = await codeSwapImageExtension(workloadName);
    if (!extension) return;
    return {
      digestInput: extension.digestInput,
      existingDigests: extension.existingDigests,
      prepare: async (input: {
        packagingDigest: string;
        sourceDirectoryPath: string;
        includedFilePaths: string[];
        plan: import('@stacktape/packaging/image/railpack').RailpackPlan;
        python: boolean;
        baseInputs: string;
        baseImage: string;
      }) => {
        const { plan } = input;
        const { configManager } = await import('../config-manager');
        const packaging = configManager.allContainerWorkloads.find((item) => item.name === run.service)?.containers[0]
          ?.packaging;
        const props = packaging?.type === 'buildpack' ? packaging.properties : undefined;
        const requirements = await readFile(join(input.sourceDirectoryPath, 'requirements.txt'), 'utf8').catch(
          () => undefined
        );
        const steps = z
          .array(z.object({ name: z.string(), commands: z.array(z.unknown()).optional() }).loose())
          .safeParse(plan.steps);
        const strictPlan = strictPythonPlan(plan);
        // Source-installed projects/custom builds need rebuilt artifacts, not a source overlay. Fail closed.
        const unsupported =
          !input.python ||
          !strictPlan ||
          !requirements ||
          !pythonHashLock(requirements) ||
          !plan.deploy?.startCommand ||
          !/^(?:uvicorn|gunicorn|python(?:3(?:\.\d+)?)?)(?:\s|$)/.test(plan.deploy.startCommand) ||
          /[;&|`\n\r]|\$\(|\/app(?:\/|\b)/.test(plan.deploy.startCommand) ||
          props?.buildCommand ||
          props?.installCommand ||
          props?.railpackConfig ||
          !steps.success ||
          steps.data.some((step) => step.name === 'build' && step.commands?.length);
        if (unsupported) {
          codeSwapIntegration.imageHasSupervisor.set(run.service, false);
          result = {
            mode: 'image',
            reason:
              'Python code swap requires local Docker caching, a complete transitive requirements.txt lock (every requirement pinned with == and SHA-256 hashes; generate with uv pip compile --generate-hashes), direct uvicorn/gunicorn/python startup, and no local dependencies or custom build/install steps'
          };
          return;
        }
        const { fsPaths } = await import('../../config/runtime-paths');
        const { global } = await clients();
        const context = join(
          fsPaths.absoluteBuildFolderPath({ invocationId: global.invocationId }),
          'code-swap',
          run.service
        );
        await mkdir(context, { recursive: true });
        for (const file of input.includedFilePaths) {
          const name = relative(input.sourceDirectoryPath, file);
          if (!name || name.startsWith('../') || isAbsolute(name))
            throw new Error('Python source escaped its build context.');
          if (name.split('/').some((part) => ['.venv', '__pycache__', '.git'].includes(part)) || name.endsWith('.pyc'))
            continue;
          const stat = await lstat(file);
          if (stat.isDirectory()) continue;
          if (!stat.isFile()) {
            codeSwapIntegration.imageHasSupervisor.set(run.service, false);
            result = { mode: 'image', reason: 'Python code swap requires regular source files; links use images' };
            return;
          }
          await mkdir(dirname(join(context, name)), { recursive: true });
          await copyFile(file, join(context, name));
        }
        return {
          plan: strictPlan,
          imageFallback: () => {
            codeSwapIntegration.imageHasSupervisor.set(run.service, false);
            result = {
              mode: 'image',
              reason:
                'Python strict --require-hashes dependency installation failed; generate a complete transitive lock with uv pip compile --generate-hashes'
            };
          },
          finish: async (imageId: string) => {
            const { stdout } = await execDocker([
              'run',
              '--rm',
              '--network=none',
              '--entrypoint',
              '/app/.venv/bin/python',
              imageId,
              '-I',
              '-c',
              pythonEnvironmentFingerprint
            ]);
            if (!/^[a-f0-9]{64}$/.test(stdout.trim()))
              throw new Error('Invalid Python dependency environment fingerprint.');
            const dockerfileContents = await codeSwapImage({
              packagingDigest: input.packagingDigest,
              dockerfileContents: `FROM ${input.baseImage}\nCOPY . /app\nWORKDIR /app\n`,
              buildContextPath: context,
              runtime: 'python',
              nodeVersion: 0,
              nodeTarget: '',
              minify: false,
              dockerBuildOutputArchitecture: 'linux/amd64',
              languageSpecificBundleOutput: {},
              python: {
                command: plan.deploy!.startCommand!,
                baseInputs: JSON.stringify({ build: input.baseInputs, requirements, environment: stdout.trim() })
              }
            });
            // Build from the exact image measured above, even if another local build moves its tag.
            return {
              dockerfileContents: dockerfileContents.replace(`FROM ${input.baseImage}\n`, `FROM ${imageId}\n`),
              buildContextPath: context
            };
          }
        };
      }
    };
  };

  const pruneArtifacts = async () => {
    const { s3, artifacts, ddb, run, ecs, stack, global } = await clients();
    if (result.mode === 'image') {
      const service = stack.existingStackResources.find(
        (resource) => resource.LogicalResourceId === cfLogicalNames.ecsService(run.service, false)
      )!.PhysicalResourceId;
      // A bootstrapping old task may have read the previous record before it could write a status row.
      await waitForRetiredCodeSwapTasks(ecs, service);
    }
    const protectedRevisions = await pruneStoppedStatuses();
    const record = run.phase4 ? await readReleaseRecord(ddb, run.table, run.recordService) : undefined;
    const bundles = [record?.Committed, record?.Proposed].filter((bundle) => bundle !== null && bundle !== undefined);
    await pruneCodeSwapArtifacts({
      s3,
      bucket: artifacts.deploymentBucketName,
      currentRevision: identity?.revision ?? stack.nextVersion,
      currentAttemptId: global.invocationId,
      service: run.artifactService,
      protectedRevisions: [...protectedRevisions, ...bundles.map((bundle) => bundle.Revision)],
      protectedBundleKeys: bundles.map((bundle) => bundle.Key)
    });
  };

  const pruneStoppedStatuses = async () => {
    const { ddb, ecs, run, stack } = await clients();
    const service = stack.existingStackResources.find(
      (resource) => resource.LogicalResourceId === cfLogicalNames.ecsService(run.service, false)
    )!.PhysicalResourceId;
    const protectedRevisions: string[] = [];
    let cursor: Record<string, import('@aws-sdk/client-dynamodb').AttributeValue> | undefined;
    do {
      const page = await ddb.send(
        new ScanCommand({
          TableName: run.table,
          ConsistentRead: true,
          ExclusiveStartKey: cursor,
          ProjectionExpression: 'pk, #data',
          ExpressionAttributeNames: { '#data': 'data' },
          FilterExpression: 'begins_with(pk, :prefix)',
          ExpressionAttributeValues: { ':prefix': { S: `status#${run.recordService}#` } }
        })
      );
      const keys = (page.Items ?? []).flatMap((item) => (item.pk?.S ? [item.pk.S] : []));
      for (let start = 0; start < keys.length; start += 10) {
        const batch = keys.slice(start, start + 10);
        const tasks = await ecs.send(
          new DescribeTasksCommand({
            cluster: service.split('/')[1],
            tasks: batch.map((key) => key.split(':').at(-1)!)
          })
        );
        const stopped = batch.filter((key) => {
          const id = key.split(':').at(-1)!;
          return (
            tasks.tasks?.some((task) => task.taskArn?.endsWith(`/${id}`) && task.lastStatus === 'STOPPED') ||
            tasks.failures?.some(
              (failure) => (failure.arn === id || failure.arn?.endsWith(`/${id}`)) && failure.reason === 'MISSING'
            )
          );
        });
        for (const key of batch.filter((key) => !stopped.includes(key))) {
          const item = page.Items!.find((item) => item.pk?.S === key)!;
          protectedRevisions.push(statusSchema.parse(JSON.parse(item.data!.S!)).revision);
        }
        if (stopped.length) {
          await ddb.send(
            new BatchWriteItemCommand({
              RequestItems: { [run.table]: stopped.map((key) => ({ DeleteRequest: { Key: { pk: { S: key } } } })) }
            })
          );
          // A later successful deploy can retry throttled cleanup. Never expire live task evidence.
          // Keep scanning: throttled stopped-row deletion must not hide later live-task references.
        }
      }
      cursor = page.LastEvaluatedKey;
    } while (cursor);
    return protectedRevisions;
  };

  return {
    imageMatchesRunningCode: (name: string, digest: string, taskDefinition: string) =>
      name === jobName &&
      !prepare &&
      !run.optOut &&
      !recoveredOperation &&
      (!result.mode || result.mode === 'unchanged') &&
      runningHead?.packagingDigest === digest &&
      releaseRecordAtStart?.TaskDefinition === taskDefinition &&
      !releaseRecordAtStart.Proposed &&
      releaseRecordAtStart.HistoryVersion === runningHead.revision,
    codeSwapPending,
    codeSwapPythonExtension,
    codeSwapImageExtension,
    codeSwapSwap,
    codeSwapResolveRole,
    codeSwapUseImage,
    abortCodeSwapPreparation,
    codeSwapReleaseIdentity,
    codeSwapRollbackComplete,
    codeSwapComplete,
    prepared: () => prepare,
    forceImage: () => {
      prepare = undefined;
      result.mode = 'image';
      result.fallback ??= 'another_service_failed';
    },
    verify: async () => {
      if (result.mode !== 'swap' || !identity) return;
      const { stack, ddb } = await clients();
      const service = stack.existingStackResources.find(
        (item) => item.LogicalResourceId === cfLogicalNames.ecsService(run.service, false)
      )!.PhysicalResourceId;
      const final = await fleet(service, service.split('/')[1]);
      const fresh = await statuses(final.ids);
      const record = await readReleaseRecord(ddb, run.table, run.recordService);
      if (
        JSON.stringify(final.ids) !== JSON.stringify(result.tasks) ||
        fresh.length !== final.ids.length ||
        fresh.some((status) => status.revision !== identity!.revision || status.state !== 'complete') ||
        record?.HistoryVersion !== identity.revision ||
        record.Committed?.Revision !== identity.revision ||
        record.Proposed
      )
        throw new Error(`Final code-swap reconciliation failed for ${run.service}.`);
    }
  };
};
