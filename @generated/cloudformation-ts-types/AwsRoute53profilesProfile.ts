// This file is auto-generated. Do not edit manually.
// Source: aws-route53profiles-profile.json

/** Resource Type definition for AWS::Route53Profiles::Profile */
export type AwsRoute53profilesProfile = {
  /**
   * The name of the profile.
   * @minLength 1
   * @maxLength 64
   */
  Name: string;
  /**
   * The id of the creator request
   * @minLength 1
   * @maxLength 64
   */
  ClientToken?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems false
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
  /** The Amazon Resource Name (ARN) of the resolver profile. */
  Arn?: string;
  /** The ID of the profile. */
  Id?: string;
};
