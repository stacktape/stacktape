// This file is auto-generated. Do not edit manually.
// Source: aws-ivschat-loggingconfiguration.json

/** Resource type definition for AWS::IVSChat::LoggingConfiguration. */
export type AwsIvschatLoggingconfiguration = {
  /**
   * LoggingConfiguration ARN is automatically generated on creation and assigned as the unique
   * identifier.
   * @minLength 1
   * @maxLength 128
   * @pattern ^arn:aws:ivschat:[a-z0-9-]+:[0-9]+:logging-configuration/[a-zA-Z0-9-]+$
   */
  Arn?: string;
  /**
   * The system-generated ID of the logging configuration.
   * @minLength 12
   * @maxLength 12
   * @pattern ^[a-zA-Z0-9]+$
   */
  Id?: string;
  DestinationConfiguration: {
    CloudWatchLogs?: {
      /**
       * Name of the Amazon CloudWatch Logs log group where chat activity will be logged.
       * @minLength 1
       * @maxLength 512
       * @pattern ^[\.\-_/#A-Za-z0-9]+$
       */
      LogGroupName: string;
    };
    Firehose?: {
      /**
       * Name of the Amazon Kinesis Firehose delivery stream where chat activity will be logged.
       * @minLength 1
       * @maxLength 64
       * @pattern ^[a-zA-Z0-9_.-]+$
       */
      DeliveryStreamName: string;
    };
    S3?: {
      /**
       * Name of the Amazon S3 bucket where chat activity will be logged.
       * @minLength 3
       * @maxLength 63
       * @pattern ^[a-z0-9-.]+$
       */
      BucketName: string;
    };
  };
  /**
   * The name of the logging configuration. The value does not need to be unique.
   * @minLength 0
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-_]*$
   */
  Name?: string;
  /**
   * The state of the logging configuration. When the state is ACTIVE, the configuration is ready to log
   * chat content.
   * @enum ["CREATING","CREATE_FAILED","DELETING","DELETE_FAILED","UPDATING","UPDATING_FAILED","ACTIVE"]
   */
  State?: "CREATING" | "CREATE_FAILED" | "DELETING" | "DELETE_FAILED" | "UPDATING" | "UPDATING_FAILED" | "ACTIVE";
  /**
   * An array of key-value pairs to apply to this resource.
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
};
