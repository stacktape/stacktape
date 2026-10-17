import type { StacktapeCliArgs } from 'src/config/cli/types';
import type { StackInfoMapResource } from '@domain-services/stack-info/types';
import { tuiManager } from '@application-services/tui-manager';
import { StateValue } from '@aws-sdk/client-cloudwatch';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { isAgentMode } from '../_utils/agent-mode';
import { printAlarmsTable } from '../_utils/debug-formatters';
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

export const commandAlarms = async () => {
  const { args, stackContext } = await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  const { resourceName, state } = args as StacktapeCliArgs & { state?: string };
  const stackName = stackContext.stackName;

  // Convert state string to StateValue enum
  const stateValue = state ? (StateValue[state as keyof typeof StateValue] as StateValue) : undefined;

  // A name prefix also matches other stages (`app-dev-john` for `app-dev`), so the stack's own alarm resources decide.
  const alarms = await awsSdkManager.observability.describeAlarms({
    alarmNamePrefix: `${stackName}-`,
    stateValue
  });

  // Alarm names do not encode the resource reliably. Each alarm is a CloudFormation child of its resource or of one of
  // its nested resources, such as a web service's HTTP API Gateway.
  const resourceByAlarmName = new Map<string, string>();
  const collectAlarms = (stpResourceName: string, resource: StackInfoMapResource) => {
    for (const [logicalId, { cloudformationResourceType }] of Object.entries(
      resource.cloudformationChildResources || {}
    )) {
      if (cloudformationResourceType !== 'AWS::CloudWatch::Alarm') continue;
      const alarmName = stackManager.existingStackResources.find(
        ({ LogicalResourceId }) => LogicalResourceId === logicalId
      )?.PhysicalResourceId;
      if (alarmName) resourceByAlarmName.set(alarmName, stpResourceName);
    }
    for (const nested of Object.values(resource._nestedResources || {})) collectAlarms(stpResourceName, nested);
  };
  for (const [stpResourceName, resource] of Object.entries(deployedStackOverviewManager.stackInfoMap?.resources || {}))
    collectAlarms(stpResourceName, resource);
  const stackAlarmNames = new Set(
    stackManager.existingStackResources
      .filter(({ ResourceType }) => ResourceType === 'AWS::CloudWatch::Alarm')
      .map(({ PhysicalResourceId }) => PhysicalResourceId)
  );
  const alarmInfos: AlarmInfo[] = alarms
    .filter(({ AlarmName }) => stackAlarmNames.has(AlarmName))
    .map((alarm) => {
      return {
        name: alarm.AlarmName || '',
        resource: resourceByAlarmName.get(alarm.AlarmName || ''),
        state: alarm.StateValue || 'UNKNOWN',
        metric: alarm.MetricName || '',
        threshold: String(alarm.Threshold ?? ''),
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
    printAlarmsTable(filteredAlarms);
  }

  return null;
};
