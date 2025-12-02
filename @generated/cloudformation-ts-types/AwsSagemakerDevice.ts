// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-device.json

/** Resource schema for AWS::SageMaker::Device */
export type AwsSagemakerDevice = {
  /**
   * The name of the edge device fleet
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9](-*_*[a-zA-Z0-9])*$
   */
  DeviceFleetName: string;
  /** The Edge Device you want to register against a device fleet */
  Device?: {
    /**
     * Description of the device
     * @minLength 1
     * @maxLength 40
     * @pattern [\S\s]+
     */
    Description?: string;
    /**
     * The name of the device
     * @minLength 1
     * @maxLength 63
     * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9])*$
     */
    DeviceName: string;
    /**
     * AWS Internet of Things (IoT) object name.
     * @maxLength 128
     * @pattern [a-zA-Z0-9:_-]+
     */
    IotThingName?: string;
  };
  /** Associate tags with the resource */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^((?!aws:)[\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * The key value of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
  }[];
};
