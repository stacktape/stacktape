// This file is auto-generated. Do not edit manually.
// Source: aws-glue-dataqualityruleset.json

/** Resource Type definition for AWS::Glue::DataQualityRuleset */
export type AwsGlueDataqualityruleset = {
  Ruleset?: string;
  Description?: string;
  TargetTable?: {
    DatabaseName?: string;
    TableName?: string;
  };
  Id?: string;
  ClientToken?: string;
  Tags?: Record<string, unknown>;
  Name?: string;
};
