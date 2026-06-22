# Sqs Queue

Resource type: `sqs-queue`

## TypeScript Definition

```typescript
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   emailQueue:
   *     type: sqs-queue
   *     properties:
   *       delayMessagesSecond: 30
   *       visibilityTimeoutSeconds: 60
   *   emailWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/email-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: emailQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const emailQueue = new SqsQueue({
   *     delayMessagesSecond: 30,
   *     visibilityTimeoutSeconds: 60
   *   });
   *
   *   const emailWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/email-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'emailQueue' } }]
   *   });
   *
   *   return { resources: { emailQueue, emailWorker } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   uploadEventsQueue:
   *     type: sqs-queue
   *     properties:
   *       maxMessageSizeBytes: 65536
   *       messageRetentionPeriodSeconds: 604800
   *   uploadProcessor:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/upload-processor.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: uploadEventsQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const uploadEventsQueue = new SqsQueue({
   *     maxMessageSizeBytes: 65536,
   *     messageRetentionPeriodSeconds: 604800
   *   });
   *
   *   const uploadProcessor = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/upload-processor.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'uploadEventsQueue' } }]
   *   });
   *
   *   return { resources: { uploadEventsQueue, uploadProcessor } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   reportJobsQueue:
   *     type: sqs-queue
   *     properties:
   *       messageRetentionPeriodSeconds: 1209600
   *       visibilityTimeoutSeconds: 300
   *   reportWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/report-worker.ts
   *       timeout: 240
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: reportJobsQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const reportJobsQueue = new SqsQueue({
   *     messageRetentionPeriodSeconds: 1209600,
   *     visibilityTimeoutSeconds: 300
   *   });
   *
   *   const reportWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/report-worker.ts' }
   *     },
   *     timeout: 240,
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'reportJobsQueue' } }]
   *   });
   *
   *   return { resources: { reportJobsQueue, reportWorker } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   imageJobsQueue:
   *     type: sqs-queue
   *     properties:
   *       longPollingSeconds: 20
   *       visibilityTimeoutSeconds: 120
   *   imageWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/image-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: imageJobsQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const imageJobsQueue = new SqsQueue({
   *     longPollingSeconds: 20,
   *     visibilityTimeoutSeconds: 120
   *   });
   *
   *   const imageWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/image-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'imageJobsQueue' } }]
   *   });
   *
   *   return { resources: { imageJobsQueue, imageWorker } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   videoEncodeQueue:
   *     type: sqs-queue
   *     properties:
   *       visibilityTimeoutSeconds: 900
   *       longPollingSeconds: 20
   *   videoEncoder:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/video-encoder.ts
   *       timeout: 600
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: videoEncodeQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const videoEncodeQueue = new SqsQueue({
   *     visibilityTimeoutSeconds: 900,
   *     longPollingSeconds: 20
   *   });
   *
   *   const videoEncoder = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/video-encoder.ts' }
   *     },
   *     timeout: 600,
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'videoEncodeQueue' } }]
   *   });
   *
   *   return { resources: { videoEncodeQueue, videoEncoder } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   transactionsQueue:
   *     type: sqs-queue
   *     properties:
   *       fifoEnabled: true
   *       contentBasedDeduplication: true
   *       visibilityTimeoutSeconds: 60
   *   transactionProcessor:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/transaction-processor.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: transactionsQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const transactionsQueue = new SqsQueue({
   *     fifoEnabled: true,
   *     contentBasedDeduplication: true,
   *     visibilityTimeoutSeconds: 60
   *   });
   *
   *   const transactionProcessor = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/transaction-processor.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'transactionsQueue' } }]
   *   });
   *
   *   return { resources: { transactionsQueue, transactionProcessor } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   clickstreamQueue:
   *     type: sqs-queue
   *     properties:
   *       fifoEnabled: true
   *       fifoHighThroughput: true
   *       contentBasedDeduplication: true
   *   clickstreamConsumer:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/clickstream-consumer.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: clickstreamQueue
   *             batchSize: 10
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const clickstreamQueue = new SqsQueue({
   *     fifoEnabled: true,
   *     fifoHighThroughput: true,
   *     contentBasedDeduplication: true
   *   });
   *
   *   const clickstreamConsumer = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/clickstream-consumer.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'clickstreamQueue', batchSize: 10 } }]
   *   });
   *
   *   return { resources: { clickstreamQueue, clickstreamConsumer } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   orderEventsQueue:
   *     type: sqs-queue
   *     properties:
   *       fifoEnabled: true
   *       contentBasedDeduplication: true
   *       visibilityTimeoutSeconds: 90
   *   orderEventConsumer:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/order-event-consumer.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: orderEventsQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const orderEventsQueue = new SqsQueue({
   *     fifoEnabled: true,
   *     contentBasedDeduplication: true,
   *     visibilityTimeoutSeconds: 90
   *   });
   *
   *   const orderEventConsumer = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/order-event-consumer.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'orderEventsQueue' } }]
   *   });
   *
   *   return { resources: { orderEventsQueue, orderEventConsumer } };
   * });
   * ```
   */
  contentBasedDeduplication?: boolean;
  /**
   * #### Moves messages that fail processing too many times to a dead-letter queue for inspection.
   *
   * ---
   *
   * After `maxReceiveCount` failed attempts, the message is automatically moved to a separate queue
   * so you can investigate and reprocess it. Prevents poison messages from blocking the queue.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   paymentsDlq:
   *     type: sqs-queue
   *     properties:
   *       messageRetentionPeriodSeconds: 1209600
   *   paymentsQueue:
   *     type: sqs-queue
   *     properties:
   *       redrivePolicy:
   *         targetSqsQueueName: paymentsDlq
   *         maxReceiveCount: 5
   *       visibilityTimeoutSeconds: 60
   *   paymentsWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/payments-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: paymentsQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const paymentsDlq = new SqsQueue({ messageRetentionPeriodSeconds: 1209600 });
   *
   *   const paymentsQueue = new SqsQueue({
   *     redrivePolicy: {
   *       targetSqsQueueName: 'paymentsDlq',
   *       maxReceiveCount: 5
   *     },
   *     visibilityTimeoutSeconds: 60
   *   });
   *
   *   const paymentsWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/payments-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'paymentsQueue' } }]
   *   });
   *
   *   return { resources: { paymentsDlq, paymentsQueue, paymentsWorker } };
   * });
   * ```
   */
  redrivePolicy?: SqsQueueRedrivePolicy;
  /**
   * #### Additional alarms associated with this resource.
   *
   * ---
   *
   * These alarms will be merged with any alarms configured globally in the [console](https://console.stacktape.com/alarms).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backlogQueue:
   *     type: sqs-queue
   *     properties:
   *       alarms:
   *         - trigger:
   *             type: sqs-queue-received-messages-count
   *             properties:
   *               thresholdCount: 1000
   *           notificationTargets:
   *             - type: slack
   *               properties:
   *                 conversationId: C0123456789
   *                 accessToken: $Secret('slack-token')
   *   backlogWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/backlog-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: backlogQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backlogQueue = new SqsQueue({
   *     alarms: [
   *       {
   *         trigger: {
   *           type: 'sqs-queue-received-messages-count',
   *           properties: { thresholdCount: 1000 }
   *         },
   *         notificationTargets: [
   *           {
   *             type: 'slack',
   *             properties: {
   *               conversationId: 'C0123456789',
   *               accessToken: $Secret('slack-token')
   *             }
   *           }
   *         ]
   *       }
   *     ]
   *   });
   *
   *   const backlogWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/backlog-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'backlogQueue' } }]
   *   });
   *
   *   return { resources: { backlogQueue, backlogWorker } };
   * });
   * ```
   */
  alarms?: SqsQueueAlarm[];
  /**
   * #### Disables globally configured alarms for this resource.
   *
   * ---
   *
   * Provide a list of alarm names as configured in the [console](https://console.stacktape.com/alarms).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   lowPriorityQueue:
   *     type: sqs-queue
   *     properties:
   *       disabledGlobalAlarms:
   *         - sqs-queue-not-empty
   *       messageRetentionPeriodSeconds: 86400
   *   lowPriorityWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/low-priority-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: lowPriorityQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const lowPriorityQueue = new SqsQueue({
   *     disabledGlobalAlarms: ['sqs-queue-not-empty'],
   *     messageRetentionPeriodSeconds: 86400
   *   });
   *
   *   const lowPriorityWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/low-priority-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'lowPriorityQueue' } }]
   *   });
   *
   *   return { resources: { lowPriorityQueue, lowPriorityWorker } };
   * });
   * ```
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Custom access-control statements added to the queue's resource policy.
   *
   * ---
   *
   * These are merged with policies Stacktape auto-generates. Use to grant cross-account access or allow
   * specific AWS services (e.g., SNS) to send messages to this queue.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   crossAccountQueue:
   *     type: sqs-queue
   *     properties:
   *       policyStatements:
   *         - Effect: Allow
   *           Principal:
   *             Service: sns.amazonaws.com
   *           Action:
   *             - sqs:SendMessage
   *   crossAccountWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/cross-account-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: crossAccountQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const crossAccountQueue = new SqsQueue({
   *     policyStatements: [
   *       {
   *         Effect: 'Allow',
   *         Principal: { Service: 'sns.amazonaws.com' },
   *         Action: ['sqs:SendMessage']
   *       }
   *     ]
   *   });
   *
   *   const crossAccountWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/cross-account-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'crossAccountQueue' } }]
   *   });
   *
   *   return { resources: { crossAccountQueue, crossAccountWorker } };
   * });
   * ```
   */
  policyStatements?: SqsQueuePolicyStatement[];
  /**
   * #### A list of event sources that trigger message delivery to this queue.
   *
   * ---
   *
   * Currently supports EventBridge event bus integration for delivering events directly to the queue.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   appEventBus:
   *     type: event-bus
   *   orderQueue:
   *     type: sqs-queue
   *     properties:
   *       events:
   *         - type: event-bus
   *           properties:
   *             eventBusName: appEventBus
   *             eventPattern:
   *               detail-type:
   *                 - OrderPlaced
   *   orderWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/order-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: orderQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, EventBus, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appEventBus = new EventBus({});
   *
   *   const orderQueue = new SqsQueue({
   *     events: [
   *       {
   *         type: 'event-bus',
   *         properties: {
   *           eventBusName: 'appEventBus',
   *           eventPattern: { 'detail-type': ['OrderPlaced'] }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const orderWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/order-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'orderQueue' } }]
   *   });
   *
   *   return { resources: { appEventBus, orderQueue, orderWorker } };
   * });
   * ```
   */
  events?: SqsQueueEventBusIntegration[];
}

