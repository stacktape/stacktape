# Lambda Function

A Stacktape Lambda function runs short-lived, stateless code in response to events such as HTTP requests, schedules, queue messages, file uploads, and alarms. Use Lambda functions when work is bursty, event-driven, or idle most of the time: Stacktape packages the code, configures trigger permissions, and lets AWS scale invocations automatically.

**Pricing context:** Lambda billing is based on consumed compute time. `arm64` is approximately ~20% cheaper than `x86_64`, while provisioned concurrency bills even when instances are idle.

## When to use

A Lambda function is the right default for event-driven code that finishes within minutes, does not need a continuously running process, and can run without local disk state between invocations. Common use cases:

- **HTTP endpoints with spiky traffic** — attach an [HTTP API Gateway](/resources/networking/http-api-gateway) trigger or enable a function URL for a single-function HTTPS endpoint.
- **Background event handlers** — react to [SQS](/configuration/triggers/sqs-events), [SNS](/configuration/triggers/sns-events), [S3](/configuration/triggers/s3-events), DynamoDB stream, Kinesis, EventBridge, CloudWatch log, Kafka topic, or alarm events.
- **Scheduled tasks** — run cron-like cleanup, reporting, and polling jobs with a [schedule trigger](/configuration/triggers/schedule-triggers).
- **Pay-per-use workloads** — run code that sits idle for long periods without paying for an always-on container.
- **Simple resource automation** — use function destinations, alarms, and async event handling when the workflow is mostly event routing rather than a long-running server.

## When NOT to use

- **Tasks longer than 15 minutes** — Lambda functions have a maximum `timeout` of `900` seconds. Use a [batch job](/resources/compute/batch-job) or [worker-service](/resources/compute/worker-service) for longer processing.
- **Always-on HTTP servers** — use a [web-service](/resources/compute/web-service) when you need a continuously running container, direct internet egress while also reaching VPC resources, or a container-native web framework deployment model.
- **Connection-heavy VPC workloads** — `joinDefaultVpc` lets a function reach VPC-only resources, but the function loses direct internet access except for Stacktape-created S3 and DynamoDB VPC endpoints.
- **Large stateful processing** — `/tmp` storage is ephemeral per invocation. Use [EFS](/resources/storage/efs-filesystem), [S3 bucket](/resources/storage/s3-bucket), a database, or a container workload when data must persist beyond one invocation.
- **Custom operating-system environments** — use a container resource when your runtime depends on system packages, background daemons, or image-level control that is awkward to fit into a Lambda zip package.

## Basic example

This example creates a Lambda function and exposes it through an HTTP API Gateway route. Stacktape builds the function from `./src/api.ts`, attaches the gateway integration, and configures the permissions needed for the gateway to invoke the function.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  HttpApiGateway,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});

  const getUser = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/get-user.ts'
    }),
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'apiGateway',
          method: 'GET',
          path: '/users/{id}'
        }
      }
    ],
    memory: 1024,
    timeout: 30
  });

  return {
    resources: { apiGateway, getUser }
  };
});
```


`entryfilePath` points to the function source file relative to the Stacktape config file. `memory` is measured in MB and also controls CPU power; `timeout` is the maximum runtime in seconds before AWS stops the invocation.

A minimal TypeScript handler can export the function named by the packaging handler. When `handlerFunction` is omitted, use the default handler convention for the selected packaging mode.

```ts
export async function handler(event: { pathParameters?: { id?: string } }) {
  return {
    statusCode: 200,
    body: JSON.stringify({ id: event.pathParameters?.id })
  };
}
```

## Packaging

A Stacktape Lambda function supports two packaging modes: `stacktape-lambda-buildpack` and `custom-artifact`. Use the Stacktape Lambda buildpack for most JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, and .NET functions; use a custom artifact when your CI pipeline already produces a deployment package.

| Mode | When to use |
|------|-------------|
| [Stacktape Lambda buildpack](/packaging/function/stacktape-buildpack) | Point Stacktape at a source file and let Stacktape bundle, upload, and configure the function. |
| [Custom artifact](/packaging/function/custom-artifact) | Provide a pre-built package path; Stacktape uploads it and zips directories or unzipped files when needed. |
| [Language-specific config](/packaging/function/language-specific-config) | Tune runtime-specific settings such as Node version, Python version, Java build tool, or source map behavior. |

The buildpack path is the better default because the source file, handler, language runtime, and selected architecture stay in one Stacktape resource. Choose `custom-artifact` only when build ownership belongs outside Stacktape, such as a shared internal build system or a package produced by another repository.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, CustomArtifactLambdaPackaging } from 'stacktape';

export default defineConfig(() => {
  const processor = new LambdaFunction({
    packaging: new CustomArtifactLambdaPackaging({
      packagePath: './dist/processor.zip',
      handler: 'index.js:handler'
    }),
    runtime: 'nodejs22.x'
  });

  return { resources: { processor } };
});
```


