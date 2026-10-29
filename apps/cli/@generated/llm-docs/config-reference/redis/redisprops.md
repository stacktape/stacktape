# RedisProps API Reference

Resource type: `redis`

## TypeScript definition

```typescript
import type { DevModeConfig, RedisAccessibility, RedisOssEngine, ValkeyEngine, ValkeyServerlessEngine } from 'stacktape';

type RedisProps = {
  /** Password of the `default` user. 16-128 printable ASCII characters. */
  defaultUserPassword: string;
  /** Engine: which software runs the cache and how AWS runs it. */
  engine: RedisEngine;
  /** Network access control: `vpc` (default) or `scoping-workloads-in-vpc` (most restrictive). */
  accessibility?: RedisAccessibility;
  /** Days to keep automated daily backups (snapshots). Set to 0 to disable. Maximum 35. */
  automatedBackupRetentionDays?: number;
  /** Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed cache. */
  dev?: DevModeConfig;
};

/** Union choices used by the properties above. */
type RedisEngine =
  | ValkeyServerlessEngine
  | ValkeyEngine
  | RedisOssEngine;
```

## Property: `defaultUserPassword`

- Required: yes
- Type: `string`

Password of the `default` user. 16-128 printable ASCII characters.

Clients connect as user `default` with this password; all traffic is encrypted in transit (TLS).
Allowed special characters: `!`, `&`, `#`, `$`, `^`, `<`, `>`, `-`. Use `$Secret()` instead of hardcoding:
defaultUserPassword: $Secret('cache.password')

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey-serverless
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: { type: 'valkey-serverless' }
  });

  return { resources: { cache } };
});
```

## Property: `engine`

- Required: yes
- Type: `valkey-serverless | valkey | redis`

Engine: which software runs the cache and how AWS runs it.

**`valkey-serverless`**: Scales automatically, highly available across Availability Zones, no sizing decisions.
Billed per GB stored (minimum 100 MB, about $6/month when idle) plus per request. Cheapest for small datasets;
above roughly 150 MB of data a small `valkey` node costs less. Always runs in cluster mode: commands that touch
several keys (`MGET`, transactions, Lua scripts) must use keys in the same hash slot, so queue libraries such as
BullMQ need a hash-tag prefix like `{bull}`. Keyspace notifications are not supported.
**`valkey`**: Fixed-size nodes, billed per hour. Works with every Redis client and command pattern.
**`redis`**: Redis OSS nodes (versions up to 7.1). Kept for caches deployed before Valkey support.
Switch an existing cache to `valkey` in place (about 20 minutes): writes pause for a few seconds during the
switch (longer without replicas), the data and endpoint stay, and the switch cannot be reversed.

Switching between `valkey-serverless` and a node-based engine replaces the cache: it gets a new endpoint and loses
its data. Stacktape refuses that change; delete the cache (or rename the resource) to recreate it.

Choices:
- `valkey-serverless` (`ValkeyServerlessEngine`) — Valkey Serverless: no instances to size, scales automatically, billed per GB stored and per request.. Properties: `version?: string: "7" | "8" | "9"`, `maxDataGb?: number`, `maxEcpuPerSecond?: number`.
- `valkey` (`ValkeyEngine`) — Node-based Valkey: fixed-size nodes billed per hour, compatible with every Redis client.. Properties: `version?: string: "7.2" | "8.0" | "8.1" | "8.2" | "9.0" | "9.1"`, `instanceSize: string: "cache.m4.10xlarge" | "cache.m4.2xlarge" | "cache.m4.4xlarge" | "cache.m4.large" | "cache.m4.xlarge" | "cache.m5.12xlarge" | "cache.m5.24xlarge" | "cache.m5.2xlarge" | "cache.m5.4xlarge" | "cache.m5.large" | "cache.m5.xlarge" | "cache.m6g.12xlarge" | "cache.m6g.16xlarge" | "cache.m6g.2xlarge" | "cache.m6g.4xlarge" | "cache.m6g.8xlarge" | "cache.m6g.large" | "cache.m6g.xlarge" | "cache.m7g.12xlarge" | "cache.m7g.16xlarge" | "cache.m7g.2xlarge" | "cache.m7g.4xlarge" | "cache.m7g.8xlarge" | "cache.m7g.large" | "cache.m7g.xlarge" | "cache.r4.16xlarge" | "cache.r4.2xlarge" | "cache.r4.4xlarge" | "cache.r4.8xlarge" | "cache.r4.large" | "cache.r4.xlarge" | "cache.r5.12xlarge" | "cache.r5.24xlarge" | "cache.r5.2xlarge" | "cache.r5.4xlarge" | "cache.r5.large" | "cache.r5.xlarge" | "cache.r6g.12xlarge" | "cache.r6g.16xlarge" | "cache.r6g.2xlarge" | "cache.r6g.4xlarge" | "cache.r6g.8xlarge" | "cache.r6g.large" | "cache.r6g.xlarge" | "cache.r7g.12xlarge" | "cache.r7g.16xlarge" | "cache.r7g.2xlarge" | "cache.r7g.4xlarge" | "cache.r7g.8xlarge" | "cache.r7g.large" | "cache.r7g.xlarge" | "cache.t2.medium" | "cache.t2.micro" | "cache.t2.small" | "cache.t3.medium" | "cache.t3.micro" | "cache.t3.small" | "cache.t4g.medium" | "cache.t4g.micro" | "cache.t4g.small"`, `numReplicaNodes?: number`, `enableAutomaticFailover?: boolean`, `enableSharding?: boolean`, `numShards?: number`, `port?: number`, `logging?: RedisLogging`.
- `redis` (`RedisOssEngine`) — Node-based Redis OSS: only for caches that already run Redis OSS.. Properties: `version: string: "6.0" | "6.2" | "7.0" | "7.1"`, `instanceSize: string: "cache.m4.10xlarge" | "cache.m4.2xlarge" | "cache.m4.4xlarge" | "cache.m4.large" | "cache.m4.xlarge" | "cache.m5.12xlarge" | "cache.m5.24xlarge" | "cache.m5.2xlarge" | "cache.m5.4xlarge" | "cache.m5.large" | "cache.m5.xlarge" | "cache.m6g.12xlarge" | "cache.m6g.16xlarge" | "cache.m6g.2xlarge" | "cache.m6g.4xlarge" | "cache.m6g.8xlarge" | "cache.m6g.large" | "cache.m6g.xlarge" | "cache.m7g.12xlarge" | "cache.m7g.16xlarge" | "cache.m7g.2xlarge" | "cache.m7g.4xlarge" | "cache.m7g.8xlarge" | "cache.m7g.large" | "cache.m7g.xlarge" | "cache.r4.16xlarge" | "cache.r4.2xlarge" | "cache.r4.4xlarge" | "cache.r4.8xlarge" | "cache.r4.large" | "cache.r4.xlarge" | "cache.r5.12xlarge" | "cache.r5.24xlarge" | "cache.r5.2xlarge" | "cache.r5.4xlarge" | "cache.r5.large" | "cache.r5.xlarge" | "cache.r6g.12xlarge" | "cache.r6g.16xlarge" | "cache.r6g.2xlarge" | "cache.r6g.4xlarge" | "cache.r6g.8xlarge" | "cache.r6g.large" | "cache.r6g.xlarge" | "cache.r7g.12xlarge" | "cache.r7g.16xlarge" | "cache.r7g.2xlarge" | "cache.r7g.4xlarge" | "cache.r7g.8xlarge" | "cache.r7g.large" | "cache.r7g.xlarge" | "cache.t2.medium" | "cache.t2.micro" | "cache.t2.small" | "cache.t3.medium" | "cache.t3.micro" | "cache.t3.small" | "cache.t4g.medium" | "cache.t4g.micro" | "cache.t4g.small"`, `numReplicaNodes?: number`, `enableAutomaticFailover?: boolean`, `enableSharding?: boolean`, `numShards?: number`, `port?: number`, `logging?: RedisLogging`.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey-serverless

  worker:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: ./src/worker.ts
      joinDefaultVpc: true
      connectTo:
        - cache
```

