# SNS Topic

A Stacktape SNS topic is a fully managed, serverless pub/sub messaging service built on Amazon SNS. Publish a message once and deliver it to many subscribers — Lambda functions, SQS queues, email addresses, SMS numbers, or HTTP endpoints. You pay per publish with no upfront cost and no infrastructure to manage.

SNS is pay-per-publish with no minimum fee. The first 1 million publishes per month are in the AWS Free Tier. SMS and email deliveries have separate per-message charges. Check current AWS SNS pricing for regional details.

## When to use

Use an SNS topic when a single event needs to trigger multiple independent actions. Common scenarios:

- **Fan-out to multiple consumers** — an order-placed event triggers email confirmation, inventory update, and analytics simultaneously. Each subscriber receives its own copy of the message.
- **Cross-service notifications** — notify multiple [Lambda functions](/resources/compute/lambda-function) or [SQS queues](/resources/messaging/sqs-queue) from a single publish call, without the producer needing to know about each consumer.
- **Alert distribution** — push notifications to email, SMS, or HTTP webhooks for operational events, user notifications, or system alerts.
- **Decouple publishers from subscribers** — the publisher sends to one topic; subscribers are added or removed independently without changing the publisher.

## When NOT to use

- **Single consumer processing** — if only one service processes each message, use an [SQS queue](/resources/messaging/sqs-queue) directly. SNS adds overhead when there is only one subscriber.
- **Message retention and replay** — SNS does not store messages. If a subscriber is offline when a message is published, that message is lost after delivery retries are exhausted. For durable, replayable streams, use a [Kinesis stream](/resources/messaging/kinesis-stream).
- **Complex event routing** — if you need content-based routing with rich pattern matching beyond simple attribute filters, use an [EventBridge event bus](/resources/messaging/event-bus).
- **Request-response** — SNS is one-way. If your caller needs a synchronous response, invoke the downstream service directly or use an [HTTP API Gateway](/resources/networking/http-api-gateway).

## Basic example

An SNS topic has no required properties. Because `fifoEnabled` defaults to `false`, omitting all properties creates a standard topic that can deliver to any supported subscriber type — Lambda functions, SQS queues, email, SMS, and HTTP endpoints.


Example (TypeScript):

```typescript
import { defineConfig, SnsTopic } from 'stacktape';
export default defineConfig(() => {
  const notifications = new SnsTopic({});

  return {
    resources: { notifications }
  };
});
```


## Standard vs FIFO topics

Stacktape SNS topics support two modes: **standard** (default) and **FIFO**. The choice affects delivery guarantees, subscriber types, and throughput.

| | Standard | FIFO |
|---|---|---|
| **Ordering** | Best-effort | Strict within each message group |
| **Delivery** | At-least-once (rare duplicates possible) | Exactly-once |
| **Subscriber types** | Lambda, SQS, email, SMS, HTTP | FIFO SQS queues only |
| **Throughput** | Nearly unlimited | ~300 publishes/s (3,000 with batching) |
| **Use cases** | Notifications, alerts, general fan-out | Financial transactions, sequential workflows |

Standard topics are the right choice for most workloads. Use FIFO only when message ordering or exactly-once delivery is a hard requirement, and your subscribers are all FIFO SQS queues.

### FIFO topic

Set `fifoEnabled: true` to create a FIFO topic. FIFO topics require deduplication — either enable `contentBasedDeduplication` (SNS uses a SHA-256 hash of the message body within a 5-minute window) or provide a `MessageDeduplicationId` on each publish.


Example (TypeScript):

```typescript
import { defineConfig, SnsTopic } from 'stacktape';
export default defineConfig(() => {
  const orderEvents = new SnsTopic({
    fifoEnabled: true,
    contentBasedDeduplication: true
  });

  return {
    resources: { orderEvents }
  };
});
```


> **Warning:** FIFO topics can only deliver to FIFO SQS queues. Email, SMS, and HTTP subscribers are not supported on FIFO topics — this is an AWS limitation.


### SMS display name

Set `smsDisplayName` to customize the sender name shown on SMS messages (max 11 characters). This only applies to standard topics — FIFO topics do not support SMS delivery.


Example (TypeScript):

```typescript
import { defineConfig, SnsTopic } from 'stacktape';
export default defineConfig(() => {
  const alerts = new SnsTopic({
    smsDisplayName: 'MyApp'
  });

  return {
    resources: { alerts }
  };
});
```


## Fan-out pattern

SNS fan-out delivers each published message to every subscriber independently. In Stacktape, the most direct fan-out uses multiple [Lambda functions](/resources/compute/lambda-function), each subscribing to the same topic via an [SNS trigger](/configuration/triggers/sns-events). Each function receives its own copy of every message and processes it independently — the publisher does not need to know how many subscribers exist.

