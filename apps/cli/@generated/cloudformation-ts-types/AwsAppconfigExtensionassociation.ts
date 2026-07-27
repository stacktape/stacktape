// This file is auto-generated. Do not edit manually.
// Source: aws-appconfig-extensionassociation.json

/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsAppconfigExtensionassociation = {
  Id?: string;
  Arn?: string;
  ExtensionArn?: string;
  ResourceArn?: string;
  ExtensionIdentifier?: string;
  ResourceIdentifier?: string;
  ExtensionVersionNumber?: number;
  Parameters?: Record<string, string>;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
