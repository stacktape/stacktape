# Kinesis Events

A Kinesis event trigger invokes a [Lambda function](/resources/compute/lambda-function) whenever new records arrive in a [Kinesis Data Stream](/resources/messaging/kinesis-stream). Records are delivered in configurable batches, making Kinesis triggers the primary choice for real-time data processing — clickstream analytics, log ingestion, IoT telemetry, and event-driven pipelines that require ordered, replayable delivery.

## When to use

Kinesis event triggers fit workloads that need **ordered, high-throughput, near-real-time record processing** with the ability to replay data. Concrete scenarios:

- **Clickstream and behavioral analytics** — aggregate user events as they happen, feeding dashboards or ML pipelines.
- **Log and metric ingestion** — centralize logs from many producers into a single stream, then route to storage, alerting, or indexing.
- **IoT and sensor telemetry** — handle thousands of records per second with per-shard ordering guarantees.
- **Event sourcing** — replay the stream from a known position to rebuild state or reprocess after a bug fix.

Underneath, Stacktape Kinesis triggers use AWS Kinesis Data Streams, which preserves record order within each shard and supports configurable record retention for replay. Multiple independent consumers can read the same data without removing it from the stream — unlike SQS, where a consumed message is deleted.

## When NOT to use

Kinesis shards carry a base hourly cost and add shard-management complexity. Skip Kinesis triggers when:

- **Simple task decoupling without ordering** — an [SQS trigger](/resources/triggers/sqs-events) is simpler to operate and auto-scales consumers without shard management.
- **Fan-out from a single event to multiple targets** — an [SNS trigger](/resources/triggers/sns-events) or [EventBridge event bus trigger](/resources/triggers/event-bus-events) is a better fit when each event should invoke multiple independent handlers simultaneously.
- **Low-volume, irregular workloads** — if you process fewer than a few hundred events per second, SQS (pay-per-message) or EventBridge (pay-per-event) is more cost-effective than provisioning shards.

## Basic example

This configuration creates a [Kinesis stream](/resources/messaging/kinesis-stream) and a [Lambda function](/resources/compute/lambda-function) that processes records from it. The `kinesisStreamName` value must match the stream's resource name in the returned `resources` object.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  KinesisIntegration,
  KinesisStream
} from 'stacktape';

export default defineConfig(() => {
  const clickStream = new KinesisStream({});

  const processor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/process-records.ts'
    }),
    events: [
      new KinesisIntegration({
        kinesisStreamName: 'clickStream',
        batchSize: 100,
        startingPosition: 'LATEST'
      })
    ]
  });

  return {
    resources: { clickStream, processor }
  };
});
```


Use `kinesisStreamName` to consume from a Kinesis stream defined in the same Stacktape configuration, or `streamArn` for an existing stream not managed by your stack.

- **`kinesisStreamName`** references a stream by its resource name within your stack. Stacktape wires the trigger to that stream.
- **`streamArn`** accepts the full ARN of any Kinesis stream, including streams in other stacks or AWS accounts. You must specify one or the other, not both.

### Handler code

Each invocation receives a batch of Kinesis records. Record data is **base64-encoded** — decode it in your handler before processing.

```typescript
export const handler = async (event: any) => {
  for (const record of event.Records) {
    const data = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
    const payload = JSON.parse(data);
    console.info(`Key: ${record.kinesis.partitionKey}`, payload);
  }
};
```

## Consumption modes

AWS Kinesis supports two consumption modes — direct polling and enhanced fan-out — for delivering stream records to a Lambda function. Direct polling shares shard read throughput across all consumers and has no additional cost, while enhanced fan-out provides a dedicated connection per consumer for lower latency and higher throughput. The `autoCreateConsumer` and `consumerArn` properties on `KinesisIntegration` control which mode is used.


## Feature Comparison

| Feature | Direct polling | Enhanced fan-out |
| --- | --- | --- |
| How it works | Polls each shard periodically | Dedicated connection per shard |
| Throughput | Shared across all consumers of the shard | Dedicated per consumer |
| Latency | Standard | Lower |
| Additional AWS cost | None | Per consumer-shard-hour + per GB |
| Best for | Single consumer, cost-sensitive | Multiple consumers, latency-sensitive |


### Direct polling

If you do not set `autoCreateConsumer` or `consumerArn`, the integration uses the direct polling path. In this mode the shard's read throughput is shared with any other consumers reading from the same stream. Direct polling works well when you have a single consumer per stream and standard processing latency is acceptable. No additional configuration is needed beyond the basic trigger properties.

**Use direct polling** for most workloads. It has no additional cost beyond the base Kinesis stream pricing. Only consider enhanced fan-out when you hit throughput contention or need lower latency.

### Enhanced fan-out

Set `autoCreateConsumer` to `true` to create a dedicated stream consumer. This is recommended for minimizing latency and maximizing throughput. Each consumer gets its own dedicated connection and read throughput per shard, eliminating throughput contention with other consumers. See the [AWS documentation on stream consumers](https://docs.aws.amazon.com/streams/latest/dev/amazon-kinesis-consumers.html) for details on how enhanced fan-out works.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  KinesisIntegration,
  KinesisStream
} from 'stacktape';

export default defineConfig(() => {
  const telemetry = new KinesisStream({});

  const aggregator = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/aggregate.ts'
    }),
    events: [
      new KinesisIntegration({
        kinesisStreamName: 'telemetry',
        autoCreateConsumer: true,
        batchSize: 500,
        maxBatchWindowSeconds: 30
      })
    ]
  });

  return {
    resources: { telemetry, aggregator }
  };
});
```


