import type { DevModeConfig, ResourceOverrides } from './shared';
import type { LogForwardingBase } from './log-forwarding';
/**
 * #### Managed Redis-compatible in-memory store (Amazon ElastiCache) for caching, sessions, queues, and real-time data.
 *
 * ---
 *
 * Runs Valkey, the open-source continuation of Redis that AWS maintains. Valkey speaks the Redis protocol, so Redis
 * client libraries work unchanged. Choose how it runs with `engine.type`:
 * - **`valkey-serverless`**: no instances to size, scales automatically, billed per stored GB and per request.
 *   Created in about 2 minutes, compared with about 5 for node-based caches.
 * - **`valkey`**: fixed-size nodes billed per hour. Full Redis compatibility, including multi-key commands across keys.
 * - **`redis`**: Redis OSS nodes. Only for caches that already run Redis OSS; new caches use Valkey.
 */
export interface Redis {
  type: 'redis';
  properties: RedisProps;
  overrides?: ResourceOverrides;
}


export interface RedisProps {
  /**
   * #### Engine: which software runs the cache and how AWS runs it.
   *
   * ---
   *
   * - **`valkey-serverless`**: Scales automatically, highly available across Availability Zones, no sizing decisions.
   *   Billed per GB stored (minimum 100 MB, about $6/month when idle) plus per request. Cheapest for small datasets;
   *   above roughly 150 MB of data a small `valkey` node costs less. Always runs in cluster mode: commands that touch
   *   several keys (`MGET`, transactions, Lua scripts) must use keys in the same hash slot, so queue libraries such as
   *   BullMQ need a hash-tag prefix like `{bull}`. Keyspace notifications are not supported.
   * - **`valkey`**: Fixed-size nodes, billed per hour. Works with every Redis client and command pattern.
   * - **`redis`**: Redis OSS nodes (versions up to 7.1). Kept for caches deployed before Valkey support.
   *   Switch an existing cache to `valkey` in place (about 20 minutes): writes pause for a few seconds during the
   *   switch (longer without replicas), the data and endpoint stay, and the switch cannot be reversed.
   *
   * Switching between `valkey-serverless` and a node-based engine replaces the cache: it gets a new endpoint and loses
   * its data. Stacktape refuses that change; delete the cache (or rename the resource) to recreate it.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       # stp-focus
   *       engine:
   *         type: valkey-serverless
   *       # stp-end-focus
   *
   *   worker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: js-bundle
   *         properties:
   *           entryfilePath: ./src/worker.ts
   *       joinDefaultVpc: true
   *       connectTo:
   *         - cache
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     // stp-focus
   *     engine: { type: 'valkey-serverless' }
   *     // stp-end-focus
   *   });
   *
   *   const worker = new LambdaFunction({
   *     packaging: {
   *       type: 'js-bundle',
   *       properties: { entryfilePath: './src/worker.ts' }
   *     },
   *     joinDefaultVpc: true,
   *     connectTo: [cache]
   *   });
   *
   *   return { resources: { cache, worker } };
   * });
   * ```
   */
  engine: ValkeyServerlessEngine | ValkeyEngine | RedisOssEngine;
  /**
   * #### Password of the `default` user. 16-128 printable ASCII characters.
   *
   * ---
   *
   * Clients connect as user `default` with this password; all traffic is encrypted in transit (TLS).
   * Allowed special characters: `!`, `&`, `#`, `$`, `^`, `<`, `>`, `-`. Use `$Secret()` instead of hardcoding:
   * ```yml
   * defaultUserPassword: $Secret('cache.password')
   * ```
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       # stp-focus
   *       defaultUserPassword: $Secret('cache.password')
   *       # stp-end-focus
   *       engine:
   *         type: valkey-serverless
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     // stp-focus
   *     defaultUserPassword: $Secret('cache.password'),
   *     // stp-end-focus
   *     engine: { type: 'valkey-serverless' }
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   */
  defaultUserPassword: string;
  /**
   * #### Network access control: `vpc` (default) or `scoping-workloads-in-vpc` (most restrictive).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey-serverless
   *       # stp-focus
   *       accessibility:
   *         accessibilityMode: scoping-workloads-in-vpc
   *       # stp-end-focus
   *
   *   worker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: js-bundle
   *         properties:
   *           entryfilePath: ./src/worker.ts
   *       joinDefaultVpc: true
   *       connectTo:
   *         - cache
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: { type: 'valkey-serverless' },
   *     // stp-focus
   *     accessibility: {
   *       accessibilityMode: 'scoping-workloads-in-vpc'
   *     }
   *     // stp-end-focus
   *   });
   *
   *   const worker = new LambdaFunction({
   *     packaging: {
   *       type: 'js-bundle',
   *       properties: { entryfilePath: './src/worker.ts' }
   *     },
   *     joinDefaultVpc: true,
   *     connectTo: [cache]
   *   });
   *
   *   return { resources: { cache, worker } };
   * });
   * ```
   */
  accessibility?: RedisAccessibility;
  /**
   * #### Days to keep automated daily backups (snapshots). Set to 0 to disable. Maximum 35.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey-serverless
   *       # stp-focus
   *       automatedBackupRetentionDays: 7
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: { type: 'valkey-serverless' },
   *     // stp-focus
   *     automatedBackupRetentionDays: 7
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   *
   * @default 0
   */
  automatedBackupRetentionDays?: number;
  /**
   * #### Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed cache.
   *
   * ---
   *
   * The local container runs the same engine family. For `valkey-serverless` it runs in cluster mode, so commands
   * that touch keys in different hash slots fail locally the same way they fail in AWS. Keyspace notifications still
   * work locally; use `remote: true` to verify behavior against the deployed cache.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey-serverless
   *       # stp-focus
   *       dev:
   *         remote: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: { type: 'valkey-serverless' },
   *     // stp-focus
   *     dev: {
   *       remote: true
   *     }
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   */
  dev?: DevModeConfig;
}


