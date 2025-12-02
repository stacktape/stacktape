// This file is auto-generated. Do not edit manually.
// Source: aws-notifications-channelassociation.json

/** Resource Type definition for AWS::Notifications::ChannelAssociation */
export type AwsNotificationsChannelassociation = {
  /**
   * ARN identifier of the channel.
   * Example: arn:aws:chatbot::123456789012:chat-configuration/slack-channel/security-ops
   * @pattern ^arn:aws:(chatbot|consoleapp|notifications-contacts):[a-zA-Z0-9-]*:[0-9]{12}:[a-zA-Z0-9-_.@]+/[a-zA-Z0-9/_.@:-]+$
   */
  Arn: string;
  /**
   * ARN identifier of the NotificationConfiguration.
   * Example: arn:aws:notifications::123456789012:configuration/a01jes88qxwkbj05xv9c967pgm1
   * @pattern ^arn:aws:notifications::[0-9]{12}:configuration\/[a-z0-9]{27}$
   */
  NotificationConfigurationArn: string;
};
