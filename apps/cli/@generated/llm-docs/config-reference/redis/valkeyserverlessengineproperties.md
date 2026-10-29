# ValkeyServerlessEngineProperties API Reference

Resource type: `redis`

## TypeScript definition

```typescript
type ValkeyServerlessEngineProperties = {
  /** Maximum stored data in GB. Caps the storage part of the bill. */
  maxDataGb?: number;
  /** Maximum ElastiCache Processing Units (ECPUs) per second. Caps the request part of the bill. */
  maxEcpuPerSecond?: number;
  /** Valkey major version. */
  version?: "7" | "8" | "9";
};
```

## Property: `maxDataGb`

- Required: no
- Type: `number`

Maximum stored data in GB. Caps the storage part of the bill.

When the cache reaches this size, Valkey evicts the least recently used keys **that have a TTL**. If no key has a
TTL, writes fail with an out-of-memory error. Set TTLs on cached keys when you use this limit.
Without it, the cache grows up to 5,000 GB.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey-serverless
        properties:
          maxDataGb: 2
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: {
      type: 'valkey-serverless',
      properties: {
        maxDataGb: 2
      }
    }
  });

  return { resources: { cache } };
});
```

## Property: `maxEcpuPerSecond`

- Required: no
- Type: `number`

Maximum ElastiCache Processing Units (ECPUs) per second. Caps the request part of the bill.

A simple `GET` or `SET` of up to 1 KB uses 1 ECPU; larger values and heavier commands use more.
Requests above the limit are throttled (clients see higher latency or errors).
Without it, the cache scales up to 15,000,000 ECPUs per second. Minimum 1,000.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey-serverless
        properties:
          maxEcpuPerSecond: 5000
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: {
      type: 'valkey-serverless',
      properties: {
        maxEcpuPerSecond: 5000
      }
    }
  });

  return { resources: { cache } };
});
```

## Property: `version`

- Required: no
- Type: `string: "7" | "8" | "9"`

Valkey major version.

New caches use the latest version. Without this property, an existing cache keeps the version it runs.
Versions can only be upgraded.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey-serverless
        properties:
          version: '9'
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: {
      type: 'valkey-serverless',
      properties: {
        version: '9'
      }
    }
  });

  return { resources: { cache } };
});
```
