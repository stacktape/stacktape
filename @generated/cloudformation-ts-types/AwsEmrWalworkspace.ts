// This file is auto-generated. Do not edit manually.
// Source: aws-emr-walworkspace.json

/** Resource schema for AWS::EMR::WALWorkspace Type */
export type AwsEmrWalworkspace = {
  /**
   * The name of the emrwal container
   * @minLength 1
   * @maxLength 32
   * @pattern ^[a-zA-Z0-9]+$
   */
  WALWorkspaceName?: string;
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
