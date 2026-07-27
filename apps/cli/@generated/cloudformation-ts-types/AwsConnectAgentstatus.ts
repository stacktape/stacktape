// This file is auto-generated. Do not edit manually.
// Source: aws-connect-agentstatus.json

/** Resource Type definition for AWS::Connect::AgentStatus */
export type AwsConnectAgentstatus = {
  /**
   * The identifier of the Amazon Connect instance.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /**
   * The Amazon Resource Name (ARN) of the agent status.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/agent-state/[-a-zA-Z0-9]*$
   */
  AgentStatusArn?: string;
  /**
   * The description of the status.
   * @minLength 1
   * @maxLength 250
   */
  Description?: string;
  /**
   * The name of the status.
   * @minLength 1
   * @maxLength 127
   */
  Name: string;
  /**
   * The display order of the status.
   * @minimum 1
   * @maximum 50
   */
  DisplayOrder?: number;
  /**
   * The state of the status.
   * @enum ["ENABLED","DISABLED"]
   */
  State: "ENABLED" | "DISABLED";
  /**
   * The type of agent status.
   * @enum ["ROUTABLE","CUSTOM","OFFLINE"]
   */
  Type?: "ROUTABLE" | "CUSTOM" | "OFFLINE";
  /** A number indicating the reset order of the agent status. */
  ResetOrderNumber?: boolean;
  /**
   * An array of key-value pairs to apply to this resource.
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
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * Last modified region.
   * @pattern [a-z]{2}(-[a-z]+){1,2}(-[0-9])?
   */
  LastModifiedRegion?: string;
  /** Last modified time. */
  LastModifiedTime?: number;
};
