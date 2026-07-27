// This file is auto-generated. Do not edit manually.
// Source: aws-appconfig-extension.json

/** Resource Type definition for AWS::AppConfig::Extension */
export type AwsAppconfigExtension = {
  Id?: string;
  Arn?: string;
  VersionNumber?: number;
  /** Name of the extension. */
  Name: string;
  /** Description of the extension. */
  Description?: string;
  Actions: Record<string, {
    /**
     * The name of the extension action.
     * @minLength 1
     * @maxLength 128
     */
    Name: string;
    /**
     * The description of the extension Action.
     * @minLength 0
     * @maxLength 1024
     */
    Description?: string;
    /**
     * The URI of the extension action.
     * @minLength 1
     * @maxLength 2048
     */
    Uri: string;
    /**
     * The ARN of the role for invoking the extension action.
     * @minLength 20
     * @maxLength 2048
     */
    RoleArn?: string;
  }[]>;
  Parameters?: Record<string, {
    /**
     * The description of the extension Parameter.
     * @minLength 0
     * @maxLength 1024
     */
    Description?: string;
    Dynamic?: boolean;
    Required: boolean;
  }>;
  LatestVersionNumber?: number;
  /**
   * An array of key-value tags to apply to this resource.
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
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
