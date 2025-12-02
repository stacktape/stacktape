// This file is auto-generated. Do not edit manually.
// Source: aws-detective-graph.json

/** Resource schema for AWS::Detective::Graph */
export type AwsDetectiveGraph = {
  /** The Detective graph ARN */
  Arn?: string;
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. Valid characters are Unicode letters, digits, white space, and any of
     * the following symbols: _ . : / = + - @
     * @minLength 1
     * @maxLength 128
     */
    Key?: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. Valid characters are Unicode letters, digits, white space, and any of
     * the following symbols: _ . : / = + - @
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
  /**
   * Indicates whether to automatically enable new organization accounts as member accounts in the
   * organization behavior graph.
   * @default false
   */
  AutoEnableMembers?: boolean;
};
