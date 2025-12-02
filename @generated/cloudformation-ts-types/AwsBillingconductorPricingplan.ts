// This file is auto-generated. Do not edit manually.
// Source: aws-billingconductor-pricingplan.json

/**
 * Pricing Plan enables you to customize your billing details consistent with the usage that accrues
 * in each of your billing groups.
 */
export type AwsBillingconductorPricingplan = {
  /**
   * Pricing Plan ARN
   * @pattern arn:aws(-cn)?:billingconductor::(aws|[0-9]{12}):pricingplan/(BasicPricingPlan|[a-zA-Z0-9]{10})
   */
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9_\+=\.\-@]+
   */
  Name: string;
  PricingRuleArns?: string[];
  /** Number of associated pricing rules */
  Size?: number;
  /** @maxLength 1024 */
  Description?: string;
  /** Creation timestamp in UNIX epoch time format */
  CreationTime?: number;
  /** Latest modified timestamp in UNIX epoch time format */
  LastModifiedTime?: number;
  /** @uniqueItems true */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
