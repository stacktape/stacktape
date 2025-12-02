# Using EC2 instances

If you specify `instanceTypes`, your workload will run on _EC2 instances_.

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
        instanceTypes:
          - c5.large
      # {stop-highlight}
```

### Placing containers on EC2

Stacktape optimizes for 100% utilization of your _EC2 instances_. If you specify `cpu` and `memory`, AWS uses a `binpack` strategy to place as many workload instances as possible onto the available _EC2 instances_.

### Using warm pool

Enable a warm pool to keep pre-initialized _EC2 instances_ in a stopped state, ready for faster scaling. This is only supported for workloads with a single instance type.

```yaml
resources:
  myWebService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/index.ts
      resources:
        instanceTypes:
          - c5.large
        # {start-highlight}
        enableWarmPool: true
      # {stop-highlight}
```