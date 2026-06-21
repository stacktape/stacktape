# Lambda Function

A Stacktape Lambda function is a serverless compute resource that runs code in response to events — HTTP requests, queues, schedules, file uploads, and more. Lambda functions scale automatically from zero, bill only for consumed compute time, and require no server management. Underneath, Stacktape deploys to AWS Lambda.

**Pricing:** Lambda bills per GB-second of compute time. The `arm64` architecture is ~20% cheaper per GB-second than the default `x86_64`. Provisioned concurrency adds cost even when instances are idle.

## When to use

A Lambda function is the right default for event-driven code that finishes within minutes, does not need a continuously running process, and can tolerate statelessness between invocations.

- **HTTP APIs with variable traffic** — pair with an [HTTP API Gateway](/resources/networking/http-api-gateway) or enable a function URL for a single-function HTTPS endpoint. Cost approaches zero during quiet periods.
- **Background event handlers** — react to [SQS](/configuration/triggers/sqs-events), [SNS](/configuration/triggers/sns-events), [S3](/configuration/triggers/s3-events), [DynamoDB stream](/configuration/triggers/dynamodb-streams), [Kinesis](/configuration/triggers/kinesis-events), [EventBridge](/configuration/triggers/event-bus-events), [CloudWatch log](/configuration/triggers/cloudwatch-logs), [Kafka topic](/configuration/triggers/kafka-topics), or [alarm](/configuration/triggers/alarms-as-triggers) events.
- **Scheduled tasks** — run cron-like cleanup, reporting, or polling with a [schedule trigger](/configuration/triggers/schedule-triggers).
- **Pay-per-use workloads** — functions that sit idle most of the time cost nothing until invoked.

## When NOT to use

- **Tasks longer than 15 minutes** — the maximum `timeout` is `900` seconds. For processing that can exceed 15 minutes, use a [batch job](/resources/compute/batch-job) or [worker service](/resources/compute/worker-service).
- **Always-on HTTP servers** — use a [web service](/resources/compute/web-service) when you need a continuously running container or a container-native web framework.
- **VPC access with internet egress** — `joinDefaultVpc` gives VPC access but removes direct internet access (S3 and DynamoDB stay reachable via VPC endpoints). If you need both, use a [web service](/resources/compute/web-service) or [worker service](/resources/compute/worker-service).
- **Persistent local state** — `/tmp` is ephemeral per invocation. Use [EFS](/resources/storage/efs-filesystem), an [S3 bucket](/resources/storage/s3-bucket), or a database for persistent data.
- **Custom OS or daemon requirements** — Stacktape Lambda packaging uses source buildpack or custom artifact zip. If you need image-level control over system packages or daemons, use a [container workload](/resources/compute/multi-container-workload) or [web service](/resources/compute/web-service).

## Basic example

A Lambda function with an [HTTP API Gateway](/resources/networking/http-api-gateway) trigger. Stacktape builds the function from `entryfilePath`, detects the runtime from the file extension, and auto-configures the trigger permissions.


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

  return { resources: { apiGateway, getUser } };
});
```


`entryfilePath` points to the handler source file relative to the config file. `memory: 1024` allocates 1,024 MB and proportional CPU (1,769 MB = 1 vCPU). `timeout: 30` stops the invocation after 30 seconds; the default is `10` and the maximum is `900`.

A minimal TypeScript handler for this route:

```ts
export async function handler(event: { pathParameters?: { id?: string } }) {
  return {
    statusCode: 200,
    body: JSON.stringify({ id: event.pathParameters?.id })
  };
}
```

## Examples

### HTTP API with DynamoDB

A complete Stacktape config for a Hono API connected to a [DynamoDB table](/resources/databases/dynamodb) through an [HTTP API Gateway](/resources/networking/http-api-gateway). The `connectTo` property grants IAM permissions and injects the `STP_USERS_TABLE_NAME` and `STP_USERS_TABLE_ARN` environment variables automatically.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  HttpApiGateway,
  DynamoDbTable,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});

  const usersTable = new DynamoDbTable({
    primaryKey: { partitionKey: { name: 'userId', type: 'S' } }
  });

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    }),
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'apiGateway',
          method: '*',
          path: '/{proxy+}'
        }
      }
    ],
    connectTo: ['usersTable'],
    memory: 512,
    timeout: 30
  });

  return { resources: { apiGateway, usersTable, api } };
});
```


