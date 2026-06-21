# Event Bus

A Stacktape event bus is a serverless event router built on Amazon EventBridge. Producers publish structured events and pattern-based rules route each event to one or more targets — [Lambda functions](/resources/compute/lambda-function), [SQS queues](/resources/messaging/sqs-queue), and [batch jobs](/resources/compute/batch-job). You pay per event with no capacity to manage.

## When to use

Use an event bus when you need to route events to multiple independent consumers based on event content. Common scenarios:

- **Fan-out by event type** — a single order service publishes `OrderPlaced`, `OrderShipped`, and `OrderCancelled` events. Separate [Lambda functions](/resources/compute/lambda-function) handle each event type independently without the producer knowing about them.
- **Cross-service decoupling** — services publish events without knowing who consumes them. New consumers subscribe to existing event patterns without changing the producer.
- **AWS service event routing** — react to AWS infrastructure events (EC2 state changes, CodePipeline status, etc.) by routing them from the default event bus to your handlers.
- **Third-party SaaS integration** — receive events from SaaS partners (Zendesk, Auth0, Datadog) through EventBridge partner event sources.

## When NOT to use

- **Point-to-point task queues** — if you have one producer and one consumer processing work items, use an [SQS queue](/resources/messaging/sqs-queue). SQS is better for point-to-point work queues because it gives consumers queue semantics such as visibility timeouts and message polling. EventBridge is primarily an event router, not a task queue.
- **Simple pub/sub without content filtering** — if every subscriber gets every message and you do not need pattern-based routing, an [SNS topic](/resources/messaging/sns-topic) is simpler and lower cost.
- **High-throughput data streaming** — EventBridge is designed for event routing, not continuous data ingestion. For ordered, replayable data streams, use a [Kinesis stream](/resources/messaging/kinesis-stream).
- **Synchronous request-response** — EventBridge is fully asynchronous. If your caller needs an immediate response, invoke the downstream service directly or use an [HTTP API Gateway](/resources/networking/http-api-gateway).

## Basic example

The simplest event bus requires no properties at all. Stacktape creates an event bus resource for decoupling producers and consumers in your stack.


Example (TypeScript):

```typescript
import { defineConfig, EventBus } from 'stacktape';
export default defineConfig(() => {
  const orderBus = new EventBus({});

  return {
    resources: { orderBus }
  };
});
```


## Event archiving

EventBridge event archiving stores events published to the bus so you can replay them later. Replayed events are re-delivered to the bus where current rules route them to targets — useful for debugging production issues, populating a new consumer with historical data, or recovering from processing failures.

Enable archiving with `archivation.enabled`. By default, archiving is disabled. When enabled, archived events are retained indefinitely unless you set `retentionDays` — for example, 30 days keeps costs predictable while still giving you a full month of replay capability. Setting `archivation.enabled` back to `false` deletes the archive.


Example (TypeScript):

```typescript
import { defineConfig, EventBus } from 'stacktape';
export default defineConfig(() => {
  const orderBus = new EventBus({
    archivation: {
      enabled: true,
      retentionDays: 30
    }
  });

  return {
    resources: { orderBus }
  };
});
```


> **Tip:** Enable archiving for production event buses. The storage cost is low and the ability to replay events during an incident or when onboarding a new consumer is worth it. When archiving is enabled, the archive ARN is available via `$ResourceParam('orderBus', 'archiveArn')`.


## Partner event sources

Amazon EventBridge supports partner event sources — pre-built integrations with third-party SaaS providers (Zendesk, Auth0, Datadog, PagerDuty, and others). Use `eventSourceName` when you already have a partner event source name for a third-party SaaS integration.

Most teams do not need this. Set `eventSourceName` only when your integration provides a partner event source name; Stacktape exposes that name on the EventBus resource. For custom application events between your own services, a standard event bus (no `eventSourceName`) is the right choice.


Example (TypeScript):

```typescript
import { defineConfig, EventBus } from 'stacktape';
export default defineConfig(() => {
  const partnerBus = new EventBus({
    eventSourceName: 'aws.partner/example.com/1234567890/my-integration'
  });

  return {
    resources: { partnerBus }
  };
});
```


## Subscribing to events

