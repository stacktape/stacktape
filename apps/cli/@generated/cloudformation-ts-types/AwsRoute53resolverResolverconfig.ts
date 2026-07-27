// This file is auto-generated. Do not edit manually.
// Source: aws-route53resolver-resolverconfig.json

/** Resource schema for AWS::Route53Resolver::ResolverConfig. */
export type AwsRoute53resolverResolverconfig = {
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
  ResourceId: string;
  /**
   * ResolverAutodefinedReverseStatus, possible values are ENABLING, ENABLED, DISABLING AND DISABLED.
   * @enum ["ENABLING","ENABLED","DISABLING","DISABLED"]
   */
  AutodefinedReverse?: "ENABLING" | "ENABLED" | "DISABLING" | "DISABLED";
  /**
   * Represents the desired status of AutodefinedReverse. The only supported value on creation is
   * DISABLE. Deletion of this resource will return AutodefinedReverse to its default value (ENABLED).
   * @enum ["DISABLE"]
   */
  AutodefinedReverseFlag: "DISABLE";
};
