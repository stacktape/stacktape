// This file is auto-generated. Do not edit manually.
// Source: aws-wafregional-webacl.json

/** Resource Type definition for AWS::WAFRegional::WebACL */
export type AwsWafregionalWebacl = {
  Id?: string;
  MetricName: string;
  DefaultAction: {
    Type: string;
  };
  /** @uniqueItems false */
  Rules?: {
    Action: {
      Type: string;
    };
    Priority: number;
    RuleId: string;
  }[];
  Name: string;
};
