# Batch job

A batch job runs a container until it finishes: a nightly export, a video transcode, an import, a model training run.
A trigger starts it (a schedule, an HTTP request, a file upload, a queue message and others), and you declare the CPU,
memory and optional GPU it needs. It runs on AWS Batch, which starts EC2 instances for queued jobs and stops them when
the queue is empty.

You pay for the EC2 instances while jobs run, including their start-up time, and nothing between jobs. Spot capacity
costs up to 90% less if the job can be interrupted. For work under 15 minutes, a
[Lambda function](/resources/compute/lambda-function) starts faster; for a process that never ends, use a
[worker service](/resources/compute/worker-service).

## Basic example

A TypeScript job that runs every night at 02:00 UTC:


Example (TypeScript):

```typescript
import { defineConfig, BatchJob, JsBundleImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const nightlyReport = new BatchJob({
    container: {
      packaging: new JsBundleImagePackaging({
        entryfilePath: './src/jobs/nightly-report.ts'
      }),
      environment: { REPORT_BUCKET_PREFIX: 'reports/nightly' }
    },
    resources: {
      cpu: 2,
      memory: 4096
    },
    timeout: 3600,
    events: [
      {
        type: 'schedule',
        properties: {
          scheduleRate: 'cron(0 2 * * ? *)'
        }
      }
    ]
  });

  return { resources: { nightlyReport } };
});
```


`js-bundle` builds the image from `./src/jobs/nightly-report.ts`, `resources` asks for 2 vCPU and 4096 MB, and
`timeout` stops a run after one hour. Schedules use AWS cron or `rate(2 hours)` syntax in UTC; see
[Schedule triggers](/resources/triggers/schedule-triggers). Each run's output appears in
`stacktape logs nightlyReport --stage dev`.

## Compute resources

`cpu` is a whole number of vCPUs and `memory` is in MB; AWS Batch picks instances that fit. Request a little less than a
power of two, for example `7680` instead of `8192` MB, because the instance keeps some memory for itself. Add `gpu` only
for GPU work such as training or rendering.


Example (TypeScript):

```typescript
import { defineConfig, BatchJob, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const trainingJob = new BatchJob({
    container: {
      packaging: new JsBundleImagePackaging({
        entryfilePath: './src/jobs/train-model.ts'
      })
    },
    resources: {
      cpu: 8,
      memory: 30720,
      gpu: 1
    }
  });

  return { resources: { trainingJob } };
});
```


Jobs run on x86 instances with the Amazon ECS-optimized Amazon Linux 2023 image; GPU jobs use its NVIDIA variant on
`p4d` and `g5` instances. The instances require IMDSv2 and use cgroup v2, so software in your image that reads instance
metadata with IMDSv1, or memory limits only from cgroup v1 (such as Java before 8u372), needs a current version.

## Packaging

A batch job supports four container image packaging types. Start with `js-bundle` for JavaScript or TypeScript and `buildpack` for other languages, then switch only when the image needs precise runtime control.

| Type | When to use |
|------|-------------|
| [`js-bundle`](/packaging/containers/js-bundle) | A JavaScript or TypeScript job with one entry file. Stacktape bundles it into a small image. |
| [`buildpack`](/packaging/containers/buildpack) | Build from source without a Dockerfile. Detects Python, Go, Rust, Java, PHP, Ruby, .NET, Node.js and more. |
| [`dockerfile`](/packaging/containers/dockerfile) | Control the Dockerfile, build context, build args and startup command |
| [`prebuilt-image`](/packaging/containers/prebuilt-image) | Run an image that already exists in a registry and optionally override its command |

Put the job's settings in `container.environment`, secrets in [`$Secret()`](/configuration/secrets).

## Triggers

Pick the trigger by where the work comes from. Sources that retry delivery can start the same job twice, so make the
job safe to repeat.

| Trigger type | Use it for |
|--------------|------------|
| `schedule` | Recurring jobs such as reports, cleanup, imports, and periodic syncs |
| `s3` | Object-created, object-removed, restore, or replication events from a bucket |
| `sqs` | Queue-backed jobs where each message or batch represents work to process |
| `sns` | Pub/sub fanout where a topic delivery should start the job |
| `kinesis-stream` | Stream records processed in batches |
| `dynamo-db-stream` | Table change records after DynamoDB streams are enabled |
| `http-api-gateway` | HTTP request starts a job through an [HTTP API Gateway](/resources/networking/http-api-gateway) |
| `application-load-balancer` | HTTP request starts a job through an [Application Load Balancer](/resources/networking/application-load-balancer) rule |
| `cloudwatch-log` | Matching CloudWatch log records start the job |
| `event-bus` | EventBridge events matching a pattern start the job |

