// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-subscriptiondefinitionversion.json

/** Resource Type definition for AWS::Greengrass::SubscriptionDefinitionVersion */
export type AwsGreengrassSubscriptiondefinitionversion = {
  Id?: string;
  SubscriptionDefinitionId: string;
  /** @uniqueItems false */
  Subscriptions: {
    Target: string;
    Id: string;
    Source: string;
    Subject: string;
  }[];
};
