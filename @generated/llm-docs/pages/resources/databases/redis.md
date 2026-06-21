# Redis

A Stacktape Redis cluster provides a managed, in-memory data store using AWS ElastiCache for Redis. It delivers sub-millisecond read and write latency for caching, session storage, rate limiting, and pub/sub messaging. Traffic is encrypted in transit, and the cluster runs inside your stack's VPC with no public endpoint.

Pricing starts at ~$11.52/month for a single `cache.t4g.micro` node (us-east-1). You pay per node-hour for the instance size you choose, with no per-request charges. Larger memory-optimized nodes (`cache.r7g.large` at ~$0.20/hr) and multi-node clusters scale cost linearly.

## When to use

Redis is the right choice when your workload needs **fast, ephemeral or semi-persistent data access** that would be too slow or too expensive to serve from a relational database or DynamoDB.

**Use a Stacktape Redis cluster when you need:**

- **Application caching** — cache database query results, API responses, or computed values to cut latency and reduce load on your primary database.
- **Session storage** — store user sessions with automatic expiration, shared across multiple container instances or Lambda functions.
- **Rate limiting and counters** — atomic increment operations with TTL make Redis ideal for request throttling and real-time counters.
- **Queues and pub/sub** — use Redis lists or pub/sub channels for lightweight inter-service messaging without adding a dedicated queue resource.
- **Rich data structures** — Redis supports lists, sets, sorted sets, hashes, and streams beyond simple key-value, enabling use cases like ranking, counting, and time-series ingestion.

## When NOT to use

- **You need a persistent primary database.** Redis is an in-memory store. While backups are available, it is not designed to be your system of record. Use a [relational database](/resources/databases/relational-database) or [DynamoDB](/resources/databases/dynamodb) instead.
- **Your data set is much larger than available memory.** Redis keeps all data in RAM. If your working set exceeds what the largest available instances can hold, consider [OpenSearch](/resources/databases/opensearch) or a relational database with read replicas.
- **You need serverless, pay-per-request pricing.** Redis clusters run continuously and bill per node-hour even when idle. For serverless Redis with per-request billing, use [Upstash Redis](/resources/databases/upstash-redis) instead.
- **You only need a cache for a Lambda-based API with low traffic.** A `cache.t4g.micro` node is cheap but still runs 24/7. For sporadic access patterns, Upstash Redis or DynamoDB-based caching may be more cost-effective.

## Basic example

A minimal Redis cluster requires only an `instanceSize` and a `defaultUserPassword`. Store the password as a [secret](/configuration/secrets) rather than hardcoding it.


Example (TypeScript):

```typescript
import { defineConfig, RedisCluster, $Secret } from 'stacktape';
export default defineConfig(() => {
  const cache = new RedisCluster({
    instanceSize: 'cache.t4g.micro',
    defaultUserPassword: $Secret('redis.password')
  });

  return {
    resources: { cache }
  };
});
```


This creates a single-node Redis 6.2 cluster on a `cache.t4g.micro` instance (~$11.52/month). Traffic between clients and the cluster is encrypted in transit. Slow-query logging is enabled by default and sent to CloudWatch.

## Instance sizing

The `instanceSize` property determines the memory, CPU, and cost of every node in your cluster (primary and replicas). You can change the instance size after creation without data loss, but plan for possible connectivity impact during the AWS-side modification.

| Instance | Family | Memory | Approx. cost | Best for |
|---|---|---|---|---|
| `cache.t4g.micro` | Burstable (Graviton) | 0.5 GB | ~$0.016/hr | Dev/test, low-traffic apps |
| `cache.t4g.small` | Burstable (Graviton) | 1.37 GB | ~$0.032/hr | Small production, session stores |
| `cache.m7g.large` | General purpose (Graviton) | 6.38 GB | ~$0.15/hr | Moderate production workloads |
| `cache.r7g.large` | Memory-optimized (Graviton) | 13.07 GB | ~$0.20/hr | Large datasets, heavy caching |

**Choosing a family:**

