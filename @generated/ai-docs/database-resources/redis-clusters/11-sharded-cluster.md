# Sharded cluster

For horizontally scaled performance, you can enable sharding to distribute data across multiple primary nodes.

```yaml
resources:
  myRedisCluster:
    type: redis-cluster
    properties:
      instanceSize: cache.t3.micro
      defaultUserPassword: $Secret('redis.password')
      # {start-highlight}
      enableSharding: true
      numShards: 2
      # {stop-highlight}
      numReplicaNodes: 2
```

```typescript
import { Cluster } from 'ioredis';

const redisClusterClient = new Cluster(
  [
    {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT)
    }
  ],
  {
    redisOptions: { tls: {}, password: process.env.REDIS_PASSWORD },
    dnsLookup: (address, callback) => callback(null, address)
  }
);

const handler = async (event, context) => {
  await redisClusterClient.set('currentTime', `${Date.now()}`);

  const value = await redisClusterClient.get('currentTime');

  return { result: value };
};

export default handler;
```

> Using a sharded cluster from a Lambda function.