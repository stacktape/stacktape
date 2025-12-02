// This file is auto-generated. Do not edit manually.
// Source: aws-iot-accountauditconfiguration.json

/**
 * Configures the Device Defender audit settings for this account. Settings include how audit
 * notifications are sent and which audit checks are enabled or disabled.
 */
export type AwsIotAccountauditconfiguration = {
  /**
   * Your 12-digit account ID (used as the primary identifier for the CloudFormation resource).
   * @minLength 12
   * @maxLength 12
   */
  AccountId: string;
  AuditCheckConfigurations: {
    AuthenticatedCognitoRoleOverlyPermissiveCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    CaCertificateExpiringCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    CaCertificateKeyQualityCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    ConflictingClientIdsCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    DeviceCertificateExpiringCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
      Configuration?: {
        CertExpirationThresholdInDays?: string;
      };
    };
    DeviceCertificateKeyQualityCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    DeviceCertificateSharedCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    IotPolicyOverlyPermissiveCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    IotRoleAliasAllowsAccessToUnusedServicesCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    IotRoleAliasOverlyPermissiveCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    LoggingDisabledCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    RevokedCaCertificateStillActiveCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    RevokedDeviceCertificateStillActiveCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    UnauthenticatedCognitoRoleOverlyPermissiveCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    IntermediateCaRevokedForActiveDeviceCertificatesCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    IoTPolicyPotentialMisConfigurationCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
    };
    DeviceCertificateAgeCheck?: {
      /** True if the check is enabled. */
      Enabled?: boolean;
      Configuration?: {
        CertAgeThresholdInDays?: string;
      };
    };
  };
  AuditNotificationTargetConfigurations?: {
    Sns?: {
      /**
       * The ARN of the target (SNS topic) to which audit notifications are sent.
       * @maxLength 2048
       */
      TargetArn?: string;
      /**
       * The ARN of the role that grants permission to send notifications to the target.
       * @minLength 20
       * @maxLength 2048
       */
      RoleArn?: string;
      /** True if notifications to the target are enabled. */
      Enabled?: boolean;
    };
  };
  /**
   * The ARN of the role that grants permission to AWS IoT to access information about your devices,
   * policies, certificates and other items as required when performing an audit.
   * @minLength 20
   * @maxLength 2048
   */
  RoleArn: string;
};
