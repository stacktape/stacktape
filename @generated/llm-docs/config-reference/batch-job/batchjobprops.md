# BatchJobProps API Reference

Resource type: `batch-job`

## TypeScript definition

```typescript
import type { ApplicationLoadBalancerIntegration, BatchJobContainer, BatchJobLogging, BatchJobResources, BatchJobRetryConfiguration, CloudwatchLogIntegration, DynamoDbIntegration, EventBusIntegration, HttpApiIntegration, KinesisIntegration, S3Integration, ScheduleIntegration, SnsIntegration, SqsIntegration, StpIamRoleStatement } from 'stacktape';

type BatchJobProps = {
  /** Docker container image and environment for the job. */
  container: BatchJobContainer;
  /** CPU, memory, and GPU requirements. AWS auto-provisions a matching instance. */
  resources: BatchJobResources;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Events that trigger this job (schedules, HTTP requests, S3 uploads, SQS messages, etc.). */
  events?: Array<BatchJobEvents>;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  /** Container logging (stdout/stderr). Sent to CloudWatch, viewable with stacktape logs. */
  logging?: BatchJobLogging;
  /** Auto-retry on failure, timeout, or Spot interruption. */
  retryConfig?: BatchJobRetryConfiguration;
  /** Max run time in seconds. The job is killed if it exceeds this, then retried if retryConfig is set. */
  timeout?: number;
  /** Use discounted spare AWS capacity. Saves up to 90%, but jobs can be interrupted. */
  useSpotInstances?: boolean;
};

/** Union choices used by the properties above. */
type BatchJobEvents =
  | ApplicationLoadBalancerIntegration
  | SnsIntegration
  | SqsIntegration
  | KinesisIntegration
  | DynamoDbIntegration
  | S3Integration
  | ScheduleIntegration
  | CloudwatchLogIntegration
  | HttpApiIntegration
  | EventBusIntegration;
```

## Property: `container`

- Required: yes
- Type: `BatchJobContainer`

Docker container image and environment for the job.

### Example 1 (yaml)

```yaml
resources:
  imageProcessor:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/process.ts
        environment:
          - name: OUTPUT_BUCKET
            value: $ResourceParam('resultsBucket', 'name')
      resources:
        cpu: 2
        memory: 3840
      connectTo:
        - resultsBucket
  resultsBucket:
    type: bucket
```

### Example 2 (typescript)

```typescript
import { BatchJob, Bucket, defineConfig, $ResourceParam } from 'stacktape';

export default defineConfig(() => {
  const resultsBucket = new Bucket({});
  const imageProcessor = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/process.ts' }
      },
      environment: { OUTPUT_BUCKET: $ResourceParam('resultsBucket', 'name') }
    },
    resources: { cpu: 2, memory: 3840 },
    connectTo: [resultsBucket]
  });
  return { resources: { resultsBucket, imageProcessor } };
});
```

## Property: `resources`

- Required: yes
- Type: `BatchJobResources`

CPU, memory, and GPU requirements. AWS auto-provisions a matching instance.

### Example 1 (yaml)

