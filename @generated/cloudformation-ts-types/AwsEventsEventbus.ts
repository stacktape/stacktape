// This file is auto-generated. Do not edit manually.
// Source: aws-events-eventbus.json

/** Resource type definition for AWS::Events::EventBus */
export type AwsEventsEventbus = {
  /**
   * If you are creating a partner event bus, this specifies the partner event source that the new event
   * bus will be matched with.
   */
  EventSourceName?: string;
  /** The name of the event bus. */
  Name: string;
  /**
   * Any tags assigned to the event bus.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  /** The description of the event bus. */
  Description?: string;
  /** Kms Key Identifier used to encrypt events at rest in the event bus. */
  KmsKeyIdentifier?: string;
  /** A JSON string that describes the permission policy statement for the event bus. */
  Policy?: Record<string, unknown> | string;
  /** The Amazon Resource Name (ARN) for the event bus. */
  Arn?: string;
  /** Dead Letter Queue for the event bus. */
  DeadLetterConfig?: {
    Arn?: string;
  };
  /** The logging configuration settings for vended logs. */
  LogConfig?: {
    /**
     * Configures whether or not to include event detail, input transformer details, target properties,
     * and target input in the applicable log messages.
     * @enum ["FULL","NONE"]
     */
    IncludeDetail?: "FULL" | "NONE";
    /**
     * Configures the log level of the EventBus and determines which log messages are sent to Ingestion
     * Hub for delivery.
     * @enum ["INFO","ERROR","TRACE","OFF"]
     */
    Level?: "INFO" | "ERROR" | "TRACE" | "OFF";
  };
};
