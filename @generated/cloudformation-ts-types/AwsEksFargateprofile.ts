// This file is auto-generated. Do not edit manually.
// Source: aws-eks-fargateprofile.json

/** Resource Schema for AWS::EKS::FargateProfile */
export type AwsEksFargateprofile = {
  /**
   * Name of the Cluster
   * @minLength 1
   */
  ClusterName: string;
  /**
   * Name of FargateProfile
   * @minLength 1
   */
  FargateProfileName?: string;
  /**
   * The IAM policy arn for pods
   * @minLength 1
   */
  PodExecutionRoleArn: string;
  Arn?: string;
  Subnets?: string[];
  /** @minItems 1 */
  Selectors: {
    /** @minLength 1 */
    Namespace: string;
    Labels?: {
      /**
       * The key name of the label.
       * @minLength 1
       * @maxLength 127
       */
      Key: string;
      /**
       * The value for the label.
       * @minLength 1
       * @maxLength 255
       */
      Value: string;
    }[];
  }[];
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
};
