// This file is auto-generated. Do not edit manually.
// Source: aws-iotfleethub-application.json

/** Resource schema for AWS::IoTFleetHub::Application */
export type AwsIotfleethubApplication = {
  /**
   * The ID of the application.
   * @minLength 36
   * @maxLength 36
   * @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
   */
  ApplicationId?: string;
  /**
   * The ARN of the application.
   * @minLength 1
   * @maxLength 1600
   * @pattern ^arn:[!-~]+$
   */
  ApplicationArn?: string;
  /**
   * Application Name, should be between 1 and 256 characters.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[ -~]*$
   */
  ApplicationName: string;
  /**
   * Application Description, should be between 1 and 2048 characters.
   * @minLength 1
   * @maxLength 2048
   * @pattern ^[ -~]*$
   */
  ApplicationDescription?: string;
  /** The URL of the application. */
  ApplicationUrl?: string;
  /** The current state of the application. */
  ApplicationState?: string;
  /** When the Application was created */
  ApplicationCreationDate?: number;
  /** When the Application was last updated */
  ApplicationLastUpdateDate?: number;
  /**
   * The ARN of the role that the web application assumes when it interacts with AWS IoT Core. For more
   * info on configuring this attribute, see
   * https://docs.aws.amazon.com/iot/latest/apireference/API_iotfleethub_CreateApplication.html#API_iotfleethub_CreateApplication_RequestSyntax
   * @minLength 1
   * @maxLength 1600
   * @pattern ^arn:[!-~]+$
   */
  RoleArn: string;
  /** The AWS SSO application generated client ID (used with AWS SSO APIs). */
  SsoClientId?: string;
  /** A message indicating why Create or Delete Application failed. */
  ErrorMessage?: string;
  /**
   * A list of key-value pairs that contain metadata for the application.
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
