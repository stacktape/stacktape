// This file is auto-generated. Do not edit manually.
// Source: aws-billingconductor-customlineitem.json

/** A custom line item is an one time charge that is applied to a specific billing group's bill. */
export type AwsBillingconductorCustomlineitem = {
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9_\+=\.\-@]+
   */
  Name: string;
  /**
   * The display settings of the Custom Line Item.
   * @enum ["CONSOLIDATED"]
   */
  ComputationRule?: "CONSOLIDATED";
  PresentationDetails?: {
    /** @pattern ^[a-zA-Z0-9]+$ */
    Service: string;
  };
  /** @maxLength 255 */
  Description?: string;
  CustomLineItemChargeDetails?: {
    Flat?: {
      /**
       * @minimum 0
       * @maximum 1000000
       */
      ChargeValue: number;
    };
    Percentage?: {
      /** @uniqueItems true */
      ChildAssociatedResources?: string[];
      /**
       * @minimum 0
       * @maximum 10000
       */
      PercentageValue: number;
    };
    Type: "FEE" | "CREDIT";
    LineItemFilters?: {
      /** @enum ["LINE_ITEM_TYPE"] */
      Attribute: "LINE_ITEM_TYPE";
      /** @enum ["NOT_EQUAL"] */
      MatchOption: "NOT_EQUAL";
      /** @uniqueItems true */
      Values: "SAVINGS_PLAN_NEGATION"[];
    }[];
  };
  /**
   * Billing Group ARN
   * @pattern arn:aws(-cn)?:billingconductor::[0-9]{12}:billinggroup/?[a-zA-Z0-9]{10,12}
   */
  BillingGroupArn: string;
  BillingPeriodRange?: {
    InclusiveStartBillingPeriod?: string;
    ExclusiveEndBillingPeriod?: string;
  };
  /**
   * ARN
   * @pattern (arn:aws(-cn)?:billingconductor::[0-9]{12}:customlineitem/)?[a-zA-Z0-9]{10}
   */
  Arn?: string;
  /** Creation timestamp in UNIX epoch time format */
  CreationTime?: number;
  /** Latest modified timestamp in UNIX epoch time format */
  LastModifiedTime?: number;
  /** Number of source values associated to this custom line item */
  AssociationSize?: number;
  /**
   * @minLength 1
   * @maxLength 29
   */
  ProductCode?: string;
  /** @enum ["USD","CNY"] */
  CurrencyCode?: "USD" | "CNY";
  /**
   * The account which this custom line item will be charged to
   * @pattern [0-9]{12}
   */
  AccountId?: string;
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
