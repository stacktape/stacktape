// This file is auto-generated. Do not edit manually.
// Source: aws-databrew-ruleset.json

/** Resource schema for AWS::DataBrew::Ruleset. */
export type AwsDatabrewRuleset = {
  /**
   * Name of the Ruleset
   * @minLength 1
   * @maxLength 255
   */
  Name: string;
  /**
   * Description of the Ruleset
   * @maxLength 1024
   */
  Description?: string;
  /**
   * Arn of the target resource (dataset) to apply the ruleset to
   * @minLength 20
   * @maxLength 2048
   */
  TargetArn: string;
  /**
   * List of the data quality rules in the ruleset
   * @minItems 1
   */
  Rules: ({
    /**
     * Name of the rule
     * @minLength 1
     * @maxLength 128
     */
    Name: string;
    Disabled?: boolean;
    CheckExpression: string;
    SubstitutionMap?: {
      /**
       * Variable name
       * @minLength 2
       * @maxLength 128
       * @pattern ^:[A-Za-z0-9_]+$
       */
      ValueReference: string;
      /**
       * Value or column name
       * @minLength 0
       * @maxLength 1024
       */
      Value: string;
    }[];
    Threshold?: {
      Value: number;
      Type?: "GREATER_THAN_OR_EQUAL" | "LESS_THAN_OR_EQUAL" | "GREATER_THAN" | "LESS_THAN";
      Unit?: "COUNT" | "PERCENTAGE";
    };
    /** @minItems 1 */
    ColumnSelectors?: {
      /**
       * A regular expression for selecting a column from a dataset
       * @minLength 1
       * @maxLength 255
       */
      Regex?: string;
      /**
       * The name of a column from a dataset
       * @minLength 1
       * @maxLength 255
       */
      Name?: string;
    }[];
  })[];
  /** @uniqueItems false */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
