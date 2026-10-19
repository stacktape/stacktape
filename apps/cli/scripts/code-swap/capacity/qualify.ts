// Explicit Docker integration lane: real DynamoDB SDK transactions on MiniStack,
// deterministic ECS HTTP fixture. This does not claim live ECS/IAM qualification.
import assert from 'node:assert/strict';
import { DynamoDBClient, CreateTableCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { ECSClient } from '@aws-sdk/client-ecs';
import { startMiniStack } from '../../../../../packages/ministack/src/fixture';
import { handleCapacityEvent } from './handler';
import { Allocator, planSchema } from './allocator';

const main = async () => {
  const mini = await startMiniStack({ label: 'swap-capacity' });
  const cluster = 'arn:aws:ecs:eu-west-1:000000000000:cluster/owned',
    serviceArn = `${cluster.replace(':cluster/', ':service/')}/api`;
  const stopped = new Set<string>();
  const unknown = new Set<string>();
  let describeUnavailable = false;
  const ecsFixture = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      if (describeUnavailable) return Response.json({ __type: 'ServerException' }, { status: 500 });
      const body = (await request.json()) as { tasks?: string[] };
      if (request.headers.get('x-amz-target')?.endsWith('DescribeServices'))
        return Response.json({ services: [{ serviceArn, deployments: [{ taskDefinition: 'owned:1' }] }] });
      return Response.json({
        tasks: body.tasks
          ?.filter((task) => task !== 'f'.repeat(32) && !unknown.has(task))
          .map((task) => ({
            taskArn: `arn:aws:ecs:eu-west-1:000000000000:task/owned/${task}`,
            group: 'service:api',
            taskDefinitionArn: 'owned:1',
            desiredStatus: stopped.has(task) ? 'STOPPED' : 'RUNNING',
            lastStatus: stopped.has(task) ? 'STOPPED' : 'RUNNING'
          }))
      });
    }
  });
  try {
    const config = mini.clientConfig(),
      ddb = new DynamoDBClient(config);
    const ecs = new ECSClient({ ...config, endpoint: `http://127.0.0.1:${ecsFixture.port}` });
    const table = 'owned-capacity';
    await ddb.send(
      new CreateTableCommand({
        TableName: table,
        KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
      })
    );
    const plan = planSchema.parse({
      version: 'one',
      deleting: false,
      account: '000000000000',
      region: 'eu-west-1',
      services: { node: { cluster, serviceArn, roleId: 'AROAEXAMPLE', start: 0, slots: 450 } }
    });
    await ddb.send(
      new PutItemCommand({
        TableName: table,
        Item: {
          pk: { S: 'capacity#plan' },
          version: { S: plan.version },
          deleting: { BOOL: false },
          data: { S: JSON.stringify(plan) }
        }
      })
    );
    const allocator = new Allocator(table, ddb, ecs);
    const owner = (id: number) => `status#node#AROAEXAMPLE:${id.toString(16).padStart(32, '0')}`;
    // Exactly 501 concurrent starts. No fake transaction implementation: all
    // conditional writes and duplicate races go through the real SDK transport.
    const started = performance.now();
    const results = await Promise.all(Array.from({ length: 501 }, (_, i) => allocator.allocate(owner(i + 1))));
    assert.equal(results.filter(Boolean).length, 500);
    const refusedOwner = owner(results.findIndex((grant) => !grant) + 1);
    assert.equal(
      (await allocator.get(refusedOwner.replace('status#', 'admission#')))?.refusal?.S,
      'poller_capacity_exceeded'
    );
    assert.equal((await allocator.slots()).length, 500);
    const admitted = results.find((grant) => grant)!;
    const duplicates = await Promise.all(Array.from({ length: 10 }, () => allocator.allocate(admitted.owner)));
    assert(duplicates.every((grant) => grant?.token === admitted.token));
    assert.equal((await allocator.slots()).length, 500);
    // A confirmed STOPPED owner frees exactly one slot, and a delayed old worker
    // cannot free a later grant reusing that slot.
    let conflict = true;
    ddb.middlewareStack.add(
      (next, context) => async (args) => {
        if (context.commandName === 'TransactWriteItemsCommand' && conflict) {
          conflict = false;
          throw Object.assign(new Error('Transient transaction conflict'), {
            name: 'TransactionCanceledException',
            CancellationReasons: [{ Code: 'None' }, { Code: 'TransactionConflict' }]
          });
        }
        return next(args);
      },
      { step: 'initialize', name: 'oneStoppedConflict' }
    );
    await assert.rejects(() => allocator.release(plan, admitted));
    assert.equal((await allocator.slots()).length, 500);
    ddb.middlewareStack.remove('oneStoppedConflict');
    stopped.add(admitted.task);
    await allocator.reclaim(plan);
    assert.equal((await allocator.slots()).length, 499);
    const replacement = await allocator.allocate(refusedOwner);
    assert(replacement);
    await allocator.release(plan, admitted);
    assert.equal((await allocator.slots()).length, 500);
    // Missing aged-out observations never authorize reuse.
    const aged = (await allocator.slots())[0]!;
    unknown.add(aged.task);
    await allocator.reclaim(plan);
    assert.equal((await allocator.slots()).length, 500);
    unknown.clear();
    describeUnavailable = true;
    await assert.rejects(() => allocator.reclaim(plan));
    assert.equal((await allocator.slots()).length, 500);
    const failedBatch = await handleCapacityEvent(allocator, {
      Records: [
        {
          eventID: 'outage',
          eventName: 'MODIFY',
          dynamodb: {
            SequenceNumber: '11',
            Keys: { pk: { S: owner(503) } },
            NewImage: { capacityRequest: { S: 'retry' } }
          }
        }
      ]
    });
    assert.deepEqual(failedBatch, { batchItemFailures: [{ itemIdentifier: '11' }] });
    describeUnavailable = false;
    const releasable = (await allocator.slots()).find((grant) => grant.owner !== replacement.owner)!;
    stopped.add(releasable.task);
    await allocator.reclaim(plan);
    const recovered = await handleCapacityEvent(allocator, {
      Records: [
        {
          eventID: 'poison',
          eventName: 'MODIFY',
          dynamodb: {
            SequenceNumber: '12',
            Keys: { pk: { S: 'status#poison' } },
            NewImage: { capacityRequest: { S: 'malformed' } }
          }
        },
        {
          eventID: 'valid',
          eventName: 'MODIFY',
          dynamodb: {
            SequenceNumber: '13',
            Keys: { pk: { S: owner(503) } },
            NewImage: { capacityRequest: { S: '2000' }, capacityRequestedAt: { S: '1000' } }
          }
        }
      ]
    });
    assert.deepEqual(recovered, { batchItemFailures: [] });
    assert(await allocator.get(owner(503).replace('status#', 'admission#')));
    assert.equal(
      (await allocator.allocate(owner(503)))?.requestedAtMs,
      1000,
      'Retries must retain first-request latency.'
    );
    assert.equal((await allocator.slots()).length, 500);
    await assert.rejects(() => allocator.allocate('status#node#forged:task'));
    console.log(
      JSON.stringify({
        scenario: '500/501',
        grants: 500,
        duplicates: 10,
        staleWorkerRetainedNewOwner: true,
        elapsedMs: performance.now() - started,
        scope: 'MiniStack DDB plus synthetic ECS; no live latency/IAM claim'
      })
    );
  } finally {
    ecsFixture.stop(true);
    await mini.stop();
  }
};
if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
