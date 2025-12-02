// This file is auto-generated. Do not edit manually.
// Source: aws-waf-sizeconstraintset.json

/** Resource Type definition for AWS::WAF::SizeConstraintSet */
export type AwsWafSizeconstraintset = {
  Id?: string;
  Name: string;
  /** @uniqueItems true */
  SizeConstraints: {
    ComparisonOperator: string;
    FieldToMatch: {
      Data?: string;
      Type: string;
    };
    Size: number;
    TextTransformation: string;
  }[];
};
