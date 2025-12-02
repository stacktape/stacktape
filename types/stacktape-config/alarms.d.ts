type AlarmUserIntegration = MsTeamsIntegration | SlackIntegration | EmailIntegration;

interface AlarmDefinitionBase {
  /**
   * #### Specifies the time window for evaluating the metric to determine if the alarm should be triggered.
   *
   * ---
   *
   * Defines the duration and frequency of metric evaluation.
   */
  evaluation?: AlarmEvaluation;
  /**
   * #### Defines where to send notifications when the alarm is triggered.
   *
   * ---
   *
   * You can specify a list of integrations, such as Slack, MS Teams, or email.
   */
  notificationTargets?: AlarmUserIntegration[];
  /**
   * #### Custom description for the alarm
   * ---
   * - If custom description is specified, it is used in the alarm notification message
   * - Custom description is also used in the alarm description in the AWS console (If not provided, Stacktape generates default description.)
   */
  description?: string;
}

interface AlarmDefinition extends AlarmDefinitionBase {
  /**
   * #### A descriptive name for the alarm.
   *
   * ---
   *
   * For example, `lambda-error-notifier`.
   */
  name: string;
  /**
   * #### Defines the specific metric and threshold that will trigger the alarm.
   *
   * ---
   *
   * - `type` specifies the metric to monitor (e.g., CPU utilization, error rate).
   * - `properties` define the resource to monitor, the threshold, and other optional settings.
   * - New trigger types are added regularly. If you need a specific one, feel free to open an [issue on GitHub](https://github.com/stacktape/stacktape/issues).
   */
  trigger: AlarmTrigger;
  /**
   * #### An optional list of service names to which this alarm applies.
   *
   * ---
   *
   * If you provide a list of service names, this alarm will only be active for those services. If omitted, it applies to all services.
   */
  forServices?: string[];
  /**
   * #### An optional list of stage names to which this alarm applies.
   *
   * ---
   *
   * If you provide a list of stage names (e.g., `production`, `staging`), this alarm will only be active for those stages. If omitted, it applies to all stages.
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
   * #### The duration (in seconds) of a single evaluation period.
   *
   * ---
   *
   * This value determines how long to collect data for a single data point. It must be a multiple of 60.
   *
   * @default 60
   */
  period?: number;
  /**
   * #### The number of most recent periods to evaluate.
   *
   * ---
   *
   * The alarm is triggered only if the condition is met for a specified number of these periods (`breachedPeriods`).
   * This helps prevent alarms from being triggered by temporary spikes.
   *
   * For example, a sudden, short-lived spike in CPU utilization might not be a problem.
   * However, if the CPU utilization stays high for several consecutive periods, it could indicate an issue that requires attention.
   *
   * @default 1
   */
  evaluationPeriods?: number;
  /**
   * #### The number of periods (within `evaluationPeriods`) that must breach the threshold to trigger the alarm.
   *
   * ---
   *
   * This allows you to configure the alarm's sensitivity. For example, if you set `evaluationPeriods` to 5 and `breachedPeriods` to 3, the alarm will only trigger if the metric exceeds the threshold in at least 3 of the 5 most recent periods.
   *
   * This value must be less than or equal to `evaluationPeriods`.
   *
   * @default 1
   */
  breachedPeriods?: number;
}

interface SqsQueueNotEmptyTrigger {
  /**
   * #### Type of the trigger.
   *
   * ---
   *
   * Triggers an alarm if the SQS queue is not empty.
   * A queue is considered empty if all of the following metrics are 0 for the evaluation period:
   *   - `ApproximateNumberOfMessagesVisible`
   *   - `ApproximateNumberOfMessagesNotVisible`
   *   - `NumberOfMessagesReceived`
   *   - `NumberOfMessagesSent`
   */
  type: 'sqs-queue-not-empty';
}

interface SqsQueueReceivedMessagesCountTrigger {
  type: 'sqs-queue-received-messages-count';
  properties: SqsQueueReceivedMessagesCountTriggerProps;
}

interface SqsQueueReceivedMessagesCountTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### The threshold for the number of messages received.
   *
   * ---
   *
   * Triggers an alarm when the number of messages received from an SQS queue crosses the defined threshold.
   * By default, it's triggered if the **average** number of received messages (based on the `NumberOfMessagesReceived` metric) over the evaluation period is **greater than** the `thresholdCount`.
   * You can customize the behavior using the `statistic` and `comparisonOperator` properties.
   */
  thresholdCount: number;
}

interface ApplicationLoadBalancerErrorRateTrigger {
  type: 'application-load-balancer-error-rate';
  properties: ApplicationLoadBalancerErrorRateTriggerProps;
}

interface ApplicationLoadBalancerErrorRateTriggerProps extends TriggerWithCustomComparison {
  /**
   * #### The error rate percentage that triggers the alarm.
   *
   * ---
   *
   * The error rate is the percentage of total requests that result in a 4xx or 5xx HTTP status code.
   * For example, a value of 5 means the alarm will trigger if more than 5% of requests result in an error.
   */
  thresholdPercent: number;
}

interface ApplicationLoadBalancerUnhealthyTargetsTrigger {
  type: 'application-load-balancer-unhealthy-targets';
  properties: ApplicationLoadBalancerUnhealthyTargetsTriggerProps;
}

interface ApplicationLoadBalancerUnhealthyTargetsTriggerProps extends TriggerWithCustomComparison {
  /**
   * #### The percentage of unhealthy targets that triggers the alarm.
   *
   * ---
   *
   * An Application Load Balancer routes traffic to multiple targets (e.g., containers). This alarm triggers if the percentage of unhealthy targets exceeds the specified threshold.
   * If the load balancer has multiple target groups, the alarm will trigger if *any* of them breach the threshold.
   */
  thresholdPercent: number;
  /**
   * #### Limits alarm to monitor health of only the specified target container services
   * ---
   * - By specifying this property, only the containers of target container services that are specified are monitored for health.
   * - Only services that are actually targeted by the load balancer can be part of the list.
   * - If not specified, all targeted container services are monitored.
   */
  onlyIncludeTargets?: string[];
}

interface HttpApiGatewayErrorRateTrigger {
  type: 'http-api-gateway-error-rate';
  properties: HttpApiGatewayErrorRateTriggerProps;
}

interface HttpApiGatewayErrorRateTriggerProps extends TriggerWithCustomComparison {
  /**
   * #### The error rate percentage that triggers the alarm.
   *
   * ---
   *
   * The error rate is the percentage of total requests that result in a 4xx or 5xx HTTP status code.
   * For example, a value of 5 means the alarm will trigger if more than 5% of requests result in an error.
   */
  thresholdPercent: number;
}

interface HttpApiGatewayLatencyTrigger {
  type: 'http-api-gateway-latency';
  properties: HttpApiGatewayLatencyTriggerProps;
}

interface HttpApiGatewayLatencyTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### The latency in milliseconds that triggers the alarm.
   *
   * ---
   *
   * Latency is the time from when API Gateway receives a request to when it sends a response.
   * By default, the alarm triggers if the **average** latency over the evaluation period is **greater than** the `thresholdMilliseconds`.
   * You can customize the behavior using the `statistic` and `comparisonOperator` properties.
   */
  thresholdMilliseconds: number;
}

interface LambdaErrorRateTrigger {
  type: 'lambda-error-rate';
  properties: LambdaErrorRateTriggerProps;
}

interface LambdaErrorRateTriggerProps extends TriggerWithCustomComparison {
  /**
   * #### The error rate percentage that triggers the alarm.
   *
   * ---
   *
   * The error rate is the percentage of Lambda invocations that result in an error.
   * For example, a value of 1 means the alarm will trigger if more than 1% of invocations fail.
   */
  thresholdPercent: number;
}

interface LambdaDurationTrigger {
  type: 'lambda-duration';
  properties: LambdaDurationTriggerProps;
}

