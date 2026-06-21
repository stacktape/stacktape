# DynamoDB Streams

A DynamoDB stream trigger invokes a [Lambda function](/resources/compute/lambda-function) whenever items are created, updated, or deleted in a [DynamoDB table](/resources/databases/dynamodb). Records arrive in batches from the table's change stream, giving you a real-time feed of every mutation without polling. This enables audit logs, materialized views, cross-region replication, and downstream notifications.

## When to use

DynamoDB stream triggers fit scenarios where you need to react to data changes as they happen:

- **Audit trails** — record every insert, update, and delete into a separate store with before/after snapshots.
- **Materialized views** — maintain a denormalized copy of data in another table, search index, or cache whenever the source changes.
- **Cross-service notifications** — push change events to downstream systems (email, webhooks, analytics pipelines) without coupling producers to consumers.
- **Data synchronization** — replicate changes to another region or external system with low latency.

## When NOT to use

DynamoDB stream triggers are not the right fit for every event-driven pattern. Several common scenarios are better served by other Stacktape trigger types.

- **High-throughput, multi-consumer streaming** — AWS DynamoDB Streams supports at most 2 simultaneous readers per shard and is limited to 5 `GetRecords` calls per second per shard. For fan-out to many consumers or longer retention, pipe changes into a [Kinesis stream](/configuration/triggers/kinesis-events) instead.
- **Request-response patterns** — stream processing is asynchronous. If the caller needs an immediate result, use an [HTTP trigger](/configuration/triggers/http-triggers).
- **Complex event routing** — if you need content-based filtering across many consumers, use an [EventBridge event bus](/configuration/triggers/event-bus-events) rather than writing routing logic inside the stream consumer.

## Enabling streams on the table

`DynamoDbIntegration` requires the ARN of a DynamoDB table stream via its `streamArn` property. Before attaching the trigger, enable streams on the [DynamoDB table](/resources/databases/dynamodb) — the table must have streams enabled to produce change records. See the [DynamoDB resource page](/resources/databases/dynamodb) for full details on configuring stream view types at the table level.

The stream view type determines what your handler can read off each record. For audit-and-diff workflows, choose a view that includes both before and after images so the handler has full context; for patterns where the handler reloads the item anyway, a keys-only view reduces stream record size.

Once streams are enabled, pass the stream ARN to `DynamoDbIntegration`. For tables in the same stack, use [`$ResourceParam`](/configuration/directives) to resolve the ARN at deploy time — the table's stream ARN can be resolved as a [referenceable parameter](/configuration/referenceable-parameters) (shown in the example below). For external tables, pass the ARN as a string literal.

## Same-stack table stream to Lambda example

This configuration creates a DynamoDB table with streams enabled and a Lambda function that processes every change.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  DynamoDbTable,
  DynamoDbIntegration,
  StacktapeLambdaBuildpackPackaging,
  $ResourceParam
} from 'stacktape';
export default defineConfig(() => {
  const ordersTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'id', type: 'string' }
    },
    streamType: 'NEW_AND_OLD_IMAGES'
  });

  const streamProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/process-stream.ts'
    }),
    events: [
      new DynamoDbIntegration({
        streamArn: $ResourceParam('ordersTable', 'streamArn')
      })
    ]
  });

  return {
    resources: { ordersTable, streamProcessor }
  };
});
```


The `streamArn` property is required on every `DynamoDbIntegration`. In the example above, `$ResourceParam('ordersTable', 'streamArn')` resolves the stream ARN from the table defined in the same stack — the first argument (`'ordersTable'`) must match the key in the `resources` object. See the [DynamoDB resource page](/resources/databases/dynamodb) for all [referenceable parameters](/configuration/referenceable-parameters) available on a DynamoDB table.

`startingPosition` is optional. Two values are documented: `LATEST` processes only new changes — appropriate for most real-time use cases, and `TRIM_HORIZON` processes all records still available in the stream, useful for initial backfills or reprocessing after a fix. The default is `TRIM_HORIZON`.

## Batching and throughput

DynamoDB stream triggers deliver records in batches. Your function is invoked when either of these conditions is met first:

| Property | Default | Maximum | Effect |
|---|---|---|---|
| `batchSize` | 100 | 1,000 | Maximum records per invocation |
| `maxBatchWindowSeconds` | — | 300 s | Wait time to accumulate a larger batch before invoking |

Setting `maxBatchWindowSeconds` lets you accumulate larger batches before invoking — fewer invocations at the cost of slightly higher latency. When omitted, the batching behavior depends on the underlying AWS event source mapping defaults.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  DynamoDbTable,
  DynamoDbIntegration,
  StacktapeLambdaBuildpackPackaging,
  $ResourceParam
} from 'stacktape';

export default defineConfig(() => {
  const eventsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'id', type: 'string' }
    },
    streamType: 'NEW_IMAGE'
  });

  const batchProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/batch-handler.ts'
    }),
    events: [
      new DynamoDbIntegration({
        streamArn: $ResourceParam('eventsTable', 'streamArn'),
        batchSize: 500,
        maxBatchWindowSeconds: 30
      })
    ]
  });

  return {
    resources: { eventsTable, batchProcessor }
  };
});
```


