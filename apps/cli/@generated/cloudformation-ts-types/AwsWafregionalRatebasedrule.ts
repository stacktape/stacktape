// This file is auto-generated. Do not edit manually.
// Source: aws-wafregional-ratebasedrule.json

/** Resource Type definition for AWS::WAFRegional::RateBasedRule */
export type AwsWafregionalRatebasedrule = {
  Id?: string;
  MetricName: string;
  RateLimit: number;
  /** @uniqueItems false */
  MatchPredicates?: {
    Type: string;
    DataId: string;
    Negated: boolean;
  }[];
  RateKey: string;
  Name: string;
};
