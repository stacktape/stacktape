# LambdaFunctionProps API Reference

Resource type: `function`

## TypeScript definition

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

## Property: `packaging`

- Required: yes
- Type: `stacktape-lambda-buildpack | custom-artifact`

How your code is built and packaged for deployment.

**`stacktape-lambda-buildpack`** (recommended): Point to your source file and Stacktape builds,
bundles, and uploads it automatically.
**`custom-artifact`**: Provide a pre-built zip file. Stacktape handles the upload.

Choices:
- `stacktape-lambda-buildpack` (`StpBuildpackLambdaPackaging`) — A zero-config buildpack that packages your code for AWS Lambda.. Properties: `handlerFunction?: string`, `entryfilePath: string`, `includeFiles?: Array<string>`, `excludeFiles?: Array<string>`, `excludeDependencies?: Array<string>`, `languageSpecificConfig?: Es | Py | Java | Php | Dotnet | Go | Ruby`.
- `custom-artifact` (`CustomArtifactLambdaPackaging`) — Uses a pre-built artifact for Lambda deployment.. Properties: `packagePath: string`, `handler?: string`.

### Example 1 (yaml)

```yaml
resources:
  apiFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/handlers/api.ts
      memory: 512
      timeout: 15
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: mainApi
            method: GET
            path: /health
  mainApi:
    type: http-api-gateway
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const apiFunction = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/handlers/api.ts' }
    },
    memory: 512,
    timeout: 15,
    events: [
      { type: 'http-api-gateway', properties: { httpApiGatewayName: 'mainApi', method: 'GET', path: '/health' } }
    ]
  });
  const mainApi = new HttpApiGateway({});
  return { resources: { apiFunction, mainApi } };
});
```

## Property: `alarms`

- Required: no
- Type: `Array<LambdaAlarm>`

Alarms for this function (merged with global alarms from the Stacktape Console).

### Example 1 (yaml)

```yaml
resources:
  criticalApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/critical.ts
      alarms:
        - trigger:
            type: lambda-error-rate
            properties:
              thresholdPercent: 5
          notificationTargets:
            - type: email
              properties:
                sender: alerts@example.com
                recipient: oncall@example.com
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const criticalApi = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/critical.ts' } },
    alarms: [
      {
        trigger: { type: 'lambda-error-rate', properties: { thresholdPercent: 5 } },
        notificationTargets: [
          { type: 'email', properties: { sender: 'alerts@example.com', recipient: 'oncall@example.com' } }
        ]
      }
    ]
  });
  return { resources: { criticalApi } };
});
```

## Property: `architecture`

- Required: no
- Type: `string: "arm64" | "x86_64"`
- Default: `x86_64`

Processor architecture: `x86_64` (default) or `arm64` (Graviton, ~20% cheaper).

`arm64` is cheaper per GB-second and often faster. Works with most code out of the box.
If using `stacktape-lambda-buildpack`, Stacktape builds for the selected architecture automatically.
With `custom-artifact`, you must pre-compile for the target architecture.

### Example 1 (yaml)

```yaml
resources:
  imageResizer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/resize.ts
      architecture: arm64
      memory: 1024
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const imageResizer = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/resize.ts' } },
    architecture: 'arm64',
    memory: 1024
  });
  return { resources: { imageResizer } };
});
```

## Property: `cdn`

- Required: no
- Type: `CdnConfiguration`

Put a CDN (CloudFront) in front of this function for caching and lower latency.

Caches responses at edge locations worldwide. Reduces function invocations and bandwidth costs.

### Example 1 (yaml)

```yaml
resources:
  ssrFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/render.ts
      memory: 1024
      url:
        enabled: true
      cdn:
        enabled: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ssrFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/render.ts' } },
    memory: 1024,
    url: { enabled: true },
    cdn: { enabled: true }
  });
  return { resources: { ssrFunction } };
});
```

## Property: `connectTo`

- Required: no
- Type: `Array<string>`

Give this resource access to other resources in your stack.

List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.

