# TanStackWeb API Reference

Deploy a TanStack Start SSR app with Lambda (Nitro aws-lambda preset), S3 for static assets, and CloudFront CDN.

Resource type: `tanstack-web`

## TypeScript definition

```typescript
import type { TanStackWebProps } from 'stacktape';

type TanStackWeb = {
  properties: TanStackWebProps;
  /** Escape hatch to modify the underlying CloudFormation resources Stacktape creates. */
  overrides?: unknown;
};
```

## Property: `properties`

- Required: yes
- Type: `TanStackWebProps`

## Property: `overrides`

- Required: no
- Type: `unknown`

Escape hatch to modify the underlying CloudFormation resources Stacktape creates.

Use dot-notation paths to override specific properties on any child resource.
Find resource logical IDs with `stacktape stack-info --detailed`.

### Example 1 (yaml)

```yaml
resources:
  mainDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t3.micro
    overrides:
      MainDbDatabaseInstance:
        Properties.StorageEncrypted: true
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, RdsEnginePostgres, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEnginePostgres({
      version: '16.2',
      primaryInstance: { instanceSize: 'db.t3.micro' }
    }),
    overrides: {
      MainDbDatabaseInstance: { 'Properties.StorageEncrypted': true }
    }
  });

  return { resources: { mainDb } };
});
```
