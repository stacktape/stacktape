// This file is auto-generated. Do not edit manually.
// Source: aws-logs-delivery.json

/**
 * This structure contains information about one delivery in your account.
 * A delivery is a connection between a logical delivery source and a logical delivery destination.
 * For more information, see
 * [CreateDelivery](https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_CreateDelivery.html).
 */
export type AwsLogsDelivery = {
  /**
   * The unique ID that identifies this delivery in your account.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[0-9A-Za-z]+$
   */
  DeliveryId?: string;
  /** The Amazon Resource Name (ARN) that uniquely identifies this delivery. */
  Arn?: string;
  /**
   * The name of the delivery source that is associated with this delivery.
   * @minLength 1
   * @maxLength 60
   * @pattern [\w-]*$
   */
  DeliverySourceName: string;
  /** The ARN of the delivery destination that is associated with this delivery. */
  DeliveryDestinationArn: string;
  /**
   * Displays whether the delivery destination associated with this delivery is CloudWatch Logs, Amazon
   * S3, or Kinesis Data Firehose.
   * @minLength 1
   * @maxLength 12
   * @pattern ^[0-9A-Za-z]+$
   */
  DeliveryDestinationType?: string;
  /**
   * The tags that have been assigned to this delivery.
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
  /**
   * The list of record fields to be delivered to the destination, in order. If the delivery's log
   * source has mandatory fields, they must be included in this list.
   */
  RecordFields?: string[];
  /**
   * The field delimiter to use between record fields when the final output format of a delivery is in
   * Plain , W3C , or Raw format.
   * @minLength 1
   * @maxLength 5
   */
  FieldDelimiter?: string;
  /**
   * This string allows re-configuring the S3 object prefix to contain either static or variable
   * sections. The valid variables to use in the suffix path will vary by each log source. See
   * ConfigurationTemplate$allowedSuffixPathFields for more info on what values are supported in the
   * suffix path for each log source.
   * @minLength 0
   * @maxLength 256
   */
  S3SuffixPath?: string;
  /**
   * This parameter causes the S3 objects that contain delivered logs to use a prefix structure that
   * allows for integration with Apache Hive.
   */
  S3EnableHiveCompatiblePath?: boolean;
};
