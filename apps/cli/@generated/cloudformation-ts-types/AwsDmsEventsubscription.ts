// This file is auto-generated. Do not edit manually.
// Source: aws-dms-eventsubscription.json

/** Resource Type definition for AWS::DMS::EventSubscription */
export type AwsDmsEventsubscription = {
  SourceType?: string;
  /** @uniqueItems false */
  EventCategories?: string[];
  Enabled?: boolean;
  SubscriptionName?: string;
  SnsTopicArn: string;
  /** @uniqueItems false */
  SourceIds?: string[];
  Id?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