With `custom-artifact`, set `runtime` explicitly when Stacktape cannot infer it from source. If you set `architecture: 'arm64'` with a custom artifact, pre-compile any native dependencies for `arm64`; the Stacktape Lambda buildpack handles that build target automatically.

## Triggers

A Lambda function receives work through its `events` array. Stacktape supports HTTP API Gateway, S3, schedule, SNS, SQS, Kinesis, DynamoDB stream, CloudWatch log, Application Load Balancer, EventBridge event bus, Kafka topic, and CloudWatch alarm integrations, and Stacktape configures the trigger permissions for each integration.

Use trigger-specific pages for deeper event-shape and retry behavior: [HTTP triggers](/configuration/triggers/http-triggers), [schedule triggers](/configuration/triggers/schedule-triggers), [S3 events](/configuration/triggers/s3-events), [SQS events](/configuration/triggers/sqs-events), [SNS events](/configuration/triggers/sns-events), [DynamoDB streams](/configuration/triggers/dynamodb-streams), [Kinesis events](/configuration/triggers/kinesis-events), [EventBridge events](/configuration/triggers/event-bus-events), [CloudWatch logs](/configuration/triggers/cloudwatch-logs), [alarms as triggers](/configuration/triggers/alarms-as-triggers), and [Kafka topics](/configuration/triggers/kafka-topics).

For queue and stream triggers, batch size and batch window settings control how many records a function receives per invocation. Keep handlers idempotent when using stream sources because failed batches can be retried, including records that were already processed successfully.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  SqsQueue,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const jobs = new SqsQueue({});

  const worker = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    events: [
      {
        type: 'sqs',
        properties: {
          sqsQueueName: 'jobs',
          batchSize: 10,
          maxBatchWindowSeconds: 30
        }
      }
    ]
  });

  return { resources: { jobs, worker } };
});
```


`batchSize` is the maximum number of SQS records delivered to one invocation; the SQS maximum is `10,000`, and the Stacktape default is `10`. `maxBatchWindowSeconds` waits up to the configured number of seconds before invoking the function with a partial batch, with a maximum of `300` seconds.

## Function URLs

A Lambda function URL gives one function its own HTTPS endpoint without defining an API Gateway. Use `url.enabled` for simple single-function endpoints, webhooks, or internal tools where a full gateway resource would add routing configuration you do not need.

Function URLs can be public with `authMode: 'NONE'` or restricted to authenticated AWS callers with `authMode: 'AWS_IAM'`; the default is `NONE`. Enable CORS only when browser clients call the URL directly, because function URL CORS settings override CORS headers returned by your function code.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const webhook = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/webhook.ts' }),
    url: {
      enabled: true,
      authMode: 'NONE',
      cors: {
        enabled: true,
        allowedOrigins: ['https://app.example.com'],
        allowedMethods: ['POST']
      }
    }
  });

  return { resources: { webhook } };
});
```


Use an [HTTP API Gateway](/resources/networking/http-api-gateway) instead when you need multiple routes, route authorizers, or a shared API surface across several functions. Use an [Application Load Balancer](/resources/networking/application-load-balancer) trigger when you need load balancer rule matching by path, host, header, query parameter, or source IP.


> **Info:** `responseStreamEnabled` streams the response progressively, improving Time to First Byte and increasing the maximum response size from `6 MB` to `20 MB`. Your handler must use the AWS streaming handler pattern for response streaming.


## Runtime resources

Lambda runtime resources are mostly controlled by `runtime`, `architecture`, `memory`, `timeout`, and `storage`. Stacktape can auto-detect the runtime from the source file extension when using the Stacktape Lambda buildpack, but you can override `runtime` when you need a specific language version.

