// This file is auto-generated. Do not edit manually.
// Source: aws-smsvoice-configurationset.json

/** Resource Type definition for AWS::SMSVOICE::ConfigurationSet */
export type AwsSmsvoiceConfigurationset = {
  Arn?: string;
  /**
   * The name to use for the configuration set.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[A-Za-z0-9_-]+$
   */
  ConfigurationSetName?: string;
  /**
   * The default sender ID to set for the ConfigurationSet.
   * @pattern ^[A-Za-z0-9_-]+$
   */
  DefaultSenderId?: string;
  /** Set to true to enable message feedback. */
  MessageFeedbackEnabled?: boolean;
  /**
   * The unique identifier for the protect configuration to be associated to the configuration set.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[A-Za-z0-9_:/-]+$
   */
  ProtectConfigurationId?: string;
  /**
   * An event destination is a location where you send message events.
   * @maxItems 5
   */
  EventDestinations?: (unknown | unknown | unknown)[];
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
