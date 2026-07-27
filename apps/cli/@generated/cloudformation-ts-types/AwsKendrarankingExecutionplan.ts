// This file is auto-generated. Do not edit manually.
// Source: aws-kendraranking-executionplan.json

/** A KendraRanking Rescore execution plan */
export type AwsKendrarankingExecutionplan = {
  Id?: string;
  Arn?: string;
  /** A description for the execution plan */
  Description?: string;
  /** Tags for labeling the execution plan */
  Tags?: {
    /**
     * A string used to identify this tag
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A string containing the value for the tag
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  Name: string;
  /** Capacity units */
  CapacityUnits?: {
    RescoreCapacityUnits: number;
  };
};