interface SqsQueuePolicyStatement {
  /**
   * #### `Allow` or `Deny` access for the specified actions and principal.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   restrictedQueue:
   *     type: sqs-queue
   *     properties:
   *       policyStatements:
   *         - Effect: Deny
   *           Principal: "*"
   *           Action:
   *             - sqs:DeleteQueue
   *   restrictedWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/restricted-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: restrictedQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const restrictedQueue = new SqsQueue({
   *     policyStatements: [
   *       {
   *         Effect: 'Deny',
   *         Principal: '*',
   *         Action: ['sqs:DeleteQueue']
   *       }
   *     ]
   *   });
   *
   *   const restrictedWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/restricted-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'restrictedQueue' } }]
   *   });
   *
   *   return { resources: { restrictedQueue, restrictedWorker } };
   * });
   * ```
   */
  Effect: string;
  /**
   * #### SQS actions to allow or deny. E.g., `["sqs:SendMessage"]` or `["sqs:*"]`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ingestQueue:
   *     type: sqs-queue
   *     properties:
   *       policyStatements:
   *         - Effect: Allow
   *           Principal:
   *             Service: events.amazonaws.com
   *           Action:
   *             - sqs:SendMessage
   *             - sqs:GetQueueAttributes
   *   ingestWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/ingest-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: ingestQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ingestQueue = new SqsQueue({
   *     policyStatements: [
   *       {
   *         Effect: 'Allow',
   *         Principal: { Service: 'events.amazonaws.com' },
   *         Action: ['sqs:SendMessage', 'sqs:GetQueueAttributes']
   *       }
   *     ]
   *   });
   *
   *   const ingestWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/ingest-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'ingestQueue' } }]
   *   });
   *
   *   return { resources: { ingestQueue, ingestWorker } };
   * });
   * ```
   */
  Action: string[];
  /**
   * #### Optional conditions for when this statement applies (e.g., restrict by source ARN or IP range).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   topicBoundQueue:
   *     type: sqs-queue
   *     properties:
   *       policyStatements:
   *         - Effect: Allow
   *           Principal: "*"
   *           Action:
   *             - sqs:SendMessage
   *           Condition:
   *             ArnEquals:
   *               aws:SourceArn: arn:aws:sns:eu-west-1:123456789012:order-events-topic
   *   topicBoundWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/topic-bound-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: topicBoundQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const topicBoundQueue = new SqsQueue({
   *     policyStatements: [
   *       {
   *         Effect: 'Allow',
   *         Principal: '*',
   *         Action: ['sqs:SendMessage'],
   *         Condition: {
   *           ArnEquals: {
   *             'aws:SourceArn': 'arn:aws:sns:eu-west-1:123456789012:order-events-topic'
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const topicBoundWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/topic-bound-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'topicBoundQueue' } }]
   *   });
   *
   *   return { resources: { topicBoundQueue, topicBoundWorker } };
   * });
   * ```
   */
  Condition?: any;
  /**
   * #### Who gets access: AWS account ID, IAM ARN, or `"*"` for everyone. E.g., `{ "Service": "sns.amazonaws.com" }`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   partnerQueue:
   *     type: sqs-queue
   *     properties:
   *       policyStatements:
   *         - Effect: Allow
   *           Principal:
   *             AWS: arn:aws:iam::210987654321:root
   *           Action:
   *             - sqs:SendMessage
   *             - sqs:ReceiveMessage
   *   partnerWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/partner-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: partnerQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const partnerQueue = new SqsQueue({
   *     policyStatements: [
   *       {
   *         Effect: 'Allow',
   *         Principal: { AWS: 'arn:aws:iam::210987654321:root' },
   *         Action: ['sqs:SendMessage', 'sqs:ReceiveMessage']
   *       }
   *     ]
   *   });
   *
   *   const partnerWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/partner-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'partnerQueue' } }]
   *   });
   *
   *   return { resources: { partnerQueue, partnerWorker } };
   * });
   * ```
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
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   shipmentQueue:
   *     type: sqs-queue
   *     properties:
   *       events:
   *         - type: event-bus
   *           properties:
   *             useDefaultBus: true
   *             eventPattern:
   *               source:
   *                 - logistics-service
   *               detail-type:
   *                 - ShipmentDispatched
   *   shipmentWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/shipment-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: shipmentQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const shipmentQueue = new SqsQueue({
   *     events: [
   *       {
   *         type: 'event-bus',
   *         properties: {
   *           useDefaultBus: true,
   *           eventPattern: {
   *             source: ['logistics-service'],
   *             'detail-type': ['ShipmentDispatched']
   *           }
   *         }
   *       }
   *     ]
   *   });
   *
   *   const shipmentWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/shipment-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'shipmentQueue' } }]
   *   });
   *
   *   return { resources: { shipmentQueue, shipmentWorker } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   auditEventBus:
   *     type: event-bus
   *   auditQueue:
   *     type: sqs-queue
   *     properties:
   *       fifoEnabled: true
   *       contentBasedDeduplication: true
   *       events:
   *         - type: event-bus
   *           properties:
   *             eventBusName: auditEventBus
   *             eventPattern:
   *               detail-type:
   *                 - UserAction
   *             messageGroupId: audit-events
   *   auditWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/audit-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: auditQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, EventBus, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const auditEventBus = new EventBus({});
   *
   *   const auditQueue = new SqsQueue({
   *     fifoEnabled: true,
   *     contentBasedDeduplication: true,
   *     events: [
   *       {
   *         type: 'event-bus',
   *         properties: {
   *           eventBusName: 'auditEventBus',
   *           eventPattern: { 'detail-type': ['UserAction'] },
   *           messageGroupId: 'audit-events'
   *         }
   *       }
   *     ]
   *   });
   *
   *   const auditWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/audit-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'auditQueue' } }]
   *   });
   *
   *   return { resources: { auditEventBus, auditQueue, auditWorker } };
   * });
   * ```
   */
  messageGroupId?: string;
}

