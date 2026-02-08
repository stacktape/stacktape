/**
 * #### Real-time data stream for ingesting high-volume events (logs, clickstreams, IoT, analytics).
 *
 * ---
 *
 * Continuously captures data from many producers. Consumers (Lambda functions, etc.) process records in order.
 * Use when you need real-time processing with sub-second latency, not just async messaging (use SQS for that).
 */
interface KinesisStream {
  type: 'kinesis-stream';
  properties?: KinesisStreamProps;
  overrides?: ResourceOverrides;
}

interface KinesisStreamProps {
  /**
   * #### How the stream scales.
   *
   * ---
   *
   * - **`ON_DEMAND`**: Auto-scales, pay per GB. Recommended for most use cases.
   * - **`PROVISIONED`**: You choose a fixed number of shards (1 MB/s write, 2 MB/s read each). More predictable costs.
   *
   * @default "ON_DEMAND"
   */
  capacityMode?: 'ON_DEMAND' | 'PROVISIONED';
  /**
   * #### Number of shards. Only used when `capacityMode` is `PROVISIONED`.
   *
   * ---
   *
   * Each shard: 1 MB/s write (1,000 records/s), 2 MB/s read (shared across consumers).
   *
   * @default 1
   */
  shardCount?: number;
  /**
   * #### How long records stay in the stream (hours). Range: 24–8,760 (365 days). Beyond 24h costs extra.
   *
   * @default 24
   */
  retentionPeriodHours?: number;
  /**
   * #### Encrypt data at rest using a KMS key.
   */
  encryption?: KinesisStreamEncryption;
  /**
   * #### Give each consumer its own dedicated 2 MB/s read throughput (instead of sharing).
   *
   * ---
   *
   * Use when you have multiple consumers reading from the same stream and need low latency.
   * Enhanced fan-out consumers are auto-created when a Lambda uses `autoCreateConsumer: true`.
   *
   * @default false
   */
  enableEnhancedFanOut?: boolean;
}

interface KinesisStreamEncryption {
  /**
   * #### Enable server-side encryption.
   * @default false
   */
  enabled: boolean;
  /**
   * #### ARN of your own KMS key. If omitted, uses the AWS-managed `alias/aws/kinesis` key (no extra cost).
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
