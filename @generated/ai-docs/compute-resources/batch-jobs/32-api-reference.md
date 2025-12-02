# API Reference

TypeScript type definitions for this resource.

```typescript
// From stacktape-config/batch-jobs.d.ts
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

// From stacktape-config/events.d.ts
/**
 * #### Triggers a container when a request matches the specified conditions on an Application Load Balancer.
 *
 * ---
 *
 * You can route requests based on HTTP method, path, headers, query parameters, and source IP address.
 */
interface ContainerWorkloadLoadBalancerIntegration {
  type: 'application-load-balancer';
  /**
   * #### Properties of the integration
   */
  properties: ContainerWorkloadLoadBalancerIntegrationProps;
}

interface ContainerWorkloadLoadBalancerIntegrationProps extends ApplicationLoadBalancerIntegrationProps {
  /**
   * #### The container port that will receive traffic from the load balancer.
   */
  containerPort: number;
}

/**
 * #### Triggers a function when an Application Load Balancer receives a matching HTTP request.
 *
 * ---
 *
 * You can route requests based on HTTP method, path, headers, query parameters, and source IP address.
 */
interface ApplicationLoadBalancerIntegration {
  /**
   * #### Triggers a function when an Application Load Balancer receives a matching HTTP request.
   *
   * ---
   *
   * You can route requests based on HTTP method, path, headers, query parameters, and source IP address.
   */
  type: 'application-load-balancer';
  /**
   * #### Properties of the integration
   */
  properties: ApplicationLoadBalancerIntegrationProps;
}

interface ApplicationLoadBalancerIntegrationProps {
  /**
   * #### The name of the Application Load Balancer.
   *
   * ---
   *
   * This must reference a load balancer defined in your Stacktape configuration.
   */
  loadBalancerName: string;
  /**
   * #### The port of the load balancer listener to attach to.
   *
   * ---
   *
   * You only need to specify this if the load balancer uses custom listeners.
   */
  listenerPort?: number;
  /**
   * #### The priority of this integration rule.
   *
   * ---
   *
   * Load balancer rules are evaluated in order from the lowest priority to the highest.
   * The first rule that matches an incoming request will handle it.
   */
  priority: number;
  /**
   * #### A list of URL paths that will trigger this integration.
   *
   * ---
   *
   * The request will be routed if its path matches any of the paths in this list.
   * The comparison is case-sensitive and supports `*` and `?` wildcards.
   *
   * Example: `/users`, `/articles/*`
   */
  paths?: string[];
  /**
   * #### A list of HTTP methods that will trigger this integration.
   *
   * ---
   *
   * Example: `GET`, `POST`, `DELETE`
   */
  methods?: string[];
  /**
   * #### A list of hostnames that will trigger this integration.
   *
   * ---
   *
   * The hostname is parsed from the `Host` header of the request.
   * Wildcards (`*` and `?`) are supported.
   *
   * Example: `api.example.com`, `*.myapp.com`
   */
  hosts?: string[];
  /**
   * #### A list of header conditions that the request must match.
   *
   * ---
   *
   * All header conditions must be met for the request to be routed.
   */
  headers?: LbHeaderCondition[];
  /**
   * #### A list of query parameter conditions that the request must match.
   *
   * ---
   *
   * All query parameter conditions must be met for the request to be routed.
   */
  queryParams?: LbQueryParamCondition[];
  /**
   * #### A list of source IP addresses (in CIDR format) that are allowed to trigger this integration.
   *
   * ---
   *
   * > **Note:** If the client is behind a proxy, this will be the IP address of the proxy.
   */
  sourceIps?: string[];
}

