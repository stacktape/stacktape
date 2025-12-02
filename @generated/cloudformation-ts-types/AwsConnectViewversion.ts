// This file is auto-generated. Do not edit manually.
// Source: aws-connect-viewversion.json

/** Resource Type definition for AWS::Connect::ViewVersion */
export type AwsConnectViewversion = {
  /**
   * The Amazon Resource Name (ARN) of the view for which a version is being created.
   * @minLength 1
   * @maxLength 255
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/view/[-:a-zA-Z0-9]*$
   */
  ViewArn: string;
  /**
   * The Amazon Resource Name (ARN) of the created view version.
   * @minLength 1
   * @maxLength 255
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/view/[-:a-zA-Z0-9]*$
   */
  ViewVersionArn?: string;
  /**
   * The description for the view version.
   * @minLength 1
   * @maxLength 4096
   * @pattern ^([\p{L}\p{N}_.:\/=+\-@,]+[\p{L}\p{Z}\p{N}_.:\/=+\-@,]*)$
   */
  VersionDescription?: string;
  /**
   * The view content hash to be checked.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9]{64}$
   */
  ViewContentSha256?: string;
  /** The version of the view. */
  Version?: number;
};
