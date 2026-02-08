type AlarmUserIntegration = MsTeamsIntegration | SlackIntegration | EmailIntegration;

interface AlarmDefinitionBase {
  /**
   * #### How long and how often to evaluate the metric before triggering.
   *
   * ---
   *
   * Controls the evaluation window (period), how many periods to look at, and how many must breach
   * the threshold to fire the alarm. Useful for filtering out short spikes.
   */
  evaluation?: AlarmEvaluation;
  /**
   * #### Where to send notifications when the alarm fires — Slack, MS Teams, or email.
   */
  notificationTargets?: AlarmUserIntegration[];
  /**
   * #### Custom alarm description used in notification messages and the AWS console.
   */
  description?: string;
}

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

interface ApplicationLoadBalancerAlarm extends AlarmDefinitionBase {
  trigger: ApplicationLoadBalancerAlarmTrigger;
}

interface HttpApiGatewayAlarm extends AlarmDefinitionBase {
  trigger: HttpApiGatewayAlarmTrigger;
}

interface LambdaAlarm extends AlarmDefinitionBase {
  trigger: LambdaAlarmTrigger;
}

interface RelationalDatabaseAlarm extends AlarmDefinitionBase {
  trigger: RelationalDatabaseAlarmTrigger;
}

interface SqsQueueAlarm extends AlarmDefinitionBase {
  trigger: SqsQueueAlarmTrigger;
}

type ApplicationLoadBalancerAlarmTrigger =
  | ApplicationLoadBalancerErrorRateTrigger
  | ApplicationLoadBalancerUnhealthyTargetsTrigger
  | ApplicationLoadBalancerCustomTrigger;
type SqsQueueAlarmTrigger = SqsQueueReceivedMessagesCountTrigger | SqsQueueNotEmptyTrigger;
type LambdaAlarmTrigger = LambdaErrorRateTrigger | LambdaDurationTrigger;
type HttpApiGatewayAlarmTrigger = HttpApiGatewayErrorRateTrigger | HttpApiGatewayLatencyTrigger;
type RelationalDatabaseAlarmTrigger =
  | RelationalDatabaseReadLatencyTrigger
  | RelationalDatabaseWriteLatencyTrigger
  | RelationalDatabaseCPUUtilizationTrigger
  | RelationalDatabaseFreeStorageTrigger
  | RelationalDatabaseFreeMemoryTrigger
  | RelationalDatabaseConnectionCountTrigger;

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

interface AlarmEvaluation {
  /**
   * #### Duration of one evaluation period in seconds. Must be a multiple of 60.
   *
   * @default 60
   */
  period?: number;
  /**
   * #### How many recent periods to evaluate. Prevents alarms from firing on short spikes.
   *
   * ---
   *
   * Example: set to `5` with `breachedPeriods: 3` — the alarm fires only if the threshold is breached
   * in at least 3 of the last 5 periods.
   *
   * @default 1
   */
  evaluationPeriods?: number;
  /**
   * #### How many periods (within `evaluationPeriods`) must breach the threshold to fire the alarm.
   *
   * ---
   *
   * Must be ≤ `evaluationPeriods`.
   *
   * @default 1
   */
  breachedPeriods?: number;
}

interface SqsQueueNotEmptyTrigger {
  /**
   * #### Fires when the SQS queue has unprocessed messages.
   *
   * ---
   *
   * The queue is considered "not empty" if any of these are non-zero: visible messages,
   * in-flight messages, messages received, or messages sent.
   */
  type: 'sqs-queue-not-empty';
}

interface SqsQueueReceivedMessagesCountTrigger {
  type: 'sqs-queue-received-messages-count';
  properties: SqsQueueReceivedMessagesCountTriggerProps;
}

interface SqsQueueReceivedMessagesCountTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when received message count crosses this threshold.
   *
   * ---
   *
   * Default: fires if **average** messages received per period > `thresholdCount`.
   * Customize with `statistic` and `comparisonOperator`.
   */
  thresholdCount: number;
}

interface ApplicationLoadBalancerErrorRateTrigger {
  type: 'application-load-balancer-error-rate';
  properties: ApplicationLoadBalancerErrorRateTriggerProps;
}

interface ApplicationLoadBalancerErrorRateTriggerProps extends TriggerWithCustomComparison {
  /**
   * #### Fires when 4xx/5xx error rate exceeds this percentage.
   *
   * ---
   *
   * Example: `5` fires the alarm if more than 5% of requests return errors.
   */
  thresholdPercent: number;
}

interface ApplicationLoadBalancerUnhealthyTargetsTrigger {
  type: 'application-load-balancer-unhealthy-targets';
  properties: ApplicationLoadBalancerUnhealthyTargetsTriggerProps;
}

interface ApplicationLoadBalancerUnhealthyTargetsTriggerProps extends TriggerWithCustomComparison {
  /**
   * #### Fires when the percentage of unhealthy targets exceeds this value.
   *
   * ---
   *
   * If the load balancer has multiple target groups, the alarm fires if *any* group breaches the threshold.
   */
  thresholdPercent: number;
  /**
   * #### Only monitor health of these target container services. If omitted, monitors all targets.
   *
   * ---
   *
   * Only services actually targeted by the load balancer can be listed.
   */
  onlyIncludeTargets?: string[];
}

