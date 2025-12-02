// This file is auto-generated. Do not edit manually.
// Source: aws-iotevents-input.json

/**
 * The AWS::IoTEvents::Input resource creates an input. To monitor your devices and processes, they
 * must have a way to get telemetry data into ITE. This is done by sending messages as *inputs* to
 * ITE. For more information, see [How to
 * Use](https://docs.aws.amazon.com/iotevents/latest/developerguide/how-to-use-iotevents.html) in the
 * *Developer Guide*.
 */
export type AwsIoteventsInput = {
  /** The definition of the input. */
  InputDefinition: {
    /**
     * The attributes from the JSON payload that are made available by the input. Inputs are derived from
     * messages sent to the ITE system using ``BatchPutMessage``. Each such message contains a JSON
     * payload, and those attributes (and their paired values) specified here are available for use in the
     * ``condition`` expressions used by detectors that monitor this input.
     * @minItems 1
     * @maxItems 200
     * @uniqueItems true
     */
    Attributes: {
      /**
       * An expression that specifies an attribute-value pair in a JSON structure. Use this to specify an
       * attribute from the JSON payload that is made available by the input. Inputs are derived from
       * messages sent to ITE (``BatchPutMessage``). Each such message contains a JSON payload. The
       * attribute (and its paired value) specified here are available for use in the ``condition``
       * expressions used by detectors.
       * Syntax: ``<field-name>.<field-name>...``
       * @minLength 1
       * @maxLength 128
       * @pattern ^((`[a-zA-Z0-9_\- ]+`)|([a-zA-Z0-9_\-]+))(\.((`[a-zA-Z0-9_\- ]+`)|([a-zA-Z0-9_\-]+)))*$
       */
      JsonPath: string;
    }[];
  };
  /**
   * A brief description of the input.
   * @minLength 1
   * @maxLength 1024
   */
  InputDescription?: string;
  /**
   * The name of the input.
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z][a-zA-Z0-9_]*$
   */
  InputName?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * For more information, see
   * [Tag](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html).
   * @uniqueItems false
   */
  Tags?: {
    /** The tag's key. */
    Key: string;
    /** The tag's value. */
    Value: string;
  }[];
};
