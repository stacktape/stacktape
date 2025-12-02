// This file is auto-generated. Do not edit manually.
// Source: aws-synthetics-group.json

/** Resource Type definition for AWS::Synthetics::Group */
export type AwsSyntheticsGroup = {
  /**
   * Name of the group.
   * @pattern ^[0-9a-z_\-]{1,64}$
   */
  Name: string;
  /** Id of the group. */
  Id?: string;
  /**
   * @minItems 0
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)([a-zA-Z\d\s_.:/=+\-@]+)$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     * @pattern ^([a-zA-Z\d\s_.:/=+\-@]*)$
     */
    Value: string;
  }[];
  /**
   * @maxItems 10
   * @uniqueItems true
   */
  ResourceArns?: string[];
};
