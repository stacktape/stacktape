/**
 * #### Message queue for decoupling services. Producers send messages, consumers process them at their own pace.
 *
 * ---
 *
 * Fully managed, serverless, pay-per-message. Use for background processing, task queues, or buffering between services.
 */
interface SqsQueue {
  type: 'sqs-queue';
  properties?: SqsQueueProps;
  overrides?: ResourceOverrides;
}

interface SqsQueueProps {
  /**
   * #### Delay (in seconds) before new messages become visible to consumers. Range: 0–900.
   *
   * ---
   *
   * Useful for introducing a buffer, e.g., waiting for related data to be available before processing.
   *
   * @default 0
   */
  delayMessagesSecond?: number;
  /**
   * #### Maximum message size in bytes. Range: 1,024 (1 KB) to 262,144 (256 KB).
   *
   * ---
   *
   * Messages larger than this limit are rejected. For payloads over 256 KB, store the data in S3 and send the reference.
   *
   * @default 262144
   */
  maxMessageSizeBytes?: number;
  /**
   * #### How long unprocessed messages stay in the queue before being deleted. Range: 60s to 1,209,600s (14 days).
   *
   * ---
   *
   * Default is 4 days (345,600s). Increase if consumers might fall behind or be temporarily offline.
   *
   * @default 345600
   */
  messageRetentionPeriodSeconds?: number;
  /**
   * #### Seconds the queue waits for messages before returning an empty response. Range: 0–20.
   *
   * ---
   *
   * Set to `1`–`20` to enable long polling, which reduces costs by making fewer API calls.
   * With short polling (`0`), the consumer gets an immediate (often empty) response and must poll again.
   *
   * Recommended: `20` for most workloads — it's the most cost-effective.
   *
   * @default 0
   */
  longPollingSeconds?: number;
  /**
   * #### How long (seconds) a message is hidden from other consumers after being received. Range: 0–43,200 (12 hours).
   *
   * ---
   *
   * After a consumer picks up a message, it must delete it before this timeout expires — otherwise it becomes
   * visible again and can be processed by another consumer (duplicate processing).
   *
   * Set this higher than your expected processing time. If your tasks take 2 minutes, use at least 150 seconds.
   *
   * @default 30
   */
  visibilityTimeoutSeconds?: number;
  /**
   * #### Creates a FIFO queue that guarantees message order and exactly-once delivery.
   *
   * ---
   *
   * Use when processing order matters (e.g., financial transactions, sequential workflows).
   * FIFO queues have lower throughput (~300 msg/s without batching, ~3,000 with) compared to standard queues.
   *
   * Requires either `contentBasedDeduplication: true` or a `MessageDeduplicationId` on each message.
   *
   * @default false
   */
  fifoEnabled?: boolean;
  /**
   * #### Enables high-throughput mode for FIFO queues (up to ~70,000 msg/s per queue).
   *
   * ---
   *
   * Messages are partitioned by `MessageGroupId` — order is guaranteed within each group but not across groups.
   * Requires `fifoEnabled: true`.
   */
  fifoHighThroughput?: boolean;
  /**
   * #### Automatically deduplicates messages based on their content (SHA-256 hash of the body).
   *
   * ---
   *
   * Within the 5-minute deduplication window, identical messages are delivered only once.
   * Saves you from having to generate a unique `MessageDeduplicationId` for each message.
   * Requires `fifoEnabled: true`.
   */
  contentBasedDeduplication?: boolean;
  /**
   * #### Moves messages that fail processing too many times to a dead-letter queue for inspection.
   *
   * ---
   *
   * After `maxReceiveCount` failed attempts, the message is automatically moved to a separate queue
   * so you can investigate and reprocess it. Prevents poison messages from blocking the queue.
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
   * #### Custom access-control statements added to the queue's resource policy.
   *
   * ---
   *
   * These are merged with policies Stacktape auto-generates. Use to grant cross-account access or allow
   * specific AWS services (e.g., SNS) to send messages to this queue.
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
   * #### `Allow` or `Deny` access for the specified actions and principal.
   */
  Effect: string;
  /**
   * #### SQS actions to allow or deny. E.g., `["sqs:SendMessage"]` or `["sqs:*"]`.
   */
  Action: string[];
  /**
   * #### Optional conditions for when this statement applies (e.g., restrict by source ARN or IP range).
   */
  Condition?: any;
  /**
   * #### Who gets access: AWS account ID, IAM ARN, or `"*"` for everyone. E.g., `{ "Service": "sns.amazonaws.com" }`.
   */
  Principal: any;
}

/**
 * #### Routes events from an EventBridge event bus to this queue when they match a specified pattern.
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
   * #### Message group ID for FIFO queues. Required when the target queue has `fifoEnabled: true`.
   *
   * ---
   *
   * Messages in the same group are processed in strict order. Different groups can be processed in parallel.
   */
  messageGroupId?: string;
}

interface SqsQueueRedrivePolicy {
  /**
   * #### Name of another `sqs-queue` in your config to use as the dead-letter queue.
   */
  targetSqsQueueName?: string;
  /**
   * #### ARN of an external SQS queue to use as the dead-letter queue. Use when the DLQ is in another stack or account.
   */
  targetSqsQueueArn?: string;
  /**
   * #### How many times a message can be received (and fail) before being moved to the dead-letter queue.
   *
   * ---
   *
   * A typical starting value is `3`–`5`. Set lower for fast-failing workloads, higher for retryable transient errors.
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
