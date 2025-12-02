// This file is auto-generated. Do not edit manually.
// Source: aws-logs-deliverysource.json

/**
 * A delivery source is an AWS resource that sends logs to an AWS destination. The destination can be
 * CloudWatch Logs, Amazon S3, or Kinesis Data Firehose.
 * Only some AWS services support being configured as a delivery source. These services are listed as
 * Supported [V2 Permissions] in the table at [Enabling logging from AWS
 * services](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AWS-logs-and-resource-policy.html).
 */
export type AwsLogsDeliverysource = {
  /**
   * The unique name of the Log source.
   * @minLength 1
   * @maxLength 60
   * @pattern [\w-]*$
   */
  Name: string;
  /** The Amazon Resource Name (ARN) that uniquely identifies this delivery source. */
  Arn?: string;
  /**
   * This array contains the ARN of the AWS resource that sends logs and is represented by this delivery
   * source. Currently, only one ARN can be in the array.
   * @uniqueItems true
   */
  ResourceArns?: string[];
  /** The ARN of the resource that will be sending the logs. */
  ResourceArn?: string;
  /**
   * The AWS service that is sending logs.
   * @minLength 1
   * @maxLength 255
   * @pattern [\w-]*$
   */
  Service?: string;
  /**
   * The type of logs being delivered. Only mandatory when the resourceArn could match more than one. In
   * such a case, the error message will contain all the possible options.
   * @minLength 1
   * @maxLength 255
   * @pattern [\w-]*$
   */
  LogType?: string;
  /**
   * The tags that have been assigned to this delivery source.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
