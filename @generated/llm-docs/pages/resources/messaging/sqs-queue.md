# SQS Queue

A Stacktape SQS queue is a fully managed, serverless message queue built on Amazon SQS. Producers send messages and consumers process them at their own pace — decoupling your services so a spike in one part of your system does not cascade into another. You pay per message with no upfront cost and no capacity to manage.

SQS uses pay-per-request pricing with no minimum fee. The first 1 million requests per month are included in the AWS Free Tier. After that, standard queues are cheaper than FIFO queues. Each 64 KB chunk of a message counts as one request. Long polling reduces costs by making fewer API calls.

## When to use

Use an SQS queue when you need to decouple a producer from a consumer. Common scenarios:

- **Background processing** — a web API accepts a request, drops a message on a queue, and returns immediately while a [Lambda function](/resources/compute/lambda-function) processes the work asynchronously.
- **Task queues** — distribute work items (image resizing, email sending, report generation) across consumers that process at their own pace.
- **Buffering between services** — absorb traffic bursts so a downstream service is not overwhelmed. The queue acts as a shock absorber between a fast producer and a slower consumer.
- **Retry and dead-letter workflows** — messages that fail processing are automatically retried and, after a configurable number of attempts, moved to a dead-letter queue for inspection.

## When NOT to use

- **Fan-out to multiple consumers** — SQS is designed for one logical consumer workflow per message. Standard queues use at-least-once delivery, so a message can occasionally be delivered more than once; use an [SNS topic](/resources/messaging/sns-topic) or an [EventBridge event bus](/resources/messaging/event-bus) when every service needs its own copy.
- **Real-time streaming** — for ordered, high-throughput data streams where consumers need to replay data, use a [Kinesis stream](/resources/messaging/kinesis-stream).
- **Request-response** — SQS is one-way. If your caller needs a synchronous response, invoke the downstream service directly or use an [HTTP API Gateway](/resources/networking/http-api-gateway).
- **Sub-second latency requirements** — SQS standard queues have at-least-once delivery with occasional re-ordering. For strict real-time guarantees, consider direct invocation or WebSockets.

## Basic example

The simplest SQS queue requires no properties at all. Stacktape creates a standard queue with sensible defaults: 256 KB max message size, 4-day retention, 30-second visibility timeout, and short polling.


Example (TypeScript):

```typescript
import { defineConfig, SqsQueue } from 'stacktape';
export default defineConfig(() => {
  const taskQueue = new SqsQueue({});

  return {
    resources: { taskQueue }
  };
});
```


## Standard vs FIFO queues

Stacktape SQS queues support two queue types: **standard** (default) and **FIFO**. The choice affects ordering, throughput, and delivery guarantees.

| | Standard | FIFO |
|---|---|---|
| **Ordering** | Best-effort | Strict within each message group |
| **Delivery** | At-least-once (rare duplicates possible) | Exactly-once |
| **Throughput** | Nearly unlimited | ~300 msg/s (3,000 with batching), or ~70,000 with high-throughput mode |
| **Use cases** | Background jobs, notifications, buffering | Financial transactions, sequential workflows, event sourcing |

Standard queues are the right choice for most workloads. Use FIFO only when message ordering or exactly-once processing is a hard requirement, and you can accept lower throughput.

### FIFO queue

Set `fifoEnabled: true` to create a FIFO queue. FIFO queues require deduplication — either enable `contentBasedDeduplication` (SQS uses a SHA-256 hash of the message body) or provide a `MessageDeduplicationId` on each message you send.


Example (TypeScript):

```typescript
import { defineConfig, SqsQueue } from 'stacktape';
export default defineConfig(() => {
  const orderQueue = new SqsQueue({
    fifoEnabled: true,
    contentBasedDeduplication: true
  });

  return {
    resources: { orderQueue }
  };
});
```


### High-throughput FIFO

For FIFO queues that need higher throughput, set `fifoHighThroughput: true`. This enables up to ~70,000 messages per second per queue by partitioning messages by `MessageGroupId`. Order is guaranteed within each message group but not across groups. This mode requires `fifoEnabled: true`.


Example (TypeScript):

