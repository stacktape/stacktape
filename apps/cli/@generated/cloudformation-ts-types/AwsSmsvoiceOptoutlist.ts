// This file is auto-generated. Do not edit manually.
// Source: aws-smsvoice-optoutlist.json

/** Resource Type definition for AWS::SMSVOICE::OptOutList */
export type AwsSmsvoiceOptoutlist = {
  /** The Amazon Resource Name (ARN) for the OptOutList. */
  Arn?: string;
  /**
   * The name of the new OptOutList.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[A-Za-z0-9_-]+$
   */
  OptOutListName?: string;
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
