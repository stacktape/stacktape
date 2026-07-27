// This file is auto-generated. Do not edit manually.
// Source: aws-appconfig-environment.json

/** Resource Type definition for AWS::AppConfig::Environment */
export type AwsAppconfigEnvironment = {
  /**
   * The environment ID.
   * @pattern [a-z0-9]{4,7}
   */
  EnvironmentId?: string;
  /**
   * A description of the environment.
   * @minLength 0
   * @maxLength 1024
   */
  Description?: string;
  /**
   * Amazon CloudWatch alarms to monitor during the deployment process.
   * @minItems 0
   * @maxItems 5
   */
  Monitors?: {
    /**
     * Amazon Resource Name (ARN) of the Amazon CloudWatch alarm.
     * @minLength 1
     * @maxLength 2048
     */
    AlarmArn: string;
    /**
     * ARN of an AWS Identity and Access Management (IAM) role for AWS AppConfig to monitor AlarmArn.
     * @minLength 20
     * @maxLength 2048
     */
    AlarmRoleArn?: string;
  }[];
  /**
   * On resource deletion this controls whether the Deletion Protection check should be applied,
   * bypassed, or (the default) whether the behavior should be controlled by the account-level Deletion
   * Protection setting. See
   * https://docs.aws.amazon.com/appconfig/latest/userguide/deletion-protection.html
   * @enum ["ACCOUNT_DEFAULT","APPLY","BYPASS"]
   */
  DeletionProtectionCheck?: "ACCOUNT_DEFAULT" | "APPLY" | "BYPASS";
  /**
   * The application ID.
   * @pattern [a-z0-9]{4,7}
   */
  ApplicationId: string;
  /**
   * Metadata to assign to the environment. Tags help organize and categorize your AWS AppConfig
   * resources. Each tag consists of a key and an optional value, both of which you define.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The tag value can be up to 256 characters.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
    /**
     * The key-value string map. The valid character set is [a-zA-Z1-9+-=._:/]. The tag key can be up to
     * 128 characters and must not start with aws:.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
  /**
   * A name for the environment.
   * @minLength 1
   * @maxLength 64
   */
  Name: string;
};
