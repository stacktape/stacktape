---
docType: config-ref
title: Upstash Redis
resourceType: upstash-redis
tags:
  - upstash-redis
  - upstash
source: types/stacktape-config/upstash-redis.d.ts
priority: 1
---

# Upstash Redis

Serverless Redis by Upstash — pay-per-request with no idle costs.

Perfect for Lambda-based apps where a traditional Redis cluster would be wasteful.
Accessible over HTTPS (REST API) or standard Redis protocol. Great for caching, sessions, rate limiting.

Resource type: `upstash-redis`

## TypeScript Definition

```typescript
/**
 * #### Serverless Redis by Upstash — pay-per-request with no idle costs.
 *
 * ---
 *
 * Perfect for Lambda-based apps where a traditional Redis cluster would be wasteful.
 * Accessible over HTTPS (REST API) or standard Redis protocol. Great for caching, sessions, rate limiting.
 */
interface UpstashRedis {
  type: 'upstash-redis';
  properties?: UpstashRedisProps;
  overrides?: ResourceOverrides;
}

interface UpstashRedisProps {
  /**
   * #### Auto-remove old keys when memory is full. Prioritizes keys with TTL set. Enable for cache use cases.
   *
   * ---
   *
   * Without eviction, writes fail once the memory limit is reached. Enable this for caching workloads.
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