```yaml
resources:
  videoEncoder:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/encode.ts
      resources:
        cpu: 4
        memory: 15360
        gpu: 1
      timeout: 7200
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const videoEncoder = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/encode.ts' }
      }
    },
    resources: { cpu: 4, memory: 15360, gpu: 1 },
    timeout: 7200
  });
  return { resources: { videoEncoder } };
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

## Property: `events`

- Required: no
- Type: `Array<application-load-balancer | sns | sqs | kinesis-stream | dynamo-db-stream | s3 | schedule | cloudwatch-log | http-api-gateway | event-bus>`

Events that trigger this job (schedules, HTTP requests, S3 uploads, SQS messages, etc.).

Choices:
- `application-load-balancer` (`ApplicationLoadBalancerIntegration`) — Triggers a function when an Application Load Balancer receives a matching HTTP request.. Properties: `loadBalancerName: string`, `listenerPort?: number`, `priority: number`, `paths?: Array<string>`, `methods?: Array<string>`, `hosts?: Array<string>`, `headers?: Array<LbHeaderCondition>`, `queryParams?: Array<LbQueryParamCondition>`, `sourceIps?: Array<string>`.
- `sns` (`SnsIntegration`) — Triggers a function when a new message is published to an SNS topic.. Properties: `snsTopicName?: string`, `snsTopicArn?: string`, `filterPolicy?: unknown`, `onDeliveryFailure?: SnsOnDeliveryFailure`.
- `sqs` (`SqsIntegration`) — Triggers a function when new messages are available in an SQS queue.. Properties: `sqsQueueName?: string`, `sqsQueueArn?: string`, `batchSize?: number`, `maxBatchWindowSeconds?: number`.
- `kinesis-stream` (`KinesisIntegration`) — Triggers a function when new records are available in a Kinesis Data Stream.. Properties: `kinesisStreamName?: string`, `streamArn?: string`, `consumerArn?: string`, `autoCreateConsumer?: boolean`, `maxBatchWindowSeconds?: number`, `batchSize?: number`, `startingPosition?: string: "LATEST" | "TRIM_HORIZON"`, `maximumRetryAttempts?: number`, `onFailure?: DestinationOnFailure`, `parallelizationFactor?: number`, `bisectBatchOnFunctionError?: boolean`.
- `dynamo-db-stream` (`DynamoDbIntegration`) — Triggers a function when items are created, updated, or deleted in a DynamoDB table.. Properties: `streamArn: string`, `maxBatchWindowSeconds?: number`, `batchSize?: number`, `startingPosition?: string`, `maximumRetryAttempts?: number`, `onFailure?: DestinationOnFailure`, `parallelizationFactor?: number`, `bisectBatchOnFunctionError?: boolean`.
- `s3` (`S3Integration`) — Triggers a function when files are created, deleted, or restored in an S3 bucket.. Properties: `bucketArn: string`, `s3EventType: string: "s3:ObjectCreated:*" | "s3:ObjectCreated:CompleteMultipartUpload" | "s3:ObjectCreated:Copy" | "s3:ObjectCreated:Post" | "s3:ObjectCreated:Put" | "s3:ObjectRemoved:*" | "s3:ObjectRemoved:Delete" | "s3:ObjectRemoved:DeleteMarkerCreated" | "s3:ObjectRestore:*" | "s3:ObjectRestore:Completed" | "s3:ObjectRestore:Post" | "s3:ReducedRedundancyLostObject" | "s3:Replication:*" | "s3:Replication:OperationFailedReplication" | "s3:Replication:OperationMissedThreshold" | "s3:Replication:OperationNotTracked" | "s3:Replication:OperationReplicatedAfterThreshold"`, `filterRule?: S3FilterRule`.
- `schedule` (`ScheduleIntegration`) — Triggers a function on a recurring schedule (cron jobs, periodic tasks).. Properties: `scheduleRate: string`, `input?: unknown`, `inputPath?: string`, `inputTransformer?: EventInputTransformer`.
- `cloudwatch-log` (`CloudwatchLogIntegration`) — Triggers a function when new log records appear in a CloudWatch log group.. Properties: `logGroupArn: string`, `filter?: string`.
- `http-api-gateway` (`HttpApiIntegration`) — Triggers a function when an HTTP API Gateway receives a matching request.. Properties: `httpApiGatewayName: string`, `method: string: "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT"`, `path: string`, `authorizer?: cognito | lambda`, `payloadFormat?: string: "1.0" | "2.0"`.
- `event-bus` (`EventBusIntegration`) — Triggers a batch job when an event matching a specified pattern is received by an event bus.. Properties: `eventBusArn?: string`, `eventBusName?: string`, `useDefaultBus?: boolean`, `eventPattern: EventBusIntegrationPattern`, `onDeliveryFailure?: EventBusOnDeliveryFailure`, `input?: unknown`, `inputPath?: string`, `inputTransformer?: EventInputTransformer`.

### Example 1 (yaml)

```yaml
resources:
  uploadProcessor:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/onUpload.ts
      resources:
        cpu: 2
        memory: 3840
      events:
        - type: s3
          properties:
            bucketArn: $ResourceParam('uploadsBucket', 'arn')
            s3EventType: 's3:ObjectCreated:*'
        - type: schedule
          properties:
            scheduleRate: rate(1 hour)
      connectTo:
        - uploadsBucket
  uploadsBucket:
    type: bucket
