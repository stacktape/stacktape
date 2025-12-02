// This file is auto-generated. Do not edit manually.
// Source: aws-organizations-resourcepolicy.json

/**
 * You can use AWS::Organizations::ResourcePolicy to delegate policy management for AWS Organizations
 * to specified member accounts to perform policy actions that are by default available only to the
 * management account.
 */
export type AwsOrganizationsResourcepolicy = {
  /**
   * The unique identifier (ID) associated with this resource policy.
   * @maxLength 131
   * @pattern ^rp-[0-9a-zA-Z_]{4,128}$
   */
  Id?: string;
  /**
   * The Amazon Resource Name (ARN) of the resource policy.
   * @pattern ^arn:aws.*:organizations::\d{12}:resourcepolicy\/o-[a-z0-9]{10,32}\/rp-[0-9a-zA-Z_]{4,128}
   */
  Arn?: string;
  /**
   * The policy document. For AWS CloudFormation templates formatted in YAML, you can provide the policy
   * in JSON or YAML format. AWS CloudFormation always converts a YAML policy to JSON format before
   * submitting it.
   * @minLength 1
   * @maxLength 40000
   * @pattern [\s\S]*
   */
  Content: Record<string, unknown> | string;
  /**
   * A list of tags that you want to attach to the resource policy
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key identifier, or name, of the tag.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The string value that's associated with the key of the tag. You can set the value of a tag to an
     * empty string, but you can't set the value of a tag to null.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
