// This file is auto-generated. Do not edit manually.
// Source: aws-lightsail-certificate.json

/** Resource Type definition for AWS::Lightsail::Certificate. */
export type AwsLightsailCertificate = {
  /** The name for the certificate. */
  CertificateName: string;
  /** The domain name (e.g., example.com ) for the certificate. */
  DomainName: string;
  /**
   * An array of strings that specify the alternate domains (e.g., example2.com) and subdomains (e.g.,
   * blog.example.com) for the certificate.
   * @uniqueItems true
   */
  SubjectAlternativeNames?: string[];
  CertificateArn?: string;
  /** The validation status of the certificate. */
  Status?: string;
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
    Value?: string;
  }[];
};
