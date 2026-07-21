# MongoDbAtlasProvider API Reference

## TypeScript definition

```typescript
import type { MongoDbAtlasAccessibility } from 'stacktape';

type MongoDbAtlasProvider = {
  /** Network connectivity settings for all MongoDB Atlas clusters in this stack. */
  accessibility?: MongoDbAtlasAccessibility;
  /** Your MongoDB Atlas Organization ID. */
  organizationId?: string;
  /** Your MongoDB Atlas private API key. Store as $Secret() for security. */
  privateKey?: string;
  /** Your MongoDB Atlas public API key. */
  publicKey?: string;
};
```

## Property: `accessibility`

- Required: no
- Type: `MongoDbAtlasAccessibility`

Network connectivity settings for all MongoDB Atlas clusters in this stack.

Stacktape auto-creates a MongoDB Atlas Project for your clusters. These accessibility settings
apply at the project level — all clusters in the stack share the same network config.

### Example 1 (yaml)

```yaml
providerConfig:
  mongoDbAtlas:
    publicKey: abcdef12
    privateKey: $Secret('mongoDbAtlasPrivateKey')
    organizationId: 5f1a2b3c4d5e6f7a8b9c0d1e
    accessibility:
      accessibilityMode: scoping-workloads-in-vpc
      whitelistedIps:
        - 203.0.113.4/32

resources:
  appDatabase:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const appDatabase = new MongoDbAtlasCluster({ clusterTier: 'M10', version: '7.0' });
  return {
    providerConfig: {
      mongoDbAtlas: {
        publicKey: 'abcdef12',
        privateKey: $Secret('mongoDbAtlasPrivateKey'),
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e',
        accessibility: {
          accessibilityMode: 'scoping-workloads-in-vpc',
          whitelistedIps: ['203.0.113.4/32']
        }
      }
    },
    resources: { appDatabase }
  };
});
```

## Property: `organizationId`

- Required: no
- Type: `string`

Your MongoDB Atlas Organization ID.

Found in the MongoDB Atlas console under Organization Settings.

### Example 1 (yaml)

```yaml
providerConfig:
  mongoDbAtlas:
    publicKey: abcdef12
    privateKey: $Secret('mongoDbAtlasPrivateKey')
    organizationId: 5f1a2b3c4d5e6f7a8b9c0d1e

resources:
  appDatabase:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const appDatabase = new MongoDbAtlasCluster({ clusterTier: 'M10', version: '7.0' });
  return {
    providerConfig: {
      mongoDbAtlas: {
        publicKey: 'abcdef12',
        privateKey: $Secret('mongoDbAtlasPrivateKey'),
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
      }
    },
    resources: { appDatabase }
  };
});
```

## Property: `privateKey`

- Required: no
- Type: `string`

Your MongoDB Atlas private API key. Store as `$Secret()` for security.

Create API keys in the MongoDB Atlas console under Organization Settings > API Keys.

### Example 1 (yaml)

```yaml
providerConfig:
  mongoDbAtlas:
    publicKey: abcdef12
    privateKey: $Secret('mongoDbAtlasPrivateKey')
    organizationId: 5f1a2b3c4d5e6f7a8b9c0d1e

resources:
  appDatabase:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const appDatabase = new MongoDbAtlasCluster({ clusterTier: 'M10', version: '7.0' });
  return {
    providerConfig: {
      mongoDbAtlas: {
        publicKey: 'abcdef12',
        privateKey: $Secret('mongoDbAtlasPrivateKey'),
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
      }
    },
    resources: { appDatabase }
  };
});
```

## Property: `publicKey`

- Required: no
- Type: `string`

Your MongoDB Atlas public API key.

Create API keys in the MongoDB Atlas console under Organization Settings > API Keys.

### Example 1 (yaml)

```yaml
providerConfig:
  mongoDbAtlas:
    publicKey: abcdef12
    privateKey: $Secret('mongoDbAtlasPrivateKey')
    organizationId: 5f1a2b3c4d5e6f7a8b9c0d1e

resources:
  appDatabase:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const appDatabase = new MongoDbAtlasCluster({ clusterTier: 'M10', version: '7.0' });
  return {
    providerConfig: {
      mongoDbAtlas: {
        publicKey: 'abcdef12',
        privateKey: $Secret('mongoDbAtlasPrivateKey'),
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e'
      }
    },
    resources: { appDatabase }
  };
});
```
