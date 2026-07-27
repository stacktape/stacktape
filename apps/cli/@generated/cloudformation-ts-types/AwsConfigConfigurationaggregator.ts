// This file is auto-generated. Do not edit manually.
// Source: aws-config-configurationaggregator.json

/** Resource Type definition for AWS::Config::ConfigurationAggregator */
export type AwsConfigConfigurationaggregator = {
  /** @uniqueItems false */
  AccountAggregationSources?: {
    AllAwsRegions?: boolean;
    /** @uniqueItems false */
    AwsRegions?: string[];
    /** @uniqueItems false */
    AccountIds: string[];
  }[];
  /**
   * The name of the aggregator.
   * @minLength 1
   * @maxLength 256
   * @pattern [\w\-]+
   */
  ConfigurationAggregatorName?: string;
  /** The Amazon Resource Name (ARN) of the aggregator. */
  ConfigurationAggregatorArn?: string;
  OrganizationAggregationSource?: {
    AllAwsRegions?: boolean;
    /** @uniqueItems false */
    AwsRegions?: string[];
    RoleArn: string;
  };
  /**
   * The tags for the configuration aggregator.
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
