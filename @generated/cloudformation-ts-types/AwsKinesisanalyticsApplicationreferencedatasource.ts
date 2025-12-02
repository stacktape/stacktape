// This file is auto-generated. Do not edit manually.
// Source: aws-kinesisanalytics-applicationreferencedatasource.json

/** Resource Type definition for AWS::KinesisAnalytics::ApplicationReferenceDataSource */
export type AwsKinesisanalyticsApplicationreferencedatasource = {
  Id?: string;
  ApplicationName: string;
  ReferenceDataSource: {
    ReferenceSchema: {
      RecordEncoding?: string;
      /** @uniqueItems false */
      RecordColumns: {
        Mapping?: string;
        SqlType: string;
        Name: string;
      }[];
      RecordFormat: {
        MappingParameters?: {
          JSONMappingParameters?: {
            RecordRowPath: string;
          };
          CSVMappingParameters?: {
            RecordRowDelimiter: string;
            RecordColumnDelimiter: string;
          };
        };
        RecordFormatType: string;
      };
    };
    TableName?: string;
    S3ReferenceDataSource?: {
      BucketARN: string;
      FileKey: string;
      ReferenceRoleARN: string;
    };
  };
};
