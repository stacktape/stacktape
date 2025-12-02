# Cloudwatch Log event

Triggers the function when a log record is added to a CloudWatch log group.

```yaml
resources:
  myLogProducingLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: lambdas/log-producer.ts
  myLogConsumingLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: lambdas/log-consumer.ts
      events:
        - type: cloudwatch-log
          properties:
            logGroupArn: $ResourceParam('myLogProducingLambda', 'arn')
```