interface LbHeaderCondition {
  /**
   * #### The name of the HTTP header.
   */
  headerName: string;
  /**
   * #### A list of allowed values for the header.
   *
   * ---
   *
   * The condition is met if the header's value in the incoming request matches any of the values in this list. The comparison is case-insensitive.
   */
  values: string[];
}
interface LbQueryParamCondition {
  /**
   * #### The name of the query parameter.
   */
  paramName: string;
  /**
   * #### A list of allowed values for the query parameter.
   *
   * ---
   *
   * The condition is met if the query parameter's value in the incoming request matches any of the values in this list. The comparison is case-insensitive.
   */
  values: string[];
}
interface ContainerWorkloadHttpApiIntegrationProps extends HttpApiIntegrationProps {
  /**
   * #### The container port that will receive traffic from the API Gateway.
   */
  containerPort: number;
}

/**
 * #### Triggers a container when an HTTP API Gateway receives a matching request.
 *
 * ---
 *
 * You can route requests based on HTTP method and path.
 */
interface ContainerWorkloadHttpApiIntegration {
  type: 'http-api-gateway';
  /**
   * #### Properties of the integration
   */
  properties: ContainerWorkloadHttpApiIntegrationProps;
}

/**
 * #### Opens a container port for connections from other containers within the same workload.
 */
interface ContainerWorkloadInternalIntegration {
  type: 'workload-internal';
  /**
   * #### Properties of the integration
   */
  properties: ContainerWorkloadInternalIntegrationProps;
}

interface ContainerWorkloadInternalIntegrationProps {
  /**
   * #### The container port to open for internal traffic.
   */
  containerPort: number;
}

/**
 * #### Opens a container port for connections from other compute resources in the same stack.
 */
interface ContainerWorkloadServiceConnectIntegration {
  type: 'service-connect';
  /**
   * #### Properties of the integration
   */
  properties: ContainerWorkloadServiceConnectIntegrationProps;
}

interface ContainerWorkloadServiceConnectIntegrationProps {
  /**
   * #### The container port to open for service-to-service communication.
   */
  containerPort: number;
  /**
   * #### An alias for this service, used for service discovery.
   *
   * ---
   *
   * Other resources in the stack can connect to this service using a URL like `protocol://alias:port` (e.g., `http://my-service:8080`).
   * By default, the alias is derived from the resource and container names (e.g., `my-resource-my-container`).
   */
  alias?: string;
  /**
   * #### The protocol used for service-to-service communication.
   *
   * ---
   *
   * Specifying the protocol allows AWS to capture protocol-specific metrics, such as the number of HTTP 5xx errors.
   */
  protocol?: 'http' | 'http2' | 'grpc';
}

/**
 * #### Triggers a function when new messages are available in a Kafka topic.
 */
interface KafkaTopicIntegration {
  type: 'kafka-topic';
  /**
   * #### Properties of the integration
   */
  properties: KafkaTopicIntegrationProps;
}

interface KafkaTopicIntegrationProps {
  /**
   * #### The details of your Kafka cluster.
   *
   * ---
   *
   * Specifies the bootstrap servers and topic name.
   */
  customKafkaConfiguration?: CustomKafkaEventSource;
  /**
   * #### The maximum number of records to process in a single batch.
   *
   * ---
   *
   * The function will be invoked with up to this many records. Maximum is 10,000.
   *
   * @default 100
   */
  batchSize?: number;
  /**
   * #### The maximum time (in seconds) to wait before invoking the function with a batch of records.
   *
   * ---
   *
   * The function will be triggered when either the `batchSize` is reached or this time window expires.
   * Maximum is 300 seconds.
   *
   * @default 0.5
   */
  maxBatchWindowSeconds?: number;
}

interface CustomKafkaEventSource {
  /**
   * #### A list of `host:port` addresses for your Kafka brokers.
   */
  bootstrapServers: string[];
  /**
   * #### The name of the Kafka topic to consume messages from.
   */
  topicName: string;
  /**
   * #### The authentication method for connecting to the Kafka cluster.
   *
   * ---
   *
   * - `SASL`: Authenticate using a username and password (PLAIN or SCRAM).
   * - `MTLS`: Authenticate using a client-side TLS certificate.
   */
  authentication: KafkaSASLAuth | KafkaMTLSAuth;
}

