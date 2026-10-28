import type { StacktapeCliArgs } from 'src/config/cli/types';
import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { CliError } from '@utils/errors';
import { LambdaCloudwatchLogPrinter } from '@utils/cloudwatch-logs';
import { createLogPollScheduler } from '@utils/cloudwatch-log-poller';
import { isAgentMode } from '../_utils/agent-mode';
import { printFormattedLogs } from '../_utils/debug-formatters';
import {
  getConfigManagerContext,
  getStackContext,
  loadTargetStackContext,
  loadUserCredentials
} from '../_utils/initialization';
import { getLogGroupInfoForStacktapeResource } from '../_utils/logs';
import { buildInfrequentAccessSnapshotQuery, mapInsightsRowsToLogEvents } from './infrequent-access';

const toLogEventsOutput = ({
  events,
  logGroupName
}: {
  events: { timestamp?: number; message?: string; logStreamName?: string }[];
  logGroupName: string;
}) => ({
  logGroup: logGroupName,
  events: events.map((event) => ({
    timestamp: event.timestamp ? new Date(event.timestamp).toISOString() : null,
    message: event.message,
    logStream: event.logStreamName
  }))
});

const printLogEvents = ({
  events,
  logGroupName,
  raw
}: {
  events: { timestamp?: number; message?: string; logStreamName?: string }[];
  logGroupName: string;
  raw?: boolean;
}) => {
  if (isAgentMode() || raw) {
    tuiManager.info(JSON.stringify(toLogEventsOutput({ events, logGroupName }), null, 2));
  } else {
    printFormattedLogs(events, logGroupName);
  }
};

