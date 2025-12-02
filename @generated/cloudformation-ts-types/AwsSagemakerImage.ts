// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-image.json

/** Resource Type definition for AWS::SageMaker::Image */
export type AwsSagemakerImage = {
  ImageName: string;
  ImageArn?: string;
  ImageRoleArn: string;
  ImageDisplayName?: string;
  ImageDescription?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     */
    Value: string;
  }[];
};
