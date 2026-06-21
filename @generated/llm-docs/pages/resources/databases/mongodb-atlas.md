# MongoDB Atlas

A Stacktape MongoDB Atlas cluster provisions a managed MongoDB document database deployed and lifecycle-managed as part of your stack. Flexible schemas make it a strong fit for content management, user profiles, catalogs, and applications where the data model evolves frequently. Pricing starts at ~$9/month for shared tiers (M2) or ~$57/month for dedicated tiers (M10).

## When to use

MongoDB Atlas clusters work well when your application needs a document database with schema flexibility. Compared to relational databases, MongoDB excels when individual records have varying shapes, your schema changes frequently, or you store deeply nested objects that would require complex joins in SQL.

Common scenarios:

- **Content management** — pages, articles, and media metadata with varying structure per content type
- **User profiles and preferences** — nested objects that differ per user or per feature flag set
- **Product catalogs** — items with different attribute sets per category (electronics vs. clothing vs. food)
- **Event logs and analytics** — append-heavy workloads with varied payloads
- **Prototyping** — when your data model hasn't stabilized and you want to iterate without migrations

Choose a **shared tier** (M2 or M5) for development, staging, or low-traffic production workloads where cost matters most. Choose a **dedicated tier** (M10+) when you need auto-scaling, configurable backups, point-in-time recovery, or custom disk sizing. Sharding requires M30 or higher.

## When NOT to use

Use a [relational database](/resources/databases/relational-database) when your data has strong relationships that benefit from joins and foreign keys, when you need multi-table ACID transactions, or when your query patterns are better served by SQL. Relational databases are simpler to reason about for financial, compliance-sensitive, or audit-heavy data.

Use [DynamoDB](/resources/databases/dynamodb) when you want a serverless key-value and document store with pay-per-request pricing that scales to zero. DynamoDB has no base cost and no tier selection — cheaper at low scale and simpler to operate, but with a more constrained query model than MongoDB.

MongoDB Atlas uses third-party provider configuration (`providerConfig.mongoDbAtlas`), which adds setup overhead compared to AWS-native databases like RDS or DynamoDB.

## Basic example

A minimal MongoDB Atlas cluster using a dedicated M10 tier:


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';
export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '7.0'
  });

  return {
    resources: { mainDb }
  };
});
```


The `clusterTier` property determines the instance size, cost, and available features. Supported values range from shared tiers (`M2`, `M5`) to dedicated tiers (`M10` through `M700`), including Low-CPU and NVMe variants for specialized workloads. The `version` property defaults to `"7.0"`. Supported versions are `5.0`, `6.0`, and `7.0`.


> **Info:** This example omits `providerConfig.mongoDbAtlas` for brevity. Configure the required provider settings as described in [Provider configuration](#provider-configuration) before deploying.


## Provider configuration

MongoDB Atlas is a third-party service. Before using MongoDB Atlas clusters, you must configure the `providerConfig.mongoDbAtlas` section of your Stacktape configuration with your Atlas provider settings. These settings let Stacktape provision and manage Atlas resources on your behalf. The [API Reference](#api-reference) on this page documents `MongoDbAtlasClusterProps` (per-cluster settings) only — provider-level settings are separate.


> **Warning:** Store sensitive provider settings (such as private keys) as [secrets](/configuration/secrets) and reference them with the [`$Secret()` directive](/configuration/directives). Never put keys directly in your config file.


MongoDB Atlas network accessibility uses the `MongoDbAtlasAccessibility` configuration type, which is separate from per-cluster `MongoDbAtlasClusterProps`. See [Networking](#networking) for the available access modes.

## Connecting to other resources

Stacktape workloads connect to a MongoDB Atlas cluster through the [`connectTo`](/configuration/connecting-resources) mechanism. Adding the cluster's resource name to a workload's `connectTo` list injects the `STP_[RESOURCE_NAME]_CONNECTION_STRING` environment variable with the MongoDB connection URI.


Example (TypeScript):

```typescript
import {
  defineConfig,
  MongoDbAtlasCluster,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M10'
  });

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: ['mainDb']
  });

  return {
    resources: { mainDb, api }
  };
});
```


In this example, the [Lambda function](/resources/compute/lambda-function) receives `STP_MAIN_DB_CONNECTION_STRING` as an environment variable. Use this connection string in your application code with a MongoDB driver:

```typescript
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.STP_MAIN_DB_CONNECTION_STRING!);
const db = client.db('myapp');
const users = db.collection('users');
```

### Admin credentials

The `adminUserCredentials` property provides an admin user for direct database access, such as access from a local machine or admin tools. Local admin tools also need network access through the configured Atlas accessibility mode or a [bastion tunnel](/resources/security/bastion-host). This is separate from `connectTo` — application-to-database access through `connectTo` is handled automatically without admin credentials.

Store the password as a [secret](/configuration/secrets):


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';
export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    adminUserCredentials: {
      userName: 'admin',
      password: "$Secret('mongo-admin-password')"
    }
  });

  return {
    resources: { mainDb }
  };
});
```


