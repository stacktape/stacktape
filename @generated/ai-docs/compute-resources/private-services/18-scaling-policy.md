# Scaling policy

A scaling policy defines the CPU and memory thresholds that trigger scaling.

- **Scaling out (adding instances):** The service scales out if either the average CPU or memory utilization exceeds the target you set.
- **Scaling in (removing instances):** The service scales in only when both CPU and memory utilization are below their target values.

The scaling process is more aggressive when adding capacity than when removing it. This helps ensure your application can handle sudden increases in load, while scaling in more cautiously to prevent flapping (scaling in and out too frequently).

```yaml
resources:
  myPrivateService:
    type: private-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/index.ts
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

> Example of a scaling configuration.