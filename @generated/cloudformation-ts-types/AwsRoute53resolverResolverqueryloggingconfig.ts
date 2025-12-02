// This file is auto-generated. Do not edit manually.
// Source: aws-route53resolver-resolverqueryloggingconfig.json

/** Resource schema for AWS::Route53Resolver::ResolverQueryLoggingConfig. */
export type AwsRoute53resolverResolverqueryloggingconfig = {
  /**
   * ResourceId
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
   * ResolverQueryLogConfigStatus, possible values are CREATING, CREATED, DELETED AND FAILED.
   * @enum ["CREATING","CREATED","DELETING","FAILED"]
   */
  Status?: "CREATING" | "CREATED" | "DELETING" | "FAILED";
  /**
   * ShareStatus, possible values are NOT_SHARED, SHARED_WITH_ME, SHARED_BY_ME.
   * @enum ["NOT_SHARED","SHARED_WITH_ME","SHARED_BY_ME"]
   */
  ShareStatus?: "NOT_SHARED" | "SHARED_WITH_ME" | "SHARED_BY_ME";
  /** Count */
  AssociationCount?: number;
  /**
   * Arn
   * @minLength 1
   * @maxLength 600
   */
  Arn?: string;
  /**
   * ResolverQueryLogConfigName
   * @minLength 1
   * @maxLength 64
   * @pattern (?!^[0-9]+$)([a-zA-Z0-9\-_' ']+)
   */
  Name?: string;
  /**
   * The id of the creator request.
   * @minLength 1
   * @maxLength 255
   */
  CreatorRequestId?: string;
  /**
   * destination arn
   * @minLength 1
   * @maxLength 600
   */
  DestinationArn?: string;
  /**
   * Rfc3339TimeString
   * @minLength 20
   * @maxLength 40
   */
  CreationTime?: string;
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
