import { afterEach, describe, expect, test } from 'bun:test';
import { DescribeAlarmsCommand, GetMetricDataCommand, CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
  GetQueryResultsCommand,
  ResourceNotFoundException,
  StartQueryCommand,
  StopQueryCommand
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

  test.serial('bounds Logs Insights polling and stops a query that exceeds the local deadline', async () => {
    const commands: unknown[] = [];
    const originalSend = CloudWatchLogsClient.prototype.send;
    CloudWatchLogsClient.prototype.send = async function (command: unknown) {
      commands.push(command);
      if (command instanceof StartQueryCommand) return { queryId: 'query-1' };
      if (command instanceof StopQueryCommand) return { success: true };
      throw new Error(`Unexpected command: ${(command as { constructor?: { name?: string } }).constructor?.name}`);
    } as typeof originalSend;
    restores.push(() => {
      CloudWatchLogsClient.prototype.send = originalSend;
    });

    await expect(
      createManager().observability.runLogsInsightsQuery({
        logGroupName: 'example',
        query: 'fields @message',
        startTime: new Date('2026-07-30T10:00:00.000Z'),
        endTime: new Date('2026-07-30T11:00:00.000Z'),
        timeoutMs: 0,
        pollIntervalMs: 0
      })
    ).rejects.toMatchObject({ code: 'LOGS_INSIGHTS_QUERY_TIMEOUT' });
    expect(commands.map((command) => (command as { constructor: { name: string } }).constructor.name)).toEqual([
      'StartQueryCommand',
      'StopQueryCommand'
    ]);
  });

  test.serial('returns Logs Insights rows only after CloudWatch reports Complete', async () => {
    const originalSend = CloudWatchLogsClient.prototype.send;
    CloudWatchLogsClient.prototype.send = async function (command: unknown) {
      if (command instanceof StartQueryCommand) return { queryId: 'query-1' };
      if (command instanceof GetQueryResultsCommand) {
        return {
          status: 'Complete',
          results: [[{ field: '@message', value: 'ready' }]]
        };
      }
      throw new Error(`Unexpected command: ${(command as { constructor?: { name?: string } }).constructor?.name}`);
    } as typeof originalSend;
    restores.push(() => {
      CloudWatchLogsClient.prototype.send = originalSend;
    });

    await expect(
      createManager().observability.runLogsInsightsQuery({
        logGroupName: 'example',
        query: 'fields @message',
        startTime: new Date('2026-07-30T10:00:00.000Z'),
        endTime: new Date('2026-07-30T11:00:00.000Z'),
        pollIntervalMs: 0
      })
    ).resolves.toEqual({ results: [{ '@message': 'ready' }] });
  });

  for (const status of ['Failed', 'Cancelled', 'Timeout', 'Unknown', undefined] as const) {
    test.serial(`rejects Logs Insights terminal status ${status || 'missing'} with a stable CLI error`, async () => {
      const originalSend = CloudWatchLogsClient.prototype.send;
      CloudWatchLogsClient.prototype.send = async function (command: unknown) {
        if (command instanceof StartQueryCommand) return { queryId: 'query-1' };
        if (command instanceof GetQueryResultsCommand) return { status };
        throw new Error(`Unexpected command: ${(command as { constructor?: { name?: string } }).constructor?.name}`);
      } as typeof originalSend;
      restores.push(() => {
        CloudWatchLogsClient.prototype.send = originalSend;
      });

      await expect(
        createManager().observability.runLogsInsightsQuery({
          logGroupName: 'example',
          query: 'fields @message',
          startTime: new Date('2026-07-30T10:00:00.000Z'),
          endTime: new Date('2026-07-30T11:00:00.000Z'),
          pollIntervalMs: 0
        })
      ).rejects.toMatchObject({
        code: 'LOGS_INSIGHTS_QUERY_TERMINAL_STATUS',
        message: status
          ? `CloudWatch Logs Insights query ended with status \`${status}\`.`
          : 'CloudWatch Logs Insights query returned no status.'
      });
    });
  }

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
