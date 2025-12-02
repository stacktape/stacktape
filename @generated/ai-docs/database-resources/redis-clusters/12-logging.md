# Logging

You can enable logging to send the Redis [slow log](https://redis.io/commands/slowlog) to a CloudWatch log group.

```yaml
resources:
  myRedisCluster:
    type: redis-cluster
    properties:
      instanceSize: cache.t3.micro
      defaultUserPassword: $Secret('redis.password')
      # {start-highlight}
      logging:
        format: json
      # {stop-highlight}
```