- **`t` (burstable)** — cheapest option with variable CPU performance. Good for development and workloads with intermittent traffic spikes. CPU credits accumulate during idle periods and are spent during bursts.
- **`m` (general purpose)** — consistent CPU performance at a moderate price. Use for production workloads where burstable CPU would be unpredictable.
- **`r` (memory-optimized)** — highest memory-to-CPU ratio. Use when your data set is large relative to the traffic volume.
- **Graviton suffix (`g`)** — ARM-based instances with better price-performance than their x86 equivalents. Prefer `t4g`/`m7g`/`r7g` over `t3`/`m5`/`r5` for new clusters.

Supported families include `t2`, `t3`, `t4g`, `m4`, `m5`, `m6g`, `m7g`, `r4`, `r5`, `r6g`, and `r7g`. See the API reference for the exact allowed sizes per family.

## High availability

By default, a Redis cluster has a single primary node with no replicas. For production workloads, add read replicas and enable automatic failover to protect against node failures.

### Read replicas

Set `numReplicaNodes` to add read replicas that serve read traffic and act as failover candidates. Each replica is a full copy of the primary node's data, running on the same instance size.


Example (TypeScript):

```typescript
import { defineConfig, RedisCluster, $Secret } from 'stacktape';
export default defineConfig(() => {
  const cache = new RedisCluster({
    instanceSize: 'cache.m7g.large',
    defaultUserPassword: $Secret('redis.password'),
    numReplicaNodes: 2,
    enableAutomaticFailover: true
  });

  return {
    resources: { cache }
  };
});
```


`numReplicaNodes` defaults to `0`. Adding replicas multiplies your cost — two replicas on a `cache.m7g.large` means three nodes total (1 primary + 2 replicas). Each replica runs the same instance size as the primary.

### Automatic failover

When `enableAutomaticFailover` is enabled and the primary node fails, AWS automatically promotes a replica to primary. This requires at least one replica (`numReplicaNodes >= 1`). Failover can cause a brief connectivity interruption — clients should support automatic reconnection and retry.


> **Warning:** Deploy replicas first, then enable `enableAutomaticFailover` in a separate deployment. Enabling both in the same deployment can cause issues because replicas must be synced before failover can work.


For production workloads that cannot tolerate even brief interruptions, design your application to handle reconnection gracefully. Most Redis client libraries (ioredis, node-redis) support automatic reconnection by default.

### Sharding

For horizontal scaling beyond a single node's memory capacity, enable `enableSharding` to split your key space across multiple shards. Each shard has its own primary node and replicas, with automatic routing handled by the Redis cluster protocol.


Example (TypeScript):

```typescript
import { defineConfig, RedisCluster, $Secret } from 'stacktape';
export default defineConfig(() => {
  const cache = new RedisCluster({
    instanceSize: 'cache.r7g.large',
    defaultUserPassword: $Secret('redis.password'),
    enableSharding: true,
    numShards: 3,
    numReplicaNodes: 1
  });

  return {
    resources: { cache }
  };
});
```


`numShards` defaults to `1` when sharding is enabled. Sharding requires `numReplicaNodes >= 1`, and automatic failover is always enabled for sharded clusters.


> **Warning:** Sharding must be enabled at creation time — you cannot add sharding to an existing non-sharded cluster. To enable sharding on an existing cluster, delete it and recreate it. The replica count also cannot be changed after creation for sharded clusters.


**When to shard:** most teams don't need sharding. Large memory-optimized instances can hold substantial working sets on a single node. Sharding becomes useful when you need more write throughput than a single primary can handle, or when your data set exceeds the largest available instance size.

**When to skip sharding:** if your Redis usage is read-heavy, add replicas instead. Replicas scale reads without the complexity of key-space partitioning. Sharding adds operational complexity — some multi-key operations are restricted to keys that map to the same hash slot.

## Networking

Stacktape Redis clusters run inside your stack's VPC and do not have public IP addresses. Only resources within the same VPC can connect.

### Access modes

The `accessibility.accessibilityMode` property controls which resources can reach the cluster:

- **`vpc` (default)** — any resource in the same VPC can connect. This includes container workloads, batch jobs, and Lambda functions with `joinDefaultVpc: true`. Simplest setup for most teams.
- **`scoping-workloads-in-vpc`** — only resources that explicitly list this cluster in their `connectTo` can connect. Uses security group scoping for fine-grained access control.


