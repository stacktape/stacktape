// This file is auto-generated. Do not edit manually.
// Source: aws-config-configurationrecorder.json

/** Resource Type definition for AWS::Config::ConfigurationRecorder */
export type AwsConfigConfigurationrecorder = {
  Id?: string;
  RecordingGroup?: {
    IncludeGlobalResourceTypes?: boolean;
    /** @uniqueItems true */
    ResourceTypes?: string[];
    RecordingStrategy?: {
      UseOnly: string;
    };
    ExclusionByResourceTypes?: {
      /** @uniqueItems true */
      ResourceTypes: string[];
    };
    AllSupported?: boolean;
  };
  RecordingMode?: {
    /** @uniqueItems true */
    RecordingModeOverrides?: {
      /** @uniqueItems true */
      ResourceTypes: string[];
      RecordingFrequency: string;
      Description?: string;
    }[];
    RecordingFrequency: string;
  };
  RoleARN: string;
  Name?: string;
};
