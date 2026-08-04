import type { AlarmDefinition, ComparisonOperator } from '@stacktape/config/alarms';

export const getAlarmDescription = ({
  triggerType,
  threshold,
  comparisonOperator,
  stpResourceName,
  stackName,
  statFunction
}: {
  triggerType: AlarmDefinition['trigger']['type'];
  threshold: number;
  comparisonOperator: ComparisonOperator;
  stpResourceName: string;
  stackName: string;
  statFunction?: string;
}) => {
  return `Monitors${
    statFunction ? ` ${statFunction}` : ''
  } ${triggerType} of ${stpResourceName} in stack ${stackName}. Triggered when ${comparisonOperator} (${threshold}).`;
};

export const getCustomAlarmDescription = ({
  metricName,
  threshold,
  comparisonOperator,
  stpResourceName,
  stackName,
  statFunction
}: {
  metricName: string;
  threshold: number;
  comparisonOperator: ComparisonOperator;
  stpResourceName: string;
  stackName: string;
  statFunction?: string;
}) => {
  return `Monitors${
    statFunction ? ` ${statFunction}` : ''
  } ${metricName} of ${stpResourceName} in stack ${stackName}. Triggered when ${comparisonOperator} (${threshold}).`;
};
