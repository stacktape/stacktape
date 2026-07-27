// This file is auto-generated. Do not edit manually.
// Source: aws-kafkaconnect-workerconfiguration.json

/** The configuration of the workers, which are the processes that run the connector logic. */
export type AwsKafkaconnectWorkerconfiguration = {
  /**
   * The name of the worker configuration.
   * @minLength 1
   * @maxLength 128
   */
  Name: string;
  /**
   * A summary description of the worker configuration.
   * @maxLength 1024
   */
  Description?: string;
  /**
   * The Amazon Resource Name (ARN) of the custom configuration.
   * @pattern arn:(aws|aws-us-gov|aws-cn):kafkaconnect:.*
   */
  WorkerConfigurationArn?: string;
  /** Base64 encoded contents of connect-distributed.properties file. */
  PropertiesFileContent: string;
  /** The description of a revision of the worker configuration. */
  Revision?: number;
  /**
   * A collection of tags associated with a resource
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /** @maxLength 256 */
    Value: string;
  }[];
};
