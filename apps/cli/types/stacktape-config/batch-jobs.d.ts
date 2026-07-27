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
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   imageProcessor:
   *     type: batch-job
   *     properties:
   *       # stp-focus
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/process.ts
   *         environment:
   *           - name: OUTPUT_BUCKET
   *             value: $ResourceParam('resultsBucket', 'name')
   *       # stp-end-focus
   *       resources:
   *         cpu: 2
   *         memory: 3840
   *       connectTo:
   *         - resultsBucket
   *   resultsBucket:
   *     type: bucket
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, Bucket, defineConfig, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const resultsBucket = new Bucket({});
   *   const imageProcessor = new BatchJob({
   *     // stp-focus
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/process.ts' }
   *       },
   *       environment: { OUTPUT_BUCKET: $ResourceParam('resultsBucket', 'name') }
   *     },
   *     // stp-end-focus
   *     resources: { cpu: 2, memory: 3840 },
   *     connectTo: [resultsBucket]
   *   });
   *   return { resources: { resultsBucket, imageProcessor } };
   * });
   * ```
   */
  container: BatchJobContainer;
  /**
   * #### CPU, memory, and GPU requirements. AWS auto-provisions a matching instance.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   videoEncoder:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/encode.ts
   *       # stp-focus
   *       resources:
   *         cpu: 4
   *         memory: 15360
   *         gpu: 1
   *       # stp-end-focus
   *       timeout: 7200
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const videoEncoder = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/encode.ts' }
   *       }
   *     },
   *     // stp-focus
   *     resources: { cpu: 4, memory: 15360, gpu: 1 },
   *     // stp-end-focus
   *     timeout: 7200
   *   });
   *   return { resources: { videoEncoder } };
   * });
   * ```
   */
  resources: BatchJobResources;
  /**
   * #### Max run time in seconds. The job is killed if it exceeds this, then retried if `retryConfig` is set.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   dataImporter:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/import.ts
   *       resources:
   *         cpu: 2
   *         memory: 3840
   *       # stp-focus
   *       timeout: 3600
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const dataImporter = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/import.ts' }
   *       }
   *     },
   *     resources: { cpu: 2, memory: 3840 },
   *     // stp-focus
   *     timeout: 3600
   *     // stp-end-focus
   *   });
   *   return { resources: { dataImporter } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mlTrainer:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/train.ts
   *       resources:
   *         cpu: 4
   *         memory: 15360
   *         gpu: 1
   *       # stp-focus
   *       useSpotInstances: true
   *       # stp-end-focus
   *       retryConfig:
   *         attempts: 3
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mlTrainer = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/train.ts' }
   *       }
   *     },
   *     resources: { cpu: 4, memory: 15360, gpu: 1 },
   *     // stp-focus
   *     useSpotInstances: true,
   *     // stp-end-focus
   *     retryConfig: { attempts: 3 }
   *   });
   *   return { resources: { mlTrainer } };
   * });
   * ```
   *
   * @default false
   */
  useSpotInstances?: boolean;
  /**
   * #### Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   reportGenerator:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/report.ts
   *       resources:
   *         cpu: 1
   *         memory: 1920
   *       # stp-focus
   *       logging:
   *         retentionDays: 30
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const reportGenerator = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/report.ts' }
   *       }
   *     },
   *     resources: { cpu: 1, memory: 1920 },
   *     // stp-focus
   *     logging: { retentionDays: 30 }
   *     // stp-end-focus
   *   });
   *   return { resources: { reportGenerator } };
   * });
   * ```
   */
  logging?: BatchJobLogging;
  /**
   * #### Auto-retry on failure, timeout, or Spot interruption.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   flakyJob:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/job.ts
   *       resources:
   *         cpu: 2
   *         memory: 3840
   *       # stp-focus
   *       retryConfig:
   *         attempts: 4
   *         retryIntervalSeconds: 5
   *         retryIntervalMultiplier: 2
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const flakyJob = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/job.ts' }
   *       }
   *     },
   *     resources: { cpu: 2, memory: 3840 },
   *     // stp-focus
   *     retryConfig: { attempts: 4, retryIntervalSeconds: 5, retryIntervalMultiplier: 2 }
   *     // stp-end-focus
   *   });
   *   return { resources: { flakyJob } };
   * });
   * ```
   */
  retryConfig?: BatchJobRetryConfiguration;
  /**
   * #### Events that trigger this job (schedules, HTTP requests, S3 uploads, SQS messages, etc.).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   uploadProcessor:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/onUpload.ts
   *       resources:
   *         cpu: 2
   *         memory: 3840
   *       # stp-focus
   *       events:
   *         - type: s3
   *           properties:
   *             bucketArn: $ResourceParam('uploadsBucket', 'arn')
   *             s3EventType: 's3:ObjectCreated:*'
   *         - type: schedule
   *           properties:
   *             scheduleRate: rate(1 hour)
   *       # stp-end-focus
   *       connectTo:
   *         - uploadsBucket
   *   uploadsBucket:
   *     type: bucket
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, Bucket, defineConfig, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const uploadsBucket = new Bucket({});
   *   const uploadProcessor = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/onUpload.ts' }
   *       }
   *     },
   *     resources: { cpu: 2, memory: 3840 },
   *     // stp-focus
   *     events: [
   *       {
   *         type: 's3',
   *         properties: {
   *           bucketArn: $ResourceParam('uploadsBucket', 'arn'),
   *           s3EventType: 's3:ObjectCreated:*'
   *         }
   *       },
   *       { type: 'schedule', properties: { scheduleRate: 'rate(1 hour)' } }
   *     ],
   *     // stp-end-focus
   *     connectTo: [uploadsBucket]
   *   });
   *   return { resources: { uploadsBucket, uploadProcessor } };
   * });
   * ```
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

type StpBatchJob = BatchJob['properties'] & {
  name: string;
  type: BatchJob['type'];
  configParentResourceType: BatchJob['type'];
  nameChain: string[];
  _nestedResources: {
    triggerFunction: StpHelperLambdaFunction;
  };
};

interface BatchJobRetryConfiguration {
  /**
   * #### Max retry attempts before the job is marked as failed.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   batchProcessor:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/process.ts
   *       resources:
   *         cpu: 2
   *         memory: 3840
   *       retryConfig:
   *         # stp-focus
   *         attempts: 3
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const batchProcessor = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/process.ts' }
   *       }
   *     },
   *     resources: { cpu: 2, memory: 3840 },
   *     retryConfig: {
   *       // stp-focus
   *       attempts: 3
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { batchProcessor } };
   * });
   * ```
   *
   * @default 1
   */
  attempts?: number;
  /**
   * #### Seconds to wait between retries.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   batchProcessor:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/process.ts
   *       resources:
   *         cpu: 2
   *         memory: 3840
   *       retryConfig:
   *         attempts: 3
   *         # stp-focus
   *         retryIntervalSeconds: 10
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const batchProcessor = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/process.ts' }
   *       }
   *     },
   *     resources: { cpu: 2, memory: 3840 },
   *     retryConfig: {
   *       attempts: 3,
   *       // stp-focus
   *       retryIntervalSeconds: 10
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { batchProcessor } };
   * });
   * ```
   *
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   batchProcessor:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/process.ts
   *       resources:
   *         cpu: 2
   *         memory: 3840
   *       retryConfig:
   *         attempts: 4
   *         retryIntervalSeconds: 5
   *         # stp-focus
   *         retryIntervalMultiplier: 2
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const batchProcessor = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/process.ts' }
   *       }
   *     },
   *     resources: { cpu: 2, memory: 3840 },
   *     retryConfig: {
   *       attempts: 4,
   *       retryIntervalSeconds: 5,
   *       // stp-focus
   *       retryIntervalMultiplier: 2
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { batchProcessor } };
   * });
   * ```
   *
   * @default 1
   */
  retryIntervalMultiplier?: number;
}