`memory` accepts `128` to `10,240` MB and also determines CPU power. Lambda allocates CPU proportionally to memory: `1,769` MB equals `1` vCPU, and `3,538` MB equals `2` vCPUs. Increasing memory can reduce total cost for CPU-bound functions when shorter execution time offsets the higher per-millisecond rate.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const imageProcessor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/image-processor.ts' }),
    runtime: 'nodejs22.x',
    architecture: 'arm64',
    memory: 2048,
    timeout: 120,
    storage: 2048
  });

  return { resources: { imageProcessor } };
});
```


`architecture` is `x86_64` by default; `arm64` is usually cheaper per GB-second and often works without application changes. `storage` controls the size of the ephemeral `/tmp` directory from `512` to `10,240` MB; use it for temporary downloads or intermediate files, not persistent data.


> **Warning:** A Lambda function is stopped when it exceeds `timeout`. The default timeout is `10` seconds and the maximum is `900` seconds; use a batch job or worker service when work can exceed 15 minutes.


## Concurrency

Lambda concurrency controls protect both user experience and downstream systems. `reservedConcurrency` caps and reserves execution slots for one function at no additional cost, while `provisionedConcurrency` keeps a configured number of function instances warm and bills for those instances even when idle.

Use `reservedConcurrency` when a database, third-party API, or queue consumer must not receive unlimited parallel traffic. Use `provisionedConcurrency` for latency-sensitive user-facing paths where cold starts are unacceptable; skip provisioned concurrency for background jobs, cron tasks, and data pipelines where a cold start is usually tolerable.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const checkout = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/checkout.ts' }),
    reservedConcurrency: 25,
    provisionedConcurrency: 3
  });

  return { resources: { checkout } };
});
```


`reservedConcurrency: 25` means the function cannot scale beyond 25 concurrent instances, and those execution slots are reserved for that function rather than being available to other functions. `provisionedConcurrency: 3` keeps three instances pre-warmed, which can reduce cold starts but also increases deployment time by approximately `2-5` minutes.

## Networking

A Lambda function normally does not need VPC attachment. Set `joinDefaultVpc: true` only when the function must reach VPC-only resources such as a relational database with `accessibilityMode: 'vpc'`, a Redis cluster, or an EFS mount.

The main tradeoff is outbound internet access. When `joinDefaultVpc` is enabled, the function loses direct access to external APIs such as payment providers or AI APIs; Stacktape still creates VPC endpoints for S3 and DynamoDB access. If a workload needs both VPC access and direct internet egress, prefer a [web-service](/resources/compute/web-service) or [worker-service](/resources/compute/worker-service).


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  RelationalDatabase,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const database = new RelationalDatabase({});

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' }),
    connectTo: ['database'],
    joinDefaultVpc: true
  });

  return { resources: { database, api } };
});
```


`connectTo` grants permissions, opens network access for supported resources, and injects environment variables such as `STP_DATABASE_CONNECTION_STRING`, `STP_DATABASE_HOST`, and `STP_DATABASE_PORT` for a relational database. For the full injected-variable list and supported resource behavior, see [connecting resources](/configuration/connecting-resources).

## Storage

A Lambda function has two storage paths: ephemeral `/tmp` storage controlled by `storage`, and persistent EFS storage configured through `volumeMounts`. Use `/tmp` for temporary files during one invocation; use [EFS filesystem](/resources/storage/efs-filesystem) when data must persist or be shared across functions.

EFS mounts require `joinDefaultVpc: true` and the `mountPath` must start with `/mnt/`. EFS is useful for large shared assets, generated files that must survive function replacement, or workloads that need POSIX-style file access; skip EFS when object storage or a database is a better fit.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  EfsFilesystem,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const sharedFiles = new EfsFilesystem({});

  const renderer = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/renderer.ts' }),
    joinDefaultVpc: true,
    volumeMounts: [
      {
        type: 'efs',
        properties: {
          efsFilesystemName: 'sharedFiles',
          rootDirectory: '/renders',
          mountPath: '/mnt/renders'
        }
      }
    ]
  });

  return { resources: { sharedFiles, renderer } };
});
```


`rootDirectory` restricts the mount to a subdirectory of the filesystem and defaults to `/` when omitted. `mountPath` is the path inside the Lambda runtime where the EFS volume appears.

