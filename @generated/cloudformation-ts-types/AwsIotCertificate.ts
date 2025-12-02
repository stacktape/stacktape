// This file is auto-generated. Do not edit manually.
// Source: aws-iot-certificate.json

/** Use the AWS::IoT::Certificate resource to declare an AWS IoT X.509 certificate. */
export type AwsIotCertificate = {
  /**
   * @minLength 1
   * @maxLength 65536
   */
  CACertificatePem?: string;
  /**
   * @minLength 1
   * @maxLength 65536
   */
  CertificatePem?: string;
  CertificateSigningRequest?: string;
  /** @enum ["DEFAULT","SNI_ONLY"] */
  CertificateMode?: "DEFAULT" | "SNI_ONLY";
  /** @enum ["ACTIVE","INACTIVE","REVOKED","PENDING_TRANSFER","PENDING_ACTIVATION"] */
  Status: "ACTIVE" | "INACTIVE" | "REVOKED" | "PENDING_TRANSFER" | "PENDING_ACTIVATION";
  Id?: string;
  Arn?: string;
};
