import { Construct } from 'constructs';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { CfnOutput, Duration } from 'aws-cdk-lib';

export default class NotificationTopic extends Construct {
  readonly topicArnOutput: CfnOutput;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    const queue = new Queue(this, 'Queue', { retentionPeriod: Duration.days(4) });
    const topic = new Topic(this, 'Topic', { displayName: 'notifications' });
    topic.addSubscription(new SqsSubscription(queue));
    this.topicArnOutput = new CfnOutput(this, 'TopicArn', { value: topic.topicArn });
  }
}
