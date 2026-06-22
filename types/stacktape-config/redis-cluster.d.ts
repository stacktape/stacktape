/**
 * #### In-memory data store for caching, sessions, queues, and real-time data. Sub-millisecond latency.
 */
interface RedisCluster {
  type: 'redis-cluster';
  properties: RedisClusterProps;
  overrides?: ResourceOverrides;
}

type StpRedisCluster = RedisCluster['properties'] & {
  name: string;
  type: RedisCluster['type'];
  configParentResourceType: RedisCluster['type'];
  nameChain: string[];
};

interface RedisClusterProps {
  /**
   * #### Split data across multiple shards for horizontal scaling.
   *
   * ---
   *
   * Each shard has its own primary + replicas. Routing is automatic.
   *
   * > **Must be set at creation time** — can't be added later.
   * > Requires `numReplicaNodes >= 1`. Replica count can't be changed after creation.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.m7g.large
   *       # stp-focus
   *       enableSharding: true
   *       numShards: 3
   *       numReplicaNodes: 1
   *       # stp-end-focus
   *
   *   worker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/worker.ts
   *       joinDefaultVpc: true
   *       connectTo:
   *         - redis
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.m7g.large',
   *     // stp-focus
   *     enableSharding: true,
   *     numShards: 3,
   *     numReplicaNodes: 1
   *     // stp-end-focus
   *   });
   *
   *   const worker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: './src/worker.ts' }
   *     },
   *     joinDefaultVpc: true,
   *     connectTo: [redis]
   *   });
   *
   *   return { resources: { redis, worker } };
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
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.m7g.large
   *       enableSharding: true
   *       # stp-focus
   *       numShards: 4
   *       # stp-end-focus
   *       numReplicaNodes: 1
   *
   *   worker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/worker.ts
   *       joinDefaultVpc: true
   *       connectTo:
   *         - redis
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.m7g.large',
   *     enableSharding: true,
   *     // stp-focus
   *     numShards: 4,
   *     // stp-end-focus
   *     numReplicaNodes: 1
   *   });
   *
   *   const worker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: './src/worker.ts' }
   *     },
   *     joinDefaultVpc: true,
   *     connectTo: [redis]
   *   });
   *
   *   return { resources: { redis, worker } };
   * });
   * ```
   *
   * @default 1
   */
  numShards?: number;
  /**
   * #### Read replicas per shard. Increases read throughput and availability.
   *
   * ---
   *
   * If the primary fails and `enableAutomaticFailover` is on, a replica takes over.
   * Can't be changed after creation for sharded clusters.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.t4g.small
   *       # stp-focus
   *       numReplicaNodes: 2
   *       # stp-end-focus
   *       enableAutomaticFailover: true
   *
   *   worker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/worker.ts
   *       joinDefaultVpc: true
   *       connectTo:
   *         - redis
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.t4g.small',
   *     // stp-focus
   *     numReplicaNodes: 2,
   *     // stp-end-focus
   *     enableAutomaticFailover: true
   *   });
   *
   *   const worker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: './src/worker.ts' }
   *     },
   *     joinDefaultVpc: true,
   *     connectTo: [redis]
   *   });
   *
   *   return { resources: { redis, worker } };
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
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.t4g.small
   *       numReplicaNodes: 1
   *       # stp-focus
   *       enableAutomaticFailover: true
   *       # stp-end-focus
   *
   *   worker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/worker.ts
   *       joinDefaultVpc: true
   *       connectTo:
   *         - redis
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.t4g.small',
   *     numReplicaNodes: 1,
   *     // stp-focus
   *     enableAutomaticFailover: true
   *     // stp-end-focus
   *   });
   *
   *   const worker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: './src/worker.ts' }
   *     },
   *     joinDefaultVpc: true,
   *     connectTo: [redis]
   *   });
   *
   *   return { resources: { redis, worker } };
   * });
   * ```
   */
  enableAutomaticFailover?: boolean;
  /**
   * #### The size of each Redis node. Affects memory, performance, and cost.
   *
   * ---
   *
   * **Quick guide:**
   * - **`cache.t4g.micro`** (~$0.016/hr, 0.5 GB): Development, testing, low-traffic apps.
   * - **`cache.t4g.small`** (~$0.032/hr, 1.37 GB): Small production apps, session stores.
   * - **`cache.m7g.large`** (~$0.15/hr, 6.38 GB): Production workloads with moderate data.
   * - **`cache.r7g.large`** (~$0.20/hr, 13.07 GB): Large datasets, memory-heavy caching.
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
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       # stp-focus
   *       instanceSize: cache.r7g.large
   *       # stp-end-focus
   *       engineVersion: '7.1'
   *
   *   worker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/worker.ts
   *       joinDefaultVpc: true
   *       connectTo:
   *         - redis
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     // stp-focus
   *     instanceSize: 'cache.r7g.large',
   *     // stp-end-focus
   *     engineVersion: '7.1'
   *   });
   *
   *   const worker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: './src/worker.ts' }
   *     },
   *     joinDefaultVpc: true,
   *     connectTo: [redis]
   *   });
   *
   *   return { resources: { redis, worker } };
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
   * #### Slow query logging. Sent to CloudWatch; view with `stacktape logs`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.t4g.small
   *       # stp-focus
   *       logging:
   *         disabled: false
   *         format: json
   *         retentionDays: 30
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.t4g.small',
   *     // stp-focus
   *     logging: {
   *       disabled: false,
   *       format: 'json',
   *       retentionDays: 30
   *     }
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { redis } };
   * });
   * ```
   */
  logging?: RedisLogging;
  /**
   * #### Days to keep automated daily backups. Set to 0 to disable.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.m7g.large
   *       # stp-focus
   *       automatedBackupRetentionDays: 7
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.m7g.large',
   *     // stp-focus
   *     automatedBackupRetentionDays: 7
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { redis } };
   * });
   * ```
   *
   * @default 0
   */
  automatedBackupRetentionDays?: number;
  /**
   * #### Port the cluster listens on.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.t4g.small
   *       # stp-focus
   *       port: 6380
   *       # stp-end-focus
   *
   *   worker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/worker.ts
   *       joinDefaultVpc: true
   *       connectTo:
   *         - redis
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.t4g.small',
   *     // stp-focus
   *     port: 6380
   *     // stp-end-focus
   *   });
   *
   *   const worker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: './src/worker.ts' }
   *     },
   *     joinDefaultVpc: true,
   *     connectTo: [redis]
   *   });
   *
   *   return { resources: { redis, worker } };
   * });
   * ```
   *
   * @default 6379
   */
  port?: number;
  /**
   * #### Cluster password. 16-128 chars, printable ASCII only. Cannot contain `/`, `"`, or `@`.
   *
   * ---
   *
   * All traffic is encrypted in transit. Use `$Secret()` instead of hardcoding:
   * ```yml
   * defaultUserPassword: $Secret('redis.password')
   * ```
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       # stp-focus
   *       defaultUserPassword: $Secret('redis.password')
   *       # stp-end-focus
   *       instanceSize: cache.t4g.small
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     // stp-focus
   *     defaultUserPassword: $Secret('redis.password'),
   *     // stp-end-focus
   *     instanceSize: 'cache.t4g.small'
   *   });
   *
   *   return { resources: { redis } };
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
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.t4g.small
   *       # stp-focus
   *       accessibility:
   *         accessibilityMode: scoping-workloads-in-vpc
   *       # stp-end-focus
   *
   *   worker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/worker.ts
   *       joinDefaultVpc: true
   *       connectTo:
   *         - redis
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.t4g.small',
   *     // stp-focus
   *     accessibility: {
   *       accessibilityMode: 'scoping-workloads-in-vpc'
   *     }
   *     // stp-end-focus
   *   });
   *
   *   const worker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: './src/worker.ts' }
   *     },
   *     joinDefaultVpc: true,
   *     connectTo: [redis]
   *   });
   *
   *   return { resources: { redis, worker } };
   * });
   * ```
   */
  accessibility?: RedisAccessibility;
  /**
   * #### Redis engine version.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.t4g.small
   *       # stp-focus
   *       engineVersion: '7.1'
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.t4g.small',
   *     // stp-focus
   *     engineVersion: '7.1'
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { redis } };
   * });
   * ```
   *
   * @default "6.2"
   */
  engineVersion?: '7.1' | '7.0' | '6.2' | '6.0';
  /**
   * #### Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed cluster.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.t4g.small
   *       # stp-focus
   *       dev:
   *         remote: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.t4g.small',
   *     // stp-focus
   *     dev: {
   *       remote: true
   *     }
   *     // stp-end-focus
   *   });
   *
   *   return { resources: { redis } };
   * });
   * ```
   */
  dev?: DevModeConfig;
}

