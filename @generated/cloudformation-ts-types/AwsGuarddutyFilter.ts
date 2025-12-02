// This file is auto-generated. Do not edit manually.
// Source: aws-guardduty-filter.json

/** Resource Type definition for AWS::GuardDuty::Filter */
export type AwsGuarddutyFilter = {
  Action?: string;
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 300
   */
  DetectorId: string;
  FindingCriteria: {
    Criterion?: Record<string, {
      Lt?: number;
      Gt?: number;
      Gte?: number;
      /** @uniqueItems false */
      Neq?: string[];
      /** @uniqueItems false */
      Eq?: string[];
      Lte?: number;
      /** @uniqueItems false */
      Equals?: string[];
      GreaterThan?: number;
      GreaterThanOrEqual?: number;
      LessThan?: number;
      LessThanOrEqual?: number;
      /** @uniqueItems false */
      NotEquals?: string[];
    }>;
  };
  /**
   * @minimum 1
   * @maximum 100
   */
  Rank?: number;
  /**
   * @minLength 1
   * @maxLength 64
   */
  Name: string;
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
