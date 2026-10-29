import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { diffTemplate } from '@aws-cdk/cloudformation-diff';
import type { MonitoredStackEvent } from '../../src/aws/cloudformation-stacks';
import type { StackDetails } from '../../src/domain/cloudformation-stack-manager/types';
import type { PendingDelete } from '../../src/domain/cloudformation-stack-manager/background-delete';
import {
  countResourcesDeletedDuringCleanup,
  findFailedCleanupDeletions,
  REPORTED_CLEANUP_FAILURES_S3_KEY,
  stackManager,
  takeUnreportedCleanupFailures
} from '../../src/domain/cloudformation-stack-manager';
import { templateManager } from '../../src/domain/template-manager';
import { deploymentArtifactManager } from '../../src/domain/deployment-artifact-manager';
import { globalStateManager } from '../../src/app/global-state-manager';
import { operationReporter } from '../../src/app/operation-manager';
import { awsSdkManager } from '../../src/utils/aws-sdk-manager';
import * as time from '../../src/utils/time';
import { withCredentiallessSynthesisBoundary } from './synthesis-fixture';

const stackName = 'monitor-test';
const started = new Date('2026-10-10T10:00:00Z');

const resourceEvent = (logicalId: string, status: string, seconds: number): MonitoredStackEvent => ({
  StackId: stackName,
  StackName: stackName,
  LogicalResourceId: logicalId,
  ResourceType: 'AWS::CloudFront::Distribution',
  ResourceStatus: status as MonitoredStackEvent['ResourceStatus'],
  ResourceStatusReason: status === 'DELETE_FAILED' ? 'Resource is in use' : undefined,
  Timestamp: new Date(started.getTime() + seconds * 1000),
  EventId: `${logicalId}-${status}-${seconds}`
});

const stackEvent = (status: string, seconds = 0): MonitoredStackEvent => ({
  StackId: stackName,
  StackName: stackName,
  LogicalResourceId: stackName,
  ResourceType: 'AWS::CloudFormation::Stack',
  ResourceStatus: status as MonitoredStackEvent['ResourceStatus'],
  Timestamp: new Date(started.getTime() + seconds * 1000),
  EventId: `${status}-${seconds}`
});

const stackDetails = (status: StackDetails['StackStatus']): StackDetails => ({
  StackName: stackName,
  CreationTime: new Date('2026-10-01'),
  StackStatus: status,
  stackOutput: {}
});

