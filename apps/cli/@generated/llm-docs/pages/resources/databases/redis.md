# Redis

A `redis` resource is a managed Redis-compatible cache on Amazon ElastiCache, for caching, sessions, rate limits,
queues and pub/sub with sub-millisecond reads and writes. It runs Valkey, the open-source continuation of Redis that AWS
maintains, so Redis clients such as ioredis, node-redis, redis-py and Jedis work unchanged. The cache lives in your
stack's VPC, has no public endpoint and encrypts traffic.

The smallest cache costs about $6 a month idle (Valkey Serverless) or $9.40 a month (one `cache.t4g.micro` node). It's
not a system of record: keep the data you can't lose in a [relational database](/resources/databases/relational-database)
or [DynamoDB](/resources/databases/dynamodb). For Lambda functions outside a VPC, [Upstash Redis](/resources/databases/upstash-redis)
works over HTTPS.

## Choose an engine

`engine.type` decides which software runs the cache and how AWS runs it. There is no default: the choice changes cost and which command patterns work.

| | `valkey-serverless` | `valkey` | `redis` |
|---|---|---|---|
| How it runs | Serverless, scales automatically | Fixed-size nodes | Fixed-size Redis OSS nodes |
| Billing | Per GB stored + per request | Per node-hour | Per node-hour (25% more than Valkey) |
| Smallest cost | ~$6/month idle (100 MB minimum) | ~$9.40/month (`cache.t4g.micro`) | ~$11.70/month (`cache.t4g.micro`) |
| High availability | Built in, across Availability Zones | Add replicas + automatic failover | Add replicas + automatic failover |
| Cache creation | About 2 minutes | About 5 minutes | About 5 minutes |
| Multi-key commands | Keys must share a hash slot | Unrestricted | Unrestricted |
| Use for | New caches with small or spiky data | Large datasets, any client pattern | Existing caches only |

