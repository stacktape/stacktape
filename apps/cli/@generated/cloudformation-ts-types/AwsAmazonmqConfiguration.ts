// This file is auto-generated. Do not edit manually.
// Source: aws-amazonmq-configuration.json

/** Resource Type definition for AWS::AmazonMQ::Configuration */
export type AwsAmazonmqConfiguration = {
  /** The Amazon Resource Name (ARN) of the Amazon MQ configuration. */
  Arn?: string;
  /** The authentication strategy associated with the configuration. The default is SIMPLE. */
  AuthenticationStrategy?: string;
  /**
   * The type of broker engine. Note: Currently, Amazon MQ only supports ACTIVEMQ for creating and
   * editing broker configurations.
   */
  EngineType: string;
  /** The version of the broker engine. */
  EngineVersion?: string;
  /** The base64-encoded XML configuration. */
  Data?: string;
  /** The description of the configuration. */
  Description?: string;
  /** The ID of the Amazon MQ configuration. */
  Id?: string;
  /** The name of the configuration. */
  Name: string;
  /** The revision number of the configuration. */
  Revision?: string;
  /** Create tags when creating the configuration. */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
