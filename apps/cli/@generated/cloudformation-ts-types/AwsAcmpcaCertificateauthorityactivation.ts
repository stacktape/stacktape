// This file is auto-generated. Do not edit manually.
// Source: aws-acmpca-certificateauthorityactivation.json

/** Used to install the certificate authority certificate and update the certificate authority status. */
export type AwsAcmpcaCertificateauthorityactivation = {
  /** Arn of the Certificate Authority. */
  CertificateAuthorityArn: string;
  /** Certificate Authority certificate that will be installed in the Certificate Authority. */
  Certificate: string;
  /** Certificate chain for the Certificate Authority certificate. */
  CertificateChain?: string;
  /** The status of the Certificate Authority. */
  Status?: string;
  /** The complete certificate chain, including the Certificate Authority certificate. */
  CompleteCertificateChain?: string;
};
