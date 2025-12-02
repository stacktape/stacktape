# Lambda Destinations

For asynchronous invocations, you can configure destinations to handle the results. You can send the output of a function to another service (like SQS, SNS, or another Lambda) on success or failure.

```yaml
resources:
  myEventBus:
    type: event-bus

  mySuccessLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: lambdas/success-handler.ts

  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      # {start-highlight}
      destinations:
        # if function succeeds, invoke the mySuccessLambda with the result data
        onSuccess: $ResourceParam('mySuccessLambda', 'arn')
        # if the function fails, send the result to "myEventBus"
        onFailure: $ResourceParam('myEventBus', 'arn')
      # {stop-highlight}
```