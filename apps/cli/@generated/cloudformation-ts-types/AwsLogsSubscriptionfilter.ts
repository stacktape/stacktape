// This file is auto-generated. Do not edit manually.
// Source: aws-logs-subscriptionfilter.json

/**
 * The ``AWS::Logs::SubscriptionFilter`` resource specifies a subscription filter and associates it
 * with the specified log group. Subscription filters allow you to subscribe to a real-time stream of
 * log events and have them delivered to a specific destination. Currently, the supported destinations
 * are:
 * +  An Amazon Kinesis data stream belonging to the same account as the subscription filter, for
 * same-account delivery.
 * +  A logical destination that belongs to a different account, for cross-account delivery.
 * +  An Amazon Kinesis Firehose delivery stream that belongs to the same account as the
 * subscription filter, for same-account delivery.
 * +  An LAMlong function that belongs to the same account as the subscription filter, for
 * same-account delivery.
 * There can be as many as two subscription filters associated with a log group.
 */
export type AwsLogsSubscriptionfilter = {
  /** The name of the subscription filter. */
  FilterName?: string;
  /** The Amazon Resource Name (ARN) of the destination. */
  DestinationArn: string;
  /**
   * The filtering expressions that restrict what gets delivered to the destination AWS resource. For
   * more information about the filter pattern syntax, see [Filter and Pattern
   * Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html).
   */
  FilterPattern: string;
  /**
   * The log group to associate with the subscription filter. All log events that are uploaded to this
   * log group are filtered and delivered to the specified AWS resource if the filter pattern matches
   * the log events.
   */
  LogGroupName: string;
  /**
   * The ARN of an IAM role that grants CWL permissions to deliver ingested log events to the
   * destination stream. You don't need to provide the ARN when you are working with a logical
   * destination for cross-account delivery.
   */
  RoleArn?: string;
  /**
   * The method used to distribute log data to the destination, which can be either random or grouped by
   * log stream.
   * @enum ["Random","ByLogStream"]
   */
  Distribution?: "Random" | "ByLogStream";
  /**
   * This parameter is valid only for log groups that have an active log transformer. For more
   * information about log transformers, see
   * [PutTransformer](https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutTransformer.html).
   * If this value is ``true``, the subscription filter is applied on the transformed version of the
   * log events instead of the original ingested log events.
   */
  ApplyOnTransformedLogs?: boolean;
  /**
   * @minLength 0
   * @maxLength 2000
   */
  FieldSelectionCriteria?: string;
  EmitSystemFields?: string[];
};
