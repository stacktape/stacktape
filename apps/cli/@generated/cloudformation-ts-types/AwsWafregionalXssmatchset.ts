// This file is auto-generated. Do not edit manually.
// Source: aws-wafregional-xssmatchset.json

/** Resource Type definition for AWS::WAFRegional::XssMatchSet */
export type AwsWafregionalXssmatchset = {
  Id?: string;
  /** @uniqueItems false */
  XssMatchTuples?: {
    TextTransformation: string;
    FieldToMatch: {
      Type: string;
      Data?: string;
    };
  }[];
  Name: string;
};
