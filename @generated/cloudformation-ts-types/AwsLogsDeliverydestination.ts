// This file is auto-generated. Do not edit manually.
// Source: aws-logs-deliverydestination.json

/**
 * This structure contains information about one delivery destination in your account.
 * A delivery destination is an AWS resource that represents an AWS service that logs can be sent to
 * CloudWatch Logs, Amazon S3, are supported as Kinesis Data Firehose delivery destinations.
 */
export type AwsLogsDeliverydestination = {
  /**
   * The name of this delivery destination.
   * @minLength 1
   * @maxLength 60
   * @pattern [\w-]*$
   */
  Name: string;
  /** The Amazon Resource Name (ARN) that uniquely identifies this delivery destination. */
  Arn?: string;
  /**
   * The ARN of the Amazon Web Services destination that this delivery destination represents. That
   * Amazon Web Services destination can be a log group in CloudWatch Logs, an Amazon S3 bucket, or a
   * delivery stream in Firehose.
   */
  DestinationResourceArn?: string;
  /**
   * The tags that have been assigned to this delivery destination.
   * @uniqueItems true
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
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * Displays whether this delivery destination is CloudWatch Logs, Amazon S3, Kinesis Data Firehose, or
   * XRay.
   * @minLength 1
   * @maxLength 12
   * @pattern ^[0-9A-Za-z]+$
   */
  DeliveryDestinationType?: string;
  /**
   * IAM policy that grants permissions to CloudWatch Logs to deliver logs cross-account to a specified
   * destination in this account.
   * The policy must be in JSON string format.
   * Length Constraints: Maximum length of 51200
   */
  DeliveryDestinationPolicy?: {
    /**
     * The name of the delivery destination to assign this policy to
     * @minLength 1
     * @maxLength 60
     */
    DeliveryDestinationName?: string;
    /** The contents of the policy attached to the delivery destination */
    DeliveryDestinationPolicy?: Record<string, unknown>;
  };
  /**
   * The format of the logs that are sent to this delivery destination.
   * @minLength 1
   * @maxLength 12
   * @pattern ^[0-9A-Za-z]+$
   */
  OutputFormat?: string;
};