You can also tunnel to the cluster through a [bastion host](/resources/security/bastion-host) for secure local access. MongoDB Atlas clusters are supported as tunnel targets in [scripts with bastion tunneling](/configuration/hooks-and-scripts).

## Cluster tiers

The `clusterTier` property determines the cluster's compute capacity, cost, and available features. Tiers fall into two categories: **shared** and **dedicated**.


## Feature Comparison

| Feature | Shared (M2/M5) | Dedicated (M10+) |
| --- | --- | --- |
| Starting price | ~$9/month | ~$57/month |
| Custom disk size | no | yes |
| Auto-scaling | no | yes |
| Configurable backups | no | yes |
| Point-in-time recovery | no | yes |
| Sharding | no | M30+ |


**Shared tiers (M2/M5)** are the cheapest Atlas tiers, suited to development, staging, or low-traffic production workloads. M2/M5 get automatic snapshots with different rules, but don't support configurable backups, PITR, auto-scaling, or sharding. Shared-tier regional availability may be limited — check the Atlas documentation for supported regions.

**Dedicated tiers (M10+)** provide features such as auto-scaling, configurable backups, custom disk sizing, point-in-time recovery, and sharding (M30+). M30+ unlocks sharding for horizontal write scaling. Higher tiers (M40+) include specialized variants:

- **Low-CPU variants** (e.g., `'M40 Low-CPU (R40)'`)
- **NVMe variants** (e.g., `'M40_NVME'`)

Choose these variants based on MongoDB Atlas sizing guidance for your workload. Most teams start with M10 for production and scale up as needed. Enable auto-scaling to let the cluster adjust its tier automatically based on load.

## Scaling

