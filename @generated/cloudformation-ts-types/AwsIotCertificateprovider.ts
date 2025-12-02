// This file is auto-generated. Do not edit manually.
// Source: aws-iot-certificateprovider.json

/** Use the AWS::IoT::CertificateProvider resource to declare an AWS IoT Certificate Provider. */
export type AwsIotCertificateprovider = {
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [\w=,@-]+
   */
  CertificateProviderName?: string;
  /**
   * @minLength 1
   * @maxLength 170
   */
  LambdaFunctionArn: string;
  /**
   * @minItems 1
   * @maxItems 1
   * @uniqueItems true
   */
  AccountDefaultForOperations: "CreateCertificateFromCsr"[];
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
  Arn?: string;
};
