# SqsIntegrationProps API Reference

## TypeScript definition

```typescript
type SqsIntegrationProps = {
  /** The maximum number of records to process in a single batch. */
  batchSize?: number;
  /** The maximum time (in seconds) to wait before invoking the function with a batch of records. */
  maxBatchWindowSeconds?: number;
  /** The most function instances this queue may run at the same time. */
  maximumConcurrency?: number;
  /** Lets the function report which records of a batch failed, so only those are retried. */
  reportBatchItemFailures?: boolean;
  /** The ARN of an existing SQS queue. */
  sqsQueueArn?: string;
  /** The name of an SQS queue defined in your stack's resources. */
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

## Property: `maximumConcurrency`

- Required: no
- Type: `number`

The most function instances this queue may run at the same time.

Without it, Lambda scales the function up to its concurrency limit as messages arrive. Set it to protect a
database or a third-party API from too many parallel consumers. Messages wait in the queue while the limit is
reached. Between 2 and 1000. Batch jobs ignore it.

## Property: `reportBatchItemFailures`

- Required: no
- Type: `boolean`
- Default: `false`

Lets the function report which records of a batch failed, so only those are retried.

Without it, a batch succeeds or fails as a whole. With it, the function returns
`{ batchItemFailures: [{ itemIdentifier }] }` with the IDs of the messages it could not process, and only those
return to the queue. Turn it on only when the handler returns that shape: a handler that returns nothing is treated
as having processed every message. Batch jobs ignore it.

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
