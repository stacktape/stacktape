// This file is auto-generated. Do not edit manually.
// Source: aws-certificatemanager-certificate.json

/** Resource Type definition for AWS::CertificateManager::Certificate */
export type AwsCertificatemanagerCertificate = {
  CertificateAuthorityArn?: string;
  CertificateExport?: string;
  /** @uniqueItems true */
  DomainValidationOptions?: {
    DomainName: string;
    ValidationDomain?: string;
    HostedZoneId?: string;
  }[];
  CertificateTransparencyLoggingPreference?: string;
  DomainName: string;
  ValidationMethod?: string;
  /** @uniqueItems true */
  SubjectAlternativeNames?: string[];
  Id?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  KeyAlgorithm?: string;
};
