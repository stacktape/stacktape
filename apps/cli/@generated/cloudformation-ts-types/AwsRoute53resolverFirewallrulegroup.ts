// This file is auto-generated. Do not edit manually.
// Source: aws-route53resolver-firewallrulegroup.json

/** Resource schema for AWS::Route53Resolver::FirewallRuleGroup. */
export type AwsRoute53resolverFirewallrulegroup = {
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
   * FirewallRuleGroupName
   * @minLength 1
   * @maxLength 64
   * @pattern (?!^[0-9]+$)([a-zA-Z0-9\-_' ']+)
   */
  Name?: string;
  /** Count */
  RuleCount?: number;
  /**
   * ResolverFirewallRuleGroupAssociation, possible values are COMPLETE, DELETING, UPDATING, and
   * INACTIVE_OWNER_ACCOUNT_CLOSED.
   * @enum ["COMPLETE","DELETING","UPDATING","INACTIVE_OWNER_ACCOUNT_CLOSED"]
   */
  Status?: "COMPLETE" | "DELETING" | "UPDATING" | "INACTIVE_OWNER_ACCOUNT_CLOSED";
  /** FirewallRuleGroupStatus */
  StatusMessage?: string;
  /**
   * AccountId
   * @minLength 12
   * @maxLength 32
   */
  OwnerId?: string;
  /**
   * ShareStatus, possible values are NOT_SHARED, SHARED_WITH_ME, SHARED_BY_ME.
   * @enum ["NOT_SHARED","SHARED_WITH_ME","SHARED_BY_ME"]
   */
  ShareStatus?: "NOT_SHARED" | "SHARED_WITH_ME" | "SHARED_BY_ME";
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
   * FirewallRules
   * @uniqueItems true
   */
  FirewallRules?: ({
    /**
     * ResourceId
     * @minLength 1
     * @maxLength 64
     */
    FirewallDomainListId?: string;
    /**
     * ResourceId
     * @minLength 1
     * @maxLength 64
     */
    FirewallThreatProtectionId?: string;
    /** Rule Priority */
    Priority: number;
    /**
     * Rule Action
     * @enum ["ALLOW","BLOCK","ALERT"]
     */
    Action: "ALLOW" | "BLOCK" | "ALERT";
    /**
     * BlockResponse
     * @enum ["NODATA","NXDOMAIN","OVERRIDE"]
     */
    BlockResponse?: "NODATA" | "NXDOMAIN" | "OVERRIDE";
    /**
     * BlockOverrideDomain
     * @minLength 1
     * @maxLength 255
     */
    BlockOverrideDomain?: string;
    /**
     * BlockOverrideDnsType
     * @enum ["CNAME"]
     */
    BlockOverrideDnsType?: "CNAME";
    /**
     * BlockOverrideTtl
     * @minimum 0
     * @maximum 604800
     */
    BlockOverrideTtl?: number;
    /**
     * Qtype
     * @minLength 1
     * @maxLength 16
     */
    Qtype?: string;
    /**
     * FirewallDomainRedirectionAction
     * @enum ["LOW","MEDIUM","HIGH"]
     */
    ConfidenceThreshold?: "LOW" | "MEDIUM" | "HIGH";
    /**
     * FirewallDomainRedirectionAction
     * @enum ["DGA","DNS_TUNNELING","DICTIONARY_DGA"]
     */
    DnsThreatProtection?: "DGA" | "DNS_TUNNELING" | "DICTIONARY_DGA";
    /**
     * FirewallDomainRedirectionAction
     * @enum ["INSPECT_REDIRECTION_DOMAIN","TRUST_REDIRECTION_DOMAIN"]
     */
    FirewallDomainRedirectionAction?: "INSPECT_REDIRECTION_DOMAIN" | "TRUST_REDIRECTION_DOMAIN";
  })[];
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
