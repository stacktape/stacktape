# SQS event

Triggers the job when messages are available in an [SQS queue](../../../other-resources/sqs-queues.md). Messages are processed in batches. If the job fails to start, messages return to the queue after the visibility timeout. If the job starts but then fails, the messages are considered processed.

A single queue should be consumed by a single compute resource. If you need a fan-out pattern, consider using an SNS or EventBus integration.

```yaml
resources:
  myBatchJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: path/to/my/batch-job.ts
      resources:
        cpu: 2
        memory: 1800
      # {start-highlight}
      events:
        - type: sqs
          properties:
            sqsQueueName: mySqsQueue
      # {stop-highlight}

  mySqsQueue:
    type: sqs-queue
```