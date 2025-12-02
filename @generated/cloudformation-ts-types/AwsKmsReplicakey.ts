// This file is auto-generated. Do not edit manually.
// Source: aws-kms-replicakey.json

/**
 * The AWS::KMS::ReplicaKey resource specifies a multi-region replica AWS KMS key in AWS Key
 * Management Service (AWS KMS).
 */
export type AwsKmsReplicakey = {
  /**
   * A description of the AWS KMS key. Use a description that helps you to distinguish this AWS KMS key
   * from others in the account, such as its intended use.
   * @minLength 0
   * @maxLength 8192
   */
  Description?: string;
  /**
   * Specifies the number of days in the waiting period before AWS KMS deletes an AWS KMS key that has
   * been removed from a CloudFormation stack. Enter a value between 7 and 30 days. The default value is
   * 30 days.
   * @minimum 7
   * @maximum 30
   */
  PendingWindowInDays?: number;
  /**
   * The key policy that authorizes use of the AWS KMS key. The key policy must observe the following
   * rules.
   */
  KeyPolicy: Record<string, unknown> | string;
  /**
   * Identifies the primary AWS KMS key to create a replica of. Specify the Amazon Resource Name (ARN)
   * of the AWS KMS key. You cannot specify an alias or key ID. For help finding the ARN, see Finding
   * the Key ID and ARN in the AWS Key Management Service Developer Guide.
   * @minLength 1
   * @maxLength 256
   */
  PrimaryKeyArn: string;
  /**
   * Specifies whether the AWS KMS key is enabled. Disabled AWS KMS keys cannot be used in cryptographic
   * operations.
   */
  Enabled?: boolean;
  KeyId?: string;
  Arn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
};
