// This file is auto-generated. Do not edit manually.
// Source: aws-ivschat-room.json

/** Resource type definition for AWS::IVSChat::Room. */
export type AwsIvschatRoom = {
  /**
   * Room ARN is automatically generated on creation and assigned as the unique identifier.
   * @minLength 1
   * @maxLength 128
   * @pattern ^arn:aws:ivschat:[a-z0-9-]+:[0-9]+:room/[a-zA-Z0-9-]+$
   */
  Arn?: string;
  /**
   * The system-generated ID of the room.
   * @minLength 12
   * @maxLength 12
   * @pattern ^[a-zA-Z0-9]+$
   */
  Id?: string;
  /**
   * The name of the room. The value does not need to be unique.
   * @minLength 0
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-_]*$
   */
  Name?: string;
  /**
   * Array of logging configuration identifiers attached to the room.
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  LoggingConfigurationIdentifiers?: string[];
  /**
   * The maximum number of characters in a single message.
   * @default 500
   * @minimum 1
   * @maximum 500
   */
  MaximumMessageLength?: number;
  /**
   * The maximum number of messages per second that can be sent to the room.
   * @default 10
   * @minimum 1
   * @maximum 10
   */
  MaximumMessageRatePerSecond?: number;
  MessageReviewHandler?: {
    /**
     * Specifies the fallback behavior if the handler does not return a valid response, encounters an
     * error, or times out.
     * @default "ALLOW"
     * @enum ["ALLOW","DENY"]
     */
    FallbackResult?: "ALLOW" | "DENY";
    /**
     * Identifier of the message review handler.
     * @minLength 0
     * @maxLength 170
     * @pattern ^$|^arn:aws:lambda:[a-z0-9-]+:[0-9]{12}:function:.+
     */
    Uri?: string;
  };
  /**
   * An array of key-value pairs to apply to this resource.
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
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
