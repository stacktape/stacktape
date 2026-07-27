# UpstashRedisProps API Reference

Resource type: `upstash-redis`

## TypeScript definition

```typescript
type UpstashRedisProps = {
  /** Auto-remove old keys when memory is full. Prioritizes keys with TTL set. Enable for cache use cases. */
  enableEviction?: boolean;
};
```

## Property: `enableEviction`

- Required: no
- Type: `boolean`
- Default: `false`

Auto-remove old keys when memory is full. Prioritizes keys with TTL set. Enable for cache use cases.

Without eviction, writes fail once the memory limit is reached. Enable this for caching workloads.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: upstash-redis
    properties:
      enableEviction: true
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - cache
```

### Example 2 (typescript)

```typescript
import { UpstashRedis, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const cache = new UpstashRedis({
    enableEviction: true
  });

  const api = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'src/index.ts' }
    },
    connectTo: [cache]
  });

  return { resources: { cache, api } };
});
```