```typescript
import { defineConfig, SqsQueue } from 'stacktape';
export default defineConfig(() => {
  const highThroughputQueue = new SqsQueue({
    fifoEnabled: true,
    fifoHighThroughput: true,
    contentBasedDeduplication: true
  });

  return {
    resources: { highThroughputQueue }
  };
});
```


## Dead-letter queues

A dead-letter queue (DLQ) catches messages that fail processing after a configurable number of attempts. Without a DLQ, a "poison" message — one that always causes a processing error — blocks the queue indefinitely because it keeps becoming visible and being retried. With a DLQ, the message moves aside after `maxReceiveCount` failures so you can inspect and reprocess it later.

Configure `redrivePolicy` to route failed messages to a DLQ. Use `targetSqsQueueName` for another queue in the same Stacktape config, or `targetSqsQueueArn` for an external queue. A typical starting value for `maxReceiveCount` is 3–5: lower for fast-failing workloads, higher when transient errors are common.


Example (TypeScript):

```typescript
import { defineConfig, SqsQueue } from 'stacktape';
export default defineConfig(() => {
  const deadLetterQueue = new SqsQueue({});

  const taskQueue = new SqsQueue({
    redrivePolicy: {
      targetSqsQueueName: 'deadLetterQueue',
      maxReceiveCount: 3
    }
  });

  return {
    resources: { taskQueue, deadLetterQueue }
  };
});
```


> **Tip:** For AWS SQS compatibility, use the same queue type for the DLQ as the source queue — if the main queue is FIFO, the DLQ should also be FIFO.


## Polling and visibility

Two properties control how consumers interact with the queue:

**Long polling** (`longPollingSeconds`) determines how long the queue waits for messages before returning an empty response. The default is `0` (short polling), which returns immediately and costs more because the consumer must poll repeatedly. Set to `20` for most workloads — it reduces API calls and cost with no downside for typical batch consumers.

**Visibility timeout** (`visibilityTimeoutSeconds`) is how long a message is hidden from other consumers after one consumer picks it up. The consumer must delete the message before this timeout expires; otherwise the message becomes visible again and may be processed a second time. The default is `30` seconds. Set this higher than your expected processing time — if tasks take 2 minutes, use at least 150 seconds.


Example (TypeScript):

```typescript
import { defineConfig, SqsQueue } from 'stacktape';
export default defineConfig(() => {
  const taskQueue = new SqsQueue({
    longPollingSeconds: 20,
    visibilityTimeoutSeconds: 300
  });

  return {
    resources: { taskQueue }
  };
});
```


## Triggering a Lambda function

An SQS queue is one of the most common event sources for [Lambda functions](/resources/compute/lambda-function). When messages arrive, AWS invokes the function with a batch of messages. Your handler should process messages idempotently, because failed batches can be retried. Configure this using an [SQS trigger](/configuration/triggers/sqs-events) on the Lambda function — not on the queue itself.

Key settings on the trigger:

- `batchSize` — max messages per invocation (default: 10, max: 10,000).
- `maxBatchWindowSeconds` — max wait time before invoking with a partial batch (max: 300 seconds).


> **Warning:** Use one Lambda event-source consumer for a queue when each message should be handled once. For fan-out, publish to an [SNS topic](/resources/messaging/sns-topic) or [event bus](/resources/messaging/event-bus) and give each downstream consumer its own target.


Example (TypeScript):

```typescript
import {
  defineConfig,
  SqsQueue,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const taskQueue = new SqsQueue({
    longPollingSeconds: 20
  });

  const worker = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/worker.ts'
    }),
    memory: 512,
    timeout: 60,
    events: [
      {
        type: 'sqs',
        properties: {
          sqsQueueName: 'taskQueue',
          batchSize: 10,
          maxBatchWindowSeconds: 5
        }
      }
    ]
  });

  return {
    resources: { taskQueue, worker }
  };
});
```


The Lambda handler receives messages in the `Records` array:

```typescript
export const handler = async (event: { Records: Array<{ body: string; messageId: string }> }) => {
  for (const record of event.Records) {
    const message = JSON.parse(record.body);
    // Process each message idempotently
    console.info(`Processing message ${record.messageId}:`, message);
  }
};
```