Example (TypeScript):

```typescript
import { defineConfig, RedisCluster, $Secret } from 'stacktape';
export default defineConfig(() => {
  const cache = new RedisCluster({
    instanceSize: 'cache.t4g.small',
    defaultUserPassword: $Secret('redis.password'),
    accessibility: {
      accessibilityMode: 'scoping-workloads-in-vpc'
    }
  });

  return {
    resources: { cache }
  };
});
```


Use `scoping-workloads-in-vpc` when you want to restrict Redis access to specific workloads — for example, only your API Lambda should connect, not every resource in the VPC. In most cases, the default `vpc` mode is sufficient and simpler to manage.

### Local access via bastion

Since Redis clusters have no public endpoint, you cannot connect from your local machine directly. To interact with the cluster for debugging or data inspection, use a [bastion host](/resources/security/bastion-host). Once a bastion is deployed, use [`stacktape bastion:tunnel`](/cli/bastion-tunnel) to create a secure tunnel, or use [`stacktape debug:redis`](/cli/debug-redis) to interact with the cluster through the bastion.

## Connecting from workloads

Use [`connectTo`](/configuration/connecting-resources) to grant a workload access to your Redis cluster. Stacktape opens the necessary security group rules and injects connection details as environment variables.

When a workload lists a Redis cluster in `connectTo`, Stacktape injects the following environment variables (assuming the resource is named `cache`):

| Environment variable | Description |
|---|---|
| `STP_CACHE_HOST` | Primary endpoint hostname |
| `STP_CACHE_READER_HOST` | Reader endpoint hostname |
| `STP_CACHE_PORT` | Cluster port |

The password is not included in the `connectTo` environment variables. To pass a complete connection URL to your workload, use the `connectionString` [referenceable parameter](/configuration/referenceable-parameters) via [`$ResourceParam()`](/configuration/directives) and inject it as an explicit environment variable:


Example (TypeScript):

```typescript
import {
  defineConfig,
  RedisCluster,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  $Secret,
  $ResourceParam
} from 'stacktape';
export default defineConfig(() => {
  const cache = new RedisCluster({
    instanceSize: 'cache.t4g.micro',
    defaultUserPassword: $Secret('redis.password')
  });

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    joinDefaultVpc: true,
    connectTo: ['cache'],
    environment: [{ name: 'REDIS_URL', value: $ResourceParam('cache', 'connectionString') }]
  });

  return {
    resources: { cache, api }
  };
});
```


The `connectTo` grants network access (security group rules) and injects `STP_CACHE_HOST`, `STP_CACHE_READER_HOST`, and `STP_CACHE_PORT`. The explicit `environment` entry adds `REDIS_URL` containing the full connection string, which the handler can use directly.


> **Info:** Lambda functions must set `joinDefaultVpc: true` to reach VPC resources like Redis clusters. Container workloads (web services, worker services, private services, multi-container workloads) and batch jobs are already in the VPC by default.


### Example handler

```typescript
import { createClient } from 'redis';

const client = createClient({ url: process.env.REDIS_URL });
await client.connect();

export const handler = async (event: any) => {
  await client.set('key', 'value');
  const result = await client.get('key');
  return { statusCode: 200, body: JSON.stringify({ result }) };
};
```

The `REDIS_URL` environment variable contains the connection string from `$ResourceParam('cache', 'connectionString')`. Stacktape enables TLS encryption on all Redis traffic, so your Redis client library must support TLS connections.

## Backups

Set `automatedBackupRetentionDays` to enable daily automated backups. AWS ElastiCache takes a snapshot of the cluster once per day and retains it for the specified number of days. Set to `0` (the default) to disable backups.


Example (TypeScript):

```typescript
import { defineConfig, RedisCluster, $Secret } from 'stacktape';
export default defineConfig(() => {
  const cache = new RedisCluster({
    instanceSize: 'cache.t4g.small',
    defaultUserPassword: $Secret('redis.password'),
    automatedBackupRetentionDays: 7
  });

  return {
    resources: { cache }
  };
});
```