The [configuration reference](#configuration-reference) has each trigger's options, and the
[triggers overview](/resources/triggers/overview) compares them.

### Reading trigger data

The job is a process, not a handler: it gets the trigger event as JSON in `STP_TRIGGER_EVENT_DATA`, and the attempt
number in `STP_CURRENT_ATTEMPT` and `STP_MAXIMUM_ATTEMPTS`.

```typescript
const event = JSON.parse(process.env.STP_TRIGGER_EVENT_DATA ?? '{}');
const attempt = Number(process.env.STP_CURRENT_ATTEMPT ?? '1');
const maximumAttempts = Number(process.env.STP_MAXIMUM_ATTEMPTS ?? '1');
await processJob(event, { attempt, maximumAttempts });
```

## Retries and timeout

`timeout` (in seconds) stops a job that runs too long. `retryConfig` runs failed or timed-out jobs again.


Example (TypeScript):

```typescript
import { defineConfig, BatchJob, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const importJob = new BatchJob({
    container: {
      packaging: new JsBundleImagePackaging({
        entryfilePath: './src/jobs/import-catalog.ts'
      })
    },
    resources: { cpu: 2, memory: 4096 },
    timeout: 7200,
    retryConfig: {
      attempts: 3,
      retryIntervalSeconds: 30,
      retryIntervalMultiplier: 2
    }
  });

  return { resources: { importJob } };
});
```


`attempts` counts the first run and defaults to 1. The wait before each retry is `retryIntervalSeconds` × the number of
failed attempts × `retryIntervalMultiplier`: with 3 attempts, interval 30 and multiplier 2, the job waits 60 seconds
before attempt 2 and 120 seconds before attempt 3.


> **Warning:** A retry runs the whole job again. Make writes, imports and notifications safe to repeat before you allow more
than one attempt.


## Spot capacity

`useSpotInstances: true` runs jobs on spare EC2 capacity for up to 90% less. AWS can take the instance back: the
container gets `SIGTERM` and 120 seconds to stop. Use Spot for restartable imports, image processing or training with
checkpoints, together with `retryConfig`, and keep on-demand capacity for deadlines and work that can't be repeated.


Example (TypeScript):

```typescript
import { defineConfig, BatchJob, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const thumbnailJob = new BatchJob({
    container: {
      packaging: new JsBundleImagePackaging({
        entryfilePath: './src/jobs/thumbnails.ts'
      })
    },
    resources: { cpu: 1, memory: 2048 },
    useSpotInstances: true,
    retryConfig: {
      attempts: 5,
      retryIntervalSeconds: 60
    }
  });

  return { resources: { thumbnailJob } };
});
```


## Connecting to resources

`connectTo` grants IAM permissions, opens the network path to databases and Redis, and injects
`STP_<RESOURCE>_<PARAM>` variables into the job.


Example (TypeScript):

```typescript
import {
  defineConfig,
  BatchJob,
  Bucket,
  RelationalDatabase,
  RdsEnginePostgres,
  $Secret,
  JsBundleImagePackaging
} from 'stacktape';

export default defineConfig(() => {
  const reports = new Bucket({});
  const mainDatabase = new RelationalDatabase({
    engine: new RdsEnginePostgres({ version: '16', primaryInstance: { instanceSize: 'db.t4g.micro' } }),
    credentials: { masterUserPassword: $Secret('database', 'password') }
  });

  const exportJob = new BatchJob({
    connectTo: [mainDatabase, reports],
    container: {
      packaging: new JsBundleImagePackaging({
        entryfilePath: './src/jobs/export.ts'
      })
    },
    resources: { cpu: 1, memory: 2048 }
  });

  return { resources: { reports, mainDatabase, exportJob } };
});
```


This job gets `STP_MAIN_DATABASE_CONNECTION_STRING`, `STP_MAIN_DATABASE_HOST`, `STP_MAIN_DATABASE_PORT` and the other
database variables, plus `STP_REPORTS_NAME` and `STP_REPORTS_ARN`. For other AWS permissions, use `iamRoleStatements`.

## Logging

The job's output goes to CloudWatch Logs, kept for 90 days by default (`logging.retentionDays`). Log the input ID and
attempt number so you can follow one run across retries.


Example (TypeScript):

```typescript
import { defineConfig, BatchJob, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const cleanupJob = new BatchJob({
    container: {
      packaging: new JsBundleImagePackaging({
        entryfilePath: './src/jobs/cleanup.ts'
      })
    },
    resources: { cpu: 1, memory: 2048 },
    logging: {
      retentionDays: 30
    }
  });

  return { resources: { cleanupJob } };
});
```


## Dev mode

Batch jobs always run in AWS Batch, also in [`stacktape dev`](/local-development/dev-mode-overview): dev mode builds and
pushes their images at startup, so restart it after changing job code. `--resources` and `--skip-resources` don't apply
to them; use a dev-specific config to leave a job or its triggers out. A job reaches local databases through the
[dev network](/local-development/debugging-lambda-functions#the-dev-network), with its AWS costs and network round
trip.

## Configuration reference


### Definition: `BatchJobProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/batch-job` with definition name `BatchJobProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `container` | yes | `BatchJobContainer` | - |
| `resources` | yes | `BatchJobResources` | - |
| `connectTo` | no | `Array<string>` | - |
| `events` | no | `Array<application-load-balancer \| sns \| sqs \| kinesis-stream \| dynamo-db-stream \| s3 \| schedule \| cloudwatch-log \| http-api-gateway \| event-bus>` | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | - |
| `logging` | no | `BatchJobLogging` | - |
| `retryConfig` | no | `BatchJobRetryConfiguration` | - |
| `timeout` | no | `number` | - |
| `useSpotInstances` | no | `boolean` | `false` |


## Referenceable parameters


## Referenceable Parameters: `batch-job`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `jobDefinitionArn` | Arn of the job definition resource | `$ResourceParam("<<resource-name>>", "jobDefinitionArn")` |
| `stateMachineArn` | Arn of the state machine controlling the execution flow of the batch job | `$ResourceParam("<<resource-name>>", "stateMachineArn")` |
| `logGroupArn` | Arn of the log group aggregating logs from the batch job | `$ResourceParam("<<resource-name>>", "logGroupArn")` |


## Next steps

- [Schedule triggers](/resources/triggers/schedule-triggers): run the job on a schedule.
- [S3 events](/resources/triggers/s3-events): start a job for each uploaded file.
- [Logs](/observability/logs): check the first run's output with `stacktape logs`.
