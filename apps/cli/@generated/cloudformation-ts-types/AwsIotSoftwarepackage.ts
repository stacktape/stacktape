// This file is auto-generated. Do not edit manually.
// Source: aws-iot-softwarepackage.json

/** resource definition */
export type AwsIotSoftwarepackage = {
  /**
   * @minLength 0
   * @maxLength 1024
   * @pattern ^[^\p{C}]+$
   */
  Description?: string;
  PackageArn?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-_.]+$
   */
  PackageName?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
