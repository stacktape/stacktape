// This file is auto-generated. Do not edit manually.
// Source: aws-config-aggregationauthorization.json

/** Resource Type definition for AWS::Config::AggregationAuthorization */
export type AwsConfigAggregationauthorization = {
  /**
   * The 12-digit account ID of the account authorized to aggregate data.
   * @pattern ^\d{12}$
   */
  AuthorizedAccountId: string;
  /**
   * The region authorized to collect aggregated data.
   * @minLength 1
   * @maxLength 64
   */
  AuthorizedAwsRegion: string;
  /** The ARN of the AggregationAuthorization. */
  AggregationAuthorizationArn?: string;
  /**
   * The tags for the AggregationAuthorization.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
