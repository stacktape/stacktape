// This file is auto-generated. Do not edit manually.
// Source: aws-kinesis-stream.json

/** Resource Type definition for AWS::Kinesis::Stream */
export type AwsKinesisStream = {
  /** The Amazon resource name (ARN) of the Kinesis stream */
  Arn?: string;
  /**
   * The name of the Kinesis stream.
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9_.-]+$
   */
  Name?: string;
  /**
   * The final list of shard-level metrics
   * @maxItems 7
   * @uniqueItems true
   */
  DesiredShardLevelMetrics?: ("IncomingBytes" | "IncomingRecords" | "OutgoingBytes" | "OutgoingRecords" | "WriteProvisionedThroughputExceeded" | "ReadProvisionedThroughputExceeded" | "IteratorAgeMilliseconds" | "ALL")[];
  /**
   * The number of hours for the data records that are stored in shards to remain accessible.
   * @minimum 24
   */
  RetentionPeriodHours?: number;
  /**
   * The number of shards that the stream uses. Required when StreamMode = PROVISIONED is passed.
   * @minimum 1
   */
  ShardCount?: number;
  /**
   * The mode in which the stream is running.
   * @default {"StreamMode":"PROVISIONED"}
   */
  StreamModeDetails?: {
    /**
     * The mode of the stream
     * @enum ["ON_DEMAND","PROVISIONED"]
     */
    StreamMode: "ON_DEMAND" | "PROVISIONED";
  };
  /**
   * When specified, enables or updates server-side encryption using an AWS KMS key for a specified
   * stream.
   */
  StreamEncryption?: {
    /**
     * The encryption type to use. The only valid value is KMS.
     * @enum ["KMS"]
     */
    EncryptionType: "KMS";
    /**
     * The GUID for the customer-managed AWS KMS key to use for encryption. This value can be a globally
     * unique identifier, a fully specified Amazon Resource Name (ARN) to either an alias or a key, or an
     * alias name prefixed by "alias/".You can also use a master key owned by Kinesis Data Streams by
     * specifying the alias aws/kinesis.
     * @minLength 1
     * @maxLength 2048
     */
    KeyId: unknown | unknown;
  };
  /**
   * An arbitrary set of tags (key-value pairs) to associate with the Kinesis stream.
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 255
     */
    Value: string;
  }[];
  /**
   * Maximum size of a data record in KiB allowed to be put into Kinesis stream.
   * @minimum 1024
   * @maximum 10240
   */
  MaxRecordSizeInKiB?: number;
  /**
   * Target warm throughput in MiB/s for the stream. This property can ONLY be set when StreamMode is
   * ON_DEMAND.
   */
  WarmThroughputMiBps?: number;
  /** Warm throughput configuration details for the stream. Only present for ON_DEMAND streams. */
  WarmThroughputObject?: {
    /** Target warm throughput in MiB/s that a customer can write to a stream at any given time */
    TargetMiBps?: number;
    /** Current warm throughput in MiB/s */
    CurrentMiBps?: number;
  };
};
