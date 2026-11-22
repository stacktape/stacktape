# SNS events

An `sns` event subscribes a [Lambda function](/resources/compute/lambda-function) to an
[SNS topic](/resources/messaging/sns-topic). Every message published to the topic invokes the function with its own
copy. Use it to fan one event out to several independent consumers: an order is placed, and billing, inventory and email
each get the message.

With a single consumer, an [SQS queue](/resources/triggers/sqs-events) is simpler and adds batching and retention. To
route on fields inside the message body, use an [event bus](/resources/triggers/event-bus-events). Batch jobs accept
`sns` events too.

## Basic example


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  SnsTopic,
  SnsIntegration,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const orderEvents = new SnsTopic({});

  const sendReceipt = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/send-receipt.ts'
    }),
    events: [
      new SnsIntegration({
        snsTopicName: 'orderEvents'
      })
    ]
  });

  return {
    resources: { orderEvents, sendReceipt }
  };
});
```


`snsTopicName` is the topic's key under `resources`. Add the same integration to more functions to fan out. For a
topic that another stack or account owns, use `snsTopicArn` instead. A topic in another account must allow your account
to subscribe in its access policy.

The function receives the standard Lambda SNS event. Each record carries one published message as a string:

```typescript
type SnsRecord = { Sns: { MessageId: string; Message: string; Subject?: string; Timestamp: string } };

export default async (event: { Records: SnsRecord[] }) => {
  for (const record of event.Records) {
    const order = JSON.parse(record.Sns.Message);
    await sendReceipt(order);
  }
};
```

After `stacktape deploy`, publish a test message:

```bash
stacktape param get orderEvents arn --stage dev --region eu-west-1
```

```bash
aws sns publish --topic-arn <topic-arn> --message '{"orderId":"42"}'
```

```bash
stacktape logs sendReceipt --stage dev
```

## Filter messages

A `filterPolicy` makes SNS skip the function for messages that don't match. The function isn't invoked and you don't pay
for it.

```typescript
new SnsIntegration({
  snsTopicName: 'orderEvents',
  filterPolicy: {
    orderType: ['premium', 'enterprise'],
    amount: [{ numeric: ['>=', 1000] }]
  }
})
```

The policy matches **message attributes**, the key-value metadata the publisher sets when it calls `Publish`. A field
with the same name inside the JSON body doesn't match. The
[AWS filter policy reference](https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html) lists
the operators.

## Failures and retries

SNS invokes the function asynchronously. If the function throws, Lambda retries it twice and then drops the message.
To keep messages that still fail, set `destinations.onFailure` on the
[function](/resources/compute/lambda-function#api-ref_lambda-function-props--destinations) to an SQS queue or SNS topic.
SNS can also deliver a message more than once, so write the handler to be idempotent.

`onDeliveryFailure` covers a different, rarer case: SNS can't hand the message to Lambda at all, for example because the
function was deleted or its permission is missing. It names an SQS queue for those messages:

```typescript
new SnsIntegration({
  snsTopicName: 'orderEvents',
  onDeliveryFailure: { sqsQueueName: 'undeliveredOrders' }
})
```

## FIFO topics

A FIFO topic keeps the order of messages in a message group, but it delivers only to SQS queues, not to Lambda. For
ordered fan-out, subscribe a FIFO [SQS queue](/resources/messaging/sqs-queue) per consumer and give each consumer an
[SQS event](/resources/triggers/sqs-events). A FIFO topic can also deliver to standard queues, but those don't keep the
order or remove duplicates.

## Configuration reference


### Definition: `SnsIntegrationProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/events` with definition name `SnsIntegrationProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `filterPolicy` | no | `unknown` | - |
| `onDeliveryFailure` | no | `SnsOnDeliveryFailure` | - |
| `snsTopicArn` | no | `string` | - |
| `snsTopicName` | no | `string` | - |


## SNS events FAQ

### Does the SNS trigger support batching?

No. SNS invokes the function per message, and the integration has no `batchSize`. To process messages in batches,
subscribe an SQS queue to the topic and consume the queue with an [SQS event](/resources/triggers/sqs-events). The
queue also keeps messages while the consumer is down.

### What does it cost?

For a standard topic, AWS charges per publish request ($0.50 per million in US East after the first million each month)
and nothing for delivery to Lambda or SQS. A FIFO topic is billed per published and delivered message and per GB of
payload. See [SNS pricing](https://aws.amazon.com/sns/pricing/).

## Next steps

- [SNS topic](/resources/messaging/sns-topic): create the topic, FIFO and publishing from your code.
- [SQS events](/resources/triggers/sqs-events): durable, batched processing behind a topic.
- [Event bus events](/resources/triggers/event-bus-events): route on the content of the event.
