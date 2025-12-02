# Scaling policy

A scaling policy triggers scaling actions when CPU or memory thresholds are crossed. The workload scales out aggressively when metrics are high and scales in more cautiously when they are low.

```yaml
resources:
  myContainerWorkload:
    type: multi-container-workload
    properties:
      containers:
        - name: container-1
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/cont1/index.ts
          events:
            - type: http-api-gateway
              properties:
                httpApiGatewayName: myApiGateway
                containerPort: 80
                method: '*'
                path: '*'
        - name: container-2
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/cont1/index.ts
          events:
            - type: workload-internal
              properties:
                containerPort: 3000
      resources:
        cpu: 0.5
        memory: 1024
      # {start-highlight}
      scaling:
        minInstances: 1
        maxInstances: 5
        scalingPolicy:
          keepAvgMemoryUtilizationUnder: 80
          keepAvgCpuUtilizationUnder: 80
      # {stop-highlight}
```