This example shows a single `orderEvents` topic with two independent subscribers: one sends email confirmations, the other records analytics. Publishing one message triggers both functions simultaneously.


Example (TypeScript):

```typescript
import {
  defineConfig,
  SnsTopic,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const orderEvents = new SnsTopic({});

  const emailNotifier = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/email-notifier.ts'
    }),
    memory: 256,
    timeout: 30,
    events: [
      {
        type: 'sns',
        properties: {
          snsTopicName: 'orderEvents'
        }
      }
    ]
  });

  const analyticsProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/analytics-processor.ts'
    }),
    memory: 512,
    timeout: 60,
    events: [
      {
        type: 'sns',
        properties: {
          snsTopicName: 'orderEvents'
        }
      }
    ]
  });

  return {
    resources: { orderEvents, emailNotifier, analyticsProcessor }
  };
});
```


> **Tip:** For subscribers that need buffering and independent retry, the common AWS pattern routes an SNS topic to multiple [SQS queues](/resources/messaging/sqs-queue). Each queue feeds a separate consumer that processes at its own pace. In Stacktape, you can set this up using [raw CloudFormation resources](/resources/advanced/raw-cloudformation-resources) to create the `AWS::SNS::Subscription` linking each queue to the topic.


## Subscribing a Lambda function

A [Lambda function](/resources/compute/lambda-function) can subscribe to an SNS topic using an [SNS trigger](/configuration/triggers/sns-events). When a message is published, AWS invokes the function with the message payload. Configure this using an SNS event on the Lambda function — not on the topic itself.

Key settings on the trigger:

- `snsTopicName` — reference a topic in the same Stacktape config. Use `snsTopicArn` for an external topic not managed by your stack. Specify exactly one.
- `filterPolicy` — filter messages by attributes so only relevant ones trigger the function. Uses SNS subscription filter policy syntax.
- `onDeliveryFailure` — route failed deliveries to an SQS queue for inspection. Reference a queue by `sqsQueueName` (same stack) or `sqsQueueArn` (external).


Example (TypeScript):

```typescript
import {
  defineConfig,
  SnsTopic,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const notifications = new SnsTopic({});

  const handler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    memory: 512,
    timeout: 30,
    events: [
      {
        type: 'sns',
        properties: {
          snsTopicName: 'notifications'
        }
      }
    ]
  });

  return {
    resources: { notifications, handler }
  };
});
```


The Lambda handler receives the message in the `Records` array. Each record wraps the original message inside `Sns.Message`:

```typescript
export const handler = async (event: { Records: Array<{ Sns: { Message: string; MessageId: string } }> }) => {
  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message);
    console.info(`Processing message ${record.Sns.MessageId}:`, message);
  }
};
```

## Connecting to other resources

Workloads that support `connectTo`, such as [Lambda functions](/resources/compute/lambda-function), [web services](/resources/compute/web-service), [worker services](/resources/compute/worker-service), and [multi-container workloads](/resources/compute/multi-container-workload), can connect to an SNS topic. For an `SnsTopic`, `connectTo` grants publish and subscribe permissions and injects `ARN` and `NAME` environment variables.

For a topic named `notifications`, the injected environment variables are:

| Environment variable | Description |
|---|---|
| `STP_NOTIFICATIONS_ARN` | The topic's Amazon Resource Name (use this with the AWS SDK to publish messages) |
| `STP_NOTIFICATIONS_NAME` | The topic name |

For more details on `connectTo`, see [Connecting resources](/configuration/connecting-resources).


Example (TypeScript):

```typescript
import {
  defineConfig,
  SnsTopic,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const notifications = new SnsTopic({});

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    connectTo: ['notifications'],
    memory: 512,
    timeout: 30
  });

  return {
    resources: { notifications, api }
  };
});
```


Publishing a message from the connected Lambda function:

```typescript
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const sns = new SNSClient({});

export const handler = async (event: any) => {
  await sns.send(new PublishCommand({
    TopicArn: process.env.STP_NOTIFICATIONS_ARN,
    Message: JSON.stringify({ type: 'order-placed', orderId: '456' }),
    Subject: 'New Order'
  }));

  return { statusCode: 200, body: 'Notification sent' };
};
```

## Referenceable parameters


## Referenceable Parameters: `sns-topic`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |


## API Reference


