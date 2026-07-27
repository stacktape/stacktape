// This file is auto-generated. Do not edit manually.
// Source: aws-imagebuilder-infrastructureconfiguration.json

/** Resource schema for AWS::ImageBuilder::InfrastructureConfiguration */
export type AwsImagebuilderInfrastructureconfiguration = {
  /** The Amazon Resource Name (ARN) of the infrastructure configuration. */
  Arn?: string;
  /** The name of the infrastructure configuration. */
  Name: string;
  /** The description of the infrastructure configuration. */
  Description?: string;
  /** The instance types of the infrastructure configuration. */
  InstanceTypes?: string[];
  /** The security group IDs of the infrastructure configuration. */
  SecurityGroupIds?: string[];
  /** The logging configuration of the infrastructure configuration. */
  Logging?: {
    S3Logs?: {
      /** S3BucketName */
      S3BucketName?: string;
      /** S3KeyPrefix */
      S3KeyPrefix?: string;
    };
  };
  /** The subnet ID of the infrastructure configuration. */
  SubnetId?: string;
  /** The EC2 key pair of the infrastructure configuration.. */
  KeyPair?: string;
  /** The terminate instance on failure configuration of the infrastructure configuration. */
  TerminateInstanceOnFailure?: boolean;
  /** The instance profile of the infrastructure configuration. */
  InstanceProfileName: string;
  /** The instance metadata option settings for the infrastructure configuration. */
  InstanceMetadataOptions?: {
    /** Limit the number of hops that an instance metadata request can traverse to reach its destination. */
    HttpPutResponseHopLimit?: number;
    /**
     * Indicates whether a signed token header is required for instance metadata retrieval requests. The
     * values affect the response as follows:
     * @enum ["required","optional"]
     */
    HttpTokens?: "required" | "optional";
  };
  /** The SNS Topic Amazon Resource Name (ARN) of the infrastructure configuration. */
  SnsTopicArn?: string;
  /** The tags attached to the resource created by Image Builder. */
  ResourceTags?: Record<string, string>;
  /** The tags associated with the component. */
  Tags?: Record<string, string>;
  /** The placement option settings for the infrastructure configuration. */
  Placement?: {
    /** AvailabilityZone */
    AvailabilityZone?: string;
    /**
     * Tenancy
     * @enum ["default","dedicated","host"]
     */
    Tenancy?: "default" | "dedicated" | "host";
    /** HostId */
    HostId?: string;
    /** HostResourceGroupArn */
    HostResourceGroupArn?: string;
  };
};