interface SqsQueueRedrivePolicy {
  /**
   * #### Name of another `sqs-queue` in your config to use as the dead-letter queue.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   notificationsDlq:
   *     type: sqs-queue
   *   notificationsQueue:
   *     type: sqs-queue
   *     properties:
   *       redrivePolicy:
   *         targetSqsQueueName: notificationsDlq
   *         maxReceiveCount: 3
   *   notificationsWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/notifications-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: notificationsQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const notificationsDlq = new SqsQueue({});
   *
   *   const notificationsQueue = new SqsQueue({
   *     redrivePolicy: {
   *       targetSqsQueueName: 'notificationsDlq',
   *       maxReceiveCount: 3
   *     }
   *   });
   *
   *   const notificationsWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/notifications-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'notificationsQueue' } }]
   *   });
   *
   *   return { resources: { notificationsDlq, notificationsQueue, notificationsWorker } };
   * });
   * ```
   */
  targetSqsQueueName?: string;
  /**
   * #### ARN of an external SQS queue to use as the dead-letter queue. Use when the DLQ is in another stack or account.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   eventsQueue:
   *     type: sqs-queue
   *     properties:
   *       redrivePolicy:
   *         targetSqsQueueArn: arn:aws:sqs:eu-west-1:123456789012:shared-dead-letter-queue
   *         maxReceiveCount: 4
   *   eventsWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/events-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: eventsQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const eventsQueue = new SqsQueue({
   *     redrivePolicy: {
   *       targetSqsQueueArn: 'arn:aws:sqs:eu-west-1:123456789012:shared-dead-letter-queue',
   *       maxReceiveCount: 4
   *     }
   *   });
   *
   *   const eventsWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/events-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'eventsQueue' } }]
   *   });
   *
   *   return { resources: { eventsQueue, eventsWorker } };
   * });
   * ```
   */
  targetSqsQueueArn?: string;
  /**
   * #### How many times a message can be received (and fail) before being moved to the dead-letter queue.
   *
   * ---
   *
   * A typical starting value is `3`–`5`. Set lower for fast-failing workloads, higher for retryable transient errors.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   jobsDlq:
   *     type: sqs-queue
   *   jobsQueue:
   *     type: sqs-queue
   *     properties:
   *       redrivePolicy:
   *         targetSqsQueueName: jobsDlq
   *         maxReceiveCount: 3
   *   jobsWorker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/jobs-worker.ts
   *       events:
   *         - type: sqs
   *           properties:
   *             sqsQueueName: jobsQueue
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const jobsDlq = new SqsQueue({});
   *
   *   const jobsQueue = new SqsQueue({
   *     redrivePolicy: {
   *       targetSqsQueueName: 'jobsDlq',
   *       maxReceiveCount: 3
   *     }
   *   });
   *
   *   const jobsWorker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/jobs-worker.ts' }
   *     },
   *     events: [{ type: 'sqs', properties: { sqsQueueName: 'jobsQueue' } }]
   *   });
   *
   *   return { resources: { jobsDlq, jobsQueue, jobsWorker } };
   * });
   * ```
   */
  maxReceiveCount: number;
}

type SqsQueueReferencableParam = 'arn' | 'name' | 'url';
```
