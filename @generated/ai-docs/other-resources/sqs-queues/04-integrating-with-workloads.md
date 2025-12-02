# Integrating with workloads

You can trigger a [function](../../compute-resources/functions//index.md) or a [batch job](../../compute-resources/batch-jobs//index.md) whenever messages are available in an SQS queue. Messages are processed in batches. If the function or batch job fails, the messages will reappear in the queue after the visibility timeout.

```yaml
resources:
  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      # {start-highlight}
      events:
        - type: sqs
          properties:
            sqsQueueName: mySqsQueue
      # {stop-highlight}

  mySqsQueue:
    type: sqs-queue
```

> A Lambda function with an SQS queue integration.

You can also receive messages using the AWS SDK, as shown in this worker service example:

```yaml
resources:
  myQueue:
    type: sqs-queue
    properties:
      fifoEnabled: true

  processing:
    type: worker-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: processing.ts
      # {start-highlight}
      connectTo:
        - myQueue
      # {stop-highlight}
      resources:
        cpu: 0.25
        memory: 512
```

```typescript
import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

const sqsClient = new SQSClient({});

const interval = setInterval(async () => {
  try {
    const { Messages } = await sqsClient.send(new ReceiveMessageCommand({ QueueUrl: process.env.STP_MY_QUEUE_URL }));
    if (Messages?.length) {
      // do some message processing
      // .....

      // After processing, delete messages from queue.
      // If you do NOT delete messages, they will become visible after visibility timeout elapses.
      // This can lead to same message being processed twice.
      await Promise.all(
        Messages.map(({ ReceiptHandle }) =>
          sqsClient.send(new DeleteMessageCommand({ QueueUrl: process.env.STP_MY_QUEUE_URL, ReceiptHandle }))
        )
      );
    }
    console.info('Nothing to process');
  } catch (err) {
    // error handling
    console.error(err);
    clearInterval(interval);
  }
}, 10000);
```

> The code for `processing.ts`.