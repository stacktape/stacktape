// This file is auto-generated. Do not edit manually.
// Source: aws-notifications-notificationhub.json

/** Resource Type definition for AWS::Notifications::NotificationHub */
export type AwsNotificationsNotificationhub = {
  Region: string;
  NotificationHubStatusSummary?: {
    NotificationHubStatus: "ACTIVE" | "REGISTERING" | "DEREGISTERING" | "INACTIVE";
    NotificationHubStatusReason: string;
  };
  CreationTime?: string;
};