Prices are for us-east-1, running all month ([ElastiCache pricing](https://aws.amazon.com/elasticache/pricing/)).

### Valkey Serverless


Example (TypeScript):

```typescript
import { defineConfig, Redis, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('redis', 'password'),
    engine: { type: 'valkey-serverless' }
  });

  return {
    resources: { cache }
  };
});
```


There are no instances to size. The cache stores up to 5,000 GB and is billed for the data it holds (minimum 100 MB) plus ElastiCache Processing Units (ECPUs) for requests. A `GET` or `SET` of up to 1 KB uses 1 ECPU. Storage costs about $61 per GB-month, so above roughly 150 MB of data a small `valkey` node costs less.

**Compatibility.** A serverless cache always runs in cluster mode with all keys behind one endpoint. Standard (non-cluster) clients connect unchanged. Commands that touch several keys — `MGET`, `MSET`, transactions, and Lua scripts — fail with a `CROSSSLOT` error unless all their keys share a hash slot. Put a common hash tag in the key names, such as `{user:42}:cart` and `{user:42}:profile`. Queue libraries need the same: for BullMQ, use a prefix with braces, for example `prefix: '{bull}'`. Keyspace notifications are not supported.

**Cost limits.** Two optional limits cap the bill:

- `maxDataGb` caps stored data. At the limit, Valkey evicts the least recently used keys **that have a TTL**; if no key has a TTL, writes fail with an out-of-memory error. Set TTLs on cached keys when you use it.
- `maxEcpuPerSecond` caps request throughput (minimum 1,000). Requests above it are throttled.


Example (TypeScript):

```typescript
import { defineConfig, Redis, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('redis', 'password'),
    engine: {
      type: 'valkey-serverless',
      properties: {
        maxDataGb: 2,
        maxEcpuPerSecond: 5000
      }
    }
  });

  return {
    resources: { cache }
  };
});
```


Clients connect on port 6379. Port 6380 serves lower-latency, eventually consistent reads to clients that send `READONLY`; its connection details are the `reader*` parameters.

### Node-based Valkey


Example (TypeScript):

```typescript
import { defineConfig, Redis, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('redis', 'password'),
    engine: {
      type: 'valkey',
      properties: { instanceSize: 'cache.t4g.micro' }
    }
  });

  return {
    resources: { cache }
  };
});
```


This creates a single node running the latest Valkey version. It works with every Redis client and command pattern. Slow-query logging is enabled by default and sent to CloudWatch.

### Redis OSS (existing caches)

AWS publishes no Redis OSS versions after 7.1, so new caches must use Valkey. `engine.type: redis` keeps caches created before Valkey support running on the version they have:


Example (TypeScript):

```typescript
import { defineConfig, Redis, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('redis', 'password'),
    engine: {
      type: 'redis',
      properties: { instanceSize: 'cache.t4g.micro', version: '6.2' }
    }
  });

  return {
    resources: { cache }
  };
});
```


**Switching to Valkey.** Change `engine.type` from `redis` to `valkey`. AWS migrates the cache in place, which took about 20 minutes for a single `cache.t4g.micro` node: the endpoint and data stay, writes pause for a few seconds during a failover (longer when the cache has no replicas), and the switch cannot be reversed.

### Changing engines later

| Change | Result |
|---|---|
| `redis` → `valkey` | In place; brief write pause; cannot be reversed |
| `valkey` → `redis` | Not supported |
| Serverless ↔ node-based | Not allowed: AWS would replace the cache, with a new endpoint and no data |
| Version upgrade | In place |
| Version downgrade | Not supported |

To move between serverless and node-based, create a new resource with a different name, move your application to it, then remove the old one.

## Versions

Without `engine.properties.version`, a new cache gets the latest version and an existing cache keeps the version it runs. A Stacktape update never upgrades a cache on its own.

- `valkey-serverless`: major versions `9`, `8`, `7`.
- `valkey`: `9.1`, `9.0`, `8.2`, `8.1`, `8.0`, `7.2`.
- `redis`: `7.1`, `7.0`, `6.2`, `6.0` (required).

## Instance sizing

For `valkey` and `redis`, `engine.properties.instanceSize` determines the memory, CPU, and cost of every node (primary and replicas). You can change it after creation without data loss.

| Instance | Family | Memory | Approx. Valkey cost | Best for |
|---|---|---|---|---|
| `cache.t4g.micro` | Burstable (Graviton) | 0.5 GB | ~$0.013/hr | Dev/test, low-traffic apps |
| `cache.t4g.small` | Burstable (Graviton) | 1.37 GB | ~$0.026/hr | Small production, session stores |
| `cache.m7g.large` | General purpose (Graviton) | 6.38 GB | ~$0.12/hr | Moderate production workloads |
| `cache.r7g.large` | Memory-optimized (Graviton) | 13.07 GB | ~$0.16/hr | Large datasets, heavy caching |

- **`t` (burstable)**: cheapest, variable CPU performance. Good for development and intermittent traffic.
- **`m` (general purpose)**: consistent CPU performance for production workloads.
- **`r` (memory-optimized)**: highest memory-to-CPU ratio for large datasets.
- **Graviton suffix (`g`)**: ARM-based instances with better price-performance. Prefer `t4g`/`m7g`/`r7g`.

## High availability (node-based)

Serverless caches replicate across Availability Zones automatically. Node-based caches have a single primary node by default.

### Read replicas and automatic failover

Set `numReplicaNodes` to add read replicas, and `enableAutomaticFailover` to promote a replica when the primary fails.


Example (TypeScript):

```typescript
import { defineConfig, Redis, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('redis', 'password'),
    engine: {
      type: 'valkey',
      properties: {
        instanceSize: 'cache.m7g.large',
        numReplicaNodes: 2,
        enableAutomaticFailover: true
      }
    }
  });

  return {
    resources: { cache }
  };
});
```


Each replica runs the same instance size as the primary, so two replicas triple the cost. Failover causes a brief connectivity interruption; clients should reconnect and retry.


> **Warning:** Deploy replicas first, then enable `enableAutomaticFailover` in a separate deployment.


### Sharding

`enableSharding` splits the key space across `numShards` shards, each with its own primary and replicas. Clients must support cluster mode. Sharding requires `numReplicaNodes >= 1` and must be set when the cache is created.


Example (TypeScript):

```typescript
import { defineConfig, Redis, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('redis', 'password'),
    engine: {
      type: 'valkey',
      properties: {
        instanceSize: 'cache.r7g.large',
        enableSharding: true,
        numShards: 3,
        numReplicaNodes: 1
      }
    }
  });

  return {
    resources: { cache }
  };
});
```


Most teams don't need sharding: add replicas to scale reads, or use `valkey-serverless`, which scales without sharding decisions.

## Networking

Caches run inside your stack's VPC and have no public IP addresses.

- **`vpc` (default)**: any resource in the same VPC can connect: container workloads, batch jobs, and Lambda functions with `joinDefaultVpc: true`.
- **`scoping-workloads-in-vpc`**: only resources that list this cache in their `connectTo` can connect.


Example (TypeScript):

```typescript
import { defineConfig, Redis, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('redis', 'password'),
    engine: { type: 'valkey-serverless' },
    accessibility: {
      accessibilityMode: 'scoping-workloads-in-vpc'
    }
  });

  return {
    resources: { cache }
  };
});
```


To connect from your local machine, deploy a [bastion host](/resources/security/bastion-host) and use [`stacktape bastion tunnel`](/cli/bastion-tunnel) or [`stacktape query redis`](/cli/query-redis).

## Connecting from workloads

Use [`connectTo`](/configuration/connecting-resources) to grant a workload access. Stacktape opens the security group rules and injects connection details as environment variables, for example `STP_CACHE_HOST` and `STP_CACHE_PORT` for a resource named `cache`. To pass a complete connection URL, use the `connectionString` [referenceable parameter](/configuration/referenceable-parameters):


Example (TypeScript):

```typescript
import {
  defineConfig,
  Redis,
  LambdaFunction,
  $Secret,
  $ResourceParam,
  JsBundleLambdaPackaging
} from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('redis', 'password'),
    engine: { type: 'valkey-serverless' }
  });

  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/handler.ts'
    }),
    joinDefaultVpc: true,
    connectTo: [cache],
    environment: { REDIS_URL: $ResourceParam('cache', 'connectionString') }
  });

  return {
    resources: { cache, api }
  };
});
```


> **Info:** Lambda functions must set `joinDefaultVpc: true` to reach the cache. Container workloads and batch jobs are already in the VPC.


### Example handler

```typescript
import { createClient } from 'redis';

const client = createClient({ url: process.env.REDIS_URL });
await client.connect();

export const handler = async () => {
  await client.set('key', 'value');
  const result = await client.get('key');
  return { statusCode: 200, body: JSON.stringify({ result }) };
};
```

The connection string uses `rediss://` (TLS) and the `default` user. All traffic is encrypted in transit, so the client library must support TLS.

## Backups

Set `automatedBackupRetentionDays` to keep daily snapshots for that many days (maximum 35 for serverless caches). `0` (the default) disables backups.


Example (TypeScript):

```typescript
import { defineConfig, Redis, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('redis', 'password'),
    engine: { type: 'valkey-serverless' },
    automatedBackupRetentionDays: 7
  });

  return {
    resources: { cache }
  };
});
```


## Logging (node-based)

Node-based caches send slow-query logs to CloudWatch by default, retained for 30 days. View them with [`stacktape logs`](/cli/logs). Customize them with `engine.properties.logging` (`format`, `retentionDays`, `disabled`, and [log forwarding](/observability/log-forwarding)). Serverless caches have no slow-query log.

## Dev mode

During [`stacktape dev`](/local-development/dev-mode-overview), the cache runs locally in Docker: Valkey for `valkey` and `valkey-serverless`, Redis for `redis`. For `valkey-serverless`, the local container runs in cluster mode, so `CROSSSLOT` errors show up locally the same way they do in AWS. Keyspace notifications still work locally; set `dev.remote: true` to test against the deployed cache.


Example (TypeScript):

```typescript
import { defineConfig, Redis, $Secret } from 'stacktape';

export default defineConfig(() => {
  const cache = new Redis({
    defaultUserPassword: $Secret('redis', 'password'),
    engine: { type: 'valkey-serverless' },
    dev: {
      remote: true
    }
  });

  return {
    resources: { cache }
  };
});
```


## Migrating from `redis-cluster`

Stacktape v4 renamed `redis-cluster` to `redis` and moved node settings under `engine.properties`. To keep a deployed cache unchanged, set `engine.type: redis` with the version it runs (`6.2` if `engineVersion` was not set):

```yaml
# Stacktape v3
cache:
  type: redis-cluster
  properties:
    defaultUserPassword: $Secret('redis', 'password')
    instanceSize: cache.t4g.micro

# Stacktape v4
cache:
  type: redis
  properties:
    defaultUserPassword: $Secret('redis', 'password')
    engine:
      type: redis
      properties:
        instanceSize: cache.t4g.micro
        version: '6.2'
```

The cache keeps its endpoint and data. Switch it to Valkey afterwards by changing `engine.type` to `valkey`.

## Configuration reference


### Definition: `RedisProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/redis` with definition name `RedisProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `defaultUserPassword` | yes | `string` | - |
| `engine` | yes | `valkey-serverless \| valkey \| redis` | - |
| `accessibility` | no | `RedisAccessibility` | - |
| `automatedBackupRetentionDays` | no | `number` | `0` |
| `dev` | no | `DevModeConfig` | - |


## Referenceable parameters


## Referenceable Parameters: `redis`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `host` | In case of NON-sharded cluster(default), this is a hostname of the primary instance that can be used for both reads and writes. In case of sharded cluster, this is cluster's configuration endpoint that can be used for all operations. | `$ResourceParam("<<resource-name>>", "host")` |
| `readerHost` | Hostname (address) that can be used for reads only. (only available for NON-sharded clusters). If you use multiple replicas, it is advised to use readerHost for read operations to offload the primary host. ReaderHost automatically balances requests between available read replicas. | `$ResourceParam("<<resource-name>>", "readerHost")` |
| `port` | Port of the cluster. | `$ResourceParam("<<resource-name>>", "port")` |
| `sharding` | Indicates whether cluster is sharded. Available values: `enabled` or `disabled`. | `$ResourceParam("<<resource-name>>", "sharding")` |


## Next steps

- [Local databases](/local-development/local-databases): run Redis on your machine in dev mode.
- [`stacktape query redis`](/cli/query-redis): look at keys from your terminal.
- [Bastion host](/resources/security/bastion-host): reach a VPC-only cluster from your machine.
