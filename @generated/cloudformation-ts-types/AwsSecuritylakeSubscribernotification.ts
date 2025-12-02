// This file is auto-generated. Do not edit manually.
// Source: aws-securitylake-subscribernotification.json

/** Resource Type definition for AWS::SecurityLake::SubscriberNotification */
export type AwsSecuritylakeSubscribernotification = {
  NotificationConfiguration: unknown | unknown;
  /**
   * The ARN for the subscriber
   * @pattern ^arn:.*$
   */
  SubscriberArn: string;
  /** The endpoint the subscriber should listen to for notifications */
  SubscriberEndpoint?: string;
};
