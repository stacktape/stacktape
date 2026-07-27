// This file is auto-generated. Do not edit manually.
// Source: aws-ce-costcategory.json

/**
 * Resource Type definition for AWS::CE::CostCategory. Cost Category enables you to map your cost and
 * usage into meaningful categories. You can use Cost Category to organize your costs using a
 * rule-based engine.
 */
export type AwsCeCostcategory = {
  /**
   * Cost category ARN
   * @pattern ^arn:aws[-a-z0-9]*:[a-z0-9]+:[-a-z0-9]*:[0-9]{12}:[-a-zA-Z0-9/:_]+$
   */
  Arn?: string;
  EffectiveStart?: string;
  /**
   * @minLength 1
   * @maxLength 50
   */
  Name: string;
  /** @enum ["CostCategoryExpression.v1"] */
  RuleVersion: "CostCategoryExpression.v1";
  /** JSON array format of Expression in Billing and Cost Management API */
  Rules: string;
  /** Json array format of CostCategorySplitChargeRule in Billing and Cost Management API */
  SplitChargeRules?: string;
  /**
   * The default value for the cost category
   * @minLength 1
   * @maxLength 50
   */
  DefaultValue?: string;
  /**
   * Tags to assign to the cost category.
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * The key name for the tag.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:).*$
     */
    Key: string;
    /**
     * The value for the tag.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
