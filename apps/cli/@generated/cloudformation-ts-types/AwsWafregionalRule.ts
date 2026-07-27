// This file is auto-generated. Do not edit manually.
// Source: aws-wafregional-rule.json

/** Resource Type definition for AWS::WAFRegional::Rule */
export type AwsWafregionalRule = {
  Id?: string;
  MetricName: string;
  /** @uniqueItems false */
  Predicates?: {
    Type: string;
    DataId: string;
    Negated: boolean;
  }[];
  Name: string;
};
