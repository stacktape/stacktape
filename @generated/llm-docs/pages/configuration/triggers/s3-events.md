# S3 Events

An S3 event trigger invokes a [Lambda function](/resources/compute/lambda-function) when objects are created, deleted, or restored in an [S3 bucket](/resources/storage/s3-bucket). S3 triggers are the standard approach for event-driven file processing — image resizing, data imports, log parsing, virus scanning — without polling or idle infrastructure costs.

## When to use

S3 event triggers eliminate polling. Instead of periodically checking a bucket for new files, the function runs automatically when a qualifying event occurs. AWS charges only for the invocations that actually run — there is no idle cost. Use S3 triggers whenever your workflow needs to react to file changes as they happen.

Common use cases include:

- **Image processing** — resize, crop, or convert images on upload
- **Data ingestion** — parse CSV, JSON, or Parquet files into a database
- **File validation** — scan uploads for viruses or verify file formats
- **Notifications** — send a message when a report or export is generated

## When not to use

S3 event triggers are not the right fit when you need to aggregate multiple uploads before processing. An [SQS queue](/resources/messaging/sqs-queue) between S3 and your consumer gives you batching control and decouples the upload rate from processing throughput.

If the same bucket needs to fan out events to multiple independent consumers, an AWS architecture pattern is to route S3 notifications through an intermediary like [SNS](/resources/messaging/sns-topic) or [EventBridge](/resources/messaging/event-bus) so each consumer can subscribe independently.

## Basic example

This example creates a bucket and a Lambda function that triggers whenever a new object is uploaded under the `uploads/` prefix.


Example (TypeScript):

```typescript
import {
  defineConfig,
  Bucket,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  S3Integration,
  $ResourceParam
} from 'stacktape';
export default defineConfig(() => {
  const imagesBucket = new Bucket({});

  const processImage = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/process-image.ts'
    }),
    memory: 1024,
    timeout: 60,
    connectTo: [imagesBucket],
    events: [
      new S3Integration({
        bucketArn: $ResourceParam('imagesBucket', 'arn'),
        s3EventType: 's3:ObjectCreated:*',
        filterRule: {
          prefix: 'uploads/'
        }
      })
    ]
  });

  return {
    resources: { imagesBucket, processImage }
  };
});
```


The `bucketArn` property is the ARN of the S3 bucket to monitor. For a bucket defined in the same Stacktape config, use [`$ResourceParam`](/configuration/directives) to resolve the ARN at deploy time — for example, `$ResourceParam('imagesBucket', 'arn')`. `bucketArn` is typed as a string, so the property accepts a literal ARN as well. Prefer a Stacktape-managed [Bucket](/resources/storage/s3-bucket) — Stacktape handles the notification configuration and IAM permissions automatically. Using an external bucket ARN is possible but requires you to configure the bucket's event notifications and IAM permissions outside of Stacktape.

The example includes `connectTo: [imagesBucket]` so the Lambda function receives the IAM permissions needed to interact with the bucket. See [Connecting resources](/configuration/connecting-resources) for details on how `connectTo` works.

## Event types

The `s3EventType` property determines which bucket operations trigger the function. The following S3 event notification types are supported:

| Event type | Fires when |
|---|---|
| `s3:ObjectCreated:*` | Any object creation (Put, Post, Copy, multipart upload) |
| `s3:ObjectCreated:Put` | Object created via PUT |
| `s3:ObjectCreated:Post` | Object created via POST |
| `s3:ObjectCreated:Copy` | Object created via COPY |
| `s3:ObjectCreated:CompleteMultipartUpload` | Multipart upload completed |
| `s3:ObjectRemoved:*` | Any object deletion |
| `s3:ObjectRemoved:Delete` | Object permanently deleted |
| `s3:ObjectRemoved:DeleteMarkerCreated` | Delete marker created (versioned bucket) |
| `s3:ObjectRestore:*` | Any Glacier restore operation |
| `s3:ObjectRestore:Post` | Glacier restore initiated |
| `s3:ObjectRestore:Completed` | Glacier restore completed |
| `s3:Replication:*` | Any replication event |
| `s3:Replication:OperationFailedReplication` | Replication failed |
| `s3:Replication:OperationNotTracked` | Object not tracked by replication |
| `s3:Replication:OperationMissedThreshold` | Replication exceeded the time threshold |
| `s3:Replication:OperationReplicatedAfterThreshold` | Object replicated after time threshold |
| `s3:ReducedRedundancyLostObject` | Object in Reduced Redundancy storage lost |

