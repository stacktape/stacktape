// This file is auto-generated. Do not edit manually.
// Source: aws-amplifyuibuilder-theme.json

/** Definition of AWS::AmplifyUIBuilder::Theme Resource Type */
export type AwsAmplifyuibuilderTheme = {
  AppId?: string;
  CreatedAt?: string;
  EnvironmentName?: string;
  Id?: string;
  ModifiedAt?: string;
  /**
   * @minLength 1
   * @maxLength 255
   */
  Name?: string;
  Overrides?: {
    Key?: string;
    Value?: {
      Value?: string;
      Children?: unknown[];
    };
  }[];
  Tags?: Record<string, string>;
  Values?: {
    Key?: string;
    Value?: {
      Value?: string;
      Children?: unknown[];
    };
  }[];
};
