// This file is auto-generated. Do not edit manually.
// Source: aws-cur-reportdefinition.json

/**
 * The AWS::CUR::ReportDefinition resource creates a Cost & Usage Report with user-defined settings.
 * You can use this resource to define settings like time granularity (hourly, daily, monthly), file
 * format (Parquet, CSV), and S3 bucket for delivery of these reports.
 */
export type AwsCurReportdefinition = {
  /**
   * The name of the report that you want to create. The name must be unique, is case sensitive, and
   * can't include spaces.
   * @minLength 1
   * @maxLength 256
   * @pattern [0-9A-Za-z!\-_.*\'()]+
   */
  ReportName: string;
  /**
   * The granularity of the line items in the report.
   * @enum ["HOURLY","DAILY","MONTHLY"]
   */
  TimeUnit: "HOURLY" | "DAILY" | "MONTHLY";
  /**
   * The format that AWS saves the report in.
   * @enum ["textORcsv","Parquet"]
   */
  Format: "textORcsv" | "Parquet";
  /**
   * The compression format that AWS uses for the report.
   * @enum ["ZIP","GZIP","Parquet"]
   */
  Compression: "ZIP" | "GZIP" | "Parquet";
  /**
   * A list of strings that indicate additional content that Amazon Web Services includes in the report,
   * such as individual resource IDs.
   * @default []
   */
  AdditionalSchemaElements?: ("RESOURCES" | "SPLIT_COST_ALLOCATION_DATA" | "MANUAL_DISCOUNT_COMPATIBILITY")[];
  /**
   * The S3 bucket where AWS delivers the report.
   * @minLength 1
   * @maxLength 256
   * @pattern [A-Za-z0-9_\.\-]+
   */
  S3Bucket: string;
  /**
   * The prefix that AWS adds to the report name when AWS delivers the report. Your prefix can't include
   * spaces.
   * @minLength 1
   * @maxLength 256
   * @pattern [0-9A-Za-z!\-_.*\'()/]*
   */
  S3Prefix: string;
  /** The region of the S3 bucket that AWS delivers the report into. */
  S3Region: string;
  /**
   * A list of manifests that you want Amazon Web Services to create for this report.
   * @default []
   */
  AdditionalArtifacts?: ("REDSHIFT" | "QUICKSIGHT" | "ATHENA")[];
  /**
   * Whether you want Amazon Web Services to update your reports after they have been finalized if
   * Amazon Web Services detects charges related to previous months. These charges can include refunds,
   * credits, or support fees.
   */
  RefreshClosedReports: boolean;
  /**
   * Whether you want Amazon Web Services to overwrite the previous version of each report or to deliver
   * the report in addition to the previous versions.
   * @enum ["CREATE_NEW_REPORT","OVERWRITE_REPORT"]
   */
  ReportVersioning: "CREATE_NEW_REPORT" | "OVERWRITE_REPORT";
  /**
   * The Amazon resource name of the billing view. You can get this value by using the billing view
   * service public APIs.
   * @default null
   * @minLength 1
   * @maxLength 128
   * @pattern (arn:aws(-cn)?:billing::[0-9]{12}:billingview/)?[a-zA-Z0-9_\+=\.\-@].{1,30}
   */
  BillingViewArn?: string;
  /**
   * @minItems 0
   * @maxItems 100
   */
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
