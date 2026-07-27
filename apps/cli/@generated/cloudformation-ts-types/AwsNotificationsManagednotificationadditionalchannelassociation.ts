// This file is auto-generated. Do not edit manually.
// Source: aws-notifications-managednotificationadditionalchannelassociation.json

/** Resource Type definition for AWS::Notifications::ManagedNotificationAdditionalChannelAssociation */
export type AwsNotificationsManagednotificationadditionalchannelassociation = {
  /**
   * ARN identifier of the channel.
   * Example: arn:aws:chatbot::123456789012:chat-configuration/slack-channel/security-ops
   * @pattern ^arn:aws:(chatbot|consoleapp|notifications-contacts):[a-zA-Z0-9-]*:[0-9]{12}:[a-zA-Z0-9-_.@]+/[a-zA-Z0-9/_.@:-]+$
   */
  ChannelArn: string;
  /**
   * ARN identifier of the Managed Notification.
   * Example:
   * arn:aws:notifications::381491923782:managed-notification-configuration/category/AWS-Health/sub-category/Billing
   * @pattern ^arn:[-.a-z0-9]{1,63}:notifications::[0-9]{12}:managed-notification-configuration/category/[a-zA-Z0-9-]{3,64}/sub-category/[a-zA-Z0-9-]{3,64}$
   */
  ManagedNotificationConfigurationArn: string;
};
