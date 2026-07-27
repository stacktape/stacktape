// This file is auto-generated. Do not edit manually.
// Source: aws-wafregional-ipset.json

/** Resource Type definition for AWS::WAFRegional::IPSet */
export type AwsWafregionalIpset = {
  Id?: string;
  /** @uniqueItems false */
  IPSetDescriptors?: {
    Type: string;
    Value: string;
  }[];
  Name: string;
};