### Example 1 (yaml)

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
      connectTo:
        - mainDb
        - uploads
  mainDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t4g.micro
  uploads:
    type: bucket
    properties: {}
```

### Example 2 (typescript)

```typescript
import { WebService, RelationalDatabase, Bucket, RdsEnginePostgres, StacktapeImageBuildpackPackaging, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const uploads = new Bucket({});
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    connectTo: [mainDb, uploads]
  });

  return { resources: { api, mainDb, uploads } };
});
```

## Property: `deployment`

- Required: no
- Type: `LambdaDeploymentConfig`

Gradual traffic shifting for safe deployments.

Instead of switching all traffic to the new version instantly, shift it gradually
(canary or linear). If issues arise, traffic rolls back automatically.

### Example 1 (yaml)

```yaml
resources:
  paymentApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/payment.ts
      deployment:
        strategy: Canary10Percent5Minutes
        beforeAllowTrafficFunction: smokeTest
  smokeTest:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/smoke-test.ts
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const paymentApi = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/payment.ts' } },
    deployment: {
      strategy: 'Canary10Percent5Minutes',
      beforeAllowTrafficFunction: 'smokeTest'
    }
  });
  const smokeTest = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/smoke-test.ts' } }
  });
  return { resources: { paymentApi, smokeTest } };
});
```

## Property: `destinations`

- Required: no
- Type: `LambdaFunctionDestinations`

Route async invocation results to another service (SQS, SNS, EventBus, or another function).

Useful for building event-driven workflows: send successful results to one destination
and failures to another for error handling.

### Example 1 (yaml)

```yaml
resources:
  asyncProcessor:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/process.ts
      destinations:
        onSuccess: $ResourceParam('successTopic', 'arn')
        onFailure: $ResourceParam('deadLetterQueue', 'arn')
  successTopic:
    type: sns-topic
  deadLetterQueue:
    type: sqs-queue
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, SnsTopic, SqsQueue, defineConfig, $ResourceParam } from 'stacktape';

