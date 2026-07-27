// This file is auto-generated. Do not edit manually.
// Source: aws-ses-mailmanageraddresslist.json

/** Definition of AWS::SES::MailManagerAddressList Resource Type */
export type AwsSesMailmanageraddresslist = {
  AddressListArn?: string;
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9-]+$
   */
  AddressListId?: string;
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9_.-]+$
   */
  AddressListName?: string;
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