This example waits up to 30 seconds to fill a batch of 500 records. If 500 records arrive in 5 seconds, the function fires immediately with the full batch. For high-write tables, increasing `batchSize` and adding a `maxBatchWindowSeconds` window reduces invocation count and cost.

### Parallelization

By default, each shard in the DynamoDB stream is processed sequentially — one batch at a time. Set `parallelizationFactor` to process multiple batches from the same shard concurrently. This increases throughput but means records within a shard may be processed out of order.

Use parallelization when your processing logic is idempotent and order within a partition key doesn't matter (e.g., aggregating metrics). Avoid it for workflows that depend on processing events in the exact sequence they occurred.

## Retry and failure handling

When a batch fails (the function throws an error), the entire batch is retried — including records that were processed successfully. Configure retries and failure destinations directly on the `DynamoDbIntegration`.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  DynamoDbTable,
  DynamoDbIntegration,
  SqsQueue,
  StacktapeLambdaBuildpackPackaging,
  $ResourceParam
} from 'stacktape';

export default defineConfig(() => {
  const productsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'id', type: 'string' }
    },
    streamType: 'NEW_AND_OLD_IMAGES'
  });

  const dlq = new SqsQueue({});

  const processor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/processor.ts'
    }),
    events: [
      new DynamoDbIntegration({
        streamArn: $ResourceParam('productsTable', 'streamArn'),
        batchSize: 50,
        maximumRetryAttempts: 3,
        bisectBatchOnFunctionError: true,
        onFailure: {
          arn: $ResourceParam('dlq', 'arn'),
          type: 'sqs'
        }
      })
    ]
  });

  return {
    resources: { productsTable, dlq, processor }
  };
});
```


| Property | Effect |
|---|---|
| `maximumRetryAttempts` | Number of times to retry a failed batch before giving up. |
| `bisectBatchOnFunctionError` | Splits a failed batch in half and retries each half separately. Helps isolate a single "poison" record without blocking the entire batch. |
| `onFailure` | Sends failed batches to an [SQS queue](/resources/messaging/sqs-queue) or [SNS topic](/resources/messaging/sns-topic) for later investigation. Requires both `arn` and `type` (`'sqs'` or `'sns'`). |


> **Warning:** Because the entire batch is retried on failure, your handler must be idempotent — processing the same record twice should produce the same result. Use item keys or another application-level idempotency key for deduplication.


> **Tip:** Always set `maximumRetryAttempts` and `onFailure` together. Without a retry cap, a single bad record can block its shard indefinitely. Without a failure destination, you lose visibility into what failed and why.


## Processing stream records

Your Lambda handler receives an event with a `Records` array. Each record includes `eventName` (`INSERT`, `MODIFY`, or `REMOVE`) and a `dynamodb` object containing the key attributes and item images. Which images are present depends on the stream view type you configured on the table.

```typescript
const handler = async (event: { Records: Array<{
  eventName: 'INSERT' | 'MODIFY' | 'REMOVE';
  dynamodb: {
    Keys: Record<string, { S?: string; N?: string }>;
    NewImage?: Record<string, any>;
    OldImage?: Record<string, any>;
  };
}> }) => {
  for (const record of event.Records) {
    switch (record.eventName) {
      case 'INSERT':
        // New item created — NewImage has the full item
        break;
      case 'MODIFY':
        // Item updated — OldImage and NewImage available with new-and-old-images view
        break;
      case 'REMOVE':
        // Item deleted — OldImage has the item before deletion
        break;
    }
  }
};

export default handler;
```

Item images use DynamoDB's attribute value format (e.g., `{ S: 'hello' }` for strings, `{ N: '42' }` for numbers). Use the `@aws-sdk/util-dynamodb` package's `unmarshall` function to convert to plain JavaScript objects, or write a lightweight converter for the attribute types you use.

## Using an external table stream

To consume changes from a DynamoDB table not managed by your Stacktape stack, pass the stream ARN directly as a string.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  DynamoDbIntegration,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const processor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/external-processor.ts'
    }),
    events: [
      new DynamoDbIntegration({
        streamArn:
          'arn:aws:dynamodb:eu-west-1:123456789012:table/ExternalTable/stream/2024-01-15T00:00:00.000'
      })
    ]
  });

  return {
    resources: { processor }
  };
});
```


