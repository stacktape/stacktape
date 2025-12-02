// This file is auto-generated. Do not edit manually.
// Source: aws-wafregional-sizeconstraintset.json

/** Resource Type definition for AWS::WAFRegional::SizeConstraintSet */
export type AwsWafregionalSizeconstraintset = {
  Id?: string;
  /** @uniqueItems false */
  SizeConstraints?: {
    ComparisonOperator: string;
    Size: number;
    TextTransformation: string;
    FieldToMatch: {
      Type: string;
      Data?: string;
    };
  }[];
  Name: string;
};
