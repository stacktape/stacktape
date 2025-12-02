// This file is auto-generated. Do not edit manually.
// Source: aws-evidently-segment.json

/** Resource Type definition for AWS::Evidently::Segment */
export type AwsEvidentlySegment = {
  /**
   * @minLength 0
   * @maxLength 2048
   * @pattern arn:[^:]*:[^:]*:[^:]*:[^:]*:segment/[-a-zA-Z0-9._]*
   */
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 127
   * @pattern [-a-zA-Z0-9._]*
   */
  Name: string;
  /**
   * @minLength 0
   * @maxLength 160
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 1024
   */
  Pattern?: string;
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
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
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
