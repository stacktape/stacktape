// This file is auto-generated. Do not edit manually.
// Source: aws-devopsguru-notificationchannel.json

/** This resource schema represents the NotificationChannel resource in the Amazon DevOps Guru. */
export type AwsDevopsguruNotificationchannel = {
  Config: {
    Sns?: {
      /**
       * @minLength 36
       * @maxLength 1024
       * @pattern ^arn:aws[a-z0-9-]*:sns:[a-z0-9-]+:\d{12}:[^:]+$
       */
      TopicArn?: string;
    };
    Filters?: {
      Severities?: ("LOW" | "MEDIUM" | "HIGH")[];
      MessageTypes?: ("NEW_INSIGHT" | "CLOSED_INSIGHT" | "NEW_ASSOCIATION" | "SEVERITY_UPGRADED" | "NEW_RECOMMENDATION")[];
    };
  };
  /**
   * The ID of a notification channel.
   * @minLength 36
   * @maxLength 36
   * @pattern ^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$
   */
  Id?: string;
};
