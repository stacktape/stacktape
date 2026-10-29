# RedisOssEngineProperties API Reference

Resource type: `redis`

## TypeScript definition

```typescript
import type { RedisLogging } from 'stacktape';

type RedisOssEngineProperties = {
  /** The size of each node. Affects memory, performance, and cost. */
  instanceSize: "cache.m4.10xlarge" | "cache.m4.2xlarge" | "cache.m4.4xlarge" | "cache.m4.large" | "cache.m4.xlarge" | "cache.m5.12xlarge" | "cache.m5.24xlarge" | "cache.m5.2xlarge" | "cache.m5.4xlarge" | "cache.m5.large" | "cache.m5.xlarge" | "cache.m6g.12xlarge" | "cache.m6g.16xlarge" | "cache.m6g.2xlarge" | "cache.m6g.4xlarge" | "cache.m6g.8xlarge" | "cache.m6g.large" | "cache.m6g.xlarge" | "cache.m7g.12xlarge" | "cache.m7g.16xlarge" | "cache.m7g.2xlarge" | "cache.m7g.4xlarge" | "cache.m7g.8xlarge" | "cache.m7g.large" | "cache.m7g.xlarge" | "cache.r4.16xlarge" | "cache.r4.2xlarge" | "cache.r4.4xlarge" | "cache.r4.8xlarge" | "cache.r4.large" | "cache.r4.xlarge" | "cache.r5.12xlarge" | "cache.r5.24xlarge" | "cache.r5.2xlarge" | "cache.r5.4xlarge" | "cache.r5.large" | "cache.r5.xlarge" | "cache.r6g.12xlarge" | "cache.r6g.16xlarge" | "cache.r6g.2xlarge" | "cache.r6g.4xlarge" | "cache.r6g.8xlarge" | "cache.r6g.large" | "cache.r6g.xlarge" | "cache.r7g.12xlarge" | "cache.r7g.16xlarge" | "cache.r7g.2xlarge" | "cache.r7g.4xlarge" | "cache.r7g.8xlarge" | "cache.r7g.large" | "cache.r7g.xlarge" | "cache.t2.medium" | "cache.t2.micro" | "cache.t2.small" | "cache.t3.medium" | "cache.t3.micro" | "cache.t3.small" | "cache.t4g.medium" | "cache.t4g.micro" | "cache.t4g.small";
  /** Redis OSS version the cache runs. */
  version: "6.0" | "6.2" | "7.0" | "7.1";
  /** Auto-promote a replica to primary if the primary node fails. */
  enableAutomaticFailover?: boolean;
  /** Split data across multiple shards for horizontal scaling. */
  enableSharding?: boolean;
  /** Slow query logging. Sent to CloudWatch; view with `stacktape logs`. */
  logging?: RedisLogging;
  /** Read replicas per shard. Increases read throughput and availability. */
  numReplicaNodes?: number;
  /** Number of shards (only with `enableSharding: true`). */
  numShards?: number;
  /** Port the cache listens on. */
  port?: number;
};
```

## Property: `instanceSize`

- Required: yes
- Type: `string: "cache.m4.10xlarge" | "cache.m4.2xlarge" | "cache.m4.4xlarge" | "cache.m4.large" | "cache.m4.xlarge" | "cache.m5.12xlarge" | "cache.m5.24xlarge" | "cache.m5.2xlarge" | "cache.m5.4xlarge" | "cache.m5.large" | "cache.m5.xlarge" | "cache.m6g.12xlarge" | "cache.m6g.16xlarge" | "cache.m6g.2xlarge" | "cache.m6g.4xlarge" | "cache.m6g.8xlarge" | "cache.m6g.large" | "cache.m6g.xlarge" | "cache.m7g.12xlarge" | "cache.m7g.16xlarge" | "cache.m7g.2xlarge" | "cache.m7g.4xlarge" | "cache.m7g.8xlarge" | "cache.m7g.large" | "cache.m7g.xlarge" | "cache.r4.16xlarge" | "cache.r4.2xlarge" | "cache.r4.4xlarge" | "cache.r4.8xlarge" | "cache.r4.large" | "cache.r4.xlarge" | "cache.r5.12xlarge" | "cache.r5.24xlarge" | "cache.r5.2xlarge" | "cache.r5.4xlarge" | "cache.r5.large" | "cache.r5.xlarge" | "cache.r6g.12xlarge" | "cache.r6g.16xlarge" | "cache.r6g.2xlarge" | "cache.r6g.4xlarge" | "cache.r6g.8xlarge" | "cache.r6g.large" | "cache.r6g.xlarge" | "cache.r7g.12xlarge" | "cache.r7g.16xlarge" | "cache.r7g.2xlarge" | "cache.r7g.4xlarge" | "cache.r7g.8xlarge" | "cache.r7g.large" | "cache.r7g.xlarge" | "cache.t2.medium" | "cache.t2.micro" | "cache.t2.small" | "cache.t3.medium" | "cache.t3.micro" | "cache.t3.small" | "cache.t4g.medium" | "cache.t4g.micro" | "cache.t4g.small"`

