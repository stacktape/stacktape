// This file is auto-generated. Do not edit manually.
// Source: aws-transfer-certificate.json

/** Resource Type definition for AWS::Transfer::Certificate */
export type AwsTransferCertificate = {
  /**
   * Specifies the usage type for the certificate.
   * @enum ["SIGNING","ENCRYPTION","TLS"]
   */
  Usage: "SIGNING" | "ENCRYPTION" | "TLS";
  /**
   * Specifies the certificate body to be imported.
   * @minLength 1
   * @maxLength 16384
   * @pattern ^[\t\n\r\u0020-\u00FF]+$
   */
  Certificate: string;
  /**
   * Specifies the certificate chain to be imported.
   * @minLength 1
   * @maxLength 2097152
   * @pattern ^[\t\n\r\u0020-\u00FF]+$
   */
  CertificateChain?: string;
  /**
   * Specifies the private key for the certificate.
   * @minLength 1
   * @maxLength 16384
   * @pattern ^[\t\n\r\u0020-\u00FF]+$
   */
  PrivateKey?: string;
  /** Specifies the active date for the certificate. */
  ActiveDate?: string;
  /** Specifies the inactive date for the certificate. */
  InactiveDate?: string;
  /**
   * A textual description for the certificate.
   * @minLength 1
   * @maxLength 200
   * @pattern ^[\u0021-\u007E]+$
   */
  Description?: string;
  /**
   * Key-value pairs that can be used to group and search for certificates. Tags are metadata attached
   * to certificates for any purpose.
   * @maxItems 50
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
  /**
   * Specifies the unique Amazon Resource Name (ARN) for the agreement.
   * @minLength 20
   * @maxLength 1600
   * @pattern arn:.*
   */
  Arn?: string;
  /**
   * A unique identifier for the certificate.
   * @minLength 22
   * @maxLength 22
   * @pattern ^cert-([0-9a-f]{17})$
   */
  CertificateId?: string;
  /**
   * A status description for the certificate.
   * @enum ["ACTIVE","PENDING","INACTIVE"]
   */
  Status?: "ACTIVE" | "PENDING" | "INACTIVE";
  /**
   * Describing the type of certificate. With or without a private key.
   * @enum ["CERTIFICATE","CERTIFICATE_WITH_PRIVATE_KEY"]
   */
  Type?: "CERTIFICATE" | "CERTIFICATE_WITH_PRIVATE_KEY";
  /**
   * Specifies Certificate's serial.
   * @minLength 0
   * @maxLength 48
   * @pattern ^[0-9a-fA-F{}:?]*$
   */
  Serial?: string;
  /** Specifies the not before date for the certificate. */
  NotBeforeDate?: string;
  /** Specifies the not after date for the certificate. */
  NotAfterDate?: string;
};
