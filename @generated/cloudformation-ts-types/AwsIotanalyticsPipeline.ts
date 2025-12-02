// This file is auto-generated. Do not edit manually.
// Source: aws-iotanalytics-pipeline.json

/** Resource Type definition for AWS::IoTAnalytics::Pipeline */
export type AwsIotanalyticsPipeline = {
  Id?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9_]+
   */
  PipelineName?: string;
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
  /**
   * @minItems 1
   * @maxItems 25
   * @uniqueItems false
   */
  PipelineActivities: {
    SelectAttributes?: {
      /**
       * @minLength 1
       * @maxLength 128
       */
      Next?: string;
      /**
       * @minItems 1
       * @maxItems 50
       * @uniqueItems false
       */
      Attributes: string[];
      /**
       * @minLength 1
       * @maxLength 128
       */
      Name: string;
    };
    Datastore?: {
      /**
       * @minLength 1
       * @maxLength 128
       * @pattern [a-zA-Z0-9_]+
       */
      DatastoreName: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Name: string;
    };
    Filter?: {
      /**
       * @minLength 1
       * @maxLength 256
       */
      Filter: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Next?: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Name: string;
    };
    AddAttributes?: {
      /**
       * @minLength 1
       * @maxLength 128
       */
      Next?: string;
      Attributes: Record<string, string>;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Name: string;
    };
    Channel?: {
      /**
       * @minLength 1
       * @maxLength 128
       * @pattern [a-zA-Z0-9_]+
       */
      ChannelName: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Next?: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Name: string;
    };
    DeviceShadowEnrich?: {
      /**
       * @minLength 1
       * @maxLength 256
       */
      Attribute: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Next?: string;
      /**
       * @minLength 1
       * @maxLength 256
       */
      ThingName: string;
      /**
       * @minLength 20
       * @maxLength 2048
       */
      RoleArn: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Name: string;
    };
    Math?: {
      /**
       * @minLength 1
       * @maxLength 256
       */
      Attribute: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Next?: string;
      /**
       * @minLength 1
       * @maxLength 256
       */
      Math: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Name: string;
    };
    Lambda?: {
      /**
       * @minimum 1
       * @maximum 1000
       */
      BatchSize: number;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Next?: string;
      /**
       * @minLength 1
       * @maxLength 64
       * @pattern [a-zA-Z0-9_-]+
       */
      LambdaName: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Name: string;
    };
    DeviceRegistryEnrich?: {
      /**
       * @minLength 1
       * @maxLength 256
       */
      Attribute: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Next?: string;
      /**
       * @minLength 1
       * @maxLength 256
       */
      ThingName: string;
      /**
       * @minLength 20
       * @maxLength 2048
       */
      RoleArn: string;
      /**
       * @minLength 1
       * @maxLength 128
       */
      Name: string;
    };
    RemoveAttributes?: {
      /**
       * @minLength 1
       * @maxLength 128
       */
      Next?: string;
      /**
       * @minItems 1
       * @maxItems 50
       * @uniqueItems false
       */
      Attributes: string[];
      /**
       * @minLength 1
       * @maxLength 128
       */
      Name: string;
    };
  }[];
};
