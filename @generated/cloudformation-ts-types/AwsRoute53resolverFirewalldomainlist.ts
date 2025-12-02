// This file is auto-generated. Do not edit manually.
// Source: aws-route53resolver-firewalldomainlist.json

/** Resource schema for AWS::Route53Resolver::FirewallDomainList. */
export type AwsRoute53resolverFirewalldomainlist = {
  /**
   * ResourceId
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
   * FirewallDomainListName
   * @minLength 1
   * @maxLength 64
   * @pattern (?!^[0-9]+$)([a-zA-Z0-9\-_' ']+)
   */
  Name?: string;
  /**
   * Count
   * @minimum 0
   */
  DomainCount?: number;
  /**
   * ResolverFirewallDomainList, possible values are COMPLETE, DELETING, UPDATING,
   * COMPLETE_IMPORT_FAILED, IMPORTING, and INACTIVE_OWNER_ACCOUNT_CLOSED.
   * @enum ["COMPLETE","DELETING","UPDATING","COMPLETE_IMPORT_FAILED","IMPORTING","INACTIVE_OWNER_ACCOUNT_CLOSED"]
   */
  Status?: "COMPLETE" | "DELETING" | "UPDATING" | "COMPLETE_IMPORT_FAILED" | "IMPORTING" | "INACTIVE_OWNER_ACCOUNT_CLOSED";
  /** FirewallDomainListAssociationStatus */
  StatusMessage?: string;
  /**
   * ServicePrincipal
   * @minLength 1
   * @maxLength 512
   */
  ManagedOwnerName?: string;
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
  Domains?: string[];
  /**
   * S3 URL to import domains from.
   * @minLength 1
   * @maxLength 1024
   */
  DomainFileUrl?: string;
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
