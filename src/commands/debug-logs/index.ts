import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { isAgentMode } from '../_utils/agent-mode';
import { loadUserCredentials } from '../_utils/initialization';
import { getLogGroupInfoForStacktapeResource } from '../_utils/logs';

export const commandDebugLogs = async () => {
  await loadUserCredentials();
  await globalStateManager.loadTargetStackInfo();
  await configManager.init({ configRequired: true });

  await stackManager.init({
    stackName: globalStateManager.targetStack.stackName,
    commandModifiesStack: false,
    commandRequiresDeployedStack: true
  });

  const args = globalStateManager.args as StacktapeCliArgs & {
    query?: string;
    limit?: number;
    endTime?: string;
  };
  const { resourceName, raw, filter, container, query, limit = 100 } = args;

  if (!resourceName) {
    throw new ExpectedError('CLI', 'Missing required flag: --resourceName', 'Provide --resourceName <name>');
  }

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
    resourceName,
    containerName: container
  }).PhysicalResourceId;

  // Use CloudWatch Logs Insights query if provided
  if (query) {
    const result = await awsSdkManager.runLogsInsightsQuery({
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

  // Standard log fetching
  const logStreams = await awsSdkManager.getLogStreams({ logGroupName });

  if (!logStreams.length) {
    if (isAgentMode()) {
      tuiManager.info(JSON.stringify({ logGroup: logGroupName, events: [] }, null, 2));
    } else {
      tuiManager.info(`No log streams found for ${logGroupName}.`);
    }
    return null;
  }

  const events = await awsSdkManager.getLogEvents({
    logGroupName,
    logStreamNames: logStreams.map((logStream) => logStream.logStreamName),
    filterPattern: filter,
    startTime: startTime.getTime()
  });

  // Limit events
  const limitedEvents = events.slice(0, limit);

  if (isAgentMode() || raw) {
    const formattedEvents = limitedEvents.map((e) => ({
      timestamp: new Date(e.timestamp).toISOString(),
      message: e.message,
      logStream: e.logStreamName
    }));
    tuiManager.info(
      JSON.stringify(
        {
          logGroup: logGroupName,
          events: formattedEvents
        },
        null,
        2
      )
    );
  } else {
    if (limitedEvents.length === 0) {
      tuiManager.info('No log events found.');
      return null;
    }

    console.info(
      limitedEvents
        .map(
          (event) =>
            `${tuiManager.colorize('yellow', new Date(event.timestamp).toLocaleString())}\t${event.logStreamName}\n${event.message}`
        )
        .join('\n')
    );
  }

  return null;
};
