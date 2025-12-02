# SNS event

Triggers the job when a message is published to an [SNS topic](../../../other-resources/sns-topics.md).

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
        - type: sns
          properties:
            topicName: mySnsTopic
      # {stop-highlight}

  mySnsTopic:
    type: sns-topic
```