## CDN

A Lambda function can be placed behind a CDN configuration when responses benefit from edge caching. Use `cdn` for cacheable function responses or globally distributed read-heavy endpoints; skip it for highly personalized responses, write-heavy APIs, or handlers where every request must execute function code.

The CDN path uses CloudFront in front of the function and can reduce function invocations when cache behavior matches your application. The tradeoff is cache invalidation and propagation complexity: incorrect cache rules can serve stale or over-shared responses, so most teams start without a CDN and add one after identifying cacheable traffic.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const catalog = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/catalog.ts' }),
    url: { enabled: true },
    cdn: {
      enabled: true
    }
  });

  return { resources: { catalog } };
});
```


Keep CDN configuration narrow on function endpoints. Cache public, repeatable responses such as product catalogs or generated public pages; do not cache authenticated user data unless the cache key and headers are deliberately designed for that use case.

## Deployments

Lambda deployment strategies control how traffic shifts from the previous function version to the new version. Use gradual deployments for production functions where an all-at-once failure would affect users, and use `AllAtOnce` for development stages or low-risk functions where deployment speed matters more.

Available strategies are `Canary10Percent5Minutes`, `Canary10Percent10Minutes`, `Canary10Percent15Minutes`, `Canary10Percent30Minutes`, `Linear10PercentEvery1Minute`, `Linear10PercentEvery2Minutes`, `Linear10PercentEvery3Minutes`, `Linear10PercentEvery10Minutes`, and `AllAtOnce`. Canary strategies send 10% of traffic first; linear strategies shift 10% of traffic at regular intervals.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' }),
    deployment: {
      strategy: 'Canary10Percent5Minutes'
    }
  });

  return { resources: { api } };
});
```


Optional `beforeAllowTrafficFunction` and `afterTrafficShiftFunction` hooks run Lambda-based validation before traffic shifting begins or after all traffic has shifted. Those hook functions must signal success or failure to CodeDeploy; a failing pre-traffic hook rolls the deployment back.

## Observability

Lambda function logs from `stdout` and `stderr` are sent to CloudWatch Logs unless logging is disabled. `logging.retentionDays` defaults to `180`, and function-specific alarms can monitor Lambda error rate or duration while global alarms from the Stacktape Console are merged with the function configuration.