export default defineConfig(() => {
  const asyncProcessor = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/process.ts' } },
    destinations: {
      onSuccess: $ResourceParam('successTopic', 'arn'),
      onFailure: $ResourceParam('deadLetterQueue', 'arn')
    }
  });
  const successTopic = new SnsTopic({});
  const deadLetterQueue = new SqsQueue({});
  return { resources: { asyncProcessor, successTopic, deadLetterQueue } };
});
```

## Property: `disabledGlobalAlarms`

- Required: no
- Type: `Array<string>`

Global alarm names to exclude from this function.

### Example 1 (yaml)

```yaml
resources:
  batchReporter:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/batch.ts
      timeout: 300
      disabledGlobalAlarms:
        - lambda-duration-global
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const batchReporter = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/batch.ts' } },
    timeout: 300,
    disabledGlobalAlarms: ['lambda-duration-global']
  });
  return { resources: { batchReporter } };
});
```

## Property: `environment`

- Required: no
- Type: `Array<EnvironmentVar>`

Environment variables available to the function at runtime.

Variables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically.

### Example 1 (yaml)

```yaml
resources:
  worker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/worker.ts
      environment:
        - name: STAGE
          value: production
        - name: STRIPE_SECRET_KEY
          value: $Secret('stripe-key')
        - name: MAX_RETRIES
          value: 3
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const worker = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/worker.ts' } },
    environment: {
      STAGE: 'production',
      STRIPE_SECRET_KEY: $Secret('stripe-key'),
      MAX_RETRIES: 3
    }
  });
  return { resources: { worker } };
});
```

## Property: `events`

- Required: no
- Type: `Array<application-load-balancer | kafka-topic | sns | sqs | kinesis-stream | dynamo-db-stream | s3 | schedule | cloudwatch-alarm | cloudwatch-log | http-api-gateway | event-bus>`

What triggers this function: HTTP requests, file uploads, queues, schedules, etc.

Stacktape auto-configures permissions for each trigger.
The event payload your function receives depends on the trigger type.

Choices:
- `application-load-balancer` (`ApplicationLoadBalancerIntegration`) — Triggers a function when an Application Load Balancer receives a matching HTTP request.. Properties: `loadBalancerName: string`, `listenerPort?: number`, `priority: number`, `paths?: Array<string>`, `methods?: Array<string>`, `hosts?: Array<string>`, `headers?: Array<LbHeaderCondition>`, `queryParams?: Array<LbQueryParamCondition>`, `sourceIps?: Array<string>`.
- `kafka-topic` (`KafkaTopicIntegration`) — Triggers a function when new messages are available in a Kafka topic.. Properties: `customKafkaConfiguration?: CustomKafkaEventSource`, `batchSize?: number`, `maxBatchWindowSeconds?: number`.
- `sns` (`SnsIntegration`) — Triggers a function when a new message is published to an SNS topic.. Properties: `snsTopicName?: string`, `snsTopicArn?: string`, `filterPolicy?: unknown`, `onDeliveryFailure?: SnsOnDeliveryFailure`.
- `sqs` (`SqsIntegration`) — Triggers a function when new messages are available in an SQS queue.. Properties: `sqsQueueName?: string`, `sqsQueueArn?: string`, `batchSize?: number`, `maxBatchWindowSeconds?: number`.
- `kinesis-stream` (`KinesisIntegration`) — Triggers a function when new records are available in a Kinesis Data Stream.. Properties: `kinesisStreamName?: string`, `streamArn?: string`, `consumerArn?: string`, `autoCreateConsumer?: boolean`, `maxBatchWindowSeconds?: number`, `batchSize?: number`, `startingPosition?: string: "LATEST" | "TRIM_HORIZON"`, `maximumRetryAttempts?: number`, `onFailure?: DestinationOnFailure`, `parallelizationFactor?: number`, `bisectBatchOnFunctionError?: boolean`.
- `dynamo-db-stream` (`DynamoDbIntegration`) — Triggers a function when items are created, updated, or deleted in a DynamoDB table.. Properties: `streamArn: string`, `maxBatchWindowSeconds?: number`, `batchSize?: number`, `startingPosition?: string`, `maximumRetryAttempts?: number`, `onFailure?: DestinationOnFailure`, `parallelizationFactor?: number`, `bisectBatchOnFunctionError?: boolean`.
- `s3` (`S3Integration`) — Triggers a function when files are created, deleted, or restored in an S3 bucket.. Properties: `bucketArn: string`, `s3EventType: string: "s3:ObjectCreated:*" | "s3:ObjectCreated:CompleteMultipartUpload" | "s3:ObjectCreated:Copy" | "s3:ObjectCreated:Post" | "s3:ObjectCreated:Put" | "s3:ObjectRemoved:*" | "s3:ObjectRemoved:Delete" | "s3:ObjectRemoved:DeleteMarkerCreated" | "s3:ObjectRestore:*" | "s3:ObjectRestore:Completed" | "s3:ObjectRestore:Post" | "s3:ReducedRedundancyLostObject" | "s3:Replication:*" | "s3:Replication:OperationFailedReplication" | "s3:Replication:OperationMissedThreshold" | "s3:Replication:OperationNotTracked" | "s3:Replication:OperationReplicatedAfterThreshold"`, `filterRule?: S3FilterRule`.
- `schedule` (`ScheduleIntegration`) — Triggers a function on a recurring schedule (cron jobs, periodic tasks).. Properties: `scheduleRate: string`, `input?: unknown`, `inputPath?: string`, `inputTransformer?: EventInputTransformer`.
- `cloudwatch-alarm` (`AlarmIntegration`). Properties: `alarmName: string`.
- `cloudwatch-log` (`CloudwatchLogIntegration`) — Triggers a function when new log records appear in a CloudWatch log group.. Properties: `logGroupArn: string`, `filter?: string`.
- `http-api-gateway` (`HttpApiIntegration`) — Triggers a function when an HTTP API Gateway receives a matching request.. Properties: `httpApiGatewayName: string`, `method: string: "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT"`, `path: string`, `authorizer?: cognito | lambda`, `payloadFormat?: string: "1.0" | "2.0"`.
- `event-bus` (`EventBusIntegration`) — Triggers a batch job when an event matching a specified pattern is received by an event bus.. Properties: `eventBusArn?: string`, `eventBusName?: string`, `useDefaultBus?: boolean`, `eventPattern: EventBusIntegrationPattern`, `onDeliveryFailure?: EventBusOnDeliveryFailure`, `input?: unknown`, `inputPath?: string`, `inputTransformer?: EventInputTransformer`.

### Example 1 (yaml)

```yaml
resources:
  ordersApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/orders.ts
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: publicApi
            method: POST
            path: /orders
        - type: schedule
          properties:
            scheduleRate: rate(1 hour)
  publicApi:
    type: http-api-gateway
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ordersApi = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/orders.ts' } },
    events: [
      { type: 'http-api-gateway', properties: { httpApiGatewayName: 'publicApi', method: 'POST', path: '/orders' } },
      { type: 'schedule', properties: { scheduleRate: 'rate(1 hour)' } }
    ]
  });
  const publicApi = new HttpApiGateway({});
  return { resources: { ordersApi, publicApi } };
});
```

## Property: `iamRoleStatements`

- Required: no
- Type: `Array<StpIamRoleStatement>`

Raw IAM policy statements for permissions not covered by `connectTo`.

Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock).

### Example 1 (yaml)

```yaml
resources:
  processor:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/job.ts
      resources:
        cpu: 1
        memory: 2048
      iamRoleStatements:
        - Effect: Allow
          Action:
            - textract:AnalyzeDocument
          Resource:
            - '*'