**Use enhanced fan-out** when multiple Lambda functions (or other applications) read from the same stream, or when you need the lowest possible processing latency. It adds per-consumer-shard-hour and per-GB AWS charges on top of base Kinesis pricing.

If you already manage a dedicated consumer externally, pass its ARN via `consumerArn` instead. The `autoCreateConsumer` and `consumerArn` options are mutually exclusive — you cannot set both.

## Batching

Kinesis delivers records to your Lambda function in batches. Two properties control when a batch is dispatched:

- **`batchSize`** — maximum number of records per batch. Maximum is 10,000. Defaults to **10**. Increase for higher throughput and fewer invocations; decrease for lower per-invocation latency.
- **`maxBatchWindowSeconds`** — maximum time in seconds to wait before invoking the function with a batch of records. Maximum is 300 seconds.

The function is invoked when **either** threshold is met — whichever comes first. For high-throughput streams, setting `batchSize` to several hundred and `maxBatchWindowSeconds` to 10–30 seconds reduces invocation count and cost. For latency-sensitive processing, keep both values low.

### Parallelization

`parallelizationFactor` controls the number of batches processed concurrently from the same shard. Setting it higher than 1 increases throughput by processing multiple batches in parallel. In AWS Lambda's Kinesis event source mapping, concurrent batches from the same shard may be processed out of order — use parallelization only when your handler is idempotent and order-independent, or when it partitions work by a secondary key within each record.

## Starting position

The `startingPosition` property determines where a Kinesis-triggered Lambda function begins reading records when the event source mapping is first created. It defaults to `TRIM_HORIZON`, which reads from the oldest available record.

| Value | Behavior | Use when |
|---|---|---|
| `TRIM_HORIZON` (default) | Reads from all available records in the stream | Backfilling data, initial setup, ensuring no records are missed |
| `LATEST` | Reads only new records arriving after reading begins | Real-time processing where historical records are irrelevant |

## Error handling

When a Lambda function throws an error while processing a Kinesis batch, the **entire batch is retried** — including records that were already processed before the failure. Your handler must be **idempotent**: processing the same record twice should produce the same result without unintended side effects (duplicate writes, duplicate charges, etc.).

### Limiting retries

Set `maximumRetryAttempts` to cap how many times a failed batch is retried. In AWS Lambda's Kinesis event source mapping, a persistently failing batch blocks the shard because ordering is preserved — the mapping won't advance past a failed batch. Setting a finite retry count (3–5 for most workloads) prevents a single bad record from stalling all processing on that shard.


> **Warning:** If an error occurs, the entire batch is retried, including records already processed successfully. In AWS Lambda's Kinesis event source mapping, a batch without a finite `maximumRetryAttempts` can be retried indefinitely — set a retry limit to prevent a single failing batch from blocking the shard.


### Bisecting failed batches

Enable `bisectBatchOnFunctionError` to split a failed batch in two before retrying. This narrows down the failing records when only part of a large batch causes an error. Pair it with `maximumRetryAttempts` and `onFailure` when you want failed batches to stop retrying indefinitely and be sent to a destination after retries are exhausted.

### Failure destination

Configure `onFailure` when you want batches that fail after all retry attempts to be sent to an [SQS queue](/resources/messaging/sqs-queue) or [SNS topic](/resources/messaging/sns-topic) for inspection and manual reprocessing.

The `onFailure` property takes an `arn` (the ARN of the destination) and a `type` (`'sqs'` or `'sns'`). Use [`$ResourceParam()`](/configuration/directives) to reference the ARN of a queue or topic defined in your stack instead of hardcoding it.