[Lambda functions](/resources/compute/lambda-function), [batch jobs](/resources/compute/batch-job), and [SQS queues](/resources/messaging/sqs-queue) subscribe to an event bus by adding an [event bus trigger](/configuration/triggers/event-bus-events) to their `events` configuration. The trigger specifies an `eventPattern` that filters which events reach the target — only matching events invoke the consumer. You configure the subscription on the consumer resource, not on the bus itself.

Three resource types can subscribe to event bus events:

- [Lambda functions](/resources/compute/lambda-function) — invoked per matching event
- [Batch jobs](/resources/compute/batch-job) — started per matching event
- [SQS queues](/resources/messaging/sqs-queue) — matching events are delivered as messages

The `EventBusIntegrationProps` shape includes `eventPattern`, `onDeliveryFailure`, `input`, `inputPath`, and `inputTransformer`. See the [event bus trigger reference](/configuration/triggers/event-bus-events) for full details on each subscriber type.

Specify the bus using exactly one of three options: `eventBusName` for a Stacktape-managed bus in the same stack, `eventBusArn` for an external bus, or `useDefaultBus` for the default AWS event bus. The `eventPattern` property filters events by `source`, `detail-type`, `detail`, and other fields — see the [event bus trigger reference](/configuration/triggers/event-bus-events) for the full pattern syntax.


Example (TypeScript):

```typescript
import {
  defineConfig,
  EventBus,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const orderBus = new EventBus({});

  const orderProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/order-processor.ts'
    }),
    memory: 512,
    timeout: 30,
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
    resources: { orderBus, orderProcessor }
  };
});
```


For Lambda targets, EventBridge delivers the event object to the handler. The business payload is conventionally in `event.detail`:

```typescript
export const handler = async (event: {
  source: string;
  'detail-type': string;
  detail: { orderId: string; amount: number };
}) => {
  const { orderId, amount } = event.detail;
  console.info(`Processing order ${orderId} for $${amount}`);
  // Process the order...
};
```


> **Warning:** Each event bus rule is evaluated independently. If two Lambda functions subscribe to the same event pattern, both are invoked — there is no competing-consumer behavior like SQS. Design your consumers to handle this fan-out.


### Delivery failures

In rare delivery-failure cases, `onDeliveryFailure` can route failed events to an [SQS queue](/resources/messaging/sqs-queue). Use either `sqsQueueName` for a queue in the same stack or `sqsQueueArn` for an external queue. For critical workflows, configure `onDeliveryFailure` with an SQS queue so failed deliveries have a destination you can inspect and retry from.

The trigger also supports payload shaping with `input`, `inputPath`, and `inputTransformer` to customize the event before it reaches the target. See the [event bus trigger reference](/configuration/triggers/event-bus-events) and the API reference below for those options.

## Connecting to other resources

Use `connectTo` on a workload that supports resource access — such as a [Lambda function](/resources/compute/lambda-function), [web service](/resources/compute/web-service), [worker service](/resources/compute/worker-service), or [batch job](/resources/compute/batch-job) — to grant it permission to publish events to the bus. Stacktape adds the required IAM permissions and injects the bus ARN as an environment variable.

For a bus named `orderBus`, the injected environment variable is:

| Environment variable | Description |
|---|---|
| `STP_ORDER_BUS_ARN` | The event bus Amazon Resource Name — use with the AWS SDK to publish events |

For more details on `connectTo`, see [Connecting resources](/configuration/connecting-resources).


Example (TypeScript):

```typescript
import {
  defineConfig,
  EventBus,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const orderBus = new EventBus({});

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    connectTo: ['orderBus'],
    memory: 512,
    timeout: 30
  });

  return {
    resources: { orderBus, api }
  };
});
```


Publishing an event from the connected Lambda function:

```typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const client = new EventBridgeClient({});

export const handler = async () => {
  await client.send(new PutEventsCommand({
    Entries: [{
      EventBusName: process.env.STP_ORDER_BUS_ARN,
      Source: 'order-service',
      DetailType: 'OrderPlaced',
      Detail: JSON.stringify({ orderId: '12345', amount: 99.99 })
    }]
  }));

  return { statusCode: 200, body: 'Event published' };
};
```

## Referenceable parameters


## Referenceable Parameters: `event-bus`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `arn` | Arn of the event bus | `$ResourceParam("<<resource-name>>", "arn")` |
| `archiveArn` | Arn of the event bus archive (available only if the archivation is enabled) | `$ResourceParam("<<resource-name>>", "archiveArn")` |


## API Reference


