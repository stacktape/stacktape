import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';
import { XRay } from '@aws-sdk/client-xray';
import { transactionSearch } from './transaction-search';

/** Enabling Transaction Search must not hold the deploy until AWS finishes activating it. */
describe('transactionSearch', () => {
  const sends: string[] = [];
  afterEach(() => {
    sends.length = 0;
  });

  const stubAws = ({ destination, retentionInDays }: { destination: string; retentionInDays?: number }) => {
    const xray = spyOn(XRay.prototype, 'send').mockImplementation((async (command: {
      constructor: { name: string };
    }) => {
      sends.push(command.constructor.name);
      if (command.constructor.name === 'GetTraceSegmentDestinationCommand') {
        // Activation stays pending for minutes after the switch.
        return { Destination: destination, Status: destination === 'CloudWatchLogs' ? 'PENDING' : 'ACTIVE' };
      }
      return {};
    }) as never);
    const logs = spyOn(CloudWatchLogs.prototype, 'send').mockImplementation((async (command: {
      constructor: { name: string };
    }) => {
      sends.push(command.constructor.name);
      if (command.constructor.name === 'DescribeLogGroupsCommand') {
        return { logGroups: [{ logGroupName: 'aws/spans', retentionInDays }] };
      }
      return {};
    }) as never);
    return () => {
      xray.mockRestore();
      logs.mockRestore();
    };
  };

  test('switches the destination, bounds the retention and returns without waiting for activation', async () => {
    const restore = stubAws({ destination: 'XRay' });
    try {
      await transactionSearch({ version: 1 }, undefined, 'Create', undefined, {
        invokedFunctionArn: 'arn:aws:lambda:eu-west-1:123456789012:function:service'
      } as never);
      expect(sends).toEqual([
        'GetTraceSegmentDestinationCommand',
        'PutResourcePolicyCommand',
        'UpdateTraceSegmentDestinationCommand',
        'DescribeLogGroupsCommand',
        'PutRetentionPolicyCommand'
      ]);
    } finally {
      restore();
    }
  });

  test('leaves an enablement that is still activating untouched and does not wait for it', async () => {
    const restore = stubAws({ destination: 'CloudWatchLogs', retentionInDays: 30 });
    try {
      await transactionSearch({ version: 1 }, undefined, 'Update', undefined, undefined);
      expect(sends).toEqual(['GetTraceSegmentDestinationCommand']);
    } finally {
      restore();
    }
  });
});