MongoDB Atlas dedicated clusters (M10+) support automatic tier scaling and disk scaling based on resource utilization. The cluster scales up when CPU or memory usage exceeds 75% for 1 hour, and scales down when both metrics drop below 50% for 24 hours.


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';
export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    autoScaling: {
      minClusterTier: 'M10',
      maxClusterTier: 'M40'
    }
  });

  return {
    resources: { mainDb }
  };
});
```


Set `minClusterTier` and `maxClusterTier` to control cost boundaries. Without a `maxClusterTier`, the cluster could scale to expensive tiers during sustained traffic spikes. Without a `minClusterTier`, scale-down could reduce the cluster below what your application needs during off-peak hours. In this example, the cluster stays between M10 (~$57/month) and M40, regardless of load. The auto-scaling tier bounds accept a subset of the full `clusterTier` values — shared tiers (M2/M5) and some plain high-end tiers like `M300`, `M400`, and `M700` are not valid auto-scaling bounds (use their Low-CPU or NVMe variants instead). See the [API Reference](#api-reference) for the exact allowed values.

Two additional scaling controls:

- **`disableDiskScaling`** — by default, storage automatically expands when disk usage reaches 90%. Storage never scales down. Set this to `true` to prevent automatic disk growth and maintain predictable storage costs.
- **`disableScaleDown`** — prevents the cluster from scaling down to a smaller tier. The cluster can only scale up. Use this when your workload has a known baseline that shouldn't be reduced even during low-traffic periods.

You can also set an initial disk size with `diskSizeGB` on dedicated tiers (M10+). Shared tiers don't support custom disk sizes.


> **Warning:** Auto-scaling is not available on shared tiers (M2/M5). Use a dedicated tier (M10+) if you need automatic scaling.


## Replication

MongoDB Atlas replication settings configure electable, read-only, and analytics node counts. The default is 3 electable nodes.

You can customize the replica set with three node types:

- **Electable nodes** (`numElectableNodes`) — nodes that can become primary. Must be an odd number: 3, 5, or 7. More nodes improve fault tolerance. Default is 3.
- **Read-only nodes** (`numReadOnlyNodes`) — replica nodes that scale read throughput but can never become primary. Add these when your read-to-write ratio is high.
- **Analytics nodes** (`numAnalyticsNodes`) — read-only nodes for long-running analytics queries. Running queries on analytics nodes prevents impact on primary workload performance.


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';
export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M30',
    replication: {
      numElectableNodes: 5,
      numReadOnlyNodes: 2,
      numAnalyticsNodes: 1
    }
  });

  return {
    resources: { mainDb }
  };
});
```


For most production workloads, the default 3 electable nodes provide sufficient redundancy. Add read-only nodes when read throughput, not write throughput, is the bottleneck and you're seeing latency on the primary. Add analytics nodes when you run reports or aggregation pipelines that would otherwise slow down production queries.

## Backups

Dedicated-tier clusters (M10+) support configurable daily snapshots taken at 18:00 UTC. Enable backups with the `enableBackups` property. M2/M5 get automatic snapshots with different rules.

For stricter recovery requirements, enable point-in-time recovery (PITR) to restore your cluster to any second within the last 7 days. PITR requires `enableBackups: true` and a dedicated tier (M10+).


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';
export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    enableBackups: true,
    enablePointInTimeRecovery: true
  });

  return {
    resources: { mainDb }
  };
});
```


Enable both `enableBackups` and `enablePointInTimeRecovery` for any production cluster where data loss is unacceptable. The daily snapshot alone gives you coarse recovery points (once per day); PITR fills the gaps with continuous, second-level granularity.

## Networking

MongoDB Atlas network access is controlled by the `MongoDbAtlasAccessibility` configuration type, which is separate from per-cluster `MongoDbAtlasClusterProps`. The `MongoDbAtlasAccessibility` type defines four access modes:

| Mode | Who can connect | Use case |
|------|----------------|----------|
| `internet` (default) | Anyone with credentials | Development, public APIs, simplest setup |
| `vpc` | Resources in your VPC + whitelisted IPs | Production workloads needing network isolation |
| `scoping-workloads-in-vpc` | Only workloads connected via `connectTo` + whitelisted IPs | Strictest access — requires both VPC and explicit `connectTo` |
| `whitelisted-ips-only` | Only listed IP addresses | Admin-only access from known IPs |

The `whitelistedIps` array adds specific IP addresses or CIDR ranges (e.g., your office IP). The `whitelistedIps` property has no effect in `internet` mode. In `vpc` and `scoping-workloads-in-vpc` modes, it adds access for IPs outside the VPC. In `whitelisted-ips-only` mode, the listed IPs are the only addresses that can connect.

In `vpc` mode, resources in your VPC plus any `whitelistedIps` can access the cluster. In `scoping-workloads-in-vpc` mode, access additionally requires security-group connectivity via `connectTo`. See the [Lambda function](/resources/compute/lambda-function) page for VPC-related workload settings.

For most development and staging environments, the default `internet` mode is sufficient — credentials are still required for access. Switch to `vpc` or `scoping-workloads-in-vpc` for production workloads where you want network-layer isolation as an additional security boundary. Check the MongoDB Atlas documentation for tier-specific networking support if your team depends on private connectivity.

## Sharding

Sharding distributes data across multiple shards for horizontal write scaling. Set `numShards` to a value greater than 1 to enable sharded mode. Sharding requires a dedicated tier of M30 or higher — M2, M5, M10, and M20 tiers don't support sharding.


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';
export default defineConfig(() => {
  const mainDb = new MongoDbAtlasCluster({
    clusterTier: 'M30',
    numShards: 3
  });

  return {
    resources: { mainDb }
  };
});
```


