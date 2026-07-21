# DynamoDbIntegrationProps API Reference

## TypeScript definition

```typescript
import type { DestinationOnFailure } from 'stacktape';

type DynamoDbIntegrationProps = {
  /** The ARN of the DynamoDB table stream. */
  streamArn: string;
  /** The maximum number of records to process in a single batch. */
  batchSize?: number;
  /** Splits a failed batch in two before retrying. */
  bisectBatchOnFunctionError?: boolean;
  /** The maximum time (in seconds) to wait before invoking the function with a batch of records. */
  maxBatchWindowSeconds?: number;
  /** The number of times to retry a failed batch of records. */
  maximumRetryAttempts?: number;
  /** A destination (SQS queue or SNS topic) for batches that fail after all retry attempts. */
  onFailure?: DestinationOnFailure;
  /** The number of batches to process concurrently from the same shard. */
  parallelizationFactor?: number;
  /** The position in the stream from which to start reading records. */
  startingPosition?: string;
};
```

## Property: `streamArn`

- Required: yes
- Type: `string`

The ARN of the DynamoDB table stream.

## Property: `batchSize`

- Required: no
- Type: `number`
- Default: `100`

The maximum number of records to process in a single batch.

Maximum is 1,000.

## Property: `bisectBatchOnFunctionError`

- Required: no
- Type: `boolean`

Splits a failed batch in two before retrying.

This can be useful if a failure is caused by a batch being too large.

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
- Type: `string`
- Default: `TRIM_HORIZON`

The position in the stream from which to start reading records.

`LATEST`: Read only new records.
`TRIM_HORIZON`: Read all available records from the beginning of the stream.
