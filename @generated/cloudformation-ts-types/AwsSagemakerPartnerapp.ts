// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-partnerapp.json

/** Resource Type definition for AWS::SageMaker::PartnerApp */
export type AwsSagemakerPartnerapp = {
  /**
   * The Amazon Resource Name (ARN) of the created PartnerApp.
   * @minLength 1
   * @maxLength 128
   * @pattern arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:partner-app/app-[A-Z0-9]{12}$
   */
  Arn?: string;
  /**
   * A name for the PartnerApp.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9]+
   */
  Name: string;
  /**
   * The type of PartnerApp.
   * @enum ["lakera-guard","comet","deepchecks-llm-evaluation","fiddler"]
   */
  Type: "lakera-guard" | "comet" | "deepchecks-llm-evaluation" | "fiddler";
  /**
   * The execution role for the user.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[a-z\-]*:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+$
   */
  ExecutionRoleArn: string;
  /**
   * The AWS KMS customer managed key used to encrypt the data associated with the PartnerApp.
   * @maxLength 2048
   * @pattern .*
   */
  KmsKeyId?: string;
  /**
   * The tier of the PartnerApp.
   * @minLength 1
   * @maxLength 64
   */
  Tier: string;
  /** Enables IAM Session based Identity for PartnerApp. */
  EnableIamSessionBasedIdentity?: boolean;
  /** Enables automatic minor version upgrades for the PartnerApp. */
  EnableAutoMinorVersionUpgrade?: boolean;
  /**
   * The version of the PartnerApp.
   * @minLength 1
   * @maxLength 64
   */
  AppVersion?: string;
  /** A collection of settings that specify the maintenance schedule for the PartnerApp. */
  ApplicationConfig?: {
    /**
     * A list of users with administrator privileges for the PartnerApp.
     * @minItems 0
     * @maxItems 5
     * @uniqueItems true
     */
    AdminUsers?: string[];
    /** A list of arguments to pass to the PartnerApp. */
    Arguments?: Record<string, string>;
  };
  /**
   * The Auth type of PartnerApp.
   * @enum ["IAM"]
   */
  AuthType: "IAM";
  /**
   * The AppServerUrl based on app and account-info.
   * @maxLength 2048
   */
  BaseUrl?: string;
  /** The end-of-life date for the current version of the PartnerApp. */
  CurrentVersionEolDate?: string;
  /** A collection of settings that specify the maintenance schedule for the PartnerApp. */
  MaintenanceConfig?: {
    /**
     * The maintenance window start day and time for the PartnerApp.
     * @maxLength 9
     * @pattern (Mon|Tue|Wed|Thu|Fri|Sat|Sun):([01]\d|2[0-3]):([0-5]\d)
     */
    MaintenanceWindowStart: string;
  };
  /**
   * The client token for the PartnerApp.
   * @minLength 1
   * @maxLength 36
   * @pattern ^[a-zA-Z0-9-]+$
   */
  ClientToken?: string;
  /**
   * A list of tags to apply to the PartnerApp.
   * @minItems 0
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Value: string;
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
};