interface KafkaSASLAuth {
  /**
   * #### The SASL authentication protocol.
   *
   * ---
   *
   * - `BASIC_AUTH`: SASL/PLAIN
   * - `SASL_SCRAM_256_AUTH`: SASL SCRAM-256
   * - `SASL_SCRAM_512_AUTH`: SASL SCRAM-512
   */
  type: 'BASIC_AUTH' | 'SASL_SCRAM_256_AUTH' | 'SASL_SCRAM_512_AUTH';
  /**
   * #### Properties of authentication method
   */
  properties: KafkaSASLAuthProps;
}

interface KafkaSASLAuthProps {
  /**
   * #### The ARN of a secret containing the Kafka credentials.
   *
   * ---
   *
   * The secret must be a JSON object with `username` and `password` keys.
   * You can create secrets using the `stacktape secret:create` command.
   */
  authenticationSecretArn: string;
}

interface KafkaMTLSAuth {
  /**
   * #### The authentication protocol.
   *
   * ---
   *
   * `MTLS`: Mutual TLS authentication.
   */
  type: 'MTLS';
  /**
   * #### Properties of authentication method
   */
  properties: KafkaMTLSAuthProps;
}
interface KafkaMTLSAuthProps {
  /**
   * #### The ARN of a secret containing the client certificate.
   *
   * ---
   *
   * This secret should contain the certificate chain (X.509 PEM), private key (PKCS#8 PEM), and an optional private key password.
   * You can create secrets using the `stacktape secret:create` command.
   */
  clientCertificate: string;
  /**
   * #### The ARN of a secret containing the server's root CA certificate.
   *
   * ---
   *
   * You can create secrets using the `stacktape secret:create` command.
   */
  serverRootCaCertificate?: string;
}

/**
 * #### Triggers a function when a new message is published to an SNS topic.
 *
 * ---
 *
 * Amazon SNS is a fully managed messaging service for both application-to-application (A2A) and application-to-person (A2P) communication.
 *
 * To add a custom SNS topic to your stack, define it as a [CloudFormation resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sns-topic.html) in the `cloudformationResources` section of your configuration.
 */
interface SnsIntegration {
  type: 'sns';
  /**
   * #### Properties of the integration
   */
  properties: SnsIntegrationProps;
}

interface SnsIntegrationProps {
  /**
   * #### The name of an SNS topic defined in your stack's resources.
   *
   * ---
   *
   * You must specify either `snsTopicName` or `snsTopicArn`.
   */
  snsTopicName?: string;
  /**
   * #### The ARN of an existing SNS topic.
   *
   * ---
   *
   * Use this to subscribe to a topic that is not managed by your stack.
   * You must specify either `snsTopicName` or `snsTopicArn`.
   */
  snsTopicArn?: string;
  /**
   * #### A filter policy to apply to incoming messages.
   *
   * ---
   *
   * This allows you to filter messages based on their attributes, so the function is only triggered for relevant messages.
   * If you need to filter based on the message content, consider using an EventBridge event bus instead.
   * For more details on filter policies, see the [AWS documentation](https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html).
   */
  filterPolicy?: any;
  /**
   * #### A destination for messages that fail to be delivered to the target.
   *
   * ---
   *
   * In rare cases (e.g., if the target function cannot scale fast enough), a message might fail to be delivered.
   * This property specifies an SQS queue where failed messages will be sent.
   */
  onDeliveryFailure?: SnsOnDeliveryFailure;
}

interface SnsOnDeliveryFailure {
  /**
   * #### The ARN of the SQS queue for failed messages.
   */
  sqsQueueArn?: string;
  /**
   * #### The name of an SQS queue (defined in your Stacktape configuration) for failed messages.
   */
  sqsQueueName?: string;
}

