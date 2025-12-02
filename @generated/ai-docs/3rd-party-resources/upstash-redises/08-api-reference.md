# API Reference

TypeScript type definitions for this resource.

```typescript
// From stacktape-config/upstash-redis.d.ts
/**
 * #### A serverless Redis database from Upstash.
 *
 * ---
 *
 * Upstash Redis is designed for low-latency data storage and caching at the edge, making it ideal for serverless and globally distributed applications.
 */
interface UpstashRedis {
  type: 'upstash-redis';
  properties?: UpstashRedisProps;
  overrides?: ResourceOverrides;
}

type StpUpstashRedis = UpstashRedis['properties'] & {
  name: string;
  type: UpstashRedis['type'];
  configParentResourceType: UpstashRedis['type'];
  nameChain: string[];
};

interface UpstashRedisProps {
  /**
   * #### Enables automatic eviction of keys when the memory limit is reached.
   *
   * ---
   *
   * When enabled, Redis will remove keys to free up memory for new data.
   * It uses an eviction policy that prioritizes removing keys with an expiration set.
   *
   * @default false
   */
  enableEviction?: boolean;
}

type UpstashRedisReferencableParam =
  | 'host'
  | 'port'
  | 'password'
  | 'restToken'
  | 'readOnlyRestToken'
  | 'restUrl'
  | 'redisUrl';
```