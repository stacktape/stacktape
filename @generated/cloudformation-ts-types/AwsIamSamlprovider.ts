// This file is auto-generated. Do not edit manually.
// Source: aws-iam-samlprovider.json

/** Resource Type definition for AWS::IAM::SAMLProvider */
export type AwsIamSamlprovider = {
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [\w._-]+
   */
  Name?: string;
  /**
   * @minLength 1000
   * @maxLength 10000000
   */
  SamlMetadataDocument?: string;
  /**
   * Amazon Resource Name (ARN) of the SAML provider
   * @minLength 1
   * @maxLength 1600
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
  /**
   * The encryption setting for the SAML provider
   * @enum ["Allowed","Required"]
   */
  AssertionEncryptionMode?: "Allowed" | "Required";
  /**
   * The private key from your external identity provider
   * @minLength 1
   * @maxLength 16384
   * @pattern [\u0009\u000A\u000D\u0020-\u00FF]+
   */
  AddPrivateKey?: string;
  /**
   * The Key ID of the private key to remove
   * @minLength 22
   * @maxLength 64
   * @pattern [A-Z0-9]+
   */
  RemovePrivateKey?: string;
  /** @maxItems 2 */
  PrivateKeyList?: {
    /**
     * The unique identifier for the SAML private key.
     * @minLength 22
     * @maxLength 64
     * @pattern [A-Z0-9]+
     */
    KeyId: string;
    /**
     * The date and time, in <a href=\"http://www.iso.org/iso/iso8601\">ISO 8601 date-time </a> format,
     * when the private key was uploaded.
     */
    Timestamp: string;
  }[];
  /**
   * The unique identifier assigned to the SAML provider
   * @minLength 22
   * @maxLength 64
   * @pattern [A-Z0-9]+
   */
  SamlProviderUUID?: string;
};
