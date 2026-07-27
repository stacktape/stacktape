// This file is auto-generated. Do not edit manually.
// Source: aws-billingconductor-billinggroup.json

/**
 * A billing group is a set of linked account which belong to the same end customer. It can be seen as
 * a virtual consolidated billing family.
 */
export type AwsBillingconductorBillinggroup = {
  /**
   * Billing Group ARN
   * @pattern arn:aws(-cn)?:billingconductor::[0-9]{12}:billinggroup/?[a-zA-Z0-9]{10,12}
   */
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9_\+=\.\-@]+
   */
  Name: string;
  /** @maxLength 1024 */
  Description?: string;
  /**
   * This account will act as a virtual payer account of the billing group
   * @pattern [0-9]{12}
   */
  PrimaryAccountId?: string;
  ComputationPreference: {
    /**
     * ARN of the attached pricing plan
     * @pattern arn:aws(-cn)?:billingconductor::(aws|[0-9]{12}):pricingplan/(BasicPricingPlan|[a-zA-Z0-9]{10})
     */
    PricingPlanArn: string;
  };
  AccountGrouping: {
    /**
     * @minItems 1
     * @uniqueItems true
     */
    LinkedAccountIds?: string[];
    /** @pattern arn:[a-z0-9][a-z0-9-.]{0,62}:organizations::[0-9]{12}:transfer/o-[a-z0-9]{10,32}/(billing)/(inbound|outbound)/rt-[0-9a-z]{8,32} */
    ResponsibilityTransferArn?: string;
    AutoAssociate?: boolean;
  };
  /** Number of accounts in the billing group */
  Size?: number;
  Status?: "ACTIVE" | "PRIMARY_ACCOUNT_MISSING";
  StatusReason?: string;
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
