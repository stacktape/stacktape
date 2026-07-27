// This file is auto-generated. Do not edit manually.
// Source: aws-macie-findingsfilter.json

/** Macie FindingsFilter resource schema. */
export type AwsMacieFindingsfilter = {
  /** Findings filter name */
  Name: string;
  /** Findings filter description */
  Description?: string;
  /** Findings filter criteria. */
  FindingCriteria: {
    Criterion?: Record<string, {
      gt?: number;
      gte?: number;
      lt?: number;
      lte?: number;
      eq?: string[];
      neq?: string[];
    }>;
  };
  /** Findings filter action. */
  Action?: "ARCHIVE" | "NOOP";
  /** Findings filter position. */
  Position?: number;
  /** Findings filter ID. */
  Id?: string;
  /** Findings filter ARN. */
  Arn?: string;
  /** A collection of tags associated with a resource */
  Tags?: {
    /** The tag's key. */
    Key: string;
    /** The tag's value. */
    Value: string;
  }[];
};
