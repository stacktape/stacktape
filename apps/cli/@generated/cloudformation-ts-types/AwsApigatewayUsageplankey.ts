// This file is auto-generated. Do not edit manually.
// Source: aws-apigateway-usageplankey.json

/**
 * The ``AWS::ApiGateway::UsagePlanKey`` resource associates an API key with a usage plan. This
 * association determines which users the usage plan is applied to.
 */
export type AwsApigatewayUsageplankey = {
  /** The Id of the UsagePlanKey resource. */
  KeyId: string;
  /** @enum ["API_KEY"] */
  KeyType: "API_KEY";
  /**
   * The Id of the UsagePlan resource representing the usage plan containing the UsagePlanKey resource
   * representing a plan customer.
   */
  UsagePlanId: string;
  Id?: string;
};
