/**
 * #### A resource for running containerized batch computing jobs.
 *
 * ---
 *
 * Batch jobs are ideal for workloads that need to run to completion, such as data processing, machine learning pipelines, or other long-running background tasks.
 * Stacktape manages the underlying infrastructure, so you can focus on your application.
 *
 * - **Pay-per-use**: You only pay for the compute resources consumed by your job.
 * - **Scalable**: Handles both CPU-intensive and GPU-accelerated workloads.
 * - **Resilient**: Provides built-in support for retries, logging, and event-driven scheduling.
 */
interface BatchJob {
  type: 'batch-job';
  properties: BatchJobProps;
  overrides?: ResourceOverrides;
}

interface BatchJobProps extends ResourceAccessProps {
  /**
   * #### Configures the Docker container for the batch job.
   */
  container: BatchJobContainer;
  /**
   * #### Configures the computing resources for the job.
   *
   * ---
   *
   * Use this to specify the amount of CPU, memory, and (optionally) GPU required.
   * Stacktape will automatically provision an instance that meets these requirements when the job runs.
   */
  resources: BatchJobResources;
  /**
   * #### The maximum time (in seconds) the job is allowed to run.
   *
   * ---
   *
   * If the job exceeds this timeout, it will be stopped. If retries are configured, the job will be re-run.
   */
  timeout?: number;
  /**
   * #### Runs the job on Spot Instances to reduce compute costs.
   *
   * ---
   *
   * **Benefits:**
   * - Save up to 90% compared to on-demand pricing by using spare AWS capacity.
   *
   * **Important Considerations:**
   * - Spot Instances can be interrupted at any time. Your container will receive a `SIGTERM` signal and has **120 seconds** to save its state and shut down gracefully.
   * - Your application should be designed to be fault-tolerant. This can be achieved by implementing checkpointing or by making the job idempotent (safe to restart from the beginning).
   *
   * For more information, see the [AWS Spot Instance Advisor](https://aws.amazon.com/ec2/spot/instance-advisor/) for interruption rates and best practices.
   *
   * @default false
   */
  useSpotInstances?: boolean;
  /**
   * #### Configures the logging behavior for the batch job.
   *
   * ---
   *
   * Container logs (`stdout` and `stderr`) are automatically sent to a CloudWatch log group.
   * By default, logs are retained for 180 days. You can view them in the [Stacktape Console](https://console.stacktape.com).
   */
  logging?: BatchJobLogging;
  /**
   * #### Configures the retry behavior for the job.
   *
   * ---
   *
   * If a job fails (e.g., non-zero exit code, timeout, Spot Instance interruption), it can be automatically retried.
   */
  retryConfig?: BatchJobRetryConfiguration;
  /**
   * #### Configures event triggers that start the batch job.
   *
   * ---
   *
   * A batch job can be triggered by various events, such as an HTTP request, a file upload to S3, or a schedule.
   * Stacktape manages the underlying trigger mechanism automatically.
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
   * #### The maximum number of times to retry a failed job.
   *
   * ---
   *
   * A job is retried if it fails due to an internal error, a timeout, or a Spot Instance interruption.
   * Once this limit is reached, the job is marked as failed.
   *
   * @default 1
   */
  attempts?: number;
  /**
   * #### The time (in seconds) to wait between retry attempts.
   *
   * @default 0
   */
  retryIntervalSeconds?: number;
  /**
   * #### A multiplier for the `retryIntervalSeconds`.
   *
   * ---
   *
   * With each retry, the wait time is multiplied by this value. This is useful for implementing an exponential backoff strategy, which can help alleviate pressure on downstream services.
   *
   * @default 1
   */
  retryIntervalMultiplier?: number;
}

interface BatchJobContainer {
  /**
   * #### Configures the container image for the batch job.
   */
  packaging: BatchJobContainerPackaging;
  /**
   * #### A list of environment variables to inject into the container at runtime.
   *
   * ---
   *
   * Environment variables are ideal for providing configuration details to your job, such as database connection strings, API keys, or other dynamic parameters.
   */
  environment?: EnvironmentVar[];
}

interface BatchJobResources {
  /**
   * #### The number of virtual CPUs (vCPUs) to allocate to the job.
   *
   * ---
   *
   * Must be an integer (e.g., 1, 2, 4).
   */
  cpu: number;
  /**
   * #### The amount of memory (in MB) to allocate to the job.
   *
   * ---
   *
   * > **Important:** AWS instances require a small amount of memory for their own management processes.
   * > If you request memory in exact powers of 2 (e.g., 8192 MB for 8 GiB), a larger instance may be provisioned than you expect.
   * >
   * > **Recommendation:** To ensure efficient instance usage, consider requesting slightly less memory (e.g., 7680 MB instead of 8192 MB).
   * > This allows the job to fit on a standard 8 GiB instance without needing to scale up.
   * >
   * > For more details, see the [AWS documentation on memory management](https://docs.aws.amazon.com/batch/latest/userguide/memory-management.html#ecs-reserved-memory).
   */
  memory: number;
  /**
   * #### The number of physical GPUs required by the job.
   *
   * ---
   *
   * Specifying this will ensure the job runs on a GPU-accelerated instance.
   * Supported families include NVIDIA A100 (for deep learning) and A10G (for graphics and ML inference).
   * If omitted, a CPU-only instance will be used.
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
   * #### Disables application logging to CloudWatch.
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### The number of days to retain logs in CloudWatch.
   *
   * @default 90
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

type BatchJobReferencableParam = 'jobDefinitionArn' | 'stateMachineArn' | 'logGroupArn';
