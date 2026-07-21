# MongoDbReplication API Reference

Resource type: `mongo-db-atlas-cluster`

## TypeScript definition

```typescript
type MongoDbReplication = {
  /** Read-only nodes for long-running analytics queries. Prevents impact on primary workload performance. */
  numAnalyticsNodes?: number;
  /** Nodes that can become primary. More = better redundancy. Must be odd. */
  numElectableNodes?: 3 | 5 | 7;
  /** Read-only replica nodes for scaling read throughput. */
  numReadOnlyNodes?: number;
};
```

## Property: `numAnalyticsNodes`

- Required: no
- Type: `number`

Read-only nodes for long-running analytics queries. Prevents impact on primary workload performance.

### Example 1 (yaml)

```yaml
resources:
  warehouseDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M30
      version: '7.0'
      enableBackups: true
      replication:
        numElectableNodes: 3
        numAnalyticsNodes: 2
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - warehouseDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const warehouseDb = new MongoDbAtlasCluster({
    clusterTier: 'M30',
    version: '7.0',
    enableBackups: true,
    replication: {
      numElectableNodes: 3,
      numAnalyticsNodes: 2
    }
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [warehouseDb]
  });
  return { resources: { warehouseDb, api } };
});
```

## Property: `numElectableNodes`

- Required: no
- Type: `number: 3 | 5 | 7`
- Default: `3`

Nodes that can become primary. More = better redundancy. Must be odd.

### Example 1 (yaml)

```yaml
resources:
  haDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M30
      version: '7.0'
      enableBackups: true
      replication:
        numElectableNodes: 5
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - haDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const haDb = new MongoDbAtlasCluster({
    clusterTier: 'M30',
    version: '7.0',
    enableBackups: true,
    replication: {
      numElectableNodes: 5
    }
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [haDb]
  });
  return { resources: { haDb, api } };
});
```

## Property: `numReadOnlyNodes`

- Required: no
- Type: `number`

Read-only replica nodes for scaling read throughput.

### Example 1 (yaml)

```yaml
resources:
  readScaleDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M30
      version: '7.0'
      enableBackups: true
      replication:
        numElectableNodes: 3
        numReadOnlyNodes: 3
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - readScaleDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const readScaleDb = new MongoDbAtlasCluster({
    clusterTier: 'M30',
    version: '7.0',
    enableBackups: true,
    replication: {
      numElectableNodes: 3,
      numReadOnlyNodes: 3
    }
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [readScaleDb]
  });
  return { resources: { readScaleDb, api } };
});
```