/**
 * #### Triggers a function when new messages are available in an SQS queue.
 *
 * ---
 *
 * Messages are processed in batches. A single function invocation can receive multiple messages.
 *
 * > A single SQS queue should only be consumed by one function. If you need multiple consumers for the same message (a "fan-out" pattern), use an SNS topic or an EventBridge event bus.
 *
 * To add a custom SQS queue, define it as a [CloudFormation resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-sqs-queues.html) in the `cloudformationResources` section.
 *
 * The function is triggered when:
 * - The batch window (`maxBatchWindowSeconds`) expires.
 * - The maximum batch size (`batchSize`) is reached.
 * - The maximum payload size (6 MB) is reached.
 */
interface SqsIntegration {
  type: 'sqs';
  /**
   * #### Properties of the integration
   */
  properties: SqsIntegrationProps;
}

interface SqsIntegrationProps {
  /**
   * #### The name of an SQS queue defined in your stack's resources.
   *
   * ---
   *
   * You must specify either `sqsQueueName` or `sqsQueueArn`.
   */
  sqsQueueName?: string;
  /**
   * #### The ARN of an existing SQS queue.
   *
   * ---
   *
   * Use this to consume messages from a queue that is not managed by your stack.
   * You must specify either `sqsQueueName` or `sqsQueueArn`.
   */
  sqsQueueArn?: string;
  /**
   * #### The maximum number of records to process in a single batch.
   *
   * ---
   *
   * Maximum is 10,000.
   *
   * @default 10
   */
  batchSize?: number;
  /**
   * #### The maximum time (in seconds) to wait before invoking the function with a batch of records.
   *
   * ---
   *
   * Maximum is 300 seconds. If not set, the function is invoked as soon as messages are available.
   */
  maxBatchWindowSeconds?: number;
}

/**
 * #### Triggers a function when new records are available in a Kinesis Data Stream.
 *
 * ---
 *
 * Kinesis is suitable for real-time data streaming and processing. Records are processed in batches.
 * For a comparison with SQS, see the [AWS documentation](https://aws.amazon.com/kinesis/data-streams/faqs/).
 *
 * To add a custom Kinesis stream, define it as a [CloudFormation resource](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-kinesis-stream.html) in the `cloudformationResources` section.
 *
 * You can consume messages in two ways:
 * - **Directly**: Polls each shard once per second. Read throughput is shared with other consumers.
 * - **Stream Consumer**: Provides a dedicated connection to each shard for higher throughput and lower latency.
 */
interface KinesisIntegration {
  type: 'kinesis-stream';
  /**
   * #### Properties of the integration
   */
  properties: KinesisIntegrationProps;
}

interface KinesisIntegrationProps {
  /**
   * #### The ARN of the Kinesis stream to consume records from.
   */
  streamArn: string;
  /**
   * #### The ARN of a specific stream consumer to use.
   *
   * ---
   *
   * This cannot be used with `autoCreateConsumer`.
   */
  consumerArn?: string;
  /**
   * #### Automatically creates a dedicated stream consumer for this integration.
   *
   * ---
   *
   * This is recommended for minimizing latency and maximizing throughput.
   * For more details, see the [AWS documentation on stream consumers](https://docs.aws.amazon.com/streams/latest/dev/amazon-kinesis-consumers.html).
   * This cannot be used with `consumerArn`.
   */
  autoCreateConsumer?: boolean;
  /**
   * #### The maximum time (in seconds) to wait before invoking the function with a batch of records.
   *
   * ---
   *
   * Maximum is 300 seconds.
   */
  maxBatchWindowSeconds?: number;
  /**
   * #### The maximum number of records to process in a single batch.
   *
   * ---
   *
   * Maximum is 10,000.
   *
   * @default 10
   */
  batchSize?: number;
  /**
   * #### The position in the stream from which to start reading records.
   *
   * ---
   *
   * - `LATEST`: Read only new records.
   * - `TRIM_HORIZON`: Read all available records from the beginning of the stream.
   *
   * @default TRIM_HORIZON
   */
  startingPosition?: 'LATEST' | 'TRIM_HORIZON';
  /**
   * #### The number of times to retry a failed batch of records.
   *
   * ---
   *
   * > **Important:** If an error occurs, the entire batch is retried, including records that were processed successfully. Your function should be idempotent to handle this.
   */
  maximumRetryAttempts?: number;
  /**
   * #### A destination (SQS queue or SNS topic) for batches that fail after all retry attempts.
   */
  onFailure?: DestinationOnFailure;
  /**
   * #### The number of batches to process concurrently from the same shard.
   */
  parallelizationFactor?: number;
  /**
   * #### Splits a failed batch in two before retrying.
   *
   * ---
   *
   * This can be useful if a failure is caused by a batch being too large.
   */
  bisectBatchOnFunctionError?: boolean;
}