The `numShards` property defaults to 1 (no sharding). In this example, the cluster distributes data across 3 shards.

Most applications don't need sharding. A single replica set on a dedicated tier handles substantial read and write throughput, especially with auto-scaling enabled. Consider sharding only when a single node can't keep up with write volume or when your dataset exceeds a single machine's storage capacity. Sharding adds operational complexity — you need a well-chosen shard key, and some queries may scatter across shards.

## BI Connector

The MongoDB Atlas BI Connector provides SQL-based access to MongoDB data. Use it when a reporting or BI workflow requires SQL access to the cluster. Enable it by setting `biConnector.enabled` to `true`.

The `readPreference` property controls which node the BI Connector reads from: `'primary'`, `'secondary'`, or `'analytics'`. Set `readPreference: 'analytics'` when you have configured analytics nodes via `replication.numAnalyticsNodes` to route BI queries away from production nodes.


Example (TypeScript):

```typescript
import { defineConfig, MongoDbAtlasCluster } from 'stacktape';
export default defineConfig(() => {
  const analyticsDb = new MongoDbAtlasCluster({
    clusterTier: 'M30',
    biConnector: {
      enabled: true,
      readPreference: 'analytics'
    },
    replication: {
      numAnalyticsNodes: 1
    }
  });

  return {
    resources: { analyticsDb }
  };
});
```


> **Warning:** The BI Connector is CPU-intensive and may degrade performance on M10 and M20 clusters. Consider a higher tier or configure analytics nodes via `replication.numAnalyticsNodes` and set `readPreference: 'analytics'` to offload BI queries.


Most teams skip this feature unless they have BI tooling that requires SQL access. If your analytics needs are served by MongoDB's aggregation framework or by exporting data to a data warehouse, you don't need the BI Connector.

## Referenceable parameters

Use [`$ResourceParam()`](/configuration/referenceable-parameters) to reference MongoDB Atlas cluster parameters in your configuration. For example, `$ResourceParam('mainDb', 'connectionString')` resolves to the cluster's connection URI at deploy time.


## Referenceable Parameters: `mongo-db-atlas-cluster`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `connectionString` | Connection string (URL) that allows connecting to the cluster. | `$ResourceParam("<<resource-name>>", "connectionString")` |


## API Reference


