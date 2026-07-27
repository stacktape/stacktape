// This file is auto-generated. Do not edit manually.
// Source: aws-securityhub-productsubscription.json

/**
 * The AWS::SecurityHub::ProductSubscription resource represents a subscription to a service that is
 * allowed to generate findings for your Security Hub account. One product subscription resource is
 * created for each product enabled.
 */
export type AwsSecurityhubProductsubscription = {
  /**
   * The generic ARN of the product being subscribed to
   * @pattern arn:aws\S*:securityhub:\S*
   */
  ProductArn: string;
  /**
   * The ARN of the product subscription for the account
   * @pattern arn:aws\S*:securityhub:\S*
   */
  ProductSubscriptionArn?: string;
};
