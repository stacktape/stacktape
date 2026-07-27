// This file is auto-generated. Do not edit manually.
// Source: aws-organizations-organizationalunit.json

/**
 * You can use organizational units (OUs) to group accounts together to administer as a single unit.
 * This greatly simplifies the management of your accounts. For example, you can attach a policy-based
 * control to an OU, and all accounts within the OU automatically inherit the policy. You can create
 * multiple OUs within a single organization, and you can create OUs within other OUs. Each OU can
 * contain multiple accounts, and you can move accounts from one OU to another. However, OU names must
 * be unique within a parent OU or root.
 */
export type AwsOrganizationsOrganizationalunit = {
  /**
   * The Amazon Resource Name (ARN) of this OU.
   * @pattern ^arn:aws.*:organizations::\d{12}:ou/o-[a-z0-9]{10,32}/ou-[0-9a-z]{4,32}-[0-9a-z]{8,32}
   */
  Arn?: string;
  /**
   * The unique identifier (ID) associated with this OU.
   * @maxLength 68
   * @pattern ^ou-[0-9a-z]{4,32}-[a-z0-9]{8,32}$
   */
  Id?: string;
  /**
   * The friendly name of this OU.
   * @minLength 1
   * @maxLength 128
   * @pattern [\s\S]*
   */
  Name: string;
  /**
   * The unique identifier (ID) of the parent root or OU that you want to create the new OU in.
   * @maxLength 100
   * @pattern ^(r-[0-9a-z]{4,32})|(ou-[0-9a-z]{4,32}-[a-z0-9]{8,32})$
   */
  ParentId: string;
  /**
   * A list of tags that you want to attach to the newly created OU.
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