interface DestinationOnFailure {
  /**
   * #### The ARN of the SNS topic or SQS queue for failed batches.
   */
  arn: string;
  /**
   * #### The type of the destination.
   */
  type: 'sns' | 'sqs';
}

/**
 * #### Triggers a function when item-level changes occur in a DynamoDB table.
 *
 * ---
 *
 * DynamoDB Streams capture a time-ordered sequence of modifications to items in a table.
 * Records are processed in batches.
 * To use this, you must enable streams on your DynamoDB table. For more information, see the [DynamoDB table documentation](https://docs.stacktape.com/resources/dynamo-db-tables/#item-change-streaming).
 */
interface DynamoDbIntegration {
  type: 'dynamo-db-stream';
  /**
   * #### Properties of the integration
   */
  properties: DynamoDbIntegrationProps;
}

interface DynamoDbIntegrationProps {
  /**
   * #### The ARN of the DynamoDB table stream.
   */
  streamArn: string;
  /**
   * #### The maximum time (in seconds) to wait before invoking the function with a batch of records.
   *
   * ---
   *
   * Maximum is 300 seconds.
   */
  maxBatchWindowSeconds?: number; // maximum 300 seconds
  /**
   * #### The maximum number of records to process in a single batch.
   *
   * ---
   *
   * Maximum is 1,000.
   *
   * @default 100
   */
  batchSize?: number;
  /**
   * #### The position in the stream from which to start reading records.
   *
   * ---
   *
   * - `LATEST`: Read only new records.
   * - `TRIM_HORIZON`: Read all available records from the beginning of the stream.
   *
   * @default TRIM_HORIZON
   */
  startingPosition?: string;
  /**
   * #### The number of times to retry a failed batch of records.
   *
   * ---
   *
   * > **Important:** If an error occurs, the entire batch is retried, including records that were processed successfully. Your function should be idempotent to handle this.
   */
  maximumRetryAttempts?: number;
  /**
   * #### A destination (SQS queue or SNS topic) for batches that fail after all retry attempts.
   */
  onFailure?: DestinationOnFailure;
  /**
   * #### The number of batches to process concurrently from the same shard.
   */
  parallelizationFactor?: number;
  /**
   * #### Splits a failed batch in two before retrying.
   *
   * ---
   *
   * This can be useful if a failure is caused by a batch being too large.
   */
  bisectBatchOnFunctionError?: boolean;
}
/**
 * #### Triggers a function when a specified event occurs in an S3 bucket.
 *
 * ---
 *
 * For a list of supported event types, see the [AWS documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html#supported-notification-event-types).
 */
interface S3Integration {
  type: 's3';
  /**
   * #### Properties of the integration
   */
  properties: S3IntegrationProps;
}

