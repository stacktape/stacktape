# Lambda function

A Lambda function runs your code on AWS Lambda each time an event arrives: an HTTP request, a queue message, a
schedule, a file upload. It scales from zero to thousands of parallel invocations, and you pay per request and per
millisecond of run time, so an idle function costs nothing. One invocation can run for at most 15 minutes.

For an always-on server or a long-running process, use a [web service](/resources/compute/web-service) or a
[worker service](/resources/compute/worker-service). For jobs longer than 15 minutes, use a
[batch job](/resources/compute/batch-job).

## Basic example

This function answers `GET /users/{id}` through an [HTTP API Gateway](/resources/networking/http-api-gateway).
Stacktape bundles `./src/get-user.ts`, picks the Node.js runtime from the file extension and adds the permissions the
gateway needs to call the function.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  HttpApiGateway,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});

  const getUser = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
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


`memory: 1024` gives the function 1,024 MB and a matching share of CPU. `timeout: 30` stops an invocation after 30
seconds (default 10, maximum 900).

The handler:

```ts
export async function handler(event: { pathParameters?: { id?: string } }) {
  return {
    statusCode: 200,
    body: JSON.stringify({ id: event.pathParameters?.id })
  };
}
```

The deploy prints the gateway URL. Call `https://<api-id>.execute-api.<region>.amazonaws.com/users/42` and you get
`{"id":"42"}` back. Read the function's logs with `stacktape logs getUser --stage dev`.

## Packaging

Stacktape supports three Lambda packaging types: [`js-bundle`](/packaging/function/js-bundle), [`buildpack`](/packaging/function/buildpack) and [`custom-artifact`](/packaging/function/custom-artifact).

| Type | Best for |
|---|---|
| **`js-bundle`** (JavaScript, TypeScript) | Point to a source file. Stacktape bundles, minifies and source-maps the code, moves code shared between functions into a shared layer, and uploads the package. |
| **`buildpack`** (Python, Java, Go, Ruby, .NET, Rust) | Point to a source file. Stacktape installs dependencies and compiles the code in Docker on the Lambda build image of the function's `runtime`. |
| **`custom-artifact`** | Provide a pre-built zip. Use when your CI already produces a deployment package or when you need a build step Stacktape does not support. |

`js-bundle` and `buildpack` are the better defaults: they detect the runtime from the file extension, build for the selected architecture and skip unchanged packages. Use [custom artifact](/packaging/function/custom-artifact) only when you own the build outside Stacktape.

### JS bundle

`JsBundleLambdaPackaging` options such as `nodeVersion`, `outputModuleFormat`, `disableSourceMaps` and `minify` are direct properties next to `entryfilePath`. See [JS Bundle for Lambda](/packaging/function/js-bundle) for all options.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/api.ts',
      nodeVersion: 22,
      outputModuleFormat: 'esm'
    })
  });

  return { resources: { api } };
});
```


`nodeVersion` selects the Node.js major version for the build; keep it aligned with the function's `runtime`. `outputModuleFormat` switches between `'cjs'` (CommonJS) and `'esm'` (ES Modules, enables top-level `await`). Node.js 24 and later use ESM output automatically; earlier versions default to CommonJS. Some npm packages do not support ESM.

### Buildpack

`BuildpackLambdaPackaging` builds Python, Java, Go, Ruby, .NET and Rust functions. The function's `runtime` selects the language version. Language options are grouped under `python`, `java` and `dotnet`. See [Buildpack for Lambda](/packaging/function/buildpack) for all options.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, BuildpackLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const processor = new LambdaFunction({
    runtime: 'python3.13',
    packaging: new BuildpackLambdaPackaging({
      entryfilePath: './src/process.py',
      python: { packageManagerFile: './pyproject.toml' }
    })
  });

  return { resources: { processor } };
});
```


### Custom artifact