Backups are recommended for production clusters where the cache contains data that is expensive to rebuild — pre-computed aggregations, large key sets, or session data that would disrupt users if lost. For pure caches where data can be re-fetched from the source, backups add cost without much benefit.

## Logging

Stacktape enables slow-query logging for Redis clusters by default. Slow query logs are sent to CloudWatch and retained for 90 days. View them with [`stacktape debug:logs`](/cli/debug-logs) or in the Stacktape Console.

You can customize the log format (`json` or `text`), retention period, or disable logging entirely:


Example (TypeScript):

```typescript
import { defineConfig, RedisCluster, $Secret } from 'stacktape';
export default defineConfig(() => {
  const cache = new RedisCluster({
    instanceSize: 'cache.t4g.micro',
    defaultUserPassword: $Secret('redis.password'),
    logging: {
      format: 'json',
      retentionDays: 30
    }
  });

  return {
    resources: { cache }
  };
});
```


The `format` property controls whether logs are emitted as `json` (default) or `text`. The `retentionDays` property defaults to `90` and accepts one of these values: `1`, `3`, `5`, `7`, `14`, `30`, `60`, `90`, `120`, `150`, `180`, `365`, `400`, `545`, `731`, `1827`, or `3653`. Set `logging.disabled: true` to turn off slow-query logging entirely.

Log forwarding to external services is also supported — see [log forwarding](/observability/log-forwarding) for details.

## Engine versions

The `engineVersion` property selects the Redis engine version. Supported versions are `7.1`, `7.0`, `6.2`, and `6.0`. The default is `6.2`.

| Version | Notable features |
|---|---|
| `7.1` | Latest available version. |
| `7.0` | Previous major version. |
| `6.2` | Default. Stable, widely tested. |
| `6.0` | Legacy. Use only for compatibility constraints. |

For new clusters, use `7.1` unless your client library or application has a specific compatibility requirement with an older version.

## Dev mode

During [`stacktape dev`](/local-development/dev-mode-overview), Redis clusters run locally in Docker by default. Connection details injected via `connectTo` automatically point to the local container instead of the deployed AWS cluster.

To connect to the deployed AWS cluster instead of the local emulation, set `dev.remote: true`. The AWS cluster must already be deployed.


Example (TypeScript):

```typescript
import { defineConfig, RedisCluster, $Secret } from 'stacktape';
export default defineConfig(() => {
  const cache = new RedisCluster({
    instanceSize: 'cache.t4g.micro',
    defaultUserPassword: $Secret('redis.password'),
    dev: {
      remote: true
    }
  });

  return {
    resources: { cache }
  };
});
```


> **Tip:** Use `dev.remote: true` when local Redis emulation doesn't match production behavior closely enough, or when you need to work with real data during development.


## Referenceable parameters


## Referenceable Parameters: `redis-cluster`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `host` | In case of NON-sharded cluster(default), this is a hostname of the primary instance that can be used for both reads and writes.
In case of sharded cluster, this is cluster's configuration endpoint that can be used for all operations. | `$ResourceParam("<<resource-name>>", "host")` |
| `readerHost` | Hostname (address) that can be used for reads only. (only available for NON-sharded clusters).
If you use multiple replicas, it is advised to use readerHost for read operations to offload the primary host.
ReaderHost automatically balances requests between available read replicas. | `$ResourceParam("<<resource-name>>", "readerHost")` |
| `port` | Port of the cluster. | `$ResourceParam("<<resource-name>>", "port")` |
| `sharding` | Indicates whether cluster is sharded. Available values: `enabled` or `disabled`. | `$ResourceParam("<<resource-name>>", "sharding")` |


## API Reference


