// This file is auto-generated. Do not edit manually.
// Source: aws-supportapp-slackchannelconfiguration.json

/** An AWS Support App resource that creates, updates, lists and deletes Slack channel configurations. */
export type AwsSupportappSlackchannelconfiguration = {
  /**
   * The team ID in Slack, which uniquely identifies a workspace.
   * @minLength 1
   * @maxLength 256
   * @pattern ^\S+$
   */
  TeamId: string;
  /**
   * The channel ID in Slack, which identifies a channel within a workspace.
   * @minLength 1
   * @maxLength 256
   * @pattern ^\S+$
   */
  ChannelId: string;
  /**
   * The channel name in Slack.
   * @minLength 1
   * @maxLength 256
   * @pattern ^.+$
   */
  ChannelName?: string;
  /** Whether to notify when a case is created or reopened. */
  NotifyOnCreateOrReopenCase?: boolean;
  /** Whether to notify when a correspondence is added to a case. */
  NotifyOnAddCorrespondenceToCase?: boolean;
  /** Whether to notify when a case is resolved. */
  NotifyOnResolveCase?: boolean;
  /**
   * The severity level of a support case that a customer wants to get notified for.
   * @enum ["none","all","high"]
   */
  NotifyOnCaseSeverity: "none" | "all" | "high";
  /**
   * The Amazon Resource Name (ARN) of an IAM role that grants the AWS Support App access to perform
   * operations for AWS services.
   * @minLength 31
   * @maxLength 2048
   * @pattern ^arn:aws[-a-z0-9]*:iam::[0-9]{12}:role\/(.+)$
   */
  ChannelRoleArn: string;
};
