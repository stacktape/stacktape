// This file is auto-generated. Do not edit manually.
// Source: aws-appconfig-application.json

/** Resource Type definition for AWS::AppConfig::Application */
export type AwsAppconfigApplication = {
  /** A description of the application. */
  Description?: string;
  /** The application Id */
  ApplicationId?: string;
  /**
   * Metadata to assign to the application. Tags help organize and categorize your AWS AppConfig
   * resources. Each tag consists of a key and an optional value, both of which you define.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key-value string map. The valid character set is [a-zA-Z1-9 +-=._:/-]. The tag key can be up to
     * 128 characters and must not start with aws:.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The tag value can be up to 256 characters.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** A name for the application. */
  Name: string;
};
