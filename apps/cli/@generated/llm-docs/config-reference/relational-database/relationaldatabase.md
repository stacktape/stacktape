# RelationalDatabase API Reference

A fully managed relational (SQL) database resource.

Resource type: `relational-database`

## TypeScript definition

```typescript
import type { RelationalDatabaseProps } from 'stacktape';

type RelationalDatabase = {
  properties: RelationalDatabaseProps;
  /** Escape hatch to modify the underlying CloudFormation resources Stacktape creates. */
  overrides?: unknown;
};
```

## Property: `properties`

- Required: yes
- Type: `RelationalDatabaseProps`

## Property: `overrides`

- Required: no
- Type: `unknown`

Escape hatch to modify the underlying CloudFormation resources Stacktape creates.

Each key is the logical ID of one of the resource's CloudFormation child resources, as it appears in the template
(`stacktape synth` writes it). Each path inside it is relative to that child resource's `Properties`: write
`StorageEncrypted`, not `Properties.StorageEncrypted`. Use dot-notation for nested properties.

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
          version: '16.6'
          primaryInstance:
            instanceSize: db.t3.micro
    overrides:
      MainDbDbInstance:
        StorageEncrypted: true
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, RdsEnginePostgres, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEnginePostgres({
      version: '16.6',
      primaryInstance: { instanceSize: 'db.t3.micro' }
    }),
    overrides: {
      MainDbDbInstance: { StorageEncrypted: true }
    }
  });

  return { resources: { mainDb } };
});
```
