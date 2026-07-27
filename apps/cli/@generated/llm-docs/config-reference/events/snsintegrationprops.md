# SnsIntegrationProps API Reference

## TypeScript definition

```typescript
import type { SnsOnDeliveryFailure } from 'stacktape';

type SnsIntegrationProps = {
  /** Filter messages by attributes so only relevant ones trigger the function. */
  filterPolicy?: unknown;
  /** A destination for messages that fail to be delivered to the target. */
  onDeliveryFailure?: SnsOnDeliveryFailure;
  /** The ARN of an existing SNS topic. */
  snsTopicArn?: string;
  /** The name of an SNS topic defined in your stack&#39;s resources. */
  snsTopicName?: string;
};
```

## Property: `filterPolicy`

- Required: no
- Type: `unknown`

Filter messages by attributes so only relevant ones trigger the function.

Uses SNS subscription filter policy syntax. For content-based filtering, use EventBridge instead.

## Property: `onDeliveryFailure`

- Required: no
- Type: `SnsOnDeliveryFailure`

A destination for messages that fail to be delivered to the target.

In rare cases (e.g., if the target function cannot scale fast enough), a message might fail to be delivered.
This property specifies an SQS queue where failed messages will be sent.

## Property: `snsTopicArn`

- Required: no
- Type: `string`

The ARN of an existing SNS topic.

Use this to subscribe to a topic that is not managed by your stack.
You must specify either `snsTopicName` or `snsTopicArn`.

## Property: `snsTopicName`

- Required: no
- Type: `string`

The name of an SNS topic defined in your stack's resources.

You must specify either `snsTopicName` or `snsTopicArn`.