interface BatchJobContainer {
  /**
   * #### How to build or specify the container image for this job.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   dockerJob:
   *     type: batch-job
   *     properties:
   *       container:
   *         # stp-focus
   *         packaging:
   *           type: custom-dockerfile
   *           properties:
   *             buildContextPath: ./job
   *             dockerfilePath: Dockerfile
   *         # stp-end-focus
   *       resources:
   *         cpu: 2
   *         memory: 3840
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const dockerJob = new BatchJob({
   *     container: {
   *       // stp-focus
   *       packaging: {
   *         type: 'custom-dockerfile',
   *         properties: { buildContextPath: './job', dockerfilePath: 'Dockerfile' }
   *       }
   *       // stp-end-focus
   *     },
   *     resources: { cpu: 2, memory: 3840 }
   *   });
   *   return { resources: { dockerJob } };
   * });
   * ```
   */
  packaging: BatchJobContainerPackaging;
  /**
   * #### Environment variables injected into the container at runtime.
   *
   * ---
   *
   * Use `$ResourceParam()` or `$Secret()` to inject database URLs, API keys, etc.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   worker:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/worker.ts
   *         # stp-focus
   *         environment:
   *           - name: DATABASE_URL
   *             value: $ResourceParam('mainDb', 'connectionString')
   *           - name: API_KEY
   *             value: $Secret('externalApiKey')
   *         # stp-end-focus
   *       resources:
   *         cpu: 2
   *         memory: 3840
   *       connectTo:
   *         - mainDb
   *   mainDb:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('dbPassword')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.2'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, RelationalDatabase, defineConfig, $ResourceParam, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mainDb = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('dbPassword') },
   *     engine: {
   *       type: 'postgres',
   *       properties: { version: '16.2', primaryInstance: { instanceSize: 'db.t3.micro' } }
   *     }
   *   });
   *   const worker = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/worker.ts' }
   *       },
   *       // stp-focus
   *       environment: {
   *         DATABASE_URL: $ResourceParam('mainDb', 'connectionString'),
   *         API_KEY: $Secret('externalApiKey')
   *       }
   *       // stp-end-focus
   *     },
   *     resources: { cpu: 2, memory: 3840 },
   *     connectTo: [mainDb]
   *   });
   *   return { resources: { mainDb, worker } };
   * });
   * ```
   */
  environment?: EnvironmentVar[];
}

