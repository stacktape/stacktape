// This file is auto-generated. Do not edit manually.
// Source: aws-codebuild-reportgroup.json

/** Resource Type definition for AWS::CodeBuild::ReportGroup */
export type AwsCodebuildReportgroup = {
  Type: string;
  ExportConfig: {
    S3Destination?: {
      Path?: string;
      Bucket: string;
      Packaging?: string;
      EncryptionKey?: string;
      BucketOwner?: string;
      EncryptionDisabled?: boolean;
    };
    ExportConfigType: string;
  };
  Id?: string;
  Arn?: string;
  DeleteReports?: boolean;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  Name?: string;
};
