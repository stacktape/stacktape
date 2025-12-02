// This file is auto-generated. Do not edit manually.
// Source: aws-logs-destination.json

/**
 * The AWS::Logs::Destination resource specifies a CloudWatch Logs destination. A destination
 * encapsulates a physical resource (such as an Amazon Kinesis data stream) and enables you to
 * subscribe that resource to a stream of log events.
 */
export type AwsLogsDestination = {
  Arn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., :, /, =, +, - and @.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length. You
     * can use any of the following characters: the set of Unicode letters, digits, whitespace, _, ., :,
     * /, =, +, - and @.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * The name of the destination resource
   * @minLength 1
   * @maxLength 512
   * @pattern ^[^:*]{1,512}$
   */
  DestinationName: string;
  /**
   * An IAM policy document that governs which AWS accounts can create subscription filters against this
   * destination.
   * @minLength 1
   */
  DestinationPolicy?: string;
  /**
   * The ARN of an IAM role that permits CloudWatch Logs to send data to the specified AWS resource
   * @minLength 1
   */
  RoleArn: string;
  /**
   * The ARN of the physical target where the log events are delivered (for example, a Kinesis stream)
   * @minLength 1
   */
  TargetArn: string;
};