A Hono handler using the injected environment variables for read and write operations:

```ts
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const app = new Hono();
const client = new DynamoDBClient({});
const tableName = process.env.STP_USERS_TABLE_NAME!;

app.get('/users/:id', async (c) => {
  const result = await client.send(new GetItemCommand({
    TableName: tableName,
    Key: { userId: { S: c.req.param('id') } }
  }));
  return c.json(result.Item ?? {});
});

app.post('/users', async (c) => {
  const body = await c.req.json();
  await client.send(new PutItemCommand({
    TableName: tableName,
    Item: {
      userId: { S: body.id },
      name: { S: body.name },
      email: { S: body.email }
    }
  }));
  return c.json({ success: true }, 201);
});

export const handler = handle(app);
```

### Scheduled cleanup task

A Lambda function that runs every hour to delete expired records. The [schedule trigger](/configuration/triggers/schedule-triggers) accepts rate expressions and AWS cron expressions (6-field, UTC).


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  DynamoDbTable,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const sessionsTable = new DynamoDbTable({
    primaryKey: { partitionKey: { name: 'sessionId', type: 'S' } }
  });

  const cleanup = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/cleanup.ts'
    }),
    events: [
      {
        type: 'schedule',
        properties: { scheduleRate: 'rate(1 hour)' }
      }
    ],
    connectTo: ['sessionsTable'],
    timeout: 120
  });

  return { resources: { sessionsTable, cleanup } };
});
```


The cleanup handler scans for expired sessions and deletes them:

```ts
import { DynamoDBClient, ScanCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});
const tableName = process.env.STP_SESSIONS_TABLE_NAME!;

export async function handler() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const { Items } = await client.send(new ScanCommand({
    TableName: tableName,
    FilterExpression: 'expiresAt < :cutoff',
    ExpressionAttributeValues: { ':cutoff': { N: String(cutoff) } }
  }));

  for (const item of Items ?? []) {
    await client.send(new DeleteItemCommand({
      TableName: tableName,
      Key: { sessionId: item.sessionId }
    }));
  }

  return { deleted: Items?.length ?? 0 };
}
```

## Packaging

Stacktape supports two Lambda packaging modes: [Stacktape Lambda buildpack](/packaging/function/stacktape-buildpack) and [custom artifact](/packaging/function/custom-artifact).

| Mode | Best for |
|---|---|
| **Stacktape Lambda buildpack** (recommended) | Point to a source file — Stacktape bundles, uploads, and configures the function. Supports JS, TS, Python, Java, Go, Ruby, PHP, and .NET. |
| **Custom artifact** | Provide a pre-built zip. Use when your CI already produces a deployment package or when you need a build step Stacktape does not support. |

The Stacktape Lambda buildpack is the better default: it auto-detects the runtime, builds for the selected architecture, generates source maps (JS/TS), and caches unchanged packages. Use [custom artifact](/packaging/function/custom-artifact) only when you own the build outside Stacktape.

### Stacktape Lambda buildpack

The `StacktapeLambdaBuildpackPackaging` class accepts a `languageSpecificConfig` property for runtime-specific settings — Node.js version, Python version, Java build tool, ESM vs CJS output, source map control, and more. See [Stacktape Lambda buildpack](/packaging/function/stacktape-buildpack) for language-specific details.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts',
      languageSpecificConfig: {
        nodeVersion: 22,
        outputModuleFormat: 'esm'
      }
    })
  });

  return { resources: { api } };
});
```


`nodeVersion` selects the Node.js major version for the build; `outputModuleFormat` switches between `'cjs'` (default, CommonJS) and `'esm'` (ES Modules, enables top-level `await`). Some npm packages do not support ESM.

### Custom artifact

The `CustomArtifactLambdaPackaging` class takes a `packagePath` pointing to a pre-built deployment package. If the path points to a directory or a non-zip file, Stacktape zips it before upload. With `custom-artifact`, there is no source file for buildpack auto-detection, so set `runtime` when the Lambda runtime cannot be inferred elsewhere. If you use `architecture: 'arm64'`, pre-compile any native dependencies for that architecture yourself.


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


`handler` follows the format `filepath:functionName` and tells Lambda which exported function to invoke.

## Triggers

A Lambda function receives work through its `events` array. Stacktape supports 12 trigger types and auto-configures the permissions for each.

