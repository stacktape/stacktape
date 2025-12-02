// This file is auto-generated. Do not edit manually.
// Source: aws-wafregional-sqlinjectionmatchset.json

/** Resource Type definition for AWS::WAFRegional::SqlInjectionMatchSet */
export type AwsWafregionalSqlinjectionmatchset = {
  Id?: string;
  /** @uniqueItems false */
  SqlInjectionMatchTuples?: {
    TextTransformation: string;
    FieldToMatch: {
      Type: string;
      Data?: string;
    };
  }[];
  Name: string;
};
