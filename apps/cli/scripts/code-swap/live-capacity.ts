// Scoped live admission pressure test. Every task belongs to this already
// verified disposable service; no other cluster or service is mutated.
import assert from 'node:assert/strict';
import { ECSClient, UpdateServiceCommand, ListTasksCommand, DescribeTasksCommand } from '@aws-sdk/client-ecs';
import { DynamoDBClient, GetItemCommand, BatchGetItemCommand } from '@aws-sdk/client-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import type { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { join } from 'node:path';
import { z } from 'zod';
import { Allocator } from './capacity/allocator';

const metricSchema = z.object({
  benchmarkEvent: z.literal('capacityAdmission'),
  atMs: z.number(),
  owner: z.string(),
  outcome: z.enum(['granted', 'refused']),
  requestedAtMs: z.number().optional(),
  token: z.string().optional(),
  slot: z.number().optional()
});
type Metric = z.infer<typeof metricSchema>;
const distribution = (values: number[]) => {
  const sorted = values.toSorted((a, b) => a - b);
  return {
    n: sorted.length,
    p50: sorted[Math.ceil(sorted.length * 0.5) - 1],
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    max: sorted.at(-1)
  };
};

export const qualifyLiveCapacity = async (
  owned: { name: string; owner: string; table: string; directory: string },
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
    logs = new CloudWatchLogsClient(clients),
    lambda = new LambdaClient(clients);
  const allocator = new Allocator(owned.table, ddb, ecs);
  const plan = await allocator.plan();
  const servicePlan = plan.services.node;
  assert(servicePlan);
  const stack = `${owned.name}-bench`;
  const cluster = `arn:aws:ecs:eu-west-1:597581086285:cluster/${awsResourceNames.ecsCluster('api', stack)}`;
  const service = `arn:aws:ecs:eu-west-1:597581086285:service/${awsResourceNames.ecsCluster('api', stack)}/${awsResourceNames.ecsService('api', stack, false)}`;
  assert.equal(servicePlan.cluster, cluster);
  assert.equal(servicePlan.serviceArn, service);
  assert.equal(servicePlan.slots, 450);
  const quota = Bun.spawn(
    [
      'aws',
      'service-quotas',
      'get-service-quota',
      '--service-code',
      'fargate',
      '--quota-code',
      'L-3032A538',
      '--profile',
      'stacktape-e2e',
      '--region',
      'eu-west-1',
      '--output',
      'json'
    ],
    { stdout: 'pipe', stderr: 'pipe' }
  );
  const quotaText = await new Response(quota.stdout).text();
  const quotaError = await new Response(quota.stderr).text();
  assert.equal(await quota.exited, 0, `Quota preflight failed: ${quotaError}`);
  const quotaValue = z.object({ Quota: z.object({ Value: z.number() }) }).parse(JSON.parse(quotaText)).Quota.Value;
  assert(
    quotaValue >= 130,
    'The live pressure fixture requires at least130 Fargate vCPUs; no quota change is authorized.'
  );
  const baseline = await allocator.slots();
  assert.equal(baseline.length, 1);
  const baselineOwners = new Set(baseline.map((grant) => grant.owner));
  const release = (
    await ddb.send(
      new GetItemCommand({ TableName: owned.table, Key: { pk: { S: 'release#node' } }, ConsistentRead: true })
    )
  ).Item!;
  const committed = z.object({ Revision: z.string(), Phase: z.literal('commit') }).parse(JSON.parse(release.data!.S!));
  const recovery = {
    owner: owned.owner,
    cluster,
    service,
    desiredCountAttempted: 1,
    tasks: [] as string[],
    finished: false
  };
  const stateFile = join(owned.directory, 'capacity-pressure-state.json');
  let mutationAttempted = false;
  const metrics = async () => {
    const result: Metric[] = [];
    let nextToken: string | undefined;
    do {
      const previous = nextToken;
      const page = await logs.send(
        new FilterLogEventsCommand({
          logGroupName: `/aws/lambda/${owned.name}-capacity`,
          filterPattern: '"capacityAdmission"',
          nextToken
        })
      );
      for (const event of page.events ?? []) {
        const text = event.message ?? '';
        const start = text.indexOf('{');
        if (start < 0) continue;
        try {
          const parsed = metricSchema.safeParse(JSON.parse(text.slice(start)));
          if (parsed.success) result.push(parsed.data);
        } catch {}
      }
      nextToken = page.nextToken;
      if (nextToken === previous) break;
    } while (nextToken);
    return result;
  };
  const tasks = async () => {
    const arns: string[] = [];
    for (const desiredStatus of ['RUNNING', 'STOPPED'] as const) {
      let nextToken: string | undefined;
      do {
        const page = await ecs.send(
          new ListTasksCommand({ cluster, serviceName: service.split('/').at(-1), desiredStatus, nextToken })
        );
        arns.push(...(page.taskArns ?? []));
        nextToken = page.nextToken;
      } while (nextToken);
    }
    recovery.tasks = [...new Set([...recovery.tasks, ...arns])];
    await save(stateFile, recovery);
    return arns;
  };
  const wait = async (condition: () => Promise<boolean>, seconds = 300) => {
    const deadline = performance.now() + seconds * 1000;
    while (!(await condition())) {
      assert(performance.now() < deadline, 'Owned capacity-pressure fixture timed out.');
      await Bun.sleep(1000);
    }
  };
  const statusRows = async (owners: string[]) => {
    const result: { state: string; revision: string; task: string }[] = [];
    for (let i = 0; i < owners.length; i += 100) {
      let keys: Record<string, { S: string }>[] = owners.slice(i, i + 100).map((owner) => ({ pk: { S: owner } }));
      for (let retry = 0; keys.length; retry++) {
        assert(retry < 5, 'Status reads remained unprocessed.');
        const page = await ddb.send(
          new BatchGetItemCommand({ RequestItems: { [owned.table]: { Keys: keys, ConsistentRead: true } } })
        );
        for (const item of page.Responses?.[owned.table] ?? []) {
          if (item.data?.S)
            result.push(
              z.object({ state: z.string(), revision: z.string(), task: z.string() }).parse(JSON.parse(item.data.S))
            );
        }
        keys = z
          .array(z.object({ pk: z.object({ S: z.string() }) }))
          .parse(page.UnprocessedKeys?.[owned.table]?.Keys ?? []);
      }
    }
    return result;
  };
  const report: Record<string, unknown> = {
    scope:
      'Actual ECS service tasks and isolated Lambda/DDB; deliberate desired-count drift tests the hard cap, not a supported scaling configuration',
    quotaValue,
    clock:
      'Task request nonce and Lambda accepted-at timestamps use AWS-side Unix clocks; no WSL intervals for admission latency'
  };
  try {
    mutationAttempted = true;
    recovery.desiredCountAttempted = 101;
    await save(stateFile, recovery);
    await ecs.send(new UpdateServiceCommand({ cluster, service, desiredCount: 101 }));
    let hundredOwners: string[] = [];
    await wait(async () => {
      const grants = await allocator.slots();
      assert(grants.length <= 500);
      hundredOwners = grants.filter((grant) => !baselineOwners.has(grant.owner)).map((grant) => grant.owner);
      return hundredOwners.length === 100;
    });
    await tasks();
    await wait(async () => {
      const rows = await statusRows(hundredOwners);
      return (
        rows.length === 100 && rows.every((row) => row.state === 'complete' && row.revision === committed.Revision)
      );
    });
    let batchMetrics: Metric[] = [];
    await wait(async () => {
      const all = await metrics();
      batchMetrics = hundredOwners.flatMap((owner) =>
        all
          .filter((row) => row.owner === owner && row.outcome === 'granted' && row.requestedAtMs)
          .sort((a, b) => a.atMs - b.atMs)
          .slice(0, 1)
      );
      return batchMetrics.length === 100;
    }, 60);
    const admission = distribution(batchMetrics.map((row) => (row.atMs - row.requestedAtMs!) / 1000));
    report.hundredStartAdmissionSeconds = admission;
    report.hundredStartMetrics = batchMetrics;
    await save(join(owned.directory, 'capacity-pressure.json'), report);
    const admissionPassed =
      admission.p95 !== undefined && admission.p95 <= 5 && admission.max !== undefined && admission.max <= 15;
    report.hundredStartLatencyPassed = admissionPassed;
    // A failed latency gate remains a no-go. Continue the independently bounded
    // hard-counter fixture so it cannot be mistaken for an untested boundary.
    await save(join(owned.directory, 'capacity-pressure.json'), report);
    recovery.desiredCountAttempted = 501;
    await save(stateFile, recovery);
    await ecs.send(new UpdateServiceCommand({ cluster, service, desiredCount: 501 }));
    let maximumSlots = 101,
      refusals: Metric[] = [];
    await wait(async () => {
      const grants = await allocator.slots();
      maximumSlots = Math.max(maximumSlots, grants.length);
      assert(grants.length <= 500, 'Slot501 allocated.');
      await tasks();
      const all = await metrics();
      refusals = all.filter((row) => row.outcome === 'refused');
      return grants.length === 500 && refusals.length > 0 && recovery.tasks.length >= 501;
    }, 600);
    const grants = await allocator.slots();
    await wait(async () => {
      const rows = await statusRows(grants.map((grant) => grant.owner));
      return (
        rows.length === 500 && rows.every((row) => row.state === 'complete' && row.revision === committed.Revision)
      );
    }, 180);
    const refusalLatency = distribution(
      refusals.filter((row) => row.requestedAtMs).map((row) => (row.atMs - row.requestedAtMs!) / 1000)
    );
    report.hardCap = {
      maximumSlots,
      observedTaskIdentities: recovery.tasks.length,
      refusedOwners: [...new Set(refusals.map((row) => row.owner))],
      refusalLatency
    };
    await save(join(owned.directory, 'capacity-pressure.json'), report);
    const refusalPassed = refusalLatency.n > 0 && refusalLatency.max !== undefined && refusalLatency.max <= 15;
    report.refusalLatencyPassed = refusalPassed;
    // A duplicate stream delivery and a discarded invocation response cannot
    // consume another slot. These use an existing real, admitted task identity.
    const owner = grants[0]!.owner,
      token = grants[0]!.token;
    const beforeDuplicates = (await metrics()).filter((row) => row.owner === owner).length;
    const payload = Buffer.from(
      JSON.stringify({
        Records: [
          {
            eventID: 'owned-duplicate',
            eventName: 'MODIFY',
            dynamodb: {
              SequenceNumber: '1',
              Keys: { pk: { S: owner } },
              NewImage: { capacityRequest: { S: String(Date.now()) } }
            }
          }
        ]
      })
    );
    const duplicateResults = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        lambda.send(
          new InvokeCommand({ FunctionName: `${owned.name}-capacity`, InvocationType: 'Event', Payload: payload })
        )
      )
    );
    assert(
      duplicateResults.every((result) => result.status === 'fulfilled'),
      'Duplicate invocation submission failed.'
    );
    await wait(async () => (await metrics()).filter((row) => row.owner === owner).length >= beforeDuplicates + 10, 60);
    assert.equal((await allocator.slots()).length, 500);
    assert.equal((await allocator.slots()).find((grant) => grant.owner === owner)?.token, token);
    report.duplicates = { requests: 10, sameGrant: true, slots: 500 };
    assert(
      admissionPassed && refusalPassed,
      'Admission/refusal release latency budget failed; see recorded distributions.'
    );
  } finally {
    if (mutationAttempted) {
      recovery.desiredCountAttempted = 0;
      await save(stateFile, recovery);
      await ecs.send(new UpdateServiceCommand({ cluster, service, desiredCount: 0 }));
      await wait(async () => {
        await tasks();
        for (let i = 0; i < recovery.tasks.length; i += 100) {
          const page = await ecs.send(new DescribeTasksCommand({ cluster, tasks: recovery.tasks.slice(i, i + 100) }));
          if (page.failures?.length || page.tasks?.some((task) => task.lastStatus !== 'STOPPED')) return false;
        }
        return true;
      }, 600);
      await wait(async () => (await allocator.slots()).length === 0, 600);
      recovery.finished = true;
      await save(stateFile, recovery);
      report.stoppedEventReclamation = { allOwnedTasksStopped: true, slotsRemaining: 0 };
    }
    await save(join(owned.directory, 'capacity-pressure.json'), report);
  }
};
