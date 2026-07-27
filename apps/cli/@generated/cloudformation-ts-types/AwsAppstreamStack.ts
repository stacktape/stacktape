// This file is auto-generated. Do not edit manually.
// Source: aws-appstream-stack.json

/** Resource Type definition for AWS::AppStream::Stack */
export type AwsAppstreamStack = {
  Description?: string;
  /** @uniqueItems false */
  StorageConnectors?: {
    /** @uniqueItems false */
    Domains?: string[];
    ResourceIdentifier?: string;
    ConnectorType: string;
  }[];
  DeleteStorageConnectors?: boolean;
  /** @uniqueItems false */
  EmbedHostDomains?: string[];
  /** @uniqueItems false */
  UserSettings?: {
    Permission: string;
    Action: string;
    MaximumLength?: number;
  }[];
  /** @uniqueItems false */
  AttributesToDelete?: string[];
  RedirectURL?: string;
  StreamingExperienceSettings?: {
    PreferredProtocol?: string;
  };
  Name?: string;
  FeedbackURL?: string;
  ApplicationSettings?: {
    SettingsGroup?: string;
    Enabled: boolean;
  };
  DisplayName?: string;
  Id?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  /** @uniqueItems false */
  AccessEndpoints?: {
    EndpointType: string;
    VpceId: string;
  }[];
};
