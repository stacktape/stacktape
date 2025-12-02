# Multi-node cluster

You can add replica nodes to a non-sharded cluster to improve read performance and availability.

```yaml
resources:
  myRedisCluster:
    type: redis-cluster
    properties:
      instanceSize: cache.t3.micro
      defaultUserPassword: $Secret('redis.password')
      numReplicaNodes: 2
```