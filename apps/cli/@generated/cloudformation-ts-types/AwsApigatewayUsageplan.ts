// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-usageplan.json

/**
 * The ``AWS::ApiGateway::UsagePlan`` resource creates a usage plan for deployed APIs. A usage plan
 * sets a target for the throttling and quota limits on individual client API keys. For more
 * information, see [Creating and Using API Usage Plans in Amazon API
 * Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html)
 * in the *API Gateway Developer Guide*.
 * In some cases clients can exceed the targets that you set. Don’t rely on usage plans to control
 * costs. Consider using
 * [](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html) to
 * monitor costs and [](https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html) to
 * manage API requests.
 */
export type AwsApigatewayUsageplan = {
  Id?: string;
  /** @uniqueItems true */
  ApiStages?: {
    ApiId?: string;
    Stage?: string;
    Throttle?: Record<string, {
      /** @minimum 0 */
      BurstLimit?: number;
      /** @minimum 0 */
      RateLimit?: number;
    }>;
  }[];
  Description?: string;
  Quota?: {
    /** @minimum 0 */
    Limit?: number;
    /** @minimum 0 */
    Offset?: number;
    Period?: string;
  };
  /** @uniqueItems false */
  Tags?: {
    /**
     * A string you can use to assign a value. The combination of tag keys and values can help you
     * organize and categorize your resources.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the specified tag key.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  Throttle?: {
    /** @minimum 0 */
    BurstLimit?: number;
    /** @minimum 0 */
    RateLimit?: number;
  };
  UsagePlanName?: string;
};
