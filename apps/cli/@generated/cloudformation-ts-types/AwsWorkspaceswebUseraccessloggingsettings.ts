// This file is auto-generated. Do not edit manually.
// Source: aws-workspacesweb-useraccessloggingsettings.json

/** Definition of AWS::WorkSpacesWeb::UserAccessLoggingSettings Resource Type */
export type AwsWorkspaceswebUseraccessloggingsettings = {
  AssociatedPortalArns?: string[];
  /**
   * Kinesis stream ARN to which log events are published.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:[\w+=/,.@-]+:kinesis:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:stream/.+
   */
  KinesisStreamArn: string;
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
  }[];
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:[a-zA-Z0-9\-]+:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:[a-zA-Z]+(\/[a-fA-F0-9\-]{36})+$
   */
  UserAccessLoggingSettingsArn?: string;
};
