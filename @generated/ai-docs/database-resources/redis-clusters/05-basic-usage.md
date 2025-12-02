# Basic usage

This example shows a simple, single-node Redis cluster. The only required properties are `instanceSize` and `defaultUserPassword`.

```yaml
resources:
  myRedisCluster:
    type: redis-cluster
    properties:
      instanceSize: cache.t3.micro
      defaultUserPassword: $Secret('redis.password')

  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my/lambda.ts
      joinDefaultVpc: true
      # {start-highlight}
      connectTo:
        - myRedisCluster
      # {stop-highlight}
```

> A Lambda function connected to a single-node Redis cluster.

```typescript
import { Redis } from 'ioredis';

const redisClient = new Redis(process.env.STP_MY_REDIS_CLUSTER_CONNECTION_STRING);

const handler = async (event, context) => {
  await redisClient.set('currentTime', `${Date.now()}`);

  const value = await redisClient.get('currentTime');

  return { result: value };
};

export default handler;
```

> Example code for storing and retrieving data from the cluster.