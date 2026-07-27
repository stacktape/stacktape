// This file is auto-generated. Do not edit manually.
// Source: aws-sns-subscription.json

/** Resource Type definition for AWS::SNS::Subscription */
export type AwsSnsSubscription = {
  /** Arn of the subscription */
  Arn?: string;
  /**
   * Specifies whether Amazon SNS resends the notification to the subscription when a message's
   * attribute changes.
   */
  ReplayPolicy?: Record<string, unknown> | string;
  /**
   * When set to true, enables raw message delivery. Raw messages don't contain any JSON formatting and
   * can be sent to Amazon SQS and HTTP/S endpoints.
   */
  RawMessageDelivery?: boolean;
  /** The subscription's endpoint. The endpoint value depends on the protocol that you specify. */
  Endpoint?: string;
  /**
   * The filter policy JSON assigned to the subscription. Enables the subscriber to filter out unwanted
   * messages.
   */
  FilterPolicy?: Record<string, unknown> | string;
  /** The ARN of the topic to subscribe to. */
  TopicArn: string;
  /**
   * When specified, sends undeliverable messages to the specified Amazon SQS dead-letter queue.
   * Messages that can't be delivered due to client errors are held in the dead-letter queue for further
   * analysis or reprocessing.
   */
  RedrivePolicy?: Record<string, unknown> | string;
  /**
   * The delivery policy JSON assigned to the subscription. Enables the subscriber to define the message
   * delivery retry strategy in the case of an HTTP/S endpoint subscribed to the topic.
   */
  DeliveryPolicy?: Record<string, unknown> | string;
  /**
   * For cross-region subscriptions, the region in which the topic resides.If no region is specified,
   * AWS CloudFormation uses the region of the caller as the default.
   */
  Region?: string;
  /** This property applies only to Amazon Data Firehose delivery stream subscriptions. */
  SubscriptionRoleArn?: string;
  /**
   * This attribute lets you choose the filtering scope by using one of the following string value
   * types: MessageAttributes (default) and MessageBody.
   */
  FilterPolicyScope?: string;
  /** The subscription's protocol. */
  Protocol: string;
};
