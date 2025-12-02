// This file is auto-generated. Do not edit manually.
// Source: aws-cloudfront-realtimelogconfig.json

/** A real-time log configuration. */
export type AwsCloudfrontRealtimelogconfig = {
  Arn?: string;
  /**
   * Contains information about the Amazon Kinesis data stream where you are sending real-time log data
   * for this real-time log configuration.
   * @minItems 1
   * @uniqueItems false
   */
  EndPoints: {
    /**
     * Contains information about the Amazon Kinesis data stream where you are sending real-time log data
     * in a real-time log configuration.
     */
    KinesisStreamConfig: {
      /**
       * The Amazon Resource Name (ARN) of an IAMlong (IAM) role that CloudFront can use to send real-time
       * log data to your Kinesis data stream.
       * For more information the IAM role, see [Real-time log configuration IAM
       * role](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/real-time-logs.html#understand-real-time-log-config-iam-role)
       * in the *Amazon CloudFront Developer Guide*.
       */
      RoleArn: string;
      /** The Amazon Resource Name (ARN) of the Kinesis data stream where you are sending real-time log data. */
      StreamArn: string;
    };
    /**
     * The type of data stream where you are sending real-time log data. The only valid value is
     * ``Kinesis``.
     */
    StreamType: string;
  }[];
  /**
   * A list of fields that are included in each real-time log record. In an API response, the fields are
   * provided in the same order in which they are sent to the Amazon Kinesis data stream.
   * For more information about fields, see [Real-time log configuration
   * fields](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/real-time-logs.html#understand-real-time-log-config-fields)
   * in the *Amazon CloudFront Developer Guide*.
   * @minItems 1
   * @uniqueItems false
   */
  Fields: string[];
  /** The unique name of this real-time log configuration. */
  Name: string;
  /**
   * The sampling rate for this real-time log configuration. The sampling rate determines the percentage
   * of viewer requests that are represented in the real-time log data. The sampling rate is an integer
   * between 1 and 100, inclusive.
   * @minimum 1
   * @maximum 100
   */
  SamplingRate: number;
};
