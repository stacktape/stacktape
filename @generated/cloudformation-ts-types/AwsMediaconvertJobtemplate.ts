// This file is auto-generated. Do not edit manually.
// Source: aws-mediaconvert-jobtemplate.json

/** Resource Type definition for AWS::MediaConvert::JobTemplate */
export type AwsMediaconvertJobtemplate = {
  Category?: string;
  Description?: string;
  AccelerationSettings?: {
    Mode: string;
  };
  Priority?: number;
  StatusUpdateInterval?: string;
  SettingsJson: Record<string, unknown>;
  Id?: string;
  Arn?: string;
  Queue?: string;
  /** @uniqueItems false */
  HopDestinations?: {
    WaitMinutes?: number;
    Queue?: string;
    Priority?: number;
  }[];
  Tags?: Record<string, unknown>;
  Name?: string;
};