The `CustomArtifactLambdaPackaging` class takes a `packagePath` pointing to a pre-built deployment package. If the path points to a directory or a non-zip file, Stacktape zips it before upload. With `custom-artifact`, there is no source file for runtime auto-detection, so you must set `runtime` on the resource and `handler` in the packaging. The handler file must be at the artifact root; see [custom-artifact limitations](/packaging/function/custom-artifact#handler). If you use `architecture: 'arm64'`, pre-compile any native dependencies for that architecture yourself.


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

A function receives work through its `events` list. Stacktape creates the event source and the permissions for each
entry.

| Trigger | `type` | Guide |
|---|---|---|
| HTTP API Gateway | `http-api-gateway` | [HTTP triggers](/resources/triggers/http-triggers) |
| Application Load Balancer | `application-load-balancer` | [HTTP triggers](/resources/triggers/http-triggers) |
| WebSocket API Gateway | `websocket-api-gateway` | [WebSocket API Gateway](/resources/networking/websocket-api-gateway) |
| AppSync GraphQL resolver | `appsync-api` | [AppSync API](/resources/networking/appsync-api) |
| Schedule | `schedule` | [Schedule triggers](/resources/triggers/schedule-triggers) |
| S3 | `s3` | [S3 events](/resources/triggers/s3-events) |
| SQS | `sqs` | [SQS events](/resources/triggers/sqs-events) |
| SNS | `sns` | [SNS events](/resources/triggers/sns-events) |
| DynamoDB stream | `dynamo-db-stream` | [DynamoDB streams](/resources/triggers/dynamodb-streams) |
| Kinesis stream | `kinesis-stream` | [Kinesis events](/resources/triggers/kinesis-events) |
| EventBridge | `event-bus` | [EventBridge events](/resources/triggers/event-bus-events) |
| CloudWatch Logs | `cloudwatch-log` | [CloudWatch logs](/resources/triggers/cloudwatch-logs) |
| CloudWatch alarm | `cloudwatch-alarm` | [Alarms as triggers](/resources/triggers/alarms-as-triggers) |
| Kafka topic | `kafka-topic` | [Kafka topics](/resources/triggers/kafka-topics) |

Queue and stream triggers (`sqs`, `kinesis-stream`, `dynamo-db-stream`, `kafka-topic`) deliver records in batches.
`batchSize` caps the records per invocation and `maxBatchWindowSeconds` (up to 300) waits to fill a batch. Defaults and
limits differ per source; each trigger guide lists them. When a handler throws, the whole batch is retried, including
the records that succeeded. Make handlers idempotent, or turn on `reportBatchItemFailures` and return the failed record
IDs in `batchItemFailures` so only those are retried.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  SqsQueue,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const jobs = new SqsQueue({});

  const worker = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/worker.ts' }),
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


A `schedule` trigger takes a rate (`rate(5 minutes)`) or a six-field AWS cron expression in UTC
(`cron(0 18 ? * MON-FRI *)`). See [Schedule triggers](/resources/triggers/schedule-triggers).

## Function URLs

A function URL gives one function its own HTTPS endpoint (`https://<id>.lambda-url.<region>.on.aws`) with no API
gateway. It suits a webhook receiver or an app that does its own routing, such as Hono or Express behind `handle()`.
Use an [HTTP API Gateway](/resources/networking/http-api-gateway) when several functions share one API or you want
routing by method and path.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const webhook = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/webhook.ts' }),
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


`authMode` is `'NONE'` by default, so anyone can call the URL. `'AWS_IAM'` accepts only signed requests from AWS
identities with invoke permission. `cors.enabled: true` alone allows every origin and method; `allowedOrigins` and
`allowedMethods` narrow it. These CORS settings override CORS headers your code returns.

`responseStreamEnabled: true` sends the response as your handler writes it, instead of buffering it, and lifts the 6 MB
limit of buffered responses. The handler must use Lambda's streaming handler pattern.

## Runtime resources

`runtime`, `architecture`, `memory`, `timeout` and `storage` set the language version, CPU, time limit and scratch
disk of each invocation.

`runtime` comes from the file extension with `js-bundle` and `buildpack` packaging. Set it to pin a version, for Rust
(`provided.al2023`) and for `custom-artifact` packaging. The accepted values are listed in the
[configuration reference](#configuration-reference).

`memory` is 128 MB unless you set it, and accepts 128 to 10,240 MB. CPU grows with memory: 1,769 MB is one vCPU. For
CPU-bound code, more memory often costs less in total, because the function finishes sooner.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const imageProcessor = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/image-processor.ts' }),
    runtime: 'nodejs22.x',
    architecture: 'arm64',
    memory: 2048,
    timeout: 120,
    storage: 2048
  });

  return { resources: { imageProcessor } };
});
```


`architecture: 'arm64'` (AWS Graviton) costs about 20% less per GB-second than the default `x86_64` and usually needs no
code changes. `js-bundle` and `buildpack` build for the architecture you pick; with a custom artifact, compile native
dependencies for it yourself.

`storage` sets the size of `/tmp`, from 512 MB (default) to 10,240 MB. It's scratch space: it isn't shared between
instances and can disappear between invocations.

## Concurrency

- **`reservedConcurrency`** caps how many instances of this function run at once and reserves that many from your
  account's limit. Use it when a database or a third-party API can't take unlimited parallel calls. It costs nothing.
- **`provisionedConcurrency`** keeps instances initialized so requests skip the cold start. You pay for them while they
  wait. Use it only on latency-sensitive paths.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const checkout = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/checkout.ts' }),
    reservedConcurrency: 25,
    provisionedConcurrency: 3
  });

  return { resources: { checkout } };
});
```


## Networking

