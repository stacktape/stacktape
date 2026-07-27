// This file is auto-generated. Do not edit manually.
// Source: aws-inspectorv2-cisscanconfiguration.json

/** CIS Scan Configuration resource schema */
export type AwsInspectorv2Cisscanconfiguration = {
  /**
   * Name of the scan
   * @minLength 1
   */
  ScanName: string;
  SecurityLevel: "LEVEL_1" | "LEVEL_2";
  Schedule: unknown;
  Targets: unknown;
  /** CIS Scan configuration unique identifier */
  Arn?: string;
  Tags?: Record<string, string>;
};
