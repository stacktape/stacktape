// This file is auto-generated. Do not edit manually.
// Source: aws-kinesisanalyticsv2-applicationoutput.json

/** Resource Type definition for AWS::KinesisAnalyticsV2::ApplicationOutput */
export type AwsKinesisanalyticsv2Applicationoutput = {
  Id?: string;
  ApplicationName: string;
  Output: {
    DestinationSchema: {
      RecordFormatType?: string;
    };
    LambdaOutput?: {
      ResourceARN: string;
    };
    KinesisFirehoseOutput?: {
      ResourceARN: string;
    };
    KinesisStreamsOutput?: {
      ResourceARN: string;
    };
    Name?: string;
  };
};
