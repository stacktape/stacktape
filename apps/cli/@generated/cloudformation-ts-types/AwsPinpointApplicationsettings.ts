// This file is auto-generated. Do not edit manually.
// Source: aws-pinpoint-applicationsettings.json

/** Resource Type definition for AWS::Pinpoint::ApplicationSettings */
export type AwsPinpointApplicationsettings = {
  Id?: string;
  QuietTime?: {
    Start: string;
    End: string;
  };
  Limits?: {
    Daily?: number;
    MaximumDuration?: number;
    Total?: number;
    MessagesPerSecond?: number;
  };
  ApplicationId: string;
  CampaignHook?: {
    Mode?: string;
    WebUrl?: string;
    LambdaFunctionName?: string;
  };
  CloudWatchMetricsEnabled?: boolean;
};
