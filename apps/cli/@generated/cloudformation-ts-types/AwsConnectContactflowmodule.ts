// This file is auto-generated. Do not edit manually.
// Source: aws-connect-contactflowmodule.json

/** Resource Type definition for AWS::Connect::ContactFlowModule. */
export type AwsConnectContactflowmodule = {
  /**
   * The identifier of the Amazon Connect instance (ARN).
   * @minLength 1
   * @maxLength 256
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /**
   * The identifier of the contact flow module (ARN).
   * @minLength 1
   * @maxLength 256
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/flow-module/[-a-zA-Z0-9]*$
   */
  ContactFlowModuleArn?: string;
  /**
   * The name of the contact flow module.
   * @minLength 1
   * @maxLength 127
   * @pattern .*\S.*
   */
  Name: string;
  /**
   * The content of the contact flow module in JSON format.
   * @minLength 1
   * @maxLength 256000
   */
  Content: string;
  /**
   * The description of the contact flow module.
   * @maxLength 500
   * @pattern .*\S.*
   */
  Description?: string;
  /**
   * The state of the contact flow module.
   * @maxLength 500
   */
  State?: string;
  /**
   * The status of the contact flow module.
   * @maxLength 500
   */
  Status?: string;
  /**
   * One or more tags.
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
     * The value for the tag. You can specify a value that is maximum of 256 Unicode characters in length
     * and cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
