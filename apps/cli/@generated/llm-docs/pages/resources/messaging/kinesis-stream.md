# Kinesis Stream

A Stacktape Kinesis stream is a fully managed, real-time data stream built on Amazon Kinesis Data Streams. Producers push records continuously — logs, clickstreams, IoT telemetry, analytics events — and consumers process them in order with sub-second latency. Use it when you need ordered, replayable streaming rather than one-at-a-time messaging.

Kinesis pricing depends on the capacity mode. On-demand streams charge per GB of data ingested and retrieved with no capacity planning. Provisioned streams charge per shard-hour. Data retention beyond the default 24 hours and enhanced fan-out consumers add extra cost.

## When to use

Use a Kinesis stream when you need ordered, replayable, real-time data ingestion. Common scenarios:

- **Log and event aggregation** — collect logs, metrics, or application events from many producers into a single stream for centralized processing by a [Lambda function](/resources/compute/lambda-function) or analytics pipeline.
- **Clickstream and analytics** — capture user interactions in real time for dashboards, anomaly detection, or recommendation engines where sub-second latency matters.
- **IoT data ingestion** — ingest telemetry from thousands of devices. Each device writes to the stream; consumers process data by partition key (device ID) in order.
- **Change data capture (CDC)** — stream database changes or application events for downstream processing by multiple independent consumers, each reading at its own pace.

## When NOT to use

- **Simple task queues** — if each message should be processed once by one consumer (background jobs, email sending), use an [SQS queue](/resources/messaging/sqs-queue). SQS handles visibility, retries, and dead-letter routing automatically.
- **Fan-out notifications** — if every subscriber needs a copy of every message, use an [SNS topic](/resources/messaging/sns-topic) or an [EventBridge event bus](/resources/messaging/event-bus). Kinesis supports fan-out with enhanced consumers, but SNS and EventBridge are simpler for pub/sub patterns.
- **Request-response patterns** — Kinesis is write-and-forget from the producer's perspective. If you need a synchronous response, invoke the downstream service directly or use an [HTTP API Gateway](/resources/networking/http-api-gateway).
- **Low-volume, infrequent events** — Kinesis has a minimum cost per shard-hour (provisioned) or per-GB charge (on-demand). For low-volume event routing, an [EventBridge event bus](/resources/messaging/event-bus) is more cost-effective.

## Basic example

All top-level `KinesisStreamProps` properties are optional. If you provide `encryption`, set `encryption.enabled` explicitly. When `capacityMode` is omitted, the stream defaults to `ON_DEMAND` — it auto-scales with no capacity planning. Records are retained for 24 hours by default.


Example (TypeScript):

```typescript
import { defineConfig, KinesisStream } from 'stacktape';
export default defineConfig(() => {
  const eventStream = new KinesisStream({});

  return {
    resources: { eventStream }
  };
});
```


## Examples

### Analytics pipeline with Lambda consumer

A provisioned Kinesis stream feeding a Lambda function that processes clickstream records in batches. The trigger uses `bisectBatchOnFunctionError` to isolate poison records, `maximumRetryAttempts` to cap retries, and `parallelizationFactor` to process multiple batches per shard concurrently.


Example (TypeScript):

```typescript
import {
  defineConfig,
  KinesisStream,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const clickStream = new KinesisStream({
    capacityMode: 'PROVISIONED',
    shardCount: 2,
    retentionPeriodHours: 168
  });

  const analyticsProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/analytics-processor.ts'
    }),
    memory: 1024,
    timeout: 60,
    events: [
      {
        type: 'kinesis-stream',
        properties: {
          kinesisStreamName: 'clickStream',
          batchSize: 500,
          startingPosition: 'LATEST',
          maxBatchWindowSeconds: 15,
          bisectBatchOnFunctionError: true,
          maximumRetryAttempts: 3,
          parallelizationFactor: 2
        }
      }
    ]
  });

  return {
    resources: { clickStream, analyticsProcessor }
  };
});
```


### Event ingestion API with producer Lambda

A Lambda function behind an [HTTP API Gateway](/resources/networking/http-api-gateway) that writes records to an encrypted Kinesis stream. The stream name is passed via `$ResourceParam()` because the documented `connectTo` environment-variable table does not list KinesisStream.


Example (TypeScript):

