# Using EC2 instances

To use _EC2 instances_, specify a list of `instanceTypes` in the `resources` section.

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
        instanceTypes:
          - c5.large
      # {stop-highlight}
```

> Example of a service running on _EC2 instances_.

### Container placement on EC2

Stacktape tries to use your EC2 instances as efficiently as possible.

- If you specify `instanceTypes` without `cpu` and `memory`, Stacktape configures each service instance to use the full resources of one EC2 instance. When the service scales out, a new EC2 instance is added for each new service instance.
- If you specify `cpu` and `memory`, AWS will place multiple service instances on a single EC2 instance if there's enough capacity, maximizing utilization.

### Default CPU and memory for EC2

- If `cpu` is not specified, containers on an EC2 instance share its CPU capacity.
- If `memory` is not specified, Stacktape sets the memory to the maximum amount available on the smallest instance type in your `instanceTypes` list.

### Using a warm pool

A warm pool keeps pre-initialized EC2 instances in a stopped state, allowing your service to scale out much faster. This is useful for handling sudden traffic spikes. You only pay for the storage of stopped instances, not for compute time.

To enable it, set `enableWarmPool` to `true`. This feature is only available when you specify exactly one instance type.

For more details, see the [AWS Auto Scaling warm pools documentation](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html).

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