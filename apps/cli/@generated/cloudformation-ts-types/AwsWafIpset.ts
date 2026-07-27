// This file is auto-generated. Do not edit manually.
// Source: aws-waf-ipset.json

/** Resource Type definition for AWS::WAF::IPSet */
export type AwsWafIpset = {
  Id?: string;
  /** @uniqueItems true */
  IPSetDescriptors?: {
    Type: string;
    Value: string;
  }[];
  Name: string;
};
