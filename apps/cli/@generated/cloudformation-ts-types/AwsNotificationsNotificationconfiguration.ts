// This file is auto-generated. Do not edit manually.
// Source: aws-notifications-notificationconfiguration.json

/** Resource Type definition for AWS::Notifications::NotificationConfiguration */
export type AwsNotificationsNotificationconfiguration = {
  AggregationDuration?: "LONG" | "SHORT" | "NONE";
  /** @pattern ^arn:aws:notifications::[0-9]{12}:configuration/[a-z0-9]{27}$ */
  Arn?: string;
  CreationTime?: string;
  /**
   * @minLength 0
   * @maxLength 256
   * @pattern ^[^\u0001-\u001F\u007F-\u009F]*$
   */
  Description: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[A-Za-z0-9_\-]+$
   */
  Name: string;
  Status?: "ACTIVE" | "PARTIALLY_ACTIVE" | "INACTIVE" | "DELETING";
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
};
