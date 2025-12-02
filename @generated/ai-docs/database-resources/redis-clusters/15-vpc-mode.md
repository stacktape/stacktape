# VPC mode

The cluster is only accessible from resources within the default _VPC_. This includes any function, batch job, or container workload in your stack.

```yaml
resources:
  myRedisCluster:
    type: redis-cluster
    properties:
      instanceSize: cache.t3.micro
      defaultUserPassword: $Secret('redis.password')
      # {start-highlight}
      accessibility:
        accessibilityMode: vpc
      # {stop-highlight}
```