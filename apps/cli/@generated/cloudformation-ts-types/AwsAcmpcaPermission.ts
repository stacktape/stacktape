// This file is auto-generated. Do not edit manually.
// Source: aws-acmpca-permission.json

/** Permission set on private certificate authority */
export type AwsAcmpcaPermission = {
  /**
   * The actions that the specified AWS service principal can use. Actions IssueCertificate,
   * GetCertificate and ListPermissions must be provided.
   */
  Actions: string[];
  /** The Amazon Resource Name (ARN) of the Private Certificate Authority that grants the permission. */
  CertificateAuthorityArn: string;
  /**
   * The AWS service or identity that receives the permission. At this time, the only valid principal is
   * acm.amazonaws.com.
   */
  Principal: string;
  /** The ID of the calling account. */
  SourceAccount?: string;
};
