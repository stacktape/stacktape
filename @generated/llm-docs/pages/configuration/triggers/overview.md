# Triggers Overview

Triggers define what causes a Stacktape compute resource to execute. A [Lambda function](/resources/compute/lambda-function) sitting idle costs nothing — a trigger connects it to an event source (an HTTP request, a file upload, a queue message, a cron schedule) so it runs when work arrives. Stacktape trigger integrations primarily attach events to Lambda functions and container workloads; EventBridge event bus integrations can also trigger [batch jobs](/resources/compute/batch-job).

## Why triggers exist

Lambda functions and batch jobs need an integration when external events should start work. Without an event integration, a Lambda function does not receive event-source traffic from the integrations documented here, and an EventBridge event bus integration is the documented trigger path for [batch jobs](/resources/compute/batch-job). Container workloads can also use integrations for HTTP traffic or internal networking, but those integrations do not make the workload run — the containers are already running. Trigger integrations — such as `HttpApiIntegration`, `ScheduleIntegration`, or `SqsIntegration` — declare the binding between an event source and your compute resource. Stacktape uses the integration object to configure the corresponding route, rule, subscription, notification, or event-source mapping.

You declare triggers in the `events` array of your compute resource. Each entry is a typed integration object that specifies the event source and its configuration. A Lambda function can have multiple entries in its `events` array when those integration types are supported by the Lambda function resource — Stacktape configures the corresponding AWS integration for each entry.

## Trigger categories

Stacktape trigger integrations fall into two broad categories based on how they deliver work to your compute resources.

### Synchronous triggers

Synchronous triggers deliver a request and wait for a response. The caller blocks until your function or container returns a result. Use these for APIs, webhooks, and any workflow where the caller needs an immediate answer.

| Trigger | Type value | Works with | Dedicated page |
|---------|-----------|------------|----------------|
| HTTP API Gateway | `http-api-gateway` | Lambda functions, container workloads | [HTTP triggers](/configuration/triggers/http-triggers) |
| Application Load Balancer | `application-load-balancer` | Lambda functions, container workloads | [HTTP triggers](/configuration/triggers/http-triggers) |
| Network Load Balancer | `network-load-balancer` | Container workloads only | [HTTP triggers](/configuration/triggers/http-triggers) |

[HTTP API Gateway](/resources/networking/http-api-gateway) is the simplest option for serverless APIs — per-request pricing, no idle cost, automatic path and method routing. An [Application Load Balancer](/resources/networking/application-load-balancer) adds advanced routing (header matching, query parameters, source IP filtering) and is the natural choice when you already have an ALB for container workloads. A [Network Load Balancer](/resources/networking/network-load-balancer) operates at Layer 4 (TCP/TLS) and is container-only.

### Asynchronous triggers

Asynchronous triggers fall into two delivery patterns. **Push-based** sources — S3, SNS, schedules, EventBridge, CloudWatch Logs, and alarms — push events directly to your function when they occur. **Poll-based** sources — SQS, Kinesis, DynamoDB streams, and Kafka — are consumed through AWS Lambda event-source mappings that continuously poll the source and invoke your function with batches of records. Use either pattern for background processing, reactions to state changes, and scheduled jobs.

| Trigger | Type value | Delivery | Dedicated page |
|---------|-----------|----------|----------------|
| Schedule (cron/rate) | `schedule` | Push | [Schedule triggers](/configuration/triggers/schedule-triggers) |
| S3 bucket events | `s3` | Push | [S3 events](/configuration/triggers/s3-events) |
| SNS topic | `sns` | Push | [SNS events](/configuration/triggers/sns-events) |
| EventBridge event bus | `event-bus` | Push (batch jobs) | [Event bus events](/configuration/triggers/event-bus-events) |
| CloudWatch Logs | `cloudwatch-log` | Push | [CloudWatch logs](/configuration/triggers/cloudwatch-logs) |
| CloudWatch Alarm | `cloudwatch-alarm` | Push | [Alarms as triggers](/configuration/triggers/alarms-as-triggers) |
| SQS queue | `sqs` | Poll | [SQS events](/configuration/triggers/sqs-events) |
| Kinesis stream | `kinesis-stream` | Poll | [Kinesis events](/configuration/triggers/kinesis-events) |
| DynamoDB stream | `dynamo-db-stream` | Poll | [DynamoDB streams](/configuration/triggers/dynamodb-streams) |
| Kafka topic | `kafka-topic` | Poll | [Kafka topics](/configuration/triggers/kafka-topics) |