```typescript
import {
  defineConfig,
  KinesisStream,
  LambdaFunction,
  HttpApiGateway,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const eventStream = new KinesisStream({
    encryption: { enabled: true },
    retentionPeriodHours: 48
  });

  const gateway = new HttpApiGateway({});

  const ingestApi = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/ingest.ts'
    }),
    connectTo: [eventStream],
    environment: {
      STREAM_NAME: "$ResourceParam('eventStream', 'name')"
    },
    memory: 256,
    timeout: 10,
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'gateway',
          method: 'POST',
          path: '/events'
        }
      }
    ]
  });

  return {
    resources: { eventStream, gateway, ingestApi }
  };
});
```


## Capacity modes

Stacktape Kinesis streams support two capacity modes: **on-demand** (default) and **provisioned**. The choice affects scaling behavior, throughput limits, and cost structure.

| | On-demand | Provisioned |
|---|---|---|
| **Scaling** | Automatic — AWS adjusts capacity | Manual — you set a fixed shard count |
| **Write throughput** | Auto-scaled | 1 MB/s per shard (1,000 records/s) |
| **Read throughput** | Auto-scaled | 2 MB/s per shard (shared across consumers) |
| **Cost model** | Per GB ingested + retrieved | Per shard-hour |
| **Best for** | Variable or unpredictable traffic | Steady, predictable workloads |

On-demand is the right choice for most workloads — it requires no capacity planning and scales automatically. Use provisioned only when you have predictable, steady traffic and want tighter cost control. Each shard has a fixed hourly rate regardless of utilization.

### Provisioned mode

Set `capacityMode` to `'PROVISIONED'` and specify `shardCount` to control throughput directly. Each shard provides 1 MB/s write capacity (1,000 records/s) and 2 MB/s read throughput shared across all consumers. The default `shardCount` is `1`. Add more shards to increase capacity linearly.


Example (TypeScript):

```typescript
import { defineConfig, KinesisStream } from 'stacktape';
export default defineConfig(() => {
  const eventStream = new KinesisStream({
    capacityMode: 'PROVISIONED',
    shardCount: 4
  });

  return {
    resources: { eventStream }
  };
});
```


## Data retention

Kinesis streams retain records for 24 hours by default. Set `retentionPeriodHours` to keep records longer — up to 8,760 hours (365 days). Longer retention lets consumers replay historical data, recover from processing failures, or run late-arriving analytics queries. Retention beyond 24 hours adds extra cost, so increase it only when your use case requires replay capability.


Example (TypeScript):

```typescript
import { defineConfig, KinesisStream } from 'stacktape';
export default defineConfig(() => {
  const eventStream = new KinesisStream({
    retentionPeriodHours: 168
  });

  return {
    resources: { eventStream }
  };
});
```


> **Tip:** A retention of 168 hours (7 days) covers most production replay scenarios — enough to reprocess after weekend incidents without incurring the cost of month-long retention.


## Enhanced fan-out

By default, all consumers reading from a Kinesis stream share the same 2 MB/s read throughput per shard. With enhanced fan-out enabled, each consumer gets its own dedicated 2 MB/s pipe — records are pushed to the consumer instead of polled, reducing read latency.

Enable enhanced fan-out when you have multiple independent consumers reading from the same stream and latency matters. If you have a single consumer or can tolerate shared throughput, skip it — enhanced fan-out adds per-consumer, per-shard-hour cost.

