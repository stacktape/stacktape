# MongoDbAtlasAccessibility API Reference

Resource type: `mongo-db-atlas-cluster`

## TypeScript definition

```typescript
type MongoDbAtlasAccessibility = {
  /** Network access mode. */
  accessibilityMode: "internet" | "scoping-workloads-in-vpc" | "vpc" | "whitelisted-ips-only";
  /** IP addresses or CIDR ranges allowed to access the cluster (e.g., your office IP). */
  whitelistedIps?: Array<string>;
};
```

## Property: `accessibilityMode`

- Required: yes
- Type: `string: "internet" | "scoping-workloads-in-vpc" | "vpc" | "whitelisted-ips-only"`
- Default: `internet`

Network access mode.

**`internet`**: Accessible from anywhere (credentials still required).
**`vpc`**: Only from resources in your VPC + any `whitelistedIps`.
**`scoping-workloads-in-vpc`**: Like `vpc`, but also requires security-group access via `connectTo`.
**`whitelisted-ips-only`**: Only from IP addresses listed in `whitelistedIps`.

### Example 1 (yaml)

```yaml
providerConfig:
  mongoDbAtlas:
    organizationId: 5f1a2b3c4d5e6f7a8b9c0d1e
    publicKey: abcdefgh
    privateKey: $Secret('mongo-atlas-private-key')
    accessibility:
      accessibilityMode: scoping-workloads-in-vpc
resources:
  appDb:
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
      joinDefaultVpc: true
      connectTo:
        - appDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const appDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '7.0',
    enableBackups: true
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    joinDefaultVpc: true,
    connectTo: [appDb]
  });
  return {
    providerConfig: {
      mongoDbAtlas: {
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e',
        publicKey: 'abcdefgh',
        privateKey: $Secret('mongo-atlas-private-key'),
        accessibility: {
          accessibilityMode: 'scoping-workloads-in-vpc'
        }
      }
    },
    resources: { appDb, api }
  };
});
```

## Property: `whitelistedIps`

- Required: no
- Type: `Array<string>`

IP addresses or CIDR ranges allowed to access the cluster (e.g., your office IP).

No effect in `internet` mode. In `vpc`/`scoping-workloads-in-vpc`, adds access for IPs outside the VPC.
In `whitelisted-ips-only`, these are the only IPs that can connect.

### Example 1 (yaml)

```yaml
providerConfig:
  mongoDbAtlas:
    organizationId: 5f1a2b3c4d5e6f7a8b9c0d1e
    publicKey: abcdefgh
    privateKey: $Secret('mongo-atlas-private-key')
    accessibility:
      accessibilityMode: whitelisted-ips-only
      whitelistedIps:
        - 203.0.113.10
        - 198.51.100.0/24
resources:
  appDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
      enableBackups: true
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const appDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '7.0',
    enableBackups: true
  });
  return {
    providerConfig: {
      mongoDbAtlas: {
        organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e',
        publicKey: 'abcdefgh',
        privateKey: $Secret('mongo-atlas-private-key'),
        accessibility: {
          accessibilityMode: 'whitelisted-ips-only',
          whitelistedIps: ['203.0.113.10', '198.51.100.0/24']
        }
      }
    },
    resources: { appDb }
  };
});
```
