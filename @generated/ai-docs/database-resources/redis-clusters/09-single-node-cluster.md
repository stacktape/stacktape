# Single-node cluster

A single-node cluster has only one node and is not highly available.

```yaml
resources:
  myRedisCluster:
    type: redis-cluster
    properties:
      instanceSize: cache.t3.micro
      defaultUserPassword: $Secret('redis.password')
```