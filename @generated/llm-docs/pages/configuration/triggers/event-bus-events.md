# Event Bus Events

Stacktape event bus events trigger compute resources when an event matching a pattern arrives on an Amazon EventBridge event bus. EventBridge is a serverless event router — you publish structured JSON events to a bus, define filter patterns, and EventBridge delivers matching events to your targets. Stacktape configures the EventBridge rule and target integration declaratively.

## When to use

Event bus triggers are the right choice when your architecture needs **content-based event routing**. Instead of each consumer polling or subscribing to a raw stream, producers publish structured events to a bus and patterns decide which targets fire.

Common scenarios:

- **Decoupled microservices** — services emit domain events (`OrderPlaced`, `PaymentFailed`) without knowing who consumes them. Functions subscribe by pattern and react independently.
- **Reacting to AWS service events** — EC2 state changes, CodePipeline failures, S3 operations via CloudTrail, and hundreds of other AWS signals land on the default event bus automatically. Use `useDefaultBus` to tap into them.
- **Cross-account or cross-region routing** — EventBridge natively supports forwarding events between accounts and regions, making it the standard for multi-account event architectures.

## When NOT to use

Event bus triggers add a pattern-matching routing layer. If your use case doesn't need content-based filtering, a simpler integration is usually better.

| Scenario | Better alternative |
|---|---|
| Point-to-point messaging with batching and retries | [SQS queue trigger](/configuration/triggers/sqs-events) — configurable batch sizes, visibility timeouts, built-in deduplication |
| Fan-out where every subscriber gets every message | [SNS trigger](/configuration/triggers/sns-events) — simpler pub/sub without pattern syntax |
| High-throughput ordered streaming with replay | [Kinesis trigger](/configuration/triggers/kinesis-events) — per-shard ordering and built-in replay |
| Payloads larger than 256 KB | Store data in [S3](/resources/storage/s3-bucket) and pass a reference through any event source |

## Basic example

This example creates a custom [event bus](/resources/messaging/event-bus) and a [Lambda function](/resources/compute/lambda-function) that triggers whenever an event with `detail-type` of `"OrderPlaced"` arrives from the `"my-app.orders"` source. Stacktape configures the EventBridge rule and target integration.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  EventBus,
  EventBusIntegration
} from 'stacktape';
export default defineConfig(() => {
  const orderBus = new EventBus({});

  const orderProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/order-processor.ts'
    }),
    events: [
      new EventBusIntegration({
        eventBusName: 'orderBus',
        eventPattern: {
          source: ['my-app.orders'],
          'detail-type': ['OrderPlaced']
        }
      })
    ]
  });

  return {
    resources: { orderBus, orderProcessor }
  };
});
```


The `eventPattern` property is required on every event bus integration. It controls which events reach your target — only events whose fields match all specified pattern conditions are delivered. Unspecified fields are treated as wildcards.

Use `EventBusIntegration` in the `events` array of resources that support event-bus triggers, such as [Lambda functions](/resources/compute/lambda-function) and [batch jobs](/resources/compute/batch-job).

## Choosing the event source

Choose one of `eventBusName`, `eventBusArn`, or `useDefaultBus` when binding to a bus. You must specify only one of these three properties.

| Property | Use when |
|---|---|
| `eventBusName` | The event bus is defined in the same Stacktape stack. Reference it by its resource name. |
| `eventBusArn` | The event bus lives outside your stack — another Stacktape stack, another AWS account, or a manually created bus. |
| `useDefaultBus` | You want to react to AWS service events (EC2, S3 via CloudTrail, CodePipeline, etc.) that arrive on the default bus automatically. |

Most custom architectures use `eventBusName` with an [event bus resource](/resources/messaging/event-bus) in the same stack. The default AWS event bus is useful for operational automation — reacting to infrastructure events without creating any bus resource.

### Using the default AWS event bus

Every AWS account has a default event bus that receives events from AWS services automatically. Set `useDefaultBus: true` and write a pattern matching the AWS event structure. You do not need to create an event bus resource.

This example triggers a function whenever an EC2 instance enters the `stopped` state:


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  EventBusIntegration
} from 'stacktape';
export default defineConfig(() => {
  const ec2Monitor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/ec2-monitor.ts'
    }),
    events: [
      new EventBusIntegration({
        useDefaultBus: true,
        eventPattern: {
          source: ['aws.ec2'],
          'detail-type': ['EC2 Instance State-change Notification'],
          detail: {
            state: ['stopped']
          }
        }
      })
    ]
  });

  return {
    resources: { ec2Monitor }
  };
});
```


