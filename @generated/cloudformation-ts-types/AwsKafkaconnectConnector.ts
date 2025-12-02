// This file is auto-generated. Do not edit manually.
// Source: aws-kafkaconnect-connector.json

/** Resource Type definition for AWS::KafkaConnect::Connector */
export type AwsKafkaconnectConnector = {
  Capacity: unknown | unknown;
  /**
   * Amazon Resource Name for the created Connector.
   * @pattern arn:(aws|aws-us-gov|aws-cn):kafkaconnect:.*
   */
  ConnectorArn?: string;
  /** The configuration for the connector. */
  ConnectorConfiguration: Record<string, string>;
  /**
   * A summary description of the connector.
   * @maxLength 1024
   */
  ConnectorDescription?: string;
  /**
   * The name of the connector.
   * @minLength 1
   * @maxLength 128
   */
  ConnectorName: string;
  KafkaCluster: {
    ApacheKafkaCluster: {
      /** The bootstrap servers string of the Apache Kafka cluster. */
      BootstrapServers: string;
      Vpc: {
        /**
         * The AWS security groups to associate with the elastic network interfaces in order to specify what
         * the connector has access to.
         * @uniqueItems true
         */
        SecurityGroups: string[];
        /**
         * The list of subnets to connect to in the virtual private cloud (VPC). AWS creates elastic network
         * interfaces inside these subnets.
         * @minItems 1
         * @uniqueItems true
         */
        Subnets: string[];
      };
    };
  };
  KafkaClusterClientAuthentication: {
    AuthenticationType: "NONE" | "IAM";
  };
  KafkaClusterEncryptionInTransit: {
    EncryptionType: "PLAINTEXT" | "TLS";
  };
  /**
   * The version of Kafka Connect. It has to be compatible with both the Kafka cluster's version and the
   * plugins.
   */
  KafkaConnectVersion: string;
  LogDelivery?: {
    WorkerLogDelivery: {
      CloudWatchLogs?: {
        /** Specifies whether the logs get sent to the specified CloudWatch Logs destination. */
        Enabled: boolean;
        /** The CloudWatch log group that is the destination for log delivery. */
        LogGroup?: string;
      };
      Firehose?: {
        /** The Kinesis Data Firehose delivery stream that is the destination for log delivery. */
        DeliveryStream?: string;
        /** Specifies whether the logs get sent to the specified Kinesis Data Firehose delivery stream. */
        Enabled: boolean;
      };
      S3?: {
        /** The name of the S3 bucket that is the destination for log delivery. */
        Bucket?: string;
        /** Specifies whether the logs get sent to the specified Amazon S3 destination. */
        Enabled: boolean;
        /** The S3 prefix that is the destination for log delivery. */
        Prefix?: string;
      };
    };
  };
  /**
   * List of plugins to use with the connector.
   * @minItems 1
   * @uniqueItems true
   */
  Plugins: {
    CustomPlugin: {
      /**
       * The Amazon Resource Name (ARN) of the custom plugin to use.
       * @pattern arn:(aws|aws-us-gov|aws-cn):kafkaconnect:.*
       */
      CustomPluginArn: string;
      /**
       * The revision of the custom plugin to use.
       * @minimum 1
       */
      Revision: number;
    };
  }[];
  /**
   * The Amazon Resource Name (ARN) of the IAM role used by the connector to access Amazon S3 objects
   * and other external resources.
   * @pattern arn:(aws|aws-us-gov|aws-cn):iam:.*
   */
  ServiceExecutionRoleArn: string;
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
  WorkerConfiguration?: {
    /**
     * The revision of the worker configuration to use.
     * @minimum 1
     */
    Revision: number;
    /**
     * The Amazon Resource Name (ARN) of the worker configuration to use.
     * @pattern arn:(aws|aws-us-gov|aws-cn):kafkaconnect:.*
     */
    WorkerConfigurationArn: string;
  };
};