## Connecting to other resources

Use `connectTo` on any compute resource ([Lambda function](/resources/compute/lambda-function), [web service](/resources/compute/web-service), [worker service](/resources/compute/worker-service), etc.) to grant it access to the queue. Stacktape grants SQS send, receive, and delete permissions and injects ARN, NAME, and URL environment variables automatically.

For a queue named `taskQueue`, the injected environment variables are:

| Environment variable | Description |
|---|---|
| `STP_TASK_QUEUE_ARN` | The queue's Amazon Resource Name |
| `STP_TASK_QUEUE_NAME` | The queue name |
| `STP_TASK_QUEUE_URL` | The queue URL (use this with the AWS SDK to send/receive messages) |

For more details on `connectTo`, see [Connecting resources](/configuration/connecting-resources).


Example (TypeScript):

```typescript
import {
  defineConfig,
  SqsQueue,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const taskQueue = new SqsQueue({});

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    connectTo: ['taskQueue'],
    memory: 512,
    timeout: 30
  });

  return {
    resources: { taskQueue, api }
  };
});
```


Sending a message from the connected Lambda function:

```typescript
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

export const handler = async (event: any) => {
  await sqs.send(new SendMessageCommand({
    QueueUrl: process.env.STP_TASK_QUEUE_URL,
    MessageBody: JSON.stringify({ task: 'resize-image', imageId: '123' })
  }));

  return { statusCode: 200, body: 'Task queued' };
};
```

## Queue policies

