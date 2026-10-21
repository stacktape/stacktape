import { expect, test } from 'bun:test';
import {
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
  type DynamoDBClient,
  type AttributeValue
} from '@aws-sdk/client-dynamodb';
import { acquireLock, recoverLock, removeLock, tableGoneDuringDelete } from '../../src/domain/code-swap/operation-lock';
import {
  readReleaseRecord,
  writeReleaseRecord,
  interruptedSwapReason,
  incompleteHistoryVersions,
  type SwapRecord
} from '../../src/domain/code-swap/release-record';
import { taskTableProtection } from '../../src/domain/code-swap/permissions';
import { resolveStatusRole } from '../../src/domain/code-swap/ecs-policy';
import { codeSwapTemplate, codeSwapTrackPreparation, codeSwapFinish } from '../../src/domain/code-swap/lifecycle-hooks';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { permissionResponse } from './fixtures/permission-probe.mjs';

test('transaction cancellation is a permission denial only when its nested reason proves it', () => {
  expect(
    permissionResponse(400, {
      __type: 'com.amazonaws.dynamodb.v20120810#TransactionCanceledException',
      CancellationReasons: [{ Code: 'AccessDenied' }]
    }).denied
  ).toBe(true);
  expect(
    permissionResponse(400, {
      __type: 'com.amazonaws.dynamodb.v20120810#TransactionCanceledException',
      CancellationReasons: [{ Code: 'ConditionalCheckFailed' }]
    }).denied
  ).toBe(false);
  expect(permissionResponse(200, { Responses: [{ Error: { Code: 'AccessDenied' } }] }).denied).toBe(true);
  expect(permissionResponse(200, {}).denied).toBe(false);
});

const fixture = () => {
  const items = new Map<string, Record<string, AttributeValue>>();
  let loseResponse = false;
  const conflict = () =>
    Object.assign(new Error('ConditionalCheckFailed'), { name: 'ConditionalCheckFailedException' });
  const client = {
    send: async (command: unknown) => {
      if (command instanceof GetItemCommand) return { Item: items.get(command.input.Key!.pk!.S!) };
      if (command instanceof PutItemCommand) {
        const input = command.input;
        const pk = input.Item!.pk!.S!;
        const previous = items.get(pk);
        if (input.ConditionExpression === 'attribute_not_exists(pk)' && previous) throw conflict();
        if (
          input.ConditionExpression === '#seq = :previous' &&
          previous?.seq?.N !== input.ExpressionAttributeValues![':previous']!.N
        )
          throw conflict();
        items.set(pk, input.Item!);
        if (loseResponse) {
          loseResponse = false;
          throw new Error('response lost after durable write');
        }
        return {};
      }
      if (command instanceof DeleteItemCommand) {
        const pk = command.input.Key!.pk!.S!;
        if (items.get(pk)?.holder?.S !== command.input.ExpressionAttributeValues![':holder']!.S) throw conflict();
        items.delete(pk);
        return {};
      }
      throw new Error('Unexpected AWS request');
    }
  } as unknown as Pick<DynamoDBClient, 'send'>;
  return {
    client,
    items,
    loseNextResponse: () => {
      loseResponse = true;
    }
  };
};
test('operation completion waits for preparation even when the image build has already failed', async () => {
  let settle: () => void;
  const preparation = new Promise<void>((resolve) => {
    settle = resolve;
  }).then(() => {
    throw new Error('preparation failed too');
  });
  preparation.catch(() => {});
  codeSwapTrackPreparation(preparation);
  const { codeSwapIntegration } = await import('../../src/domain/code-swap/integration');
  const originalAbort = codeSwapIntegration.abortPreparation;
  let aborted = false;
  codeSwapIntegration.abortPreparation = async () => {
    await Bun.sleep(5);
    aborted = true;
  };
  let finished = false;
  const completion = codeSwapFinish().then(() => {
    finished = true;
  });
  await Bun.sleep(10);
  expect(finished).toBe(false);
  settle!();
  await completion;
  expect(finished).toBe(true);
  expect(aborted).toBe(true);
  codeSwapIntegration.abortPreparation = originalAbort;
});
const holder = (invocationId: string, operation: 'deploy' | 'rollback' | 'delete' = 'deploy') => ({
  invocationId,
  operation,
  startedAt: '2026-10-20T00:00:00.000Z'
});
test('a missing table ends an already accepted delete; it never bypasses an active-stack lock', () => {
  const gone = Object.assign(new Error('gone'), { name: 'ResourceNotFoundException' });
  expect(tableGoneDuringDelete(gone, 'delete', 'DELETE_IN_PROGRESS')).toBe(true);
  expect(tableGoneDuringDelete(gone, 'delete', 'DELETE_FAILED')).toBe(true);
  expect(tableGoneDuringDelete(gone, 'delete', 'UPDATE_COMPLETE')).toBe(false);
  expect(tableGoneDuringDelete(gone, 'deploy', 'DELETE_FAILED')).toBe(false);
  expect(tableGoneDuringDelete(new Error('network failure'), 'delete', 'DELETE_FAILED')).toBe(false);
});
const record = (Seq: number): SwapRecord => ({
  Seq,
  TaskDefinition: 'arn:aws:ecs:eu-west-1:597581086285:task-definition/api:1',
  Committed: null,
  Proposed: null,
  HistoryVersion: 'v000001',
  Attempt: null,
  Phase: 'abort'
});

