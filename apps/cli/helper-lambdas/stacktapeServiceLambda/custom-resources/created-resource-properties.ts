/**
 * The CloudFormation properties the service Lambda applies when it creates an SQS queue, a queue policy or an
 * EventBridge rule in place of `AWS::SQS::Queue`, `AWS::SQS::QueuePolicy` or `AWS::Events::Rule`. The template decides the form from these lists: a resource with any
 * other property keeps the CloudFormation form, so no property is silently dropped.
 */

export const STP_SQS_QUEUE_TYPE = 'Custom::StpSqsQueue';
export const STP_EVENTS_RULE_TYPE = 'Custom::StpEventsRule';
export const STP_SQS_QUEUE_POLICY_TYPE = 'Custom::StpSqsQueuePolicy';

/** `AWS::SQS::Queue` properties that are queue attributes of the same name. */
export const SQS_QUEUE_ATTRIBUTE_PROPERTIES = [
  'ContentBasedDeduplication',
  'DeduplicationScope',
  'DelaySeconds',
  'FifoQueue',
  'FifoThroughputLimit',
  'KmsDataKeyReusePeriodSeconds',
  'KmsMasterKeyId',
  'MaximumMessageSize',
  'MessageRetentionPeriod',
  'ReceiveMessageWaitTimeSeconds',
  'RedriveAllowPolicy',
  'RedrivePolicy',
  'SqsManagedSseEnabled',
  'VisibilityTimeout'
] as const;

export const SUPPORTED_SQS_QUEUE_PROPERTIES: ReadonlySet<string> = new Set([
  ...SQS_QUEUE_ATTRIBUTE_PROPERTIES,
  'QueueName',
  'Tags'
]);

/** `AWS::Events::Rule` properties the service Lambda applies, besides the `Name` and `Tags` the stack adds. */
export const SUPPORTED_EVENTS_RULE_PROPERTIES: ReadonlySet<string> = new Set([
  'Description',
  'EventBusName',
  'EventPattern',
  'ScheduleExpression',
  'State',
  'Targets'
]);

/**
 * Target properties the service Lambda applies. Targets that need a role (`RoleArn`, ECS, Batch, Kinesis and other
 * parameters) keep the CloudFormation form: the service Lambda would need `iam:PassRole` for them.
 */
export const SUPPORTED_EVENTS_RULE_TARGET_PROPERTIES: ReadonlySet<string> = new Set([
  'Arn',
  'Id',
  'Input',
  'InputPath',
  'InputTransformer',
  'DeadLetterConfig',
  'RetryPolicy',
  'SqsParameters'
]);

/** `AWS::SQS::QueuePolicy` properties the service Lambda applies. */
export const SUPPORTED_SQS_QUEUE_POLICY_PROPERTIES: ReadonlySet<string> = new Set(['PolicyDocument', 'Queues']);