A function runs outside your VPC by default and can reach the internet. Set `joinDefaultVpc: true` only when it must
reach something that accepts VPC connections only: a [relational database](/resources/databases/relational-database)
in a VPC access mode, a [Redis cache](/resources/databases/redis) or an [EFS file system](/resources/storage/efs-filesystem).

A function in the VPC loses internet access. S3 and DynamoDB stay reachable through VPC endpoints, but calls to payment
providers, AI APIs or webhooks fail. To keep them working, set `stackConfig.nat`: VPC functions then run in private
subnets and go out through NAT. The `ec2` NAT is one small instance managed by Stacktape (about $7 a month, no
failover), `ha-ec2` runs one per availability zone with failover, and `gateway` uses AWS NAT Gateways (about $32 a
month per zone plus $0.045 per GB). See [VPC and networking](/configuration/connecting-resources#vpc-and-networking).
Without NAT, `stacktape deploy` warns about every VPC function that has no internet access.

### Connecting to resources

`connectTo` grants IAM permissions, opens the network path to databases and Redis, and injects
`STP_<RESOURCE>_<PARAM>` environment variables. [Connecting resources](/configuration/connecting-resources) lists the
variables per resource type. Put your own settings in `environment` and secrets in
[`$Secret()`](/configuration/secrets).


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  RelationalDatabase,
  RdsEnginePostgres,
  $Secret,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }),
    credentials: { masterUserPassword: $Secret('database', 'password') }
  });

  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
    memory: 1024,
    timeout: 30,
    connectTo: [database],
    joinDefaultVpc: true,
    environment: { LOG_LEVEL: 'info' }
  });

  return { resources: { database, api } };
});
```


Here the function gets `STP_DATABASE_CONNECTION_STRING`, `STP_DATABASE_HOST`, `STP_DATABASE_PORT` and the other
database variables next to `LOG_LEVEL`.

For AWS services that `connectTo` doesn't cover, such as Rekognition, Bedrock or Textract, add `iamRoleStatements`:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const analyzer = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/analyzer.ts' }),
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

For files that must outlive an invocation or be shared between functions, mount an
[EFS file system](/resources/storage/efs-filesystem) with `volumeMounts`. Mounts need `joinDefaultVpc: true`, and
`mountPath` must start with `/mnt/`. The `s3files` mount type attaches an S3 Files access point you already manage. For
most data, an [S3 bucket](/resources/storage/s3-bucket) or a database is simpler than a file system.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  EfsFilesystem,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const sharedFiles = new EfsFilesystem({});

  const renderer = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/renderer.ts' }),
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


`rootDirectory` limits the mount to a directory of the file system (default `/`).

## CDN

`cdn.enabled: true` puts a CloudFront distribution in front of the function's URL. Cacheable public responses, such as
a product catalog, are then served from CloudFront locations near your users without invoking the function. Leave it
off for personalized responses. See [CDN](/resources/networking/cdn) for cache rules.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const catalog = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/catalog.ts' }),
    url: { enabled: true },
    cdn: {
      enabled: true
    }
  });

  return { resources: { catalog } };
});
```


## Deployments

`deployment.strategy` shifts traffic from the old version to the new one gradually, and rolls back if something fails.
Use it for production functions where a bad release would hurt users.

| Strategy | Behavior |
|---|---|
| `Canary10Percent5Minutes`, `…10Minutes`, `…15Minutes`, `…30Minutes` | 10% of traffic first, the rest after the wait |
| `Linear10PercentEvery1Minute`, `…2Minutes`, `…3Minutes`, `…10Minutes` | 10% more at each interval |
| `AllAtOnce` | Switch at once |


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
    deployment: {
      strategy: 'Canary10Percent5Minutes'
    }
  });

  return { resources: { api } };
});
```


`beforeAllowTrafficFunction` and `afterTrafficShiftFunction` name functions that check the release before and after the
shift. If one reports a failure, the deployment rolls back. See
[Gradual deployments](/deployment-and-lifecycle/gradual-deployments).

## Destinations

For asynchronous invocations (S3, SNS, EventBridge, or an `Event` invoke), `destinations` sends each result to an SQS
queue, SNS topic, event bus or another function: `onSuccess` for results, `onFailure` for errors after the retries.
They don't apply to synchronous callers like API gateways and load balancers. Stream triggers have their own
`onFailure` setting.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  SqsQueue,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const deadLetterQueue = new SqsQueue({});

  const processor = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/processor.ts' }),
    destinations: {
      onFailure: "$ResourceParam('deadLetterQueue', 'arn')"
    }
  });

  return { resources: { deadLetterQueue, processor } };
});
```


Both take an ARN. Use [`$ResourceParam()`](/configuration/directives) for a resource in the same config.

## Logs and alarms