Set a shorter retention period for high-volume functions when old logs are not needed, and keep longer retention for audit-heavy production paths. Disable logging only for narrow cases where another observability path captures the same data; otherwise debugging failures becomes harder.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/api.ts' }),
    logging: {
      retentionDays: 30
    },
    alarms: [
      {
        trigger: {
          type: 'lambda-error-rate',
          properties: { thresholdPercent: 5 }
        }
      }
    ]
  });

  return { resources: { api } };
});
```


Lambda function alarms support `lambda-error-rate` and `lambda-duration` triggers. Alarm evaluation settings control period length, evaluated periods, and breached periods; see [alarms](/observability/alarms) for notification targets and broader monitoring patterns.

## FAQ

### Does a Stacktape Lambda function scale to zero?

Yes. A Lambda function is event-driven and only runs when invoked, so idle functions do not need a running instance. Provisioned concurrency is the exception: Stacktape keeps the configured number of instances warm and AWS bills those instances even when idle.

### What is the maximum runtime for a Stacktape Lambda function?

A Stacktape Lambda function can set `timeout` up to `900` seconds, which is 15 minutes. The default timeout is `10` seconds. Use a [batch job](/resources/compute/batch-job) or [worker-service](/resources/compute/worker-service) when processing may exceed that limit.

### Can I expose a Lambda function without API Gateway?

Yes. Set `url.enabled: true` to give one Lambda function its own HTTPS URL. Function URLs are simpler for single-function endpoints, while [HTTP API Gateway](/resources/networking/http-api-gateway) is a better fit for multi-route APIs, authorizers, and shared API surfaces.

### Which Lambda packaging modes does Stacktape support?

Stacktape supports `stacktape-lambda-buildpack` and `custom-artifact` packaging for Lambda functions. The buildpack is the recommended path for most teams because Stacktape builds and uploads from source; custom artifacts fit teams that already produce Lambda deployment packages in CI. See [function packaging](/packaging/overview) for the packaging overview.

### How do I give a Lambda function database access?

Use `connectTo` to connect the Lambda function to the database resource and inject connection variables. If the database is VPC-only, set `joinDefaultVpc: true`; the tradeoff is losing direct outbound internet access except for Stacktape-created S3 and DynamoDB VPC endpoints. See [connecting resources](/configuration/connecting-resources).

### When should I use Lambda instead of a web service?

Use a Lambda function for event-driven or bursty work that can finish within 15 minutes and does not need an always-running process. Use a [web-service](/resources/compute/web-service) for containerized HTTP servers, long-lived connections, or workloads that need both VPC access and direct internet egress.

### How much memory should I give a Lambda function?

Start with the smallest memory value that meets latency needs, then increase memory for CPU-bound handlers. Lambda CPU scales with memory: `1,769` MB equals `1` vCPU, and higher memory can sometimes reduce total cost by shortening execution time. Stacktape accepts `memory` from `128` to `10,240` MB.

### How do Lambda cold starts affect APIs?

A cold start happens when AWS creates a new function instance before running your handler. Stacktape exposes `provisionedConcurrency` for user-facing paths where cold-start latency matters; skip it for background work because provisioned instances bill while idle and can add deployment time.

### Can a Lambda function use persistent file storage?

Yes. Configure `volumeMounts` with an [EFS filesystem](/resources/storage/efs-filesystem) and set `joinDefaultVpc: true`. Use EFS when files must persist across invocations or be shared across functions; use `storage` for temporary `/tmp` space that is only needed during an invocation.

### What can trigger a Stacktape Lambda function?

A Stacktape Lambda function can be triggered by HTTP API Gateway, S3, schedules, SNS, SQS, Kinesis, DynamoDB streams, CloudWatch logs, Application Load Balancer, EventBridge event buses, Kafka topics, and CloudWatch alarms. The `events` array selects the trigger, and Stacktape configures the required permissions. See [triggers overview](/configuration/triggers/overview).

## API Reference


## API Reference: `LambdaFunctionProps`
```typescript
import type { AlarmIntegration, ApplicationLoadBalancerIntegration, CdnConfiguration, CloudformationTag, CloudwatchLogIntegration, CustomArtifactLambdaPackaging, DynamoDbIntegration, EnvironmentVar, EventBusIntegration, HttpApiIntegration, KafkaTopicIntegration, KinesisIntegration, LambdaAlarm, LambdaDeploymentConfig, LambdaEfsMount, LambdaFunctionDestinations, LambdaFunctionLogging, LambdaUrlConfig, S3Integration, ScheduleIntegration, SnsIntegration, SqsIntegration, StpBuildpackLambdaPackaging, StpIamRoleStatement } from 'stacktape';

type LambdaFunctionProps = {
  /** How your code is built and packaged for deployment. */
  packaging: LambdaFunctionPackaging;
  /** Alarms for this function (merged with global alarms from the Stacktape Console). */
  alarms?: Array<LambdaAlarm>;
  /** Processor architecture: x86_64 (default) or arm64 (Graviton, ~20% cheaper). */
  architecture?: "arm64" | "x86_64";
  /** Put a CDN (CloudFront) in front of this function for caching and lower latency. */
  cdn?: CdnConfiguration;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Gradual traffic shifting for safe deployments. */
  deployment?: LambdaDeploymentConfig;
  /** Route async invocation results to another service (SQS, SNS, EventBus, or another function). */
  destinations?: LambdaFunctionDestinations;
  /** Global alarm names to exclude from this function. */
  disabledGlobalAlarms?: Array<string>;
  /** Environment variables available to the function at runtime. */
  environment?: Array<EnvironmentVar>;
  /** What triggers this function: HTTP requests, file uploads, queues, schedules, etc. */
  events?: Array<LambdaFunctionEvents>;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  /** Connects the function to your VPC so it can reach databases, Redis, and other VPC-only resources. */
  joinDefaultVpc?: boolean;
  /** Lambda Layer ARNs to attach (shared libraries, custom runtimes, etc.). */
  layers?: Array<string>;
  /** Logging configuration (retention, forwarding). */
  logging?: LambdaFunctionLogging;
  /** Memory in MB (128 - 10,240). Also determines CPU power. */
  memory?: number;
  /** Eliminates cold starts by keeping function instances warm and ready. */
  provisionedConcurrency?: number;
  /** Cap the maximum number of concurrent instances for this function. */
  reservedConcurrency?: number;
  /** The language runtime (e.g., nodejs22.x, python3.13). */
  runtime?: "dotnet6" | "dotnet7" | "dotnet8" | "java11" | "java17" | "java8" | "java8.al2" | "nodejs18.x" | "nodejs20.x" | "nodejs22.x" | "nodejs24.x" | "provided.al2" | "provided.al2023" | "python3.10" | "python3.11" | "python3.12" | "python3.13" | "python3.8" | "python3.9" | "ruby3.3";
  /** Size of the /tmp directory in MB (512 - 10,240). Ephemeral per invocation. */
  storage?: number;
  /** Additional tags for this function (on top of stack-level tags). Max 50. */
  tags?: Array<CloudformationTag>;
  /** Max execution time in seconds. Function is killed if it exceeds this. */
  timeout?: number;
  /** Give this function its own HTTPS URL (no API Gateway needed). */
  url?: LambdaUrlConfig;
  /** Persistent EFS storage shared across invocations and functions. */
  volumeMounts?: Array<LambdaEfsMount>;
};