### Example 2 (typescript)

```typescript
import { Redis, LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: { type: 'valkey-serverless' }
  });

  const worker = new LambdaFunction({
    packaging: {
      type: 'js-bundle',
      properties: { entryfilePath: './src/worker.ts' }
    },
    joinDefaultVpc: true,
    connectTo: [cache]
  });

  return { resources: { cache, worker } };
});
```

## Property: `accessibility`

- Required: no
- Type: `RedisAccessibility`

Network access control: `vpc` (default) or `scoping-workloads-in-vpc` (most restrictive).

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey-serverless
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc

  worker:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: ./src/worker.ts
      joinDefaultVpc: true
      connectTo:
        - cache
```

### Example 2 (typescript)

```typescript
import { Redis, LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: { type: 'valkey-serverless' },
    accessibility: {
      accessibilityMode: 'scoping-workloads-in-vpc'
    }
  });

  const worker = new LambdaFunction({
    packaging: {
      type: 'js-bundle',
      properties: { entryfilePath: './src/worker.ts' }
    },
    joinDefaultVpc: true,
    connectTo: [cache]
  });

  return { resources: { cache, worker } };
});
```

## Property: `automatedBackupRetentionDays`

- Required: no
- Type: `number`
- Default: `0`

Days to keep automated daily backups (snapshots). Set to 0 to disable. Maximum 35.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey-serverless
      automatedBackupRetentionDays: 7
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: { type: 'valkey-serverless' },
    automatedBackupRetentionDays: 7
  });

  return { resources: { cache } };
});
```

## Property: `dev`

- Required: no
- Type: `DevModeConfig`

Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed cache.

The local container runs the same engine family. For `valkey-serverless` it runs in cluster mode, so commands
that touch keys in different hash slots fail locally the same way they fail in AWS. Keyspace notifications still
work locally; use `remote: true` to verify behavior against the deployed cache.

### Example 1 (yaml)

```yaml
resources:
  cache:
    type: redis
    properties:
      defaultUserPassword: $Secret('cache.password')
      engine:
        type: valkey-serverless
      dev:
        remote: true
```

### Example 2 (typescript)

```typescript
import { Redis, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('cache.password'),
    engine: { type: 'valkey-serverless' },
    dev: {
      remote: true
    }
  });

  return { resources: { cache } };
});
```