```

### Example 2 (typescript)

```typescript
import { BatchJob, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const processor = new BatchJob({
    container: { packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/job.ts' }) },
    resources: { cpu: 1, memory: 2048 },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['textract:AnalyzeDocument'],
        Resource: ['*']
      }
    ]
  });

  return { resources: { processor } };
});
```

## Property: `joinDefaultVpc`

- Required: no
- Type: `boolean`
- Default: `false`

Connects the function to your VPC so it can reach databases, Redis, and other VPC-only resources.

Set this to `true` when the function must reach VPC-only resources such as a database with
`accessibilityMode: 'vpc'`/`'scoping-workloads-in-vpc'`, a Redis cluster, or EFS.

**Tradeoff:** The function loses direct internet access. It can still reach S3 and DynamoDB
(Stacktape auto-creates VPC endpoints), but calls to external APIs (Stripe, OpenAI, etc.) will fail.
If you need both VPC access and internet, use a `web-service` or `worker-service` instead.

Required when using `volumeMounts` (EFS or S3 Files).

### Example 1 (yaml)

```yaml
resources:
  dbMigrator:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/migrate.ts
      joinDefaultVpc: true
      connectTo:
        - mainDb
  mainDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t3.micro
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: { type: 'postgres', properties: { version: '16.2', primaryInstance: { instanceSize: 'db.t3.micro' } } }
  });
  const dbMigrator = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/migrate.ts' } },
    joinDefaultVpc: true,
    connectTo: [mainDb]
  });
  return { resources: { dbMigrator, mainDb } };
});
```

## Property: `layers`

- Required: no
- Type: `Array<string>`

Lambda Layer ARNs to attach (shared libraries, custom runtimes, etc.).

Layers are zip archives with additional code/data mounted into the function.
Provide the layer ARN (e.g., from AWS console or another stack). Max 5 layers per function.

### Example 1 (yaml)

```yaml
resources:
  monitoredFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/handler.ts
      layers:
        - arn:aws:lambda:eu-west-1:464622532012:layer:Datadog-Extension:62
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const monitoredFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/handler.ts' } },
    layers: ['arn:aws:lambda:eu-west-1:464622532012:layer:Datadog-Extension:62']
  });
  return { resources: { monitoredFunction } };
});
```

## Property: `logging`

- Required: no
- Type: `LambdaFunctionLogging`

Logging configuration (retention, forwarding).

Logs (`stdout`/`stderr`) are auto-sent to CloudWatch. View with `stacktape logs` or in the Stacktape Console.

### Example 1 (yaml)

```yaml
resources:
  apiHandler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/api.ts
      logging:
        retentionDays: 30
        logForwarding:
          type: datadog
          properties:
            apiKey: $Secret('datadog-api-key')
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const apiHandler = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/api.ts' } },
    logging: {
      retentionDays: 30,
      logForwarding: { type: 'datadog', properties: { apiKey: $Secret('datadog-api-key') } }
    }
  });
  return { resources: { apiHandler } };
});
```

## Property: `memory`

- Required: no
- Type: `number`

Memory in MB (128 - 10,240). Also determines CPU power.

Lambda scales CPU proportionally to memory: 1,769 MB = 1 vCPU, 3,538 MB = 2 vCPUs, etc.
If your function is slow, increasing memory gives it more CPU, which often makes it faster
and cheaper overall (less execution time).

### Example 1 (yaml)

```yaml
resources:
  pdfRenderer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/pdf.ts
      memory: 3538
      timeout: 120
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const pdfRenderer = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/pdf.ts' } },
    memory: 3538,
    timeout: 120
  });
  return { resources: { pdfRenderer } };
});
```

## Property: `provisionedConcurrency`

- Required: no
- Type: `number`

Eliminates cold starts by keeping function instances warm and ready.

When a function hasn't been called recently, the first request can take 1-5+ seconds ("cold start").
This setting pre-warms the specified number of instances so they respond instantly.

**When to use:** User-facing APIs, web/mobile backends, or any function where response time matters.
Skip this for background jobs, cron tasks, or data pipelines.

**Cost:** You pay for each provisioned instance even when idle. Also increases deploy time by ~2-5 minutes.

### Example 1 (yaml)

```yaml
resources:
  checkoutApi:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/checkout.ts
      memory: 1024
      provisionedConcurrency: 5
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: storeApi
            method: POST
            path: /checkout
  storeApi:
    type: http-api-gateway
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, HttpApiGateway, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const checkoutApi = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/checkout.ts' } },
    memory: 1024,
    provisionedConcurrency: 5,
    events: [
      { type: 'http-api-gateway', properties: { httpApiGatewayName: 'storeApi', method: 'POST', path: '/checkout' } }
    ]
  });
  const storeApi = new HttpApiGateway({});
  return { resources: { checkoutApi, storeApi } };
});
```

## Property: `reservedConcurrency`

- Required: no
- Type: `number`

Cap the maximum number of concurrent instances for this function.

Reserves this many execution slots exclusively for this function — other functions can't use them,
and this function can't scale beyond it. **No additional cost.**

Common uses:

Prevent overwhelming a database with too many connections
Guarantee capacity for critical functions
Throttle expensive downstream API calls

### Example 1 (yaml)

```yaml
resources:
  legacyDbWriter:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/write.ts
      reservedConcurrency: 10
      connectTo:
        - legacyDb
  legacyDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t3.micro
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, RelationalDatabase, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const legacyDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: { type: 'postgres', properties: { version: '16.2', primaryInstance: { instanceSize: 'db.t3.micro' } } }
  });
  const legacyDbWriter = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/write.ts' } },
    reservedConcurrency: 10,
    connectTo: [legacyDb]
  });
  return { resources: { legacyDbWriter, legacyDb } };
});
```

## Property: `runtime`

- Required: no
- Type: `string: "dotnet6" | "dotnet7" | "dotnet8" | "java11" | "java17" | "java8" | "java8.al2" | "nodejs18.x" | "nodejs20.x" | "nodejs22.x" | "nodejs24.x" | "provided.al2" | "provided.al2023" | "python3.10" | "python3.11" | "python3.12" | "python3.13" | "python3.8" | "python3.9" | "ruby3.3"`

The language runtime (e.g., `nodejs22.x`, `python3.13`).

Auto-detected from your source file extension when using `stacktape-lambda-buildpack`.
Override only if you need a specific version.

### Example 1 (yaml)

```yaml
resources:
  reportGenerator:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/report.py
      runtime: python3.13
      memory: 1024
      timeout: 60
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const reportGenerator = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/report.py' } },
    runtime: 'python3.13',
    memory: 1024,
    timeout: 60
  });
  return { resources: { reportGenerator } };
});
```

## Property: `storage`

- Required: no
- Type: `number`
- Default: `512`

Size of the `/tmp` directory in MB (512 - 10,240). Ephemeral per invocation.

Increase if your function downloads/processes large files temporarily.

### Example 1 (yaml)

```yaml
resources:
  videoTranscoder:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/transcode.ts
      memory: 3008
      timeout: 600
      storage: 4096
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const videoTranscoder = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/transcode.ts' } },
    memory: 3008,
    timeout: 600,
    storage: 4096
  });
  return { resources: { videoTranscoder } };
});
```

## Property: `tags`

- Required: no
- Type: `Array<CloudformationTag>`

Additional tags for this function (on top of stack-level tags). Max 50.

### Example 1 (yaml)

```yaml
resources:
  billingFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/billing.ts
      tags:
        - name: team
          value: payments
        - name: cost-center
          value: "4400"
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const billingFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/billing.ts' } },
    tags: [
      { name: 'team', value: 'payments' },
      { name: 'cost-center', value: '4400' }
    ]
  });
  return { resources: { billingFunction } };
});
```

## Property: `timeout`

- Required: no
- Type: `number`
- Default: `10`

Max execution time in seconds. Function is killed if it exceeds this.

Maximum: 900 seconds (15 minutes). For longer tasks, use a `batch-job` or `worker-service`.

### Example 1 (yaml)

```yaml
resources:
  dataImporter:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/import.ts
      memory: 512
      timeout: 300
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const dataImporter = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/import.ts' } },
    memory: 512,
    timeout: 300
  });
  return { resources: { dataImporter } };
});
```

## Property: `url`

- Required: no
- Type: `LambdaUrlConfig`

Give this function its own HTTPS URL (no API Gateway needed).

Simpler and cheaper than an API Gateway for single-function endpoints.
URL format: `https://{id}.lambda-url.{region}.on.aws`

