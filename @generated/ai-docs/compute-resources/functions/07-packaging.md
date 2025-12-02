# Packaging

In the `packaging` section, you specify the path to your code and how it should be built. For more details, see the [packaging documentation](../../../configuration/packaging.md).

```yaml
resources:
  myLambda:
    type: function
    properties:
      # {start-highlight}
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      # {stop-highlight}
      timeout: 10
      memory: 2048
```