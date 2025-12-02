// This file is auto-generated. Do not edit manually.
// Source: aws-connect-queue.json

/** Resource Type definition for AWS::Connect::Queue */
export type AwsConnectQueue = {
  /**
   * The identifier of the Amazon Connect instance.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  InstanceArn: string;
  /**
   * The description of the queue.
   * @minLength 1
   * @maxLength 250
   */
  Description?: string;
  /**
   * The identifier for the hours of operation.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/operating-hours/[-a-zA-Z0-9]*$
   */
  HoursOfOperationArn: string;
  /**
   * The maximum number of contacts that can be in the queue before it is considered full.
   * @minimum 0
   */
  MaxContacts?: number;
  /**
   * The name of the queue.
   * @minLength 1
   * @maxLength 127
   */
  Name: string;
  /** The outbound caller ID name, number, and outbound whisper flow. */
  OutboundCallerConfig?: {
    OutboundCallerIdName?: string;
    OutboundCallerIdNumberArn?: string;
    OutboundFlowArn?: string;
  };
  /** The outbound email address ID. */
  OutboundEmailConfig?: {
    OutboundEmailAddressId?: string;
  };
  /**
   * The Amazon Resource Name (ARN) for the queue.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/queue/[-a-zA-Z0-9]*$
   */
  QueueArn?: string;
  /**
   * The status of the queue.
   * @enum ["ENABLED","DISABLED"]
   */
  Status?: "ENABLED" | "DISABLED";
  /**
   * The quick connects available to agents who are working the queue.
   * @minItems 1
   */
  QuickConnectArns?: string[];
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  /**
   * The type of queue.
   * @enum ["STANDARD","AGENT"]
   */
  Type?: "STANDARD" | "AGENT";
};
