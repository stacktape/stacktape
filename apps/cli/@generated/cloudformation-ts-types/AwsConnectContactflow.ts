// This file is auto-generated. Do not edit manually.
// Source: aws-connect-contactflow.json

/** Resource Type definition for AWS::Connect::ContactFlow */
export type AwsConnectContactflow = {
  /**
   * The identifier of the Amazon Connect instance (ARN).
   * @minLength 1
   * @maxLength 256
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /**
   * The identifier of the contact flow (ARN).
   * @minLength 1
   * @maxLength 500
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/contact-flow/[-a-zA-Z0-9]*$
   */
  ContactFlowArn?: string;
  /**
   * The name of the contact flow.
   * @minLength 1
   * @maxLength 127
   */
  Name: string;
  /**
   * The content of the contact flow in JSON format.
   * @minLength 1
   * @maxLength 256000
   */
  Content: string;
  /**
   * The description of the contact flow.
   * @maxLength 500
   */
  Description?: string;
  /**
   * The state of the contact flow.
   * @enum ["ACTIVE","ARCHIVED"]
   */
  State?: "ACTIVE" | "ARCHIVED";
  /**
   * The type of the contact flow.
   * @enum ["CONTACT_FLOW","CUSTOMER_QUEUE","CUSTOMER_HOLD","CUSTOMER_WHISPER","AGENT_HOLD","AGENT_WHISPER","OUTBOUND_WHISPER","AGENT_TRANSFER","QUEUE_TRANSFER","CAMPAIGN"]
   */
  Type: "CONTACT_FLOW" | "CUSTOMER_QUEUE" | "CUSTOMER_HOLD" | "CUSTOMER_WHISPER" | "AGENT_HOLD" | "AGENT_WHISPER" | "OUTBOUND_WHISPER" | "AGENT_TRANSFER" | "QUEUE_TRANSFER" | "CAMPAIGN";
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
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. . You can specify a value that is maximum of 256 Unicode characters in
     * length and cannot be prefixed with aws:. You can use any of the following characters: the set of
     * Unicode letters, digits, whitespace, _, ., /, =, +, and -.
     * @maxLength 256
     */
    Value: string;
  }[];
};
