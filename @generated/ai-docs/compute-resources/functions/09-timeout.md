# Timeout

Sets the maximum execution time for the function in seconds. The default is 3 seconds, and the maximum is 900 seconds (15 minutes).

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
      timeout: 300
      # {stop-highlight}
```