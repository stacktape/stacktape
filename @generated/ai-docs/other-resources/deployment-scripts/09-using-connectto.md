# Using connectTo

The `connectTo` property lets you grant access to other Stacktape-managed resources by simply listing their names. Stacktape automatically configures the required _IAM_ permissions and injects connection details as environment variables into your script.

```yaml
resources:
  myScript:
    type: deployment-script
    properties:
      trigger: after:deploy
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-script.ts
      environment:
        - name: MY_BUCKET_NAME
          value: $ResourceParam('myBucket', 'name')
      # {start-highlight}
      connectTo:
        # access to the bucket
        - myBucket
        # access to AWS SES
        - aws:ses
      # {stop-highlight}

  myBucket:
    type: bucket
```