// This file is auto-generated. Do not edit manually.
// Source: aws-aiops-investigationgroup.json

/** Definition of AWS::AIOps::InvestigationGroup Resource Type */
export type AwsAiopsInvestigationgroup = {
  RoleArn?: string;
  Name: string;
  CreatedBy?: string;
  CreatedAt?: string;
  LastModifiedBy?: string;
  LastModifiedAt?: string;
  Arn?: string;
  /** The number of days to retain the investigation group */
  RetentionInDays?: number;
  EncryptionConfig?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    EncryptionConfigurationType?: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    KmsKeyId?: string;
  };
  /** Investigation Group policy */
  InvestigationGroupPolicy?: string;
  /** Flag to enable cloud trail history */
  IsCloudTrailEventHistoryEnabled?: boolean;
  /** @uniqueItems true */
  TagKeyBoundaries?: string[];
  /**
   * An array of key-value pairs of notification channels to apply to this resource.
   * @uniqueItems true
   */
  ChatbotNotificationChannels?: {
    /**
     * @minLength 20
     * @maxLength 2048
     */
    SNSTopicArn?: string;
    /** @uniqueItems true */
    ChatConfigurationArns?: string[];
  }[];
  /**
   * An array of cross account configurations.
   * @uniqueItems true
   */
  CrossAccountConfigurations?: {
    SourceRoleArn?: string;
  }[];
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
