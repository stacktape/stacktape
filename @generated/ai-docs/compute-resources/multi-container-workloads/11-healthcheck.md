# Healthcheck

A health check monitors the container from within. If an essential container becomes unhealthy, the entire instance is automatically replaced.

```yaml
resources:
  myContainerWorkload:
    type: multi-container-workload
    properties:
      containers:
        - name: api-container
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

> This example uses a shell command to send a `curl` request every 20 seconds. If the request fails or times out, the health check fails.