// This file is auto-generated. Do not edit manually.
// Source: aws-macie-allowlist.json

/** Macie AllowList resource schema */
export type AwsMacieAllowlist = {
  /** Name of AllowList. */
  Name: string;
  /** Description of AllowList. */
  Description?: string;
  /** AllowList criteria. */
  Criteria: unknown | unknown;
  /** AllowList ID. */
  Id?: string;
  /** AllowList ARN. */
  Arn?: string;
  /** AllowList status. */
  Status?: "OK" | "S3_OBJECT_NOT_FOUND" | "S3_USER_ACCESS_DENIED" | "S3_OBJECT_ACCESS_DENIED" | "S3_THROTTLED" | "S3_OBJECT_OVERSIZE" | "S3_OBJECT_EMPTY" | "UNKNOWN_ERROR";
  /** A collection of tags associated with a resource */
  Tags?: {
    /** The tag's key. */
    Key: string;
    /** The tag's value. */
    Value: string;
  }[];
};
