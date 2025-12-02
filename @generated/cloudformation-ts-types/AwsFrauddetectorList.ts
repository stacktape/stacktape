// This file is auto-generated. Do not edit manually.
// Source: aws-frauddetector-list.json

/** A resource schema for a List in Amazon Fraud Detector. */
export type AwsFrauddetectorList = {
  /** The list ARN. */
  Arn?: string;
  /**
   * The name of the list.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[0-9a-z_]+$
   */
  Name: string;
  /**
   * The description of the list.
   * @minLength 1
   * @maxLength 128
   */
  Description?: string;
  /**
   * The variable type of the list.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[A-Z_]{1,64}$
   */
  VariableType?: string;
  /** The time when the list was created. */
  CreatedTime?: string;
  /** The time when the list was last updated. */
  LastUpdatedTime?: string;
  /**
   * Tags associated with this list.
   * @maxItems 200
   * @uniqueItems false
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
  /**
   * The elements in this list.
   * @minItems 0
   * @maxItems 100000
   */
  Elements?: string[];
};
