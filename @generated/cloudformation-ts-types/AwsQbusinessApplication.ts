// This file is auto-generated. Do not edit manually.
// Source: aws-qbusiness-application.json

/** Definition of AWS::QBusiness::Application Resource Type */
export type AwsQbusinessApplication = {
  /**
   * @minLength 0
   * @maxLength 1284
   * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
   */
  ApplicationArn?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9-]{35}$
   */
  ApplicationId?: string;
  AttachmentsConfiguration?: {
    AttachmentsControlMode: "ENABLED" | "DISABLED";
  };
  AutoSubscriptionConfiguration?: {
    AutoSubscribe: "ENABLED" | "DISABLED";
    DefaultSubscriptionType?: "Q_LITE" | "Q_BUSINESS";
  };
  ClientIdsForOIDC?: string[];
  CreatedAt?: string;
  /**
   * @minLength 0
   * @maxLength 1000
   * @pattern ^[\s\S]*$
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 1000
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9_-]*$
   */
  DisplayName: string;
  EncryptionConfiguration?: {
    /**
     * @minLength 1
     * @maxLength 2048
     */
    KmsKeyId?: string;
  };
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws:iam::\d{12}:(oidc-provider|saml-provider)/[a-zA-Z0-9_\.\/@\-]+$
   */
  IamIdentityProviderArn?: string;
  /**
   * @minLength 10
   * @maxLength 1224
   * @pattern ^arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso::\d{12}:application/(sso)?ins-[a-zA-Z0-9-.]{16}/apl-[a-zA-Z0-9]{16}$
   */
  IdentityCenterApplicationArn?: string;
  /**
   * @minLength 10
   * @maxLength 1224
   * @pattern ^arn:(aws|aws-us-gov|aws-cn|aws-iso|aws-iso-b):sso:::instance/(sso)?ins-[a-zA-Z0-9-.]{16}$
   */
  IdentityCenterInstanceArn?: string;
  IdentityType?: "AWS_IAM_IDP_SAML" | "AWS_IAM_IDP_OIDC" | "AWS_IAM_IDC" | "AWS_QUICKSIGHT_IDP" | "ANONYMOUS";
  PersonalizationConfiguration?: {
    PersonalizationControlMode: "ENABLED" | "DISABLED";
  };
  QAppsConfiguration?: {
    QAppsControlMode: "ENABLED" | "DISABLED";
  };
  QuickSightConfiguration?: {
    /**
     * @minLength 1
     * @maxLength 64
     * @pattern ^[a-zA-Z0-9._-]*$
     */
    ClientNamespace: string;
  };
  /**
   * @minLength 0
   * @maxLength 1284
   * @pattern ^arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}$
   */
  RoleArn?: string;
  Status?: "CREATING" | "ACTIVE" | "DELETING" | "FAILED" | "UPDATING";
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  UpdatedAt?: string;
};
