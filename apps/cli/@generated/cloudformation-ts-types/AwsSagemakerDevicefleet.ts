// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-devicefleet.json

/** Resource schema for AWS::SageMaker::DeviceFleet */
export type AwsSagemakerDevicefleet = {
  /**
   * Description for the edge device fleet
   * @minLength 0
   * @maxLength 800
   * @pattern [\S\s]+
   */
  Description?: string;
  /**
   * The name of the edge device fleet
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9](-*_*[a-zA-Z0-9])*$
   */
  DeviceFleetName: string;
  /** S3 bucket and an ecryption key id (if available) to store outputs for the fleet */
  OutputConfig: {
    /**
     * The Amazon Simple Storage (S3) bucket URI
     * @maxLength 1024
     * @pattern ^s3://([^/]+)/?(.*)$
     */
    S3OutputLocation: string;
    /**
     * The KMS key id used for encryption on the S3 bucket
     * @minLength 1
     * @maxLength 2048
     * @pattern [a-zA-Z0-9:_-]+
     */
    KmsKeyId?: string;
  };
  /**
   * Role associated with the device fleet
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[a-z\-]*:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+$
   */
  RoleArn: string;
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