interface RedisLogging extends LogForwardingBase {
  /**
   * #### Disable slow query logging.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.t4g.small
   *       logging:
   *         # stp-focus
   *         disabled: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.t4g.small',
   *     logging: {
   *       // stp-focus
   *       disabled: true
   *       // stp-end-focus
   *     }
   *   });
   *
   *   return { resources: { redis } };
   * });
   * ```
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### Log format.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.t4g.small
   *       logging:
   *         # stp-focus
   *         format: text
   *         # stp-end-focus
   *         retentionDays: 90
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.t4g.small',
   *     logging: {
   *       // stp-focus
   *       format: 'text',
   *       // stp-end-focus
   *       retentionDays: 90
   *     }
   *   });
   *
   *   return { resources: { redis } };
   * });
   * ```
   *
   * @default json
   */
  format?: 'text' | 'json';
  /**
   * #### How many days to keep logs.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.t4g.small
   *       logging:
   *         format: json
   *         # stp-focus
   *         retentionDays: 365
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.t4g.small',
   *     logging: {
   *       format: 'json',
   *       // stp-focus
   *       retentionDays: 365
   *       // stp-end-focus
   *     }
   *   });
   *
   *   return { resources: { redis } };
   * });
   * ```
   *
   * @default 90
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

interface RedisAccessibility {
  /**
   * #### Who can connect to this cluster.
   *
   * ---
   *
   * - **`vpc`** (default): Any resource in the same VPC (functions with `joinDefaultVpc: true`, containers, batch jobs).
   * - **`scoping-workloads-in-vpc`**: Only resources that list this cluster in their `connectTo`.
   *
   * Redis clusters don't have public IPs — you can't connect from your local machine directly.
   * Use a bastion host for local access.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   redis:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.t4g.small
   *       accessibility:
   *         # stp-focus
   *         accessibilityMode: vpc
   *         # stp-end-focus
   *
   *   worker:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/worker.ts
   *       joinDefaultVpc: true
   *       connectTo:
   *         - redis
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RedisCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const redis = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.t4g.small',
   *     accessibility: {
   *       // stp-focus
   *       accessibilityMode: 'vpc'
   *       // stp-end-focus
   *     }
   *   });
   *
   *   const worker = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: './src/worker.ts' }
   *     },
   *     joinDefaultVpc: true,
   *     connectTo: [redis]
   *   });
   *
   *   return { resources: { redis, worker } };
   * });
   * ```
   *
   * @default vpc
   */
  accessibilityMode: 'vpc' | 'scoping-workloads-in-vpc';
}

type RedisClusterReferencableParam = 'host' | 'readerHost' | 'port' | 'readerPort' | 'connectionString' | 'sharding';
