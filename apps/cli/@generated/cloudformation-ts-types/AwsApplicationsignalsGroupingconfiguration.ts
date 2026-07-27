// This file is auto-generated. Do not edit manually.
// Source: aws-applicationsignals-groupingconfiguration.json

/** Resource Type definition for AWS::ApplicationSignals::GroupingConfiguration */
export type AwsApplicationsignalsGroupingconfiguration = {
  GroupingAttributeDefinitions: {
    GroupingName: string;
    /** @minItems 1 */
    GroupingSourceKeys: string[];
    DefaultGroupingValue?: string;
  }[];
  UpdatedAt?: string;
  AccountId?: string;
};
