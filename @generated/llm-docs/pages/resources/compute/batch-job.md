# Batch Job

A Stacktape batch job runs a containerized task to completion for work such as data processing, ML training, video encoding, and imports. Use a batch job when the work has a clear finish point, needs explicit CPU, memory, or GPU requirements, and should be triggered by schedules, HTTP requests, storage events, queues, streams, or event buses.

**Pricing context:** For Fargate-backed batch jobs, the provided pricing data uses vCPU and memory billing while the job runs: approximately ~$7.29/month per 0.25 vCPU plus ~$1.60/month per 512 MB for continuous us-east-1 usage. Spot capacity can save up to 90% when interruptions are acceptable.

## When to use

A batch job is the right choice when the workload should start, do a defined unit of work, and exit. Common examples include nightly exports, object-processing pipelines, one-off video transcodes, queue-driven processing bursts, and ML jobs that can run in a container with declared CPU, memory, and optional GPU requirements.

- **Long-running jobs** — use a batch job for work that does not fit naturally into a short request/response function.
- **Compute-heavy tasks** — specify `cpu`, `memory`, and optionally `gpu`; Stacktape lets AWS select matching compute from the declared requirements.
- **Event-triggered processing** — trigger jobs from schedules, HTTP API Gateway, Application Load Balancer, S3, SNS, SQS, Kinesis, DynamoDB streams, CloudWatch Logs, or EventBridge event buses.
- **Interruptible work** — enable Spot capacity for jobs that can restart safely, especially with `retryConfig`.

## When NOT to use

- **Always-on HTTP services** — use a [web-service](/resources/compute/web-service) for containers that must serve public HTTP traffic continuously.
- **Internal always-on services** — use a [private-service](/resources/compute/private-service) for long-lived containers reachable only within your stack or VPC.
- **Continuous background workers** — use a [worker-service](/resources/compute/worker-service) for containers that run continuously rather than starting per job.
- **Short event handlers** — use a [Lambda function](/resources/compute/lambda-function) for short-lived, event-driven tasks where per-invocation billing is preferable.
- **Non-idempotent side effects on Spot** — keep `useSpotInstances` disabled for jobs that charge payments, send emails, or perform work that cannot safely be repeated.

## Basic example

This example runs a scheduled TypeScript container every night. The Stacktape image buildpack builds the container from `./src/jobs/nightly-report.ts`; `resources` requests 2 vCPU and 4096 MB memory; `timeout` stops the job if it runs longer than one hour.


Example (TypeScript):

