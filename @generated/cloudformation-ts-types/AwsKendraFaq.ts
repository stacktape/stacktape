// This file is auto-generated. Do not edit manually.
// Source: aws-kendra-faq.json

/** A Kendra FAQ resource */
export type AwsKendraFaq = {
  Id?: string;
  /** Index ID */
  IndexId: string;
  /** FAQ name */
  Name: string;
  /** FAQ description */
  Description?: string;
  /** FAQ file format */
  FileFormat?: "CSV" | "CSV_WITH_HEADER" | "JSON";
  /** FAQ S3 path */
  S3Path: {
    Bucket: string;
    Key: string;
  };
  /** FAQ role ARN */
  RoleArn: string;
  /** Tags for labeling the FAQ */
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
  /** @maxLength 1000 */
  Arn?: string;
  LanguageCode?: string;
};
