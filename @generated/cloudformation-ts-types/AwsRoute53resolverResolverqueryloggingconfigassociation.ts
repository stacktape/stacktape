// This file is auto-generated. Do not edit manually.
// Source: aws-route53resolver-resolverqueryloggingconfigassociation.json

/** Resource schema for AWS::Route53Resolver::ResolverQueryLoggingConfigAssociation. */
export type AwsRoute53resolverResolverqueryloggingconfigassociation = {
  /**
   * Id
   * @minLength 1
   * @maxLength 64
   */
  Id?: string;
  /**
   * ResolverQueryLogConfigId
   * @minLength 1
   * @maxLength 64
   */
  ResolverQueryLogConfigId?: string;
  /**
   * ResourceId
   * @minLength 1
   * @maxLength 64
   */
  ResourceId?: string;
  /**
   * ResolverQueryLogConfigAssociationStatus
   * @enum ["CREATING","ACTIVE","ACTION_NEEDED","DELETING","FAILED","OVERRIDDEN"]
   */
  Status?: "CREATING" | "ACTIVE" | "ACTION_NEEDED" | "DELETING" | "FAILED" | "OVERRIDDEN";
  /**
   * ResolverQueryLogConfigAssociationError
   * @enum ["NONE","DESTINATION_NOT_FOUND","ACCESS_DENIED"]
   */
  Error?: "NONE" | "DESTINATION_NOT_FOUND" | "ACCESS_DENIED";
  /** ResolverQueryLogConfigAssociationErrorMessage */
  ErrorMessage?: string;
  /**
   * Rfc3339TimeString
   * @minLength 20
   * @maxLength 40
   */
  CreationTime?: string;
};