For most use cases, `s3:ObjectCreated:*` is the right default — it covers all creation paths regardless of how the object was uploaded. Use a more specific type (e.g. `s3:ObjectCreated:Put`) only when you need to distinguish between creation methods.

## Filtering events

The optional `filterRule` property narrows which objects trigger the function based on the object key. You can specify a `prefix`, a `suffix`, or both. When both are set, an object must match both conditions.


Example (TypeScript):

```typescript
import {
  defineConfig,
  Bucket,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  S3Integration,
  $ResourceParam
} from 'stacktape';

export default defineConfig(() => {
  const dataBucket = new Bucket({});

  const csvProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/process-csv.ts'
    }),
    memory: 512,
    connectTo: [dataBucket],
    events: [
      new S3Integration({
        bucketArn: $ResourceParam('dataBucket', 'arn'),
        s3EventType: 's3:ObjectCreated:*',
        filterRule: {
          prefix: 'imports/',
          suffix: '.csv'
        }
      })
    ]
  });

  return {
    resources: { dataBucket, csvProcessor }
  };
});
```


The `prefix` filter matches the beginning of the object key — `prefix: 'imports/'` triggers only for objects whose key starts with `imports/`. The `suffix` filter matches the end — `suffix: '.csv'` triggers only for CSV files. These filters keep your function focused and prevent it from processing irrelevant objects.


> **Tip:** Use prefix filtering to prevent infinite loops. Place uploads into a dedicated key prefix (e.g. `uploads/`, `incoming/`) and write output to a separate prefix (e.g. `processed/`). This ensures the function's output does not re-trigger itself.


## Event payload

The Lambda function receives the standard AWS S3 event notification payload. Each invocation carries a `Records` array where each record describes one S3 event — including the bucket name, object key, event type, and object size.


> **Warning:** Object keys in the event payload are URL-encoded. Spaces appear as `+`, and special characters are percent-encoded. Always decode the key before using it to fetch the object from S3.


```typescript
const handler = async (event: {
  Records: Array<{
    eventName: string;
    s3: {
      bucket: { name: string };
      object: { key: string; size: number };
    };
  }>;
}) => {
  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    // Fetch and process the object using the AWS SDK
  }
};

export default handler;
```

This is the standard AWS S3 event notification shape. For the full payload reference, consult the AWS S3 event message structure documentation.

## Delivery and retries

AWS S3 delivers event notifications to Lambda asynchronously. The `S3Integration` type does not expose `batchSize` or `maxBatchWindowSeconds` properties — the only settings are `bucketArn`, `s3EventType`, and `filterRule`.

`S3Integration` does not expose retry, failure-destination, or dead-letter properties. Runtime retry behavior follows AWS Lambda's asynchronous invocation defaults — if the function returns an error, AWS retries the invocation twice (three attempts total).

AWS S3 event notifications provide at-least-once delivery. In rare cases, a single event may trigger the function more than once. Design your handler to be idempotent — processing the same file twice should produce the same result.

## Avoiding infinite loops

A common mistake: the Lambda function reads an object from the bucket, processes it, and writes the result back to the **same bucket** without a filter rule to exclude the output. The write triggers the function again, creating an infinite loop that runs up your AWS bill.

Prevent this with one of these strategies:

- **Separate output bucket.** Write processed files to a different bucket entirely. This is the safest approach and the one to prefer when cost and complexity are not concerns.
- **Prefix separation.** Read from `uploads/` and write to `processed/`. Set the filter rule's `prefix` to `uploads/` so writes to `processed/` do not trigger the function.
- **Suffix filtering.** If uploads are `.jpg` and output is `.webp`, filter on `suffix: '.jpg'` so the `.webp` output does not match.


> **Error:** Infinite loops can generate thousands of Lambda invocations per second. If you suspect a loop, disable the bucket notification or remove the trigger immediately to stop new invocations.


## FAQ

### Can I trigger multiple Lambda functions from the same bucket?

AWS allows only one S3 notification configuration per event type and prefix/suffix combination on a bucket. For multiple independent consumers, an AWS architecture pattern is to route bucket events through [SNS](/resources/messaging/sns-topic) or [EventBridge](/resources/messaging/event-bus) so each consumer subscribes independently.

### How do I avoid infinite loops when writing back to the same bucket?

