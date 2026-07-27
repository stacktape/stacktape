# KinesisIntegrationProps API Reference

## TypeScript definition

```typescript
import type { DestinationOnFailure } from 'stacktape';

type KinesisIntegrationProps = {
  /** Automatically creates a dedicated stream consumer for this integration. */
  autoCreateConsumer?: boolean;
  /** The maximum number of records to process in a single batch. */
  batchSize?: number;
  /** Splits a failed batch in two before retrying. */
  bisectBatchOnFunctionError?: boolean;
  /** The ARN of a specific stream consumer to use. */
  consumerArn?: string;
  /** The name of a Kinesis stream defined in your stack&#39;s resources. */
  kinesisStreamName?: string;
  /** The maximum time (in seconds) to wait before invoking the function with a batch of records. */
  maxBatchWindowSeconds?: number;
  /** The number of times to retry a failed batch of records. */
  maximumRetryAttempts?: number;
  /** A destination (SQS queue or SNS topic) for batches that fail after all retry attempts. */
  onFailure?: DestinationOnFailure;
  /** The number of batches to process concurrently from the same shard. */
  parallelizationFactor?: number;
  /** The position in the stream from which to start reading records. */
  startingPosition?: "LATEST" | "TRIM_HORIZON";
  /** The ARN of an existing Kinesis stream to consume records from. */
  streamArn?: string;
};
```

## Property: `autoCreateConsumer`

- Required: no
- Type: `boolean`

Automatically creates a dedicated stream consumer for this integration.

This is recommended for minimizing latency and maximizing throughput.
For more details, see the [AWS documentation on stream consumers](https://docs.aws.amazon.com/streams/latest/dev/amazon-kinesis-consumers.html).
This cannot be used with `consumerArn`.

## Property: `batchSize`

- Required: no
- Type: `number`
- Default: `10`

The maximum number of records to process in a single batch.

Maximum is 10,000.

## Property: `bisectBatchOnFunctionError`

- Required: no
- Type: `boolean`

Splits a failed batch in two before retrying.

This can be useful if a failure is caused by a batch being too large.

## Property: `consumerArn`

- Required: no
- Type: `string`

The ARN of a specific stream consumer to use.

This cannot be used with `autoCreateConsumer`.

## Property: `kinesisStreamName`

- Required: no
- Type: `string`

The name of a Kinesis stream defined in your stack's resources.

You must specify either `kinesisStreamName` or `streamArn`.

## Property: `maxBatchWindowSeconds`

- Required: no
- Type: `number`

The maximum time (in seconds) to wait before invoking the function with a batch of records.

Maximum is 300 seconds.

## Property: `maximumRetryAttempts`

- Required: no
- Type: `number`

The number of times to retry a failed batch of records.

**Important:** If an error occurs, the entire batch is retried, including records that were processed successfully. Your function should be idempotent to handle this.

## Property: `onFailure`

- Required: no
- Type: `DestinationOnFailure`

A destination (SQS queue or SNS topic) for batches that fail after all retry attempts.

## Property: `parallelizationFactor`

- Required: no
- Type: `number`

The number of batches to process concurrently from the same shard.

## Property: `startingPosition`

- Required: no
- Type: `string: "LATEST" | "TRIM_HORIZON"`
- Default: `TRIM_HORIZON`

The position in the stream from which to start reading records.

`LATEST`: Read only new records.
`TRIM_HORIZON`: Read all available records from the beginning of the stream.

## Property: `streamArn`

- Required: no
- Type: `string`

The ARN of an existing Kinesis stream to consume records from.

Use this to consume from a stream that is not managed by your stack.
You must specify either `kinesisStreamName` or `streamArn`.
