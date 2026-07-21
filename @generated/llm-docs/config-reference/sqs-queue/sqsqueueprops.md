# SqsQueueProps API Reference

Resource type: `sqs-queue`

## TypeScript definition

```typescript
import type { SqsQueueAlarm, SqsQueueEventBusIntegration, SqsQueuePolicyStatement, SqsQueueRedrivePolicy } from 'stacktape';

type SqsQueueProps = {
  /** Additional alarms associated with this resource. */
  alarms?: Array<SqsQueueAlarm>;
  /** Automatically deduplicates messages based on their content (SHA-256 hash of the body). */
  contentBasedDeduplication?: boolean;
  /** Delay (in seconds) before new messages become visible to consumers. Range: 0–900. */
  delayMessagesSecond?: number;
  /** Disables globally configured alarms for this resource. */
  disabledGlobalAlarms?: Array<string>;
  /** A list of event sources that trigger message delivery to this queue. */
  events?: Array<SqsQueueEventBusIntegration>;
  /** Creates a FIFO queue that guarantees message order and exactly-once delivery. */
  fifoEnabled?: boolean;
  /** Enables high-throughput mode for FIFO queues (up to ~70,000 msg/s per queue). */
  fifoHighThroughput?: boolean;
  /** Seconds the queue waits for messages before returning an empty response. Range: 0–20. */
  longPollingSeconds?: number;
  /** Maximum message size in bytes. Range: 1,024 (1 KB) to 262,144 (256 KB). */
  maxMessageSizeBytes?: number;
  /** How long unprocessed messages stay in the queue before being deleted. Range: 60s to 1,209,600s (14 days). */
  messageRetentionPeriodSeconds?: number;
  /** Custom access-control statements added to the queue&#39;s resource policy. */
  policyStatements?: Array<SqsQueuePolicyStatement>;
  /** Moves messages that fail processing too many times to a dead-letter queue for inspection. */
  redrivePolicy?: SqsQueueRedrivePolicy;
  /** How long (seconds) a message is hidden from other consumers after being received. Range: 0–43,200 (12 hours). */
  visibilityTimeoutSeconds?: number;
};
```

## Property: `alarms`

- Required: no
- Type: `Array<SqsQueueAlarm>`

Additional alarms associated with this resource.