## API Reference: `MongoDbAtlasClusterProps`
```typescript
import type { MongoDbAdminUserCredentials, MongoDbAutoScaling, MongoDbBiConnector, MongoDbReplication } from 'stacktape';

type MongoDbAtlasClusterProps = {
  /** Instance size. M2/M5 = shared (cheapest). M10+ = dedicated (more features, auto-scaling, backups). */
  clusterTier: "M10" | "M100" | "M140" | "M2" | "M20" | "M200" | "M200 Low-CPU (R200)" | "M200_NVME" | "M30" | "M300" | "M300 Low-CPU (R300)" | "M40" | "M40 Low-CPU (R40)" | "M400" | "M400 Low-CPU (R400)" | "M400_NVME" | "M40_NVME" | "M5" | "M50" | "M50 Low-CPU (R50)" | "M50_NVME" | "M60" | "M60 Low-CPU (R60)" | "M60_NVME" | "M700" | "M700 Low-CPU (R700)" | "M80" | "M80 Low-CPU (R80)" | "M80_NVME";
  /** Admin user for direct database access (e.g., from your local machine or admin tools). */
  adminUserCredentials?: MongoDbAdminUserCredentials;
  /** Auto-scale tier and/or storage based on CPU/memory usage. Set min/max tier to control costs. */
  autoScaling?: MongoDbAutoScaling;
  /** BI Connector for SQL-based access to MongoDB data. CPU-intensive — may degrade M10/M20 performance. */
  biConnector?: MongoDbBiConnector;
  /** Disk size in GB. Not available for shared tiers (M2/M5). M10+ auto-scales storage by default. */
  diskSizeGB?: number;
  /** Enable daily snapshots (18:00 UTC). M10+ only — M2/M5 get automatic snapshots with different rules. */
  enableBackups?: boolean;
  /** Restore to any second within the last 7 days. Requires enableBackups: true and M10+. */
  enablePointInTimeRecovery?: boolean;
  /** Number of shards. More than 1 enables sharded mode for horizontal scaling. Requires M30+. */
  numShards?: number;
  /** Node count configuration: electable, read-only, and analytics nodes. Default: 3 electable nodes. */
  replication?: MongoDbReplication;
  /** MongoDB engine version. */
  version?: "5.0" | "6.0" | "7.0";
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `clusterTier` | yes | `string: "M10" \| "M100" \| "M140" \| "M2" \| "M20" \| "M200" \| "M200 Low-CPU (R200)" \| "M200_NVME" \| "M30" \| "M300" \| "M300 Low-CPU (R300)" \| "M40" \| "M40 Low-CPU (R40)" \| "M400" \| "M400 Low-CPU (R400)" \| "M400_NVME" \| "M40_NVME" \| "M5" \| "M50" \| "M50 Low-CPU (R50)" \| "M50_NVME" \| "M60" \| "M60 Low-CPU (R60)" \| "M60_NVME" \| "M700" \| "M700 Low-CPU (R700)" \| "M80" \| "M80 Low-CPU (R80)" \| "M80_NVME"` | Instance size. M2/M5 = shared (cheapest). M10+ = dedicated (more features, auto-scaling, backups). | - |
| `adminUserCredentials` | no | `MongoDbAdminUserCredentials` | Admin user for direct database access (e.g., from your local machine or admin tools). Not required for app-to-database access via `connectTo` — that&#39;s handled automatically. | - |
| `autoScaling` | no | `MongoDbAutoScaling` | Auto-scale tier and/or storage based on CPU/memory usage. Set min/max tier to control costs. Scales up when CPU or memory exceeds 75% for 1 hour. Scales down when both are below 50% for 24 hours. | - |
| `biConnector` | no | `MongoDbBiConnector` | BI Connector for SQL-based access to MongoDB data. CPU-intensive — may degrade M10/M20 performance. | - |
| `diskSizeGB` | no | `number` | Disk size in GB. Not available for shared tiers (M2/M5). M10+ auto-scales storage by default. | - |
| `enableBackups` | no | `boolean` | Enable daily snapshots (18:00 UTC). M10+ only — M2/M5 get automatic snapshots with different rules. | - |
| `enablePointInTimeRecovery` | no | `boolean` | Restore to any second within the last 7 days. Requires `enableBackups: true` and M10+. | - |
| `numShards` | no | `number` | Number of shards. More than 1 enables sharded mode for horizontal scaling. Requires M30+. | `1` |
| `replication` | no | `MongoDbReplication` | Node count configuration: electable, read-only, and analytics nodes. Default: 3 electable nodes. | - |
| `version` | no | `string: "5.0" \| "6.0" \| "7.0"` | MongoDB engine version. | `7.0` |


## FAQ

### What MongoDB versions does Stacktape support?

The `version` property defaults to `7.0`. Stacktape supports `5.0`, `6.0`, and `7.0`. Set the `version` property to use an older version if your application or MongoDB driver requires compatibility with a specific major version.

### What's the difference between shared and dedicated MongoDB Atlas tiers?

Shared tiers (M2 and M5) are the cheapest Atlas tiers, starting at ~$9/month. They're suited to development and low-traffic production but lack auto-scaling, configurable backups, point-in-time recovery, and sharding. Dedicated tiers (M10+) start at ~$57/month and provide auto-scaling, full backup control, custom disk sizing, and access to advanced features like sharding (M30+).

### When should I use MongoDB Atlas vs a relational database?

Use MongoDB Atlas when your data has variable schemas, deeply nested structures, or when your model evolves frequently without formal migrations. Use a [relational database](/resources/databases/relational-database) when your data has strong relationships relying on joins and foreign keys, you need multi-table ACID transactions, or when SQL is a requirement. For most CRUD APIs with a stable schema, a relational database is simpler to reason about and has lower setup overhead.

### How does my application connect to the MongoDB Atlas cluster?

Add the cluster's resource name to your workload's [`connectTo`](/configuration/connecting-resources) list. Stacktape injects the `STP_[RESOURCE_NAME]_CONNECTION_STRING` environment variable with the MongoDB connection URI. Use this connection string directly with any MongoDB driver.

### Can I auto-scale my MongoDB Atlas cluster?

Yes, dedicated tiers (M10+) support automatic tier scaling. Set `autoScaling.minClusterTier` and `autoScaling.maxClusterTier` to define scaling bounds. The cluster scales up when CPU or memory exceeds 75% for 1 hour and scales down when both drop below 50% for 24 hours. Disk storage also auto-scales by default, expanding when usage hits 90%. Shared tiers (M2/M5) do not support auto-scaling.

### MongoDB Atlas vs DynamoDB — which should I choose?

Use [DynamoDB](/resources/databases/dynamodb) for key-value and simple document workloads with unpredictable traffic — it scales to zero and charges per request with no base cost. Use MongoDB Atlas when you want MongoDB's document model and query ecosystem rather than DynamoDB's key-value access patterns. DynamoDB is cheaper at low scale; MongoDB Atlas offers more query flexibility but has a fixed monthly cost based on the selected tier.

### Does Stacktape support MongoDB Atlas sharding?

Yes. Set `numShards` to a value greater than 1 to enable sharded mode. Sharding requires a dedicated tier of M30 or higher — M2, M5, M10, and M20 tiers don't support it. Most applications don't need sharding — consider it only when a single replica set can't handle your write volume or dataset size.

### How do I back up my MongoDB Atlas cluster?

Dedicated tiers (M10+) support configurable daily snapshots at 18:00 UTC via `enableBackups: true`. For finer recovery granularity, enable `enablePointInTimeRecovery` to restore to any second within the last 7 days (requires `enableBackups`). M2/M5 get automatic snapshots with different rules. Enable both properties for any production cluster where data loss is unacceptable.

### Can I connect to my cluster from my local machine?

Set `adminUserCredentials` with a username and password to provide an admin user for direct database access (e.g., from your local machine or admin tools). Local access also depends on the configured Atlas accessibility mode and allowed IPs — use [bastion tunneling](/resources/security/bastion-host) in your [scripts](/configuration/hooks-and-scripts) to securely tunnel connections through a bastion host when using `vpc` or `scoping-workloads-in-vpc` mode. Admin credentials are not needed for application access via `connectTo`.

### Do I need additional provider configuration to use this resource?

Yes. MongoDB Atlas is a third-party service, so you must configure `providerConfig.mongoDbAtlas` in your Stacktape configuration before deploying a `mongo-db-atlas-cluster` resource. Store sensitive settings as [secrets](/configuration/secrets) and reference them with `$Secret()`. [Upstash Redis](/resources/databases/upstash-redis) also uses `providerConfig` for the same reason. AWS-native databases like [relational databases](/resources/databases/relational-database) and [DynamoDB](/resources/databases/dynamodb) do not require additional provider configuration.