## API Reference: `EventBusProps`
```typescript
import type { EventBusArchivation } from 'stacktape';

type EventBusProps = {
  /** Archive events to store and replay them later. Useful for debugging, testing, or error recovery. */
  archivation?: EventBusArchivation;
  /** Partner event source name. Only needed for receiving events from third-party SaaS integrations. */
  eventSourceName?: string;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `archivation` | no | `EventBusArchivation` | Archive events to store and replay them later. Useful for debugging, testing, or error recovery. | - |
| `eventSourceName` | no | `string` | Partner event source name. Only needed for receiving events from third-party SaaS integrations. | - |


## FAQ

### When should I use an event bus vs an SQS queue?

Use an event bus when you need content-based routing to multiple independent consumers — each consumer sees only the events that match its pattern. Use an [SQS queue](/resources/messaging/sqs-queue) when you have a single consumer processing work items from a queue, and you need built-in retry, dead-letter queues, and visibility timeouts. A common pattern combines both: the event bus routes events to SQS queues, giving each consumer its own buffer.

### When should I use an event bus vs an SNS topic?

Both support fan-out to multiple consumers. An event bus excels at content-based routing — you can filter events by source, type, and nested payload fields without extra code. An [SNS topic](/resources/messaging/sns-topic) is simpler when every subscriber should receive every message or you only need basic attribute filtering. SNS also supports SMS and email delivery, which EventBridge does not.

### How does Amazon EventBridge pricing work?

EventBridge uses pay-per-event pricing with no minimum fee. Custom event buses charge per million events published. Events matched by rules and delivered to targets are included at no additional charge. Archive and replay incur separate storage and replay costs. The pricing model makes EventBridge cost-effective for moderate event volumes but worth monitoring for high-throughput workloads.

### What is the maximum event size for EventBridge?

Amazon EventBridge accepts events up to 256 KB. For larger payloads, store the data in an [S3 bucket](/resources/storage/s3-bucket) and include the S3 key in the event's `detail` field. The consumer retrieves the full payload from S3 when processing the event.

### Can I replay archived events?

Yes. When [event archiving](#event-archiving) is enabled, you can replay archived events through the AWS Console or API. Replayed events are re-delivered to the bus and processed by current rules — if you have added new consumers since the events were originally published, those consumers will also receive the replayed events. Set `retentionDays` to control how long archived events are kept, or omit it to retain events indefinitely.

### Can I use the default AWS event bus instead of a custom one?

Yes. AWS provides a default event bus in every region that receives events from AWS services (EC2 state changes, CodePipeline events, etc.). When configuring an [event bus trigger](/configuration/triggers/event-bus-events), set `useDefaultBus: true` instead of `eventBusName` to subscribe to events on the default bus. You do not need to create a Stacktape EventBus resource to use the default bus.

### How do I filter events by payload content?

The `eventPattern` on an [event bus trigger](/configuration/triggers/event-bus-events) supports deep matching on the `detail` field. You can filter by exact values, prefixes, numeric ranges, and existence checks. For example, `detail: { status: ['PAID'] }` matches only events where `detail.status` is `PAID`. Combine `source` and `detail-type` filters with `detail` filters to build precise routing rules.

### What happens if an event fails to reach a target?

EventBridge retries failed deliveries for up to 24 hours with exponential backoff. If delivery still fails, the event is dropped unless you configure `onDeliveryFailure` on the [event bus trigger](/configuration/triggers/event-bus-events) to route failed events to an [SQS queue](/resources/messaging/sqs-queue). For critical workflows, always configure a dead-letter queue to capture undeliverable events.

### Can container services subscribe to event bus events?

Container services ([web service](/resources/compute/web-service), [worker service](/resources/compute/worker-service)) cannot directly subscribe to event bus events as triggers. Instead, route events from the bus to an [SQS queue](/resources/messaging/sqs-queue) using an event bus trigger on the queue, then have the container poll the queue using the AWS SDK. Use `connectTo` to grant the container access to the SQS queue. This gives the container backpressure control and retry semantics.

### Event bus vs Kinesis stream — which should I use?

Use an event bus for routing discrete events to specific consumers based on content — each consumer independently receives matching events. Use a [Kinesis stream](/resources/messaging/kinesis-stream) for high-throughput, ordered data ingestion where multiple consumers independently read the same stream — analytics pipelines, real-time dashboards, and log aggregation. Kinesis charges per shard-hour regardless of traffic; EventBridge charges per event published.
