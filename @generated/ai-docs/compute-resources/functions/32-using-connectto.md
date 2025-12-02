# Using connectTo

The `connectTo` property is a simplified way to grant access to other Stacktape-managed resources.

```yaml
resources:
  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
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