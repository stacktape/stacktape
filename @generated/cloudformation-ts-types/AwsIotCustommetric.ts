// This file is auto-generated. Do not edit manually.
// Source: aws-iot-custommetric.json

/** A custom metric published by your devices to Device Defender. */
export type AwsIotCustommetric = {
  /**
   * The name of the custom metric. This will be used in the metric report submitted from the
   * device/thing. Shouldn't begin with aws: . Cannot be updated once defined.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9:_-]+
   */
  MetricName?: string;
  /**
   * Field represents a friendly name in the console for the custom metric; it doesn't have to be
   * unique. Don't use this name as the metric identifier in the device metric report. Can be updated
   * once defined.
   * @maxLength 128
   */
  DisplayName?: string;
  /**
   * The type of the custom metric. Types include string-list, ip-address-list, number-list, and number.
   * @enum ["string-list","ip-address-list","number-list","number"]
   */
  MetricType: "string-list" | "ip-address-list" | "number-list" | "number";
  /**
   * The Amazon Resource Number (ARN) of the custom metric.
   * @minLength 20
   * @maxLength 2048
   */
  MetricArn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
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
};
