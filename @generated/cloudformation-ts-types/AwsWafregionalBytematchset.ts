// This file is auto-generated. Do not edit manually.
// Source: aws-wafregional-bytematchset.json

/** Resource Type definition for AWS::WAFRegional::ByteMatchSet */
export type AwsWafregionalBytematchset = {
  Id?: string;
  /** @uniqueItems false */
  ByteMatchTuples?: {
    TargetString?: string;
    TargetStringBase64?: string;
    PositionalConstraint: string;
    TextTransformation: string;
    FieldToMatch: {
      Type: string;
      Data?: string;
    };
  }[];
  Name: string;
};
