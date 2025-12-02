// This file is auto-generated. Do not edit manually.
// Source: aws-smsvoice-protectconfiguration.json

/** Resource Type definition for AWS::SMSVOICE::ProtectConfiguration */
export type AwsSmsvoiceProtectconfiguration = {
  /** The Amazon Resource Name (ARN) of the protect configuration. */
  Arn?: string;
  /** The unique identifier for the protect configuration. */
  ProtectConfigurationId?: string;
  /** An array of CountryRule containing the rules for the NumberCapability. */
  CountryRuleSet?: unknown | unknown | unknown;
  /**
   * When set to true deletion protection is enabled and protect configuration cannot be deleted. By
   * default this is set to false.
   */
  DeletionProtectionEnabled?: boolean;
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
