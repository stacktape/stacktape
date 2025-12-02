# S3 event

Triggers the job when a specific event (like `object created`) occurs in an S3 bucket.

```yaml
resources:
  myBucket:
    type: bucket

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
        - type: s3
          properties:
            bucketArn: $ResourceParam('myBucket', 'arn')
            s3EventType: 's3:ObjectCreated:*'
            filterRule:
              prefix: order-
              suffix: .jpg
      # {stop-highlight}
```