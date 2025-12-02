// This file is auto-generated. Do not edit manually.
// Source: aws-codestarnotifications-notificationrule.json

/** Resource Type definition for AWS::CodeStarNotifications::NotificationRule */
export type AwsCodestarnotificationsNotificationrule = {
  /**
   * @minLength 1
   * @maxLength 2048
   */
  EventTypeId?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   */
  CreatedBy?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   */
  TargetAddress?: string;
  /** @uniqueItems false */
  EventTypeIds: string[];
  /** @enum ["ENABLED","DISABLED"] */
  Status?: "ENABLED" | "DISABLED";
  /** @enum ["BASIC","FULL"] */
  DetailType: "BASIC" | "FULL";
  /** @pattern ^arn:aws[^:\s]*:[^:\s]*:[^:\s]*:[0-9]{12}:[^\s]+$ */
  Resource: string;
  /**
   * @maxItems 10
   * @uniqueItems false
   */
  Targets: {
    TargetType: string;
    TargetAddress: string;
  }[];
  Tags?: Record<string, string>;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern [A-Za-z0-9\-_ ]+$
   */
  Name: string;
  /** @pattern ^arn:aws[^:\s]*:codestar-notifications:[^:\s]+:\d{12}:notificationrule\/(.*\S)?$ */
  Arn?: string;
};
