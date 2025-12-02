// This file is auto-generated. Do not edit manually.
// Source: aws-iot-topicruledestination.json

/** Resource Type definition for AWS::IoT::TopicRuleDestination */
export type AwsIotTopicruledestination = {
  /** Amazon Resource Name (ARN). */
  Arn?: string;
  /** The status of the TopicRuleDestination. */
  Status?: "ENABLED" | "IN_PROGRESS" | "DISABLED";
  /** HTTP URL destination properties. */
  HttpUrlProperties?: {
    ConfirmationUrl?: string;
  };
  /** The reasoning for the current status of the TopicRuleDestination. */
  StatusReason?: string;
  /** VPC destination properties. */
  VpcProperties?: {
    /** @uniqueItems true */
    SubnetIds?: string[];
    /** @uniqueItems true */
    SecurityGroups?: string[];
    VpcId?: string;
    RoleArn?: string;
  };
};
