# Edge Lambda functions

You can run Lambda functions at the edge to customize the content that the _CDN_ delivers. For more information, see the [Edge Lambda Functions](../../compute-resources/edge-lambda-functions/index.md) page.

```yaml
resources:
  # {start-highlight}
  authFunction:
    type: edge-lambda-function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: auth-function.ts
  # {stop-highlight}

  myBucket:
    type: bucket
    properties:
      cdn:
        enabled: true
        # {start-highlight}
        edgeFunctions:
          onRequest: authFunction
        # {stop-highlight}
```