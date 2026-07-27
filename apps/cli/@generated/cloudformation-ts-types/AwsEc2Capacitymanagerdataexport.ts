// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-capacitymanagerdataexport.json

/** Resource Type definition for AWS::EC2::CapacityManagerDataExport */
export type AwsEc2Capacitymanagerdataexport = {
  /** The unique identifier of the capacity manager data export. */
  CapacityManagerDataExportId?: string;
  /**
   * The name of the Amazon S3 bucket where the capacity manager data export will be stored. The bucket
   * must exist and be accessible by EC2 Capacity Manager service.
   */
  S3BucketName: string;
  /**
   * The prefix for the S3 bucket location where exported files will be placed. If not specified, files
   * will be placed in the root of the bucket.
   */
  S3BucketPrefix?: string;
  /**
   * The schedule for the capacity manager data export. Currently supports hourly exports that provide
   * periodic snapshots of capacity manager data.
   * @enum ["hourly"]
   */
  Schedule: "hourly";
  /**
   * The format of the exported capacity manager data. Choose 'csv' for comma-separated values or
   * 'parquet' for optimized columnar storage format.
   * @enum ["csv","parquet"]
   */
  OutputFormat: "csv" | "parquet";
  /**
   * An array of key-value pairs to apply to the capacity manager data export.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
