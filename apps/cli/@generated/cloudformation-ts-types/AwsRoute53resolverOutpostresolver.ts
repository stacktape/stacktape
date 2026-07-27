// This file is auto-generated. Do not edit manually.
// Source: aws-route53resolver-outpostresolver.json

/** Resource schema for AWS::Route53Resolver::OutpostResolver. */
export type AwsRoute53resolverOutpostresolver = {
  /**
   * Id
   * @minLength 1
   * @maxLength 64
   */
  Id?: string;
  /**
   * The id of the creator request.
   * @minLength 1
   * @maxLength 255
   */
  CreatorRequestId?: string;
  /**
   * The OutpostResolver name.
   * @minLength 1
   * @maxLength 255
   */
  Name: string;
  /**
   * The OutpostResolver ARN.
   * @minLength 1
   * @maxLength 1024
   */
  Arn?: string;
  /**
   * The Outpost ARN.
   * @minLength 1
   * @maxLength 1024
   */
  OutpostArn: string;
  /**
   * The OutpostResolver instance type.
   * @minLength 1
   * @maxLength 255
   */
  PreferredInstanceType: string;
  /**
   * The OutpostResolver status, possible values are CREATING, OPERATIONAL, UPDATING, DELETING,
   * ACTION_NEEDED, FAILED_CREATION and FAILED_DELETION.
   * @enum ["CREATING","OPERATIONAL","DELETING","UPDATING","ACTION_NEEDED","FAILED_CREATION","FAILED_DELETION"]
   */
  Status?: "CREATING" | "OPERATIONAL" | "DELETING" | "UPDATING" | "ACTION_NEEDED" | "FAILED_CREATION" | "FAILED_DELETION";
  /** The OutpostResolver status message. */
  StatusMessage?: string;
  /**
   * The number of OutpostResolvers.
   * @minimum 4
   * @maximum 256
   */
  InstanceCount?: number;
  /**
   * The OutpostResolver creation time
   * @minLength 20
   * @maxLength 40
   */
  CreationTime?: string;
  /**
   * The OutpostResolver last modified time
   * @minLength 20
   * @maxLength 40
   */
  ModificationTime?: string;
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
