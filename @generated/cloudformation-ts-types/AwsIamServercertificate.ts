// This file is auto-generated. Do not edit manually.
// Source: aws-iam-servercertificate.json

/** Resource Type definition for AWS::IAM::ServerCertificate */
export type AwsIamServercertificate = {
  /**
   * @minLength 1
   * @maxLength 16384
   * @pattern [\u0009\u000A\u000D\u0020-\u00FF]+
   */
  CertificateBody?: string;
  /**
   * @minLength 1
   * @maxLength 2097152
   * @pattern [\u0009\u000A\u000D\u0020-\u00FF]+
   */
  CertificateChain?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [\w+=,.@-]+
   */
  ServerCertificateName?: string;
  /**
   * @minLength 1
   * @maxLength 512
   * @pattern (\u002F)|(\u002F[\u0021-\u007F]+\u002F)
   */
  Path?: string;
  /**
   * @minLength 1
   * @maxLength 16384
   * @pattern [\u0009\u000A\u000D\u0020-\u00FF]+
   */
  PrivateKey?: string;
  /**
   * Amazon Resource Name (ARN) of the server certificate
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
};
