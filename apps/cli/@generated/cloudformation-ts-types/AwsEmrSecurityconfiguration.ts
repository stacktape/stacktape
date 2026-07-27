// This file is auto-generated. Do not edit manually.
// Source: aws-emr-securityconfiguration.json

/**
 * Use a SecurityConfiguration resource to configure data encryption, Kerberos authentication, and
 * Amazon S3 authorization for EMRFS.
 */
export type AwsEmrSecurityconfiguration = {
  /** The name of the security configuration. */
  Name?: string;
  /** The security configuration details in JSON format. */
  SecurityConfiguration: Record<string, unknown> | string;
};
