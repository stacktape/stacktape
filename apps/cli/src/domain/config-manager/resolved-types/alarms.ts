import type { StpApplicationLoadBalancer } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { StpHttpApiGateway } from '@domain-services/config-manager/resolved-types/http-api-gateways';
import type { StpRelationalDatabase } from '@domain-services/config-manager/resolved-types/relational-databases';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import type {
  AlarmDefinition as ConfigAlarmDefinition,
  AlarmTrigger as ConfigAlarmTrigger,
  ComparisonOperator
} from '@stacktape/config/alarms';

export interface StpAlarm extends ConfigAlarmDefinition {
  nameChain: string[];
}
export type AlarmTriggerType = ConfigAlarmTrigger['type'];
export type AlarmNotificationEventRuleInput = {
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
export type AlarmAffectedResourceInfo = {
  displayName: string;
  link: string;
  logLink?: string;
};
export type StpAlarmEnabledResource =
  | StpLambdaFunction
  | StpRelationalDatabase
  | StpHttpApiGateway
  | StpApplicationLoadBalancer
  | StpSqsQueue;
