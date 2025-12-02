# Automatic invalidation

You can disable the automatic cache invalidation that occurs after each deployment by setting `invalidateAfterDeploy` to `false`.

```yaml
resources:
  myApiGateway:
    type: http-api-gateway
    properties:
      cdn:
        enabled: true
        # {start-highlight}
        invalidateAfterDeploy: false
        # {stop-highlight}
```