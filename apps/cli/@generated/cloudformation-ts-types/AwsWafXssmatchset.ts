// This file is auto-generated. Do not edit manually.
// Source: aws-waf-xssmatchset.json

/** Resource Type definition for AWS::WAF::XssMatchSet */
export type AwsWafXssmatchset = {
  Id?: string;
  Name: string;
  /** @uniqueItems true */
  XssMatchTuples: {
    FieldToMatch: {
      Data?: string;
      Type: string;
    };
    TextTransformation: string;
  }[];
};