| Trigger type | Event discriminator | Docs |
|---|---|---|
| HTTP API Gateway | `http-api-gateway` | [HTTP triggers](/configuration/triggers/http-triggers) |
| Application Load Balancer | `application-load-balancer` | [HTTP triggers](/configuration/triggers/http-triggers) |
| Schedule | `schedule` | [Schedule triggers](/configuration/triggers/schedule-triggers) |
| S3 | `s3` | [S3 events](/configuration/triggers/s3-events) |
| SQS | `sqs` | [SQS events](/configuration/triggers/sqs-events) |
| SNS | `sns` | [SNS events](/configuration/triggers/sns-events) |
| DynamoDB stream | `dynamo-db-stream` | [DynamoDB streams](/configuration/triggers/dynamodb-streams) |
| Kinesis stream | `kinesis-stream` | [Kinesis events](/configuration/triggers/kinesis-events) |
| EventBridge | `event-bus` | [EventBridge events](/configuration/triggers/event-bus-events) |
| CloudWatch log | `cloudwatch-log` | [CloudWatch logs](/configuration/triggers/cloudwatch-logs) |
| CloudWatch alarm | `cloudwatch-alarm` | [Alarms as triggers](/configuration/triggers/alarms-as-triggers) |
| Kafka topic | `kafka-topic` | [Kafka topics](/configuration/triggers/kafka-topics) |

For queue and stream triggers (`sqs`, `kinesis-stream`, `dynamo-db-stream`), `batchSize` and `maxBatchWindowSeconds` control how many records the function receives per invocation. Keep handlers idempotent: failed batches are retried including records that already processed successfully.


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


`batchSize` controls the maximum number of records delivered to one invocation and defaults to `10`. The maximum `batchSize` varies by trigger type (for example, DynamoDB streams cap at `1,000` while SQS and Kinesis accept up to `10,000`). `maxBatchWindowSeconds` waits up to the configured seconds before invoking with a partial batch (maximum `300`). The function is also invoked when the batch reaches the 6 MB payload limit.

A schedule trigger runs the function on a cron expression or fixed rate. `scheduleRate` accepts rate expressions like `rate(5 minutes)` and cron expressions like `cron(0 18 ? * MON-FRI *)` (6-field AWS cron, UTC). See [schedule triggers](/configuration/triggers/schedule-triggers) for full syntax.

## Function URLs

A Lambda function URL gives one function its own HTTPS endpoint (`https://{id}.lambda-url.{region}.on.aws`) without requiring an API Gateway resource. Use function URLs for single-function endpoints, webhooks, or internal tools where the routing configuration of a full gateway is unnecessary.

**When to use a function URL:** the function handles all paths itself (e.g., a Hono or Express app behind `handle()`), or you have exactly one function serving a narrow purpose like a webhook receiver.

**When to use an [HTTP API Gateway](/resources/networking/http-api-gateway) instead:** you need route-level `method`/`path` matching or a shared API surface across multiple functions.


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


`authMode` defaults to `'NONE'` (public — anyone can call the URL). Set `authMode: 'AWS_IAM'` to restrict access to authenticated AWS users and roles with invoke permission. `cors.enabled: true` without additional settings uses permissive defaults (`*` for origins and methods). `allowedOrigins` and `allowedMethods` narrow CORS to specific browser origins and HTTP methods. Function URL CORS settings override any CORS headers returned by your function code.


> **Tip:** `responseStreamEnabled` streams the response progressively instead of buffering, improving Time to First Byte and increasing the maximum response size from 6 MB to 20 MB. Your handler must use the AWS streaming handler pattern.


## Runtime resources

Lambda function runtime resources are controlled by `runtime`, `architecture`, `memory`, `timeout`, and `storage`. These properties determine the language version, CPU allocation, execution limits, and ephemeral disk available to each invocation.

`runtime` is auto-detected from the source file extension when using the Stacktape Lambda buildpack. Supported runtime identifiers are `nodejs18.x`, `nodejs20.x`, `nodejs22.x`, `nodejs24.x`, `python3.8`, `python3.9`, `python3.10`, `python3.11`, `python3.12`, `python3.13`, `ruby3.3`, `java8`, `java8.al2`, `java11`, `java17`, `dotnet6`, `dotnet7`, `dotnet8`, `provided.al2`, and `provided.al2023`. Override `runtime` only when you need a specific version or when using `custom-artifact` packaging where there is no source file for buildpack auto-detection.

