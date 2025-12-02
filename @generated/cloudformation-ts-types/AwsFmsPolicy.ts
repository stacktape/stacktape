// This file is auto-generated. Do not edit manually.
// Source: aws-fms-policy.json

/** Creates an AWS Firewall Manager policy. */
export type AwsFmsPolicy = {
  ExcludeMap?: {
    ACCOUNT?: string[];
    ORGUNIT?: string[];
  };
  ExcludeResourceTags: boolean;
  IncludeMap?: {
    ACCOUNT?: string[];
    ORGUNIT?: string[];
  };
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-z0-9A-Z-]{36}$
   */
  Id?: string;
  /**
   * @minLength 1
   * @maxLength 1024
   * @pattern ^([a-zA-Z0-9_.:/=+\-@\s]+)$
   */
  PolicyName: string;
  /**
   * @maxLength 256
   * @pattern ^([a-zA-Z0-9_.:/=+\-@\s]+)$
   */
  PolicyDescription?: string;
  RemediationEnabled: boolean;
  /** @maxItems 8 */
  ResourceTags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /** @maxLength 256 */
    Value?: string;
  }[];
  /** @enum ["AND","OR"] */
  ResourceTagLogicalOperator?: "AND" | "OR";
  ResourceType?: string;
  ResourceTypeList?: string[];
  /** @uniqueItems true */
  ResourceSetIds?: string[];
  SecurityServicePolicyData: {
    ManagedServiceData?: string;
    Type: "WAF" | "WAFV2" | "SHIELD_ADVANCED" | "SECURITY_GROUPS_COMMON" | "SECURITY_GROUPS_CONTENT_AUDIT" | "SECURITY_GROUPS_USAGE_AUDIT" | "NETWORK_FIREWALL" | "THIRD_PARTY_FIREWALL" | "DNS_FIREWALL" | "IMPORT_NETWORK_FIREWALL" | "NETWORK_ACL_COMMON";
    PolicyOption?: unknown | unknown | unknown;
  };
  Arn?: string;
  DeleteAllPolicyResources?: boolean;
  ResourcesCleanUp?: boolean;
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^([^\s]*)$
     */
    Key: string;
    /**
     * @maxLength 256
     * @pattern ^([^\s]*)$
     */
    Value: string;
  }[];
};