> **Warning:** When referencing a stream from an external table, ensure the consuming Lambda function's execution role has the necessary DynamoDB Streams read permissions on that stream ARN. For tables defined within the same stack, use `$ResourceParam` instead of hard-coding the ARN.


## API reference


## API Reference: `DynamoDbIntegrationProps`
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

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `streamArn` | yes | `string` | The ARN of the DynamoDB table stream. | - |
| `batchSize` | no | `number` | The maximum number of records to process in a single batch. Maximum is 1,000. | `100` |
| `bisectBatchOnFunctionError` | no | `boolean` | Splits a failed batch in two before retrying. This can be useful if a failure is caused by a batch being too large. | - |
| `maxBatchWindowSeconds` | no | `number` | The maximum time (in seconds) to wait before invoking the function with a batch of records. Maximum is 300 seconds. | - |
| `maximumRetryAttempts` | no | `number` | The number of times to retry a failed batch of records. **Important:** If an error occurs, the entire batch is retried, including records that were processed successfully. Your function should be idempotent to handle this. | - |
| `onFailure` | no | `DestinationOnFailure` | A destination (SQS queue or SNS topic) for batches that fail after all retry attempts. | - |
| `parallelizationFactor` | no | `number` | The number of batches to process concurrently from the same shard. | - |
| `startingPosition` | no | `string` | The position in the stream from which to start reading records. `LATEST`: Read only new records.
`TRIM_HORIZON`: Read all available records from the beginning of the stream. | `TRIM_HORIZON` |


## FAQ

### How do I enable DynamoDB Streams on a table?

Set the `streamType` property on your [DynamoDB table](/resources/databases/dynamodb) resource. The DynamoDB resource page documents the available stream view types and their differences. Once enabled, pass the stream ARN to your `DynamoDbIntegration` via the `streamArn` property, using `$ResourceParam` for same-stack references or a literal ARN string for external tables.

### What is the retention period for DynamoDB stream records?

AWS DynamoDB Streams retains records for 24 hours. If your Lambda function cannot process records within that window — due to errors, throttling, or the function being disabled — the records expire and are lost. Always configure `maximumRetryAttempts` and `onFailure` to capture failed records before they expire.

### What is the difference between LATEST and TRIM_HORIZON?

`LATEST` begins reading only new records written after the trigger is created — appropriate for real-time event processing where historical data doesn't matter. `TRIM_HORIZON` starts from the oldest available record in the stream (up to 24 hours of history), useful for backfills or reprocessing after deploying a fix. The default starting position is `TRIM_HORIZON`.

### How many consumers can read from a DynamoDB stream?

AWS limits DynamoDB Streams to 2 simultaneous readers per shard, with a maximum of 5 `GetRecords` calls per second per shard. In practice, one Lambda trigger consumes one reader slot. If you need multiple consumers processing the same changes, pipe the stream into a [Kinesis stream](/configuration/triggers/kinesis-events) or [EventBridge event bus](/configuration/triggers/event-bus-events) for fan-out.

### DynamoDB Streams vs Kinesis Data Streams for DynamoDB — which should I use?

DynamoDB Streams is included at no extra cost and is sufficient for most use cases: audit logs, denormalization, and single-consumer event processing. Kinesis Data Streams for DynamoDB (a separate AWS feature) supports longer retention (up to 365 days), higher throughput, and more consumers — but costs extra per change data capture unit. Use DynamoDB Streams unless you need multi-consumer fan-out or retention beyond 24 hours.

### What happens if my table has high write throughput?

DynamoDB automatically shards the stream based on table partitions. Each shard gets its own Lambda invocation, so processing scales horizontally with the table. For tables with hundreds of writes per second, increase `batchSize` (up to 1,000) and set `parallelizationFactor` to process multiple batches per shard concurrently. Monitor the `IteratorAge` CloudWatch metric — if it grows, your consumers are falling behind.

### How do I handle poison records that always fail?

Enable `bisectBatchOnFunctionError: true` on the `DynamoDbIntegration`. When a batch fails, the event source mapping splits it in half and retries each half, progressively isolating the problematic record. Combined with `maximumRetryAttempts` and an `onFailure` destination, the poison record lands in your dead-letter queue while healthy records continue processing.

### Does the stream trigger process records in order?

Yes, within a single shard (partition key). Records for the same partition key arrive in the order they were written. Across different partition keys, there is no ordering guarantee. Setting `parallelizationFactor` greater than 1 allows concurrent processing within the same shard, which can cause out-of-order processing — avoid this when strict ordering matters.

### How much does DynamoDB Streams cost?

DynamoDB Streams read requests are free — you pay only for the Lambda invocations that process the records. There is no per-record charge for the stream itself. The primary cost driver is the number of Lambda invocations and their execution time. Tuning `batchSize` and `maxBatchWindowSeconds` to process more records per invocation directly reduces Lambda costs.
