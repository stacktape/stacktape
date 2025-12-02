# S3 event

Triggers the function in response to events in an S3 bucket.

```yaml
resources:
  myBucket:
    type: bucket

  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      # {start-highlight}
      events:
        - type: s3
          properties:
            bucketArn: $ResourceParam('myBucket', 'arn')
            s3EventType: 's3:ObjectCreated:*'
            filterRule:
              prefix: order-
              suffix: .jpg
      # {stop-highlight}
```