/**
 * #### Valkey Serverless: no instances to size, scales automatically, billed per GB stored and per request.
 *
 * ---
 *
 * Highly available across Availability Zones. Always runs in cluster mode (see `engine` for what that means for
 * multi-key commands). Connect on port 6379; port 6380 serves eventually consistent reads to clients that send
 * `READONLY`.
 */
export interface ValkeyServerlessEngine {
  type: 'valkey-serverless';
  properties?: ValkeyServerlessEngineProperties;
}


/**
 * #### Node-based Valkey: fixed-size nodes billed per hour, compatible with every Redis client.
 */
export interface ValkeyEngine {
  type: 'valkey';
  properties: ValkeyEngineProperties;
}


/**
 * #### Node-based Redis OSS: only for caches that already run Redis OSS.
 *
 * ---
 *
 * AWS publishes no Redis OSS versions after 7.1, so new caches must use `valkey` or `valkey-serverless`.
 * Change `type` to `valkey` to switch an existing cache in place: writes pause for a few seconds (longer without
 * replicas), the endpoint and data stay, and the switch cannot be reversed.
 */
export interface RedisOssEngine {
  type: 'redis';
  properties: RedisOssEngineProperties;
}


export interface ValkeyServerlessEngineProperties {
  /**
   * #### Valkey major version.
   *
   * ---
   *
   * New caches use the latest version. Without this property, an existing cache keeps the version it runs.
   * Versions can only be upgraded.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey-serverless
   *         properties:
   *           # stp-focus
   *           version: '9'
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: {
   *       type: 'valkey-serverless',
   *       properties: {
   *         // stp-focus
   *         version: '9'
   *         // stp-end-focus
   *       }
   *     }
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   */
  version?: '9' | '8' | '7';
  /**
   * #### Maximum stored data in GB. Caps the storage part of the bill.
   *
   * ---
   *
   * When the cache reaches this size, Valkey evicts the least recently used keys **that have a TTL**. If no key has a
   * TTL, writes fail with an out-of-memory error. Set TTLs on cached keys when you use this limit.
   * Without it, the cache grows up to 5,000 GB.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey-serverless
   *         properties:
   *           # stp-focus
   *           maxDataGb: 2
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: {
   *       type: 'valkey-serverless',
   *       properties: {
   *         // stp-focus
   *         maxDataGb: 2
   *         // stp-end-focus
   *       }
   *     }
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   */
  maxDataGb?: number;
  /**
   * #### Maximum ElastiCache Processing Units (ECPUs) per second. Caps the request part of the bill.
   *
   * ---
   *
   * A simple `GET` or `SET` of up to 1 KB uses 1 ECPU; larger values and heavier commands use more.
   * Requests above the limit are throttled (clients see higher latency or errors).
   * Without it, the cache scales up to 15,000,000 ECPUs per second. Minimum 1,000.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey-serverless
   *         properties:
   *           # stp-focus
   *           maxEcpuPerSecond: 5000
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: {
   *       type: 'valkey-serverless',
   *       properties: {
   *         // stp-focus
   *         maxEcpuPerSecond: 5000
   *         // stp-end-focus
   *       }
   *     }
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   */
  maxEcpuPerSecond?: number;
}


