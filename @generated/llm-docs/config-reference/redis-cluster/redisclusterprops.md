# RedisClusterProps API Reference

Resource type: `redis-cluster`

## TypeScript definition

```typescript
import type { DevModeConfig, RedisAccessibility, RedisLogging } from 'stacktape';

type RedisClusterProps = {
  /** Cluster password. 16-128 chars, printable ASCII only. Cannot contain /, ", or @. */
  defaultUserPassword: string;
  /** The size of each Redis node. Affects memory, performance, and cost. */
  instanceSize: "cache.m4.10xlarge" | "cache.m4.2xlarge" | "cache.m4.4xlarge" | "cache.m4.large" | "cache.m4.xlarge" | "cache.m5.12xlarge" | "cache.m5.24xlarge" | "cache.m5.2xlarge" | "cache.m5.4xlarge" | "cache.m5.large" | "cache.m5.xlarge" | "cache.m6g.12xlarge" | "cache.m6g.16xlarge" | "cache.m6g.2xlarge" | "cache.m6g.4xlarge" | "cache.m6g.8xlarge" | "cache.m6g.large" | "cache.m6g.xlarge" | "cache.m7g.12xlarge" | "cache.m7g.16xlarge" | "cache.m7g.2xlarge" | "cache.m7g.4xlarge" | "cache.m7g.8xlarge" | "cache.m7g.large" | "cache.m7g.xlarge" | "cache.r4.16xlarge" | "cache.r4.2xlarge" | "cache.r4.4xlarge" | "cache.r4.8xlarge" | "cache.r4.large" | "cache.r4.xlarge" | "cache.r5.12xlarge" | "cache.r5.24xlarge" | "cache.r5.2xlarge" | "cache.r5.4xlarge" | "cache.r5.large" | "cache.r5.xlarge" | "cache.r6g.12xlarge" | "cache.r6g.16xlarge" | "cache.r6g.2xlarge" | "cache.r6g.4xlarge" | "cache.r6g.8xlarge" | "cache.r6g.large" | "cache.r6g.xlarge" | "cache.r7g.12xlarge" | "cache.r7g.16xlarge" | "cache.r7g.2xlarge" | "cache.r7g.4xlarge" | "cache.r7g.8xlarge" | "cache.r7g.large" | "cache.r7g.xlarge" | "cache.t2.medium" | "cache.t2.micro" | "cache.t2.small" | "cache.t3.medium" | "cache.t3.micro" | "cache.t3.small" | "cache.t4g.medium" | "cache.t4g.micro" | "cache.t4g.small";
  /** Network access control: vpc (default) or scoping-workloads-in-vpc (most restrictive). */
  accessibility?: RedisAccessibility;
  /** Days to keep automated daily backups. Set to 0 to disable. */
  automatedBackupRetentionDays?: number;
  /** Dev mode: runs locally in Docker by default. Set remote: true to use the deployed cluster. */
  dev?: DevModeConfig;
  /** Auto-promote a replica to primary if the primary node fails. */
  enableAutomaticFailover?: boolean;
  /** Split data across multiple shards for horizontal scaling. */
  enableSharding?: boolean;
  /** Redis engine version. */
  engineVersion?: "6.0" | "6.2" | "7.0" | "7.1";
  /** Slow query logging. Sent to CloudWatch; view with stacktape logs. */
  logging?: RedisLogging;
  /** Read replicas per shard. Increases read throughput and availability. */
  numReplicaNodes?: number;
  /** Number of shards (only with enableSharding: true). */
  numShards?: number;
  /** Port the cluster listens on. */
  port?: number;
};
```

## Property: `defaultUserPassword`

- Required: yes
- Type: `string`

Cluster password. 16-128 chars, printable ASCII only. Cannot contain `/`, `"`, or `@`.

