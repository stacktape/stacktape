// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-subscriptiondefinition.json

/** Resource Type definition for AWS::Greengrass::SubscriptionDefinition */
export type AwsGreengrassSubscriptiondefinition = {
  LatestVersionArn?: string;
  Id?: string;
  Arn?: string;
  Name: string;
  InitialVersion?: {
    /** @uniqueItems false */
    Subscriptions: {
      Target: string;
      Id: string;
      Source: string;
      Subject: string;
    }[];
  };
  Tags?: Record<string, unknown>;
};