```

### Example 2 (typescript)

```typescript
import { BatchJob, Bucket, defineConfig, $ResourceParam } from 'stacktape';

export default defineConfig(() => {
  const uploadsBucket = new Bucket({});
  const uploadProcessor = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/onUpload.ts' }
      }
    },
    resources: { cpu: 2, memory: 3840 },
    events: [
      {
        type: 's3',
        properties: {
          bucketArn: $ResourceParam('uploadsBucket', 'arn'),
          s3EventType: 's3:ObjectCreated:*'
        }
      },
      { type: 'schedule', properties: { scheduleRate: 'rate(1 hour)' } }
    ],
    connectTo: [uploadsBucket]
  });
  return { resources: { uploadsBucket, uploadProcessor } };
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

## Property: `logging`

- Required: no
- Type: `BatchJobLogging`

Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.

### Example 1 (yaml)

```yaml
resources:
  reportGenerator:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/report.ts
      resources:
        cpu: 1
        memory: 1920
      logging:
        retentionDays: 30
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const reportGenerator = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/report.ts' }
      }
    },
    resources: { cpu: 1, memory: 1920 },
    logging: { retentionDays: 30 }
  });
  return { resources: { reportGenerator } };
});
```

## Property: `retryConfig`

- Required: no
- Type: `BatchJobRetryConfiguration`

Auto-retry on failure, timeout, or Spot interruption.

### Example 1 (yaml)

```yaml
resources:
  flakyJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/job.ts
      resources:
        cpu: 2
        memory: 3840
      retryConfig:
        attempts: 4
        retryIntervalSeconds: 5
        retryIntervalMultiplier: 2
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const flakyJob = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/job.ts' }
      }
    },
    resources: { cpu: 2, memory: 3840 },
    retryConfig: { attempts: 4, retryIntervalSeconds: 5, retryIntervalMultiplier: 2 }
  });
  return { resources: { flakyJob } };
});
```

## Property: `timeout`

- Required: no
- Type: `number`

Max run time in seconds. The job is killed if it exceeds this, then retried if `retryConfig` is set.

### Example 1 (yaml)

```yaml
resources:
  dataImporter:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/import.ts
      resources:
        cpu: 2
        memory: 3840
      timeout: 3600
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const dataImporter = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/import.ts' }
      }
    },
    resources: { cpu: 2, memory: 3840 },
    timeout: 3600
  });
  return { resources: { dataImporter } };
});
```

## Property: `useSpotInstances`

- Required: no
- Type: `boolean`
- Default: `false`

Use discounted spare AWS capacity. Saves up to 90%, but jobs can be interrupted.

**Use this when:** Your job can safely be restarted from the beginning (e.g., data imports,
image processing, ML training with checkpoints). Combine with `retryConfig` to auto-retry
on interruption.

**Don't use when:** Your job has side effects that can't be repeated (e.g., sending emails,
charging payments) or must finish within a strict deadline.

If interrupted, your container gets a `SIGTERM` and 120 seconds to shut down gracefully.

### Example 1 (yaml)

```yaml
resources:
  mlTrainer:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/train.ts
      resources:
        cpu: 4
        memory: 15360
        gpu: 1
      useSpotInstances: true
      retryConfig:
        attempts: 3
```

### Example 2 (typescript)

```typescript
import { BatchJob, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mlTrainer = new BatchJob({
    container: {
      packaging: {
        type: 'stacktape-image-buildpack',
        properties: { entryfilePath: 'src/train.ts' }
      }
    },
    resources: { cpu: 4, memory: 15360, gpu: 1 },
    useSpotInstances: true,
    retryConfig: { attempts: 3 }
  });
  return { resources: { mlTrainer } };
});
```