`memory` accepts `128` to `10,240` MB and determines CPU power proportionally: `1,769` MB equals 1 vCPU, `3,538` MB equals 2 vCPUs. For CPU-bound functions, increasing memory often reduces total cost because shorter execution time offsets the higher per-millisecond rate.


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


`architecture` is `'x86_64'` by default. `'arm64'` (AWS Graviton) is ~20% cheaper per GB-second and often works without code changes. When using the Stacktape Lambda buildpack, Stacktape builds for the selected architecture automatically; with a custom artifact, you must pre-compile for the target.

`storage` controls the ephemeral `/tmp` directory size from `512` (default) to `10,240` MB. This space is only available during one invocation and is not shared. Use it for temporary downloads or intermediate files, not persistent data.


> **Warning:** A Lambda function is stopped when it exceeds `timeout`. The default is `10` seconds and the maximum is `900` seconds (15 minutes). For processing that can exceed 15 minutes, use a [batch job](/resources/compute/batch-job) or [worker service](/resources/compute/worker-service).


## Concurrency

Lambda concurrency controls protect downstream systems and manage cold-start behavior. Two independent knobs control scaling limits and warm instances.

- **`reservedConcurrency`** — caps and reserves execution slots for this function. Other functions in the account cannot use these slots, and this function cannot exceed the cap. No additional cost.
- **`provisionedConcurrency`** — keeps a configured number of instances pre-warmed. Eliminates cold starts but bills for those instances even when idle and adds ~2–5 minutes to deploy time.

Use `reservedConcurrency` when a database, third-party API, or queue consumer must not receive unlimited parallel traffic. Use `provisionedConcurrency` for latency-sensitive user-facing paths where cold starts are unacceptable. Skip provisioned concurrency for background jobs, cron tasks, and data pipelines where occasional cold starts are tolerable.


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


`reservedConcurrency: 25` means this function cannot scale beyond 25 concurrent instances, and those 25 slots are reserved exclusively for it. `provisionedConcurrency: 3` keeps three instances warm and ready to handle requests instantly.

## Networking

A Lambda function does not need VPC attachment by default. Set `joinDefaultVpc: true` only when the function must reach VPC-only resources such as a [relational database](/resources/databases/relational-database) with `accessibilityMode: 'vpc'`, a [Redis cluster](/resources/databases/redis), or an [EFS filesystem](/resources/storage/efs-filesystem).

The main tradeoff: when `joinDefaultVpc` is enabled, the function loses direct outbound internet access. Stacktape creates VPC endpoints for S3 and DynamoDB, but calls to external APIs (payment providers, AI services, SaaS webhooks) will fail. If you need both VPC access and internet egress, use a [web service](/resources/compute/web-service) or [worker service](/resources/compute/worker-service) instead.

### Connecting to resources

The `connectTo` property grants IAM permissions, opens network access (security group rules for databases and Redis), and injects environment variables with connection details using the `STP_[RESOURCE_NAME]_[PARAM]` pattern. See [connecting resources](/configuration/connecting-resources) for the full list of injected variables per resource type.

Use the `environment` property for explicit runtime variables such as `LOG_LEVEL` or feature flags. Values can be strings, numbers, or booleans. For secrets, use [`$Secret()`](/configuration/directives) directives rather than hard-coded values. Variables from `connectTo` are added automatically alongside any `environment` entries.


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
    joinDefaultVpc: true,
    environment: [{ name: 'LOG_LEVEL', value: 'info' }],
    memory: 1024,
    timeout: 30
  });

  return { resources: { database, api } };
});
```


For a resource named `database`, Stacktape follows the `STP_[RESOURCE_NAME]_[PARAM]` pattern — for example, the connection string variable is `STP_DATABASE_CONNECTION_STRING`, the host is `STP_DATABASE_HOST`, and the port is `STP_DATABASE_PORT`. The `LOG_LEVEL` environment variable is available alongside the auto-injected `connectTo` variables.

Use `iamRoleStatements` for AWS services not covered by `connectTo` (e.g., Rekognition, Bedrock, Textract):


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const analyzer = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/analyzer.ts' }),
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['rekognition:DetectLabels', 'rekognition:DetectText'],
        Resource: ['*']
      }
    ]
  });

  return { resources: { analyzer } };
});
```


