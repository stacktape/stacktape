// This file is auto-generated. Do not edit manually.
// Source: aws-iot-dimension.json

/**
 * A dimension can be used to limit the scope of a metric used in a security profile for AWS IoT
 * Device Defender.
 */
export type AwsIotDimension = {
  /**
   * A unique identifier for the dimension.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9:_-]+
   */
  Name?: string;
  /**
   * Specifies the type of the dimension.
   * @enum ["TOPIC_FILTER"]
   */
  Type: "TOPIC_FILTER";
  /**
   * Specifies the value or list of values for the dimension.
   * @minItems 1
   * @maxItems 5
   * @uniqueItems true
   */
  StringValues: string[];
  /**
   * Metadata that can be used to manage the dimension.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The tag's key.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The tag's value.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /** The ARN (Amazon resource name) of the created dimension. */
  Arn?: string;
};
