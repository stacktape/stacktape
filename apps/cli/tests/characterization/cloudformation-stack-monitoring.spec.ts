import { describe, expect, spyOn, test } from 'bun:test';
import { diffTemplate } from '@aws-cdk/cloudformation-diff';
import type { MonitoredStackEvent } from '../../src/aws/cloudformation-stacks';
import type { StackDetails } from '../../src/domain/cloudformation-stack-manager/types';
import {
  countResourcesDeletedDuringCleanup,
  findFailedCleanupDeletions,
  stackManager
} from '../../src/domain/cloudformation-stack-manager';
import { templateManager } from '../../src/domain/template-manager';
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

/** Runs `monitorStack('update')` with fake AWS responses; `poll` runs one iteration of its polling interval. */
const withMonitor = async (
  run: (fixture: {
    monitoring: Promise<unknown>;
    settled: () => 'pending' | 'resolved' | 'rejected';
    poll: (count?: number) => Promise<void>;
    events: ReturnType<typeof spyOn<typeof awsSdkManager.cloudFormation, 'getEvents'>>;
    getDetails: ReturnType<typeof spyOn<typeof awsSdkManager.cloudFormation, 'getDetails'>>;
  }) => Promise<void>,
  { finishWhenCleanupStarts = false, removedResources = [] as string[] } = {}
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
    const interval = spyOn(globalThis, 'setInterval').mockImplementation(((callback: () => Promise<void>) => {
      pollOnce = callback;
      return 0 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);
    const clear = spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
    const now = spyOn(time, 'getAwsSynchronizedTime').mockResolvedValue(new Date(started));
    const events = spyOn(awsSdkManager.cloudFormation, 'getEvents').mockResolvedValue([]);
    const getDetails = spyOn(awsSdkManager.cloudFormation, 'getDetails').mockResolvedValue(
      stackDetails('UPDATE_IN_PROGRESS')
    );
    let state: 'pending' | 'resolved' | 'rejected' = 'pending';
    try {
      const monitoring = stackManager.monitorStack('update', stackName, () => {}, { finishWhenCleanupStarts });
      monitoring.then(
        () => (state = 'resolved'),
        () => (state = 'rejected')
      );
      for (let turn = 0; turn < 20; turn++) await Promise.resolve();
      if (!pollOnce) throw new Error('The stack monitor did not start polling.');
      await run({
        monitoring,
        settled: () => state,
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