## Storage

A Lambda function has two storage paths: ephemeral `/tmp` and persistent volume mounts via the `volumeMounts` property.

**Ephemeral `/tmp`** is controlled by the `storage` property (`512`–`10,240` MB, default `512`). The contents exist only for the current invocation and are not shared across instances. Use `/tmp` for temporary downloads, intermediate processing files, or cached assets within a single invocation.

**Volume mounts** attach persistent file systems through the `volumeMounts` property. Stacktape supports two volume mount types: `efs` (EFS filesystem) and `s3files` (S3 Files access point). EFS mounts are the common path for persistent, shared file storage across Lambda invocations. The `s3files` mount type accepts an existing S3 Files access point ARN; this is an advanced path for teams that already manage S3 Files access points outside Stacktape. Both volume mount types require `joinDefaultVpc: true`, and the `mountPath` must start with `/mnt/`.

Use [EFS](/resources/storage/efs-filesystem) when files must persist across invocations, be shared across multiple functions, or exceed the `/tmp` size limit. Skip EFS when an [S3 bucket](/resources/storage/s3-bucket) or database is a better fit for the data access pattern — EFS adds VPC attachment overhead and cost.


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
    storage: 2048,
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


`efsFilesystemName` references an EFS resource defined in the same config. `rootDirectory` restricts the mount to a subdirectory of the filesystem (defaults to `'/'`). `mountPath` is the path inside the function where the volume appears — it must start with `/mnt/`.

## CDN

A Lambda function can be placed behind a CDN by setting the `cdn` property. CloudFront caches responses at edge locations worldwide, reducing function invocations and bandwidth costs for cacheable content.

**When to enable:** The function serves public, repeatable responses (product catalogs, generated pages, static API data) to a geographically distributed audience. CDN reduces both latency and cost.

**When the default is fine:** Functions that return personalized data, handle write operations, or need every request to execute function code should skip CDN.

**Tradeoff:** Adds CloudFront distribution propagation time on first deploy, and stale-cache risk if cache rules are too broad.


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


`cdn.enabled: true` places CloudFront in front of the Lambda function with default caching behavior. The `cdn` property uses the shared CDN configuration; see [CDN](/resources/networking/cdn) for cache and routing options.

## Deployments

Lambda deployment strategies control how traffic shifts from the previous function version to the new one. Use `deployment.strategy` when you want Stacktape to manage Lambda traffic shifting with canary, linear, or all-at-once behavior. Gradual deployments are most valuable for production functions where an all-at-once failure would affect users.

**When to enable:** Production-facing APIs, payment handlers, or any function where rolling back quickly matters more than deployment speed.

**When the default is fine:** Development stages, internal tools, and batch processors where a brief disruption is acceptable.

Available strategies:

| Strategy family | Variants | Behavior |
|---|---|---|
| **Canary** | `Canary10Percent5Minutes`, `Canary10Percent10Minutes`, `Canary10Percent15Minutes`, `Canary10Percent30Minutes` | Send 10% of traffic to the new version, then all traffic after the wait period. |
| **Linear** | `Linear10PercentEvery1Minute`, `Linear10PercentEvery2Minutes`, `Linear10PercentEvery3Minutes`, `Linear10PercentEvery10Minutes` | Shift 10% of traffic at regular intervals until 100%. |
| **AllAtOnce** | `AllAtOnce` | Instant switch, no gradual rollout. |


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


`Canary10Percent5Minutes` sends 10% of traffic to the new version and waits 5 minutes before shifting the remaining 90%. Optional `beforeAllowTrafficFunction` and `afterTrafficShiftFunction` run Lambda-based validation hooks before and after the traffic shift. `beforeAllowTrafficFunction` must signal success or failure to CodeDeploy; if it fails, the deployment rolls back.

For the full deployment lifecycle, see [gradual deployments](/deployment-and-lifecycle/gradual-deployments).

## Destinations

Lambda destinations route the result of an asynchronous invocation to another service — an SQS queue, SNS topic, EventBridge event bus, or another Lambda function. Use `onSuccess` to chain successful results into a downstream workflow and `onFailure` to capture errors for dead-letter processing or alerting.

**When to use destinations:** You invoke the function asynchronously (via `aws lambda invoke --invocation-type Event`, or from SNS/EventBridge/S3 triggers) and need to route results without polling. Destinations are the simplest way to wire a function into a multi-step event pipeline without adding a state machine.