> **Tip:** For production pipelines, configure all three: `maximumRetryAttempts`, `bisectBatchOnFunctionError`, and `onFailure`. This combination isolates bad records, prevents shard blocking, and preserves failed data for reprocessing.


## API reference


## API Reference: `KinesisIntegrationProps`
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

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `autoCreateConsumer` | no | `boolean` | Automatically creates a dedicated stream consumer for this integration. This is recommended for minimizing latency and maximizing throughput.
For more details, see the [AWS documentation on stream consumers](https://docs.aws.amazon.com/streams/latest/dev/amazon-kinesis-consumers.html).
This cannot be used with `consumerArn`. | - |
| `batchSize` | no | `number` | The maximum number of records to process in a single batch. Maximum is 10,000. | `10` |
| `bisectBatchOnFunctionError` | no | `boolean` | Splits a failed batch in two before retrying. This can be useful if a failure is caused by a batch being too large. | - |
| `consumerArn` | no | `string` | The ARN of a specific stream consumer to use. This cannot be used with `autoCreateConsumer`. | - |
| `kinesisStreamName` | no | `string` | The name of a Kinesis stream defined in your stack&#39;s resources. You must specify either `kinesisStreamName` or `streamArn`. | - |
| `maxBatchWindowSeconds` | no | `number` | The maximum time (in seconds) to wait before invoking the function with a batch of records. Maximum is 300 seconds. | - |
| `maximumRetryAttempts` | no | `number` | The number of times to retry a failed batch of records. **Important:** If an error occurs, the entire batch is retried, including records that were processed successfully. Your function should be idempotent to handle this. | - |
| `onFailure` | no | `DestinationOnFailure` | A destination (SQS queue or SNS topic) for batches that fail after all retry attempts. | - |
| `parallelizationFactor` | no | `number` | The number of batches to process concurrently from the same shard. | - |
| `startingPosition` | no | `string: "LATEST" \| "TRIM_HORIZON"` | The position in the stream from which to start reading records. `LATEST`: Read only new records.
`TRIM_HORIZON`: Read all available records from the beginning of the stream. | `TRIM_HORIZON` |
| `streamArn` | no | `string` | The ARN of an existing Kinesis stream to consume records from. Use this to consume from a stream that is not managed by your stack.
You must specify either `kinesisStreamName` or `streamArn`. | - |


## FAQ

### Can I use a Kinesis stream from another AWS account or stack?

Yes. Use the `streamArn` property instead of `kinesisStreamName` and pass the full ARN of the external stream. Cross-account access depends on AWS permissions for the stream and the consuming Lambda function. If using enhanced fan-out with an external consumer, pass `consumerArn` directly instead of `autoCreateConsumer`.

### What happens if my function can't keep up with the stream?

When records arrive faster than your function processes them, the iterator age grows — the CloudWatch `IteratorAge` metric measures this increasing delay between when a record is written and when it's processed, and is the key signal that your function is falling behind. To catch up, increase `batchSize` so each invocation handles more records, add `parallelizationFactor` for concurrent batch processing per shard, increase function memory (which increases CPU), or add more shards to the underlying stream. For sustained high throughput with multiple consumers, use enhanced fan-out.

### How much does a Kinesis Data Stream cost?

AWS Kinesis charges per shard-hour for provisioned mode, plus per-PUT-payload-unit for all writes. On-demand mode charges per GB written and read, with no shard management. Enhanced fan-out adds per-consumer-shard-hour and per-GB-retrieved charges. For low-traffic workloads, [SQS](/resources/messaging/sqs-queue) with its pay-per-message model is usually cheaper.

### When should I use Kinesis vs SQS vs EventBridge?

Use **Kinesis** when you need ordered, replayable, high-throughput streaming where multiple consumers can independently read the same data. Use **[SQS](/resources/triggers/sqs-events)** for simple decoupled task processing where each message is consumed once and ordering doesn't matter. Use **[EventBridge](/resources/triggers/event-bus-events)** for content-based event routing — matching events by patterns and fanning out to different targets based on event type or payload. SQS is the simplest and cheapest for most workloads; Kinesis is the right tool when ordering, replay, or multi-consumer access matters.

### Can I use Kinesis triggers with container workloads?

The `KinesisIntegration` type is a function event integration. If you need a container-based Kinesis consumer, run a consumer application (such as the AWS Kinesis Client Library) inside a [worker service](/resources/compute/worker-service) or [multi-container workload](/resources/compute/multi-container-workload), and grant access to the stream using [`connectTo`](/configuration/connecting-resources).