/** Union choices used by the properties above. */
type LambdaFunctionPackaging =
  | StpBuildpackLambdaPackaging
  | CustomArtifactLambdaPackaging;

type LambdaFunctionEvents =
  | ApplicationLoadBalancerIntegration
  | KafkaTopicIntegration
  | SnsIntegration
  | SqsIntegration
  | KinesisIntegration
  | DynamoDbIntegration
  | S3Integration
  | ScheduleIntegration
  | AlarmIntegration
  | CloudwatchLogIntegration
  | HttpApiIntegration
  | EventBusIntegration;
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `packaging` | yes | `stacktape-lambda-buildpack \| custom-artifact` | How your code is built and packaged for deployment. **`stacktape-lambda-buildpack`** (recommended): Point to your source file and Stacktape builds,
bundles, and uploads it automatically.
**`custom-artifact`**: Provide a pre-built zip file. Stacktape handles the upload. | - |
| `alarms` | no | `Array<LambdaAlarm>` | Alarms for this function (merged with global alarms from the Stacktape Console). | - |
| `architecture` | no | `string: "arm64" \| "x86_64"` | Processor architecture: `x86_64` (default) or `arm64` (Graviton, ~20% cheaper). `arm64` is cheaper per GB-second and often faster. Works with most code out of the box.
If using `stacktape-lambda-buildpack`, Stacktape builds for the selected architecture automatically.
With `custom-artifact`, you must pre-compile for the target architecture. | `x86_64` |
| `cdn` | no | `CdnConfiguration` | Put a CDN (CloudFront) in front of this function for caching and lower latency. Caches responses at edge locations worldwide. Reduces function invocations and bandwidth costs. | - |
| `connectTo` | no | `Array<string>` | Give this resource access to other resources in your stack. List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc. | - |
| `deployment` | no | `LambdaDeploymentConfig` | Gradual traffic shifting for safe deployments. Instead of switching all traffic to the new version instantly, shift it gradually
(canary or linear). If issues arise, traffic rolls back automatically. | - |
| `destinations` | no | `LambdaFunctionDestinations` | Route async invocation results to another service (SQS, SNS, EventBus, or another function). Useful for building event-driven workflows: send successful results to one destination
and failures to another for error handling. | - |
| `disabledGlobalAlarms` | no | `Array<string>` | Global alarm names to exclude from this function. | - |
| `environment` | no | `Array<EnvironmentVar>` | Environment variables available to the function at runtime. Variables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically. | - |
| `events` | no | `Array<application-load-balancer \| kafka-topic \| sns \| sqs \| kinesis-stream \| dynamo-db-stream \| s3 \| schedule \| cloudwatch-alarm \| cloudwatch-log \| http-api-gateway \| event-bus>` | What triggers this function: HTTP requests, file uploads, queues, schedules, etc. Stacktape auto-configures permissions for each trigger.
The event payload your function receives depends on the trigger type. | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | Raw IAM policy statements for permissions not covered by `connectTo`. Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock). | - |
| `joinDefaultVpc` | no | `boolean` | Connects the function to your VPC so it can reach databases, Redis, and other VPC-only resources. **You usually don&#39;t need to set this manually.** Stacktape will tell you if a resource in your `connectTo`
requires it (e.g., a database with `accessibilityMode: 'vpc'`, or any Redis cluster).

