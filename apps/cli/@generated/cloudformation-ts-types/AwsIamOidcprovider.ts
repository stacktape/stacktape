// This file is auto-generated. Do not edit manually.
// Source: aws-iam-oidcprovider.json

/** Resource Type definition for AWS::IAM::OIDCProvider */
export type AwsIamOidcprovider = {
  ClientIdList?: string[];
  /**
   * @minLength 1
   * @maxLength 255
   */
  Url?: string;
  /** @maxItems 5 */
  ThumbprintList?: string[];
  /**
   * Amazon Resource Name (ARN) of the OIDC provider
   * @minLength 20
   * @maxLength 2048
   */
  Arn?: string;
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
