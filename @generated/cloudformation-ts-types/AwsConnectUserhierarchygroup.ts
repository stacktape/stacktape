// This file is auto-generated. Do not edit manually.
// Source: aws-connect-userhierarchygroup.json

/** Resource Type definition for AWS::Connect::UserHierarchyGroup */
export type AwsConnectUserhierarchygroup = {
  /**
   * The identifier of the Amazon Connect instance.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /** The Amazon Resource Name (ARN) for the user hierarchy group. */
  UserHierarchyGroupArn?: string;
  /** The Amazon Resource Name (ARN) for the parent user hierarchy group. */
  ParentGroupArn?: string;
  /**
   * The name of the user hierarchy group.
   * @minLength 1
   * @maxLength 100
   */
  Name: string;
  /**
   * One or more tags.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is maximum of 256 Unicode characters in length
     * and cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     */
    Value: string;
  }[];
};
