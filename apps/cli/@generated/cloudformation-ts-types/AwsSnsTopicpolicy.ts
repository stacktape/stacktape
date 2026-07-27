// This file is auto-generated. Do not edit manually.
// Source: aws-sns-topicpolicy.json

/**
 * The ``AWS::SNS::TopicPolicy`` resource associates SNS topics with a policy. For an example snippet,
 * see [Declaring an
 * policy](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/quickref-iam.html#scenario-sns-policy)
 * in the *User Guide*.
 */
export type AwsSnsTopicpolicy = {
  Id?: string;
  /** A policy document that contains permissions to add to the specified SNS topics. */
  PolicyDocument: Record<string, unknown> | string;
  /**
   * The Amazon Resource Names (ARN) of the topics to which you want to add the policy. You can use the
   * ``Ref`` function to specify an ``AWS::SNS::Topic`` resource.
   * @uniqueItems false
   */
  Topics: string[];
};