### Using an external event bus

When the event bus is managed outside your stack — in another Stacktape project, another AWS account, or created manually — use `eventBusArn` with the full ARN:


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  EventBusIntegration
} from 'stacktape';
export default defineConfig(() => {
  const crossAccountHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/cross-account-handler.ts'
    }),
    events: [
      new EventBusIntegration({
        eventBusArn: 'arn:aws:events:eu-west-1:123456789012:event-bus/shared-bus',
        eventPattern: {
          source: ['partner-service'],
          'detail-type': ['InvoiceCreated']
        }
      })
    ]
  });

  return {
    resources: { crossAccountHandler }
  };
});
```


## Event patterns

The `eventPattern` is the core of every event bus integration. It defines a filter that EventBridge evaluates against each event on the bus. Only events where **every specified field matches** are delivered. Fields you omit act as wildcards — they match any value.

### Pattern fields

| Field | Purpose | Example value |
|---|---|---|
| `source` | Application or AWS service that produced the event | `['my-app.orders']`, `['aws.ec2']` |
| `detail-type` | Category or type of the event — the primary routing field for custom events | `['OrderPlaced', 'OrderCancelled']` |
| `detail` | Nested payload content — supports prefix, suffix, numeric, and exists operators | `{ status: ['ACTIVE'] }` |
| `account` | AWS account ID the event originated from | `['123456789012']` |
| `region` | AWS region the event originated from | `['eu-west-1']` |
| `resources` | ARN(s) of AWS resources related to the event | `['arn:aws:ec2:...']` |
| `version` | Event schema version | `['1']` |
| `replay-name` | Present only on replayed events (for event replay filtering) | `['my-replay']` |

**Matching logic:** Within a single field, the event matches if its value equals **any** value in the array (OR logic). Across fields, **all** specified fields must match (AND logic).

### Content-based filtering with detail

The `detail` field goes beyond simple equality. You can match on nested object paths and use advanced comparison operators. This is what makes EventBridge more expressive than SNS filter policies for complex routing.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  EventBus,
  EventBusIntegration
} from 'stacktape';
export default defineConfig(() => {
  const orderBus = new EventBus({});

  const highValueHandler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/high-value-handler.ts'
    }),
    events: [
      new EventBusIntegration({
        eventBusName: 'orderBus',
        eventPattern: {
          'detail-type': ['OrderPlaced'],
          detail: {
            amount: [{ numeric: ['>', 1000] }],
            region: ['US', 'EU']
          }
        }
      })
    ]
  });

  return {
    resources: { orderBus, highValueHandler }
  };
});
```


This function fires only for `OrderPlaced` events where `detail.amount` exceeds 1000 **and** `detail.region` is `US` or `EU`. The `numeric` operator is one of several advanced operators that EventBridge supports — others include `prefix`, `suffix`, `anything-but`, and `exists`. For the full pattern syntax, see the [AWS EventBridge documentation on event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).

## Payload transformation

By default, EventBridge delivers the full event envelope to your target. The envelope includes metadata fields like `source`, `account`, `time`, and `region` alongside your `detail` payload. You can customize what gets delivered using one of three mutually exclusive options. You can only use one of `input`, `inputPath`, or `inputTransformer` on an event bus integration.

### Fixed input

Use `input` to replace the event payload entirely with a static JSON object. The target receives this object regardless of the actual event content. Useful when your function only needs to know it was triggered — for example, a cleanup task that runs on any order event.

Set `input: { task: 'processOrders', priority: 'high' }` and the function always receives `{"task":"processOrders","priority":"high"}`.

### JSONPath extraction

Use `inputPath` to forward only a specific portion of the event. The value is a JSONPath expression evaluated against the event envelope.

Set `inputPath: '$.detail'` to deliver just the `detail` object, stripping the EventBridge metadata (`source`, `account`, `time`, `region`, etc.). This is the most common transformation — most handlers only care about the business payload.

### Input transformer

Use `inputTransformer` when you need to extract multiple values from the event and assemble a custom payload. It has two parts:

