# Using Fargate

If you omit the `instanceTypes` property, your workload will run on _Fargate_.

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
      resources:
        cpu: 0.25
        memory: 512
      # {stop-highlight}
```