The size of each node. Affects memory, performance, and cost.

**Quick guide** (Valkey prices, Redis OSS is about 25% more):

**`cache.t4g.micro`** (~$0.013/hr, 0.5 GB): Development, testing, low-traffic apps.
**`cache.t4g.small`** (~$0.026/hr, 1.37 GB): Small production apps, session stores.
**`cache.m7g.large`** (~$0.12/hr, 6.38 GB): Production workloads with moderate data.
**`cache.r7g.large`** (~$0.16/hr, 13.07 GB): Large datasets, memory-heavy caching.

**Families:** `t` = burstable (cheap, variable). `m` = general purpose. `r` = memory-optimized.
Suffix `g` = ARM/Graviton (better price-performance).

This size applies to every node (primary + replicas). You can change it later without data loss.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey
        properties:
          instanceSize: cache.t4g.micro
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: {
      type: 'valkey',
      properties: {
        instanceSize: 'cache.t4g.micro'
      }
    }
  });

  return { resources: { cache } };
});
```

## Property: `version`

- Required: yes
- Type: `string: "6.0" | "6.2" | "7.0" | "7.1"`

Redis OSS version the cache runs.

Required so the version never changes implicitly. Caches created by Stacktape v3 without an explicit
`engineVersion` run `6.2`.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: redis
        properties:
          instanceSize: cache.t4g.small
          version: '6.2'
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: {
      type: 'redis',
      properties: {
        instanceSize: 'cache.t4g.small',
        version: '6.2'
      }
    }
  });

  return { resources: { cache } };
});
```

## Property: `enableAutomaticFailover`

- Required: no
- Type: `boolean`

Auto-promote a replica to primary if the primary node fails.

Requires `numReplicaNodes >= 1`. Always enabled for sharded clusters.

Deploy replicas first, then enable failover in a separate deployment.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey
        properties:
          instanceSize: cache.t4g.small
          numReplicaNodes: 1
          enableAutomaticFailover: true
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: {
      type: 'valkey',
      properties: {
        instanceSize: 'cache.t4g.small',
        numReplicaNodes: 1,
        enableAutomaticFailover: true
      }
    }
  });

  return { resources: { cache } };
});
```

## Property: `enableSharding`

- Required: no
- Type: `boolean`

Split data across multiple shards for horizontal scaling.

Each shard has its own primary + replicas. Clients must support cluster mode.

**Must be set at creation time** — can't be added later.
Requires `numReplicaNodes >= 1`. Replica count can't be changed after creation.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey
        properties:
          instanceSize: cache.m7g.large
          enableSharding: true
          numShards: 3
          numReplicaNodes: 1
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: {
      type: 'valkey',
      properties: {
        instanceSize: 'cache.m7g.large',
        enableSharding: true,
        numShards: 3,
        numReplicaNodes: 1
      }
    }
  });

  return { resources: { cache } };
});
```

## Property: `logging`

- Required: no
- Type: `RedisLogging`

Slow query logging. Sent to CloudWatch; view with `stacktape logs`.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey
        properties:
          instanceSize: cache.t4g.small
          logging:
            format: json
            retentionDays: 30
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: {
      type: 'valkey',
      properties: {
        instanceSize: 'cache.t4g.small',
        logging: {
          format: 'json',
          retentionDays: 30
        }
      }
    }
  });

  return { resources: { cache } };
});
```

## Property: `numReplicaNodes`

- Required: no
- Type: `number`
- Default: `0`

Read replicas per shard. Increases read throughput and availability.

If the primary fails and `enableAutomaticFailover` is on, a replica takes over.
Can't be changed after creation for sharded clusters.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey
        properties:
          instanceSize: cache.t4g.small
          numReplicaNodes: 2
          enableAutomaticFailover: true
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: {
      type: 'valkey',
      properties: {
        instanceSize: 'cache.t4g.small',
        numReplicaNodes: 2,
        enableAutomaticFailover: true
      }
    }
  });

  return { resources: { cache } };
});
```

## Property: `numShards`

- Required: no
- Type: `number`
- Default: `1`

Number of shards (only with `enableSharding: true`).

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey
        properties:
          instanceSize: cache.m7g.large
          enableSharding: true
          numShards: 4
          numReplicaNodes: 1
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: {
      type: 'valkey',
      properties: {
        instanceSize: 'cache.m7g.large',
        enableSharding: true,
        numShards: 4,
        numReplicaNodes: 1
      }
    }
  });

  return { resources: { cache } };
});
```

## Property: `port`

- Required: no
- Type: `number`
- Default: `6379`

Port the cache listens on.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey
        properties:
          instanceSize: cache.t4g.small
          port: 6380
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: {
      type: 'valkey',
      properties: {
        instanceSize: 'cache.t4g.small',
        port: 6380
      }
    }
  });

  return { resources: { cache } };
});
```
