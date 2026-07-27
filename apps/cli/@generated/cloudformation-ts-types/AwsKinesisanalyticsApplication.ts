// This file is auto-generated. Do not edit manually.
// Source: aws-kinesisanalytics-application.json

/** Resource Type definition for AWS::KinesisAnalytics::Application */
export type AwsKinesisanalyticsApplication = {
  Id?: string;
  ApplicationName?: string;
  /** @uniqueItems false */
  Inputs: {
    NamePrefix: string;
    InputSchema: {
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
    KinesisStreamsInput?: {
      ResourceARN: string;
      RoleARN: string;
    };
    KinesisFirehoseInput?: {
      ResourceARN: string;
      RoleARN: string;
    };
    InputProcessingConfiguration?: {
      InputLambdaProcessor?: {
        ResourceARN: string;
        RoleARN: string;
      };
    };
    InputParallelism?: {
      Count?: number;
    };
  }[];
  ApplicationDescription?: string;
  ApplicationCode?: string;
};
