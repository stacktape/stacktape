// This file is auto-generated. Do not edit manually.
// Source: aws-deadline-farm.json

/** Definition of AWS::Deadline::Farm Resource Type */
export type AwsDeadlineFarm = {
  /**
   * @default ""
   * @minLength 0
   * @maxLength 100
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  DisplayName: string;
  /** @pattern ^farm-[0-9a-f]{32}$ */
  FarmId?: string;
  /** @pattern ^arn:aws[-a-z]*:kms:.*:key/.* */
  KmsKeyArn?: string;
  /** @pattern ^arn:(aws[a-zA-Z-]*):deadline:[a-z0-9-]+:[0-9]+:farm/farm-[0-9a-z]{32}$ */
  Arn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
};