export const commandLogs = async () => {
  const args = Object.freeze({ ...globalStateManager.args }) as Readonly<
    StacktapeCliArgs & {
      query?: string;
      limit?: number;
      endTime?: string;
      follow?: boolean;
    }
  >;

  await loadUserCredentials();
  await loadTargetStackContext();
  const stackContext = getStackContext();
  await configManager.init({ configRequired: true, context: getConfigManagerContext(stackContext) });

  await stackManager.init({
    stackName: stackContext.stackName,
    commandModifiesStack: false,
    commandRequiresDeployedStack: true
  });

  const { resourceName, raw, filter, container, query, limit = 100, follow } = args;

  // Parse time range
  const endTime = args.endTime ? new Date(args.endTime) : new Date();
  let startTime: Date;
  if (args.startTime) {
    // Support relative time like "1h", "30m", "1d"
    const match = String(args.startTime).match(/^(\d+)([hmds])$/);
    if (match) {
      const [, value, unit] = match;
      const ms = { h: 3600000, m: 60000, d: 86400000, s: 1000 }[unit] || 3600000;
      startTime = new Date(endTime.getTime() - parseInt(value) * ms);
    } else {
      startTime = new Date(args.startTime);
    }
  } else {
    startTime = new Date(endTime.getTime() - 3600000); // Default: 1 hour ago
  }

  const logGroupName = getLogGroupInfoForStacktapeResource({
    stackName: stackContext.stackName,
    stackResources: stackManager.existingStackResources,
    resourceName,
    containerName: container
  }).PhysicalResourceId;

  // Use CloudWatch Logs Insights query if provided
  if (query) {
    const result = await awsSdkManager.observability.runLogsInsightsQuery({
      logGroupName,
      query,
      startTime,
      endTime
    });

    if (isAgentMode()) {
      tuiManager.info(
        JSON.stringify(
          {
            logGroup: logGroupName,
            query,
            results: result.results
          },
          null,
          2
        )
      );
    } else {
      if (result.results.length === 0) {
        tuiManager.info('No results found.');
        return null;
      }
      tuiManager.info(`Found ${result.results.length} result(s):\n`);
      for (const row of result.results) {
        const timestamp = row['@timestamp'] || '';
        const message = row['@message'] || JSON.stringify(row);
        tuiManager.info(`${tuiManager.colorize('yellow', timestamp)} ${message}`);
      }
    }
    return null;
  }

  const logGroup = await awsSdkManager.observability.getLogGroup({ logGroupName });
  if (logGroup?.logGroupClass === 'INFREQUENT_ACCESS') {
    if (filter) {
      throw new CliError({
        category: 'CLI',
        code: 'CLI_LOG_FILTER_UNSUPPORTED_FOR_INFREQUENT_ACCESS',
        message: '`--filter` is not supported for an Infrequent Access log group.',
        hints: [
          'Use a Logs Insights query instead, for example: `--query "fields @timestamp, @message | filter @message like /error/ | sort @timestamp desc"`.',
          'CloudWatch filter-pattern syntax and Logs Insights query syntax have different semantics, so Stacktape does not translate them automatically.'
        ]
      });
    }

    if (tuiManager.mode === 'tty') {
      tuiManager.info('This log group uses Infrequent Access, so live tail is unavailable. Showing a recent snapshot.');
    }
    const result = await awsSdkManager.observability.runLogsInsightsQuery({
      logGroupName,
      query: buildInfrequentAccessSnapshotQuery(limit),
      startTime,
      endTime
    });
    printLogEvents({
      events: mapInsightsRowsToLogEvents(result.results),
      logGroupName,
      raw
    });
    return null;
  }

  // A terminal follows by default. Piped or redirected output, CI and agents get the events once, so
  // `stacktape logs ... | grep` ends, unless `--follow` asks to keep going.
  const shouldFollow = follow ?? (tuiManager.mode === 'tty' && !raw);
  if (shouldFollow && raw) {
    throw new CliError({
      category: 'CLI',
      code: 'CLI_LOG_FOLLOW_RAW_UNSUPPORTED',
      message: '`--raw` prints the events once as one JSON object, so it cannot be combined with `--follow`.',
      hints: ['Leave out `--raw` to follow: without a terminal, each log line is printed as plain text as it arrives.']
    });
  }
  if (shouldFollow) {
    // The newest `limit` events of the window first, as the one-shot read shows them, then the new ones.
    const printer = new LambdaCloudwatchLogPrinter({
      fetchSince: startTime.getTime(),
      logGroupAwsResourceName: logGroupName,
      backlog: { lines: limit, until: endTime.getTime() },
      filterPattern: filter,
      // Without a terminal every line goes straight to stdout, in arrival order. Bun's console drops a write to a closed
      // pipe without an error; `process.stdout.write` reports it, which ends following (below).
      onLog: tuiManager.mode === 'tty' ? undefined : (message) => void process.stdout.write(`${message}\n`),
      // JSONL output (`--agent`, `--json`) keeps one record per line: each batch is a `log` record holding the same
      // object as the one-shot read.
      onEvents:
        tuiManager.mode === 'jsonl'
          ? (events) => tuiManager.info(JSON.stringify(toLogEventsOutput({ events, logGroupName })))
          : undefined
    });
    tuiManager.info(
      `Showing the last ${limit} log lines of ${tuiManager.makeBold(resourceName)}${container ? ` (container ${container})` : ''} and following new ones. ${tuiManager.mode === 'tty' ? 'Press Ctrl+C to stop.' : 'Stop with Ctrl+C or SIGTERM.'}`
    );

    let stopFollowing: () => void;
    const stopped = new Promise<void>((resolve) => {
      stopFollowing = resolve;
    });
    // Throttling slows the polling down instead of ending the command; other errors end it after a few attempts.
    let consecutiveFailures = 0;
    let warnedAboutThrottling = false;
    const scheduler = createLogPollScheduler({
      onThrottled: () => {
        if (warnedAboutThrottling) return;
        warnedAboutThrottling = true;
        tuiManager.warn(
          'CloudWatch is throttling log reads in this AWS account and region; new log lines arrive late.'
        );
      },
      onError: (_name, err) => {
        if (++consecutiveFailures > 3) {
          scheduler.stop();
          void applicationManager.handleError(err);
        }
      }
    });
    scheduler.register(logGroupName, async () => {
      const result = await printer.printLogs();
      consecutiveFailures = 0;
      return result;
    });
    applicationManager.registerCleanUpHook(() => scheduler.stop());
    // A reader that has gone away (`| head -5`, a closed agent shell) fails the next write with EPIPE. That ends
    // following like an interrupt. The listener stays, so the final output to the closed pipe cannot crash the CLI.
    process.stdout.on('error', () => {
      scheduler.stop();
      stopFollowing();
    });
    // Ctrl+C and SIGTERM end the process through applicationManager's exit handler.
    await stopped;
    return null;
  }

  // Standard one-shot log fetching
  const logStreams = await awsSdkManager.observability.listLogStreams({ logGroupName });

  if (!logStreams.length) {
    if (isAgentMode()) {
      tuiManager.info(JSON.stringify({ logGroup: logGroupName, events: [] }, null, 2));
    } else {
      tuiManager.info(`No log streams found for ${logGroupName}.`);
    }
    return null;
  }

  const events = await awsSdkManager.observability.getLogEvents({
    logGroupName,
    logStreamNames: logStreams.map((logStream) => logStream.logStreamName),
    filterPattern: filter,
    startTime: startTime.getTime(),
    // Without --endTime the read stays open-ended, so a laptop clock behind CloudWatch's cannot hide the newest lines.
    ...(args.endTime ? { endTime: endTime.getTime() } : {})
  });

  // Events arrive oldest first. Keep the most recent ones, as the Infrequent Access snapshot does.
  const limitedEvents = events.slice(Math.max(0, events.length - limit));

  printLogEvents({ events: limitedEvents, logGroupName, raw });

  return null;
};
