// This file is auto-generated. Do not edit manually.
// Source: aws-evidently-feature.json

/** Resource Type definition for AWS::Evidently::Feature. */
export type AwsEvidentlyFeature = {
  /**
   * @minLength 0
   * @maxLength 2048
   * @pattern arn:[^:]*:[^:]*:[^:]*:[^:]*:project/[-a-zA-Z0-9._]*/feature/[-a-zA-Z0-9._]*
   */
  Arn?: string;
  /**
   * @minLength 0
   * @maxLength 2048
   * @pattern ([-a-zA-Z0-9._]*)|(arn:[^:]*:[^:]*:[^:]*:[^:]*:project/[-a-zA-Z0-9._]*)
   */
  Project: string;
  /**
   * @minLength 1
   * @maxLength 127
   * @pattern [-a-zA-Z0-9._]*
   */
  Name: string;
  /**
   * @minLength 0
   * @maxLength 160
   */
  Description?: string;
  /** @enum ["ALL_RULES","DEFAULT_VARIATION"] */
  EvaluationStrategy?: "ALL_RULES" | "DEFAULT_VARIATION";
  /**
   * @minItems 1
   * @maxItems 5
   * @uniqueItems true
   */
  Variations: (unknown | unknown | unknown | unknown)[];
  /**
   * @minLength 1
   * @maxLength 127
   * @pattern [-a-zA-Z0-9._]*
   */
  DefaultVariation?: string;
  /**
   * @minItems 0
   * @maxItems 2500
   * @uniqueItems true
   */
  EntityOverrides?: {
    EntityId?: string;
    /**
     * @minLength 1
     * @maxLength 127
     * @pattern [-a-zA-Z0-9._]*
     */
    Variation?: string;
  }[];
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
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
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
