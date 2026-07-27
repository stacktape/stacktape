// This file is auto-generated. Do not edit manually.
// Source: aws-docdb-eventsubscription.json

/** Resource Type definition for AWS::DocDB::EventSubscription */
export type AwsDocdbEventsubscription = {
  SourceType?: string;
  Enabled?: boolean;
  /** @uniqueItems false */
  EventCategories?: string[];
  SubscriptionName?: string;
  SnsTopicArn: string;
  /** @uniqueItems false */
  SourceIds?: string[];
  Id?: string;
};
