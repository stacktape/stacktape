// This file is auto-generated. Do not edit manually.
// Source: aws-iam-virtualmfadevice.json

/** Resource Type definition for AWS::IAM::VirtualMFADevice */
export type AwsIamVirtualmfadevice = {
  /**
   * @minLength 1
   * @maxLength 226
   * @pattern [\w+=,.@-]+
   */
  VirtualMfaDeviceName?: string;
  /**
   * @minLength 1
   * @maxLength 512
   * @pattern (\u002F)|(\u002F[\u0021-\u007F]+\u002F)
   */
  Path?: string;
  /**
   * @minLength 9
   * @maxLength 256
   * @pattern [\w+=/:,.@-]+
   */
  SerialNumber?: string;
  /** @uniqueItems false */
  Users: string[];
  /** @uniqueItems false */
  Tags?: {
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
};
