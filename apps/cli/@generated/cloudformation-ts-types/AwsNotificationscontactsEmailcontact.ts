// This file is auto-generated. Do not edit manually.
// Source: aws-notificationscontacts-emailcontact.json

/** Definition of AWS::NotificationsContacts::EmailContact Resource Type */
export type AwsNotificationscontactsEmailcontact = {
  /** @pattern ^arn:aws:notifications-contacts::[0-9]{12}:emailcontact/[a-z0-9]{27}$ */
  Arn?: string;
  /**
   * @minLength 6
   * @maxLength 254
   * @pattern ^(.+)@(.+)$
   */
  EmailAddress: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern [\w-.~]+
   */
  Name: string;
  EmailContact?: {
    /** @pattern ^arn:aws:notifications-contacts::[0-9]{12}:emailcontact/[a-z0-9]{27}$ */
    Arn: string;
    /**
     * @minLength 1
     * @maxLength 64
     * @pattern [\w-.~]+
     */
    Name: string;
    /**
     * @minLength 6
     * @maxLength 254
     * @pattern ^(.+)@(.+)$
     */
    Address: string;
    Status: "inactive" | "active";
    CreationTime: string;
    UpdateTime: string;
  };
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