**When to skip destinations:** Synchronous triggers like API Gateway and Application Load Balancer return the function's response directly to the caller — destinations have no effect on synchronous invocations. Kinesis and DynamoDB stream integrations expose their own `onFailure` destination for failed batches, which handles retries and batch-level failure separately from Lambda destinations. The SQS integration does not expose an `onFailure` property in the Lambda event source configuration.

**Destinations vs. in-function error handling:** With destinations, AWS routes the full invocation result (including error details) to the target automatically. This keeps the function code focused on its own logic. Without destinations, the function would need to catch errors internally and publish to SQS or SNS in application code.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  SqsQueue,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const deadLetterQueue = new SqsQueue({});

  const processor = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/processor.ts' }),
    destinations: {
      onFailure: "$ResourceParam('deadLetterQueue', 'arn')"
    }
  });

  return { resources: { deadLetterQueue, processor } };
});
```


`onSuccess` and `onFailure` each accept an ARN string. Use [`$ResourceParam()`](/configuration/directives) to reference a resource defined in the same config.

## Observability

Lambda function logs from `stdout` and `stderr` are sent to CloudWatch Logs automatically. View logs with [`stacktape debug:logs`](/cli/debug-logs) or in the Stacktape Console.

`logging.retentionDays` defaults to `180`. Set a shorter retention for high-volume functions when old logs are not needed; keep longer retention for audit-heavy production paths. Setting `logging.disabled: true` disables CloudWatch logging entirely — use this only when another observability path captures the same data.

Lambda functions also support log forwarding to external services (HTTP endpoints, Datadog, Highlight.io) through the `logging.logForwarding` property. See [log forwarding](/observability/log-forwarding) for configuration details.

### Alarms

Lambda function alarms support `lambda-error-rate` and `lambda-duration` triggers. Function-specific alarms are merged with global alarms from the Stacktape Console. Use `disabledGlobalAlarms` to exclude specific global alarms from a function.


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
      },
      {
        trigger: {
          type: 'lambda-duration',
          properties: { thresholdMilliseconds: 5000 }
        }
      }
    ]
  });

  return { resources: { api } };
});
```


`thresholdPercent: 5` fires the error-rate alarm when more than 5% of invocations fail. `thresholdMilliseconds: 5000` fires the duration alarm when execution time exceeds 5 seconds. Alarm evaluation settings (period, evaluated periods, breached periods) and `notificationTargets` are configurable on each alarm. See [alarms](/observability/alarms) for notification target types and setup.

## Layers

Lambda layers are zip archives with additional code or data that get mounted into the function at runtime. Set `layers` to an array of Lambda layer ARNs to attach shared libraries, custom runtimes, or large datasets that multiple functions need without duplicating them in each deployment package. Stacktape supports up to 5 layer ARNs per function.

Most teams do not need layers. The Stacktape Lambda buildpack handles dependency bundling automatically. Use layers when you need a binary dependency too large for the zip package, a shared custom runtime, or a public layer maintained by a third party.

## FAQ

### Does a Stacktape Lambda function scale to zero?

Yes. A Lambda function only runs when invoked, so idle functions do not consume compute. The exception is `provisionedConcurrency`: those instances stay warm and bill even when idle. Most teams start without provisioned concurrency and add it only for latency-sensitive paths.

### What is the maximum runtime for a Lambda function?

AWS Lambda enforces a maximum `timeout` of `900` seconds (15 minutes). The Stacktape default is `10` seconds. For processing that can exceed 15 minutes, use a [batch job](/resources/compute/batch-job) or [worker service](/resources/compute/worker-service).

### Can I expose a Lambda function without API Gateway?

Yes. Set `url.enabled: true` to give the function its own HTTPS endpoint. Function URLs are simpler and lower-overhead for single-function endpoints. Use an [HTTP API Gateway](/resources/networking/http-api-gateway) when you need route-level method/path matching, authorizers, or a shared API across multiple functions.

### Which packaging modes does Stacktape support for Lambda?

Stacktape supports two modes: `stacktape-lambda-buildpack` (recommended — Stacktape builds from source) and `custom-artifact` (provide a pre-built zip). The buildpack supports JS, TS, Python, Java, Go, Ruby, PHP, and .NET. See the [packaging overview](/packaging/overview) for details.

### How do I connect a Lambda function to a database?

