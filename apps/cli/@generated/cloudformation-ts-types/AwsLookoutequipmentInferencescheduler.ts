// This file is auto-generated. Do not edit manually.
// Source: aws-lookoutequipment-inferencescheduler.json

/** Resource schema for LookoutEquipment InferenceScheduler. */
export type AwsLookoutequipmentInferencescheduler = {
  /**
   * A period of time (in minutes) by which inference on the data is delayed after the data starts.
   * @minimum 0
   * @maximum 60
   */
  DataDelayOffsetInMinutes?: number;
  /**
   * Specifies configuration information for the input data for the inference scheduler, including
   * delimiter, format, and dataset location.
   */
  DataInputConfiguration: {
    /**
     * Indicates the difference between your time zone and Greenwich Mean Time (GMT).
     * @pattern ^(\+|\-)[0-9]{2}\:[0-9]{2}$
     */
    InputTimeZoneOffset?: string;
    InferenceInputNameConfiguration?: {
      /**
       * Indicates the delimiter character used between items in the data.
       * @minLength 0
       * @maxLength 1
       * @pattern ^(\-|\_|\s)?$
       */
      ComponentTimestampDelimiter?: string;
      /**
       * The format of the timestamp, whether Epoch time, or standard, with or without hyphens (-).
       * @pattern ^EPOCH|yyyy-MM-dd-HH-mm-ss|yyyyMMddHHmmss$
       */
      TimestampFormat?: string;
    };
    S3InputConfiguration: {
      Bucket: string;
      Prefix?: string;
    };
  };
  /**
   * Specifies configuration information for the output results for the inference scheduler, including
   * the S3 location for the output.
   */
  DataOutputConfiguration: {
    /**
     * The ID number for the AWS KMS key used to encrypt the inference output.
     * @minLength 1
     * @maxLength 2048
     * @pattern ^[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,2048}$
     */
    KmsKeyId?: string;
    S3OutputConfiguration: {
      Bucket: string;
      Prefix?: string;
    };
  };
  /**
   * How often data is uploaded to the source S3 bucket for the input data.
   * @enum ["PT5M","PT10M","PT15M","PT30M","PT1H"]
   */
  DataUploadFrequency: "PT5M" | "PT10M" | "PT15M" | "PT30M" | "PT1H";
  /**
   * The name of the inference scheduler being created.
   * @minLength 1
   * @maxLength 200
   * @pattern ^[0-9a-zA-Z_-]{1,200}$
   */
  InferenceSchedulerName?: string;
  /**
   * The name of the previously trained ML model being used to create the inference scheduler.
   * @minLength 1
   * @maxLength 200
   * @pattern ^[0-9a-zA-Z_-]{1,200}$
   */
  ModelName: string;
  /**
   * The Amazon Resource Name (ARN) of a role with permission to access the data source being used for
   * the inference.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:aws(-[^:]+)?:iam::[0-9]{12}:role/.+
   */
  RoleArn: string;
  /**
   * Provides the identifier of the AWS KMS customer master key (CMK) used to encrypt inference
   * scheduler data by Amazon Lookout for Equipment.
   * @minLength 1
   * @maxLength 2048
   * @pattern ^[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,2048}$
   */
  ServerSideKmsKeyId?: string;
  /**
   * Any tags associated with the inference scheduler.
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key for the specified tag.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the specified tag.
     * @minLength 0
     * @maxLength 256
     * @pattern [\s\w+-=\.:/@]*
     */
    Value: string;
  }[];
  /**
   * The Amazon Resource Name (ARN) of the inference scheduler being created.
   * @minLength 1
   * @maxLength 200
   * @pattern arn:aws(-[^:]+)?:lookoutequipment:[a-zA-Z0-9\-]*:[0-9]{12}:inference-scheduler\/.+
   */
  InferenceSchedulerArn?: string;
};
