// This file is auto-generated. Do not edit manually.
// Source: aws-kinesisanalytics-applicationoutput.json

/** Resource Type definition for AWS::KinesisAnalytics::ApplicationOutput */
export type AwsKinesisanalyticsApplicationoutput = {
  Id?: string;
  ApplicationName: string;
  Output: {
    DestinationSchema: {
      RecordFormatType?: string;
    };
    LambdaOutput?: {
      ResourceARN: string;
      RoleARN: string;
    };
    KinesisFirehoseOutput?: {
      ResourceARN: string;
      RoleARN: string;
    };
    KinesisStreamsOutput?: {
      ResourceARN: string;
      RoleARN: string;
    };
    Name?: string;
  };
};
