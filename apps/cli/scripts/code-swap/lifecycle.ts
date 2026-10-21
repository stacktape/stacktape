// Owned live ECS/HTTP API scenario, invoked only by run.ts --phase3.
import {
  ECSClient,
  DescribeServicesCommand,
  DescribeTasksCommand,
  ListTasksCommand,
  UpdateServiceCommand,
  StopTaskCommand,
  DescribeTaskDefinitionCommand
} from '@aws-sdk/client-ecs';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import {
  CloudFormationClient,
  GetTemplateCommand,
  DescribeStackResourcesCommand
} from '@aws-sdk/client-cloudformation';
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { parse as parseYaml } from 'yaml';

export const qualifyLifecycle = async (
  owned: { name: string; table: string; directory: string },
  url: string,
  expected: string,
  {
    clients,
    guard,
    save,
    count
  }: {
    count: number;
    clients: { region: string; credentials: AwsCredentialIdentityProvider };
    guard: () => Promise<void>;
    save: (path: string, value: unknown) => Promise<void>;
  }
) => {
  await guard();
  const ecs = new ECSClient(clients),
    ddb = new DynamoDBClient(clients);
  const resources = (
    await new CloudFormationClient(clients).send(
      new DescribeStackResourcesCommand({ StackName: `${owned.name}-bench` })
    )
  ).StackResources!;
  const service = resources.find((resource) => resource.ResourceType === 'AWS::ECS::Service')!.PhysicalResourceId!;
  const cluster = service.split('/')[1]!;
  const template = await new CloudFormationClient(clients).send(
    new GetTemplateCommand({ StackName: `${owned.name}-bench` })
  );
  const templateBody: unknown = parseYaml(template.TemplateBody!);
  await save(join(owned.directory, 'phase3-template.json'), templateBody);
  const serviceState = async () =>
    (await ecs.send(new DescribeServicesCommand({ cluster, services: [service] }))).services![0]!;
  const taskState = async () => {
    const arns =
      (
        await ecs.send(
          new ListTasksCommand({ cluster, serviceName: service.split('/').at(-1), desiredStatus: 'RUNNING' })
        )
      ).taskArns ?? [];
    return arns.length ? ((await ecs.send(new DescribeTasksCommand({ cluster, tasks: arns }))).tasks ?? []) : [];
  };
  const initial = await serviceState();
  const definition = (await ecs.send(new DescribeTaskDefinitionCommand({ taskDefinition: initial.taskDefinition! })))
    .taskDefinition!;
  assert.deepEqual(definition.containerDefinitions?.find((c) => c.essential !== false)?.healthCheck, {
    command: ['CMD', '/stacktape-supervisor', 'readiness'],
    interval: 5,
    timeout: 2,
    retries: 3,
    startPeriod: 150
  });
  assert.equal(definition.containerDefinitions?.find((c) => c.essential !== false)?.stopTimeout, 60);
  const drain = definition.containerDefinitions?.find((c) => c.name === 'stp-cloudmap-drain');
  assert(
    drain &&
      drain.essential === false &&
      drain.stopTimeout === 40 &&
      drain.image?.includes('.dkr.ecr.eu-west-1.amazonaws.com/')
  );
  const originalTasks = new Set((await taskState()).map((task) => task.taskArn!));
  const release = (
    await ddb.send(
      new GetItemCommand({ TableName: owned.table, Key: { pk: { S: 'release#node' } }, ConsistentRead: true })
    )
  ).Item!;
  const committed = JSON.parse(release.data!.S!) as { Revision: string };
  const roleId = definition.containerDefinitions
    ?.flatMap((container) => container.environment ?? [])
    .find((env) => env.name === 'STP_BENCH_ROLE_ID')?.value;
  assert(roleId, 'Missing injected RoleId in initial task definition.');
  const bootstrapEvidence = new Map<string, unknown>();
  const registrations = JSON.stringify(initial.serviceRegistries);
  const samples: {
    phase: string;
    at: number;
    awsMs?: number;
    task?: string;
    revision?: string;
    status: number;
    error?: string;
  }[] = [];
  const qualification: Record<string, unknown> = {};
  let phase = 'scale-out';
  const controller = new AbortController();
  const traffic = (async () => {
    while (!controller.signal.aborted) {
      try {
        const response = await fetch(`${url}/version`, { signal: AbortSignal.timeout(4000) });
        const body = (await response.json()) as { revision?: string };
        samples.push({
          phase,
          at: performance.now(),
          awsMs: Number(response.headers.get('x-lab-now-ms')),
          task: response.headers.get('x-lab-task') ?? undefined,
          revision: body.revision,
          status: response.status
        });
        if (response.ok) assert.equal(body.revision, expected, 'Stale code served by a replacement.');
      } catch (error) {
        samples.push({ phase, at: performance.now(), status: 0, error: String(error) });
      }
      await Bun.sleep(100);
    }
  })();
  const wait = async (condition: () => Promise<boolean>, seconds = 240) => {
    const deadline = performance.now() + seconds * 1000;
    while (!(await condition())) {
      assert(performance.now() < deadline, `Lifecycle timeout in ${phase}`);
      await Bun.sleep(1000);
    }
  };
  const fullyRouted = async (count: number, excluded: string[] = []) => {
    const tasks = await taskState();
    const healthy = tasks.filter(
      (task) => task.healthStatus === 'HEALTHY' && task.lastStatus === 'RUNNING' && !excluded.includes(task.taskArn!)
    );
    for (const task of healthy) {
      if (originalTasks.has(task.taskArn!) || bootstrapEvidence.has(task.taskArn!)) continue;
      const row = (
        await ddb.send(
          new GetItemCommand({
            TableName: owned.table,
            Key: { pk: { S: `status#node#${roleId}:${task.taskArn!.split('/').at(-1)}` } },
            ConsistentRead: true
          })
        )
      ).Item;
      if (!row?.data?.S) return false;
      const status = JSON.parse(row.data.S) as {
        state: string;
        revision: string;
        timings: { bootAtMs: number; readyAtMs: number; listenerAtMs: number };
      };
      assert.equal(status.revision, committed.Revision, 'Healthy replacement did not load committed code.');
      assert.equal(status.state, 'complete');
      assert(
        status.timings.bootAtMs <= status.timings.readyAtMs && status.timings.readyAtMs <= status.timings.listenerAtMs,
        'Committed bootstrap did not precede listener/readiness.'
      );
      bootstrapEvidence.set(task.taskArn!, { task: task.taskArn, health: task.healthStatus, ...status });
    }
    return (
      healthy.length === count &&
      healthy.every((task) =>
        samples.some(
          (sample) =>
            sample.phase === phase && sample.task === task.taskArn!.split('/').at(-1) && sample.revision === expected
        )
      )
    );
  };
  try {
    await ecs.send(new UpdateServiceCommand({ cluster, service, desiredCount: count }));
    await wait(() => fullyRouted(count));
    if (count === 10) {
      qualification.atCap = {
        tasks: count,
        maximumPercent: initial.deploymentConfiguration?.maximumPercent,
        scaleOutCommitted: true
      };
      phase = 'replacement-after-cli-exit';
      const victim = (await taskState()).find((task) => task.lastStatus === 'RUNNING')!;
      await ecs.send(
        new StopTaskCommand({ cluster, task: victim.taskArn!, reason: 'Owned ten-task cap replacement qualification' })
      );
      await wait(() => fullyRouted(count, [victim.taskArn!]));
      assert.equal(
        JSON.stringify((await serviceState()).serviceRegistries),
        registrations,
        'Registration ownership changed.'
      );
      qualification.replacement = { stopped: victim.taskArn, committed: true };
      assert.equal(
        samples.filter((sample) => sample.status !== 200 || sample.error || sample.revision !== expected).length,
        0,
        'At-cap scale-out/replacement failed a request or served stale code.'
      );
      return;
    }
    phase = 'delayed-healthy-old-rollout';
    const before = (await taskState()).map((task) => task.taskArn!);
    const release = (
      await ddb.send(
        new GetItemCommand({ TableName: owned.table, Key: { pk: { S: 'release#node' } }, ConsistentRead: true })
      )
    ).Item!;
    const record = JSON.parse(release.data!.S!) as Record<string, unknown>;
    await ddb.send(
      new PutItemCommand({
        TableName: owned.table,
        Item: { ...release, data: { S: JSON.stringify({ ...record, BootstrapDelayS: 60 }) } }
      })
    );
    await ecs.send(new UpdateServiceCommand({ cluster, service, forceNewDeployment: true }));
    await wait(() => fullyRouted(count, before));
    assert.equal(
      JSON.stringify((await serviceState()).serviceRegistries),
      registrations,
      'Registration ownership changed.'
    );
    await ddb.send(new PutItemCommand({ TableName: owned.table, Item: release }));
    phase = 'failed-bundle-bootstrap';
    const priorTasks = (await taskState()).map((task) => task.taskArn!);
    await ddb.send(
      new PutItemCommand({
        TableName: owned.table,
        Item: {
          ...release,
          data: { S: JSON.stringify({ ...record, Key: 'code-swap/owned-missing-bootstrap-object' }) }
        }
      })
    );
    await ecs.send(new UpdateServiceCommand({ cluster, service, forceNewDeployment: true }));
    let failed: string[] = [];
    await wait(async () => {
      const stopped =
        (
          await ecs.send(
            new ListTasksCommand({ cluster, serviceName: service.split('/').at(-1), desiredStatus: 'STOPPED' })
          )
        ).taskArns ?? [];
      // Earlier stopped generations are not evidence of this fault.
      const current = await serviceState();
      const deployment = current.deployments?.find((item) => item.status === 'PRIMARY');
      if (!deployment?.createdAt || !stopped.length) return false;
      const details = (await ecs.send(new DescribeTasksCommand({ cluster, tasks: stopped.slice(0, 100) }))).tasks ?? [];
      failed = details
        .filter(
          (task) => task.createdAt && task.createdAt >= deployment.createdAt! && !priorTasks.includes(task.taskArn!)
        )
        .map((task) => task.taskArn!);
      return failed.length > 0;
    });
    await ddb.send(new PutItemCommand({ TableName: owned.table, Item: release }));
    await wait(() => fullyRouted(count, priorTasks));
    qualification.failedBundleBootstrap = { failedTasks: failed, staleSuccessfulResponses: 0 };
    phase = 'replacement-after-cli-exit';
    const victim = (await taskState()).find((task) => task.lastStatus === 'RUNNING')!;
    await ecs.send(
      new StopTaskCommand({ cluster, task: victim.taskArn!, reason: 'Owned phase-3 replacement qualification' })
    );
    await wait(() => fullyRouted(count, [victim.taskArn!]));
    phase = 'all-unhealthy-recovery';
    const dead = (await taskState()).filter((task) => task.lastStatus === 'RUNNING');
    for (const task of dead)
      await ecs.send(
        new StopTaskCommand({ cluster, task: task.taskArn!, reason: 'Owned all-unhealthy qualification' })
      );
    await wait(
      () =>
        fullyRouted(
          count,
          dead.map((task) => task.taskArn!)
        ),
      180
    );
    assert.equal(
      samples.filter((sample) => sample.status === 200 && sample.revision !== expected).length,
      0,
      'Stale code served.'
    );
    const survivorErrors = samples.filter(
      (sample) => sample.phase !== 'all-unhealthy-recovery' && (sample.status !== 200 || sample.error)
    );
    assert.equal(survivorErrors.length, 0, 'Healthy-survivor lifecycle request failed.');
  } finally {
    controller.abort();
    await traffic;
    await ecs.send(new UpdateServiceCommand({ cluster, service, desiredCount: 1 }));
    await save(join(owned.directory, 'phase3-lifecycle.json'), {
      qualification,
      committedBootstrapBeforeReadiness: [...bootstrapEvidence.values()],
      samples,
      registrations,
      definition,
      scope:
        count === 10
          ? 'Ten-task scale-out and replacement after CLI exit; committed code only; unchanged ECS registrations'
          : 'Two-task delayed/missing bootstrap, replacement and all-unhealthy recovery; full opt-out/rollback matrix remains unqualified'
    });
  }
};
