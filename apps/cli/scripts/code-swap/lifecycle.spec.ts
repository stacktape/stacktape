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
    expect(template.Resources.StacktapeCodeSwapTable.DependsOn).toBe(cfLogicalNames.ecsTaskRole('api'));
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
