// This file is auto-generated. Do not edit manually.
// Source: aws-osis-pipeline.json

/** An OpenSearch Ingestion Service Data Prepper pipeline running Data Prepper. */
export type AwsOsisPipeline = {
  BufferOptions?: {
    /** Whether persistent buffering should be enabled. */
    PersistentBufferEnabled: boolean;
  };
  EncryptionAtRestOptions?: {
    /** The KMS key to use for encrypting data. By default an AWS owned key is used */
    KmsKeyArn: string;
  };
  LogPublishingOptions?: {
    /** Whether logs should be published. */
    IsLoggingEnabled?: boolean;
    /** The destination for OpenSearch Ingestion Service logs sent to Amazon CloudWatch. */
    CloudWatchLogDestination?: {
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern \/aws\/vendedlogs\/[\.\-_/#A-Za-z0-9]+
       */
      LogGroup: string;
    };
  };
  /**
   * The maximum pipeline capacity, in Ingestion OpenSearch Compute Units (OCUs).
   * @minimum 1
   * @maximum 384
   */
  MaxUnits: number;
  /**
   * The minimum pipeline capacity, in Ingestion OpenSearch Compute Units (OCUs).
   * @minimum 1
   * @maximum 384
   */
  MinUnits: number;
  /**
   * The Data Prepper pipeline configuration.
   * @minLength 1
   * @maxLength 100000
   */
  PipelineConfigurationBody: string;
  /**
   * Name of the OpenSearch Ingestion Service pipeline to create. Pipeline names are unique across the
   * pipelines owned by an account within an AWS Region.
   * @minLength 3
   * @maxLength 28
   * @pattern [a-z][a-z0-9\-]+
   */
  PipelineName: string;
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
  VpcOptions?: {
    /** A list of security groups associated with the VPC endpoint. */
    SecurityGroupIds?: string[];
    /** A list of subnet IDs associated with the VPC endpoint. */
    SubnetIds: string[];
    /**
     * Defines whether you or Amazon OpenSearch Ingestion service create and manage the VPC endpoint
     * configured for the pipeline.
     * @enum ["CUSTOMER","SERVICE"]
     */
    VpcEndpointManagement?: "CUSTOMER" | "SERVICE";
    /** Options for attaching a VPC to the pipeline. */
    VpcAttachmentOptions?: {
      /** Whether the pipeline should be attached to the provided VPC */
      AttachToVpc: boolean;
      /**
       * The CIDR block to be reserved for OpenSearch Ingestion to create elastic network interfaces (ENIs).
       * @pattern ^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/(3[0-2]|[12]?[0-9])$
       */
      CidrBlock: string;
    };
  };
  /** The VPC interface endpoints that have access to the pipeline. */
  VpcEndpoints?: ({
    /** The unique identifier of the endpoint. */
    VpcEndpointId?: string;
    /** The ID for your VPC. AWS Privatelink generates this value when you create a VPC. */
    VpcId?: string;
    VpcOptions?: {
      /** A list of security groups associated with the VPC endpoint. */
      SecurityGroupIds?: string[];
      /** A list of subnet IDs associated with the VPC endpoint. */
      SubnetIds: string[];
      /**
       * Defines whether you or Amazon OpenSearch Ingestion service create and manage the VPC endpoint
       * configured for the pipeline.
       * @enum ["CUSTOMER","SERVICE"]
       */
      VpcEndpointManagement?: "CUSTOMER" | "SERVICE";
      /** Options for attaching a VPC to the pipeline. */
      VpcAttachmentOptions?: {
        /** Whether the pipeline should be attached to the provided VPC */
        AttachToVpc: boolean;
        /**
         * The CIDR block to be reserved for OpenSearch Ingestion to create elastic network interfaces (ENIs).
         * @pattern ^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/(3[0-2]|[12]?[0-9])$
         */
        CidrBlock: string;
      };
    };
  })[];
  /**
   * The VPC endpoint service name for the pipeline.
   * @minLength 1
   * @maxLength 128
   */
  VpcEndpointService?: string;
  /**
   * The Amazon Resource Name (ARN) of the pipeline.
   * @minLength 46
   * @maxLength 78
   * @pattern ^arn:(aws|aws\-cn|aws\-us\-gov|aws\-iso|aws\-iso\-b):osis:.+:pipeline\/.+$
   */
  PipelineArn?: string;
  /**
   * The Pipeline Role (ARN) for the pipeline.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:(aws|aws\-cn|aws\-us\-gov|aws\-iso|aws\-iso\-b|aws\-iso\-e|aws\-iso\-f):iam::[0-9]+:role\/.*$
   */
  PipelineRoleArn?: string;
  /** A list of endpoints that can be used for ingesting data into a pipeline */
  IngestEndpointUrls?: string[];
  ResourcePolicy?: {
    Policy: Record<string, unknown>;
  };
};
