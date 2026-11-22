# Event bus

An `event-bus` is an Amazon EventBridge event bus. Services publish events such as `OrderPlaced` to the bus, and rules
deliver each event to the consumers whose pattern matches it: [Lambda functions](/resources/compute/lambda-function),
[batch jobs](/resources/compute/batch-job) or [SQS queues](/resources/messaging/sqs-queue). The producer doesn't know
who listens, and a new consumer doesn't need a change to the producer. You pay $1.00 per million published events in US
East.

For one consumer working through jobs, an [SQS queue](/resources/messaging/sqs-queue) is simpler. When every subscriber
needs every message, an [SNS topic](/resources/messaging/sns-topic) is enough.

## Basic example

A bus needs no properties. Consumers subscribe with an [event bus trigger](/resources/triggers/event-bus-events), and
producers get access with `connectTo`:


Example (TypeScript):

```typescript
import { defineConfig, EventBus, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const orderBus = new EventBus({});

  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
    connectTo: [orderBus]
  });

  const orderProcessor = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/order-processor.ts' }),
    events: [
      {
        type: 'event-bus',
        properties: {
          eventBusName: 'orderBus',
          eventPattern: { source: ['order-service'], 'detail-type': ['OrderPlaced'] }
        }
      }
    ]
  });

  return {
    resources: { orderBus, api, orderProcessor }
  };
});
```


Every consumer whose pattern matches gets the event; there are no competing consumers as with SQS. Patterns, payload
transformation and failure handling are on [Event bus events](/resources/triggers/event-bus-events).

## Publish events

`connectTo` gives a workload permission to publish and injects the bus ARN. For a bus named `orderBus`, the variable is
`STP_ORDER_BUS_ARN`.

`PutEvents` can succeed as a request while individual entries fail, for example when AWS throttles them. Check
`FailedEntryCount` and retry only the failed entries:

```typescript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventBridge = new EventBridgeClient({});

const result = await eventBridge.send(
  new PutEventsCommand({
    Entries: [
      {
        EventBusName: process.env.STP_ORDER_BUS_ARN,
        Source: 'order-service',
        DetailType: 'OrderPlaced',
        Detail: JSON.stringify({ orderId: '12345', amount: 99.99 })
      }
    ]
  })
);

if (result.FailedEntryCount) {
  const failed = result.Entries?.filter((entry) => entry.ErrorCode);
  throw new Error(`EventBridge rejected ${result.FailedEntryCount} events: ${JSON.stringify(failed)}`);
}
```

One request takes up to 10 entries, and AWS limits the total size of a request (see
[PutEvents](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-putevents.html)). For large payloads, upload the
data to an [S3 bucket](/resources/storage/s3-bucket) and put the object key in `Detail`.

The consumer receives the whole event. Your data is in `detail`:

```typescript
export default async (event: { source: string; 'detail-type': string; detail: { orderId: string; amount: number } }) => {
  console.info(`Order ${event.detail.orderId} for $${event.detail.amount}`);
};
```

## Archive and replay

`archivation` stores the events published to the bus so you can replay them later, for example to debug an incident
or to fill a new consumer with past events. Replayed events go through the bus again and the current rules route them.

```typescript
new EventBus({ archivation: { enabled: true, retentionDays: 30 } })
```

Without `retentionDays`, archived events are kept forever. Archive storage and replays are billed separately. Setting
`enabled` back to `false` deletes the archive. The archive's ARN is the bus's `archiveArn` parameter.

## AWS and partner events

You don't need a bus for events from AWS services: they arrive on the account's default bus. Subscribe with
`useDefaultBus: true` on the [event bus trigger](/resources/triggers/event-bus-events).

For a SaaS provider that sends events through EventBridge (Zendesk, Auth0, Datadog and others), set `eventSourceName`
to the partner event source name the provider gave you:

```typescript
new EventBus({ eventSourceName: 'aws.partner/example.com/1234567890/my-integration' })
```

## Configuration reference


### Definition: `EventBusProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/event-bus` with definition name `EventBusProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `archivation` | no | `EventBusArchivation` | - |
| `eventSourceName` | no | `string` | - |


## Referenceable parameters


## Referenceable Parameters: `event-bus`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `arn` | Arn of the event bus | `$ResourceParam("<<resource-name>>", "arn")` |
| `archiveArn` | Arn of the event bus archive (available only if the archivation is enabled) | `$ResourceParam("<<resource-name>>", "archiveArn")` |


## Event bus FAQ

### Can a container consume events?

Not as a trigger. Deliver the events to an [SQS queue](/resources/messaging/sqs-queue#deliver-eventbridge-events-to-the-queue)
with the queue's `events` property, and let a [worker service](/resources/compute/worker-service) poll that queue.

## Next steps

- [Event bus events](/resources/triggers/event-bus-events): subscribe consumers with patterns.
- [SQS queue](/resources/messaging/sqs-queue): buffer events for one consumer.
- [SNS topic](/resources/messaging/sns-topic): fan out without content routing.