interface BatchJobResources {
  /**
   * #### Number of vCPUs for the job (e.g., 1, 2, 4).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   computeJob:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/compute.ts
   *       resources:
   *         # stp-focus
   *         cpu: 4
   *         # stp-end-focus
   *         memory: 7680
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const computeJob = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/compute.ts' }
   *       }
   *     },
   *     resources: {
   *       // stp-focus
   *       cpu: 4,
   *       // stp-end-focus
   *       memory: 7680
   *     }
   *   });
   *   return { resources: { computeJob } };
   * });
   * ```
   */
  cpu: number;
  /**
   * #### Memory in MB. Use slightly less than powers of 2 for efficient instance sizing.
   *
   * ---
   *
   * AWS reserves some memory for system processes. Requesting exactly 8192 MB (8 GB) may provision
   * a larger instance than needed. Use 7680 MB instead to fit on a standard 8 GB instance.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   memoryJob:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/compute.ts
   *       resources:
   *         cpu: 2
   *         # stp-focus
   *         memory: 7680
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const memoryJob = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/compute.ts' }
   *       }
   *     },
   *     resources: {
   *       cpu: 2,
   *       // stp-focus
   *       memory: 7680
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { memoryJob } };
   * });
   * ```
   */
  memory: number;
  /**
   * #### Number of GPUs. The job will run on a GPU instance (NVIDIA A100, A10G, etc.).
   *
   * ---
   *
   * Omit for CPU-only workloads.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   inferenceJob:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/infer.ts
   *       resources:
   *         cpu: 4
   *         memory: 15360
   *         # stp-focus
   *         gpu: 1
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const inferenceJob = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/infer.ts' }
   *       }
   *     },
   *     resources: {
   *       cpu: 4,
   *       memory: 15360,
   *       // stp-focus
   *       gpu: 1
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { inferenceJob } };
   * });
   * ```
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
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   quietJob:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/job.ts
   *       resources:
   *         cpu: 1
   *         memory: 1920
   *       logging:
   *         # stp-focus
   *         disabled: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const quietJob = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/job.ts' }
   *       }
   *     },
   *     resources: { cpu: 1, memory: 1920 },
   *     logging: {
   *       // stp-focus
   *       disabled: true
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { quietJob } };
   * });
   * ```
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   auditJob:
   *     type: batch-job
   *     properties:
   *       container:
   *         packaging:
   *           type: stacktape-image-buildpack
   *           properties:
   *             entryfilePath: src/audit.ts
   *       resources:
   *         cpu: 1
   *         memory: 1920
   *       logging:
   *         # stp-focus
   *         retentionDays: 365
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { BatchJob, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const auditJob = new BatchJob({
   *     container: {
   *       packaging: {
   *         type: 'stacktape-image-buildpack',
   *         properties: { entryfilePath: 'src/audit.ts' }
   *       }
   *     },
   *     resources: { cpu: 1, memory: 1920 },
   *     logging: {
   *       // stp-focus
   *       retentionDays: 365
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { auditJob } };
   * });
   * ```
   *
   * @default 90
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

type BatchJobReferencableParam = 'jobDefinitionArn' | 'stateMachineArn' | 'logGroupArn';
