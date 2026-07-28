import type { ApplicationLoadBalancerCustomTrigger } from '@stacktape/config/alarm-metrics';
import type {
  AlarmDefinitionBase,
  ApplicationLoadBalancerErrorRateTrigger,
  ApplicationLoadBalancerUnhealthyTargetsTrigger,
  ComparisonOperator,
  HttpApiGatewayErrorRateTrigger,
  HttpApiGatewayLatencyTrigger,
  LambdaDurationTrigger,
  LambdaErrorRateTrigger,
  RelationalDatabaseCPUUtilizationTrigger,
  RelationalDatabaseConnectionCountTrigger,
  RelationalDatabaseFreeMemoryTrigger,
  RelationalDatabaseFreeStorageTrigger,
  RelationalDatabaseReadLatencyTrigger,
  RelationalDatabaseWriteLatencyTrigger,
  SqsQueueNotEmptyTrigger,
  SqsQueueReceivedMessagesCountTrigger
} from '@stacktape/config/alarms';

declare global {
interface AlarmDefinition extends AlarmDefinitionBase {
  /**
   * #### A unique name for this alarm (e.g., `api-error-rate`, `db-cpu-high`).
   */
  name: string;
  /**
   * #### The metric and threshold that fires this alarm.
   *
   * ---
   *
   * `type` selects what to monitor (error rate, CPU, latency, etc.) and `properties` set the threshold.
   */
  trigger: AlarmTrigger;
  /**
   * #### Only activate this alarm for these services. If omitted, applies to all services.
   */
  forServices?: string[];
  /**
   * #### Only activate this alarm for these stages (e.g., `production`). If omitted, applies to all stages.
   */
  forStages?: string[];
}
interface StpAlarm extends AlarmDefinition {
  nameChain: string[];
}
type AlarmTrigger =
  | LambdaErrorRateTrigger
  | LambdaDurationTrigger
  | RelationalDatabaseReadLatencyTrigger
  | RelationalDatabaseWriteLatencyTrigger
  | RelationalDatabaseCPUUtilizationTrigger
  | RelationalDatabaseFreeStorageTrigger
  | RelationalDatabaseFreeMemoryTrigger
  | RelationalDatabaseConnectionCountTrigger
  | HttpApiGatewayErrorRateTrigger
  | HttpApiGatewayLatencyTrigger
  | ApplicationLoadBalancerErrorRateTrigger
  | ApplicationLoadBalancerUnhealthyTargetsTrigger
  | ApplicationLoadBalancerCustomTrigger
  | SqsQueueReceivedMessagesCountTrigger
  | SqsQueueNotEmptyTrigger;
type AlarmTriggerType = AlarmTrigger['type'];
type AlarmNotificationEventRuleInput = {
  sourceEventId: string;
  description: string;
  time: string;
  stateValue: string;
  alarmAwsResourceName: string;
  stackName: string;
  alarmConfig: AlarmDefinition;
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
