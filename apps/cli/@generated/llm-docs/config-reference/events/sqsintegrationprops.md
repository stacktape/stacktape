# SqsIntegrationProps API Reference

## TypeScript definition

```typescript
type SqsIntegrationProps = {
  /** The maximum number of records to process in a single batch. */
  batchSize?: number;
  /** The maximum time (in seconds) to wait before invoking the function with a batch of records. */
  maxBatchWindowSeconds?: number;
  /** The ARN of an existing SQS queue. */
  sqsQueueArn?: string;
  /** The name of an SQS queue defined in your stack&#39;s resources. */
  sqsQueueName?: string;
};
```

## Property: `batchSize`

- Required: no
- Type: `number`
- Default: `10`

The maximum number of records to process in a single batch.

Maximum is 10,000.

## Property: `maxBatchWindowSeconds`

- Required: no
- Type: `number`

The maximum time (in seconds) to wait before invoking the function with a batch of records.

Maximum is 300 seconds. If not set, the function is invoked as soon as messages are available.

## Property: `sqsQueueArn`

- Required: no
- Type: `string`

The ARN of an existing SQS queue.

Use this to consume messages from a queue that is not managed by your stack.
You must specify either `sqsQueueName` or `sqsQueueArn`.

## Property: `sqsQueueName`

- Required: no
- Type: `string`

The name of an SQS queue defined in your stack's resources.

You must specify either `sqsQueueName` or `sqsQueueArn`.
