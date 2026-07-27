// This file is auto-generated. Do not edit manually.
// Source: aws-iot-cacertificate.json

/** Registers a CA Certificate in IoT. */
export type AwsIotCacertificate = {
  /**
   * @minLength 1
   * @maxLength 65536
   * @pattern [\s\S]*
   */
  CACertificatePem: string;
  /**
   * The private key verification certificate.
   * @minLength 1
   * @maxLength 65536
   * @pattern [\s\S]*
   */
  VerificationCertificatePem?: string;
  /** @enum ["ACTIVE","INACTIVE"] */
  Status: "ACTIVE" | "INACTIVE";
  /** @enum ["DEFAULT","SNI_ONLY"] */
  CertificateMode?: "DEFAULT" | "SNI_ONLY";
  /** @enum ["ENABLE","DISABLE"] */
  AutoRegistrationStatus?: "ENABLE" | "DISABLE";
  RemoveAutoRegistration?: boolean;
  RegistrationConfig?: {
    /**
     * @minLength 0
     * @maxLength 10240
     * @pattern [\s\S]*
     */
    TemplateBody?: string;
    /**
     * @minLength 20
     * @maxLength 2048
     * @pattern arn:(aws[a-zA-Z-]*)?:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+
     */
    RoleArn?: string;
    /**
     * @minLength 1
     * @maxLength 36
     * @pattern ^[0-9A-Za-z_-]+$
     */
    TemplateName?: string;
  };
  Id?: string;
  Arn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
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
};