interface S3IntegrationProps {
  /**
   * #### The ARN of the S3 bucket to monitor for events.
   */
  bucketArn: string;
  /**
   * #### The type of S3 event that will trigger the function.
   */
  s3EventType:
    | 's3:ReducedRedundancyLostObject'
    | 's3:ObjectCreated:*'
    | 's3:ObjectCreated:Put'
    | 's3:ObjectCreated:Post'
    | 's3:ObjectCreated:Copy'
    | 's3:ObjectCreated:CompleteMultipartUpload'
    | 's3:ObjectRemoved:*'
    | 's3:ObjectRemoved:Delete'
    | 's3:ObjectRemoved:DeleteMarkerCreated'
    | 's3:ObjectRestore:*'
    | 's3:ObjectRestore:Post'
    | 's3:ObjectRestore:Completed'
    | 's3:Replication:*'
    | 's3:Replication:OperationFailedReplication'
    | 's3:Replication:OperationNotTracked'
    | 's3:Replication:OperationMissedThreshold'
    | 's3:Replication:OperationReplicatedAfterThreshold';
  /**
   * #### A filter to apply to objects, so the function is only triggered for relevant objects.
   */
  filterRule?: S3FilterRule;
}

interface S3FilterRule {
  /**
   * #### The prefix that an object's key must have to trigger the function.
   */
  prefix?: string;
  /**
   * #### The suffix that an object's key must have to trigger the function.
   */
  suffix?: string;
}

/**
 * #### Triggers a function on a recurring schedule.
 *
 * ---
 *
 * You can define schedules using two formats:
 * - **Rate expressions**: Run at a regular interval (e.g., `rate(5 minutes)`). See the [AWS documentation on rate expressions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#RateExpressions).
 * - **Cron expressions**: Run at specific times (e.g., `cron(0 18 ? * MON-FRI *)`). See the [AWS documentation on cron expressions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#CronExpressions).
 */
interface ScheduleIntegration {
  type: 'schedule';
  /**
   * #### Properties of the integration
   */
  properties: ScheduleIntegrationProps;
}

interface ScheduleIntegrationProps {
  /**
   * #### The schedule rate or cron expression.
   *
   * ---
   *
   * Examples: `rate(2 hours)`, `cron(0 10 * * ? *)`
   */
  scheduleRate: string;
  /**
   * #### A fixed JSON object to be passed as the event payload.
   *
   * ---
   *
   * If you need to customize the payload based on the event, use `inputTransformer` instead.
   * You can only use one of `input`, `inputPath`, or `inputTransformer`.
   *
   * Example:
   *
   * ```yaml
   * input:
   *   source: 'my-scheduled-event'
   * ```
   */
  input?: any;
  /**
   * #### A JSONPath expression to extract a portion of the event to pass to the target.
   *
   * ---
   *
   * This is useful for forwarding only a specific part of the event payload.
   * You can only use one of `input`, `inputPath`, or `inputTransformer`.
   *
   * Example:
   *
   * ```yaml
   * inputPath: '$.detail'
   * ```
   */
  inputPath?: string;
  /**
   * #### Customizes the event payload sent to the target.
   *
   * ---
   *
   * This allows you to extract values from the original event and use them to construct a new payload.
   * You can only use one of `input`, `inputPath`, or `inputTransformer`.
   *
   * Example:
   *
   * ```yaml
   * inputTransformer:
   *   inputPathsMap:
   *     eventTime: '$.time'
   *   inputTemplate:
   *     message: 'This event occurred at <eventTime>.'
   * ```
   */
  inputTransformer?: EventInputTransformer;
}

interface AlarmIntegration {
  type: 'cloudwatch-alarm';
  /**
   * #### Properties of the integration
   */
  properties: AlarmIntegrationProps;
}

interface AlarmIntegrationProps {
  /**
   * #### The name of the alarm (defined in the `alarms` section) that will trigger the function.
   */
  alarmName: string;
  // input?: any;
  // inputPath?: string;
  // inputTransformer?: EventInputTransformer;
}

/**
 * #### Triggers a function when a new log record is added to a CloudWatch log group.
 *
 * ---
 *
 * > **Note:** The event payload is BASE64-encoded and gzipped. You will need to decode and decompress it in your function to access the log data.
 */
interface CloudwatchLogIntegration {
  type: 'cloudwatch-log';
  /**
   * #### Properties of the integration
   */
  properties: CloudwatchLogIntegrationProps;
}

