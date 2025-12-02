# Computing resources

The function's execution environment is fully managed. You can set the `memory` from 128MB to 10,240MB. CPU power is allocated proportionally to the memory, with 1,797MB corresponding to one virtual CPU and a maximum of six vCPUs at 10,240MB.

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
      memory: 1024
      # {stop-highlight}
```