/** Runs `monitorStack` with fake AWS responses; `poll` runs one iteration of its polling interval. */
const withMonitor = async (
  run: (fixture: {
    monitoring: Promise<unknown>;
    settled: () => 'pending' | 'resolved' | 'rejected';
    poll: (count?: number) => Promise<void>;
    pollingIntervalMs: number | undefined;
    events: ReturnType<typeof spyOn<typeof awsSdkManager.cloudFormation, 'getEvents'>>;
    getDetails: ReturnType<typeof spyOn<typeof awsSdkManager.cloudFormation, 'getDetails'>>;
  }) => Promise<void>,
  {
    action = 'update',
    finishWhenCleanupStarts = false,
    removedResources = [] as string[],
    operationId,
    startedAfter,
    onResourceDeletesStarted,
    canFinishDeleteInBackground,
    stackResources = []
  }: {
    startedAfter?: Date;
    action?: 'update' | 'delete';
    finishWhenCleanupStarts?: boolean;
    removedResources?: string[];
    operationId?: string;
    onResourceDeletesStarted?: () => void;
    canFinishDeleteInBackground?: (pending: PendingDelete[]) => Promise<PendingDelete[] | undefined>;
    /** The stack's resources before a delete: logical ID and type. */
    stackResources?: [string, string][];
  } = {}
) => {
  await withCredentiallessSynthesisBoundary(async () => {
    operationReporter.setSilentMode(true);
    templateManager.template = { Resources: {} };
    templateManager.oldTemplate = {
      Resources: Object.fromEntries(
        removedResources.map((logicalId) => [logicalId, { Type: 'AWS::CloudFront::Distribution', Properties: {} }])
      )
    };
    globalStateManager.rawCommands = ['deploy'];
    globalStateManager.rawArgs = { region: 'eu-west-1' };
    let pollOnce: (() => Promise<void>) | undefined;
    let pollingIntervalMs: number | undefined;
    const interval = spyOn(globalThis, 'setInterval').mockImplementation(((
      callback: () => Promise<void>,
      ms?: number
    ) => {
      pollOnce = callback;
      pollingIntervalMs = ms;
      return 0 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);
    const clear = spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
    const now = spyOn(time, 'getAwsSynchronizedTime').mockResolvedValue(new Date(started));
    const events = spyOn(awsSdkManager.cloudFormation, 'getEvents').mockResolvedValue([]);
    const getDetails = spyOn(awsSdkManager.cloudFormation, 'getDetails').mockResolvedValue(
      stackDetails('UPDATE_IN_PROGRESS')
    );
    let state: 'pending' | 'resolved' | 'rejected' = 'pending';
    stackManager.existingStackResources = stackResources.map(([LogicalResourceId, ResourceType]) => ({
      LogicalResourceId,
      ResourceType,
      PhysicalResourceId: `${LogicalResourceId}-id`
    })) as typeof stackManager.existingStackResources;
    try {
      const monitoring = stackManager.monitorStack(action, stackName, () => {}, {
        finishWhenCleanupStarts,
        operationId,
        startedAfter,
        onResourceDeletesStarted,
        canFinishDeleteInBackground
      });
      monitoring.then(
        () => (state = 'resolved'),
        () => (state = 'rejected')
      );
      for (let turn = 0; turn < 20; turn++) await Promise.resolve();
      if (!pollOnce) throw new Error('The stack monitor did not start polling.');
      await run({
        monitoring,
        settled: () => state,
        pollingIntervalMs,
        poll: async (count = 1) => {
          for (let index = 0; index < count; index++) {
            await pollOnce!();
            // Let the background status request settle before the next poll.
            for (let turn = 0; turn < 10; turn++) await Promise.resolve();
          }
        },
        events,
        getDetails
      });
    } finally {
      for (const spy of [interval, clear, now, events, getDetails]) spy.mockRestore();
      stackManager.existingStackResources = [];
    }
  });
};

test('a slow stack status request does not hold up the completion event', async () => {
  await withMonitor(async ({ monitoring, poll, events, getDetails }) => {
    events.mockResolvedValue([stackEvent('UPDATE_IN_PROGRESS')]);
    await poll();
    getDetails.mockReturnValue(new Promise(() => {}));
    events.mockResolvedValue([]);
    await poll();
    events.mockResolvedValue([stackEvent('UPDATE_COMPLETE', 3), stackEvent('UPDATE_IN_PROGRESS')]);
    await poll();
    await expect(monitoring).resolves.toEqual({});
  });
});

test("the previous update's final status cannot complete this update", async () => {
  await withMonitor(async ({ settled, poll, events, getDetails }) => {
    // Before this update's start event is visible, DescribeStacks still reports the previous update.
    getDetails.mockResolvedValue(stackDetails('UPDATE_COMPLETE'));
    await poll(2);
    events.mockResolvedValue([stackEvent('UPDATE_IN_PROGRESS')]);
    await poll();
    expect(settled()).toBe('pending');
    expect(getDetails).not.toHaveBeenCalled();
  });
});

test("a second update in a row does not take the first one's events for its own", async () => {
  const ofOperation = (event: MonitoredStackEvent, OperationId: string) => ({ ...event, OperationId });
  await withMonitor(
    async ({ settled, poll, events }) => {
      events.mockResolvedValue([
        ofOperation(stackEvent('UPDATE_COMPLETE', 10), 'first'),
        ofOperation(stackEvent('UPDATE_IN_PROGRESS', 1), 'first')
      ]);
      await poll(2);
      expect(settled()).toBe('pending');
      events.mockResolvedValue([
        ofOperation(stackEvent('UPDATE_COMPLETE', 40), 'second'),
        ofOperation(stackEvent('UPDATE_IN_PROGRESS', 20), 'second'),
        ofOperation(stackEvent('UPDATE_COMPLETE', 10), 'first'),
        ofOperation(stackEvent('UPDATE_IN_PROGRESS', 1), 'first')
      ]);
      await poll();
      expect(settled()).toBe('resolved');
    },
    { operationId: 'second' }
  );
});

test('the stack status finishes monitoring when the completion event is missed', async () => {
  await withMonitor(async ({ monitoring, poll, events, getDetails }) => {
    events.mockResolvedValue([stackEvent('UPDATE_IN_PROGRESS')]);
    await poll();
    getDetails.mockResolvedValue(stackDetails('UPDATE_COMPLETE'));
    events.mockResolvedValue([]);
    await poll(2);
    await expect(monitoring).resolves.toEqual({});
  });
});

test('repeated stack status failures stop the monitoring with the AWS error', async () => {
  await withMonitor(async ({ monitoring, poll, events, getDetails }) => {
    events.mockResolvedValue([stackEvent('UPDATE_IN_PROGRESS')]);
    await poll();
    getDetails.mockRejectedValue(new Error('AccessDenied: cloudformation:DescribeStacks'));
    events.mockResolvedValue([]);
    await poll(4);
    await expect(monitoring).rejects.toThrow('AccessDenied');
  });
});

describe('stack deletes', () => {
  const deleteEvent = (logicalId: string, status: string, seconds: number, ResourceStatusReason?: string) => ({
    ...resourceEvent(logicalId, status, seconds),
    ...(ResourceStatusReason && { ResourceStatusReason })
  });

  test('a delete CloudFormation cancels fails with its reason instead of waiting forever', async () => {
    // Measured: the stack goes back to its previous status about a second after DELETE_IN_PROGRESS.
    let started = false;
    await withMonitor(
      async ({ monitoring, poll, events }) => {
        events.mockResolvedValue([
          {
            ...stackEvent('UPDATE_COMPLETE', 1),
            ResourceStatusReason: 'Delete canceled. Cannot delete export X as it is in use by other-stack.'
          },
          stackEvent('DELETE_IN_PROGRESS')
        ]);
        await poll();
        await expect(monitoring).rejects.toThrow('Delete canceled');
        expect(started).toBe(false);
      },
      { action: 'delete', onResourceDeletesStarted: () => (started = true) }
    );
  });

  test('a cancel seen only in the stack status still fails with its reason', async () => {
    await withMonitor(
      async ({ monitoring, poll, events, getDetails }) => {
        events.mockResolvedValue([stackEvent('DELETE_IN_PROGRESS')]);
        await poll();
        getDetails.mockResolvedValue({
          ...stackDetails('UPDATE_COMPLETE'),
          StackStatusReason: 'Delete canceled. Cannot delete export X as it is in use by other-stack.'
        });
        events.mockResolvedValue([]);
        await poll(2);
        await expect(monitoring).rejects.toThrow('in use by other-stack');
      },
      { action: 'delete' }
    );
  });

  test("a delete retried right after a failed one does not take the failed attempt's events for its own", async () => {
    let startCalls = 0;
    await withMonitor(
      async ({ settled, poll, events }) => {
        // The previous attempt, seconds before this request, is still within the polling window.
        events.mockResolvedValue([
          stackEvent('DELETE_IN_PROGRESS', 1),
          stackEvent('DELETE_FAILED', -6),
          deleteEvent('Sg', 'DELETE_FAILED', -7, 'resource has a dependent object'),
          deleteEvent('Sg', 'DELETE_IN_PROGRESS', -12),
          stackEvent('DELETE_IN_PROGRESS', -13)
        ]);
        await poll(2);
        expect(startCalls).toBe(0);
        expect(settled()).toBe('pending');
      },
      { action: 'delete', startedAfter: started, onResourceDeletesStarted: () => startCalls++ }
    );
  });

  test('reports that resource deletes have started at the first resource event', async () => {
    let started = 0;
    await withMonitor(
      async ({ poll, events }) => {
        events.mockResolvedValue([stackEvent('DELETE_IN_PROGRESS')]);
        await poll();
        expect(started).toBe(0);
        events.mockResolvedValue([
          deleteEvent('Queue', 'DELETE_COMPLETE', 3),
          deleteEvent('Queue', 'DELETE_IN_PROGRESS', 2),
          stackEvent('DELETE_IN_PROGRESS')
        ]);
        await poll(2);
        expect(started).toBe(1);
      },
      { action: 'delete', onResourceDeletesStarted: () => started++ }
    );
  });

  test('finishes once the caller accepts every pending resource; retained and deleted ones are not pending', async () => {
    const asked: string[][] = [];
    await withMonitor(
      async ({ monitoring, poll, events }) => {
        events.mockResolvedValue([
          deleteEvent('Bucket', 'DELETE_SKIPPED', 2),
          deleteEvent('Queue', 'DELETE_COMPLETE', 2),
          deleteEvent('Cdn', 'DELETE_IN_PROGRESS', 1),
          stackEvent('DELETE_IN_PROGRESS')
        ]);
        await poll();
        await expect(monitoring).resolves.toEqual({
          deletionContinuesInBackground: [
            { logicalId: 'Cdn', resourceType: 'AWS::CloudFront::Distribution', physicalId: 'Cdn-id' }
          ]
        });
        expect(asked).toEqual([['Cdn']]);
      },
      {
        action: 'delete',
        stackResources: [
          ['Bucket', 'AWS::S3::Bucket'],
          ['Queue', 'AWS::SQS::Queue'],
          ['Cdn', 'AWS::CloudFront::Distribution']
        ],
        canFinishDeleteInBackground: async (pending) => {
          asked.push(pending.map(({ logicalId }) => logicalId));
          return pending;
        }
      }
    );
  });

  test('keeps waiting while a resource has failed to delete, or the caller declines', async () => {
    for (const failed of [true, false]) {
      let asked = 0;
      await withMonitor(
        async ({ settled, poll, events }) => {
          events.mockResolvedValue([
            ...(failed ? [deleteEvent('Sg', 'DELETE_FAILED', 2, 'resource has a dependent object')] : []),
            deleteEvent('Sg', 'DELETE_IN_PROGRESS', 1),
            stackEvent('DELETE_IN_PROGRESS')
          ]);
          await poll();
          expect(settled()).toBe('pending');
          expect(asked).toBe(failed ? 0 : 1);
        },
        {
          action: 'delete',
          stackResources: [['Sg', 'AWS::EC2::SecurityGroup']],
          canFinishDeleteInBackground: async () => {
            asked++;
            return undefined;
          }
        }
      );
    }
  });
});

describe('polling stack events', () => {
  test('a delete is polled every second, so its end is noticed within about a second', async () => {
    await withMonitor(
      async ({ monitoring, poll, pollingIntervalMs, events }) => {
        expect(pollingIntervalMs).toBe(1000);
        events.mockResolvedValue([stackEvent('DELETE_IN_PROGRESS')]);
        await poll();
        events.mockResolvedValue([stackEvent('DELETE_COMPLETE', 2)]);
        await poll();
        await expect(monitoring).resolves.toEqual({});
      },
      { action: 'delete' }
    );
  });

  test('an operation running for more than five minutes is polled every other second', async () => {
    const startedAt = performance.now();
    const clock = spyOn(performance, 'now').mockReturnValue(startedAt);
    try {
      await withMonitor(async ({ poll, events }) => {
        events.mockResolvedValue([stackEvent('UPDATE_IN_PROGRESS')]);
        await poll(2);
        expect(events).toHaveBeenCalledTimes(2);
        clock.mockReturnValue(startedAt + 5 * 60_000 + 1);
        await poll(4);
        expect(events).toHaveBeenCalledTimes(4);
      });
    } finally {
      clock.mockRestore();
    }
  });
});

describe("AWS's clock", () => {
  afterEach(() => time.resetAwsClockSync());

  const withAwsDateResponses = async (run: (requests: () => number) => Promise<void>, { failing = false } = {}) => {
    let requests = 0;
    const fetch = spyOn(globalThis, 'fetch').mockImplementation((async () => {
      requests++;
      if (failing) throw new Error('connect ETIMEDOUT');
      return new Response(null, { headers: { date: new Date(Date.now() + 30_000).toUTCString() } });
    }) as unknown as typeof globalThis.fetch);
    try {
      await run(() => requests);
    } finally {
      fetch.mockRestore();
    }
  };

  test('is read once and reused by later stack operations of the same command', async () => {
    await withAwsDateResponses(async (requests) => {
      time.startAwsClockSync();
      const first = await time.getAwsSynchronizedTime();
      const second = await time.getAwsSynchronizedTime();
      expect(requests()).toBe(1);
      // AWS's Date header has one-second resolution.
      expect(Math.abs(first.getTime() - (Date.now() + 30_000))).toBeLessThan(1500);
      expect(second.getTime()).toBeGreaterThanOrEqual(first.getTime());
    });
  });

  test('after a minute it is read again, while callers keep using the previous reading', async () => {
    const startedAt = performance.now();
    const clock = spyOn(performance, 'now').mockReturnValue(startedAt);
    try {
      await withAwsDateResponses(async (requests) => {
        await time.getAwsSynchronizedTime();
        clock.mockReturnValue(startedAt + 60_001);
        let pending = true;
        const later = time.getAwsSynchronizedTime().finally(() => (pending = false));
        await Promise.resolve();
        await Promise.resolve();
        expect(pending).toBe(false);
        expect(Math.abs((await later).getTime() - (Date.now() + 30_000))).toBeLessThan(1500);
        expect(requests()).toBe(2);
      });
    } finally {
      clock.mockRestore();
    }
  });

  test('falls back to the local clock when AWS cannot be reached, without asking again for every call', async () => {
    await withAwsDateResponses(
      async (requests) => {
        const now = await time.getAwsSynchronizedTime();
        await time.getAwsSynchronizedTime();
        expect(requests()).toBe(1);
        expect(Math.abs(now.getTime() - Date.now())).toBeLessThan(1000);
      },
      { failing: true }
    );
  });
});

describe('finishing an update when its cleanup starts', () => {
  const removedCdn = { finishWhenCleanupStarts: true, removedResources: ['SiteCdn'] };

  test('the deploy finishes at the cleanup event and says how many old resources AWS still deletes', async () => {
    await withMonitor(async ({ monitoring, poll, events }) => {
      events.mockResolvedValue([stackEvent('UPDATE_IN_PROGRESS')]);
      await poll();
      events.mockResolvedValue([
        stackEvent('UPDATE_COMPLETE_CLEANUP_IN_PROGRESS', 30),
        stackEvent('UPDATE_IN_PROGRESS')
      ]);
      await poll();
      await expect(monitoring).resolves.toEqual({ resourcesDeletedInBackground: 1 });
    }, removedCdn);
  });

  test('an update that removes nothing finishes at the cleanup event without a note', async () => {
    await withMonitor(
      async ({ monitoring, poll, events }) => {
        events.mockResolvedValue([stackEvent('UPDATE_IN_PROGRESS')]);
        await poll();
        events.mockResolvedValue([stackEvent('UPDATE_COMPLETE_CLEANUP_IN_PROGRESS', 30)]);
        await poll();
        await expect(monitoring).resolves.toEqual({});
      },
      { finishWhenCleanupStarts: true }
    );
  });

  test('the stack status finishes the deploy when the cleanup event is missed', async () => {
    await withMonitor(async ({ monitoring, poll, events, getDetails }) => {
      events.mockResolvedValue([stackEvent('UPDATE_IN_PROGRESS')]);
      await poll();
      getDetails.mockResolvedValue(stackDetails('UPDATE_COMPLETE_CLEANUP_IN_PROGRESS'));
      events.mockResolvedValue([]);
      await poll(2);
      await expect(monitoring).resolves.toEqual({ resourcesDeletedInBackground: 1 });
    }, removedCdn);
  });

  test('a cleanup that already ended in the same batch still reports its failed deletions', async () => {
    await withMonitor(async ({ monitoring, poll, events }) => {
      events.mockResolvedValue([stackEvent('UPDATE_IN_PROGRESS')]);
      await poll();
      events.mockResolvedValue(
        [
          stackEvent('UPDATE_IN_PROGRESS'),
          stackEvent('UPDATE_COMPLETE_CLEANUP_IN_PROGRESS', 30),
          resourceEvent('SiteCdn', 'DELETE_IN_PROGRESS', 31),
          resourceEvent('SiteCdn', 'DELETE_FAILED', 32),
          stackEvent('UPDATE_COMPLETE', 33)
        ].toReversed()
      );
      await poll();
      const result = (await monitoring) as { warningMessages?: string[] };
      expect(result.warningMessages?.[0]).toContain('errors occurred during old resources CLEANUP');
    }, removedCdn);
  });

  test('without the option, other updates still wait for the cleanup to end', async () => {
    await withMonitor(async ({ settled, monitoring, poll, events }) => {
      events.mockResolvedValue([stackEvent('UPDATE_IN_PROGRESS')]);
      await poll();
      events.mockResolvedValue([stackEvent('UPDATE_COMPLETE_CLEANUP_IN_PROGRESS', 30)]);
      await poll();
      expect(settled()).toBe('pending');
      events.mockResolvedValue([stackEvent('UPDATE_COMPLETE', 90)]);
      await poll();
      await expect(monitoring).resolves.toEqual({});
    });
  });
});

describe('failed deletions of the last cleanup', () => {
  test('are the DELETE_FAILED events after the last cleanup started, newest per resource', () => {
    const events = [
      stackEvent('UPDATE_COMPLETE', 100),
      resourceEvent('OldCdn', 'DELETE_FAILED', 99),
      resourceEvent('OldCdn', 'DELETE_IN_PROGRESS', 60),
      resourceEvent('OldCdn', 'DELETE_FAILED', 50),
      resourceEvent('OldCdn', 'DELETE_IN_PROGRESS', 41),
      stackEvent('UPDATE_COMPLETE_CLEANUP_IN_PROGRESS', 40),
      // A deletion that failed during the update itself was retried and is not a cleanup failure.
      resourceEvent('Replaced', 'DELETE_FAILED', 20),
      stackEvent('UPDATE_IN_PROGRESS', 0)
    ];
    expect(findFailedCleanupDeletions(events).map(({ EventId }) => EventId)).toEqual(['OldCdn-DELETE_FAILED-99']);
  });

  test('are none when the cleanup deleted everything or there was no cleanup', () => {
    expect(
      findFailedCleanupDeletions([
        stackEvent('UPDATE_COMPLETE', 100),
        resourceEvent('OldCdn', 'DELETE_COMPLETE', 90),
        stackEvent('UPDATE_COMPLETE_CLEANUP_IN_PROGRESS', 40)
      ])
    ).toEqual([]);
    expect(findFailedCleanupDeletions([stackEvent('CREATE_COMPLETE', 10)])).toEqual([]);
    // A retry that deleted the resource after all.
    expect(
      findFailedCleanupDeletions([
        stackEvent('UPDATE_COMPLETE', 100),
        resourceEvent('OldCdn', 'DELETE_COMPLETE', 90),
        resourceEvent('OldCdn', 'DELETE_FAILED', 50),
        stackEvent('UPDATE_COMPLETE_CLEANUP_IN_PROGRESS', 40)
      ])
    ).toEqual([]);
  });
});

describe('reporting failed cleanup deletions', () => {
  /** A deployment bucket held in memory; `failReads` makes every read fail like a missing permission. */
  const withBucket = async (
    run: (bucket: { objects: Map<string, string>; puts: () => number }) => Promise<void>,
    { failReads = false } = {}
  ) => {
    const objects = new Map<string, string>();
    let putCount = 0;
    const get = spyOn(awsSdkManager.s3, 'getObjectText').mockImplementation(async ({ bucketName, s3Key }) => {
      const body = objects.get(`${bucketName}/${s3Key}`);
      if (failReads || body === undefined) throw new Error('NoSuchKey');
      return body;
    });
    const put = spyOn(awsSdkManager.s3, 'putObject').mockImplementation(async ({ bucketName, s3Key, body }) => {
      putCount++;
      objects.set(`${bucketName}/${s3Key}`, body);
      return {} as Awaited<ReturnType<typeof awsSdkManager.s3.putObject>>;
    });
    try {
      await run({ objects, puts: () => putCount });
    } finally {
      get.mockRestore();
      put.mockRestore();
    }
  };
  const report = (failures: MonitoredStackEvent[]) =>
    takeUnreportedCleanupFailures({ failures, deploymentBucketName: 'deployment-bucket' }).then((events) =>
      events.map(({ EventId }) => EventId)
    );

  test('reports each failure once, also to later commands that find no new stack events', async () => {
    await withBucket(async ({ objects, puts }) => {
      const oldCdn = resourceEvent('OldCdn', 'DELETE_FAILED', 99);
      expect(await report([oldCdn])).toEqual(['OldCdn-DELETE_FAILED-99']);
      expect(objects.get(`deployment-bucket/${REPORTED_CLEANUP_FAILURES_S3_KEY}`)).toBe(
        JSON.stringify(['OldCdn-DELETE_FAILED-99'])
      );
      expect(await report([oldCdn])).toEqual([]);
      expect(puts()).toBe(1);
      // A later update's cleanup fails again.
      const oldDatabase = resourceEvent('OldDatabase', 'DELETE_FAILED', 300);
      expect(await report([oldDatabase])).toEqual(['OldDatabase-DELETE_FAILED-300']);
      expect(await report([oldDatabase])).toEqual([]);
    });
  });

  // Not everything in the deployment bucket is an artifact; a bucket that still holds anything cannot be deleted.
  test('deleting the stack empties the whole deployment bucket, the record included', async () => {
    const stored = [
      { Key: REPORTED_CLEANUP_FAILURES_S3_KEY, VersionId: 'null' },
      { Key: 'bucket-sync-manifest/v000002.json', VersionId: 'null' },
      { Key: 'cf-templates/v000002-abc.yml', VersionId: 'null' }
    ];
    const listed = spyOn(awsSdkManager.s3, 'listObjectVersions').mockResolvedValue(
      stored as Awaited<ReturnType<typeof awsSdkManager.s3.listObjectVersions>>
    );
    const deleted = spyOn(awsSdkManager.s3, 'deleteObjects').mockResolvedValue(
      {} as Awaited<ReturnType<typeof awsSdkManager.s3.deleteObjects>>
    );
    try {
      await deploymentArtifactManager.deleteAllObjects();
      expect(deleted.mock.calls[0]?.[1]).toEqual(stored);
    } finally {
      listed.mockRestore();
      deleted.mockRestore();
    }
  });

  test('reports every failure when the record cannot be read or there is no deployment bucket', async () => {
    await withBucket(
      async () => {
        const failure = resourceEvent('OldCdn', 'DELETE_FAILED', 99);
        expect(await report([failure])).toEqual(['OldCdn-DELETE_FAILED-99']);
        expect(await report([failure])).toEqual(['OldCdn-DELETE_FAILED-99']);
        expect(await takeUnreportedCleanupFailures({ failures: [failure], deploymentBucketName: undefined })).toEqual([
          failure
        ]);
      },
      { failReads: true }
    );
  });
});

test('the resources deleted during cleanup are the removed and replaced ones, not the retained ones', () => {
  const diff = diffTemplate(
    {
      Resources: {
        Removed: { Type: 'AWS::SQS::Queue', Properties: {} },
        Retained: { Type: 'AWS::SQS::Queue', DeletionPolicy: 'Retain', Properties: {} },
        Replaced: { Type: 'AWS::SQS::Queue', Properties: { QueueName: 'one' } },
        Updated: { Type: 'AWS::SQS::Queue', Properties: { VisibilityTimeout: 30 } }
      }
    },
    {
      Resources: {
        Replaced: { Type: 'AWS::SQS::Queue', Properties: { QueueName: 'two' } },
        Updated: { Type: 'AWS::SQS::Queue', Properties: { VisibilityTimeout: 60 } },
        Added: { Type: 'AWS::SQS::Queue', Properties: {} }
      }
    }
  );
  expect(countResourcesDeletedDuringCleanup(diff)).toBe(2);
  expect(countResourcesDeletedDuringCleanup(undefined)).toBe(0);
});

describe('a deploy that fails without automatic rollback', () => {
  const failedUpdate = async ({ outputs }: { outputs: Record<string, string> }) => {
    let error: unknown;
    const previous = stackManager.existingStackDetails;
    stackManager.existingStackDetails = {
      ...stackDetails('UPDATE_COMPLETE'),
      Outputs: Object.entries(outputs).map(([OutputKey, OutputValue]) => ({ OutputKey, OutputValue })),
      stackOutput: outputs
    };
    try {
      await withMonitor(async ({ monitoring, poll, events }) => {
        events.mockResolvedValue([stackEvent('UPDATE_IN_PROGRESS')]);
        await poll();
        events.mockResolvedValue([
          { ...stackEvent('UPDATE_FAILED', 30), ResourceStatusReason: 'The following resource(s) failed to update' },
          stackEvent('UPDATE_IN_PROGRESS')
        ]);
        await poll();
        error = await monitoring.catch((err) => err);
      });
    } finally {
      stackManager.existingStackDetails = previous;
    }
    return ((error as { hints?: string[] }).hints ?? []).join('\n');
  };

  test('says the stack stays in UPDATE_FAILED and how to continue or undo it', async () => {
    const hints = await failedUpdate({ outputs: { StpDeploymentVersion: 'v000003' } });
    expect(hints).toContain('UPDATE_FAILED');
    expect(hints).toContain('deploy');
    expect(hints).toContain('stack recover');
  });

  test('after a failed first deploy, offers delete instead of recovery', async () => {
    const hints = await failedUpdate({ outputs: {} });
    expect(hints).toContain('delete');
    expect(hints).not.toContain('stack recover');
  });
});

describe('continuing a stack an earlier deploy left failed', () => {
  const withStack = (status: StackDetails['StackStatus'], run: () => void) => {
    globalStateManager.rawCommands = ['deploy'];
    globalStateManager.rawArgs = { region: 'eu-west-1' };
    const { existingStackDetails, existingStackResources } = stackManager;
    stackManager.existingStackDetails = stackDetails(status);
    stackManager.existingStackResources = [];
    try {
      run();
    } finally {
      stackManager.existingStackDetails = existingStackDetails;
      stackManager.existingStackResources = existingStackResources;
    }
  };

  test.each(['CREATE_FAILED', 'UPDATE_FAILED'] as const)(
    'a deploy over %s updates the stack without rollback and never takes the fast path',
    (status) => {
      withStack(status, () => {
        expect(stackManager.stackActionType).toBe('update');
        expect(stackManager.continuesFailedStack).toBe(true);
        expect(stackManager.rollsBackOnFailure).toBe(false);
        expect(stackManager.reasonToContinueFailedStack).toContain(status);
      });
    }
  );

  test('a healthy stack is not continued', () => {
    withStack('UPDATE_COMPLETE', () => {
      expect(stackManager.continuesFailedStack).toBe(false);
      expect(stackManager.reasonToContinueFailedStack).toBeUndefined();
    });
  });
});

describe('an update that replaces resources', () => {
  const oldTemplate = {
    Resources: {
      Db: { Type: 'AWS::RDS::DBInstance', Properties: { DBInstanceClass: 'db.t4g.micro' } },
      Task: { Type: 'AWS::ECS::TaskDefinition', Properties: { Cpu: '256', Memory: '512' } },
      Service: { Type: 'AWS::ECS::Service', Properties: { TaskDefinition: { Ref: 'Task' } } }
    },
    Outputs: { StpDeploymentVersion: { Value: 'v000001' } }
  };
  const newTemplate = {
    ...oldTemplate,
    Resources: {
      ...oldTemplate.Resources,
      Task: { ...oldTemplate.Resources.Task, Properties: { Cpu: '512', Memory: '1024' } }
    }
  };

  const plan = (status: StackDetails['StackStatus'], { deployed }: { deployed: boolean }) => {
    globalStateManager.rawCommands = ['deploy'];
    globalStateManager.rawArgs = { region: 'eu-west-1' };
    templateManager.template = structuredClone(newTemplate) as never;
    stackManager.existingStackDetails = {
      ...stackDetails(status),
      Outputs: deployed ? [{ OutputKey: 'StpDeploymentVersion', OutputValue: 'v000001' }] : []
    };
    stackManager.existingStackResources = ['Db', 'Task'].map((LogicalResourceId) => ({ LogicalResourceId })) as never;
    stackManager.planUpdate(diffTemplate(oldTemplate, newTemplate));
  };

  test('a healthy stack rolls this update back on failure, because CloudFormation replaces only then', () => {
    plan('UPDATE_COMPLETE', { deployed: true });
    expect(stackManager.rollsBackOnFailure).toBe(true);
    expect(stackManager.reasonForRollbackOfUpdate).toContain('Task');
    expect(stackManager.getTemplateBeforeReplacing()).toBeUndefined();
  });

  test('a failed first deploy first removes what it replaces and what depends on it, keeping the database', () => {
    plan('CREATE_FAILED', { deployed: false });
    expect(stackManager.rollsBackOnFailure).toBe(false);
    const step = stackManager.getTemplateBeforeReplacing();
    expect(step?.removedResources).toEqual(['Service', 'Task']);
    expect(Object.keys(step!.template.Resources)).toEqual(['Db']);
    // A failure of the full deploy must still leave a stack that was never deployed.
    expect(step!.template.Outputs).toBeUndefined();
  });

  test('a never-deployed stack recreates resources whose update failed, whatever its stored template says', () => {
    globalStateManager.rawCommands = ['deploy'];
    globalStateManager.rawArgs = { region: 'eu-west-1' };
    templateManager.template = structuredClone(newTemplate) as never;
    stackManager.existingStackDetails = { ...stackDetails('UPDATE_FAILED'), Outputs: [] };
    stackManager.existingStackResources = [
      { LogicalResourceId: 'Db', ResourceType: 'AWS::RDS::DBInstance', ResourceStatus: 'UPDATE_ROLLBACK_COMPLETE' },
      {
        LogicalResourceId: 'Task',
        ResourceType: 'AWS::ECS::TaskDefinition',
        ResourceStatus: 'UPDATE_ROLLBACK_COMPLETE'
      }
    ] as never;
    // The stored template is the failed attempt's, so it already equals the new one.
    stackManager.planUpdate(diffTemplate(newTemplate, newTemplate));
    expect(stackManager.getTemplateBeforeReplacing()?.removedResources).toEqual(['Service', 'Task']);
  });

  test('a deployed stack recreates what its failed update added, keeping the release version', () => {
    globalStateManager.rawCommands = ['deploy'];
    globalStateManager.rawArgs = { region: 'eu-west-1' };
    templateManager.template = structuredClone(newTemplate) as never;
    stackManager.existingStackDetails = {
      ...stackDetails('UPDATE_FAILED'),
      Outputs: [{ OutputKey: 'StpDeploymentVersion', OutputValue: 'v000001' }],
      stackOutput: { StpDeploymentVersion: 'v000001' }
    };
    stackManager.existingStackResources = ['Db', 'Task'].map((LogicalResourceId) => ({ LogicalResourceId })) as never;
    // The last release had only the database; the failed update added the service.
    stackManager.planUpdate(diffTemplate(oldTemplate, newTemplate), {
      lastReleaseTemplate: { Resources: { Db: oldTemplate.Resources.Db } } as never
    });
    const step = stackManager.getTemplateBeforeReplacing();
    expect(step?.removedResources).toEqual(['Service', 'Task']);
    expect(step?.template.Outputs).toEqual({ StpDeploymentVersion: { Value: 'v000001' } });
  });

  test('a mapping change of a healthy stack rolls back on failure, as it can replace resources', () => {
    plan('UPDATE_COMPLETE', { deployed: true });
    stackManager.planUpdate(
      diffTemplate(
        { ...oldTemplate, Mappings: { Sizing: { Task: { Cpu: '256' } } } },
        { ...oldTemplate, Mappings: { Sizing: { Task: { Cpu: '512' } } } }
      )
    );
    expect(stackManager.rollsBackOnFailure).toBe(true);
    expect(stackManager.reasonForRollbackOfUpdate).toContain('mappings');
  });

  test('a deployed stack left in UPDATE_FAILED is not changed and is recovered first', () => {
    expect(() => plan('UPDATE_FAILED', { deployed: true })).toThrow(/cannot do while it continues a failed deploy/);
  });
});
