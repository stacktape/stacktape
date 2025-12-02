// This file is auto-generated. Do not edit manually.
// Source: aws-cognito-logdeliveryconfiguration.json

/** Resource Type definition for AWS::Cognito::LogDeliveryConfiguration */
export type AwsCognitoLogdeliveryconfiguration = {
  Id?: string;
  UserPoolId: string;
  LogConfigurations?: {
    LogLevel?: string;
    EventSource?: string;
    CloudWatchLogsConfiguration?: {
      LogGroupArn?: string;
    };
    S3Configuration?: {
      BucketArn?: string;
    };
    FirehoseConfiguration?: {
      StreamArn?: string;
    };
  }[];
};
