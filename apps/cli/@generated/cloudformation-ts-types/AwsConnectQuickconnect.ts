// This file is auto-generated. Do not edit manually.
// Source: aws-connect-quickconnect.json

/** Resource Type definition for AWS::Connect::QuickConnect */
export type AwsConnectQuickconnect = {
  /**
   * The identifier of the Amazon Connect instance.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /**
   * The name of the quick connect.
   * @minLength 1
   * @maxLength 127
   */
  Name: string;
  /**
   * The description of the quick connect.
   * @minLength 1
   * @maxLength 250
   */
  Description?: string;
  /** Configuration settings for the quick connect. */
  QuickConnectConfig: {
    QuickConnectType: "PHONE_NUMBER" | "QUEUE" | "USER";
    PhoneConfig?: {
      PhoneNumber: string;
    };
    QueueConfig?: {
      ContactFlowArn: string;
      QueueArn: string;
    };
    UserConfig?: {
      ContactFlowArn: string;
      UserArn: string;
    };
  };
  /**
   * The Amazon Resource Name (ARN) for the quick connect.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/transfer-destination/[-a-zA-Z0-9]*$
   */
  QuickConnectArn?: string;
  /**
   * One or more tags.
   * @maxItems 200
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
     * The value for the tag. You can specify a value that is maximum of 256 Unicode characters in length
     * and cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * The type of quick connect. In the Amazon Connect console, when you create a quick connect, you are
   * prompted to assign one of the following types: Agent (USER), External (PHONE_NUMBER), or Queue
   * (QUEUE).
   * @enum ["PHONE_NUMBER","QUEUE","USER"]
   */
  QuickConnectType?: "PHONE_NUMBER" | "QUEUE" | "USER";
};