- **`inputPathsMap`** — a dictionary mapping placeholder names to JSONPath expressions that extract values from the event.
- **`inputTemplate`** — a template that references those placeholders to build the final payload.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  EventBus,
  EventBusIntegration
} from 'stacktape';
export default defineConfig(() => {
  const orderBus = new EventBus({});

  const notifier = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/notifier.ts'
    }),
    events: [
      new EventBusIntegration({
        eventBusName: 'orderBus',
        eventPattern: {
          'detail-type': ['OrderPlaced']
        },
        inputTransformer: {
          inputPathsMap: {
            orderId: '$.detail.orderId',
            customer: '$.detail.customerName'
          },
          inputTemplate: {
            message: 'Order <orderId> placed by <customer>.'
          }
        }
      })
    ]
  });

  return {
    resources: { orderBus, notifier }
  };
});
```


For an incoming event whose `detail.orderId` is `12345` and `detail.customerName` is `Jane`, the function receives `{"message":"Order 12345 placed by Jane."}` instead of the full EventBridge event envelope. Placeholders in angle brackets (`<orderId>`, `<customer>`) are replaced with the values extracted by `inputPathsMap`.

## Delivery failure handling

In rare cases — such as when your Lambda function is throttled or unavailable — EventBridge may fail to deliver an event. Use `onDeliveryFailure` to route failed events to an [SQS queue](/resources/messaging/sqs-queue) so they are not silently dropped. Use `sqsQueueName` for a queue defined in the same Stacktape configuration, or `sqsQueueArn` for an existing queue ARN.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  EventBus,
  EventBusIntegration,
  SqsQueue
} from 'stacktape';
export default defineConfig(() => {
  const orderBus = new EventBus({});
  const dlq = new SqsQueue({});

  const orderProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/order-processor.ts'
    }),
    events: [
      new EventBusIntegration({
        eventBusName: 'orderBus',
        eventPattern: {
          'detail-type': ['OrderPlaced']
        },
        onDeliveryFailure: {
          sqsQueueName: 'dlq'
        }
      })
    ]
  });

  return {
    resources: { orderBus, dlq, orderProcessor }
  };
});
```


> **Tip:** Set up an [alarm](/observability/alarms) on the dead-letter queue's message count so your team gets notified when deliveries fail. Even a simple threshold alarm (messages > 0) catches problems early.


Without `onDeliveryFailure`, AWS EventBridge retries failed deliveries for up to 24 hours by default before dropping the event. For production workloads, always configure a dead-letter queue to preserve events for later inspection or reprocessing.

## API reference


## API Reference: `EventBusIntegrationProps`
```typescript
import type { EventBusIntegrationPattern, EventBusOnDeliveryFailure, EventInputTransformer } from 'stacktape';

type EventBusIntegrationProps = {
  /** A pattern to filter events from the event bus. */
  eventPattern: EventBusIntegrationPattern;
  /** The ARN of an existing event bus. */
  eventBusArn?: string;
  /** The name of an event bus defined in your stack&#39;s resources. */
  eventBusName?: string;
  /** A fixed JSON object to be passed as the event payload. */
  input?: unknown;
  /** A JSONPath expression to extract a portion of the event to pass to the target. */
  inputPath?: string;
  /** Customizes the event payload sent to the target. */
  inputTransformer?: EventInputTransformer;
  /** A destination for events that fail to be delivered to the target. */
  onDeliveryFailure?: EventBusOnDeliveryFailure;
  /** Uses the default AWS event bus. */
  useDefaultBus?: boolean;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `eventPattern` | yes | `EventBusIntegrationPattern` | A pattern to filter events from the event bus. Only events that match this pattern will trigger the target.
For details on the syntax, see the [AWS EventBridge documentation on event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html). | - |
| `eventBusArn` | no | `string` | The ARN of an existing event bus. Use this to subscribe to an event bus that is not managed by your stack.
You must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`. | - |
| `eventBusName` | no | `string` | The name of an event bus defined in your stack&#39;s resources. You must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`. | - |
| `input` | no | `unknown` | A fixed JSON object to be passed as the event payload. If you need to customize the payload based on the event, use `inputTransformer` instead.
You can only use one of `input`, `inputPath`, or `inputTransformer`.

Example:

```yaml
input:
  source: 'my-custom-event'
``` | - |
| `inputPath` | no | `string` | A JSONPath expression to extract a portion of the event to pass to the target. This is useful for forwarding only a specific part of the event payload.
You can only use one of `input`, `inputPath`, or `inputTransformer`.

Example:
inputPath: &#39;$.detail&#39; | - |
| `inputTransformer` | no | `EventInputTransformer` | Customizes the event payload sent to the target. This allows you to extract values from the original event and use them to construct a new payload.
You can only use one of `input`, `inputPath`, or `inputTransformer`.

