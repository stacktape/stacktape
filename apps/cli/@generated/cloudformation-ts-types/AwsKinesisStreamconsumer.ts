// This file is auto-generated. Do not edit manually.
// Source: aws-kinesis-streamconsumer.json

/** Resource Type definition for AWS::Kinesis::StreamConsumer */
export type AwsKinesisStreamconsumer = {
  /** Timestamp when the consumer was created. */
  ConsumerCreationTimestamp?: string;
  /**
   * The name of the Kinesis Stream Consumer. For a given Kinesis data stream, each consumer must have a
   * unique name. However, consumer names don't have to be unique across data streams.
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9_.-]+$
   */
  ConsumerName: string;
  /**
   * The ARN returned by Kinesis Data Streams when you registered the consumer. If you don't know the
   * ARN of the consumer that you want to deregister, you can use the ListStreamConsumers operation to
   * get a list of the descriptions of all the consumers that are currently registered with a given data
   * stream. The description of a consumer contains its ARN.
   */
  ConsumerARN?: string;
  /**
   * A consumer can't read data while in the CREATING or DELETING states. Valid Values: CREATING |
   * DELETING | ACTIVE
   */
  ConsumerStatus?: string;
  /**
   * The Amazon resource name (ARN) of the Kinesis data stream that you want to register the consumer
   * with.
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws.*:kinesis:.*:\d{12}:stream/\S+
   */
  StreamARN: string;
  /**
   * An arbitrary set of tags (key–value pairs) to associate with the Kinesis consumer.
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The value for the tag. You can specify a value that is 0 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 255
     */
    Value: string;
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
};
