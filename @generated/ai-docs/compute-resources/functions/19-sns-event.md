# SNS event

Triggers the function when a message is published to an [SNS topic](../../../other-resources/sns-topics.md).

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