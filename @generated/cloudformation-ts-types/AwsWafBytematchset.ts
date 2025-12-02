// This file is auto-generated. Do not edit manually.
// Source: aws-waf-bytematchset.json

/** Resource Type definition for AWS::WAF::ByteMatchSet */
export type AwsWafBytematchset = {
  Id?: string;
  /** @uniqueItems true */
  ByteMatchTuples?: {
    FieldToMatch: {
      Data?: string;
      Type: string;
    };
    PositionalConstraint: string;
    TargetString?: string;
    TargetStringBase64?: string;
    TextTransformation: string;
  }[];
  Name: string;
};
