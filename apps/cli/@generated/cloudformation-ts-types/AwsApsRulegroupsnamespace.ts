// This file is auto-generated. Do not edit manually.
// Source: aws-aps-rulegroupsnamespace.json

/** RuleGroupsNamespace schema for cloudformation. */
export type AwsApsRulegroupsnamespace = {
  /**
   * Required to identify a specific APS Workspace associated with this RuleGroupsNamespace.
   * @pattern ^arn:(aws|aws-us-gov|aws-cn):aps:[a-z0-9-]+:[0-9]+:workspace/[a-zA-Z0-9-]+$
   */
  Workspace: string;
  /**
   * The RuleGroupsNamespace name.
   * @minLength 1
   * @maxLength 64
   */
  Name: string;
  /** The RuleGroupsNamespace data. */
  Data: string;
  /**
   * The RuleGroupsNamespace ARN.
   * @pattern ^arn:(aws|aws-us-gov|aws-cn):aps:[a-z0-9-]+:[0-9]+:rulegroupsnamespace/[a-zA-Z0-9-]+/[0-9A-Za-z][-.0-9A-Z_a-z]*$
   */
  Arn?: string;
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
