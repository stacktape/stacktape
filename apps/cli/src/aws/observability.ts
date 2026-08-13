import type { TuiManager } from '@application-services/tui-manager';
import type { MetricDataQuery, MetricDataResult, StateValue } from '@aws-sdk/client-cloudwatch';
import { DescribeAlarmsCommand, GetMetricDataCommand, type CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import type { FilteredLogEvent, InputLogEvent, OrderBy } from '@aws-sdk/client-cloudwatch-logs';
import {
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
  GetQueryResultsCommand,
  PutLogEventsCommand,
  PutRetentionPolicyCommand,
  ResourceNotFoundException,
  StartQueryCommand,
  StopQueryCommand,
  type CloudWatchLogsClient
} from '@aws-sdk/client-cloudwatch-logs';
import { wait } from '@utils/misc';
import { CliError } from '@utils/errors';

type ErrorHandlerFactory = (message: string) => (error: Error) => never;
type LogRetentionDays = 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;

const DEFAULT_LOGS_INSIGHTS_TIMEOUT_MS = 60_000;
const DEFAULT_LOGS_INSIGHTS_POLL_INTERVAL_MS = 500;

export class AwsObservability {
  readonly #createCloudWatchClient: () => CloudWatchClient;
  readonly #createLogsClient: () => CloudWatchLogsClient;
  readonly #getErrorHandler: ErrorHandlerFactory;
  readonly #printer?: Pick<TuiManager, 'debug'>;

  constructor({
    createCloudWatchClient,
    createLogsClient,
    getErrorHandler,
    printer
  }: {
    createCloudWatchClient: () => CloudWatchClient;
    createLogsClient: () => CloudWatchLogsClient;
    getErrorHandler: ErrorHandlerFactory;
    printer?: Pick<TuiManager, 'debug'>;
  }) {
    this.#createCloudWatchClient = createCloudWatchClient;
    this.#createLogsClient = createLogsClient;
    this.#getErrorHandler = getErrorHandler;
    this.#printer = printer;
  }

  listLogStreams = async ({
    logGroupName,
    logStreamNamePrefix,
    limit = 50,
    orderBy = 'LastEventTime'
  }: {
    logGroupName: string;
    logStreamNamePrefix?: string;
    limit?: number;
    orderBy?: OrderBy;
  }) => {
    if (limit <= 0) {
      return [];
    }
    const handleError = this.#getErrorHandler(`Failed to get log streams for log group ${logGroupName}.`);
    const result = [];
    let amount = 0;
    let { logStreams, nextToken } = await this.#createLogsClient()
      .send(
        new DescribeLogStreamsCommand({
          descending: true,
          limit: Math.min(limit, 50),
          logGroupName,
          logStreamNamePrefix,
          orderBy
        })
      )
      .catch(handleError);
    result.push(...(logStreams || []));
    amount += logStreams?.length || 0;

    while (nextToken && amount < limit) {
      ({ logStreams, nextToken } = await this.#createLogsClient()
        .send(
          new DescribeLogStreamsCommand({
            descending: true,
            limit: Math.min(limit - amount, 50),
            logGroupName,
            logStreamNamePrefix,
            nextToken,
            orderBy
          })
        )
        .catch(handleError));
      result.push(...(logStreams || []));
      amount += logStreams?.length || 0;
    }

    return result.slice(0, limit);
  };

  getLogEvents = async ({
    startTime,
    logGroupName,
    logStreamNames,
    logStreamPrefix,
    filterPattern
  }: {
    logGroupName: string;
    logStreamNames?: string[];
    logStreamPrefix?: string;
    startTime?: number;
    filterPattern?: string;
  }): Promise<FilteredLogEvent[]> => {
    const handleError = this.#getErrorHandler('Failed to get log events.');
    const params = {
      logGroupName,
      logStreamNames,
      logStreamNamePrefix: logStreamPrefix,
      startTime,
      ...(filterPattern ? { filterPattern } : {})
    };
    const result: FilteredLogEvent[] = [];
    let { events, nextToken } = await this.#createLogsClient()
      .send(new FilterLogEventsCommand(params))
      .catch((error) => {
        if (error instanceof ResourceNotFoundException) {
          this.#printer?.debug(`Error when fetching logs: ${error} (${logGroupName} / ${logStreamNames})`);
          return { events: [] as FilteredLogEvent[], nextToken: undefined };
        }
        return handleError(error);
      });
    result.push(...(events || []));
    while (nextToken) {
      ({ events, nextToken } = await this.#createLogsClient()
        .send(new FilterLogEventsCommand({ ...params, nextToken }))
        .catch(handleError));
      result.push(...(events || []));
    }
    return result;
  };

  getLogGroup = async ({ logGroupName }: { logGroupName: string }) => {
    const { logGroups = [] } = await this.#createLogsClient().send(
      new DescribeLogGroupsCommand({ logGroupNamePrefix: logGroupName })
    );
    return logGroups.find((logGroup) => logGroup.logGroupName === logGroupName);
  };

  createLogGroup = async ({
    logGroupName,
    retentionDays
  }: {
    logGroupName: string;
    retentionDays?: LogRetentionDays;
  }) => {
    await this.#createLogsClient().send(new CreateLogGroupCommand({ logGroupName, tags: { stp: 'stp' } }));
    await wait(500);
    if (retentionDays) {
      await this.#createLogsClient().send(
        new PutRetentionPolicyCommand({ logGroupName, retentionInDays: retentionDays })
      );
    }
    return this.getLogGroup({ logGroupName });
  };

  createLogStream = ({ logGroupName, logStreamName }: { logGroupName: string; logStreamName: string }) => {
    const handleError = this.#getErrorHandler('Failed to create log stream.');
    return this.#createLogsClient()
      .send(new CreateLogStreamCommand({ logGroupName, logStreamName }))
      .catch(handleError);
  };

  putLogEvents = ({
    logGroupName,
    logStreamName,
    logEvents
  }: {
    logGroupName: string;
    logStreamName: string;
    logEvents: InputLogEvent[];
  }) => {
    const handleError = this.#getErrorHandler('Failed to send log events.');
    return this.#createLogsClient()
      .send(new PutLogEventsCommand({ logEvents, logGroupName, logStreamName }))
      .catch(handleError);
  };

  runLogsInsightsQuery = async ({
    logGroupName,
    query,
    startTime,
    endTime,
    timeoutMs = DEFAULT_LOGS_INSIGHTS_TIMEOUT_MS,
    pollIntervalMs = DEFAULT_LOGS_INSIGHTS_POLL_INTERVAL_MS
  }: {
    logGroupName: string;
    query: string;
    startTime: Date;
    endTime: Date;
    timeoutMs?: number;
    pollIntervalMs?: number;
  }): Promise<{ results: Record<string, string>[] }> => {
    const handleError = this.#getErrorHandler('Failed to run Logs Insights query.');
    const { queryId } = await this.#createLogsClient()
      .send(
        new StartQueryCommand({
          endTime: Math.floor(endTime.getTime() / 1000),
          logGroupName,
          queryString: query,
          startTime: Math.floor(startTime.getTime() / 1000)
        })
      )
      .catch(handleError);
    if (!queryId) {
      throw new CliError({
        category: 'AWS',
        code: 'LOGS_INSIGHTS_QUERY_ID_MISSING',
        message: 'CloudWatch Logs Insights did not return a query ID.'
      });
    }
    const deadline = Date.now() + Math.max(0, timeoutMs);

    while (true) {
      if (Date.now() >= deadline) {
        await this.#createLogsClient()
          .send(new StopQueryCommand({ queryId }))
          .catch(() => undefined);
        throw new CliError({
          category: 'AWS',
          code: 'LOGS_INSIGHTS_QUERY_TIMEOUT',
          message: `CloudWatch Logs Insights query did not finish within ${timeoutMs} ms.`
        });
      }
      await wait(Math.max(0, pollIntervalMs));
      const response = await this.#createLogsClient().send(new GetQueryResultsCommand({ queryId })).catch(handleError);
      if (response.status === 'Complete') {
        const results = (response.results || []).map((row) =>
          row.reduce(
            (record, field) => {
              if (field.field && field.value) record[field.field] = field.value;
              return record;
            },
            {} as Record<string, string>
          )
        );
        return { results };
      }

      if (response.status === 'Running' || response.status === 'Scheduled') {
        continue;
      }

      throw new CliError({
        category: 'AWS',
        code: 'LOGS_INSIGHTS_QUERY_TERMINAL_STATUS',
        message: response.status
          ? `CloudWatch Logs Insights query ended with status \`${response.status}\`.`
          : 'CloudWatch Logs Insights query returned no status.'
      });
    }
  };

  describeAlarms = async ({ alarmNamePrefix, stateValue }: { alarmNamePrefix?: string; stateValue?: StateValue }) => {
    const handleError = this.#getErrorHandler('Failed to describe CloudWatch alarms.');
    const response = await this.#createCloudWatchClient()
      .send(
        new DescribeAlarmsCommand({
          MaxRecords: 100,
          ...(alarmNamePrefix ? { AlarmNamePrefix: alarmNamePrefix } : {}),
          ...(stateValue ? { StateValue: stateValue } : {})
        })
      )
      .catch(handleError);
    return response.MetricAlarms || [];
  };

  getMetricData = async ({
    metricQueries,
    startTime,
    endTime
  }: {
    metricQueries: MetricDataQuery[];
    startTime: Date;
    endTime: Date;
  }): Promise<MetricDataResult[]> => {
    const handleError = this.#getErrorHandler('Failed to get CloudWatch metric data.');
    const response = await this.#createCloudWatchClient()
      .send(new GetMetricDataCommand({ EndTime: endTime, MetricDataQueries: metricQueries, StartTime: startTime }))
      .catch(handleError);
    return response.MetricDataResults || [];
  };
}
