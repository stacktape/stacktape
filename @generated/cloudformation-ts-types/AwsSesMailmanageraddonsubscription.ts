// This file is auto-generated. Do not edit manually.
// Source: aws-ses-mailmanageraddonsubscription.json

/** Definition of AWS::SES::MailManagerAddonSubscription Resource Type */
export type AwsSesMailmanageraddonsubscription = {
  AddonName: string;
  AddonSubscriptionArn?: string;
  /**
   * @minLength 4
   * @maxLength 67
   * @pattern ^as-[a-zA-Z0-9]{1,64}$
   */
  AddonSubscriptionId?: string;
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9/_\+=\.:@\-]+$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9/_\+=\.:@\-]*$
     */
    Value: string;
  }[];
};
