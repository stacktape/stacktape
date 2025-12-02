// This file is auto-generated. Do not edit manually.
// Source: aws-budgets-budget.json

/** Resource Type definition for AWS::Budgets::Budget */
export type AwsBudgetsBudget = {
  Budget: {
    TimePeriod?: {
      Start?: string;
      End?: string;
    };
    PlannedBudgetLimits?: Record<string, unknown>;
    CostFilters?: Record<string, unknown>;
    CostTypes?: {
      IncludeSupport?: boolean;
      IncludeOtherSubscription?: boolean;
      IncludeTax?: boolean;
      IncludeSubscription?: boolean;
      UseBlended?: boolean;
      IncludeUpfront?: boolean;
      IncludeDiscount?: boolean;
      IncludeCredit?: boolean;
      IncludeRecurring?: boolean;
      UseAmortized?: boolean;
      IncludeRefund?: boolean;
    };
    BudgetType: string;
    /** @uniqueItems false */
    Metrics?: string[];
    BudgetLimit?: {
      Unit: string;
      Amount: number;
    };
    BillingViewArn?: string;
    AutoAdjustData?: {
      AutoAdjustType: string;
      HistoricalOptions?: {
        BudgetAdjustmentPeriod: number;
      };
    };
    TimeUnit: string;
    FilterExpression?: {
      Not?: unknown;
      /** @uniqueItems false */
      Or?: unknown[];
      /** @uniqueItems false */
      And?: unknown[];
      Dimensions?: {
        /** @uniqueItems false */
        Values?: string[];
        Key?: string;
        /** @uniqueItems false */
        MatchOptions?: string[];
      };
      CostCategories?: {
        /** @uniqueItems false */
        Values?: string[];
        Key?: string;
        /** @uniqueItems false */
        MatchOptions?: string[];
      };
      Tags?: {
        /** @uniqueItems false */
        Values?: string[];
        Key?: string;
        /** @uniqueItems false */
        MatchOptions?: string[];
      };
    };
    BudgetName?: string;
  };
  Id?: string;
  /** @uniqueItems false */
  NotificationsWithSubscribers?: {
    /** @uniqueItems false */
    Subscribers: {
      Address: string;
      SubscriptionType: string;
    }[];
    Notification: {
      ComparisonOperator: string;
      NotificationType: string;
      Threshold: number;
      ThresholdType?: string;
    };
  }[];
  /** @uniqueItems false */
  ResourceTags?: {
    Value?: string;
    Key: string;
  }[];
};
