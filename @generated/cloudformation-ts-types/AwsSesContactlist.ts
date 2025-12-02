// This file is auto-generated. Do not edit manually.
// Source: aws-ses-contactlist.json

/** Resource schema for AWS::SES::ContactList. */
export type AwsSesContactlist = {
  /**
   * The name of the contact list.
   * @pattern ^[a-zA-Z0-9_-]{1,64}$
   */
  ContactListName?: string;
  /**
   * The description of the contact list.
   * @maxLength 500
   */
  Description?: string;
  /**
   * The topics associated with the contact list.
   * @minItems 0
   * @maxItems 20
   */
  Topics?: {
    /**
     * The name of the topic.
     * @pattern ^[a-zA-Z0-9_-]{1,64}$
     */
    TopicName: string;
    /**
     * The display name of the topic.
     * @minLength 0
     * @maxLength 128
     */
    DisplayName: string;
    /**
     * The description of the topic.
     * @minLength 0
     * @maxLength 500
     */
    Description?: string;
    DefaultSubscriptionStatus: string;
  }[];
  /**
   * The tags (keys and values) associated with the contact list.
   * @minItems 0
   * @maxItems 50
   */
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
