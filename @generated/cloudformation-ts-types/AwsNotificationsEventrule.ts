// This file is auto-generated. Do not edit manually.
// Source: aws-notifications-eventrule.json

/** Resource Type definition for AWS::Notifications::EventRule */
export type AwsNotificationsEventrule = {
  /** @pattern ^arn:aws:notifications::[0-9]{12}:configuration/[a-z0-9]{27}/rule/[a-z0-9]{27}$ */
  Arn?: string;
  CreationTime?: string;
  /**
   * @minLength 0
   * @maxLength 4096
   */
  EventPattern?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^([a-zA-Z0-9 \-\(\)])+$
   */
  EventType: string;
  ManagedRules?: string[];
  /** @pattern ^arn:aws:notifications::[0-9]{12}:configuration/[a-z0-9]{27}$ */
  NotificationConfigurationArn: string;
  /** @minItems 1 */
  Regions: string[];
  /**
   * @minLength 1
   * @maxLength 36
   * @pattern ^aws.([a-z0-9\-])+$
   */
  Source: string;
  StatusSummaryByRegion?: Record<string, {
    Status: "ACTIVE" | "INACTIVE" | "CREATING" | "UPDATING" | "DELETING";
    Reason: string;
  }>;
};
