// This file is auto-generated. Do not edit manually.
// Source: aws-kinesisanalyticsv2-applicationreferencedatasource.json

/** Resource Type definition for AWS::KinesisAnalyticsV2::ApplicationReferenceDataSource */
export type AwsKinesisanalyticsv2Applicationreferencedatasource = {
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
    };
  };
};
