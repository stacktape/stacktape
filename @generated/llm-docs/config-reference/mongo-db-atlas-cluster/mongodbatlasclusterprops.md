# MongoDbAtlasClusterProps API Reference

Resource type: `mongo-db-atlas-cluster`

## TypeScript definition

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

## Property: `clusterTier`

- Required: yes
- Type: `string: "M10" | "M100" | "M140" | "M2" | "M20" | "M200" | "M200 Low-CPU (R200)" | "M200_NVME" | "M30" | "M300" | "M300 Low-CPU (R300)" | "M40" | "M40 Low-CPU (R40)" | "M400" | "M400 Low-CPU (R400)" | "M400_NVME" | "M40_NVME" | "M5" | "M50" | "M50 Low-CPU (R50)" | "M50_NVME" | "M60" | "M60 Low-CPU (R60)" | "M60_NVME" | "M700" | "M700 Low-CPU (R700)" | "M80" | "M80 Low-CPU (R80)" | "M80_NVME"`

Instance size. M2/M5 = shared (cheapest). M10+ = dedicated (more features, auto-scaling, backups).

### Example 1 (yaml)

```yaml
resources:
  appDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M20
      version: '7.0'
      enableBackups: true
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - appDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appDb = new MongoDbAtlasCluster({
    clusterTier: 'M20',
    version: '7.0',
    enableBackups: true
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [appDb]
  });
  return { resources: { appDb, api } };
});
```

## Property: `adminUserCredentials`

- Required: no
- Type: `MongoDbAdminUserCredentials`

Admin user for direct database access (e.g., from your local machine or admin tools).

Not required for app-to-database access via `connectTo` — that's handled automatically.

### Example 1 (yaml)

```yaml
resources:
  primaryDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
      enableBackups: true
      adminUserCredentials:
        userName: dbadmin
        password: $Secret('mongo-admin-password')
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - primaryDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const primaryDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '7.0',
    enableBackups: true,
    adminUserCredentials: {
      userName: 'dbadmin',
      password: $Secret('mongo-admin-password')
    }
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [primaryDb]
  });
  return { resources: { primaryDb, api } };
});
```

## Property: `autoScaling`

- Required: no
- Type: `MongoDbAutoScaling`

Auto-scale tier and/or storage based on CPU/memory usage. Set min/max tier to control costs.

Scales up when CPU or memory exceeds 75% for 1 hour. Scales down when both are below 50% for 24 hours.

### Example 1 (yaml)

```yaml
resources:
  scalingDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
      enableBackups: true
      autoScaling:
        minClusterTier: M10
        maxClusterTier: M40
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - scalingDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const scalingDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '7.0',
    enableBackups: true,
    autoScaling: {
      minClusterTier: 'M10',
      maxClusterTier: 'M40'
    }
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [scalingDb]
  });
  return { resources: { scalingDb, api } };
});
```

## Property: `biConnector`

- Required: no
- Type: `MongoDbBiConnector`

BI Connector for SQL-based access to MongoDB data. CPU-intensive — may degrade M10/M20 performance.

### Example 1 (yaml)

```yaml
resources:
  reportingDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M30
      version: '7.0'
      enableBackups: true
      replication:
        numElectableNodes: 3
        numAnalyticsNodes: 1
      biConnector:
        enabled: true
        readPreference: analytics
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - reportingDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const reportingDb = new MongoDbAtlasCluster({
    clusterTier: 'M30',
    version: '7.0',
    enableBackups: true,
    replication: {
      numElectableNodes: 3,
      numAnalyticsNodes: 1
    },
    biConnector: {
      enabled: true,
      readPreference: 'analytics'
    }
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [reportingDb]
  });
  return { resources: { reportingDb, api } };
});
```

## Property: `diskSizeGB`

- Required: no
- Type: `number`

Disk size in GB. Not available for shared tiers (M2/M5). M10+ auto-scales storage by default.

### Example 1 (yaml)

```yaml
resources:
  ordersDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
      diskSizeGB: 40
      enableBackups: true
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - ordersDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ordersDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '7.0',
    diskSizeGB: 40,
    enableBackups: true
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [ordersDb]
  });
  return { resources: { ordersDb, api } };
});
```

## Property: `enableBackups`

- Required: no
- Type: `boolean`

Enable daily snapshots (18:00 UTC). M10+ only — M2/M5 get automatic snapshots with different rules.

### Example 1 (yaml)

```yaml
resources:
  paymentsDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
      enableBackups: true
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - paymentsDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const paymentsDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '7.0',
    enableBackups: true
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [paymentsDb]
  });
  return { resources: { paymentsDb, api } };
});
```

## Property: `enablePointInTimeRecovery`

- Required: no
- Type: `boolean`

Restore to any second within the last 7 days. Requires `enableBackups: true` and M10+.

### Example 1 (yaml)

```yaml
resources:
  ledgerDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
      enableBackups: true
      enablePointInTimeRecovery: true
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - ledgerDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ledgerDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '7.0',
    enableBackups: true,
    enablePointInTimeRecovery: true
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [ledgerDb]
  });
  return { resources: { ledgerDb, api } };
});
```

## Property: `numShards`

- Required: no
- Type: `number`
- Default: `1`

Number of shards. More than 1 enables sharded mode for horizontal scaling. Requires M30+.

### Example 1 (yaml)

```yaml
resources:
  shardedDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M30
      version: '7.0'
      numShards: 2
      enableBackups: true
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - shardedDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const shardedDb = new MongoDbAtlasCluster({
    clusterTier: 'M30',
    version: '7.0',
    numShards: 2,
    enableBackups: true
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [shardedDb]
  });
  return { resources: { shardedDb, api } };
});
```

## Property: `replication`

- Required: no
- Type: `MongoDbReplication`

Node count configuration: electable, read-only, and analytics nodes. Default: 3 electable nodes.

### Example 1 (yaml)

```yaml
resources:
  analyticsDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M30
      version: '7.0'
      replication:
        numElectableNodes: 3
        numReadOnlyNodes: 2
        numAnalyticsNodes: 1
      enableBackups: true
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - analyticsDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const analyticsDb = new MongoDbAtlasCluster({
    clusterTier: 'M30',
    version: '7.0',
    replication: {
      numElectableNodes: 3,
      numReadOnlyNodes: 2,
      numAnalyticsNodes: 1
    },
    enableBackups: true
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [analyticsDb]
  });
  return { resources: { analyticsDb, api } };
});
```

## Property: `version`

- Required: no
- Type: `string: "5.0" | "6.0" | "7.0"`
- Default: `7.0`

MongoDB engine version.

### Example 1 (yaml)

```yaml
resources:
  contentDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '6.0'
      enableBackups: true
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - contentDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const contentDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '6.0',
    enableBackups: true
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [contentDb]
  });
  return { resources: { contentDb, api } };
});
```
