// This file is auto-generated. Do not edit manually.
// Source: aws-iot-encryptionconfiguration.json

/** Resource Type definition for AWS::IoT::EncryptionConfiguration */
export type AwsIotEncryptionconfiguration = {
  AccountId?: string;
  /** @enum ["CUSTOMER_MANAGED_KMS_KEY","AWS_OWNED_KMS_KEY"] */
  EncryptionType: "CUSTOMER_MANAGED_KMS_KEY" | "AWS_OWNED_KMS_KEY";
  /**
   * @minLength 20
   * @maxLength 2048
   */
  KmsAccessRoleArn?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   */
  KmsKeyArn?: string;
  ConfigurationDetails?: {
    /** @enum ["HEALTHY","UNHEALTHY"] */
    ConfigurationStatus?: "HEALTHY" | "UNHEALTHY";
    ErrorCode?: string;
    ErrorMessage?: string;
  };
  LastModifiedDate?: string;
};
