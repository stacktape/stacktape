// This file is auto-generated. Do not edit manually.
// Source: aws-iot-thingtype.json

/** Resource Type definition for AWS::IoT::ThingType */
export type AwsIotThingtype = {
  Id?: string;
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9:_-]+
   */
  ThingTypeName?: string;
  DeprecateThingType?: boolean;
  ThingTypeProperties?: {
    /**
     * @maxItems 3
     * @uniqueItems true
     */
    SearchableAttributes?: string[];
    /**
     * @maxLength 2028
     * @pattern [\p{Graph}\x20]*
     */
    ThingTypeDescription?: string;
    Mqtt5Configuration?: {
      /** @uniqueItems true */
      PropagatingAttributes?: ({
        /**
         * @maxLength 128
         * @pattern [a-zA-Z0-9:$.]+
         */
        UserPropertyKey: string;
        /**
         * @maxLength 128
         * @pattern [a-zA-Z0-9_.,@/:#-]+
         */
        ThingAttribute?: string;
        /** @enum ["iot:ClientId","iot:Thing.ThingName"] */
        ConnectionAttribute?: "iot:ClientId" | "iot:Thing.ThingName";
      })[];
    };
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
