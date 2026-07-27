// This file is auto-generated. Do not edit manually.
// Source: aws-iotwireless-destination.json

/** Destination's resource schema demonstrating some basic constructs and validation rules. */
export type AwsIotwirelessDestination = {
  /**
   * Unique name of destination
   * @maxLength 128
   * @pattern [a-zA-Z0-9:_-]+
   */
  Name: string;
  /** Destination expression */
  Expression: string;
  /**
   * Must be RuleName
   * @enum ["RuleName","MqttTopic","SnsTopic"]
   */
  ExpressionType: "RuleName" | "MqttTopic" | "SnsTopic";
  /**
   * Destination description
   * @maxLength 2048
   */
  Description?: string;
  /**
   * A list of key-value pairs that contain metadata for the destination.
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 127
     */
    Key?: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    Value?: string;
  }[];
  /**
   * AWS role ARN that grants access
   * @minLength 20
   * @maxLength 2048
   */
  RoleArn?: string;
  /** Destination arn. Returned after successful create. */
  Arn?: string;
};
