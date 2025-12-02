// This file is auto-generated. Do not edit manually.
// Source: aws-chatbot-microsoftteamschannelconfiguration.json

/** Resource schema for AWS::Chatbot::MicrosoftTeamsChannelConfiguration. */
export type AwsChatbotMicrosoftteamschannelconfiguration = {
  /**
   * The id of the Microsoft Teams team
   * @minLength 36
   * @maxLength 36
   * @pattern ^[0-9A-Fa-f]{8}(?:-[0-9A-Fa-f]{4}){3}-[0-9A-Fa-f]{12}$
   */
  TeamId: string;
  /**
   * The id of the Microsoft Teams channel
   * @minLength 1
   * @maxLength 256
   * @pattern ^([a-zA-Z0-9-_=+/.,])*%3[aA]([a-zA-Z0-9-_=+/.,])*%40([a-zA-Z0-9-_=+/.,])*$
   */
  TeamsChannelId: string;
  /**
   * The name of the Microsoft Teams channel
   * @minLength 1
   * @maxLength 256
   * @pattern ^(.*)$
   */
  TeamsChannelName?: string;
  /**
   * The id of the Microsoft Teams tenant
   * @minLength 36
   * @maxLength 36
   * @pattern ^[0-9A-Fa-f]{8}(?:-[0-9A-Fa-f]{4}){3}-[0-9A-Fa-f]{12}$
   */
  TeamsTenantId: string;
  /**
   * The name of the configuration
   * @minLength 1
   * @maxLength 128
   * @pattern ^[A-Za-z0-9-_]+$
   */
  ConfigurationName: string;
  /**
   * The ARN of the IAM role that defines the permissions for AWS Chatbot
   * @pattern ^arn:(aws[a-zA-Z-]*)?:[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}$
   */
  IamRoleArn: string;
  /**
   * ARNs of SNS topics which delivers notifications to AWS Chatbot, for example CloudWatch alarm
   * notifications.
   */
  SnsTopicArns?: string[];
  /**
   * Specifies the logging level for this configuration:ERROR,INFO or NONE. This property affects the
   * log entries pushed to Amazon CloudWatch logs
   * @default "NONE"
   * @pattern ^(ERROR|INFO|NONE)$
   */
  LoggingLevel?: string;
  /**
   * Amazon Resource Name (ARN) of the configuration
   * @pattern ^arn:(aws[a-zA-Z-]*)?:chatbot:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}$
   */
  Arn?: string;
  /**
   * The list of IAM policy ARNs that are applied as channel guardrails. The AWS managed
   * 'AdministratorAccess' policy is applied as a default if this is not set.
   */
  GuardrailPolicies?: string[];
  /**
   * Enables use of a user role requirement in your chat configuration
   * @default false
   */
  UserRoleRequired?: boolean;
  /**
   * The tags to add to the configuration
   * @uniqueItems false
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
  /** ARNs of Custom Actions to associate with notifications in the provided chat channel. */
  CustomizationResourceArns?: string[];
};
