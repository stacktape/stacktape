# MongoDbAdminUserCredentials API Reference

Resource type: `mongo-db-atlas-cluster`

## TypeScript definition

```typescript
type MongoDbAdminUserCredentials = {
  /** Password for the admin user */
  password: string;
  /** Name of the admin user */
  userName: string;
};
```

## Property: `password`

- Required: yes
- Type: `string`

Password for the admin user

### Example 1 (yaml)

```yaml
resources:
  securedDb:
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
        - securedDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const securedDb = new MongoDbAtlasCluster({
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
    connectTo: [securedDb]
  });
  return { resources: { securedDb, api } };
});
```

## Property: `userName`

- Required: yes
- Type: `string`

Name of the admin user

### Example 1 (yaml)

```yaml
resources:
  adminDb:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      version: '7.0'
      enableBackups: true
      adminUserCredentials:
        userName: opsadmin
        password: $Secret('mongo-admin-password')
  api:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/index.ts
      connectTo:
        - adminDb
```

### Example 2 (typescript)

```typescript
import { MongoDbAtlasCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';

export default defineConfig(() => {
  const adminDb = new MongoDbAtlasCluster({
    clusterTier: 'M10',
    version: '7.0',
    enableBackups: true,
    adminUserCredentials: {
      userName: 'opsadmin',
      password: $Secret('mongo-admin-password')
    }
  });
  const api = new LambdaFunction({
    packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
    connectTo: [adminDb]
  });
  return { resources: { adminDb, api } };
});
```
