# Health check

Health checks monitor your container to ensure it's running correctly. If a container fails its health check, it's automatically terminated and replaced with a new one.

For example, this health check uses `curl` to send a request to the service every 20 seconds. If the request fails or takes longer than 5 seconds, the check is considered failed.

```yaml
resources:
  myWorkerService:
    type: worker-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/index.ts
      # {start-highlight}
      internalHealthCheck:
        healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost/ || exit 1']
        intervalSeconds: 20
        timeoutSeconds: 5
        startPeriodSeconds: 150
        retries: 2
      # {stop-highlight}
      resources:
        cpu: 2
        memory: 2048
```