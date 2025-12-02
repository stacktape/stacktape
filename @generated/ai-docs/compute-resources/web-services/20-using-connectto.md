# Using connectTo

The `connectTo` property lets you grant access to other Stacktape-managed resources by simply listing their names. Stacktape automatically configures the required _IAM_ permissions and injects connection details as environment variables into your service.

```yaml
resources:
  photosBucket:
    type: bucket

  myWebService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/index.ts
      # {start-highlight}
      connectTo:
        # access to the bucket
        - photosBucket
        # access to AWS SES
        - aws:ses
      # {stop-highlight}
      resources:
        cpu: 0.25
        memory: 512
```