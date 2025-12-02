// This file is auto-generated. Do not edit manually.
// Source: aws-waf-rule.json

/** Resource Type definition for AWS::WAF::Rule */
export type AwsWafRule = {
  Id?: string;
  MetricName: string;
  Name: string;
  /** @uniqueItems true */
  Predicates?: {
    DataId: string;
    Negated: boolean;
    Type: string;
  }[];
};