interface CloudwatchLogIntegrationProps {
  /**
   * #### The ARN of the log group to watch for new records.
   */
  logGroupArn: string;
  /**
   * #### A filter pattern to apply to the log records.
   *
   * ---
   *
   * Only logs that match this pattern will trigger the function.
   * For details on the syntax, see the [AWS documentation on filter and pattern syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html).
   */
  filter?: string;
}

interface EventBusIntegrationPattern {
  /**
   * #### A filter for the `version` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  version?: any;
  /**
   * #### A filter for the `detail-type` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  'detail-type'?: any;
  /**
   * #### A filter for the `source` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  source?: any;
  /**
   * #### A filter for the `account` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  account?: any;
  /**
   * #### A filter for the `region` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  region?: any;
  /**
   * #### A filter for the `resources` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  resources?: any;
  /**
   * #### A filter for the `detail` field of the event.
   *
   * ---
   *
   * The `detail` field contains the main payload of the event as a JSON object. You can create complex matching rules based on its contents.
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  detail?: any;
  /**
   * #### A filter for the `replay-name` field of the event.
   *
   * ---
   *
   * For more details on event patterns, see the [AWS EventBridge documentation](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  'replay-name'?: any;
}

interface EventInputTransformer {
  /**
   * #### A map of key-value pairs to extract from the event payload.
   *
   * ---
   *
   * Each value is a JSONPath expression that extracts data from the event. These extracted values can then be used in the `inputTemplate`.
   */
  inputPathsMap?: any;
  /**
   * #### A template for constructing a new event payload.
   *
   * ---
   *
   * Use placeholders (`<placeholder>`) to insert the values extracted with `inputPathsMap`.
   */
  inputTemplate: any;
}

interface IotIntegration {
  type: 'iot';
  /**
   * #### Properties of the integration
   */
  properties: IotIntegrationProps;
}

interface IotIntegrationProps {
  /**
   * #### The SQL statement for the IoT topic rule.
   */
  sql: string;
  /**
   * #### The version of the IoT SQL rules engine to use.
   */
  sqlVersion?: string;
}

/**
 * #### Triggers a function when a request is made to an HTTP API Gateway.
 *
 * ---
 *
 * Routes are selected based on the most specific match. For more details on route evaluation, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html#http-api-develop-routes.evaluation).
 */
interface HttpApiIntegration {
  type: 'http-api-gateway';
  /**
   * #### Properties of the integration
   */
  properties: HttpApiIntegrationProps;
}

interface HttpApiIntegrationProps {
  /**
   * #### The name of the HTTP API Gateway.
   */
  httpApiGatewayName: string;
  /**
   * #### The HTTP method that will trigger this integration.
   *
   * ---
   *
   * You can specify an exact method (e.g., `GET`) or use `*` to match any method.
   */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | '*';
  /**
   * #### The URL path that will trigger this integration.
   *
   * ---
   *
   * - **Exact path**: `/users`
   * - **Path with parameter**: `/users/{id}`. The `id` will be available in `event.pathParameters.id`.
   * - **Greedy path**: `/files/{proxy+}`. This will match any path starting with `/files/`.
   */
  path: string;
  /**
   * #### An authorizer to protect this route.
   *
   * ---
   *
   * Unauthorized requests will be rejected with a `401 Unauthorized` response.
   */
  authorizer?: StpAuthorizer;
  /**
   * #### The payload format version for the Lambda integration.
   *
   * ---
   *
   * For details on the differences between formats, see the [AWS documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html).
   *
   * @default '1.0'
   */
  payloadFormat?: '1.0' | '2.0';
}

/**
 * #### Triggers a batch job when an event matching a specified pattern is received by an event bus.
 *
 * ---
 *
 * You can use a custom event bus or the default AWS event bus.
 */