test('swap excludes every other deployment operation; only its holder can release or recover', async () => {
  const { client } = fixture();
  await acquireLock(client, 'owned', holder('swap'));
  for (const operation of ['deploy', 'rollback', 'delete'] as const)
    await expect(acquireLock(client, 'owned', holder(`other-${operation}`, operation))).rejects.toThrow(
      'holds the code-swap lock'
    );
  await expect(removeLock(client, 'owned', 'other')).rejects.toThrow();
  await expect(recoverLock(client, 'owned', 'other')).rejects.toThrow('Nothing was recovered');
  await recoverLock(client, 'owned', 'swap');
  await acquireLock(client, 'owned', holder('next'));
  await removeLock(client, 'owned', 'next');
  await acquireLock(client, 'owned', holder('after-failure'));
});

test('lost lock and release-record responses are resolved by strong rereads', async () => {
  const f = fixture();
  f.loseNextResponse();
  await acquireLock(f.client, 'owned', holder('same'));
  f.loseNextResponse();
  await writeReleaseRecord(f.client, 'owned', undefined, record(1));
  f.loseNextResponse();
  await writeReleaseRecord(f.client, 'owned', record(1), record(2));
  expect(await readReleaseRecord(f.client, 'owned')).toEqual(record(2));
  // The SDK can retry the first successful write and return a conditional failure instead of its lost response.
  await writeReleaseRecord(f.client, 'owned', record(1), record(2));
  await expect(writeReleaseRecord(f.client, 'owned', record(2), record(2))).rejects.toThrow('strictly increase');
  await expect(writeReleaseRecord(f.client, 'owned', record(1), record(3))).rejects.toThrow();
  await expect(writeReleaseRecord(f.client, 'owned', undefined, record(4))).rejects.toThrow();
});

test('open proposals, commits without history and explicit recovery select an image repair', () => {
  const bundle = { Revision: 'v000002', Key: 'bundle', Sha256: 'a'.repeat(64), Size: 123 };
  expect(interruptedSwapReason(undefined, false)).toBeUndefined();
  expect(interruptedSwapReason(record(1), false)).toBeUndefined();
  expect(interruptedSwapReason({ ...record(2), Proposed: { ...bundle, Attempt: 'killed' } }, false)).toBe(
    'interrupted_swap_image_repair'
  );
  expect(interruptedSwapReason({ ...record(3), Committed: bundle }, false)).toBe('interrupted_swap_image_repair');
  expect(
    interruptedSwapReason({ ...record(4), Committed: bundle, HistoryVersion: bundle.Revision }, false)
  ).toBeUndefined();
  expect(interruptedSwapReason(record(1), true)).toBe('interrupted_swap_image_repair');
  expect(incompleteHistoryVersions({ ...record(3), Committed: bundle })).toEqual(['v000002']);
  expect(incompleteHistoryVersions({ ...record(4), Committed: bundle, HistoryVersion: bundle.Revision })).toEqual([]);
  expect(incompleteHistoryVersions({ ...record(2), Proposed: { ...bundle, Attempt: 'killed' } })).toEqual(['v000002']);
});