## API Reference: `RedisClusterProps`
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

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `defaultUserPassword` | yes | `string` | Cluster password. 16-128 chars, printable ASCII only. Cannot contain `/`, `"`, or `@`. All traffic is encrypted in transit. Use `$Secret()` instead of hardcoding:
defaultUserPassword: $Secret(&#39;redis.password&#39;) | - |
| `instanceSize` | yes | `string: "cache.m4.10xlarge" \| "cache.m4.2xlarge" \| "cache.m4.4xlarge" \| "cache.m4.large" \| "cache.m4.xlarge" \| "cache.m5.12xlarge" \| "cache.m5.24xlarge" \| "cache.m5.2xlarge" \| "cache.m5.4xlarge" \| "cache.m5.large" \| "cache.m5.xlarge" \| "cache.m6g.12xlarge" \| "cache.m6g.16xlarge" \| "cache.m6g.2xlarge" \| "cache.m6g.4xlarge" \| "cache.m6g.8xlarge" \| "cache.m6g.large" \| "cache.m6g.xlarge" \| "cache.m7g.12xlarge" \| "cache.m7g.16xlarge" \| "cache.m7g.2xlarge" \| "cache.m7g.4xlarge" \| "cache.m7g.8xlarge" \| "cache.m7g.large" \| "cache.m7g.xlarge" \| "cache.r4.16xlarge" \| "cache.r4.2xlarge" \| "cache.r4.4xlarge" \| "cache.r4.8xlarge" \| "cache.r4.large" \| "cache.r4.xlarge" \| "cache.r5.12xlarge" \| "cache.r5.24xlarge" \| "cache.r5.2xlarge" \| "cache.r5.4xlarge" \| "cache.r5.large" \| "cache.r5.xlarge" \| "cache.r6g.12xlarge" \| "cache.r6g.16xlarge" \| "cache.r6g.2xlarge" \| "cache.r6g.4xlarge" \| "cache.r6g.8xlarge" \| "cache.r6g.large" \| "cache.r6g.xlarge" \| "cache.r7g.12xlarge" \| "cache.r7g.16xlarge" \| "cache.r7g.2xlarge" \| "cache.r7g.4xlarge" \| "cache.r7g.8xlarge" \| "cache.r7g.large" \| "cache.r7g.xlarge" \| "cache.t2.medium" \| "cache.t2.micro" \| "cache.t2.small" \| "cache.t3.medium" \| "cache.t3.micro" \| "cache.t3.small" \| "cache.t4g.medium" \| "cache.t4g.micro" \| "cache.t4g.small"` | The size of each Redis node. Affects memory, performance, and cost. **Quick guide:**

**`cache.t4g.micro`** (~$0.016/hr, 0.5 GB): Development, testing, low-traffic apps.
**`cache.t4g.small`** (~$0.032/hr, 1.37 GB): Small production apps, session stores.
**`cache.m7g.large`** (~$0.15/hr, 6.38 GB): Production workloads with moderate data.
**`cache.r7g.large`** (~$0.20/hr, 13.07 GB): Large datasets, memory-heavy caching.

**Families:** `t` = burstable (cheap, variable). `m` = general purpose. `r` = memory-optimized.
Suffix `g` = ARM/Graviton (better price-performance).

This size applies to every node (primary + replicas). You can change it later without data loss. | - |
| `accessibility` | no | `RedisAccessibility` | Network access control: `vpc` (default) or `scoping-workloads-in-vpc` (most restrictive). | - |
| `automatedBackupRetentionDays` | no | `number` | Days to keep automated daily backups. Set to 0 to disable. | `0` |
| `dev` | no | `DevModeConfig` | Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed cluster. | - |
| `enableAutomaticFailover` | no | `boolean` | Auto-promote a replica to primary if the primary node fails. Requires `numReplicaNodes >= 1`. Always enabled for sharded clusters.


  Deploy replicas first, then enable failover in a separate deployment. | - |
| `enableSharding` | no | `boolean` | Split data across multiple shards for horizontal scaling. Each shard has its own primary + replicas. Routing is automatic.


  **Must be set at creation time** — can&#39;t be added later.
Requires `numReplicaNodes >= 1`. Replica count can&#39;t be changed after creation. | - |
| `engineVersion` | no | `string: "6.0" \| "6.2" \| "7.0" \| "7.1"` | Redis engine version. | `6.2` |
| `logging` | no | `RedisLogging` | Slow query logging. Sent to CloudWatch; view with `stacktape logs`. | - |
| `numReplicaNodes` | no | `number` | Read replicas per shard. Increases read throughput and availability. If the primary fails and `enableAutomaticFailover` is on, a replica takes over.
Can&#39;t be changed after creation for sharded clusters. | `0` |
| `numShards` | no | `number` | Number of shards (only with `enableSharding: true`). | `1` |
| `port` | no | `number` | Port the cluster listens on. | `6379` |


## FAQ

### How much does a Stacktape Redis cluster cost?

You pay per node-hour based on the instance size you choose. The cheapest option, `cache.t4g.micro` with 0.5 GB memory, costs approximately $11.52/month in us-east-1 for a single node. Costs scale linearly with replicas — a cluster with 1 primary + 2 replicas costs 3x the single-node price.

### Can I connect to Redis from my local machine?

Redis clusters run inside your VPC with no public endpoint. To connect from your local machine, deploy a [bastion host](/resources/security/bastion-host) in your stack and use [`stacktape bastion:tunnel`](/cli/bastion-tunnel) or [`stacktape debug:redis`](/cli/debug-redis). During [dev mode](/local-development/dev-mode-overview), Redis runs locally in Docker by default, so no tunnel is needed for local development.

### Redis vs DynamoDB — which should I use for caching?

Redis provides sub-millisecond latency and rich data structures (sorted sets, lists, hashes, pub/sub). [DynamoDB](/resources/databases/dynamodb) is serverless with pay-per-request pricing and no instance to manage. Choose Redis when you need data structures beyond key-value, need pub/sub, or need the absolute lowest latency. Choose DynamoDB when your cache access is sporadic and you want to avoid paying for idle nodes.

### What's the difference between Stacktape Redis and Upstash Redis?

A Stacktape `RedisCluster` provisions a managed AWS ElastiCache cluster that runs continuously in your VPC. [Upstash Redis](/resources/databases/upstash-redis) is a serverless Redis service with per-request pricing and no instance management. Use ElastiCache Redis for high-throughput, latency-sensitive production workloads. Use Upstash Redis for low-traffic apps, prototypes, or when you want true pay-per-use pricing.

### Can I change the instance size without losing data?

Yes. The `instanceSize` can be changed after creation without data loss. There may be brief connectivity interruptions during the AWS-side modification — if you have replicas with automatic failover enabled, the impact is reduced. Clients should support automatic reconnection.

### Does Stacktape Redis support Redis Cluster mode (sharding)?

Yes. Set `enableSharding: true` to distribute data across multiple shards, each with its own primary and replicas. Sharding must be enabled at cluster creation time and cannot be added later. Most teams don't need sharding — large memory-optimized instances can hold substantial working sets on a single node. Sharding is useful when you need more write throughput than a single primary can provide.

### How do I secure my Redis password?

Store the password as a secret using [`stacktape secret:create`](/cli/secret-create), then reference it in your config with `$Secret('redis.password')`. The password must be 16-128 printable ASCII characters and cannot contain `/`, `"`, or `@`. All traffic between clients and the cluster is encrypted in transit.

### Can Lambda functions connect to Redis?

Yes, but Lambda functions must set `joinDefaultVpc: true` because Redis clusters run inside the VPC. Add the Redis resource name to the Lambda's `connectTo` array, and Stacktape handles the security group rules and environment variable injection. Be aware that Lambda cold starts may be slightly longer when the function runs inside a VPC.

### How do I run migrations or seed data in Redis?

Use a [deployment script](/resources/advanced/deployment-scripts) or a [hook](/configuration/hooks-and-scripts) with `connectTo` pointing to your Redis cluster. Stacktape injects the connection details as environment variables. For ad-hoc operations, use [`stacktape debug:redis`](/cli/debug-redis) to interact with the cluster through a bastion host.

### Does Redis scale automatically?

No. Redis clusters use fixed-size instances — you choose the instance size and number of nodes upfront. To scale up, change the `instanceSize` to a larger node. To scale out writes, enable sharding with more shards. Unlike serverless options such as [Upstash Redis](/resources/databases/upstash-redis) or [DynamoDB](/resources/databases/dynamodb), ElastiCache Redis does not auto-scale capacity based on demand.
