// This file is auto-generated. Do not edit manually.
// Source: aws-notifications-organizationalunitassociation.json

/** Resource Type definition for AWS::Notifications::OrganizationalUnitAssociation */
export type AwsNotificationsOrganizationalunitassociation = {
  /**
   * ARN identifier of the NotificationConfiguration.
   * Example: arn:aws:notifications::123456789012:configuration/a01jes88qxwkbj05xv9c967pgm1
   * @pattern ^arn:aws:notifications::[0-9]{12}:configuration\/[a-z0-9]{27}$
   */
  NotificationConfigurationArn: string;
  /**
   * The ID of the organizational unit.
   * @pattern ^(r-[0-9a-z]{4,32})|(ou-[0-9a-z]{4,32}-[a-z0-9]{8,32})$
   */
  OrganizationalUnitId: string;
};
