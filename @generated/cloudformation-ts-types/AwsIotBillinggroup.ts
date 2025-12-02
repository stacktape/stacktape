// This file is auto-generated. Do not edit manually.
// Source: aws-iot-billinggroup.json

/** Resource Type definition for AWS::IoT::BillingGroup */
export type AwsIotBillinggroup = {
  Id?: string;
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9:_-]+
   */
  BillingGroupName?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * Tag key (1-128 chars). No 'aws:' prefix. Allows: [A-Za-z0-9 _.:/=+-]
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * Tag value (1-256 chars). No 'aws:' prefix. Allows: [A-Za-z0-9 _.:/=+-]
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  BillingGroupProperties?: {
    /**
     * @maxLength 2028
     * @pattern [\p{Graph}\x20]*
     */
    BillingGroupDescription?: string;
  };
};
