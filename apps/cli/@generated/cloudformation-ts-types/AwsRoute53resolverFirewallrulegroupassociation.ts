// This file is auto-generated. Do not edit manually.
// Source: aws-route53resolver-firewallrulegroupassociation.json

/** Resource schema for AWS::Route53Resolver::FirewallRuleGroupAssociation. */
export type AwsRoute53resolverFirewallrulegroupassociation = {
  /**
   * Id
   * @minLength 1
   * @maxLength 64
   */
  Id?: string;
  /**
   * Arn
   * @minLength 1
   * @maxLength 600
   */
  Arn?: string;
  /**
   * FirewallRuleGroupId
   * @minLength 1
   * @maxLength 64
   */
  FirewallRuleGroupId: string;
  /**
   * VpcId
   * @minLength 1
   * @maxLength 64
   */
  VpcId: string;
  /**
   * FirewallRuleGroupAssociationName
   * @minLength 0
   * @maxLength 64
   * @pattern (?!^[0-9]+$)([a-zA-Z0-9\-_' ']+)
   */
  Name?: string;
  /** Priority */
  Priority: number;
  /**
   * MutationProtectionStatus
   * @enum ["ENABLED","DISABLED"]
   */
  MutationProtection?: "ENABLED" | "DISABLED";
  /**
   * ServicePrincipal
   * @minLength 1
   * @maxLength 512
   */
  ManagedOwnerName?: string;
  /**
   * ResolverFirewallRuleGroupAssociation, possible values are COMPLETE, DELETING, UPDATING, and
   * INACTIVE_OWNER_ACCOUNT_CLOSED.
   * @enum ["COMPLETE","DELETING","UPDATING","INACTIVE_OWNER_ACCOUNT_CLOSED"]
   */
  Status?: "COMPLETE" | "DELETING" | "UPDATING" | "INACTIVE_OWNER_ACCOUNT_CLOSED";
  /** FirewallDomainListAssociationStatus */
  StatusMessage?: string;
  /**
   * The id of the creator request.
   * @minLength 1
   * @maxLength 255
   */
  CreatorRequestId?: string;
  /**
   * Rfc3339TimeString
   * @minLength 20
   * @maxLength 40
   */
  CreationTime?: string;
  /**
   * Rfc3339TimeString
   * @minLength 20
   * @maxLength 40
   */
  ModificationTime?: string;
  /**
   * Tags
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
     * @minLength 0
     * @maxLength 255
     */
    Value: string;
  }[];
};
