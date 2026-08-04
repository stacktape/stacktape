# EventBusOnDeliveryFailure API Reference

## TypeScript definition

```typescript
type EventBusOnDeliveryFailure = {
  /** The ARN of the SQS queue for failed events. */
  sqsQueueArn?: string;
  /** The name of an SQS queue (defined in your Stacktape configuration) for failed events. */
  sqsQueueName?: string;
};
```

## Property: `sqsQueueArn`

- Required: no
- Type: `string`

The ARN of the SQS queue for failed events.

## Property: `sqsQueueName`

- Required: no
- Type: `string`

The name of an SQS queue (defined in your Stacktape configuration) for failed events.
