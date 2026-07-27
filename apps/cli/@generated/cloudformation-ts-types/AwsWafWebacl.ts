// This file is auto-generated. Do not edit manually.
// Source: aws-waf-webacl.json

/** Resource Type definition for AWS::WAF::WebACL */
export type AwsWafWebacl = {
  Id?: string;
  DefaultAction: {
    Type: string;
  };
  MetricName: string;
  Name: string;
  /** @uniqueItems true */
  Rules?: {
    Action?: {
      Type: string;
    };
    Priority: number;
    RuleId: string;
  }[];
};
