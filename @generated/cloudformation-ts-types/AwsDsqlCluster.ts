// This file is auto-generated. Do not edit manually.
// Source: aws-dsql-cluster.json

/** Resource Type definition for AWS::DSQL::Cluster */
export type AwsDsqlCluster = {
  /** Whether deletion protection is enabled in this cluster. */
  DeletionProtectionEnabled?: boolean;
  /** @uniqueItems false */
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
     * The value for the tag. You can specify a value that is 1 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /** The Amazon Resource Name (ARN) for the cluster. */
  ResourceArn?: string;
  /** The ID of the created cluster. */
  Identifier?: string;
  /** The time of when the cluster was created in ISO-8601 format. */
  CreationTime?: string;
  /** The status of the cluster. */
  Status?: string;
  /** The VPC endpoint service name. */
  VpcEndpointServiceName?: string;
  /** The Multi-region properties associated to this cluster. */
  MultiRegionProperties?: {
    /** The witness region in a multi-region cluster. */
    WitnessRegion?: string;
    /** @uniqueItems true */
    Clusters?: string[];
  };
  /** The KMS key that encrypts data on the cluster. */
  KmsEncryptionKey?: string;
  /** The encryption configuration details for the cluster. */
  EncryptionDetails?: {
    /** The status of encryption for the cluster. */
    EncryptionStatus?: string;
    /** The type of encryption that protects data in the cluster. */
    EncryptionType?: string;
    /** The Amazon Resource Name (ARN) of the KMS key that encrypts data in the cluster. */
    KmsKeyArn?: string;
  };
  /** The DSQL cluster endpoint. */
  Endpoint?: string;
  /** The version number of the cluster's resource based policy */
  PolicyVersion?: string;
  /** The IAM policy applied to the cluster resource. */
  PolicyDocument?: string;
};
