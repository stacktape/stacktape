import { expect, spyOn, test } from 'bun:test';
import type { MonitoredStackEvent } from '../../src/aws/cloudformation-stacks';
import type { StackDetails } from '../../src/domain/cloudformation-stack-manager/types';
import { stackManager } from '../../src/domain/cloudformation-stack-manager';
import { templateManager } from '../../src/domain/template-manager';
import { globalStateManager } from '../../src/app/global-state-manager';
import { operationReporter } from '../../src/app/operation-manager';
import { awsSdkManager } from '../../src/utils/aws-sdk-manager';
import * as time from '../../src/utils/time';
import { withCredentiallessSynthesisBoundary } from './synthesis-fixture';

const stackName = 'monitor-test';
const started = new Date('2026-10-10T10:00:00Z');

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
  }) => Promise<void>
) => {
  await withCredentiallessSynthesisBoundary(async () => {
    operationReporter.setSilentMode(true);
    templateManager.template = { Resources: {} };
    templateManager.oldTemplate = { Resources: {} };
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
      const monitoring = stackManager.monitorStack('update', stackName, () => {});
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
