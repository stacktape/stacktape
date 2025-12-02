/**
 * #### SQS Queue
 *
 * ---
 *
 * A fully managed message queuing service that enables you to decouple and scale microservices, distributed systems, and serverless applications.
 */
interface SqsQueue {
  type: 'sqs-queue';
  properties?: SqsQueueProps;
  overrides?: ResourceOverrides;
}

interface SqsQueueProps {
  /**
   * #### The amount of time that each message delivery is delayed.
   *
   * ---
   *
   * Specifies the time in seconds (0-900) for which the delivery of all messages in the queue is delayed.
   *
   * @default 0
   */
  delayMessagesSecond?: number;
  /**
   * #### The maximum size of a message, in bytes.
   *
   * ---
   *
   * You can specify an integer value from 1,024 bytes (1 KiB) to 262,144 bytes (256 KiB).
   *
   * @default 262144
   */
  maxMessageSizeBytes?: number;
  /**
   * #### The number of seconds that the queue retains a message.
   *
   * ---
   *
   * You can specify an integer value from 60 seconds (1 minute) to 1,209,600 seconds (14 days).
   *
   * @default 345600
   */
  messageRetentionPeriodSeconds?: number;
  /**
   * #### Enables long polling for receiving messages from the queue.
   *
   * ---
   *
   * Long polling reduces the number of empty responses by allowing Amazon SQS to wait until a message is available in the queue before sending a response.
   * This can help reduce the cost of using SQS by minimizing the number of `ReceiveMessage` API calls.
   *
   * This value specifies the duration (in seconds) that the `ReceiveMessage` call waits for a message to arrive.
   * If set to `0` (the default), short polling is used.
   *
   * For more details on the differences between short and long polling, see the [AWS documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html#sqs-short-long-polling-differences).
   *
   * @default 0
   */
  longPollingSeconds?: number;
  /**
   * #### The length of time that a message will be unavailable after it is delivered from the queue.
   *
   * ---
   *
   * When a consumer receives a message, it remains in the queue but is made invisible to other consumers for the duration of the visibility timeout.
   * This prevents the message from being processed multiple times. The consumer is responsible for deleting the message from the queue after it has been successfully processed.
   *
   * The visibility timeout can be set from 0 to 43,200 seconds (12 hours).
   *
   * For more information, see the [AWS documentation on visibility timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html).
   *
   * @default 30
   */
  visibilityTimeoutSeconds?: number;
  /**
   * #### If `true`, creates a FIFO (First-In-First-Out) queue.
   *
   * ---
   *
   * FIFO queues are designed for applications where the order of operations and events is critical and duplicates cannot be tolerated.
   *
   * When using a FIFO queue, each message must have a `MessageDeduplicationId`, or `contentBasedDeduplication` must be enabled.
   *
   * For more information, see the [AWS documentation on FIFO queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html).
   *
   * @default false
   */
  fifoEnabled?: boolean;
  /**
   * #### If `true`, enables high-throughput mode for the FIFO queue.
   *
   * ---
   *
   * High throughput is achieved by partitioning messages based on their `MessageGroupId`.
   * Messages with the same `MessageGroupId` are always processed in order.
   *
   * `fifoEnabled` must be `true` to use this feature.
   *
   * For more information, see the [AWS documentation on high-throughput FIFO queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/high-throughput-fifo.html).
   */
  fifoHighThroughput?: boolean;
  /**
   * #### If `true`, enables content-based deduplication for the FIFO queue.
   *
   * ---
   *
   * During the deduplication interval, the queue treats messages with the same content as duplicates and delivers only one copy.
   * Deduplication is based on the `MessageDeduplicationId`. If you do not provide one, Amazon SQS will generate a SHA-256 hash of the message body to use as the `MessageDeduplicationId`.
   *
   * `fifoEnabled` must be `true` to use this feature.
   */
  contentBasedDeduplication?: boolean;
  /**
   * #### Configures a redrive policy for automatically moving messages that fail processing to a dead-letter queue.
   *
   * ---
   *
   * Messages are sent to the dead-letter queue after they have been retried `maxReceiveCount` times.
   */
  redrivePolicy?: SqsQueueRedrivePolicy;
  /**
   * #### Additional alarms associated with this resource.
   *
   * ---
   *
   * These alarms will be merged with any alarms configured globally in the [console](https://console.stacktape.com/alarms).
   */
  alarms?: SqsQueueAlarm[];
  /**
   * #### Disables globally configured alarms for this resource.
   *
   * ---
   *
   * Provide a list of alarm names as configured in the [console](https://console.stacktape.com/alarms).
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Adds policy statements to the SQS queue policy.
   *
   * ---
   *
   * These statements are added on top of the policy statements automatically inferred by Stacktape.
   */
  policyStatements?: SqsQueuePolicyStatement[];
  /**
   * #### A list of event sources that trigger message delivery to this queue.
   *
   * ---
   *
   * Currently supports EventBridge event bus integration for delivering events directly to the queue.
   */
  events?: SqsQueueEventBusIntegration[];
}

interface SqsQueuePolicyStatement {
  /**
   * #### The effect of the statement.
   *
   * ---
   *
   * For more details, see the [AWS documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-basic-examples-of-sqs-policies.html).
   */
  Effect: string;
  /**
   * #### A list of actions allowed or denied by the statement.
   *
   * ---
   *
   * Actions must start with `sqs:`.
   * For a list of available actions, see the [AWS documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-api-permissions-reference.html).
   */
  Action: string[];
  /**
   * #### The circumstances under which the statement grants permissions.
   *
   * ---
   *
   * For more details, see the [AWS documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-basic-examples-of-sqs-policies.html).
   */
  Condition?: any;
  /**
   * #### The principal (user, role, or service) to which you are allowing or denying access.
   *
   * ---
   *
   * For more details, see the [AWS documentation](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-basic-examples-of-sqs-policies.html).
   */
  Principal: any;
}

/**
 * #### Delivers messages to an SQS queue when an event matching a specified pattern is received by an event bus.
 */
interface SqsQueueEventBusIntegration {
  type: 'event-bus';
  /**
   * #### Properties of the integration
   */
  properties: SqsQueueEventBusIntegrationProps;
}

interface SqsQueueEventBusIntegrationProps extends EventBusIntegrationProps {
  /**
   * #### The message group ID to use for FIFO queues.
   *
   * ---
   *
   * This parameter is required for FIFO queues and is used to group messages together.
   * Messages with the same message group ID are processed in order within that group.
   * For more information, see the [AWS documentation on FIFO queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html).
   */
  messageGroupId?: string;
}

interface SqsQueueRedrivePolicy {
  /**
   * #### The name of the SQS queue in your Stacktape configuration where failed messages will be sent.
   */
  targetSqsQueueName?: string;
  /**
   * #### The ARN of the SQS queue where failed messages will be sent.
   */
  targetSqsQueueArn?: string;
  /**
   * #### The number of times a message is delivered to the source queue before being moved to the dead-letter queue.
   *
   * ---
   *
   * When the `ReceiveCount` for a message exceeds this value, Amazon SQS moves the message to the target queue.
   */
  maxReceiveCount: number;
}

type StpSqsQueue = SqsQueue['properties'] & {
  name: string;
  type: SqsQueue['type'];
  configParentResourceType: SqsQueue['type'] | NextjsWeb['type'];
  nameChain: string[];
};

type SqsQueueReferencableParam = 'arn' | 'name' | 'url';