test('task policy explicitly denies non-item APIs and constrains each remaining action', () => {
  const arn = 'arn:aws:dynamodb:eu-west-1:597581086285:table/owned';
  const statements = taskTableProtection(arn);
  expect(statements[0]).toEqual({
    Effect: 'Deny',
    NotAction: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:PutItem'],
    Resource: [arn, `${arn}/*`, 'arn:aws:dynamodb::597581086285:global-table/owned']
  });
  const json = JSON.stringify(statements);
  expect(json).toContain('status#node#${aws:userid}');
  expect(json).toContain('ForAnyValue:StringNotEquals');
  expect(json).toContain('"dynamodb:LeadingKeys":"true"');
  expect(json).toContain('dynamodb:EnclosingOperation');
});

test('direct ECS image registration resolves RoleId rather than serializing its intrinsic as an object', () => {
  const definition: Parameters<typeof resolveStatusRole>[0] = {
    Type: 'AWS::ECS::TaskDefinition',
    Properties: {
      ContainerDefinitions: [
        {
          Name: 'app',
          Image: 'repository:image',
          Environment: [
            { Name: 'STP_BENCH_ROLE_ID', Value: { 'Fn::GetAtt': ['ApiRole', 'RoleId'] } },
            { Name: 'APP_VALUE', Value: 'preserved' }
          ]
        }
      ]
    }
  };
  resolveStatusRole(definition, 'AROAOWNEDROLE');
  const wire = JSON.stringify(definition);
  expect(wire).toContain('"Value":"AROAOWNEDROLE"');
  expect(wire).not.toContain('Fn::GetAtt');
  expect(wire).toContain('"Value":"preserved"');
});