Set `enableEnhancedFanOut: true` on the stream. On the consuming [Lambda function's](/resources/compute/lambda-function) [Kinesis trigger](/resources/triggers/kinesis-events), set `autoCreateConsumer: true` to create a dedicated stream consumer for that integration.


Example (TypeScript):

```typescript
import {
  defineConfig,
  KinesisStream,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const eventStream = new KinesisStream({
    enableEnhancedFanOut: true
  });

  const analytics = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/analytics.ts'
    }),
    memory: 512,
    timeout: 60,
    events: [
      {
        type: 'kinesis-stream',
        properties: {
          kinesisStreamName: 'eventStream',
          autoCreateConsumer: true,
          batchSize: 100,
          startingPosition: 'LATEST'
        }
      }
    ]
  });

  return {
    resources: { eventStream, analytics }
  };
});
```


## Encryption

Kinesis streams can encrypt data at rest using AWS KMS. Set `encryption.enabled` to `true` to enable server-side encryption. By default, the AWS-managed `alias/aws/kinesis` key is used at no extra cost. To use your own KMS key for stricter access control or compliance, provide a `kmsKeyArn`.

Most teams can skip encryption for non-sensitive data like application metrics or clickstreams. Enable it when the stream carries PII, financial data, or anything subject to compliance requirements.


Example (TypeScript):

```typescript
import { defineConfig, KinesisStream } from 'stacktape';
export default defineConfig(() => {
  const eventStream = new KinesisStream({
    encryption: {
      enabled: true
    }
  });

  return {
    resources: { eventStream }
  };
});
```


## Triggering a Lambda function

A Kinesis stream is a common event source for [Lambda functions](/resources/compute/lambda-function). A [Kinesis trigger](/resources/triggers/kinesis-events) invokes the Lambda with batches of records from the stream. In direct mode, AWS polls each shard approximately once per second; when `autoCreateConsumer` is enabled, a dedicated stream consumer pushes records instead for lower latency. Configure this using a Kinesis trigger on the Lambda function — not on the stream itself. Use `kinesisStreamName` to reference a Kinesis stream defined in your stack's resources, or `streamArn` to consume a stream not managed by your stack.

Key trigger settings:

- `batchSize` — max records per invocation (default: 10, max: 10,000).
- `startingPosition` — `TRIM_HORIZON` (read all existing records) or `LATEST` (new records only). Default: `TRIM_HORIZON`.
- `maxBatchWindowSeconds` — max wait time before invoking with a partial batch (max: 300 seconds).
- `autoCreateConsumer` — create a dedicated enhanced fan-out consumer for this integration.
- `parallelizationFactor` — how many batches to process concurrently from the same shard.


> **Warning:** If an error occurs, the entire batch is retried — including records that were already processed successfully. Your handler must be idempotent. Use `bisectBatchOnFunctionError: true` to split failed batches in half before retrying, which helps isolate poison records.


Example (TypeScript):

```typescript
import {
  defineConfig,
  KinesisStream,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const eventStream = new KinesisStream({});

  const processor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/processor.ts'
    }),
    memory: 512,
    timeout: 60,
    events: [
      {
        type: 'kinesis-stream',
        properties: {
          kinesisStreamName: 'eventStream',
          batchSize: 100,
          startingPosition: 'LATEST',
          maxBatchWindowSeconds: 10,
          bisectBatchOnFunctionError: true,
          maximumRetryAttempts: 3
        }
      }
    ]
  });

  return {
    resources: { eventStream, processor }
  };
});
```


The Lambda handler receives records in the `Records` array. Each record's `kinesis.data` is base64-encoded — decode it before processing:

```typescript
export const handler = async (event: {
  Records: Array<{ kinesis: { data: string; partitionKey: string }; eventID: string }>;
}) => {
  for (const record of event.Records) {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
    const data = JSON.parse(payload);
    console.info(`Processing record ${record.eventID}:`, data);
  }
};
```

## Connecting to other resources

Adding a Kinesis stream to a compute resource's `connectTo` list grants the IAM permissions needed to interact with the stream. Any compute resource that supports `connectTo` can reference a Kinesis stream. The documented `connectTo` environment-variable table does not list KinesisStream, so use the [`$ResourceParam()`](/configuration/directives) directive in your `environment` configuration to pass the stream's `arn` or `name` to your application code.

A Kinesis stream exposes two referenceable parameters: `arn` (the stream's Amazon Resource Name) and `name` (the AWS Kinesis stream name). Reference them with `$ResourceParam('eventStream', 'arn')` or `$ResourceParam('eventStream', 'name')`.


Example (TypeScript):

```typescript
import {
  defineConfig,
  KinesisStream,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const eventStream = new KinesisStream({});

  const producer = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/producer.ts'
    }),
    connectTo: [eventStream],
    environment: {
      STREAM_NAME: "$ResourceParam('eventStream', 'name')"
    },
    memory: 256,
    timeout: 30
  });

  return {
    resources: { eventStream, producer }
  };
});
```


Sending a record from the connected Lambda function:

```typescript
import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';

const kinesis = new KinesisClient({});

export const handler = async (event: any) => {
  await kinesis.send(new PutRecordCommand({
    StreamName: process.env.STREAM_NAME,
    Data: Buffer.from(JSON.stringify({ userId: '42', action: 'page-view', page: '/pricing' })),
    PartitionKey: '42'
  }));

  return { statusCode: 200, body: 'Record sent' };
};
```

For more details on `connectTo`, see [Connecting resources](/configuration/connecting-resources).

## Referenceable parameters

A Kinesis stream exposes the following parameters via the [`$ResourceParam` directive](/configuration/directives). See [Referenceable parameters](/configuration/referenceable-parameters) for details.

| Parameter | Description | Usage |
|---|---|---|
| `arn` | ARN of the Kinesis stream. | `$ResourceParam('<<resource-name>>', 'arn')` |
| `name` | AWS (physical) name of the Kinesis stream. | `$ResourceParam('<<resource-name>>', 'name')` |

## API Reference


### Definition: `KinesisStreamProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/kinesis-stream` with definition name `KinesisStreamProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `capacityMode` | no | `string: "ON_DEMAND" \| "PROVISIONED"` | `ON_DEMAND` |
| `enableEnhancedFanOut` | no | `boolean` | `false` |
| `encryption` | no | `KinesisStreamEncryption` | - |
| `retentionPeriodHours` | no | `number` | `24` |
| `shardCount` | no | `number` | `1` |


## FAQ

### When should I use a Kinesis stream vs an SQS queue?

Use a Kinesis stream when you need ordered, replayable data with multiple independent consumers reading the same records — common for analytics pipelines, real-time dashboards, and log aggregation. Use an [SQS queue](/resources/messaging/sqs-queue) when each message should be processed once by one consumer and you want built-in retry, visibility timeout, and dead-letter queue support. Kinesis charges per shard-hour or per GB; SQS charges per message.

### How much does Amazon Kinesis Data Streams cost?

Amazon Kinesis uses two pricing models. On-demand mode charges per GB of data ingested and retrieved, with no minimum fee or capacity planning. Provisioned mode charges per shard-hour regardless of utilization. Additional charges apply for data retention beyond 24 hours and for enhanced fan-out consumers. On-demand is generally cheaper for bursty or unpredictable traffic; provisioned can be cheaper for steady, high-volume streams.

### Can I replay data from a Kinesis stream?

Yes. Kinesis retains records for 24 hours by default, and you can extend retention up to 365 days using `retentionPeriodHours`. Consumers can start reading from any point within the retention window using `startingPosition: 'TRIM_HORIZON'` (start of retained data) or `'LATEST'` (new records only). This makes Kinesis suitable for reprocessing after bug fixes or adding new consumers to historical data.

### What is enhanced fan-out and when should I use it?

Enhanced fan-out gives each consumer its own dedicated 2 MB/s read throughput per shard, instead of sharing 2 MB/s across all consumers. It also uses a push model instead of polling, reducing read latency. Enable it when multiple independent consumers read from the same stream and low latency matters. For a single consumer or latency-tolerant workloads, the default shared throughput is sufficient and cheaper.

### How do I handle failed records in a Kinesis Lambda consumer?

Configure `maximumRetryAttempts` on the [Kinesis trigger](/resources/triggers/kinesis-events) to limit retries. Use `bisectBatchOnFunctionError: true` to split failed batches in half, isolating poison records faster. Use `onFailure` to configure an SQS or SNS destination for batches that fail after all retry attempts. Always make your handler idempotent — AWS Lambda retries the entire batch on error, including already-processed records.

### Why do my consumers keep falling behind the stream?

Watch the `GetRecords.IteratorAgeMilliseconds` CloudWatch metric — a growing iterator age means consumers can't keep up with the incoming records. To catch up, add shards (provisioned mode) so reads parallelize, raise `parallelizationFactor` on the [Kinesis trigger](/resources/triggers/kinesis-events) to process more batches per shard concurrently, or enable [enhanced fan-out](#enhanced-fan-out) so each consumer gets its own 2 MB/s pipe. Stacktape's provided alarm trigger types do not include a Kinesis-specific alarm, so set up lag alarms on this metric directly in CloudWatch via [overrides](/configuration/overrides-and-escape-hatches).
