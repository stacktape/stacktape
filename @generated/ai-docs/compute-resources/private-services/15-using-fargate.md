# Using Fargate

To use _Fargate_, specify `cpu` and `memory` in the `resources` section without including `instanceTypes`.

```yaml
resources:
  myPrivateService:
    type: private-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/index.ts
      # {start-highlight}
      resources:
        cpu: 0.25
        memory: 512
      # {stop-highlight}
```

> Example of a service running on _Fargate_.