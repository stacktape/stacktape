// This file is auto-generated. Do not edit manually.
// Source: aws-iot-thing.json

/** Resource Type definition for AWS::IoT::Thing */
export type AwsIotThing = {
  Id?: string;
  Arn?: string;
  AttributePayload?: {
    Attributes?: Record<string, string>;
  };
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9:_-]+
   */
  ThingName?: string;
};
