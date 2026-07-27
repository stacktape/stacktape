# RedisAccessibility API Reference

Resource type: `redis-cluster`

## TypeScript definition

```typescript
type RedisAccessibility = {
  /** Who can connect to this cluster. */
  accessibilityMode: "scoping-workloads-in-vpc" | "vpc";
};
```

## Property: `accessibilityMode`

- Required: yes
- Type: `string: "scoping-workloads-in-vpc" | "vpc"`
- Default: `vpc`

Who can connect to this cluster.

**`vpc`** (default): Any resource in the same VPC (functions with `joinDefaultVpc: true`, containers, batch jobs).
**`scoping-workloads-in-vpc`**: Only resources that list this cluster in their `connectTo`.

Redis clusters don't have public IPs — you can't connect from your local machine directly.
Use a bastion host for local access.

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.t4g.small
      accessibility:
        accessibilityMode: vpc

  worker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/worker.ts
      joinDefaultVpc: true
      connectTo:
        - redis
```

### Example 2 (typescript)

```typescript
import { RedisCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const redis = new RedisCluster({
    defaultUserPassword: $Secret('redis.password'),
    instanceSize: 'cache.t4g.small',
    accessibility: {
      accessibilityMode: 'vpc'
    }
  });

  const worker = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: './src/worker.ts' }
    },
    joinDefaultVpc: true,
    connectTo: [redis]
  });

  return { resources: { redis, worker } };
});
```
