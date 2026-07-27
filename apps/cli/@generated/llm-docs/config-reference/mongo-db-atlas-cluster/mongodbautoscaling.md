# MongoDbAutoScaling API Reference

Resource type: `mongo-db-atlas-cluster`

## TypeScript definition

```typescript
type MongoDbAutoScaling = {
  /** Prevent automatic disk expansion. By default, storage grows when usage hits 90%. Storage never scales down. */
  disableDiskScaling?: boolean;
  /** Prevent automatic scale-down. The cluster can only scale up, never back down to a smaller tier. */
  disableScaleDown?: boolean;
  /** Highest tier the cluster can scale up to. Set a ceiling to control maximum costs. */
  maxClusterTier?: "M10" | "M100" | "M140" | "M20" | "M200" | "M200 Low-CPU (R200)" | "M200_NVME" | "M30" | "M300" | "M300 Low-CPU (R300)" | "M40" | "M40 Low-CPU (R40)" | "M400 Low-CPU (R400)" | "M400_NVME" | "M40_NVME" | "M50" | "M50 Low-CPU (R50)" | "M50_NVME" | "M60" | "M60 Low-CPU (R60)" | "M60_NVME" | "M700 Low-CPU (R700)" | "M80" | "M80 Low-CPU (R80)" | "M80_NVME";
  /** Lowest tier the cluster can scale down to. Prevents unexpected cost increases from always scaling up. */
  minClusterTier?: "M10" | "M100" | "M140" | "M20" | "M200" | "M200 Low-CPU (R200)" | "M200_NVME" | "M30" | "M300" | "M300 Low-CPU (R300)" | "M40" | "M40 Low-CPU (R40)" | "M400 Low-CPU (R400)" | "M400_NVME" | "M40_NVME" | "M50" | "M50 Low-CPU (R50)" | "M50_NVME" | "M60" | "M60 Low-CPU (R60)" | "M60_NVME" | "M700 Low-CPU (R700)" | "M80" | "M80 Low-CPU (R80)" | "M80_NVME";
};
```

## Property: `disableDiskScaling`

- Required: no
- Type: `boolean`

Prevent automatic disk expansion. By default, storage grows when usage hits 90%. Storage never scales down.

### Example 1 (yaml)

```yaml
resources:
  fixedDiskDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
      diskSizeGB: 80
      enableBackups: true
      autoScaling:
        minClusterTier: M10
        maxClusterTier: M40
        disableDiskScaling: true
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - fixedDiskDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const fixedDiskDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '7.0',
    diskSizeGB: 80,
    enableBackups: true,
    autoScaling: {
      minClusterTier: 'M10',
      maxClusterTier: 'M40',
      disableDiskScaling: true
    }
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [fixedDiskDb]
  });
  return { resources: { fixedDiskDb, api } };
});
```

## Property: `disableScaleDown`

- Required: no
- Type: `boolean`

Prevent automatic scale-down. The cluster can only scale up, never back down to a smaller tier.

### Example 1 (yaml)

```yaml
resources:
  scaleUpOnlyDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
      enableBackups: true
      autoScaling:
        minClusterTier: M10
        maxClusterTier: M40
        disableScaleDown: true
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - scaleUpOnlyDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const scaleUpOnlyDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '7.0',
    enableBackups: true,
    autoScaling: {
      minClusterTier: 'M10',
      maxClusterTier: 'M40',
      disableScaleDown: true
    }
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [scaleUpOnlyDb]
  });
  return { resources: { scaleUpOnlyDb, api } };
});
```

## Property: `maxClusterTier`

- Required: no
- Type: `string: "M10" | "M100" | "M140" | "M20" | "M200" | "M200 Low-CPU (R200)" | "M200_NVME" | "M30" | "M300" | "M300 Low-CPU (R300)" | "M40" | "M40 Low-CPU (R40)" | "M400 Low-CPU (R400)" | "M400_NVME" | "M40_NVME" | "M50" | "M50 Low-CPU (R50)" | "M50_NVME" | "M60" | "M60 Low-CPU (R60)" | "M60_NVME" | "M700 Low-CPU (R700)" | "M80" | "M80 Low-CPU (R80)" | "M80_NVME"`

Highest tier the cluster can scale up to. Set a ceiling to control maximum costs.

### Example 1 (yaml)

```yaml
resources:
  ceilingDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
      enableBackups: true
      autoScaling:
        minClusterTier: M10
        maxClusterTier: M30
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - ceilingDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const ceilingDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '7.0',
    enableBackups: true,
    autoScaling: {
      minClusterTier: 'M10',
      maxClusterTier: 'M30'
    }
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [ceilingDb]
  });
  return { resources: { ceilingDb, api } };
});
```

## Property: `minClusterTier`

- Required: no
- Type: `string: "M10" | "M100" | "M140" | "M20" | "M200" | "M200 Low-CPU (R200)" | "M200_NVME" | "M30" | "M300" | "M300 Low-CPU (R300)" | "M40" | "M40 Low-CPU (R40)" | "M400 Low-CPU (R400)" | "M400_NVME" | "M40_NVME" | "M50" | "M50 Low-CPU (R50)" | "M50_NVME" | "M60" | "M60 Low-CPU (R60)" | "M60_NVME" | "M700 Low-CPU (R700)" | "M80" | "M80 Low-CPU (R80)" | "M80_NVME"`

Lowest tier the cluster can scale down to. Prevents unexpected cost increases from always scaling up.

### Example 1 (yaml)

```yaml
resources:
  floorDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M20
      version: '7.0'
      enableBackups: true
      autoScaling:
        minClusterTier: M20
        maxClusterTier: M50
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - floorDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const floorDb = new MongoDbAtlasCluster({
    clusterTier: 'M20',
    version: '7.0',
    enableBackups: true,
    autoScaling: {
      minClusterTier: 'M20',
      maxClusterTier: 'M50'
    }
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [floorDb]
  });
  return { resources: { floorDb, api } };
});
```
