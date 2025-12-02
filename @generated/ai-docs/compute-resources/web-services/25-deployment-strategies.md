# Deployment strategies

By default, Stacktape uses a rolling update strategy to deploy new versions of your service. You can use the `deployment` property to choose a different strategy, such as blue/green.

```yaml
resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 2
        memory: 2048
      loadBalancing:
        type: application-load-balancer
      # {start-highlight}
      deployment:
        strategy: Canary10Percent5Minutes
      # {stop-highlight}
```