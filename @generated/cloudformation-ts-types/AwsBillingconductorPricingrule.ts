// This file is auto-generated. Do not edit manually.
// Source: aws-billingconductor-pricingrule.json

/**
 * A markup/discount that is defined for a specific set of services that can later be associated with
 * a pricing plan.
 */
export type AwsBillingconductorPricingrule = {
  /**
   * Pricing rule ARN
   * @pattern arn:aws(-cn)?:billingconductor::[0-9]{12}:pricingrule/[a-zA-Z0-9]{10}
   */
  Arn?: string;
  /**
   * Pricing rule name
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9_\+=\.\-@]+
   */
  Name: string;
  /**
   * Pricing rule description
   * @maxLength 1024
   */
  Description?: string;
  /**
   * A term used to categorize the granularity of a Pricing Rule.
   * @enum ["GLOBAL","SERVICE","BILLING_ENTITY","SKU"]
   */
  Scope: "GLOBAL" | "SERVICE" | "BILLING_ENTITY" | "SKU";
  /**
   * One of MARKUP, DISCOUNT or TIERING that describes the behaviour of the pricing rule.
   * @enum ["MARKUP","DISCOUNT","TIERING"]
   */
  Type: "MARKUP" | "DISCOUNT" | "TIERING";
  /**
   * Pricing rule modifier percentage
   * @minimum 0
   */
  ModifierPercentage?: number;
  /**
   * The service which a pricing rule is applied on
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9\.\-]+
   */
  Service?: string;
  /**
   * The seller of services provided by AWS, their affiliates, or third-party providers selling services
   * via AWS Marketplaces. Supported billing entities are AWS, AWS Marketplace, and AISPL.
   * @enum ["AWS","AWS Marketplace","AISPL"]
   */
  BillingEntity?: "AWS" | "AWS Marketplace" | "AISPL";
  /** The set of tiering configurations for the pricing rule. */
  Tiering?: {
    FreeTier?: {
      Activated: boolean;
    };
  };
  /**
   * The UsageType which a SKU pricing rule is modifying
   * @minLength 1
   * @maxLength 256
   * @pattern ^\S+$
   */
  UsageType?: string;
  /**
   * The Operation which a SKU pricing rule is modifying
   * @minLength 1
   * @maxLength 256
   * @pattern ^\S+$
   */
  Operation?: string;
  /**
   * The number of pricing plans associated with pricing rule
   * @minimum 0
   */
  AssociatedPricingPlanCount?: number;
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