export interface NodeBasedRedisEngineProperties {
  /**
   * #### The size of each node. Affects memory, performance, and cost.
   *
   * ---
   *
   * **Quick guide** (Valkey prices, Redis OSS is about 25% more):
   * - **`cache.t4g.micro`** (~$0.013/hr, 0.5 GB): Development, testing, low-traffic apps.
   * - **`cache.t4g.small`** (~$0.026/hr, 1.37 GB): Small production apps, session stores.
   * - **`cache.m7g.large`** (~$0.12/hr, 6.38 GB): Production workloads with moderate data.
   * - **`cache.r7g.large`** (~$0.16/hr, 13.07 GB): Large datasets, memory-heavy caching.
   *
   * **Families:** `t` = burstable (cheap, variable). `m` = general purpose. `r` = memory-optimized.
   * Suffix `g` = ARM/Graviton (better price-performance).
   *
   * This size applies to every node (primary + replicas). You can change it later without data loss.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey
   *         properties:
   *           # stp-focus
   *           instanceSize: cache.t4g.micro
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: {
   *       type: 'valkey',
   *       properties: {
   *         // stp-focus
   *         instanceSize: 'cache.t4g.micro'
   *         // stp-end-focus
   *       }
   *     }
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   */
  instanceSize:
    | 'cache.t3.micro'
    | 'cache.t3.small'
    | 'cache.t3.medium'
    | 'cache.t4g.micro'
    | 'cache.t4g.small'
    | 'cache.t4g.medium'
    | 'cache.m6g.large'
    | 'cache.m6g.xlarge'
    | 'cache.m6g.2xlarge'
    | 'cache.m6g.4xlarge'
    | 'cache.m6g.8xlarge'
    | 'cache.m6g.12xlarge'
    | 'cache.m6g.16xlarge'
    | 'cache.m7g.large'
    | 'cache.m7g.xlarge'
    | 'cache.m7g.2xlarge'
    | 'cache.m7g.4xlarge'
    | 'cache.m7g.8xlarge'
    | 'cache.m7g.12xlarge'
    | 'cache.m7g.16xlarge'
    | 'cache.m5.large'
    | 'cache.m5.xlarge'
    | 'cache.m5.2xlarge'
    | 'cache.m5.4xlarge'
    | 'cache.m5.12xlarge'
    | 'cache.m5.24xlarge'
    | 'cache.m4.large'
    | 'cache.m4.xlarge'
    | 'cache.m4.2xlarge'
    | 'cache.m4.4xlarge'
    | 'cache.m4.10xlarge'
    | 'cache.t2.micro'
    | 'cache.t2.small'
    | 'cache.t2.medium'
    | 'cache.r6g.large'
    | 'cache.r6g.xlarge'
    | 'cache.r6g.2xlarge'
    | 'cache.r6g.4xlarge'
    | 'cache.r6g.8xlarge'
    | 'cache.r6g.12xlarge'
    | 'cache.r6g.16xlarge'
    | 'cache.r7g.large'
    | 'cache.r7g.xlarge'
    | 'cache.r7g.2xlarge'
    | 'cache.r7g.4xlarge'
    | 'cache.r7g.8xlarge'
    | 'cache.r7g.12xlarge'
    | 'cache.r7g.16xlarge'
    | 'cache.r5.large'
    | 'cache.r5.xlarge'
    | 'cache.r5.2xlarge'
    | 'cache.r5.4xlarge'
    | 'cache.r5.12xlarge'
    | 'cache.r5.24xlarge'
    | 'cache.r4.large'
    | 'cache.r4.xlarge'
    | 'cache.r4.2xlarge'
    | 'cache.r4.4xlarge'
    | 'cache.r4.8xlarge'
    | 'cache.r4.16xlarge';
  /**
   * #### Read replicas per shard. Increases read throughput and availability.
   *
   * ---
   *
   * If the primary fails and `enableAutomaticFailover` is on, a replica takes over.
   * Can't be changed after creation for sharded clusters.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey
   *         properties:
   *           instanceSize: cache.t4g.small
   *           # stp-focus
   *           numReplicaNodes: 2
   *           # stp-end-focus
   *           enableAutomaticFailover: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: {
   *       type: 'valkey',
   *       properties: {
   *         instanceSize: 'cache.t4g.small',
   *         // stp-focus
   *         numReplicaNodes: 2,
   *         // stp-end-focus
   *         enableAutomaticFailover: true
   *       }
   *     }
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   *
   * @default 0
   */
  numReplicaNodes?: number;
  /**
   * #### Auto-promote a replica to primary if the primary node fails.
   *
   * ---
   *
   * Requires `numReplicaNodes >= 1`. Always enabled for sharded clusters.
   *
   * > Deploy replicas first, then enable failover in a separate deployment.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey
   *         properties:
   *           instanceSize: cache.t4g.small
   *           numReplicaNodes: 1
   *           # stp-focus
   *           enableAutomaticFailover: true
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: {
   *       type: 'valkey',
   *       properties: {
   *         instanceSize: 'cache.t4g.small',
   *         numReplicaNodes: 1,
   *         // stp-focus
   *         enableAutomaticFailover: true
   *         // stp-end-focus
   *       }
   *     }
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   */
  enableAutomaticFailover?: boolean;
  /**
   * #### Split data across multiple shards for horizontal scaling.
   *
   * ---
   *
   * Each shard has its own primary + replicas. Clients must support cluster mode.
   *
   * > **Must be set at creation time** — can't be added later.
   * > Requires `numReplicaNodes >= 1`. Replica count can't be changed after creation.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey
   *         properties:
   *           instanceSize: cache.m7g.large
   *           # stp-focus
   *           enableSharding: true
   *           numShards: 3
   *           # stp-end-focus
   *           numReplicaNodes: 1
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: {
   *       type: 'valkey',
   *       properties: {
   *         instanceSize: 'cache.m7g.large',
   *         // stp-focus
   *         enableSharding: true,
   *         numShards: 3,
   *         // stp-end-focus
   *         numReplicaNodes: 1
   *       }
   *     }
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   */
  enableSharding?: boolean;
  /**
   * #### Number of shards (only with `enableSharding: true`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey
   *         properties:
   *           instanceSize: cache.m7g.large
   *           enableSharding: true
   *           # stp-focus
   *           numShards: 4
   *           # stp-end-focus
   *           numReplicaNodes: 1
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: {
   *       type: 'valkey',
   *       properties: {
   *         instanceSize: 'cache.m7g.large',
   *         enableSharding: true,
   *         // stp-focus
   *         numShards: 4,
   *         // stp-end-focus
   *         numReplicaNodes: 1
   *       }
   *     }
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   *
   * @default 1
   */
  numShards?: number;
  /**
   * #### Port the cache listens on.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey
   *         properties:
   *           instanceSize: cache.t4g.small
   *           # stp-focus
   *           port: 6380
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: {
   *       type: 'valkey',
   *       properties: {
   *         instanceSize: 'cache.t4g.small',
   *         // stp-focus
   *         port: 6380
   *         // stp-end-focus
   *       }
   *     }
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   *
   * @default 6379
   */
  port?: number;
  /**
   * #### Slow query logging. Sent to CloudWatch; view with `stacktape logs`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey
   *         properties:
   *           instanceSize: cache.t4g.small
   *           # stp-focus
   *           logging:
   *             format: json
   *             retentionDays: 30
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: {
   *       type: 'valkey',
   *       properties: {
   *         instanceSize: 'cache.t4g.small',
   *         // stp-focus
   *         logging: {
   *           format: 'json',
   *           retentionDays: 30
   *         }
   *         // stp-end-focus
   *       }
   *     }
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   */
  logging?: RedisLogging;
}