Use prefix or suffix filtering to separate input from output. For example, trigger only on `prefix: 'uploads/'` and write results to `processed/`. Alternatively, use a separate output bucket. See the [Avoiding infinite loops](#avoiding-infinite-loops) section above.

### Is S3 event delivery guaranteed exactly once?

No. AWS S3 event notifications provide at-least-once delivery. In rare cases, a single event can be delivered more than once. Make your handler idempotent — for example, check whether the output file already exists before processing, or use a deduplication key in a database.

### What happens if my Lambda function fails processing an S3 event?

`S3Integration` does not expose retry or failure-destination settings. Under AWS Lambda's asynchronous invocation defaults, AWS retries the invocation twice (three total attempts). Configure any retry or dead-letter behavior at the AWS Lambda level.

### Can I use S3 events with a bucket not managed by Stacktape?

`bucketArn` is typed as a string, so the property accepts a literal ARN. Prefer a Stacktape-managed [Bucket](/resources/storage/s3-bucket) unless you have verified the external bucket's event notification configuration and IAM permissions separately.

### How fast are S3 event notifications delivered?

AWS S3 typically delivers event notifications within seconds of the object operation. Delivery time is not guaranteed by an SLA and can vary under high load. For latency-sensitive pipelines, test with representative traffic patterns to validate timing meets your requirements.

### Can I filter S3 events by object size or content type?

No. The `filterRule` property supports only key `prefix` and `suffix` matching. If you need to filter by object metadata, size, or content type, accept all matching events in the Lambda function and add conditional logic at the start of your handler to skip objects that do not meet your criteria.

### When should I use S3 events vs polling with SQS?

S3 event triggers react to individual file operations immediately — the event arrives within seconds and requires no polling infrastructure. Use [SQS](/resources/messaging/sqs-queue) as an intermediary when you need batching (process 10 files at once), controlled concurrency, or a buffer between bursty uploads and a downstream system that processes at a fixed rate.

### S3 events vs EventBridge for file processing?

S3 events are simpler: one trigger per event type and filter, directly invoking a Lambda function. [EventBridge](/resources/messaging/event-bus) adds routing flexibility at the AWS level — content-based filtering, multiple targets, and broader event matching. Use S3 events for straightforward single-consumer file processing. Consider EventBridge when you need multi-consumer fan-out or event matching beyond prefix and suffix.

### How much does S3 event-driven processing cost?

The main costs in this pattern are the Lambda invocations and any S3 API calls your handler makes (GET, PUT). You pay per Lambda request plus compute duration — there is no idle infrastructure cost. This makes S3-triggered Lambda a cost-effective pattern for variable or bursty workloads.

## API reference


## API Reference: `S3IntegrationProps`
```typescript
import type { S3FilterRule } from 'stacktape';

type S3IntegrationProps = {
  /** The ARN of the S3 bucket to monitor for events. */
  bucketArn: string;
  /** The type of S3 event that will trigger the function. */
  s3EventType: "s3:ObjectCreated:*" | "s3:ObjectCreated:CompleteMultipartUpload" | "s3:ObjectCreated:Copy" | "s3:ObjectCreated:Post" | "s3:ObjectCreated:Put" | "s3:ObjectRemoved:*" | "s3:ObjectRemoved:Delete" | "s3:ObjectRemoved:DeleteMarkerCreated" | "s3:ObjectRestore:*" | "s3:ObjectRestore:Completed" | "s3:ObjectRestore:Post" | "s3:ReducedRedundancyLostObject" | "s3:Replication:*" | "s3:Replication:OperationFailedReplication" | "s3:Replication:OperationMissedThreshold" | "s3:Replication:OperationNotTracked" | "s3:Replication:OperationReplicatedAfterThreshold";
  /** A filter to apply to objects, so the function is only triggered for relevant objects. */
  filterRule?: S3FilterRule;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `bucketArn` | yes | `string` | The ARN of the S3 bucket to monitor for events. | - |
| `s3EventType` | yes | `string: "s3:ObjectCreated:*" \| "s3:ObjectCreated:CompleteMultipartUpload" \| "s3:ObjectCreated:Copy" \| "s3:ObjectCreated:Post" \| "s3:ObjectCreated:Put" \| "s3:ObjectRemoved:*" \| "s3:ObjectRemoved:Delete" \| "s3:ObjectRemoved:DeleteMarkerCreated" \| "s3:ObjectRestore:*" \| "s3:ObjectRestore:Completed" \| "s3:ObjectRestore:Post" \| "s3:ReducedRedundancyLostObject" \| "s3:Replication:*" \| "s3:Replication:OperationFailedReplication" \| "s3:Replication:OperationMissedThreshold" \| "s3:Replication:OperationNotTracked" \| "s3:Replication:OperationReplicatedAfterThreshold"` | The type of S3 event that will trigger the function. | - |
| `filterRule` | no | `S3FilterRule` | A filter to apply to objects, so the function is only triggered for relevant objects. | - |
