import type {
  AlarmDefinition as ConfigAlarmDefinition,
  AlarmTrigger as ConfigAlarmTrigger,
  ComparisonOperator
} from '@stacktape/config/alarms';

declare global {
interface StpAlarm extends ConfigAlarmDefinition {
  nameChain: string[];
}
type AlarmTriggerType = ConfigAlarmTrigger['type'];
type AlarmNotificationEventRuleInput = {
  sourceEventId: string;
  description: string;
  time: string;
  stateValue: string;
  alarmAwsResourceName: string;
  stackName: string;
  alarmConfig: ConfigAlarmDefinition;
  affectedResource: AlarmAffectedResourceInfo;
  comparisonOperator: ComparisonOperator;
  measuringUnit: string;
  alarmLink: string;
  statFunction: string;
};
type AlarmAffectedResourceInfo = {
  displayName: string;
  link: string;
  logLink?: string;
};
type StpAlarmEnabledResource =
  | StpLambdaFunction
  | StpRelationalDatabase
  | StpHttpApiGateway
  | StpApplicationLoadBalancer
  | StpSqsQueue;
}
