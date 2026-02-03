/**
 * #### Kinesis Data Stream
 *
 * ---
 *
 * A fully managed, scalable, and durable real-time data streaming service that can continuously capture gigabytes of data per second from hundreds of thousands of sources.
 *
 * Kinesis Data Streams is commonly used for log and event data collection, real-time analytics, mobile data capture, and IoT data processing.
 *
 * For more information, see the [AWS documentation on Kinesis Data Streams](https://docs.aws.amazon.com/streams/latest/dev/introduction.html).
 */
interface KinesisStream {
  type: 'kinesis-stream';
  properties?: KinesisStreamProps;
  overrides?: ResourceOverrides;
}

interface KinesisStreamProps {
  /**
   * #### Capacity Mode
   *
   * ---
   *
   * Determines how the stream's capacity is managed.
   *
   * - **`ON_DEMAND`**: The stream automatically scales to handle any amount of data. You pay per GB of data written and read. This is the simplest option and recommended for most use cases.
   * - **`PROVISIONED`**: You specify the number of shards. Each shard provides 1 MB/sec write and 2 MB/sec read capacity. This offers more predictable costs for stable workloads.
   *
   * @default "ON_DEMAND"
   */
  capacityMode?: 'ON_DEMAND' | 'PROVISIONED';
  /**
   * #### Shard Count
   *
   * ---
   *
   * The number of shards for the stream. Only applicable when `capacityMode` is `PROVISIONED`.
   *
   * Each shard provides:
   * - **Write:** 1 MB/sec or 1,000 records/sec
   * - **Read:** 2 MB/sec or 5 transactions/sec (shared across all consumers)
   *
   * For on-demand streams, this property is ignored as AWS automatically manages shard capacity.
   *
   * @default 1
   */
  shardCount?: number;
  /**
   * #### Retention Period (Hours)
   *
   * ---
   *
   * The number of hours data records are retained in the stream.
   *
   * The minimum is 24 hours. The maximum is 8760 hours (365 days).
   * Extended retention (beyond 24 hours) incurs additional costs.
   *
   * @default 24
   */
  retentionPeriodHours?: number;
  /**
   * #### Encryption
   *
   * ---
   *
   * Configures server-side encryption for the stream.
   *
   * When enabled, all data written to the stream is encrypted at rest using the specified KMS key.
   */
  encryption?: KinesisStreamEncryption;
  /**
   * #### Enable Enhanced Fan-Out
   *
   * ---
   *
   * If `true`, enables enhanced fan-out for the stream.
   *
   * Enhanced fan-out provides dedicated 2 MB/sec throughput per consumer per shard, instead of sharing the 2 MB/sec across all consumers.
   * This is useful when you have multiple consumers that need to read from the stream simultaneously with low latency.
   *
   * Note: Enhanced fan-out consumers are created automatically when a Lambda function uses `autoCreateConsumer: true` in its Kinesis event integration.
   *
   * @default false
   */
  enableEnhancedFanOut?: boolean;
}

interface KinesisStreamEncryption {
  /**
   * #### Enable Encryption
   *
   * ---
   *
   * If `true`, enables server-side encryption for the stream.
   *
   * @default false
   */
  enabled: boolean;
  /**
   * #### KMS Key ARN
   *
   * ---
   *
   * The ARN of a customer-managed KMS key to use for encryption.
   *
   * If not specified, the AWS-managed key `alias/aws/kinesis` is used.
   */
  kmsKeyArn?: string;
}

type StpKinesisStream = KinesisStream['properties'] & {
  name: string;
  type: KinesisStream['type'];
  configParentResourceType: KinesisStream['type'];
  nameChain: string[];
};

type KinesisStreamReferencableParam = 'arn' | 'name';