These alarms will be merged with any alarms configured globally in the [console](https://console.stacktape.com/alarms).

### Example 1 (yaml)

```yaml
resources:
  backlogQueue:
    type: sqs-queue
    properties:
      alarms:
        - trigger:
            type: sqs-queue-received-messages-count
            properties:
              thresholdCount: 1000
          notificationTargets:
            - type: slack
              properties:
                conversationId: C0123456789
                accessToken: $Secret('slack-token')
  backlogWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/backlog-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: backlogQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const backlogQueue = new SqsQueue({
    alarms: [
      {
        trigger: {
          type: 'sqs-queue-received-messages-count',
          properties: { thresholdCount: 1000 }
        },
        notificationTargets: [
          {
            type: 'slack',
            properties: {
              conversationId: 'C0123456789',
              accessToken: $Secret('slack-token')
            }
          }
        ]
      }
    ]
  });

  const backlogWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/backlog-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'backlogQueue' } }]
  });

  return { resources: { backlogQueue, backlogWorker } };
});
```

## Property: `contentBasedDeduplication`

- Required: no
- Type: `boolean`

Automatically deduplicates messages based on their content (SHA-256 hash of the body).

Within the 5-minute deduplication window, identical messages are delivered only once.
Saves you from having to generate a unique `MessageDeduplicationId` for each message.
Requires `fifoEnabled: true`.

### Example 1 (yaml)

```yaml
resources:
  orderEventsQueue:
    type: sqs-queue
    properties:
      fifoEnabled: true
      contentBasedDeduplication: true
      visibilityTimeoutSeconds: 90
  orderEventConsumer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/order-event-consumer.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: orderEventsQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const orderEventsQueue = new SqsQueue({
    fifoEnabled: true,
    contentBasedDeduplication: true,
    visibilityTimeoutSeconds: 90
  });

  const orderEventConsumer = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/order-event-consumer.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'orderEventsQueue' } }]
  });

  return { resources: { orderEventsQueue, orderEventConsumer } };
});
```

## Property: `delayMessagesSecond`

- Required: no
- Type: `number`
- Default: `0`

Delay (in seconds) before new messages become visible to consumers. Range: 0–900.

Useful for introducing a buffer, e.g., waiting for related data to be available before processing.

### Example 1 (yaml)

```yaml
resources:
  emailQueue:
    type: sqs-queue
    properties:
      delayMessagesSecond: 30
      visibilityTimeoutSeconds: 60
  emailWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/email-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: emailQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const emailQueue = new SqsQueue({
    delayMessagesSecond: 30,
    visibilityTimeoutSeconds: 60
  });

  const emailWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/email-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'emailQueue' } }]
  });

  return { resources: { emailQueue, emailWorker } };
});
```

## Property: `disabledGlobalAlarms`

- Required: no
- Type: `Array<string>`

Disables globally configured alarms for this resource.

Provide a list of alarm names as configured in the [console](https://console.stacktape.com/alarms).

### Example 1 (yaml)

```yaml
resources:
  lowPriorityQueue:
    type: sqs-queue
    properties:
      disabledGlobalAlarms:
        - sqs-queue-not-empty
      messageRetentionPeriodSeconds: 86400
  lowPriorityWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/low-priority-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: lowPriorityQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const lowPriorityQueue = new SqsQueue({
    disabledGlobalAlarms: ['sqs-queue-not-empty'],
    messageRetentionPeriodSeconds: 86400
  });

  const lowPriorityWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/low-priority-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'lowPriorityQueue' } }]
  });

  return { resources: { lowPriorityQueue, lowPriorityWorker } };
});
```

## Property: `events`

- Required: no
- Type: `Array<SqsQueueEventBusIntegration>`

A list of event sources that trigger message delivery to this queue.

Currently supports EventBridge event bus integration for delivering events directly to the queue.

### Example 1 (yaml)

```yaml
resources:
  appEventBus:
    type: event-bus
  orderQueue:
    type: sqs-queue
    properties:
      events:
        - type: event-bus
          properties:
            eventBusName: appEventBus
            eventPattern:
              detail-type:
                - OrderPlaced
  orderWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/order-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: orderQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, EventBus, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appEventBus = new EventBus({});

  const orderQueue = new SqsQueue({
    events: [
      {
        type: 'event-bus',
        properties: {
          eventBusName: 'appEventBus',
          eventPattern: { 'detail-type': ['OrderPlaced'] }
        }
      }
    ]
  });

  const orderWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/order-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'orderQueue' } }]
  });

  return { resources: { appEventBus, orderQueue, orderWorker } };
});
```

## Property: `fifoEnabled`

- Required: no
- Type: `boolean`
- Default: `false`

Creates a FIFO queue that guarantees message order and exactly-once delivery.

Use when processing order matters (e.g., financial transactions, sequential workflows).
FIFO queues have lower throughput (~300 msg/s without batching, ~3,000 with) compared to standard queues.

Requires either `contentBasedDeduplication: true` or a `MessageDeduplicationId` on each message.

### Example 1 (yaml)

```yaml
resources:
  transactionsQueue:
    type: sqs-queue
    properties:
      fifoEnabled: true
      contentBasedDeduplication: true
      visibilityTimeoutSeconds: 60
  transactionProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/transaction-processor.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: transactionsQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const transactionsQueue = new SqsQueue({
    fifoEnabled: true,
    contentBasedDeduplication: true,
    visibilityTimeoutSeconds: 60
  });

  const transactionProcessor = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/transaction-processor.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'transactionsQueue' } }]
  });

  return { resources: { transactionsQueue, transactionProcessor } };
});
```

## Property: `fifoHighThroughput`

- Required: no
- Type: `boolean`

Enables high-throughput mode for FIFO queues (up to ~70,000 msg/s per queue).

Messages are partitioned by `MessageGroupId` — order is guaranteed within each group but not across groups.
Requires `fifoEnabled: true`.

### Example 1 (yaml)

```yaml
resources:
  clickstreamQueue:
    type: sqs-queue
    properties:
      fifoEnabled: true
      fifoHighThroughput: true
      contentBasedDeduplication: true
  clickstreamConsumer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/clickstream-consumer.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: clickstreamQueue
            batchSize: 10
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const clickstreamQueue = new SqsQueue({
    fifoEnabled: true,
    fifoHighThroughput: true,
    contentBasedDeduplication: true
  });

  const clickstreamConsumer = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/clickstream-consumer.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'clickstreamQueue', batchSize: 10 } }]
  });

  return { resources: { clickstreamQueue, clickstreamConsumer } };
});
```

## Property: `longPollingSeconds`

- Required: no
- Type: `number`
- Default: `0`

Seconds the queue waits for messages before returning an empty response. Range: 0–20.

Set to `1`–`20` to enable long polling, which reduces costs by making fewer API calls.
With short polling (`0`), the consumer gets an immediate (often empty) response and must poll again.

Recommended: `20` for most workloads — it's the most cost-effective.

### Example 1 (yaml)

```yaml
resources:
  imageJobsQueue:
    type: sqs-queue
    properties:
      longPollingSeconds: 20
      visibilityTimeoutSeconds: 120
  imageWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/image-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: imageJobsQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const imageJobsQueue = new SqsQueue({
    longPollingSeconds: 20,
    visibilityTimeoutSeconds: 120
  });

  const imageWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/image-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'imageJobsQueue' } }]
  });

  return { resources: { imageJobsQueue, imageWorker } };
});
```

## Property: `maxMessageSizeBytes`

- Required: no
- Type: `number`
- Default: `262144`

Maximum message size in bytes. Range: 1,024 (1 KB) to 262,144 (256 KB).

Messages larger than this limit are rejected. For payloads over 256 KB, store the data in S3 and send the reference.

### Example 1 (yaml)

```yaml
resources:
  uploadEventsQueue:
    type: sqs-queue
    properties:
      maxMessageSizeBytes: 65536
      messageRetentionPeriodSeconds: 604800
  uploadProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/upload-processor.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: uploadEventsQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const uploadEventsQueue = new SqsQueue({
    maxMessageSizeBytes: 65536,
    messageRetentionPeriodSeconds: 604800
  });

  const uploadProcessor = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/upload-processor.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'uploadEventsQueue' } }]
  });

  return { resources: { uploadEventsQueue, uploadProcessor } };
});
```

## Property: `messageRetentionPeriodSeconds`

- Required: no
- Type: `number`
- Default: `345600`

How long unprocessed messages stay in the queue before being deleted. Range: 60s to 1,209,600s (14 days).

Default is 4 days (345,600s). Increase if consumers might fall behind or be temporarily offline.

### Example 1 (yaml)

```yaml
resources:
  reportJobsQueue:
    type: sqs-queue
    properties:
      messageRetentionPeriodSeconds: 1209600
      visibilityTimeoutSeconds: 300
  reportWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/report-worker.ts
      timeout: 240
      events:
        - type: sqs
          properties:
            sqsQueueName: reportJobsQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const reportJobsQueue = new SqsQueue({
    messageRetentionPeriodSeconds: 1209600,
    visibilityTimeoutSeconds: 300
  });

  const reportWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/report-worker.ts' }
    },
    timeout: 240,
    events: [{ type: 'sqs', properties: { sqsQueueName: 'reportJobsQueue' } }]
  });

  return { resources: { reportJobsQueue, reportWorker } };
});
```

## Property: `policyStatements`

- Required: no
- Type: `Array<SqsQueuePolicyStatement>`

Custom access-control statements added to the queue's resource policy.

These are merged with policies Stacktape auto-generates. Use to grant cross-account access or allow
specific AWS services (e.g., SNS) to send messages to this queue.

### Example 1 (yaml)

```yaml
resources:
  crossAccountQueue:
    type: sqs-queue
    properties:
      policyStatements:
        - Effect: Allow
          Principal:
            Service: sns.amazonaws.com
          Action:
            - sqs:SendMessage
  crossAccountWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/cross-account-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: crossAccountQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const crossAccountQueue = new SqsQueue({
    policyStatements: [
      {
        Effect: 'Allow',
        Principal: { Service: 'sns.amazonaws.com' },
        Action: ['sqs:SendMessage']
      }
    ]
  });

  const crossAccountWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/cross-account-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'crossAccountQueue' } }]
  });

  return { resources: { crossAccountQueue, crossAccountWorker } };
});
```

## Property: `redrivePolicy`

- Required: no
- Type: `SqsQueueRedrivePolicy`

Moves messages that fail processing too many times to a dead-letter queue for inspection.

After `maxReceiveCount` failed attempts, the message is automatically moved to a separate queue
so you can investigate and reprocess it. Prevents poison messages from blocking the queue.

### Example 1 (yaml)

```yaml
resources:
  paymentsDlq:
    type: sqs-queue
    properties:
      messageRetentionPeriodSeconds: 1209600
  paymentsQueue:
    type: sqs-queue
    properties:
      redrivePolicy:
        targetSqsQueueName: paymentsDlq
        maxReceiveCount: 5
      visibilityTimeoutSeconds: 60
  paymentsWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/payments-worker.ts
      events:
        - type: sqs
          properties:
            sqsQueueName: paymentsQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const paymentsDlq = new SqsQueue({ messageRetentionPeriodSeconds: 1209600 });

  const paymentsQueue = new SqsQueue({
    redrivePolicy: {
      targetSqsQueueName: 'paymentsDlq',
      maxReceiveCount: 5
    },
    visibilityTimeoutSeconds: 60
  });

  const paymentsWorker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/payments-worker.ts' }
    },
    events: [{ type: 'sqs', properties: { sqsQueueName: 'paymentsQueue' } }]
  });

  return { resources: { paymentsDlq, paymentsQueue, paymentsWorker } };
});
```

## Property: `visibilityTimeoutSeconds`

- Required: no
- Type: `number`
- Default: `30`

How long (seconds) a message is hidden from other consumers after being received. Range: 0–43,200 (12 hours).

After a consumer picks up a message, it must delete it before this timeout expires — otherwise it becomes
visible again and can be processed by another consumer (duplicate processing).

Set this higher than your expected processing time. If your tasks take 2 minutes, use at least 150 seconds.

### Example 1 (yaml)

```yaml
resources:
  videoEncodeQueue:
    type: sqs-queue
    properties:
      visibilityTimeoutSeconds: 900
      longPollingSeconds: 20
  videoEncoder:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/video-encoder.ts
      timeout: 600
      events:
        - type: sqs
          properties:
            sqsQueueName: videoEncodeQueue
```

### Example 2 (typescript)

```typescript
import { SqsQueue, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const videoEncodeQueue = new SqsQueue({
    visibilityTimeoutSeconds: 900,
    longPollingSeconds: 20
  });

  const videoEncoder = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/video-encoder.ts' }
    },
    timeout: 600,
    events: [{ type: 'sqs', properties: { sqsQueueName: 'videoEncodeQueue' } }]
  });

  return { resources: { videoEncodeQueue, videoEncoder } };
});
```
