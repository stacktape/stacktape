# Using connectTo

The `connectTo` property is a simplified way to grant basic access to other Stacktape-managed resources. It automatically configures the necessary _IAM_ permissions and injects environment variables with connection details into your batch job.

```yaml
resources:
  photosBucket:
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
      connectTo:
        # access to the bucket
        - photosBucket
        # access to AWS SES
        - aws:ses
      # {stop-highlight}
```