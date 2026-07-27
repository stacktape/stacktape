// This file is auto-generated. Do not edit manually.
// Source: aws-appconfig-hostedconfigurationversion.json

/** Resource Type definition for AWS::AppConfig::HostedConfigurationVersion */
export type AwsAppconfigHostedconfigurationversion = {
  /**
   * The configuration profile ID.
   * @pattern [a-z0-9]{4,7}
   */
  ConfigurationProfileId: string;
  /**
   * A description of the hosted configuration version.
   * @minLength 0
   * @maxLength 1024
   */
  Description?: string;
  /**
   * A standard MIME type describing the format of the configuration content.
   * @minLength 1
   * @maxLength 255
   */
  ContentType: string;
  /**
   * An optional locking token used to prevent race conditions from overwriting configuration updates
   * when creating a new version. To ensure your data is not overwritten when creating multiple hosted
   * configuration versions in rapid succession, specify the version number of the latest hosted
   * configuration version.
   */
  LatestVersionNumber?: number;
  /** The content of the configuration or the configuration data. */
  Content: string;
  /**
   * A user-defined label for an AWS AppConfig hosted configuration version.
   * @minLength 0
   * @maxLength 64
   * @pattern ^$|.*[^0-9].*
   */
  VersionLabel?: string;
  /**
   * The application ID.
   * @pattern [a-z0-9]{4,7}
   */
  ApplicationId: string;
  /** Current version number of hosted configuration version. */
  VersionNumber?: string;
};
