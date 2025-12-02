# SQS event

Triggers the function when messages are available in an [SQS queue](../../../other-resources/sqs-queues.md).

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