# Port

You can specify a custom port for your service.

```yaml
resources:
  myPrivateService:
    type: private-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 2
        memory: 2048
      # {start-highlight}
      port: 8080
      # {stop-highlight}
```