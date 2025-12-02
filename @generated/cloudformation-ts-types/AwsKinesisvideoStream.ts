// This file is auto-generated. Do not edit manually.
// Source: aws-kinesisvideo-stream.json

/** Resource Type Definition for AWS::KinesisVideo::Stream */
export type AwsKinesisvideoStream = {
  /** The Amazon Resource Name (ARN) of the Kinesis Video stream. */
  Arn?: string;
  /**
   * The name of the Kinesis Video stream.
   * @minLength 1
   * @maxLength 256
   * @pattern [a-zA-Z0-9_.-]+
   */
  Name?: string;
  /**
   * The number of hours till which Kinesis Video will retain the data in the stream
   * @minimum 0
   * @maximum 87600
   */
  DataRetentionInHours?: number;
  /**
   * The name of the device that is writing to the stream.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9_.-]+
   */
  DeviceName?: string;
  /**
   * AWS KMS key ID that Kinesis Video Streams uses to encrypt stream data.
   * @minLength 1
   * @maxLength 2048
   * @pattern .+
   */
  KmsKeyId?: string;
  /**
   * The media type of the stream. Consumers of the stream can use this information when processing the
   * stream.
   * @minLength 1
   * @maxLength 128
   * @pattern [\w\-\.\+]+/[\w\-\.\+]+(,[\w\-\.\+]+/[\w\-\.\+]+)*
   */
  MediaType?: string;
  /**
   * An array of key-value pairs associated with the Kinesis Video Stream.
   * @minItems 1
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name of the tag. Specify a value that is 1 to 128 Unicode characters in length and cannot
     * be prefixed with aws:. The following characters can be used: the set of Unicode letters, digits,
     * whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. Specify a value that is 0 to 256 Unicode characters in length and cannot be
     * prefixed with aws:. The following characters can be used: the set of Unicode letters, digits,
     * whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** Configuration for the storage tier of the Kinesis Video Stream. */
  StreamStorageConfiguration?: {
    /**
     * The storage tier for the Kinesis Video Stream. Determines the storage class used for stream data.
     * @default "HOT"
     * @enum ["HOT","WARM"]
     */
    DefaultStorageTier?: "HOT" | "WARM";
  };
};
