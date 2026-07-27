// This file is auto-generated. Do not edit manually.
// Source: aws-iot-thinggroup.json

/** Resource Type definition for AWS::IoT::ThingGroup */
export type AwsIotThinggroup = {
  Id?: string;
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9:_-]+
   */
  ThingGroupName?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9:_-]+
   */
  ParentGroupName?: string;
  /**
   * @minLength 1
   * @maxLength 1000
   */
  QueryString?: string;
  ThingGroupProperties?: {
    AttributePayload?: {
      Attributes?: Record<string, string>;
    };
    /**
     * @maxLength 2028
     * @pattern [\p{Graph}\x20]*
     */
    ThingGroupDescription?: string;
  };
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
};