For Stacktape-managed compute resources (Lambda functions, web services, worker services, etc.), use `connectTo` to grant access — it handles IAM permissions and environment variables automatically. For cross-account access or granting specific AWS service principals (such as SNS) permission to send messages to the queue, use `policyStatements`. These custom access-control statements are merged with the policies Stacktape auto-generates. See the [API Reference](#api-reference) for the full policy statement shape.

## EventBridge integration

An SQS queue can receive EventBridge events using the queue's `events` property. This routes matching events directly into the queue without writing any producer code. Choose exactly one EventBridge source: `eventBusName` for a Stacktape-managed bus, `eventBusArn` for an existing external bus, or `useDefaultBus` for the default AWS event bus.

The same EventBridge integration also supports delivery-failure routing and payload shaping through `onDeliveryFailure`, `input`, `inputPath`, and `inputTransformer`; use the [API Reference](#api-reference) for those less common options.


Example (TypeScript):

```typescript
import { defineConfig, SqsQueue, EventBus } from 'stacktape';
export default defineConfig(() => {
  const orderBus = new EventBus({});

  const orderQueue = new SqsQueue({
    events: [
      {
        type: 'event-bus',
        properties: {
          eventBusName: 'orderBus',
          eventPattern: {
            source: ['order-service'],
            'detail-type': ['OrderPlaced']
          }
        }
      }
    ]
  });

  return {
    resources: { orderBus, orderQueue }
  };
});
```


### FIFO queues with EventBridge

When routing EventBridge events into a FIFO queue, you must set `messageGroupId` on the integration — SQS requires a message group ID for every message delivered to a FIFO queue. Messages in the same group are processed in strict order; different groups can be processed in parallel.


Example (TypeScript):

```typescript
import { defineConfig, SqsQueue, EventBus } from 'stacktape';
export default defineConfig(() => {
  const orderBus = new EventBus({});

  const orderQueue = new SqsQueue({
    fifoEnabled: true,
    contentBasedDeduplication: true,
    events: [
      {
        type: 'event-bus',
        properties: {
          eventBusName: 'orderBus',
          eventPattern: {
            source: ['order-service'],
            'detail-type': ['OrderPlaced']
          },
          messageGroupId: 'orders'
        }
      }
    ]
  });

  return {
    resources: { orderBus, orderQueue }
  };
});
```


## Alarms

Stacktape supports two alarm triggers for SQS queues:

- **`sqs-queue-not-empty`** — fires when the queue has activity (any of: visible messages, in-flight messages, messages received, or messages sent are non-zero). Use this to detect a consumer that has stopped processing.
- **`sqs-queue-received-messages-count`** — fires when the number of received messages crosses a `thresholdCount`. Use this to detect unexpected traffic spikes. Defaults to comparing the **average** messages received per period against the threshold; customize with `statistic` and `comparisonOperator`.

Alarms configured on the queue are merged with any alarms configured globally in the [Stacktape Console](https://console.stacktape.com/alarms). You can disable specific global alarms per queue using `disabledGlobalAlarms`. For more on alarms, see [Alarms](/observability/alarms) and [Alert channels](/observability/alert-channels).


Example (TypeScript):

```typescript
import { defineConfig, SqsQueue } from 'stacktape';
export default defineConfig(() => {
  const taskQueue = new SqsQueue({
    alarms: [
      {
        trigger: {
          type: 'sqs-queue-not-empty'
        }
      },
      {
        trigger: {
          type: 'sqs-queue-received-messages-count',
          properties: {
            thresholdCount: 1000
          }
        }
      }
    ]
  });

  return {
    resources: { taskQueue }
  };
});
```


## Referenceable parameters


## Referenceable Parameters: `sqs-queue`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |


## API Reference


## API Reference: `SqsQueueProps`
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

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `alarms` | no | `Array<SqsQueueAlarm>` | Additional alarms associated with this resource. These alarms will be merged with any alarms configured globally in the [console](https://console.stacktape.com/alarms). | - |
| `contentBasedDeduplication` | no | `boolean` | Automatically deduplicates messages based on their content (SHA-256 hash of the body). Within the 5-minute deduplication window, identical messages are delivered only once.
Saves you from having to generate a unique `MessageDeduplicationId` for each message.
Requires `fifoEnabled: true`. | - |
| `delayMessagesSecond` | no | `number` | Delay (in seconds) before new messages become visible to consumers. Range: 0–900. Useful for introducing a buffer, e.g., waiting for related data to be available before processing. | `0` |
| `disabledGlobalAlarms` | no | `Array<string>` | Disables globally configured alarms for this resource. Provide a list of alarm names as configured in the [console](https://console.stacktape.com/alarms). | - |
| `events` | no | `Array<SqsQueueEventBusIntegration>` | A list of event sources that trigger message delivery to this queue. Currently supports EventBridge event bus integration for delivering events directly to the queue. | - |
| `fifoEnabled` | no | `boolean` | Creates a FIFO queue that guarantees message order and exactly-once delivery. Use when processing order matters (e.g., financial transactions, sequential workflows).
FIFO queues have lower throughput (~300 msg/s without batching, ~3,000 with) compared to standard queues.

Requires either `contentBasedDeduplication: true` or a `MessageDeduplicationId` on each message. | `false` |
| `fifoHighThroughput` | no | `boolean` | Enables high-throughput mode for FIFO queues (up to ~70,000 msg/s per queue). Messages are partitioned by `MessageGroupId` — order is guaranteed within each group but not across groups.
Requires `fifoEnabled: true`. | - |
| `longPollingSeconds` | no | `number` | Seconds the queue waits for messages before returning an empty response. Range: 0–20. Set to `1`–`20` to enable long polling, which reduces costs by making fewer API calls.
With short polling (`0`), the consumer gets an immediate (often empty) response and must poll again.

Recommended: `20` for most workloads — it&#39;s the most cost-effective. | `0` |
| `maxMessageSizeBytes` | no | `number` | Maximum message size in bytes. Range: 1,024 (1 KB) to 262,144 (256 KB). Messages larger than this limit are rejected. For payloads over 256 KB, store the data in S3 and send the reference. | `262144` |
| `messageRetentionPeriodSeconds` | no | `number` | How long unprocessed messages stay in the queue before being deleted. Range: 60s to 1,209,600s (14 days). Default is 4 days (345,600s). Increase if consumers might fall behind or be temporarily offline. | `345600` |
| `policyStatements` | no | `Array<SqsQueuePolicyStatement>` | Custom access-control statements added to the queue&#39;s resource policy. These are merged with policies Stacktape auto-generates. Use to grant cross-account access or allow
specific AWS services (e.g., SNS) to send messages to this queue. | - |
| `redrivePolicy` | no | `SqsQueueRedrivePolicy` | Moves messages that fail processing too many times to a dead-letter queue for inspection. After `maxReceiveCount` failed attempts, the message is automatically moved to a separate queue
so you can investigate and reprocess it. Prevents poison messages from blocking the queue. | - |
| `visibilityTimeoutSeconds` | no | `number` | How long (seconds) a message is hidden from other consumers after being received. Range: 0–43,200 (12 hours). After a consumer picks up a message, it must delete it before this timeout expires — otherwise it becomes
visible again and can be processed by another consumer (duplicate processing).

Set this higher than your expected processing time. If your tasks take 2 minutes, use at least 150 seconds. | `30` |


## FAQ

### When should I use an SQS queue vs an SNS topic?

Use an SQS queue when you have one consumer processing messages at its own pace — the queue holds messages until the consumer is ready. Use an [SNS topic](/resources/messaging/sns-topic) when you need fan-out: multiple subscribers each receive a copy of every message. A common pattern combines both: SNS fans out to multiple SQS queues, giving each consumer its own buffer.

### How does Amazon SQS pricing work?

SQS uses pay-per-request pricing with no minimum fee. The first 1 million requests per month are included in the AWS Free Tier. After that, standard queues are cheaper per request than FIFO queues. Each 64 KB chunk of a message counts as one request. Long polling reduces costs by making fewer API calls.

### What is the maximum message size for SQS?

The maximum message size is 256 KB (262,144 bytes). For larger payloads, the standard pattern is to store the data in an [S3 bucket](/resources/storage/s3-bucket) and send a reference (the S3 key) as the message body. You can configure a smaller max using `maxMessageSizeBytes` (minimum 1 KB).

### How do I handle failed messages?

Configure a [dead-letter queue](#dead-letter-queues) using `redrivePolicy`. After `maxReceiveCount` failed processing attempts, the message moves to the DLQ automatically. Monitor the DLQ with an `sqs-queue-not-empty` alarm to get notified when failures occur. You can then inspect, fix, and reprocess messages from the DLQ.

### Can I use SQS with a container service instead of Lambda?

Yes. Use `connectTo` on a [web service](/resources/compute/web-service), [worker service](/resources/compute/worker-service), or [multi-container workload](/resources/compute/multi-container-workload) to get SQS permissions and the queue URL injected as environment variables. Your container application polls the queue using the AWS SDK. Unlike Lambda-based consumers, you manage the polling loop yourself.

### What is the difference between standard and FIFO queues?

Standard queues offer nearly unlimited throughput with best-effort ordering and at-least-once delivery (rare duplicates possible). FIFO queues guarantee strict message ordering within each message group and exactly-once delivery, but have lower throughput (~300 msg/s, or ~3,000 with batching). Enable `fifoHighThroughput` for up to ~70,000 msg/s by partitioning across message groups.

### How long can messages stay in the queue?

Messages are retained for 4 days by default (`messageRetentionPeriodSeconds: 345600`). You can configure retention from 60 seconds up to 14 days (1,209,600 seconds). Increase retention if your consumers might be temporarily offline or fall behind during traffic spikes.

### Can I delay message delivery?

Yes. Set `delayMessagesSecond` to a value between 0 and 900 (15 minutes). New messages will be invisible to consumers until the delay expires. This is useful when you need related data to become available before processing — for example, waiting a few seconds after an order is placed before sending a confirmation.

### How do I monitor an SQS queue in Stacktape?

Stacktape provides two built-in alarm triggers: `sqs-queue-not-empty` detects stalled consumers, and `sqs-queue-received-messages-count` detects traffic anomalies. Use [`stacktape debug:logs`](/cli/debug-logs) for related Lambda consumer logs. Configure [alert channels](/observability/alert-channels) to receive notifications via Slack, email, or webhooks.

### SQS queue vs Kinesis stream — which should I use?

Use an SQS queue for decoupling individual tasks where each message is processed once by one consumer. Use a [Kinesis stream](/resources/messaging/kinesis-stream) when you need ordered, replayable data streams with multiple consumers reading the same data independently — common for analytics pipelines, real-time dashboards, and log aggregation. Kinesis charges per shard-hour regardless of traffic; SQS charges per message.
