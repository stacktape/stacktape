// This file is auto-generated. Do not edit manually.
// Source: aws-dms-instanceprofile.json

/** Resource schema for AWS::DMS::InstanceProfile. */
export type AwsDmsInstanceprofile = {
  /**
   * The property describes an ARN of the instance profile.
   * @minLength 1
   * @maxLength 255
   */
  InstanceProfileArn?: string;
  /**
   * The property describes an identifier for the instance profile. It is used for
   * describing/deleting/modifying. Can be name/arn
   * @minLength 1
   * @maxLength 255
   */
  InstanceProfileIdentifier?: string;
  /**
   * The property describes an availability zone of the instance profile.
   * @minLength 1
   * @maxLength 255
   */
  AvailabilityZone?: string;
  /**
   * The optional description of the instance profile.
   * @minLength 1
   * @maxLength 255
   */
  Description?: string;
  /**
   * The property describes kms key arn for the instance profile.
   * @minLength 1
   * @maxLength 255
   */
  KmsKeyArn?: string;
  /**
   * The property describes the publicly accessible of the instance profile
   * @default false
   */
  PubliclyAccessible?: boolean;
  /**
   * The property describes a network type for the instance profile.
   * @enum ["IPV4","DUAL"]
   */
  NetworkType?: "IPV4" | "DUAL";
  /**
   * The property describes a name for the instance profile.
   * @minLength 1
   * @maxLength 255
   */
  InstanceProfileName?: string;
  /**
   * The property describes a creating time of the instance profile.
   * @minLength 1
   * @maxLength 40
   */
  InstanceProfileCreationTime?: string;
  /**
   * The property describes a subnet group identifier for the instance profile.
   * @minLength 1
   * @maxLength 255
   */
  SubnetGroupIdentifier?: string;
  /**
   * The property describes vps security groups for the instance profile.
   * @uniqueItems true
   */
  VpcSecurityGroups?: string[];
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
};
