// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-verifiedaccessinstance.json

/** The AWS::EC2::VerifiedAccessInstance resource creates an AWS EC2 Verified Access Instance. */
export type AwsEc2Verifiedaccessinstance = {
  /** The ID of the AWS Verified Access instance. */
  VerifiedAccessInstanceId?: string;
  /**
   * AWS Verified Access trust providers.
   * @uniqueItems true
   */
  VerifiedAccessTrustProviders?: {
    /** The ID of the trust provider. */
    VerifiedAccessTrustProviderId?: string;
    /** The description of trust provider. */
    Description?: string;
    /** The type of trust provider (user- or device-based). */
    TrustProviderType?: string;
    /** The type of user-based trust provider. */
    UserTrustProviderType?: string;
    /** The type of device-based trust provider. */
    DeviceTrustProviderType?: string;
  }[];
  /**
   * The IDs of the AWS Verified Access trust providers.
   * @uniqueItems true
   */
  VerifiedAccessTrustProviderIds?: string[];
  /** Time this Verified Access Instance was created. */
  CreationTime?: string;
  /** Time this Verified Access Instance was last updated. */
  LastUpdatedTime?: string;
  /** A description for the AWS Verified Access instance. */
  Description?: string;
  /** The configuration options for AWS Verified Access instances. */
  LoggingConfigurations?: {
    /** Select log version for Verified Access logs. */
    LogVersion?: string;
    /** Include claims from trust providers in Verified Access logs. */
    IncludeTrustContext?: boolean;
    /** Sends Verified Access logs to CloudWatch Logs. */
    CloudWatchLogs?: {
      /** Indicates whether logging is enabled. */
      Enabled?: boolean;
      /** The ID of the CloudWatch Logs log group. */
      LogGroup?: string;
    };
    /** Sends Verified Access logs to Kinesis. */
    KinesisDataFirehose?: {
      /** Indicates whether logging is enabled. */
      Enabled?: boolean;
      /** The ID of the delivery stream. */
      DeliveryStream?: string;
    };
    /** Sends Verified Access logs to Amazon S3. */
    S3?: {
      /** Indicates whether logging is enabled. */
      Enabled?: boolean;
      /** The bucket name. */
      BucketName?: string;
      /** The ID of the AWS account that owns the Amazon S3 bucket. */
      BucketOwner?: string;
      /** The bucket prefix. */
      Prefix?: string;
    };
  };
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
  /** Indicates whether FIPS is enabled */
  FipsEnabled?: boolean;
  /** Introduce CidrEndpointsCustomSubDomain property to represent the domain (say, ava.my-company.com) */
  CidrEndpointsCustomSubDomain?: string;
  /**
   * Property to represent the name servers assoicated with the domain that AVA manages (say,
   * ['ns1.amazonaws.com', 'ns2.amazonaws.com', 'ns3.amazonaws.com', 'ns4.amazonaws.com']).
   */
  CidrEndpointsCustomSubDomainNameServers?: string[];
};
