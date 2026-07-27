// This file is auto-generated. Do not edit manually.
// Source: aws-connect-emailaddress.json

/** Resource Type definition for AWS::Connect::EmailAddress */
export type AwsConnectEmailaddress = {
  /**
   * The identifier of the Amazon Connect instance.
   * @minLength 1
   * @maxLength 250
   * @pattern ^arn:(aws|aws-us-gov):connect:[a-z]{2}-[a-z]+-[0-9]{1}:[0-9]{1,20}:instance/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$
   */
  InstanceArn: string;
  /**
   * The identifier of the email address.
   * @pattern ^arn:(aws|aws-us-gov):connect:[a-z]{2}-[a-z]+-[0-9]{1}:[0-9]{1,20}:instance/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/email-address/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$
   */
  EmailAddressArn?: string;
  /**
   * A description for the email address.
   * @minLength 1
   * @maxLength 250
   * @pattern (^[\S].*[\S]$)|(^[\S]$)
   */
  Description?: string;
  /**
   * Email address to be created for this instance
   * @minLength 1
   * @maxLength 255
   * @pattern ([^\s@]+@[^\s@]+\.[^\s@]+)
   */
  EmailAddress: string;
  /**
   * The display name for the email address.
   * @minLength 0
   * @maxLength 256
   * @pattern (^[\S].*[\S]$)|(^[\S]$)
   */
  DisplayName?: string;
  /**
   * List of alias configurations for the email address
   * @maxItems 1
   */
  AliasConfigurations?: {
    /**
     * The identifier of the email address alias
     * @pattern ^arn:(aws|aws-us-gov):connect:[a-z]{2}-[a-z]+-[0-9]{1}:[0-9]{1,20}:instance/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/email-address/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$
     */
    EmailAddressArn: string;
  }[];
  /**
   * One or more tags.
   * @maxItems 50
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
     * @maxLength 256
     */
    Value: string;
  }[];
};
