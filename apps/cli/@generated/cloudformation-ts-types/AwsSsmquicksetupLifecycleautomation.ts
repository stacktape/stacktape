// This file is auto-generated. Do not edit manually.
// Source: aws-ssmquicksetup-lifecycleautomation.json

/**
 * Resource Type definition for AWS::SSMQuickSetup::LifecycleAutomation that executes SSM Automation
 * documents in response to CloudFormation lifecycle events.
 */
export type AwsSsmquicksetupLifecycleautomation = {
  /**
   * The name of the Automation document to execute
   * @minLength 1
   * @maxLength 500
   * @pattern ^\S+$
   */
  AutomationDocument: string;
  AutomationParameters: Record<string, string[]>;
  /**
   * A unique identifier used for generating a unique logical ID for the custom resource
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9-]+$
   */
  ResourceKey: string;
  /**
   * The id from the association that is returned when creating the association
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9-]+$
   */
  AssociationId?: string;
  Tags?: Record<string, string>;
};