Example:
inputTransformer:
  inputPathsMap:
    instanceId: &#39;$.detail.instance-id&#39;
    instanceState: &#39;$.detail.state&#39;
  inputTemplate:
    message: &#39;Instance <instanceId> is now in state <instanceState>.&#39; | - |
| `onDeliveryFailure` | no | `EventBusOnDeliveryFailure` | A destination for events that fail to be delivered to the target. In rare cases, an event might fail to be delivered. This property specifies an SQS queue where failed events will be sent. | - |
| `useDefaultBus` | no | `boolean` | Uses the default AWS event bus. You must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`. | - |


## FAQ

### What is Amazon EventBridge?

Amazon EventBridge is a serverless event bus service from AWS. It receives structured JSON events from your applications, SaaS partners, or AWS services and routes them to targets based on rules you define. Stacktape's `EventBusIntegration` lets you wire EventBridge rules to your compute resources declaratively — without managing IAM policies, rule targets, or delivery configurations by hand.

### Can I use the default AWS event bus without creating an event bus resource?

Yes. Set `useDefaultBus: true` on the integration instead of specifying `eventBusName` or `eventBusArn`. The default bus receives events from most AWS services automatically — EC2 state changes, CodePipeline transitions, GuardDuty findings, and more. No [event bus resource](/resources/messaging/event-bus) is needed in your stack.

### How much does EventBridge cost?

EventBridge charges per event published to a custom bus — approximately $1 per million events in most regions. Events from AWS services to the default bus are free. There is no charge for rules, pattern evaluation, or event delivery to targets. For workloads under a few million events per month, EventBridge cost is negligible compared to the compute cost of the target functions.

### How do I filter events by nested payload fields?

Use the `detail` field in your `eventPattern`. It supports nested object matching, prefix/suffix filters, numeric comparisons, and exists checks. For example, `detail: { status: ['ACTIVE'], amount: [{ numeric: ['>=', 100] }] }` matches events whose `detail.status` is `"ACTIVE"` and `detail.amount` is at least 100. See the [AWS event pattern documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html) for the full syntax.

### What happens if event delivery fails?

AWS EventBridge retries failed delivery for up to 24 hours by default. If delivery still fails after retries, the event is dropped — unless you configure `onDeliveryFailure` to route failed events to an [SQS queue](/resources/messaging/sqs-queue). This dead-letter queue preserves events for later inspection or reprocessing. For production workloads, always set a dead-letter queue.

### Can I transform the event before it reaches my function?

Yes. Three mutually exclusive payload options are available: `input` (a static JSON object that replaces the event), `inputPath` (a JSONPath expression to extract part of the event), and `inputTransformer` (extract multiple fields and assemble a custom payload using placeholders). The most common choice is `inputPath: '$.detail'` to strip the EventBridge envelope and forward only your business payload.

### When should I use EventBridge vs SQS?

Use EventBridge when you need **pattern-based routing** — multiple targets reacting to different subsets of events from the same bus. Use [SQS](/configuration/triggers/sqs-events) for **point-to-point messaging** — a single consumer that needs configurable batch sizes, visibility timeouts, and message-level retry. SQS is simpler and cheaper for one-producer-one-consumer workflows. EventBridge shines when the routing logic is the core concern.

### When should I use EventBridge vs SNS?

[SNS](/configuration/triggers/sns-events) delivers every message to every subscriber (fan-out). EventBridge delivers only events that match a subscriber's pattern (content-based routing). If every consumer should see every message, SNS is simpler and has lower per-message latency. If consumers only care about specific event types or payload values, EventBridge eliminates filtering logic from your application code and keeps each function focused on the events it handles.

### What is the maximum EventBridge event size?

EventBridge accepts events up to 256 KB. If your payload exceeds this limit, store the full data in an [S3 bucket](/resources/storage/s3-bucket) and include only the S3 key in the event's `detail` field. The consuming function fetches the full object from S3 at runtime. This "claim check" pattern is standard for large-payload event-driven architectures.

### Can I receive events from another AWS account?

Yes. Use `eventBusArn` to subscribe to an event bus in another AWS account. The remote bus must have a resource policy that grants your account permission to create rules on it. EventBridge natively supports cross-account event routing, making it the standard choice for multi-account architectures. See [Using an external event bus](#using-an-external-event-bus) for an example.
