// This file is auto-generated. Do not edit manually.
// Source: aws-deadline-limit.json

/** Definition of AWS::Deadline::Limit Resource Type */
export type AwsDeadlineLimit = {
  /** @maxLength 1024 */
  AmountRequirementName: string;
  /**
   * @minimum 0
   * @maximum 2147483647
   */
  CurrentCount?: number;
  /**
   * @default ""
   * @minLength 0
   * @maxLength 100
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  DisplayName: string;
  /** @pattern ^farm-[0-9a-f]{32}$ */
  FarmId: string;
  /** @pattern ^limit-[0-9a-f]{32}$ */
  LimitId?: string;
  /**
   * @minimum -1
   * @maximum 2147483647
   */
  MaxCount: number;
};