### Example 1 (yaml)

```yaml
resources:
  webhookReceiver:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/webhook.ts
      url:
        enabled: true
        authMode: NONE
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webhookReceiver = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/webhook.ts' } },
    url: { enabled: true, authMode: 'NONE' }
  });
  return { resources: { webhookReceiver } };
});
```

## Property: `volumeMounts`

- Required: no
- Type: `Array<efs | s3files>`

Persistent file-system mounts shared across invocations and functions.

Unlike `/tmp`, mounted file systems persist independently from the function runtime and can be
shared across multiple functions.
Requires `joinDefaultVpc: true` (Stacktape will remind you if you forget).

Choices:
- `efs` (`LambdaEfsMount`). Properties: `efsFilesystemName: string`, `rootDirectory?: string`, `mountPath: string`.
- `s3files` (`LambdaS3FilesMount`). Properties: `accessPointArn: IntrinsicFunction | option-2`, `mountPath: string`.

### Example 1 (yaml)

```yaml
resources:
  sharedDataFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/handler.ts
      joinDefaultVpc: true
      volumeMounts:
        - type: efs
          properties:
            efsFilesystemName: sharedStorage
            mountPath: /mnt/data
  sharedStorage:
    type: efs-filesystem
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, EfsFilesystem, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const sharedDataFunction = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/handler.ts' } },
    joinDefaultVpc: true,
    volumeMounts: [
      { type: 'efs', properties: { efsFilesystemName: 'sharedStorage', mountPath: '/mnt/data' } }
    ]
  });
  const sharedStorage = new EfsFilesystem({});
  return { resources: { sharedDataFunction, sharedStorage } };
});
```
