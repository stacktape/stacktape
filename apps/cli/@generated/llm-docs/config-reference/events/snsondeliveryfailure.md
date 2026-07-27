# SnsOnDeliveryFailure API Reference

## TypeScript definition

```typescript
type SnsOnDeliveryFailure = {
  /** The ARN of the SQS queue for failed messages. */
  sqsQueueArn?: string;
  /** The name of an SQS queue (defined in your Stacktape configuration) for failed messages. */
  sqsQueueName?: string;
};
```

## Property: `sqsQueueArn`

- Required: no
- Type: `string`

The ARN of the SQS queue for failed messages.

## Property: `sqsQueueName`

- Required: no
- Type: `string`

The name of an SQS queue (defined in your Stacktape configuration) for failed messages.
