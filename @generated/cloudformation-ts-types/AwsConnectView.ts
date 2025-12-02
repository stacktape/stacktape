// This file is auto-generated. Do not edit manually.
// Source: aws-connect-view.json

/** Resource Type definition for AWS::Connect::View */
export type AwsConnectView = {
  /**
   * The Amazon Resource Name (ARN) of the instance.
   * @minLength 1
   * @maxLength 100
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /**
   * The Amazon Resource Name (ARN) of the view.
   * @minLength 1
   * @maxLength 255
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/view/[-:$a-zA-Z0-9]*$
   */
  ViewArn?: string;
  /**
   * The view id of the view.
   * @minLength 1
   * @maxLength 500
   * @pattern ^[a-zA-Z0-9\_\-:\/$]+$
   */
  ViewId?: string;
  /**
   * The name of the view.
   * @minLength 1
   * @maxLength 512
   * @pattern ^([\p{L}\p{N}_.:\/=+\-@]+[\p{L}\p{Z}\p{N}_.:\/=+\-@]*)$
   */
  Name: string;
  /**
   * The description of the view.
   * @minLength 0
   * @maxLength 4096
   * @pattern ^([\p{L}\p{N}_.:\/=+\-@,]+[\p{L}\p{Z}\p{N}_.:\/=+\-@,]*)$
   */
  Description?: string;
  /** The template of the view as JSON. */
  Template: Record<string, unknown>;
  /**
   * The actions of the view in an array.
   * @maxItems 1000
   */
  Actions: string[];
  /**
   * The view content hash.
   * @pattern ^[a-zA-Z0-9]{64}$
   */
  ViewContentSha256?: string;
  /**
   * One or more tags.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. . You can specify a value that is maximum of 256 Unicode characters
     * @maxLength 256
     */
    Value: string;
  }[];
};
