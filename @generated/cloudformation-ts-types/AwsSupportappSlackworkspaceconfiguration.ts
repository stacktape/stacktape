// This file is auto-generated. Do not edit manually.
// Source: aws-supportapp-slackworkspaceconfiguration.json

/**
 * An AWS Support App resource that creates, updates, lists, and deletes Slack workspace
 * configurations.
 */
export type AwsSupportappSlackworkspaceconfiguration = {
  /**
   * The team ID in Slack, which uniquely identifies a workspace.
   * @minLength 1
   * @maxLength 256
   * @pattern ^\S+$
   */
  TeamId: string;
  /**
   * An identifier used to update an existing Slack workspace configuration in AWS CloudFormation.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[0-9]+$
   */
  VersionId?: string;
};
