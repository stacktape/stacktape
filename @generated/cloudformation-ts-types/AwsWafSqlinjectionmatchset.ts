// This file is auto-generated. Do not edit manually.
// Source: aws-waf-sqlinjectionmatchset.json

/** Resource Type definition for AWS::WAF::SqlInjectionMatchSet */
export type AwsWafSqlinjectionmatchset = {
  Id?: string;
  Name: string;
  /** @uniqueItems true */
  SqlInjectionMatchTuples?: {
    FieldToMatch: {
      Data?: string;
      Type: string;
    };
    TextTransformation: string;
  }[];
};
