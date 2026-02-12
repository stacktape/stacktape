---
docType: config-ref
title: Batch Job
resourceType: batch-job
tags:
  - batch-job
  - batch
  - job
  - scheduled-job
source: types/stacktape-config/batch-jobs.d.ts
priority: 1
---

# Batch Job

Run containerized tasks to completion — data processing, ML training, video encoding, etc.

Pay only for the compute time used. Supports CPU and GPU workloads, retries on failure,
and can be triggered by schedules, HTTP requests, S3 uploads, or queue messages.

Resource type: `batch-job`

## TypeScript Definition

```typescript
/**
 * #### Run containerized tasks to completion — data processing, ML training, video encoding, etc.
 *
 * ---
 *
 * Pay only for the compute time used. Supports CPU and GPU workloads, retries on failure,
 * and can be triggered by schedules, HTTP requests, S3 uploads, or queue messages.
 */
interface BatchJob {
  type: 'batch-job';
  properties: BatchJobProps;
  overrides?: ResourceOverrides;
}

interface BatchJobProps extends ResourceAccessProps {
  /**
   * #### Docker container image and environment for the job.
   */
  container: BatchJobContainer;
  /**
   * #### CPU, memory, and GPU requirements. AWS auto-provisions a matching instance.
   */
  resources: BatchJobResources;
  /**
   * #### Max run time in seconds. The job is killed if it exceeds this, then retried if `retryConfig` is set.
   */
  timeout?: number;
  /**
   * #### Use discounted spare AWS capacity. Saves up to 90%, but jobs can be interrupted.
   *
   * ---
   *
   * **Use this when:** Your job can safely be restarted from the beginning (e.g., data imports,
   * image processing, ML training with checkpoints). Combine with `retryConfig` to auto-retry
   * on interruption.
   *
   * **Don't use when:** Your job has side effects that can't be repeated (e.g., sending emails,
   * charging payments) or must finish within a strict deadline.
   *
   * If interrupted, your container gets a `SIGTERM` and 120 seconds to shut down gracefully.
   *
   * @default false
   */
  useSpotInstances?: boolean;
  /**
   * #### Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.
   */
  logging?: BatchJobLogging;
  /**
   * #### Auto-retry on failure, timeout, or Spot interruption.
   */
  retryConfig?: BatchJobRetryConfiguration;
  /**
   * #### Events that trigger this job (schedules, HTTP requests, S3 uploads, SQS messages, etc.).
   */
  events?: (
    | HttpApiIntegration
    | S3Integration
    | ScheduleIntegration
    | SnsIntegration
    | SqsIntegration
    | KinesisIntegration
    | DynamoDbIntegration
    | CloudwatchLogIntegration
    | ApplicationLoadBalancerIntegration
    | EventBusIntegration
  )[];
}

interface BatchJobRetryConfiguration {
  /**
   * #### Max retry attempts before the job is marked as failed.
   * @default 1
   */
  attempts?: number;
  /**
   * #### Seconds to wait between retries.
   * @default 0
   */
  retryIntervalSeconds?: number;
  /**
   * #### Multiply wait time by this factor after each retry (exponential backoff).
   *
   * ---
   *
   * E.g., with `retryIntervalSeconds: 5` and `retryIntervalMultiplier: 2`, waits are 5s, 10s, 20s, etc.
   *
   * @default 1
   */
  retryIntervalMultiplier?: number;
}

interface BatchJobContainer {
  /**
   * #### How to build or specify the container image for this job.
   */
  packaging: BatchJobContainerPackaging;
  /**
   * #### Environment variables injected into the container at runtime.
   *
   * ---
   *
   * Use `$ResourceParam()` or `$Secret()` to inject database URLs, API keys, etc.
   */
  environment?: EnvironmentVar[];
}

interface BatchJobResources {
  /**
   * #### Number of vCPUs for the job (e.g., 1, 2, 4).
   */
  cpu: number;
  /**
   * #### Memory in MB. Use slightly less than powers of 2 for efficient instance sizing.
   *
   * ---
   *
   * AWS reserves some memory for system processes. Requesting exactly 8192 MB (8 GB) may provision
   * a larger instance than needed. Use 7680 MB instead to fit on a standard 8 GB instance.
   */
  memory: number;
  /**
   * #### Number of GPUs. The job will run on a GPU instance (NVIDIA A100, A10G, etc.).
   *
   * ---
   *
   * Omit for CPU-only workloads.
   */
  gpu?: number;
  /**
   * #### A list of specific EC2 instance types to use for the job.
   * ---
   * By default, Stacktape allows AWS to select an optimal instance type based on your resource requirements.
   * You can override this by providing a list of allowed instance types.
   * For a full list, see the [AWS EC2 instance types documentation](https://aws.amazon.com/ec2/instance-types/).
   */
  // instanceTypes?: string[];
}

interface BatchJobLogging extends LogForwardingBase {
  /**
   * #### Disable logging to CloudWatch.
   * @default false
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs.
   * @default 90
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

type BatchJobReferencableParam = 'jobDefinitionArn' | 'stateMachineArn' | 'logGroupArn';
```
