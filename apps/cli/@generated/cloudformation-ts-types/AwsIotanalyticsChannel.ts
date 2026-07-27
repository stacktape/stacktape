// This file is auto-generated. Do not edit manually.
// Source: aws-iotanalytics-channel.json

/** Resource Type definition for AWS::IoTAnalytics::Channel */
export type AwsIotanalyticsChannel = {
  ChannelStorage?: {
    ServiceManagedS3?: Record<string, unknown>;
    CustomerManagedS3?: {
      /**
       * @minLength 3
       * @maxLength 255
       * @pattern ^[a-zA-Z0-9.\-_]*$
       */
      Bucket: string;
      /**
       * @minLength 20
       * @maxLength 2048
       */
      RoleArn: string;
      /**
       * @minLength 1
       * @maxLength 255
       * @pattern ^[a-zA-Z0-9!_.*'()/{}:-]*/$
       */
      KeyPrefix?: string;
    };
  };
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern (^(?!_{2}))(^[a-zA-Z0-9_]+$)
   */
  ChannelName?: string;
  Id?: string;
  RetentionPeriod?: {
    /**
     * @minimum 1
     * @maximum 2147483647
     */
    NumberOfDays?: number;
    Unlimited?: boolean;
  };
  /**
   * @minItems 1
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