**Tradeoff:** The function loses direct internet access. It can still reach S3 and DynamoDB
(Stacktape auto-creates VPC endpoints), but calls to external APIs (Stripe, OpenAI, etc.) will fail.
If you need both VPC access and internet, use a `web-service` or `worker-service` instead.

Required when using `volumeMounts` (EFS). | `false` |
| `layers` | no | `Array<string>` | Lambda Layer ARNs to attach (shared libraries, custom runtimes, etc.). Layers are zip archives with additional code/data mounted into the function.
Provide the layer ARN (e.g., from AWS console or another stack). Max 5 layers per function. | - |
| `logging` | no | `LambdaFunctionLogging` | Logging configuration (retention, forwarding). Logs (`stdout`/`stderr`) are auto-sent to CloudWatch. View with `stacktape logs` or in the Stacktape Console. | - |
| `memory` | no | `number` | Memory in MB (128 - 10,240). Also determines CPU power. Lambda scales CPU proportionally to memory: 1,769 MB = 1 vCPU, 3,538 MB = 2 vCPUs, etc.
If your function is slow, increasing memory gives it more CPU, which often makes it faster
and cheaper overall (less execution time). | - |
| `provisionedConcurrency` | no | `number` | Eliminates cold starts by keeping function instances warm and ready. When a function hasn&#39;t been called recently, the first request can take 1-5+ seconds (&quot;cold start&quot;).
This setting pre-warms the specified number of instances so they respond instantly.

**When to use:** User-facing APIs, web/mobile backends, or any function where response time matters.
Skip this for background jobs, cron tasks, or data pipelines.

**Cost:** You pay for each provisioned instance even when idle. Also increases deploy time by ~2-5 minutes. | - |
| `reservedConcurrency` | no | `number` | Cap the maximum number of concurrent instances for this function. Reserves this many execution slots exclusively for this function — other functions can&#39;t use them,
and this function can&#39;t scale beyond it. **No additional cost.**

Common uses:

Prevent overwhelming a database with too many connections
Guarantee capacity for critical functions
Throttle expensive downstream API calls | - |
| `runtime` | no | `string: "dotnet6" \| "dotnet7" \| "dotnet8" \| "java11" \| "java17" \| "java8" \| "java8.al2" \| "nodejs18.x" \| "nodejs20.x" \| "nodejs22.x" \| "nodejs24.x" \| "provided.al2" \| "provided.al2023" \| "python3.10" \| "python3.11" \| "python3.12" \| "python3.13" \| "python3.8" \| "python3.9" \| "ruby3.3"` | The language runtime (e.g., `nodejs22.x`, `python3.13`). Auto-detected from your source file extension when using `stacktape-lambda-buildpack`.
Override only if you need a specific version. | - |
| `storage` | no | `number` | Size of the `/tmp` directory in MB (512 - 10,240). Ephemeral per invocation. Increase if your function downloads/processes large files temporarily. | `512` |
| `tags` | no | `Array<CloudformationTag>` | Additional tags for this function (on top of stack-level tags). Max 50. | - |
| `timeout` | no | `number` | Max execution time in seconds. Function is killed if it exceeds this. Maximum: 900 seconds (15 minutes). For longer tasks, use a `batch-job` or `worker-service`. | `10` |
| `url` | no | `LambdaUrlConfig` | Give this function its own HTTPS URL (no API Gateway needed). Simpler and cheaper than an API Gateway for single-function endpoints.
URL format: `https://{id}.lambda-url.{region}.on.aws` | - |
| `volumeMounts` | no | `Array<LambdaEfsMount>` | Persistent EFS storage shared across invocations and functions. Unlike `/tmp`, EFS data persists indefinitely and can be shared across multiple functions.
Requires `joinDefaultVpc: true` (Stacktape will remind you if you forget). | - |


## Referenceable parameters


## Referenceable Parameters: `function`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `arn` | Arn of the function | `$ResourceParam("<<resource-name>>", "arn")` |
| `logGroupArn` | Arn of the log group aggregating logs from the function | `$ResourceParam("<<resource-name>>", "logGroupArn")` |
