// This file is auto-generated. Do not edit manually.
// Source: aws-omics-rungroup.json

/** Definition of AWS::Omics::RunGroup Resource Type */
export type AwsOmicsRungroup = {
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^arn:.+$
   */
  Arn?: string;
  CreationTime?: string;
  /**
   * @minLength 1
   * @maxLength 18
   * @pattern ^[0-9]+$
   */
  Id?: string;
  /**
   * @minimum 1
   * @maximum 100000
   */
  MaxCpus?: number;
  /**
   * @minimum 1
   * @maximum 100000
   */
  MaxGpus?: number;
  /**
   * @minimum 1
   * @maximum 100000
   */
  MaxDuration?: number;
  /**
   * @minimum 1
   * @maximum 100000
   */
  MaxRuns?: number;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^[\p{L}||\p{M}||\p{Z}||\p{S}||\p{N}||\p{P}]+$
   */
  Name?: string;
  Tags?: Record<string, string>;
};