## API Reference: `SnsTopicProps`
```typescript
type SnsTopicProps = {
  /** Automatically deduplicates messages based on content (SHA-256 hash) within a 5-minute window. */
  contentBasedDeduplication?: boolean;
  /** Guarantees message order and exactly-once delivery. Use for financial transactions, sequential workflows. */
  fifoEnabled?: boolean;
  /** Sender name shown on SMS messages sent to subscribers (e.g., &quot;MyApp&quot;). Max 11 characters. */
  smsDisplayName?: string;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `contentBasedDeduplication` | no | `boolean` | Automatically deduplicates messages based on content (SHA-256 hash) within a 5-minute window. Saves you from generating a unique deduplication ID for each message. Requires `fifoEnabled: true`. | `false` |
| `fifoEnabled` | no | `boolean` | Guarantees message order and exactly-once delivery. Use for financial transactions, sequential workflows. FIFO topics can only deliver to FIFO SQS queues (not email, SMS, or HTTP).
Requires either `contentBasedDeduplication: true` or a unique `MessageDeduplicationId` per message. | `false` |
| `smsDisplayName` | no | `string` | Sender name shown on SMS messages sent to subscribers (e.g., &quot;MyApp&quot;). Max 11 characters. | - |


## FAQ

### When should I use an SNS topic vs an SQS queue?

Use an SNS topic when you need fan-out — multiple subscribers each receiving a copy of every message. Use an [SQS queue](/resources/messaging/sqs-queue) when you have one consumer processing messages at its own pace. A common pattern combines both: SNS fans out to multiple SQS queues, giving each consumer its own buffer and independent retry behavior.

### How does Amazon SNS pricing work?

Amazon SNS uses pay-per-publish pricing with no minimum fee. The first 1 million publishes per month are included in the AWS Free Tier. After that, you pay per million publishes. SMS and email deliveries have separate per-message charges that vary by destination country. Check current AWS SNS pricing for exact regional rates.

### What subscriber types does SNS support?

Standard SNS topics can deliver to Lambda functions, SQS queues, HTTP/HTTPS endpoints, email addresses, and SMS phone numbers. FIFO topics can only deliver to FIFO SQS queues, not to email, SMS, or HTTP subscribers. In Stacktape, Lambda subscriptions are configured using [SNS triggers](/configuration/triggers/sns-events) on the Lambda function — not on the topic itself.

### What is the maximum message size for SNS?

The maximum SNS message size is 256 KB. For larger payloads, store the data in an [S3 bucket](/resources/storage/s3-bucket) and include the S3 key in the SNS message body. Both standard and FIFO topics share this 256 KB limit.

### How do I filter messages so subscribers only receive relevant ones?

Use `filterPolicy` on the [SNS trigger](/configuration/triggers/sns-events) to filter messages by their attributes. Only messages whose attributes match the filter policy are delivered to that subscriber. This reduces unnecessary Lambda invocations and processing costs. For richer content-based routing with nested pattern matching, consider an [EventBridge event bus](/resources/messaging/event-bus).

### Can I use SNS with container services?

Yes. Use `connectTo` on a [web service](/resources/compute/web-service), [worker service](/resources/compute/worker-service), or [multi-container workload](/resources/compute/multi-container-workload) to get SNS permissions and the topic ARN injected as environment variables. Your container publishes messages using the AWS SDK. For subscribing containers to SNS messages, route them through an [SQS queue](/resources/messaging/sqs-queue) and poll from the container.

### What happens if a subscriber is offline when a message is published?

For Lambda subscribers, Amazon SNS retries delivery with exponential backoff. For SQS and HTTP/S subscribers, Amazon SNS follows its delivery retry policy — retrying over a period of time before giving up. If all retries fail, the message is lost unless you configure `onDeliveryFailure` on the SNS trigger to route failed messages to an SQS dead-letter queue for later inspection.

### SNS topic vs EventBridge event bus — which should I use?

Use an SNS topic for straightforward fan-out where each subscriber receives every message (or uses basic attribute filtering). Use an [EventBridge event bus](/resources/messaging/event-bus) when you need content-based routing with rich pattern matching, schema discovery, or integration with AWS service events. EventBridge is more flexible for routing but has lower throughput limits than SNS.

### Can I send SMS messages with an SNS topic?

Yes. Standard SNS topics support SMS delivery — set `smsDisplayName` (max 11 characters) to customize the sender name shown on messages. SMS has separate per-message charges that vary by destination country. FIFO topics do not support SMS delivery. SMS sending may require additional AWS account-level configuration depending on your destination countries.

### How do I handle message ordering with SNS?

Standard SNS topics use best-effort ordering — messages may arrive out of order at subscribers. For strict ordering, create a FIFO topic by setting `fifoEnabled: true`. FIFO topics guarantee message order within each message group and provide exactly-once delivery. The tradeoff is lower throughput (~300 publishes/s, or ~3,000 with batching) and the restriction that subscribers must be FIFO SQS queues only.