```typescript
import { defineConfig, BatchJob, StacktapeImageBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const nightlyReport = new BatchJob({
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
        entryfilePath: './src/jobs/nightly-report.ts'
      }),
      environment: [{ name: 'REPORT_BUCKET_PREFIX', value: 'reports/nightly' }]
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


The schedule expression uses AWS cron syntax and runs in UTC. Use `rate(...)` for simple intervals such as `rate(2 hours)`, and use `cron(...)` when the job must run at a specific time or day. See [schedule triggers](/configuration/triggers/schedule-triggers) for trigger details.

## Compute resources

A batch job declares the CPU and memory required by one job run. Stacktape uses those requirements to let AWS provision matching compute. Add `gpu` only for workloads that require GPU acceleration, such as model training or GPU-backed rendering; omit `gpu` for normal CPU-only processing.


Example (TypeScript):

```typescript
import { defineConfig, BatchJob, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const trainingJob = new BatchJob({
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
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


`cpu` is the number of vCPUs, and `memory` is memory in MB. The source recommends using slightly less than exact powers of two for memory-sensitive sizing because AWS reserves memory for system processes; for example, `7680` MB may fit better than exactly `8192` MB on an 8 GB instance class.

## Packaging

A batch job supports five container image packaging modes: Stacktape image buildpack, custom Dockerfile, prebuilt image, Nixpacks, and external buildpack. Most teams should start with the Stacktape image buildpack, then switch only when the image needs precise runtime control.

| Mode | When to use |
|------|-------------|
| [Stacktape image buildpack](/packaging/containers/stacktape-buildpack) | Build JS/TS, Python, Java, Go, Ruby, PHP, or .NET source into a container image from an entry file |
| [Custom Dockerfile](/packaging/containers/custom-dockerfile) | Control the Dockerfile, build context, build args, and startup command |
| [Prebuilt image](/packaging/containers/prebuilt-image) | Run an image that already exists in a registry and optionally override its command |
| [Nixpacks](/packaging/containers/nixpacks) | Build from a source directory with Nixpacks detection and optional phase configuration |
| [External buildpack](/packaging/containers/external-buildpack) | Use a Cloud Native Buildpack builder, optional buildpacks, and a source directory |

Use `container.environment` for runtime settings that belong to this job, such as feature flags or fixed paths. Use `$Secret()` or `$ResourceParam()` when a value should come from Stacktape directives instead of being hard-coded; see [directives](/configuration/directives) for the supported directive model.

## Triggers

A batch job can start from several event sources: HTTP API Gateway, Application Load Balancer, S3, SNS, SQS, Kinesis, DynamoDB streams, CloudWatch Logs, schedules, and EventBridge event buses. Pick the trigger based on where the unit of work originates, and keep the job handler idempotent when the source can retry delivery.

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

The API reference carries the full property shape for each integration. For a broader decision guide across trigger families, see [triggers overview](/configuration/triggers/overview).

## Retries and timeout

A batch job can stop runaway work with `timeout` and retry failed attempts with `retryConfig`. Use a timeout whenever the job processes external input, calls remote APIs, or might hang on corrupted data. Use retries when failures are transient or the job can safely restart from the beginning.


Example (TypeScript):

```typescript
import { defineConfig, BatchJob, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const importJob = new BatchJob({
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
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


`timeout` is measured in seconds; when a job exceeds it, the job is killed and retried if `retryConfig` is set. `attempts` defaults to `1`, `retryIntervalSeconds` defaults to `0`, and `retryIntervalMultiplier` defaults to `1`. With `30` and `2`, waits grow from 30 seconds to 60 seconds to 120 seconds.


> **Warning:** Retries repeat the whole job attempt. Make job code idempotent before enabling multiple attempts for writes, imports, notifications, or any operation that can create duplicated side effects.


## Spot capacity

`useSpotInstances` lets a batch job use discounted spare AWS capacity. The source documents savings up to 90%, but Spot jobs can be interrupted. Use Spot for restartable data imports, image processing, or ML training with checkpoints; keep on-demand capacity for strict deadlines or non-repeatable side effects.


Example (TypeScript):

```typescript
import { defineConfig, BatchJob, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const thumbnailJob = new BatchJob({
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
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


When AWS interrupts a Spot-backed batch job, the container receives `SIGTERM` and has 120 seconds to shut down gracefully. Store progress externally if partial work matters, and combine Spot with retries so interrupted jobs are resubmitted instead of ending as failed work.

## Connecting to resources

Use `connectTo` when a batch job needs access to resources in the same stack. Stacktape can grant IAM permissions, open network access for supported databases and Redis, and inject connection environment variables into the job container using the `STP_[RESOURCE_NAME]_[PARAM]` naming pattern.


Example (TypeScript):

```typescript
import {
  defineConfig,
  BatchJob,
  Bucket,
  RelationalDatabase,
  RdsEnginePostgres,
  StacktapeImageBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const reports = new Bucket({});
  const mainDatabase = new RelationalDatabase({
    engine: new RdsEnginePostgres({ version: '16' }),
    instanceClass: 'db.t4g.micro'
  });

  const exportJob = new BatchJob({
    connectTo: ['mainDatabase', 'reports'],
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
        entryfilePath: './src/jobs/export.ts'
      })
    },
    resources: { cpu: 1, memory: 2048 }
  });

  return { resources: { reports, mainDatabase, exportJob } };
});
```


With the resource names above, the job receives database variables such as `STP_MAIN_DATABASE_CONNECTION_STRING`, `STP_MAIN_DATABASE_HOST`, and `STP_MAIN_DATABASE_PORT`, plus bucket variables such as `STP_REPORTS_NAME` and `STP_REPORTS_ARN`. For permissions outside `connectTo`, use `iamRoleStatements`.

## Logging

A batch job can send container `stdout` and `stderr` to CloudWatch Logs. Logging is enabled unless `logging.disabled` is set, and the documented default retention period is 90 days. Use logs for progress markers, failure causes, and job input identifiers that help you trace one run after a retry.


Example (TypeScript):

```typescript
import { defineConfig, BatchJob, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const cleanupJob = new BatchJob({
    container: {
      packaging: new StacktapeImageBuildpackPackaging({
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


`retentionDays` accepts CloudWatch retention values exposed in the API reference, including `1`, `3`, `5`, `7`, `14`, `30`, `60`, `90`, `120`, `150`, `180`, `365`, `400`, `545`, `731`, `1827`, and `3653`. View runtime logs with [`stacktape debug:logs`](/cli/debug-logs).

## FAQ

### What is a Stacktape batch job?

A Stacktape batch job is a containerized task that runs to completion instead of staying online as a service. A batch job is intended for data processing, ML training, video encoding, imports, and similar workloads with a clear end state. Use the `BatchJob` resource when you want Stacktape to package the container, declare compute needs, and wire event triggers.

### How is a batch job different from a worker-service?

A batch job starts, does a defined unit of work, exits, and can be retried when it fails or times out. A [worker-service](/resources/compute/worker-service) runs continuously rather than starting per job. Use a worker-service when the container should stay running; use a batch job for finite compute jobs with a clear end state.

### Can a batch job run on a schedule?

Yes. Add a `schedule` event with `scheduleRate`, using either a `rate(...)` expression or an AWS cron expression. Scheduled batch jobs are a good fit for reports, cleanup, imports, and periodic syncs; see [schedule triggers](/configuration/triggers/schedule-triggers).

### Can a batch job process S3 uploads?

Yes. Add an `s3` event with a bucket ARN, S3 event type, and optional prefix or suffix filter. S3-triggered batch jobs are useful for image processing, document conversion, and object-driven import pipelines; see [S3 events](/configuration/triggers/s3-events).

### Can I trigger a batch job from an HTTP request?

Yes. A batch job supports `http-api-gateway` and `application-load-balancer` integrations. Use HTTP-triggered batch jobs when a request should start long-running compute instead of being handled entirely by a short request handler; see [HTTP triggers](/configuration/triggers/http-triggers).

### Does a batch job support GPU workloads?

Yes. Set `resources.gpu` when the job requires GPU-backed compute. GPU jobs are appropriate for model training, inference batch runs, rendering, and other workloads that benefit from GPU acceleration; omit `gpu` for normal CPU-only jobs to keep scheduling and cost simpler.

### Should I use Spot instances for batch jobs?

Use `useSpotInstances: true` when the job can restart from the beginning or resume from checkpoints. Spot capacity can reduce cost substantially, but AWS can interrupt the job; Stacktape documents a `SIGTERM` notice and a 120-second graceful shutdown window. Avoid Spot for payment, email, or deadline-sensitive jobs.

### How do retries work for failed batch jobs?

`retryConfig` controls how many attempts Stacktape should make and how long to wait between attempts. `attempts` defaults to `1`, `retryIntervalSeconds` defaults to `0`, and `retryIntervalMultiplier` defaults to `1`. Because the whole job attempt is retried, job code should be idempotent before you raise the attempt count.

### How much does an AWS batch job cost?

Batch job cost depends on vCPU, memory, GPU needs, runtime, and whether on-demand or Spot capacity is used. The provided Fargate pricing data uses vCPU-hour and GB-hour billing, with continuous us-east-1 usage around ~$7.29/month per 0.25 vCPU plus ~$1.60/month per 512 MB. See [optimization tips](/managing-costs/optimization-tips) for broader cost control guidance.

### When should I use batch-job vs Lambda function?

Use a [Lambda function](/resources/compute/lambda-function) for short-lived, event-driven tasks. Use a batch job when the work is long-running, container-native, compute-heavy, needs GPU, or is easier to express as a job process that exits. Batch jobs are a better fit for workloads that look like command-line programs.

## API Reference


## API Reference: `BatchJobProps`
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

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `container` | yes | `BatchJobContainer` | Docker container image and environment for the job. | - |
| `resources` | yes | `BatchJobResources` | CPU, memory, and GPU requirements. AWS auto-provisions a matching instance. | - |
| `connectTo` | no | `Array<string>` | Give this resource access to other resources in your stack. List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc. | - |
| `events` | no | `Array<application-load-balancer \| sns \| sqs \| kinesis-stream \| dynamo-db-stream \| s3 \| schedule \| cloudwatch-log \| http-api-gateway \| event-bus>` | Events that trigger this job (schedules, HTTP requests, S3 uploads, SQS messages, etc.). | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | Raw IAM policy statements for permissions not covered by `connectTo`. Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock). | - |
| `logging` | no | `BatchJobLogging` | Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`. | - |
| `retryConfig` | no | `BatchJobRetryConfiguration` | Auto-retry on failure, timeout, or Spot interruption. | - |
| `timeout` | no | `number` | Max run time in seconds. The job is killed if it exceeds this, then retried if `retryConfig` is set. | - |
| `useSpotInstances` | no | `boolean` | Use discounted spare AWS capacity. Saves up to 90%, but jobs can be interrupted. **Use this when:** Your job can safely be restarted from the beginning (e.g., data imports,
image processing, ML training with checkpoints). Combine with `retryConfig` to auto-retry
on interruption.

**Don&#39;t use when:** Your job has side effects that can&#39;t be repeated (e.g., sending emails,
charging payments) or must finish within a strict deadline.

If interrupted, your container gets a `SIGTERM` and 120 seconds to shut down gracefully. | `false` |


## Referenceable parameters


## Referenceable Parameters: `batch-job`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `jobDefinitionArn` | Arn of the job definition resource | `$ResourceParam("<<resource-name>>", "jobDefinitionArn")` |
| `stateMachineArn` | Arn of the state machine controlling the execution flow of the batch job | `$ResourceParam("<<resource-name>>", "stateMachineArn")` |
| `logGroupArn` | Arn of the log group aggregating logs from the batch job | `$ResourceParam("<<resource-name>>", "logGroupArn")` |
