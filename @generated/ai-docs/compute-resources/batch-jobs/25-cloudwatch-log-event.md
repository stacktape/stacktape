# Cloudwatch Log event

Triggers the job when a log record is added to a specified CloudWatch log group. The event payload is BASE64 encoded and GZIP compressed.

```yaml
resources:
  myLogProducingLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: lambdas/log-producer.ts

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
      events:
        - type: cloudwatch-log
          properties:
            logGroupArn: $ResourceParam('myLogProducingLambda', 'arn')
```