Use `connectTo` to reference the database resource — Stacktape grants IAM permissions, opens network access, and injects connection-string environment variables. If the database is VPC-only, set `joinDefaultVpc: true`. The tradeoff: the function loses direct outbound internet access. See [connecting resources](/configuration/connecting-resources).

### When should I use a Lambda function instead of a web service?

Use a Lambda function for short-lived, event-driven work that finishes within 15 minutes and does not need a persistent process. Use a [web service](/resources/compute/web-service) for always-on containers, workloads needing both VPC and internet access, or tasks requiring more than 10,240 MB of memory. Lambda scales to zero and bills per invocation; a web service bills per running container-hour.

### How much memory should I allocate?

Start with the smallest memory that meets latency requirements, then increase for CPU-bound work. Lambda CPU scales proportionally: `1,769` MB = 1 vCPU. Higher memory can reduce total cost by shortening execution time. The range is `128` to `10,240` MB.

### How do Lambda cold starts affect API latency?

A cold start happens when AWS creates a new function instance. Stacktape exposes `provisionedConcurrency` to keep instances warm for user-facing APIs. Skip provisioned concurrency for background work — it bills while idle and adds deployment time.

### Can a Lambda function use persistent file storage?

Yes. Use `volumeMounts` with an [EFS filesystem](/resources/storage/efs-filesystem) to mount persistent, shared storage. Set `joinDefaultVpc: true` and a `mountPath` starting with `/mnt/`. EFS data persists across invocations and can be shared across multiple functions. The ephemeral `/tmp` directory is only available during one invocation.

### What event sources can trigger a Stacktape Lambda function?

Stacktape Lambda functions support 12 trigger types: HTTP API Gateway, Application Load Balancer, schedules, S3, SQS, SNS, Kinesis streams, DynamoDB streams, CloudWatch logs, EventBridge event buses, Kafka topics, and CloudWatch alarms. Stacktape configures the required permissions for each trigger automatically. See [triggers overview](/configuration/triggers/overview).

## API Reference


## API Reference: `LambdaFunctionProps`
```typescript
import type { AlarmIntegration, ApplicationLoadBalancerIntegration, CdnConfiguration, CloudformationTag, CloudwatchLogIntegration, CustomArtifactLambdaPackaging, DynamoDbIntegration, EnvironmentVar, EventBusIntegration, HttpApiIntegration, KafkaTopicIntegration, KinesisIntegration, LambdaAlarm, LambdaDeploymentConfig, LambdaEfsMount, LambdaFunctionDestinations, LambdaFunctionLogging, LambdaS3FilesMount, LambdaUrlConfig, S3Integration, ScheduleIntegration, SnsIntegration, SqsIntegration, StpBuildpackLambdaPackaging, StpIamRoleStatement } from 'stacktape';

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
  /** Persistent file-system mounts shared across invocations and functions. */
  volumeMounts?: Array<LambdaFunctionVolumeMounts>;
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

type LambdaFunctionVolumeMounts =
  | LambdaEfsMount
  | LambdaS3FilesMount;
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
| `joinDefaultVpc` | no | `boolean` | Connects the function to your VPC so it can reach databases, Redis, and other VPC-only resources. Set this to `true` when the function must reach VPC-only resources such as a database with
`accessibilityMode: 'vpc'`/`'scoping-workloads-in-vpc'`, a Redis cluster, or EFS.

**Tradeoff:** The function loses direct internet access. It can still reach S3 and DynamoDB
(Stacktape auto-creates VPC endpoints), but calls to external APIs (Stripe, OpenAI, etc.) will fail.
If you need both VPC access and internet, use a `web-service` or `worker-service` instead.

Required when using `volumeMounts` (EFS or S3 Files). | `false` |
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
| `volumeMounts` | no | `Array<efs \| s3files>` | Persistent file-system mounts shared across invocations and functions. Unlike `/tmp`, mounted file systems persist independently from the function runtime and can be
shared across multiple functions.
Requires `joinDefaultVpc: true` (Stacktape will remind you if you forget). | - |


## Referenceable parameters


## Referenceable Parameters: `function`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `arn` | Arn of the function | `$ResourceParam("<<resource-name>>", "arn")` |
| `logGroupArn` | Arn of the log group aggregating logs from the function | `$ResourceParam("<<resource-name>>", "logGroupArn")` |
