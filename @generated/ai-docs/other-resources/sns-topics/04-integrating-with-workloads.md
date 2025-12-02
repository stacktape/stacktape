# Integrating with workloads

You can trigger a [function](../../compute-resources/functions//index.md) or a [batch job](../../compute-resources/batch-jobs//index.md) whenever a message is published to an SNS topic.

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
        - type: sns
          properties:
            snsTopicName: mySnsTopic
      # {stop-highlight}

  mySnsTopic:
    type: sns-topic
```

> A Lambda function with an SNS topic integration.