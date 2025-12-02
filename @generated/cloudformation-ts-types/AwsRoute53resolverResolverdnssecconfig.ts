// This file is auto-generated. Do not edit manually.
// Source: aws-route53resolver-resolverdnssecconfig.json

/** Resource schema for AWS::Route53Resolver::ResolverDNSSECConfig. */
export type AwsRoute53resolverResolverdnssecconfig = {
  /**
   * Id
   * @minLength 1
   * @maxLength 64
   */
  Id?: string;
  /**
   * AccountId
   * @minLength 12
   * @maxLength 32
   */
  OwnerId?: string;
  /**
   * ResourceId
   * @minLength 1
   * @maxLength 64
   */
  ResourceId?: string;
  /**
   * ResolverDNSSECValidationStatus, possible values are ENABLING, ENABLED, DISABLING AND DISABLED.
   * @enum ["ENABLING","ENABLED","DISABLING","DISABLED"]
   */
  ValidationStatus?: "ENABLING" | "ENABLED" | "DISABLING" | "DISABLED";
};
