# Application Load Balancer

An Application Load Balancer (ALB) is a good choice when you need features like WebSocket support or sticky sessions, or if you expect high traffic volumes, as it can be more cost-effective than an HTTP API Gateway at scale.

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
      # {start-highlight}
      loadBalancing:
        type: application-load-balancer # default is http-api-gateway
      # {stop-highlight}
```