// This file is auto-generated. Do not edit manually.
// Source: aws-smsvoice-senderid.json

/** Resource Type definition for AWS::SMSVOICE::SenderId */
export type AwsSmsvoiceSenderid = {
  /** The Amazon Resource Name (ARN) associated with the SenderId. */
  Arn?: string;
  /**
   * The two-character code, in ISO 3166-1 alpha-2 format, for the country or region.
   * @pattern ^[A-Z]{2}$
   */
  IsoCountryCode: string;
  /**
   * The sender ID string to request.
   * @pattern ^[A-Z0-9_-]+$
   */
  SenderId: string;
  /** When set to true the sender ID can't be deleted. By default this is set to false. */
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
