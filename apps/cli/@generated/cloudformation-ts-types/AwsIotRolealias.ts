// This file is auto-generated. Do not edit manually.
// Source: aws-iot-rolealias.json

/** Use the AWS::IoT::RoleAlias resource to declare an AWS IoT RoleAlias. */
export type AwsIotRolealias = {
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [\w=,@-]+
   */
  RoleAlias?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [\w=,@-]+
   */
  RoleAliasArn?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:(aws[a-zA-Z-]*)?:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+
   */
  RoleArn: string;
  /**
   * @default 3600
   * @minimum 900
   * @maximum 43200
   */
  CredentialDurationSeconds?: number;
  /** @uniqueItems true */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 127
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 255
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
  }[];
};
