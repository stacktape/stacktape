# Scoped VPC mode

This mode is more restrictive. In addition to being in the same _VPC_, a resource must explicitly list the cluster in its `connectTo` property to gain access.

```yaml
resources:
  myRedisCluster:
    type: redis-cluster
    properties:
      instanceSize: cache.t3.micro
      defaultUserPassword: $Secret('redis.password')
      # {start-highlight}
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc
      # {stop-highlight}
```