Everything the function writes to stdout and stderr goes to CloudWatch Logs, kept for 90 days by default
(`logging.retentionDays`). Read it with [`stacktape logs`](/cli/logs). `logging.logForwarding` sends logs to an HTTP
endpoint, Datadog or Highlight.io; see [Log forwarding](/observability/log-forwarding).

Function alarms use the `lambda-error-rate` and `lambda-duration` triggers. See [Alarms](/observability/alarms) for
evaluation settings and notification channels.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
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


This alarm fires when more than 5% of invocations fail, or when an invocation runs longer than 5 seconds.

## Layers

`layers` attaches up to five Lambda layer ARNs: shared libraries, a custom runtime or data that several functions need.
You rarely need them, because `js-bundle` and `buildpack` package dependencies for you.

## Examples

### HTTP API with DynamoDB

A Hono API that reads and writes a [DynamoDB table](/resources/databases/dynamodb). `connectTo` grants the function
read and write access to the table and injects `STP_USERS_TABLE_NAME`.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  HttpApiGateway,
  DynamoDbTable,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});

  const usersTable = new DynamoDbTable({
    primaryKey: { partitionKey: { name: 'userId', type: 'string' } }
  });

  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
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
    connectTo: [usersTable],
    memory: 512,
    timeout: 30
  });

  return { resources: { apiGateway, usersTable, api } };
});
```


The handler:

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

### Scheduled job

A function that runs every night at 03:00 UTC:


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const cleanup = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/cleanup.ts'
    }),
    events: [
      {
        type: 'schedule',
        properties: { scheduleRate: 'cron(0 3 * * ? *)' }
      }
    ],
    timeout: 120
  });

  return { resources: { cleanup } };
});
```


To delete expired DynamoDB items, a [TTL attribute](/resources/databases/dynamodb) is cheaper than a scheduled scan.

## Configuration reference


### Definition: `LambdaFunctionProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/function` with definition name `LambdaFunctionProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `packaging` | yes | `js-bundle \| buildpack \| custom-artifact` | - |
| `alarms` | no | `Array<LambdaAlarm>` | - |
| `architecture` | no | `string: "arm64" \| "x86_64"` | `x86_64` |
| `cdn` | no | `CdnConfiguration` | - |
| `connectTo` | no | `Array<string>` | - |
| `deployment` | no | `LambdaDeploymentConfig` | - |
| `destinations` | no | `LambdaFunctionDestinations` | - |
| `disabledGlobalAlarms` | no | `Array<string>` | - |
| `environment` | no | `Array<EnvironmentVar>` | - |
| `events` | no | `Array<application-load-balancer \| kafka-topic \| sns \| sqs \| kinesis-stream \| dynamo-db-stream \| s3 \| schedule \| cloudwatch-alarm \| cloudwatch-log \| http-api-gateway \| appsync-api \| websocket-api-gateway \| event-bus>` | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | - |
| `joinDefaultVpc` | no | `boolean` | `false` |
| `layers` | no | `Array<string>` | - |
| `logging` | no | `LambdaFunctionLogging` | - |
| `memory` | no | `number` | - |
| `provisionedConcurrency` | no | `number` | - |
| `releaseCommand` | no | `ReleaseCommand \| option-2` | - |
| `reservedConcurrency` | no | `number` | - |
| `runtime` | no | `string: "dotnet10" \| "dotnet6" \| "dotnet7" \| "dotnet8" \| "java11" \| "java17" \| "java21" \| "java25" \| "java8" \| "java8.al2" \| "nodejs18.x" \| "nodejs20.x" \| "nodejs22.x" \| "nodejs24.x" \| "provided.al2" \| "provided.al2023" \| "python3.10" \| "python3.11" \| "python3.12" \| "python3.13" \| "python3.14" \| "python3.8" \| "python3.9" \| "ruby3.3" \| "ruby3.4" \| "ruby4.0"` | - |
| `storage` | no | `number` | `512` |
| `tags` | no | `Array<CloudformationTag>` | - |
| `timeout` | no | `number` | `10` |
| `tracing` | no | `TracingOptions \| option-2` | - |
| `url` | no | `LambdaUrlConfig` | - |
| `volumeMounts` | no | `Array<efs \| s3files>` | - |


## Referenceable parameters


## Referenceable Parameters: `function`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `arn` | Arn of the function | `$ResourceParam("<<resource-name>>", "arn")` |
| `logGroupArn` | Arn of the log group aggregating logs from the function | `$ResourceParam("<<resource-name>>", "logGroupArn")` |


## Next steps

- [Triggers](/resources/triggers/overview): pick what starts the function.
- [Dev mode](/local-development/dev-mode-overview): run and debug functions against your stack.
- [Logs](/observability/logs): read and follow what the function prints.
