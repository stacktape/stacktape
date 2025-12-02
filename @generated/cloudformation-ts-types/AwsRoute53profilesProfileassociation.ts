// This file is auto-generated. Do not edit manually.
// Source: aws-route53profiles-profileassociation.json

/** Resource Type definition for AWS::Route53Profiles::ProfileAssociation */
export type AwsRoute53profilesProfileassociation = {
  /** The resource that you associated the  profile with. */
  ResourceId: string;
  /** The ID of the  profile that you associated with the resource that is specified by ResourceId. */
  ProfileId: string;
  /** Primary Identifier for  Profile Association */
  Id?: string;
  /** The name of an association between a  Profile and a VPC. */
  Name: string;
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
  /** The Amazon Resource Name (ARN) of the profile association. */
  Arn?: string;
};