interface HttpApiGatewayErrorRateTrigger {
  type: 'http-api-gateway-error-rate';
  properties: HttpApiGatewayErrorRateTriggerProps;
}

interface HttpApiGatewayErrorRateTriggerProps extends TriggerWithCustomComparison {
  /**
   * #### Fires when 4xx/5xx error rate exceeds this percentage.
   */
  thresholdPercent: number;
}

interface HttpApiGatewayLatencyTrigger {
  type: 'http-api-gateway-latency';
  properties: HttpApiGatewayLatencyTriggerProps;
}

interface HttpApiGatewayLatencyTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when request-to-response latency exceeds this value (ms).
   *
   * ---
   *
   * Default: fires if **average** latency > threshold. Customize with `statistic` and `comparisonOperator`.
   */
  thresholdMilliseconds: number;
}

interface LambdaErrorRateTrigger {
  type: 'lambda-error-rate';
  properties: LambdaErrorRateTriggerProps;
}

interface LambdaErrorRateTriggerProps extends TriggerWithCustomComparison {
  /**
   * #### Fires when the percentage of failed Lambda invocations exceeds this value.
   */
  thresholdPercent: number;
}

interface LambdaDurationTrigger {
  type: 'lambda-duration';
  properties: LambdaDurationTriggerProps;
}

interface LambdaDurationTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when Lambda execution time exceeds this value (ms).
   *
   * ---
   *
   * Default: fires if **average** duration > threshold. Customize with `statistic` and `comparisonOperator`.
   */
  thresholdMilliseconds: number;
}

interface RelationalDatabaseFreeMemoryTrigger {
  type: 'database-free-memory';
  properties: RelationalDatabaseFreeMemoryTriggerProps;
}

interface RelationalDatabaseFreeMemoryTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when free memory drops below this value (MB).
   *
   * ---
   *
   * Default: fires if **average** free memory < threshold. Customize with `statistic` and `comparisonOperator`.
   */
  thresholdMB: number;
}

interface RelationalDatabaseReadLatencyTrigger {
  type: 'database-read-latency';
  properties: RelationalDatabaseReadLatencyTriggerProps;
}

interface RelationalDatabaseReadLatencyTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when average read I/O latency exceeds this value (seconds).
   */
  thresholdSeconds: number;
}

interface RelationalDatabaseWriteLatencyTrigger {
  type: 'database-write-latency';
  properties: RelationalDatabaseWriteLatencyTriggerProps;
}

interface RelationalDatabaseWriteLatencyTriggerProps
  extends TriggerWithCustomComparison,
    TriggerWithCustomStatFunction {
  /**
   * #### Fires when average write I/O latency exceeds this value (seconds).
   */
  thresholdSeconds: number;
}

interface RelationalDatabaseCPUUtilizationTrigger {
  type: 'database-cpu-utilization';
  properties: RelationalDatabaseCPUUtilizationTriggerProps;
}

interface RelationalDatabaseCPUUtilizationTriggerProps
  extends TriggerWithCustomComparison,
    TriggerWithCustomStatFunction {
  /**
   * #### Fires when CPU utilization exceeds this percentage.
   */
  thresholdPercent: number;
}

interface RelationalDatabaseFreeStorageTrigger {
  type: 'database-free-storage';
  properties: RelationalDatabaseFreeStorageTriggerProps;
}

interface RelationalDatabaseFreeStorageTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### Fires when free disk space drops below this value (MB).
   *
   * ---
   *
   * Default: fires if **minimum** free storage < threshold.
   */
  thresholdMB: number;
}

interface RelationalDatabaseConnectionCountTrigger {
  type: 'database-connection-count';
  properties: RelationalDatabaseConnectionCountTriggerProps;
}

interface RelationalDatabaseConnectionCountTriggerProps
  extends TriggerWithCustomComparison,
    TriggerWithCustomStatFunction {
  /**
   * #### Fires when the number of active database connections exceeds this value.
   */
  thresholdCount: number;
}

interface TriggerWithCustomStatFunction {
  /**
   * #### How to aggregate metric values within each period: `avg`, `sum`, `min`, `max`, `p90`, `p95`, `p99`.
   *
   * @default avg
   */
  statistic?: StatisticFunction;
}
interface TriggerWithCustomComparison {
  /**
   * #### How to compare the metric value against the threshold.
   *
   * @default GreaterThanThreshold
   */
  comparisonOperator?: ComparisonOperator;
}

type StatisticFunction = 'avg' | 'p90' | 'p95' | 'p99' | 'min' | 'max' | 'sum';

type ComparisonOperator =
  | 'GreaterThanThreshold'
  | 'GreaterThanOrEqualToThreshold'
  | 'LessThanThreshold'
  | 'LessThanOrEqualToThreshold';

type AlarmNotificationEventRuleInput = {
  description: string;
  time: string;
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
