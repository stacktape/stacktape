import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { loadUserCredentials } from '../_utils/initialization';
import { getLogGroupInfoForStacktapeResource } from '../_utils/logs';

// @todo logs command now only works for lambda functions and is also kind of shitty
export const commandLogs = async (): Promise<LogsReturnValue> => {
  await loadUserCredentials();
  await globalStateManager.loadTargetStackInfo();
  await configManager.init({ configRequired: true });

  await stackManager.init({
    stackName: globalStateManager.targetStack.stackName,
    commandModifiesStack: false,
    commandRequiresDeployedStack: true
  });

  const { resourceName, raw, filter, container } = globalStateManager.args;

  // default is 1 hour ago
  const startTime = globalStateManager.args.startTime
    ? new Date(globalStateManager.args.startTime).getTime()
    : new Date().setHours(new Date().getHours() - 1);

  const logGroupName = getLogGroupInfoForStacktapeResource({
    resourceName,
    containerName: container
  }).PhysicalResourceId;

  const logStreams = await awsSdkManager.getLogStreams({ logGroupName });

  if (!logStreams.length) {
    tuiManager.info(`No log streams found for ${logGroupName}.`);
    return;
  }

  const events = await awsSdkManager.getLogEvents({
    logGroupName,
    logStreamNames: logStreams.map((logStream) => logStream.logStreamName),
    filterPattern: filter,
    startTime
  });

  if (raw) {
    console.info(events);
  } else {
    console.info(
      events
        .map(
          (event) =>
            `${tuiManager.colorize('yellow', new Date(event.timestamp).toLocaleString())}\t${event.logStreamName}\n${
              event.message
            }`
        )
        .join('\n')
    );
  }

  // @todo-return-value
  return null;
};
