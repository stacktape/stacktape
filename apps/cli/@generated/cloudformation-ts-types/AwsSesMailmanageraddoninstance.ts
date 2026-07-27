// This file is auto-generated. Do not edit manually.
// Source: aws-ses-mailmanageraddoninstance.json

/** Definition of AWS::SES::MailManagerAddonInstance Resource Type */
export type AwsSesMailmanageraddoninstance = {
  AddonInstanceArn?: string;
  /**
   * @minLength 4
   * @maxLength 67
   * @pattern ^ai-[a-zA-Z0-9]{1,64}$
   */
  AddonInstanceId?: string;
  AddonName?: string;
  /**
   * @minLength 4
   * @maxLength 67
   * @pattern ^as-[a-zA-Z0-9]{1,64}$
   */
  AddonSubscriptionId: string;
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
