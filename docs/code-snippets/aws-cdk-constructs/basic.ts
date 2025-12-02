import { Duration } from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class MyConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: { visibilityTimeout: number }) {
    super(scope, id);
    const queue = new sqs.Queue(this, 'Queue', {
      visibilityTimeout: Duration.seconds(props?.visibilityTimeout || 300)
    });

    const topic = new sns.Topic(this, 'Topic');

    topic.addSubscription(new subs.SqsSubscription(queue));
  }
}
