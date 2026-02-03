import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { StateValue } from '@aws-sdk/client-cloudwatch';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { isAgentMode } from '../_utils/agent-mode';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

type AlarmInfo = {
  name: string;
  resource?: string;
  state: string;
  metric: string;
  threshold: string;
  comparison: string;
  lastUpdated: string;
  reason?: string;
};

export const commandDebugAlarms = async () => {
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  const { resourceName, state } = globalStateManager.args as StacktapeCliArgs & { state?: string };
  const stackName = globalStateManager.targetStack.stackName;

  // Convert state string to StateValue enum
  const stateValue = state ? (StateValue[state as keyof typeof StateValue] as StateValue) : undefined;

  // Get all alarms with stack prefix
  const alarms = await awsSdkManager.describeAlarms({
    alarmNamePrefix: stackName,
    stateValue
  });

  // Map alarm names to Stacktape resource names
  const stackResources = deployedStackOverviewManager.stackInfoMap?.resources || {};
  const alarmInfos: AlarmInfo[] = alarms.map((alarm) => {
    // Try to extract resource name from alarm name (format: stackName-resourceName-alarmType)
    const alarmNameWithoutStack = alarm.AlarmName?.replace(`${stackName}-`, '') || '';
    const parts = alarmNameWithoutStack.split('-');
    const stpResourceName = parts.length > 1 ? parts.slice(0, -1).join('-') : parts[0];

    // Verify this is a valid Stacktape resource
    const matchedResource = stackResources[stpResourceName];

    return {
      name: alarm.AlarmName || '',
      resource: matchedResource ? stpResourceName : undefined,
      state: alarm.StateValue || 'UNKNOWN',
      metric: alarm.MetricName || '',
      threshold: String(alarm.Threshold || ''),
      comparison: alarm.ComparisonOperator || '',
      lastUpdated: alarm.StateUpdatedTimestamp?.toISOString() || '',
      ...(alarm.StateReason && alarm.StateValue === StateValue.ALARM && { reason: alarm.StateReason })
    };
  });

  // Filter by resource if specified
  const filteredAlarms = resourceName ? alarmInfos.filter((a) => a.resource === resourceName) : alarmInfos;

  if (isAgentMode()) {
    tuiManager.info(JSON.stringify({ alarms: filteredAlarms }, null, 2));
  } else {
    if (filteredAlarms.length === 0) {
      tuiManager.info('No alarms found.');
      return null;
    }

    tuiManager.info(`Found ${filteredAlarms.length} alarm(s):\n`);
    for (const alarm of filteredAlarms) {
      const stateColor = alarm.state === 'OK' ? 'green' : alarm.state === 'ALARM' ? 'red' : 'yellow';
      const resourceStr = alarm.resource ? ` (${alarm.resource})` : '';
      tuiManager.info(
        `  ${tuiManager.colorize(stateColor, alarm.state)} ${alarm.name}${resourceStr}\n` +
          `    Metric: ${alarm.metric} ${alarm.comparison} ${alarm.threshold}\n${
            alarm.reason ? `    Reason: ${alarm.reason}\n` : ''
          }`
      );
    }
  }

  return null;
};