> **Warning:** **S3 triggers** require the `s3EventType` property to specify which event fires the function — for example, `s3:ObjectCreated:*` or `s3:ObjectRemoved:*`. **DynamoDB stream triggers** require streaming to be enabled on the DynamoDB table (via the `streaming` property in your `dynamoDbTables` config) before the trigger can be configured. **Kafka triggers** require an `authentication` field on `customKafkaConfiguration` — either SASL (`BASIC_AUTH`, `SASL_SCRAM_256_AUTH`, `SASL_SCRAM_512_AUTH`) or mTLS.


> **Info:** The source also defines an `iot` integration type (with `sql` and `sqlVersion` properties) for AWS IoT topic rules, but this overview does not document it as a supported trigger.


## Container networking integrations

Container workloads — [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), and [multi-container workloads](/resources/compute/multi-container-workload) — support two additional integration types for opening container ports. Unlike event triggers, these are not event-driven; they configure network access so containers can communicate with each other and with other resources.

| Integration | Type value | Purpose |
|-------------|-----------|---------|
| Workload Internal | `workload-internal` | Opens a container port for communication between containers in the same workload |
| Service Connect | `service-connect` | Opens a container port and registers a service-discovery alias so other resources in the stack can reach it (e.g. `http://my-service:8080`) |

Service Connect accepts an optional `alias` for service discovery and a `protocol` property (`http`, `http2`, or `grpc`) that enables AWS to capture protocol-specific metrics such as HTTP 5xx error counts. If you omit the alias, it defaults to a name derived from the resource and container names.

Use `workload-internal` when containers in the same task need to talk to each other (for example, a sidecar proxy container forwarding to an app container). Use `service-connect` when containers in different workloads need to discover and call each other within the same stack.

## Which resources support which triggers

Not every trigger type works with every compute resource. The table below summarizes the trigger integrations defined in `events.d.ts` for Lambda functions and container workloads. See the [batch job](/resources/compute/batch-job) page for batch-job-specific trigger support.


## Feature Comparison

| Feature | Lambda function | Container workloads |
| --- | --- | --- |
| HTTP API Gateway | yes | yes |
| Application Load Balancer | yes | yes |
| Network Load Balancer | no | yes |
| Schedule | yes | no |
| S3 events | yes | no |
| SQS queue | yes | no |
| SNS topic | yes | no |
| DynamoDB stream | yes | no |
| Kinesis stream | yes | no |
| EventBridge event bus | no | no |
| CloudWatch Logs | yes | no |
| CloudWatch Alarm | yes | no |
| Kafka topic | yes | no |
| Workload Internal | no | yes |
| Service Connect | no | yes |


`EventBusIntegration` is defined in the source as triggering a batch job — see the [batch job](/resources/compute/batch-job) page for EventBridge trigger support. Batch jobs also have other trigger types; see that page for details.

## Basic example

