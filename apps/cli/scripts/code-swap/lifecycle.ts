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
import { LambdaClient, PutFunctionConcurrencyCommand } from '@aws-sdk/client-lambda';
import { CloudFormationClient, GetTemplateCommand } from '@aws-sdk/client-cloudformation';
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
    save
  }: {
    clients: { region: string; credentials: AwsCredentialIdentityProvider };
    guard: () => Promise<void>;
    save: (path: string, value: unknown) => Promise<void>;
  }
) => {
  await guard();
  const ecs = new ECSClient(clients),
    ddb = new DynamoDBClient(clients),
    lambda = new LambdaClient(clients);
  const planItem = (
    await ddb.send(
      new GetItemCommand({ TableName: owned.table, Key: { pk: { S: 'capacity#plan' } }, ConsistentRead: true })
    )
  ).Item!;
  const plan = JSON.parse(planItem.data!.S!) as { services: { node: { cluster: string; serviceArn: string } } };
  const { cluster, serviceArn: service } = plan.services.node;
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
    await ecs.send(new UpdateServiceCommand({ cluster, service, desiredCount: 2 }));
    await wait(() => fullyRouted(2));
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
    await wait(() => fullyRouted(2, before));
    assert.equal(
      JSON.stringify((await serviceState()).serviceRegistries),
      registrations,
      'Registration ownership changed.'
    );
    await ddb.send(new PutItemCommand({ TableName: owned.table, Item: release }));
    phase = 'replacement-after-cli-exit';
    const victim = (await taskState()).find((task) => task.lastStatus === 'RUNNING')!;
    await ecs.send(
      new StopTaskCommand({ cluster, task: victim.taskArn!, reason: 'Owned phase-3 replacement qualification' })
    );
    await wait(() => fullyRouted(2, [victim.taskArn!]));
    phase = 'allocator-outage-serving-survivors';
    await lambda.send(
      new PutFunctionConcurrencyCommand({ FunctionName: `${owned.name}-capacity`, ReservedConcurrentExecutions: 0 })
    );
    // Leave existing admitted tasks serving for 60 AWS seconds; use response
    // timestamps so the WSL clock rate never shortens the outage.
    const awsStart = samples.findLast((sample) => sample.awsMs)?.awsMs;
    assert(awsStart);
    await wait(async () => (samples.findLast((sample) => sample.awsMs)?.awsMs ?? 0) - awsStart >= 60000, 100);
    phase = 'all-unhealthy-recovery';
    const dead = (await taskState()).filter((task) => task.lastStatus === 'RUNNING');
    for (const task of dead)
      await ecs.send(
        new StopTaskCommand({ cluster, task: task.taskArn!, reason: 'Owned all-unhealthy qualification' })
      );
    await lambda.send(
      new PutFunctionConcurrencyCommand({ FunctionName: `${owned.name}-capacity`, ReservedConcurrentExecutions: 2 })
    );
    await wait(
      () =>
        fullyRouted(
          2,
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
    await lambda.send(
      new PutFunctionConcurrencyCommand({ FunctionName: `${owned.name}-capacity`, ReservedConcurrentExecutions: 2 })
    );
    controller.abort();
    await traffic;
    await save(join(owned.directory, 'phase3-lifecycle.json'), {
      samples,
      registrations,
      definition,
      scope:
        'scale-out, 60s bootstrap healthy-old rollout, replacement, serving survivors during allocator outage, all-unhealthy recovery; failed bootstrap, pending admission recovery and opt-out remain unqualified'
    });
  }
};
