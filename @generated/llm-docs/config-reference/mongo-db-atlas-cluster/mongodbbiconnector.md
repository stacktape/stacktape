# MongoDbBiConnector API Reference

Resource type: `mongo-db-atlas-cluster`

## TypeScript definition

```typescript
type MongoDbBiConnector = {
  /** Enable the BI Connector for SQL-based access. */
  enabled: boolean;
  /** Which node type the BI Connector reads from. Use analytics to avoid impacting production queries. */
  readPreference?: "analytics" | "primary" | "secondary";
};
```

## Property: `enabled`

- Required: yes
- Type: `boolean`
- Default: `false`

Enable the BI Connector for SQL-based access.

### Example 1 (yaml)

```yaml
resources:
  sqlAccessDb:
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
        - sqlAccessDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const sqlAccessDb = new MongoDbAtlasCluster({
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
    connectTo: [sqlAccessDb]
  });
  return { resources: { sqlAccessDb, api } };
});
```

## Property: `readPreference`

- Required: no
- Type: `string: "analytics" | "primary" | "secondary"`

Which node type the BI Connector reads from. Use `analytics` to avoid impacting production queries.

### Example 1 (yaml)

```yaml
resources:
  biDb:
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
        readPreference: secondary
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - biDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const biDb = new MongoDbAtlasCluster({
    clusterTier: 'M30',
    version: '7.0',
    enableBackups: true,
    replication: {
      numElectableNodes: 3,
      numAnalyticsNodes: 1
    },
    biConnector: {
      enabled: true,
      readPreference: 'secondary'
    }
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [biDb]
  });
  return { resources: { biDb, api } };
});
```