interface EventBusIntegration {
  type: 'event-bus';
  /**
   * #### Properties of the integration
   */
  properties: EventBusIntegrationProps;
}

interface EventBusIntegrationProps {
  /**
   * #### The ARN of an existing event bus.
   *
   * ---
   *
   * Use this to subscribe to an event bus that is not managed by your stack.
   * You must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.
   */
  eventBusArn?: string;
  /**
   * #### The name of an event bus defined in your stack's resources.
   *
   * ---
   *
   * You must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.
   */
  eventBusName?: string;
  /**
   * #### Uses the default AWS event bus.
   *
   * ---
   *
   * You must specify only one of `eventBusArn`, `eventBusName`, or `useDefaultBus`.
   */
  useDefaultBus?: boolean;
  /**
   * #### A pattern to filter events from the event bus.
   *
   * ---
   *
   * Only events that match this pattern will trigger the target.
   * For details on the syntax, see the [AWS EventBridge documentation on event patterns](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html).
   */
  eventPattern: EventBusIntegrationPattern;
  /**
   * #### A destination for events that fail to be delivered to the target.
   *
   * ---
   *
   * In rare cases, an event might fail to be delivered. This property specifies an SQS queue where failed events will be sent.
   */
  onDeliveryFailure?: EventBusOnDeliveryFailure;
  /**
   * #### A fixed JSON object to be passed as the event payload.
   *
   * ---
   *
   * If you need to customize the payload based on the event, use `inputTransformer` instead.
   * You can only use one of `input`, `inputPath`, or `inputTransformer`.
   *
   * Example:
   *
   * ```yaml
   * input:
   *   source: 'my-custom-event'
   * ```
   */
  input?: any;
  /**
   * #### A JSONPath expression to extract a portion of the event to pass to the target.
   *
   * ---
   *
   * This is useful for forwarding only a specific part of the event payload.
   * You can only use one of `input`, `inputPath`, or `inputTransformer`.
   *
   * Example:
   *
   * ```yaml
   * inputPath: '$.detail'
   * ```
   */
  inputPath?: string;
  /**
   * #### Customizes the event payload sent to the target.
   *
   * ---
   *
   * This allows you to extract values from the original event and use them to construct a new payload.
   * You can only use one of `input`, `inputPath`, or `inputTransformer`.
   *
   * Example:
   *
   * ```yaml
   * inputTransformer:
   *   inputPathsMap:
   *     instanceId: '$.detail.instance-id'
   *     instanceState: '$.detail.state'
   *   inputTemplate:
   *     message: 'Instance <instanceId> is now in state <instanceState>.'
   * ```
   */
  inputTransformer?: EventInputTransformer;
}

interface EventBusOnDeliveryFailure {
  /**
   * #### The ARN of the SQS queue for failed events.
   */
  sqsQueueArn?: string;
  /**
   * #### The name of an SQS queue (defined in your Stacktape configuration) for failed events.
   */
  sqsQueueName?: string;
}

/**
 * #### Triggers a container when a request is made to a Network Load Balancer.
 *
 * ---
 *
 * A Network Load Balancer operates at the transport layer (Layer 4) and can handle TCP and TLS traffic.
 */
interface ContainerWorkloadNetworkLoadBalancerIntegration {
  type: 'network-load-balancer';
  /**
   * #### Properties of the integration
   */
  properties: ContainerWorkloadNetworkLoadBalancerIntegrationProps;
}

interface ContainerWorkloadNetworkLoadBalancerIntegrationProps extends NetworkLoadBalancerIntegrationProps {
  /**
   * #### The container port that will receive traffic from the load balancer.
   */
  containerPort: number;
}

interface NetworkLoadBalancerIntegrationProps {
  /**
   * #### The name of the Network Load Balancer.
   *
   * ---
   *
   * This must reference a load balancer defined in your Stacktape configuration.
   */
  loadBalancerName: string;
  /**
   * #### The port of the listener that will forward traffic to this integration.
   */
  listenerPort: number;
}
```