export interface ValkeyEngineProperties extends NodeBasedRedisEngineProperties {
  /**
   * #### Valkey version.
   *
   * ---
   *
   * New caches use the latest version. Without this property, an existing cache keeps the version it runs.
   * Versions can only be upgraded.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: valkey
   *         properties:
   *           instanceSize: cache.t4g.small
   *           # stp-focus
   *           version: '9.1'
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: {
   *       type: 'valkey',
   *       properties: {
   *         instanceSize: 'cache.t4g.small',
   *         // stp-focus
   *         version: '9.1'
   *         // stp-end-focus
   *       }
   *     }
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   */
  version?: '9.1' | '9.0' | '8.2' | '8.1' | '8.0' | '7.2';
}


export interface RedisOssEngineProperties extends NodeBasedRedisEngineProperties {
  /**
   * #### Redis OSS version the cache runs.
   *
   * ---
   *
   * Required so the version never changes implicitly. Caches created by Stacktape v3 without an explicit
   * `engineVersion` run `6.2`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis
   *     properties:
   *       defaultUserPassword: $Secret('cache.password')
   *       engine:
   *         type: redis
   *         properties:
   *           instanceSize: cache.t4g.small
   *           # stp-focus
   *           version: '6.2'
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Redis, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new Redis({
   *     defaultUserPassword: $Secret('cache.password'),
   *     engine: {
   *       type: 'redis',
   *       properties: {
   *         instanceSize: 'cache.t4g.small',
   *         // stp-focus
   *         version: '6.2'
   *         // stp-end-focus
   *       }
   *     }
   *   });
   *
   *   return { resources: { cache } };
   * });
   * ```
   */
  version: '7.1' | '7.0' | '6.2' | '6.0';
}


export interface RedisLogging extends LogForwardingBase {
  /**
   * #### Disable slow query logging.
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### Log format.
   *
   * @default json
   */
  format?: 'text' | 'json';
  /**
   * #### How many days to keep logs.
   *
   * @default 30
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}


export interface RedisAccessibility {
  /**
   * #### Who can connect to this cache.
   *
   * ---
   *
   * - **`vpc`** (default): Any resource in the same VPC (functions with `joinDefaultVpc: true`, containers, batch jobs).
   * - **`scoping-workloads-in-vpc`**: Only resources that list this cache in their `connectTo`.
   *
   * Caches don't have public IPs — you can't connect from your local machine directly.
   * Use a bastion host for local access.
   *
   * @default vpc
   */
  accessibilityMode: 'vpc' | 'scoping-workloads-in-vpc';
}
