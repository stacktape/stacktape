// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-verifiedaccessgroup.json

/** The AWS::EC2::VerifiedAccessGroup resource creates an AWS EC2 Verified Access Group. */
export type AwsEc2Verifiedaccessgroup = {
  /** The ID of the AWS Verified Access group. */
  VerifiedAccessGroupId?: string;
  /** The ID of the AWS Verified Access instance. */
  VerifiedAccessInstanceId: string;
  /** The ARN of the Verified Access group. */
  VerifiedAccessGroupArn?: string;
  /** The AWS account number that owns the group. */
  Owner?: string;
  /** Time this Verified Access Group was created. */
  CreationTime?: string;
  /** Time this Verified Access Group was last updated. */
  LastUpdatedTime?: string;
  /** A description for the AWS Verified Access group. */
  Description?: string;
  /** The AWS Verified Access policy document. */
  PolicyDocument?: string;
  /** The status of the Verified Access policy. */
  PolicyEnabled?: boolean;
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
  /** The configuration options for customer provided KMS encryption. */
  SseSpecification?: {
    /** KMS Key Arn used to encrypt the group policy */
    KmsKeyArn?: string;
    /** Whether to encrypt the policy with the provided key or disable encryption */
    CustomerManagedKeyEnabled?: boolean;
  };
};