interface LambdaDurationTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### The execution duration in milliseconds that triggers the alarm.
   *
   * ---
   *
   * By default, the alarm triggers if the **average** execution time over the evaluation period is **greater than** the `thresholdMilliseconds`.
   * You can customize the behavior using the `statistic` and `comparisonOperator` properties.
   */
  thresholdMilliseconds: number;
}

interface RelationalDatabaseFreeMemoryTrigger {
  type: 'database-free-memory';
  properties: RelationalDatabaseFreeMemoryTriggerProps;
}

interface RelationalDatabaseFreeMemoryTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### The minimum amount of free memory (in MB) before the alarm is triggered.
   *
   * ---
   *
   * By default, the alarm triggers if the **average** available free memory over the evaluation period is **lower than** the `thresholdMB`.
   * You can customize the behavior using the `statistic` and `comparisonOperator` properties.
   */
  thresholdMB: number;
}

interface RelationalDatabaseReadLatencyTrigger {
  type: 'database-read-latency';
  properties: RelationalDatabaseReadLatencyTriggerProps;
}

interface RelationalDatabaseReadLatencyTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### The read latency in seconds that triggers the alarm.
   *
   * ---
   *
   * Read latency is the average amount of time taken for a read I/O operation.
   * By default, the alarm triggers if the **average** read latency over the evaluation period is **greater than** the `thresholdSeconds`.
   * You can customize the behavior using the `statistic` and `comparisonOperator` properties.
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
   * #### The write latency in seconds that triggers the alarm.
   *
   * ---
   *
   * Write latency is the average amount of time taken for a write I/O operation.
   * By default, the alarm triggers if the **average** write latency over the evaluation period is **greater than** the `thresholdSeconds`.
   * You can customize the behavior using the `statistic` and `comparisonOperator` properties.
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
   * #### The CPU utilization percentage that triggers the alarm.
   *
   * ---
   *
   * By default, the alarm triggers if the **average** CPU utilization over the evaluation period is **greater than** the `thresholdPercent`.
   * You can customize the behavior using the `statistic` and `comparisonOperator` properties.
   */
  thresholdPercent: number;
}

interface RelationalDatabaseFreeStorageTrigger {
  type: 'database-free-storage';
  properties: RelationalDatabaseFreeStorageTriggerProps;
}

interface RelationalDatabaseFreeStorageTriggerProps extends TriggerWithCustomComparison, TriggerWithCustomStatFunction {
  /**
   * #### The minimum amount of free storage (in MB) before the alarm is triggered.
   *
   * ---
   *
   * By default, the alarm triggers if the **minimum** available storage space over the evaluation period is **lower than** the `thresholdMB`.
   * You can customize the behavior using the `statistic` and `comparisonOperator` properties.
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
   * #### The number of database connections that triggers the alarm.
   *
   * ---
   *
   * By default, the alarm triggers if the **average** number of database connections over the evaluation period is **greater than** the `thresholdCount`.
   * You can customize the behavior using the `statistic` and `comparisonOperator` properties.
   */
  thresholdCount: number;
}

interface TriggerWithCustomStatFunction {
  /**
   * #### The statistic to apply to the metric data points.
   *
   * ---
   *
   * Supported statistics:
   * - **avg**: The average of the metric values.
   * - **sum**: The sum of the metric values.
   * - **p90**: The 90th percentile. 90% of the data points are lower than this value.
   * - **p95**: The 95th percentile. 95% of the data points are lower than this value.
   * - **p99**: The 99th percentile. 99% of the data points are lower than this value.
   * - **min**: The lowest value from the data points.
   * - **max**: The highest value from the data points.
   *
   * @default avg
   */
  statistic?: StatisticFunction;
}
interface TriggerWithCustomComparison {
  /**
   * #### The arithmetic operation to use when comparing the specified statistic and threshold.
   *
   * ---
   *
   * Supported operators:
   * - `GreaterThanThreshold`
   * - `GreaterThanOrEqualToThreshold`
   * - `LessThanThreshold`
   * - `LessThanOrEqualToThreshold`
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
