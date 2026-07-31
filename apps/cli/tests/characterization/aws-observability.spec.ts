import { afterEach, describe, expect, test } from 'bun:test';
import { DescribeAlarmsCommand, GetMetricDataCommand, CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
  ResourceNotFoundException
} from '@aws-sdk/client-cloudwatch-logs';
import { AwsSdkManager } from '../../src/aws/sdk-manager';

const credentials = {
  accessKeyId: 'synthetic-access-key',
  secretAccessKey: 'synthetic-secret-key'
};

const createManager = () => {
  const manager = new AwsSdkManager();
  manager.init({ credentials, plugins: [], region: 'eu-west-1' });
  return manager;
};

describe.serial('AWS observability boundary', () => {
  const restores: (() => void)[] = [];

  afterEach(() => {
    for (const restore of restores.splice(0).reverse()) {
      restore();
    }
  });

  test.serial('paginates log streams until the requested amount has been reached', async () => {
    const commands: DescribeLogStreamsCommand[] = [];
    const originalSend = CloudWatchLogsClient.prototype.send;
    CloudWatchLogsClient.prototype.send = async function (command: DescribeLogStreamsCommand) {
      commands.push(command);
      if (!command.input.nextToken) {
        return { logStreams: [{ logStreamName: 'first' }], nextToken: 'second-page' };
      }
      return { logStreams: [{ logStreamName: 'second' }, { logStreamName: 'third' }], nextToken: 'unused-page' };
    } as typeof originalSend;
    restores.push(() => {
      CloudWatchLogsClient.prototype.send = originalSend;
    });

    const streams = await createManager().observability.listLogStreams({ logGroupName: 'example', limit: 2 });

    expect(commands.map(({ input }) => ({ limit: input.limit, nextToken: input.nextToken }))).toEqual([
      { limit: 2, nextToken: undefined },
      { limit: 1, nextToken: 'second-page' }
    ]);
    expect(streams.map(({ logStreamName }) => logStreamName)).toEqual(['first', 'second']);
  });

  test.serial('treats an absent log group as an empty event source', async () => {
    const originalSend = CloudWatchLogsClient.prototype.send;
    CloudWatchLogsClient.prototype.send = async function (command: FilterLogEventsCommand) {
      throw new ResourceNotFoundException({ $metadata: {}, message: `Missing ${command.input.logGroupName}` });
    } as typeof originalSend;
    restores.push(() => {
      CloudWatchLogsClient.prototype.send = originalSend;
    });

    await expect(createManager().observability.getLogEvents({ logGroupName: 'missing' })).resolves.toEqual([]);
  });

  test.serial('does not mistake a longer prefix match for the requested log group', async () => {
    const originalSend = CloudWatchLogsClient.prototype.send;
    CloudWatchLogsClient.prototype.send = async function (_command: DescribeLogGroupsCommand) {
      return {
        logGroups: [{ logGroupName: 'example-extra' }, { logGroupName: 'example' }]
      };
    } as typeof originalSend;
    restores.push(() => {
      CloudWatchLogsClient.prototype.send = originalSend;
    });

    const result = await createManager().observability.getLogGroup({ logGroupName: 'example' });

    expect(result?.logGroupName).toBe('example');
  });

  test.serial('keeps alarm filters and metric query windows intact', async () => {
    const commands: (DescribeAlarmsCommand | GetMetricDataCommand)[] = [];
    const originalSend = CloudWatchClient.prototype.send;
    CloudWatchClient.prototype.send = async function (command: DescribeAlarmsCommand | GetMetricDataCommand) {
      commands.push(command);
      return command instanceof DescribeAlarmsCommand
        ? { MetricAlarms: [{ AlarmName: 'example-alarm' }] }
        : { MetricDataResults: [{ Id: 'requests' }] };
    } as typeof originalSend;
    restores.push(() => {
      CloudWatchClient.prototype.send = originalSend;
    });
    const observability = createManager().observability;
    const startTime = new Date('2026-07-30T10:00:00.000Z');
    const endTime = new Date('2026-07-30T11:00:00.000Z');
    const metricQueries = [{ Id: 'requests', Expression: 'SUM(METRICS())' }];

    const alarms = await observability.describeAlarms({ alarmNamePrefix: 'example-', stateValue: 'ALARM' });
    const metrics = await observability.getMetricData({ endTime, metricQueries, startTime });

    expect(alarms.map(({ AlarmName }) => AlarmName)).toEqual(['example-alarm']);
    expect(metrics.map(({ Id }) => Id)).toEqual(['requests']);
    expect(commands.map(({ input }) => input)).toEqual([
      { AlarmNamePrefix: 'example-', MaxRecords: 100, StateValue: 'ALARM' },
      { EndTime: endTime, MetricDataQueries: metricQueries, StartTime: startTime }
    ]);
  });
});