The `events` array can contain typed integration objects. This example shows an HTTP API Gateway integration and a schedule integration on one Lambda function:


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  HttpApiGateway,
  HttpApiIntegration,
  ScheduleIntegration
} from 'stacktape';
export default defineConfig(() => {
  const myApi = new HttpApiGateway({});

  const processOrders = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'myApi',
        method: 'POST',
        path: '/orders'
      }),
      new ScheduleIntegration({
        scheduleRate: 'rate(1 hour)'
      })
    ]
  });

  return {
    resources: { myApi, processOrders }
  };
});
```


The `processOrders` function has two triggers: it handles `POST /orders` requests through the HTTP API Gateway, and it runs every hour via the schedule trigger. Stacktape configures the API Gateway route and the EventBridge schedule rule based on the integration objects.

## How triggers work

When you add a trigger to the `events` array, Stacktape translates it into the appropriate AWS construct during deployment. The mechanism differs by trigger type:

**HTTP triggers** — HTTP API Gateway integrations route matching methods and paths to your function or container. For API Gateway, routes are matched by path specificity — exact paths take priority over wildcard paths. Application Load Balancer integrations route matching requests by listener rule conditions (paths, methods, headers, query parameters, source IPs), evaluated by priority number (lowest first).

**Poll-based triggers** (SQS, Kinesis, DynamoDB streams, Kafka) create AWS Lambda event-source mappings that continuously poll the source and invoke your function with batches of records. You control batch size and timing through `batchSize` and `maxBatchWindowSeconds`. For Kafka, the function fires when `batchSize` is reached or `maxBatchWindowSeconds` expires. For SQS, the function fires when `batchSize` is reached, `maxBatchWindowSeconds` expires, or the 6 MB payload limit is hit. For Kinesis and DynamoDB streams, `batchSize` and `maxBatchWindowSeconds` define the maximum batch size and wait time. This lets you trade latency for efficiency — smaller batches react faster, larger batches reduce invocation count.

**Push-based triggers** — S3, SNS, CloudWatch Logs, and schedule integrations invoke Lambda functions when matching events occur. Event bus integrations target batch jobs. Alarm integrations bind a function to an alarm defined in the `alarms` section. There is no polling — the source pushes the event payload to the target. Latency is determined by the source service, not by a polling interval.

## Choosing the right trigger

| When this starts the work | Use this trigger | Dedicated page |
|---------------------------|-----------------|----------------|
| An HTTP request from a client | [HTTP API Gateway](/configuration/triggers/http-triggers) (simplest, per-request pricing) or [Application Load Balancer](/configuration/triggers/http-triggers) (advanced routing, header/query matching) | [HTTP triggers](/configuration/triggers/http-triggers) |
| A recurring schedule | [Schedule trigger](/configuration/triggers/schedule-triggers) with a `rate()` or `cron()` expression | [Schedule triggers](/configuration/triggers/schedule-triggers) |
| A file upload or change in S3 | [S3 event trigger](/configuration/triggers/s3-events) — filter by key prefix or suffix to target specific files | [S3 events](/configuration/triggers/s3-events) |
| A message from another service | [SQS](/configuration/triggers/sqs-events) for point-to-point queuing, [SNS](/configuration/triggers/sns-events) for fan-out, or [EventBridge](/configuration/triggers/event-bus-events) for content-based routing | — |
| A database change | [DynamoDB stream trigger](/configuration/triggers/dynamodb-streams) to react to item creates, updates, and deletes | [DynamoDB streams](/configuration/triggers/dynamodb-streams) |
| A real-time data stream | [Kinesis trigger](/configuration/triggers/kinesis-events) for high-throughput ordered data | [Kinesis events](/configuration/triggers/kinesis-events) |
| A log event or alarm state change | [CloudWatch Logs trigger](/configuration/triggers/cloudwatch-logs) with a filter pattern, or [CloudWatch Alarm trigger](/configuration/triggers/alarms-as-triggers) for metric thresholds | — |

## Batching and throughput

Poll-based triggers (SQS, Kinesis, DynamoDB streams, Kafka) deliver records in batches. Two properties control batch behavior:

- **`batchSize`** — maximum records per invocation. Higher values mean fewer invocations but larger payloads. Maximums vary by source: 10,000 for SQS, Kinesis, and Kafka; 1,000 for DynamoDB streams.
- **`maxBatchWindowSeconds`** — maximum seconds to wait before invoking, up to 300 for all sources. Reduces invocation count when traffic is bursty. If omitted on SQS, the function fires as soon as messages are available.

Default batch sizes differ by trigger type: **10 for SQS and Kinesis, 100 for DynamoDB streams and Kafka.**

Your function receives the full batch as a single event. For Kinesis and DynamoDB stream integrations, if an error occurs the entire batch is retried, including records that were processed successfully. Design your handlers to be idempotent.

Kinesis integrations support two consumption modes. Without `autoCreateConsumer`, the default direct mode polls each shard approximately once per second and shares read throughput with other consumers of the same stream. With **`autoCreateConsumer`** enabled, a dedicated stream consumer is created for higher throughput and lower latency — this cannot be combined with `consumerArn`.


> **Tip:** Start with the default batch size and increase it only if you observe excessive Lambda invocations. Larger batches are more cost-efficient but increase the blast radius of failures — a single bad record can force retries of the entire batch.


## Error handling and retries

Kinesis and DynamoDB stream integrations expose retry controls for failed batches, including `maximumRetryAttempts`, `onFailure`, `bisectBatchOnFunctionError`, and `parallelizationFactor`. You control retry behavior with these properties on the integration:

- **`maximumRetryAttempts`** — the number of times to retry a failed batch of records before giving up.
- **`onFailure`** — a destination (SQS queue or SNS topic, specified by ARN and type) that receives batches that fail after all retry attempts. Use this as a dead-letter destination to inspect and replay failed records.
- **`bisectBatchOnFunctionError`** — splits a failed batch in half before retrying. Useful when a single bad record poisons a large batch — the halving narrows down which record is at fault.
- **`parallelizationFactor`** — process multiple batches from the same shard concurrently. Increases throughput at the cost of ordering guarantees within the shard.

Kinesis and DynamoDB stream `onFailure` accepts a destination with `arn` and `type` (`'sns'` or `'sqs'`), so failed batches can route to either an SQS queue or an SNS topic. By contrast, SNS `onDeliveryFailure` and EventBus `onDeliveryFailure` accept only SQS queue destinations — specified via `sqsQueueArn` or `sqsQueueName`. These delivery-failure properties cover rare cases where the source service cannot deliver an event — for example, if the target cannot scale fast enough to keep up.


> **Warning:** For Kinesis and DynamoDB stream integrations, the source warns that if an error occurs, the entire batch is retried, including records that were processed successfully — handlers must be idempotent. Use `maximumRetryAttempts` to bound retries and `onFailure` to route batches that fail after all retry attempts to an SQS queue or SNS topic for later inspection.


## Event filtering

Some trigger types support server-side filtering so your function only receives relevant events. Filtering at the source reduces invocations and cost compared to receiving all events and discarding irrelevant ones in handler code.

| Trigger | Filter property | What it filters |
|---------|----------------|-----------------|
| S3 | `filterRule` | Object key prefix and/or suffix |
| SNS | `filterPolicy` | Message attributes using SNS subscription filter policy syntax |
| EventBridge | `eventPattern` | Event fields — source, detail-type, detail content, account, region |
| CloudWatch Logs | `filter` | Log record content using CloudWatch filter pattern syntax |

S3 filtering is the most common: set `prefix: 'uploads/'` and `suffix: '.jpg'` to react only to JPEG uploads in a specific folder. SNS filtering works on message attributes, not body content — for content-based routing, use EventBridge instead. EventBridge patterns support nested matching, prefix/suffix comparisons, and numeric ranges on any event field.

The trigger types listed above (S3, SNS, EventBridge, CloudWatch Logs) expose Stacktape-level filter properties. Other integration types in the source do not define a dedicated filter property — for those, handle filtering in your handler code.

## Multiple triggers on one resource

A Lambda function can have multiple entries in its `events` array when those integration types are supported by the Lambda function resource. Common patterns:

- **API + schedule**: An API handler that also runs hourly for warm-keeping or periodic maintenance tasks.
- **Multiple S3 sources**: A function that processes uploads from multiple S3 buckets with different `filterRule` settings.
- **Queue + SNS**: A function that consumes from both an SQS queue for direct messages and an SNS topic for fan-out events.

Stacktape declares each `events` entry as its own integration object. When a function has multiple trigger types, the handler receives the event shape from the underlying AWS source — keep routing explicit in your handler and test each event shape.

## FAQ

### Can a single function have multiple triggers?

Yes. The `events` property accepts an array, and a Lambda function can include multiple supported integration types — for example, simultaneously serving HTTP requests via API Gateway, processing SQS messages, and running on a schedule. Each entry creates the corresponding AWS binding for that integration type — a route, listener rule, event-source mapping, subscription, notification, or schedule rule. Your handler receives different event payload shapes depending on which trigger fired.

### What is the difference between SQS, SNS, and EventBridge triggers?

[SQS](/configuration/triggers/sqs-events) is point-to-point: one message, one consumer. A single SQS queue should only have one consumer function — for fan-out (multiple consumers for the same message), use SNS or EventBridge instead. Use SQS for work queues and decoupling producers from consumers. [SNS](/configuration/triggers/sns-events) is fan-out: one message delivered to multiple subscribers simultaneously. [EventBridge](/configuration/triggers/event-bus-events) adds content-based routing with pattern matching on event fields — use it when you need to route different event types to different targets based on payload content. SQS and SNS are simpler to set up; EventBridge is more flexible but requires defining event patterns.

### Why can't container workloads use queue or stream triggers?

Container workloads ([web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), [multi-container workloads](/resources/compute/multi-container-workload)) are always-on processes that manage their own event loop. Their integrations are limited to HTTP traffic (API Gateway, load balancers) and internal networking (workload-internal, service-connect). For a container-based worker that processes queue messages, poll SQS from application code instead of using a Stacktape SQS trigger. For event-driven processing without managing a polling loop, use a Lambda function instead.

### When should I use HTTP API Gateway versus an Application Load Balancer?

Use an [HTTP API Gateway](/resources/networking/http-api-gateway) for most serverless APIs — it has per-request pricing with no idle cost, simpler configuration, and automatic path/method routing. Use an [Application Load Balancer](/resources/networking/application-load-balancer) when you need advanced routing rules (header matching, query parameters, source IP filtering), when you already have an ALB for container workloads, or when you need sticky sessions. API Gateway is the better default for Lambda-backed APIs; ALBs make more sense when mixing Lambda and container targets behind the same endpoint.

### What happens if my function fails while processing a batch?

Behavior depends on the trigger type. For Kinesis and DynamoDB stream integrations, the source warns that if an error occurs, the entire batch is retried, including records that were processed successfully — bound retries with `maximumRetryAttempts`, route exhausted batches to an SQS queue or SNS topic via `onFailure`, and use `bisectBatchOnFunctionError` to isolate bad records by splitting failed batches. SQS records are processed in batches and the function fires when `batchSize`, `maxBatchWindowSeconds`, or the 6 MB payload limit is reached. For Kinesis and DynamoDB stream integrations, failed batches can be retried as a whole, so handlers should be idempotent.

### What is the default batch size for event-source triggers?

Default batch size is 10 for SQS and Kinesis, and 100 for DynamoDB streams and Kafka. Maximum batch sizes also vary: SQS, Kinesis, and Kafka support up to 10,000 records per batch, while DynamoDB streams support up to 1,000. Choose based on your function's processing time and memory — larger batches are more efficient but require more resources and increase the blast radius of failures.

### How do I filter which events trigger my function?

Several trigger types support server-side filtering. S3 triggers accept `prefix` and `suffix` filters on object keys via `filterRule`. SNS supports `filterPolicy` for attribute-based message filtering. EventBridge uses `eventPattern` for content-based routing on any event field. CloudWatch Logs accepts a `filter` pattern. Other integration types do not define a dedicated filter property — for those, handle filtering in your handler code.

### What is Service Connect and when should I use it?

Service Connect is a container networking integration (type `service-connect`) that opens a container port and registers a service-discovery alias. Other resources in the stack can connect using `protocol://alias:port`, for example `http://my-service:8080`. The protocol can be `http`, `http2`, or `grpc`. Use Service Connect when you have multiple container workloads that need to communicate directly — for example, a frontend container calling a backend API container. It captures protocol-aware metrics such as HTTP 5xx error counts. Use `workload-internal` instead when containers only need to communicate within the same task (same workload). See [multi-container workloads](/resources/compute/multi-container-workload) for details.