test('table creation follows task protection, and opt-out retains the Deny while old tasks drain', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'code-swap-optout-'));
  const { configManager } = await import('../../src/domain/config-manager');
  const previousConfig = configManager.config;
  configManager.config = { resources: {} };
  const previous = process.env.STP_CODE_SWAP_BENCH_RUN;
  try {
    const runPath = join(directory, 'run.json');
    await writeFile(
      runPath,
      JSON.stringify({
        name: 'v4swap-optout',
        owner: 'owned-test',
        table: 'owned-table',
        mode: 'image',
        phase3: true,
        phase4: true,
        optOut: true,
        supervisor: 'unused',
        result: 'unused',
        memory: 1024,
        count: 1
      })
    );
    process.env.STP_CODE_SWAP_BENCH_RUN = runPath;
    const { globalStateManager } = await import('../../src/app/global-state-manager');
    Object.defineProperty(globalStateManager, 'region', { configurable: true, value: 'eu-west-1' });
    Object.defineProperty(globalStateManager, 'targetAwsAccount', {
      configurable: true,
      value: { awsAccountId: '597581086285' }
    });
    const template: CloudFormationTemplate = {
      Resources: {
        [cfLogicalNames.ecsTaskDefinition('api')]: {
          Type: 'AWS::ECS::TaskDefinition',
          Properties: {
            TaskRoleArn: { 'Fn::GetAtt': [cfLogicalNames.ecsTaskRole('api'), 'Arn'] },
            ContainerDefinitions: [{ Name: 'app', Environment: [] }]
          }
        },
        [cfLogicalNames.ecsService('api', false)]: {
          Type: 'AWS::ECS::Service',
          Properties: { TaskDefinition: { Ref: cfLogicalNames.ecsTaskDefinition('api') } }
        },
        [cfLogicalNames.ecsTaskRole('api')]: {
          Type: 'AWS::IAM::Role',
          Properties: {
            Policies: [
              {
                PolicyName: 'application',
                PolicyDocument: {
                  Version: '2012-10-17',
                  Statement: [{ Effect: 'Allow', Action: 'dynamodb:*', Resource: '*' }]
                }
              }
            ]
          }
        }
      }
    };
    await codeSwapTemplate(template);
    expect(template.Resources.StacktapeCodeSwapTable).toBeUndefined();
    const policy = JSON.stringify(template.Resources[cfLogicalNames.ecsTaskRole('api')]);
    expect(policy).toContain('"Effect":"Deny"');
    expect(policy).toContain('arn:aws:dynamodb:eu-west-1:597581086285:table/owned-table');
    expect(policy).toContain('"PolicyName":"application"');
    const run = JSON.parse(await Bun.file(runPath).text());
    await writeFile(runPath, JSON.stringify({ ...run, optOut: false }));
    await codeSwapTemplate(template);
    expect(template.Resources.StacktapeCodeSwapTable.DependsOn).toContain(cfLogicalNames.ecsTaskRole('api'));
    template.Resources[cfLogicalNames.ecsTaskDefinition('api')].Properties = {
      ...template.Resources[cfLogicalNames.ecsTaskDefinition('api')].Properties,
      TaskRoleArn: 'arn:aws:iam::597581086285:role/unprotected'
    };
    await expect(codeSwapTemplate(template)).rejects.toThrow('protected managed task role');
  } finally {
    configManager.config = previousConfig;
    if (previous === undefined) delete process.env.STP_CODE_SWAP_BENCH_RUN;
    else process.env.STP_CODE_SWAP_BENCH_RUN = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test('retention follows ordinary releases and protects head, rollback references and live tasks', async () => {
  const { obsoleteCodeSwapKeys } = await import('../../src/domain/code-swap/release-record');
  const keys = [
    'code-swap/api/head.json',
    'unrelated/object',
    ...['v000001', 'v000002', 'v000003', 'v000004'].flatMap((version) => [
      `code-swap/api/bundles/${version}-hash.tgz`,
      `code-swap/api/attempts/${version}-invocation.json`,
      `code-swap/api/releases/${version}.json`
    ])
  ];
  // Ordinary image-only releases have advanced the window beyond every overlay release.
  expect(obsoleteCodeSwapKeys(keys, ['v000005'])).toEqual(keys.slice(2));
  expect(obsoleteCodeSwapKeys(keys, [], [], 'v000002')).toEqual(keys.filter((key) => /v00000[12]/.test(key)));
  const abandoned = ['code-swap/api/bundles/v000004-abandoned.tgz', 'code-swap/api/attempts/v000004-abandoned.json'];
  expect(
    obsoleteCodeSwapKeys(
      [...keys, ...abandoned],
      ['v000001', 'v000002', 'v000003', 'v000004'],
      ['code-swap/api/bundles/v000004-hash.tgz'],
      'v000004',
      'invocation'
    )
  ).toEqual(abandoned);
  // A retained rollback release references a bundle created by an older release.
  const protectedBundles = ['code-swap/api/bundles/v000001-hash.tgz'];
  expect(obsoleteCodeSwapKeys(keys, ['v000003', 'v000004'], protectedBundles)).toEqual([
    'code-swap/api/attempts/v000001-invocation.json',
    'code-swap/api/releases/v000001.json',
    ...keys.filter((key) => key.includes('v000002'))
  ]);
  // The caller also retains current head and running-task revisions outside the ordinary window.
  expect(obsoleteCodeSwapKeys(keys, ['v000001', 'v000002', 'v000004'])).toEqual(
    keys.filter((key) => key.includes('v000003'))
  );
  expect(obsoleteCodeSwapKeys(keys, [], protectedBundles, 'v000004')).toContain('code-swap/api/releases/v000001.json');
  expect(obsoleteCodeSwapKeys(keys, [], protectedBundles, 'v000004')).not.toContain(protectedBundles[0]);
});

test('a refusal waits for every task to observe this attempt, and old completion never proves cleanup', async () => {
  const { allTasksObservedAttempt, allCandidatesCleaned } = await import('../../src/domain/code-swap/release-record');
  const status = (revision: string, state: string, candidateReaped = false) => ({
    revision,
    state,
    timings: { candidateReaped }
  });
  const refused = status('v000002', 'refused');
  const old = status('v000001', 'complete');
  expect(allTasksObservedAttempt([refused, old], 2, 'v000002')).toBe(false);
  expect(allCandidatesCleaned([refused, old], 2, 'v000002')).toBe(false);
  const prepared = status('v000002', 'prepared');
  expect(allTasksObservedAttempt([refused, prepared], 2, 'v000002')).toBe(true);
  expect(allCandidatesCleaned([refused, prepared], 2, 'v000002')).toBe(false);
  expect(allCandidatesCleaned([refused, status('v000002', 'aborted', true)], 2, 'v000002')).toBe(true);
  expect(allCandidatesCleaned([refused, status('v000002', 'failed', false)], 2, 'v000002')).toBe(false);
  expect(allCandidatesCleaned([refused, status('v000002', 'complete')], 2, 'v000002')).toBe(true);
});

// Two supervisors against one release record, following the poll loop in supervisor/main.go: a proposal starts a
// candidate and reports this revision; an abort stops it. A task that never read the proposal ignores the abort.
const supervisedFleet = (reads: Record<string, boolean>) => {
  const record = { phase: 'commit', revision: 'v000001' };
  const tasks = Object.keys(reads).map((id) => ({
    id,
    prepared: false,
    status: { revision: 'v000001', state: 'complete', timings: {} as Record<string, unknown> }
  }));
  const poll = (id: string) => {
    const task = tasks.find((item) => item.id === id)!;
    if (task.prepared && (record.phase === 'abort' || record.revision !== 'v000002')) {
      task.prepared = false;
      task.status = { revision: 'v000002', state: 'aborted', timings: { candidateReaped: true } };
    } else if (!task.prepared && record.phase === 'prepare' && record.revision === 'v000002') {
      task.prepared = true;
      task.status = { revision: 'v000002', state: 'prepared', timings: {} };
    }
  };
  const timer = setInterval(() => {
    for (const task of tasks) if (reads[task.id]) poll(task.id);
  }, 2);
  return {
    record,
    statuses: async (ids: string[]) => ids.map((id) => tasks.find((task) => task.id === id)!.status),
    stop: () => clearInterval(timer)
  };
};

test('an interrupt before the proposal has nothing to abort or confirm, so the lock can be released', async () => {
  const { abortProposal } = await import('../../src/domain/code-swap/release-record');
  let calls = 0;
  await abortProposal({
    proposal: undefined,
    statuses: async () => {
      calls++;
      return [];
    },
    writeAbort: async () => {
      calls++;
    }
  });
  expect(calls).toBe(0);
});

test('an abort right after the proposal waits until every task has observed it', async () => {
  const { abortProposal } = await import('../../src/domain/code-swap/release-record');
  // Interrupted right after the proposal: task b has not read the record yet. Writing the abort now would leave b on
  // the old revision forever and cleanup could never be confirmed.
  const reads = { a: true, b: false };
  const fleet = supervisedFleet(reads);
  Object.assign(fleet.record, { phase: 'prepare', revision: 'v000002' });
  let abortedWhile: unknown;
  const settled = abortProposal({
    proposal: { ids: ['a', 'b'], revision: 'v000002' },
    statuses: fleet.statuses,
    writeAbort: async () => {
      abortedWhile = await fleet.statuses(['a', 'b']);
      Object.assign(fleet.record, { phase: 'abort', revision: '' });
    },
    pollMs: 1
  });
  await Bun.sleep(20);
  expect(abortedWhile).toBeUndefined();
  reads.b = true;
  await settled;
  fleet.stop();
  expect(abortedWhile).toEqual([
    { revision: 'v000002', state: 'prepared', timings: {} },
    { revision: 'v000002', state: 'prepared', timings: {} }
  ]);
  expect((await fleet.statuses(['a', 'b'])).map(({ state }) => state)).toEqual(['aborted', 'aborted']);

  // A task that never reads the proposal cannot prove cleanup; the abort still stops the others and the lock is kept.
  const unreachable = supervisedFleet({ a: true, b: false });
  Object.assign(unreachable.record, { phase: 'prepare', revision: 'v000002' });
  const outcome = abortProposal({
    proposal: { ids: ['a', 'b'], revision: 'v000002' },
    statuses: unreachable.statuses,
    writeAbort: async () => {
      Object.assign(unreachable.record, { phase: 'abort', revision: '' });
    },
    observeMs: 20,
    cleanupMs: 20,
    pollMs: 1
  });
  await expect(outcome).rejects.toThrow('Candidate cleanup not confirmed');
  unreachable.stop();
  expect((await unreachable.statuses(['a'])).map(({ state }) => state)).toEqual(['aborted']);
});

test('a no-op image-only deploy never finalizes a release number that was not created', async () => {
  const { codeSwapComplete } = await import('../../src/domain/code-swap/runtime');
  const previous = process.env.STP_CODE_SWAP_BENCH_RUN;
  try {
    process.env.STP_CODE_SWAP_BENCH_RUN = '/missing/no-op-must-not-open-a-release.json';
    await codeSwapComplete(false);
  } finally {
    if (previous === undefined) delete process.env.STP_CODE_SWAP_BENCH_RUN;
    else process.env.STP_CODE_SWAP_BENCH_RUN = previous;
  }
});

test('artifact cleanup uses the ordinary window, preserves cross-release bundles, and empties opt-out prefixes', async () => {
  const { pruneCodeSwapArtifacts } = await import('../../src/domain/code-swap/artifacts');
  const { ListObjectsV2Command, GetObjectCommand, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
  const objects = new Map<string, string>([
    ['cf-template/v000010.yml', 'template'],
    ['unrelated/object', 'keep'],
    ['code-swap/api/head.json', JSON.stringify({ revision: 'v000009', key: 'code-swap/api/bundles/v000009-head.tgz' })],
    [
      'code-swap/api/releases/v000010.json',
      JSON.stringify({ revision: 'v000010', key: 'code-swap/api/bundles/v000001-rollback.tgz' })
    ],
    ['code-swap/api/bundles/v000001-rollback.tgz', 'rollback'],
    ['code-swap/api/bundles/v000009-head.tgz', 'head'],
    ['code-swap/api/bundles/v000002-live.tgz', 'live task'],
    ['code-swap/api/attempts/v000002-live.json', 'live task'],
    ['code-swap/api/bundles/v000003-obsolete.tgz', 'old'],
    ['code-swap/api/releases/v000003.json', 'old'],
    ['code-swap/api/attempts/v000003-old.json', 'old']
  ]);
  const s3 = {
    send: async (command: unknown) => {
      if (command instanceof ListObjectsV2Command) {
        // Force pagination even for this small fixture.
        const keys = [...objects.keys()];
        return {
          Contents: (command.input.ContinuationToken ? keys.slice(3) : keys.slice(0, 3)).map((Key) => ({ Key })),
          ...(!command.input.ContinuationToken && { NextContinuationToken: 'next' })
        };
      }
      if (command instanceof GetObjectCommand) {
        const body = objects.get(command.input.Key!);
        if (body === undefined) throw new Error('Missing object');
        return { Body: { transformToString: async () => body } };
      }
      if (command instanceof DeleteObjectsCommand) {
        for (const { Key } of command.input.Delete!.Objects!) objects.delete(Key!);
        return {};
      }
      throw new Error('Unexpected S3 command');
    }
  } as unknown as Pick<import('@aws-sdk/client-s3').S3Client, 'send'>;
  await pruneCodeSwapArtifacts({ s3, bucket: 'test', currentRevision: 'v000010', protectedRevisions: ['v000002'] });
  expect([...objects.keys()].filter((key) => key.includes('v000003'))).toEqual([]);
  expect(objects.has('code-swap/api/bundles/v000001-rollback.tgz')).toBe(true);
  expect(objects.has('code-swap/api/bundles/v000009-head.tgz')).toBe(true);
  expect(objects.has('code-swap/api/bundles/v000002-live.tgz')).toBe(true);
  // A failed record read must stop deletion altogether.
  objects.set('code-swap/api/releases/v000010.json', 'broken');
  const before = [...objects.keys()];
  await expect(pruneCodeSwapArtifacts({ s3, bucket: 'test', currentRevision: 'v000010' })).rejects.toThrow();
  expect([...objects.keys()]).toEqual(before);
  // Once old tasks have stopped, opt-out deletes even unknown/abandoned deep objects.
  objects.set('code-swap/api/unknown/deep/key', 'old');
  await pruneCodeSwapArtifacts({ s3, bucket: 'test', currentRevision: 'v000010', optOut: true });
  expect([...objects.keys()]).toEqual(['cf-template/v000010.yml', 'unrelated/object']);
});

test('opt-out waits for draining task revisions and refuses uncertain task evidence', async () => {
  const { waitForRetiredCodeSwapTasks } = await import('../../src/domain/code-swap/artifacts');
  const { DescribeServicesCommand, ListTasksCommand, DescribeTasksCommand } = await import('@aws-sdk/client-ecs');
  let oldStatus = 'DEACTIVATING';
  let uncertain = false;
  let observedDrain = false;
  const ecs = {
    send: async (command: unknown) => {
      if (command instanceof DescribeServicesCommand) return { services: [{ taskDefinition: 'new' }] };
      if (command instanceof ListTasksCommand)
        return { taskArns: command.input.desiredStatus === 'STOPPED' ? ['old'] : ['new'] };
      if (command instanceof DescribeTasksCommand) {
        if (uncertain) return { failures: [{ arn: 'old', reason: 'MISSING' }] };
        const old = command.input.tasks![0] === 'old';
        if (old && !observedDrain) {
          observedDrain = true;
          queueMicrotask(() => {
            oldStatus = 'STOPPED';
          });
        }
        return {
          tasks: [
            {
              taskArn: old ? 'old' : 'new',
              taskDefinitionArn: old ? 'old' : 'new',
              lastStatus: old ? oldStatus : 'RUNNING'
            }
          ]
        };
      }
      throw new Error('Unexpected ECS command');
    }
  } as unknown as Pick<import('@aws-sdk/client-ecs').ECSClient, 'send'>;
  await waitForRetiredCodeSwapTasks(ecs, 'arn:aws:ecs:eu-west-1:123:service/cluster/api');
  expect(observedDrain).toBe(true);
  expect(oldStatus).toBe('STOPPED');
  uncertain = true;
  await expect(waitForRetiredCodeSwapTasks(ecs, 'arn:aws:ecs:eu-west-1:123:service/cluster/api')).rejects.toThrow(
    'Could not confirm'
  );
});

test('service records advance independently and lost writes reread only their service', async () => {
  const { client, items, loseNextResponse } = fixture();
  await writeReleaseRecord(client, 'table', undefined, record(1), 'api');
  loseNextResponse();
  await writeReleaseRecord(client, 'table', undefined, { ...record(1), TaskDefinition: 'reporting:1' }, 'reporting');
  await writeReleaseRecord(client, 'table', record(1), record(2), 'api');
  expect((await readReleaseRecord(client, 'table', 'api'))?.Seq).toBe(2);
  expect((await readReleaseRecord(client, 'table', 'reporting'))?.TaskDefinition).toBe('reporting:1');
  expect(items.size).toBe(2);
  const api = JSON.stringify(taskTableProtection('arn:aws:dynamodb:eu-west-1:597581086285:table/table', 'api'));
  const reporting = JSON.stringify(
    taskTableProtection('arn:aws:dynamodb:eu-west-1:597581086285:table/table', 'reporting')
  );
  expect(api).toContain('release#api');
  expect(api).not.toContain('release#reporting');
  expect(reporting).toContain('status#reporting#');
  expect(reporting).not.toContain('status#api#');
});

test('Python source swaps require a hash on every pinned requirement', async () => {
  const { pythonHashLock, strictPythonPlan } = await import('../../src/domain/code-swap/python');
  const hash = `--hash=sha256:${'a'.repeat(64)}`;
  for (const requirements of [
    '',
    '# only a comment',
    `a==1.0 \\\n ${hash}\nb==2.0`,
    `a>=1.0 ${hash}`,
    `a==1.* ${hash}`,
    `a==1.0 ${hash}\n-r extra.txt`,
    `a @ https://example.com/a.whl ${hash}`
  ])
    expect(pythonHashLock(requirements)).toBe(false);
  expect(pythonHashLock(`# uv generated\na==1.0 \\\n ${hash}\n # via b\nb[extra]==2.0 ${hash}\n`)).toBe(true);
  const plan = {
    steps: [{ commands: [{ cmd: 'uv pip install -r requirements.txt || python -m pip install -r requirements.txt' }] }]
  };
  expect(strictPythonPlan(plan)?.steps).toEqual([
    {
      commands: [
        {
          cmd: 'uv pip install --require-hashes -r requirements.txt || python -m pip install --require-hashes -r requirements.txt'
        }
      ]
    }
  ]);
  expect(strictPythonPlan({ steps: [{ commands: [{ cmd: 'uv sync --locked' }] }] })).toBeUndefined();
  expect(plan.steps[0].commands[0].cmd).toBe(
    'uv pip install -r requirements.txt || python -m pip install -r requirements.txt'
  );
});

test.skipIf(!Bun.which('python3'))(
  'Python environment identity ignores source edits and detects installed byte changes',
  async () => {
    const { pythonEnvironmentFingerprint } = await import('../../src/domain/code-swap/python');
    const { mkdir } = await import('node:fs/promises');
    const directory = await mkdtemp(join(tmpdir(), 'python-swap-identity-'));
    try {
      const venv = join(directory, '.venv');
      await mkdir(venv);
      await writeFile(join(venv, 'dependency.py'), 'VERSION = 1\n');
      const script = pythonEnvironmentFingerprint.replace(
        "['/app/.venv', '/usr/local', '/usr/lib', '/lib']",
        JSON.stringify([venv])
      );
      const fingerprint = () => {
        const result = Bun.spawnSync(['python3', '-I', '-c', script]);
        expect(result.exitCode).toBe(0);
        return result.stdout.toString().trim();
      };
      const initial = fingerprint();
      expect(initial).toMatch(/^[a-f0-9]{64}$/);
      await writeFile(join(directory, 'app.py'), 'new code\n');
      expect(fingerprint()).toBe(initial);
      await writeFile(join(venv, 'dependency.py'), 'VERSION = 2\n');
      expect(fingerprint()).not.toBe(initial);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
);

test.skipIf(!Bun.which('python3') || !Bun.which('uv'))(
  'strict Python installation rejects a hashed direct dependency without its transitive lock',
  async () => {
    const { pythonHashLock } = await import('../../src/domain/code-swap/python');
    const directory = await mkdtemp(join(tmpdir(), 'python-transitive-lock-'));
    try {
      // Local wheels make dependency resolution real while keeping the test entirely offline.
      const wheels = Bun.spawnSync([
        'python3',
        '-I',
        '-c',
        `
import hashlib, pathlib, sys, zipfile
root = pathlib.Path(sys.argv[1])
entries = []
for name, dependency in [('swap_parent', 'Requires-Dist: swap-child==1.0\\n'), ('swap_child', '')]:
    path = root / (name + '-1.0-py3-none-any.whl')
    info = name + '-1.0.dist-info/'
    with zipfile.ZipFile(path, 'w') as wheel:
        wheel.writestr(info + 'METADATA', 'Metadata-Version: 2.1\\nName: ' + name + '\\nVersion: 1.0\\n' + dependency)
        wheel.writestr(info + 'WHEEL', 'Wheel-Version: 1.0\\nRoot-Is-Purelib: true\\nTag: py3-none-any\\n')
        wheel.writestr(info + 'RECORD', '')
        wheel.writestr(name + '.py', 'VALUE = 1\\n')
    entries.append(name + '==1.0 --hash=sha256:' + hashlib.sha256(path.read_bytes()).hexdigest())
print('\\n'.join(entries))
`,
        directory
      ]);
      expect(wheels.exitCode).toBe(0);
      const complete = wheels.stdout.toString().trim();
      const incomplete = complete.split('\n')[0]!;
      // Both pass syntax validation; only the installer can establish transitive completeness.
      expect(pythonHashLock(incomplete)).toBe(true);
      expect(pythonHashLock(complete)).toBe(true);
      const requirements = join(directory, 'requirements.txt');
      const install = () =>
        Bun.spawnSync([
          'uv',
          'pip',
          'install',
          '--python',
          Bun.which('python3')!,
          '--no-config',
          '--no-cache',
          '--no-index',
          '--find-links',
          directory,
          '--require-hashes',
          '--target',
          join(directory, 'installed'),
          '-r',
          requirements
        ]);
      await writeFile(requirements, incomplete);
      const rejected = install();
      expect(rejected.exitCode).not.toBe(0);
      expect(rejected.stderr.toString()).toContain('hash');
      await writeFile(requirements, complete);
      const accepted = install();
      expect(accepted.exitCode).toBe(0);
      expect(await Bun.file(join(directory, 'installed/swap_child.py')).text()).toBe('VALUE = 1\n');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
);