All traffic is encrypted in transit. Use `$Secret()` instead of hardcoding:
defaultUserPassword: $Secret('redis.password')

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.t4g.small
```

### Example 2 (typescript)

```typescript
import { RedisCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const redis = new RedisCluster({
    defaultUserPassword: $Secret('redis.password'),
    instanceSize: 'cache.t4g.small'
  });

  return { resources: { redis } };
});
```

## Property: `instanceSize`

- Required: yes
- Type: `string: "cache.m4.10xlarge" | "cache.m4.2xlarge" | "cache.m4.4xlarge" | "cache.m4.large" | "cache.m4.xlarge" | "cache.m5.12xlarge" | "cache.m5.24xlarge" | "cache.m5.2xlarge" | "cache.m5.4xlarge" | "cache.m5.large" | "cache.m5.xlarge" | "cache.m6g.12xlarge" | "cache.m6g.16xlarge" | "cache.m6g.2xlarge" | "cache.m6g.4xlarge" | "cache.m6g.8xlarge" | "cache.m6g.large" | "cache.m6g.xlarge" | "cache.m7g.12xlarge" | "cache.m7g.16xlarge" | "cache.m7g.2xlarge" | "cache.m7g.4xlarge" | "cache.m7g.8xlarge" | "cache.m7g.large" | "cache.m7g.xlarge" | "cache.r4.16xlarge" | "cache.r4.2xlarge" | "cache.r4.4xlarge" | "cache.r4.8xlarge" | "cache.r4.large" | "cache.r4.xlarge" | "cache.r5.12xlarge" | "cache.r5.24xlarge" | "cache.r5.2xlarge" | "cache.r5.4xlarge" | "cache.r5.large" | "cache.r5.xlarge" | "cache.r6g.12xlarge" | "cache.r6g.16xlarge" | "cache.r6g.2xlarge" | "cache.r6g.4xlarge" | "cache.r6g.8xlarge" | "cache.r6g.large" | "cache.r6g.xlarge" | "cache.r7g.12xlarge" | "cache.r7g.16xlarge" | "cache.r7g.2xlarge" | "cache.r7g.4xlarge" | "cache.r7g.8xlarge" | "cache.r7g.large" | "cache.r7g.xlarge" | "cache.t2.medium" | "cache.t2.micro" | "cache.t2.small" | "cache.t3.medium" | "cache.t3.micro" | "cache.t3.small" | "cache.t4g.medium" | "cache.t4g.micro" | "cache.t4g.small"`

The size of each Redis node. Affects memory, performance, and cost.

**Quick guide:**

**`cache.t4g.micro`** (~$0.016/hr, 0.5 GB): Development, testing, low-traffic apps.
**`cache.t4g.small`** (~$0.032/hr, 1.37 GB): Small production apps, session stores.
**`cache.m7g.large`** (~$0.15/hr, 6.38 GB): Production workloads with moderate data.
**`cache.r7g.large`** (~$0.20/hr, 13.07 GB): Large datasets, memory-heavy caching.

**Families:** `t` = burstable (cheap, variable). `m` = general purpose. `r` = memory-optimized.
Suffix `g` = ARM/Graviton (better price-performance).

This size applies to every node (primary + replicas). You can change it later without data loss.

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.r7g.large
      engineVersion: '7.1'

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
    instanceSize: 'cache.r7g.large',
    engineVersion: '7.1'
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

## Property: `accessibility`

- Required: no
- Type: `RedisAccessibility`

Network access control: `vpc` (default) or `scoping-workloads-in-vpc` (most restrictive).

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.t4g.small
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc

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
      accessibilityMode: 'scoping-workloads-in-vpc'
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

## Property: `automatedBackupRetentionDays`

- Required: no
- Type: `number`
- Default: `0`

Days to keep automated daily backups. Set to 0 to disable.

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.m7g.large
      automatedBackupRetentionDays: 7
```

### Example 2 (typescript)

```typescript
import { RedisCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const redis = new RedisCluster({
    defaultUserPassword: $Secret('redis.password'),
    instanceSize: 'cache.m7g.large',
    automatedBackupRetentionDays: 7
  });

  return { resources: { redis } };
});
```

## Property: `dev`

- Required: no
- Type: `DevModeConfig`

Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed cluster.

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.t4g.small
      dev:
        remote: true
```

### Example 2 (typescript)

```typescript
import { RedisCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const redis = new RedisCluster({
    defaultUserPassword: $Secret('redis.password'),
    instanceSize: 'cache.t4g.small',
    dev: {
      remote: true
    }
  });

  return { resources: { redis } };
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
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.t4g.small
      numReplicaNodes: 1
      enableAutomaticFailover: true

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
    numReplicaNodes: 1,
    enableAutomaticFailover: true
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

## Property: `enableSharding`

- Required: no
- Type: `boolean`

Split data across multiple shards for horizontal scaling.

Each shard has its own primary + replicas. Routing is automatic.

  **Must be set at creation time** — can't be added later.
Requires `numReplicaNodes >= 1`. Replica count can't be changed after creation.

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.m7g.large
      enableSharding: true
      numShards: 3
      numReplicaNodes: 1

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
    instanceSize: 'cache.m7g.large',
    enableSharding: true,
    numShards: 3,
    numReplicaNodes: 1
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

## Property: `engineVersion`

- Required: no
- Type: `string: "6.0" | "6.2" | "7.0" | "7.1"`
- Default: `6.2`

Redis engine version.

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.t4g.small
      engineVersion: '7.1'
```

### Example 2 (typescript)

```typescript
import { RedisCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const redis = new RedisCluster({
    defaultUserPassword: $Secret('redis.password'),
    instanceSize: 'cache.t4g.small',
    engineVersion: '7.1'
  });

  return { resources: { redis } };
});
```

## Property: `logging`

- Required: no
- Type: `RedisLogging`

Slow query logging. Sent to CloudWatch; view with `stacktape logs`.

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.t4g.small
      logging:
        disabled: false
        format: json
        retentionDays: 30
```

### Example 2 (typescript)

```typescript
import { RedisCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const redis = new RedisCluster({
    defaultUserPassword: $Secret('redis.password'),
    instanceSize: 'cache.t4g.small',
    logging: {
      disabled: false,
      format: 'json',
      retentionDays: 30
    }
  });

  return { resources: { redis } };
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
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.t4g.small
      numReplicaNodes: 2
      enableAutomaticFailover: true

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
    numReplicaNodes: 2,
    enableAutomaticFailover: true
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

## Property: `numShards`

- Required: no
- Type: `number`
- Default: `1`

Number of shards (only with `enableSharding: true`).

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.m7g.large
      enableSharding: true
      numShards: 4
      numReplicaNodes: 1

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
    instanceSize: 'cache.m7g.large',
    enableSharding: true,
    numShards: 4,
    numReplicaNodes: 1
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

## Property: `port`

- Required: no
- Type: `number`
- Default: `6379`

Port the cluster listens on.

### Example 1 (yaml)

```yaml
resources:
  redis:
    type: redis-cluster
    properties:
      defaultUserPassword: $Secret('redis.password')
      instanceSize: cache.t4g.small
      port: 6380

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
    port: 6380
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
